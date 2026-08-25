/**
 * StudyProvider — the app's single source of truth for scheduling.
 *
 * There is no "review a card" action anywhere in this app. The student plays a
 * pathway puzzle exactly like the original game; when it ends, `finishPathway`
 * grades every step that was attempted — both the "predict the product" and
 * "recall the conditions" aspect — from how many tries it took, and folds the
 * result into XP, streak and today's step count.
 *
 * The whole schedule (a few hundred rows) loads once at sign-in into a Map and
 * is scheduled locally from then on; `planPathwaySession` is a pure function of
 * that Map plus today's settings, so the dashboard can call it as often as it
 * likes without hitting the network. Writes go out behind the UI: the graded
 * review states are awaited (losing them costs the student real progress),
 * everything else — XP, streak, daily counters, analytics — is coalesced and
 * flushed on a timer, on tab hide, and at session end.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAppwrite, useUser } from '@appwrite.io/react';

import { pathToSteps } from '../data/deck';
import type {
  DailyStat,
  Mode,
  PathwayFinishResult,
  Profile,
  Progress,
  ReviewLogEntry,
  ReviewState,
  UserSettings,
} from '../data/srsTypes';
import { studyDayKey, type DayKey } from '../lib/day';
import {
  MATURE_INTERVAL_DAYS,
  extendStreak,
  levelFromXp,
  newlyEarnedBadges,
  xpForReview,
} from '../lib/gamification';
import {
  State,
  attemptsToGrade,
  createScheduler,
  freshState,
  gradeCard,
  isCorrect,
} from '../lib/srs/scheduler';
import { planSession, type SessionPlan } from '../lib/srs/pathSelection';
import * as repo from '../services/repository';

/* ------------------------------------------------------------------ */

export interface FinishOutcome {
  xpEarned: number;
  stepsCovered: number; // in this mode, today, after this pathway
  goalJustMet: boolean;
  newBadges: string[];
  streakEvents: ReturnType<typeof extendStreak>['events'];
}

interface StudyContextValue {
  status: 'loading' | 'needs-onboarding' | 'ready' | 'error';
  error: Error | null;

  profile: Profile | null;
  settings: UserSettings;
  progress: Progress | null;
  today: DailyStat | null;
  dayKey: DayKey;
  states: Map<string, ReviewState>;

  goalFor: (mode: Mode) => number;
  stepsCoveredToday: (mode: Mode) => number;
  goalMet: (mode: Mode) => boolean;
  matureSteps: number;

  planPathwaySession: (mode: Mode) => SessionPlan;
  finishPathway: (result: PathwayFinishResult) => Promise<FinishOutcome>;
  updateSettings: (patch: Partial<UserSettings>) => Promise<void>;
  completeOnboarding: (input: repo.OnboardingInput) => Promise<void>;
  reload: () => Promise<void>;
  flush: () => Promise<void>;
}

const StudyContext = createContext<StudyContextValue | null>(null);
const FLUSH_INTERVAL_MS = 8_000;

export const StudyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tablesDB } = useAppwrite();
  const { user } = useUser();
  const userId = user?.$id ?? null;

  const [status, setStatus] = useState<StudyContextValue['status']>('loading');
  const [error, setError] = useState<Error | null>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<UserSettings>(repo.DEFAULT_SETTINGS);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [today, setToday] = useState<DailyStat | null>(null);
  const [states, setStates] = useState<Map<string, ReviewState>>(new Map());

  const dirtyProgress = useRef<Progress | null>(null);
  const dirtyToday = useRef<DailyStat | null>(null);
  const flushing = useRef(false);

  const dayKey = useMemo(
    () => studyDayKey(new Date(), settings.timezone, settings.dayRolloverHour),
    [settings.timezone, settings.dayRolloverHour],
  );

  const scheduler = useMemo(
    () => createScheduler({ desiredRetention: settings.desiredRetention, weights: settings.fsrsWeights }),
    [settings.desiredRetention, settings.fsrsWeights],
  );

  /* ---------------------------------------------------------------- *
   * Load
   * ---------------------------------------------------------------- */

  const load = useCallback(async () => {
    if (!userId) return;
    setStatus('loading');
    setError(null);

    try {
      const loadedProfile = await repo.getProfile(tablesDB, userId);
      if (!loadedProfile) {
        setProfile(null);
        setStatus('needs-onboarding');
        return;
      }

      const loadedSettings = await repo.ensureSettings(tablesDB, userId);
      const key = studyDayKey(new Date(), loadedSettings.timezone, loadedSettings.dayRolloverHour);

      const [loadedProgress, loadedStates, loadedToday] = await Promise.all([
        repo.ensureProgress(tablesDB, userId, loadedProfile.username, loadedProfile.schoolNameLower),
        repo.listReviewStates(tablesDB, userId),
        repo.getDailyStat(tablesDB, userId, key),
      ]);

      setProfile(loadedProfile);
      setSettings(loadedSettings);
      setProgress(loadedProgress);
      setStates(new Map(loadedStates.map((s) => [s.cardId, s])));
      setToday(loadedToday ?? repo.emptyDailyStat(userId, key));
      setStatus('ready');
    } catch (err) {
      setError(err as Error);
      setStatus('error');
    }
  }, [tablesDB, userId]);

  useEffect(() => {
    if (userId) void load();
    else {
      setStatus('loading');
      setProfile(null);
      setStates(new Map());
    }
  }, [userId, load]);

  useEffect(() => {
    if (status !== 'ready' || !userId || !today) return;
    if (today.date !== dayKey) {
      void flush().then(() =>
        repo
          .getDailyStat(tablesDB, userId, dayKey)
          .then((row) => setToday(row ?? repo.emptyDailyStat(userId, dayKey))),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey, status]);

  /* ---------------------------------------------------------------- *
   * Derived
   * ---------------------------------------------------------------- */

  const goalFor = useCallback(
    (mode: Mode) => (mode === 'aromatic' ? settings.dailyGoalAromatic : settings.dailyGoalAliphatic),
    [settings],
  );

  const stepsCoveredToday = useCallback(
    (mode: Mode) => (!today ? 0 : (mode === 'aromatic' ? today.aromaticSteps : today.aliphaticSteps).length),
    [today],
  );

  const goalMet = useCallback(
    (mode: Mode) => stepsCoveredToday(mode) >= goalFor(mode),
    [stepsCoveredToday, goalFor],
  );

  const matureSteps = useMemo(() => computeMatureSteps(states), [states]);

  const planPathwaySession = useCallback(
    (mode: Mode): SessionPlan => {
      if (!today) return { pathways: [], coveredStepIds: new Set(), goalMet: true };
      const alreadyCovered = new Set(mode === 'aromatic' ? today.aromaticSteps : today.aliphaticSteps);
      const introducedToday = mode === 'aromatic' ? today.aromaticNew : today.aliphaticNew;
      const configuredNew = mode === 'aromatic' ? settings.newPerDayAromatic : settings.newPerDayAliphatic;

      return planSession({
        mode,
        states,
        scheduler,
        alreadyCovered,
        dailyGoalSteps: goalFor(mode),
        newBudgetRemaining: Math.max(0, configuredNew - introducedToday),
      });
    },
    [today, settings, states, scheduler, goalFor],
  );

  /* ---------------------------------------------------------------- *
   * Write-back
   * ---------------------------------------------------------------- */

  const flush = useCallback(async () => {
    if (flushing.current) return;
    const pendingProgress = dirtyProgress.current;
    const pendingToday = dirtyToday.current;
    if (!pendingProgress && !pendingToday) return;

    flushing.current = true;
    dirtyProgress.current = null;
    dirtyToday.current = null;

    try {
      await Promise.all([
        pendingProgress ? repo.saveProgress(tablesDB, pendingProgress) : Promise.resolve(),
        pendingToday ? repo.saveDailyStat(tablesDB, pendingToday) : Promise.resolve(),
      ]);
    } catch {
      dirtyProgress.current ??= pendingProgress;
      dirtyToday.current ??= pendingToday;
    } finally {
      flushing.current = false;
    }
  }, [tablesDB]);

  useEffect(() => {
    if (status !== 'ready') return;
    const timer = window.setInterval(() => void flush(), FLUSH_INTERVAL_MS);
    const onHide = () => {
      if (document.visibilityState === 'hidden') void flush();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
      void flush();
    };
  }, [status, flush]);

  /* ---------------------------------------------------------------- *
   * Finish a pathway: grade every attempted step-aspect, fold into XP/streak
   * ---------------------------------------------------------------- */

  const finishPathway = useCallback(
    async (result: PathwayFinishResult): Promise<FinishOutcome> => {
      if (!userId || !progress || !today) throw new Error('Study session is not ready yet.');

      const now = new Date();
      const steps = pathToSteps(result.mode, result.path);

      const graded: ReviewState[] = [];
      const logs: ReviewLogEntry[] = [];
      const attemptedStepIds: string[] = [];
      let xpEarned = 0;
      let newIntroduced = 0;
      let correctCount = 0;
      let totalCount = 0;

      steps.forEach((step, i) => {
        const productOutcome = result.productResults[i];
        const conditionsOutcome = result.conditionResults[i];
        if (!productOutcome && !conditionsOutcome) return; // never reached — no grade, no coverage credit

        const wasFullyNew = !states.has(step.productCardId) && !states.has(step.conditionsCardId);

        const gradeAspect = (
          cardId: string,
          template: 'product' | 'conditions',
          outcome: { attempts: number; solved: boolean },
        ) => {
          const wasNew = !states.has(cardId);
          const prev = states.get(cardId) ?? freshState(userId, cardId, result.mode, template, now);
          const rating = attemptsToGrade(outcome.attempts, outcome.solved);
          const { next } = gradeCard(scheduler, prev, rating, now);
          graded.push(next);
          totalCount += 1;
          if (isCorrect(rating)) correctCount += 1;
          xpEarned += xpForReview({ rating, isNew: wasNew, streak: progress.currentStreak });
          logs.push({
            userId,
            stepId: step.id,
            mode: result.mode,
            template,
            rating,
            state: prev.state,
            dueBefore: prev.due,
            stability: next.stability,
            difficulty: next.difficulty,
            elapsedDays: next.elapsedDays,
            scheduledDays: next.scheduledDays,
            reviewedAt: now.toISOString(),
            attempts: outcome.attempts,
            correct: isCorrect(rating),
          });
        };

        if (productOutcome) gradeAspect(step.productCardId, 'product', productOutcome);
        if (conditionsOutcome) gradeAspect(step.conditionsCardId, 'conditions', conditionsOutcome);

        attemptedStepIds.push(step.id);
        if (wasFullyNew) newIntroduced += 1;
      });

      // --- optimistic local state -------------------------------------
      const nextStates = new Map(states);
      for (const s of graded) nextStates.set(s.cardId, s);
      setStates(nextStates);

      const key: 'aromaticSteps' | 'aliphaticSteps' =
        result.mode === 'aromatic' ? 'aromaticSteps' : 'aliphaticSteps';
      const newKey: 'aromaticNew' | 'aliphaticNew' = result.mode === 'aromatic' ? 'aromaticNew' : 'aliphaticNew';

      const beforeCovered = new Set(today[key]);
      const afterCovered = new Set([...beforeCovered, ...attemptedStepIds]);

      const nextToday: DailyStat = {
        ...today,
        [key]: [...afterCovered],
        [newKey]: today[newKey] + newIntroduced,
        aromaticGoal: settings.dailyGoalAromatic,
        aliphaticGoal: settings.dailyGoalAliphatic,
        xp: today.xp + xpEarned,
        correct: today.correct + correctCount,
        total: today.total + totalCount,
        timeMs: today.timeMs + Math.min(result.durationMs, 30 * 60_000),
      };

      const goalBefore = beforeCovered.size >= (result.mode === 'aromatic' ? settings.dailyGoalAromatic : settings.dailyGoalAliphatic);
      const goalAfter = afterCovered.size >= (result.mode === 'aromatic' ? settings.dailyGoalAromatic : settings.dailyGoalAliphatic);
      const goalJustMet = !goalBefore && goalAfter;

      const otherMode: Mode = result.mode === 'aromatic' ? 'aliphatic' : 'aromatic';
      const otherGoalMet =
        (otherMode === 'aromatic' ? today.aromaticSteps.length : today.aliphaticSteps.length) >=
        (otherMode === 'aromatic' ? settings.dailyGoalAromatic : settings.dailyGoalAliphatic);

      let bonusXp = 0;
      if (goalJustMet) bonusXp += 25;
      const bothNowMet = goalAfter && otherGoalMet;
      const bothBeforeMet = goalBefore && otherGoalMet;
      if (bothNowMet && !bothBeforeMet) bonusXp += 30;
      nextToday.xp += bonusXp;
      nextToday.goalMet = bothNowMet;

      let nextProgress: Progress = {
        ...progress,
        totalXp: progress.totalXp + xpEarned + bonusXp,
        totalReviews: progress.totalReviews + totalCount,
        totalCorrect: progress.totalCorrect + correctCount,
        matureSteps: computeMatureSteps(nextStates),
        updatedAt: now.toISOString(),
      };
      nextProgress.level = levelFromXp(nextProgress.totalXp);

      let streakEvents: FinishOutcome['streakEvents'] = [];
      if (bothNowMet && !bothBeforeMet) {
        const streak = extendStreak(nextProgress, dayKey);
        streakEvents = streak.events;
        nextProgress = {
          ...nextProgress,
          currentStreak: streak.currentStreak,
          longestStreak: streak.longestStreak,
          lastGoalDate: streak.lastGoalDate,
          streakFreezes: streak.streakFreezes,
          freezeUsedDates: streak.freezeUsedDates,
        };
      }

      const earned = newlyEarnedBadges({
        progress: nextProgress,
        matureSteps: nextProgress.matureSteps,
        perfectSession: totalCount > 0 && correctCount === totalCount,
        sessionSize: totalCount,
        modesCoveredToday: Number(goalAfter) + Number(otherGoalMet),
      });
      if (earned.length) nextProgress.badges = [...nextProgress.badges, ...earned];

      setToday(nextToday);
      setProgress(nextProgress);
      dirtyToday.current = nextToday;
      dirtyProgress.current = nextProgress;

      // --- durable writes: the schedule itself is worth waiting for -----
      const saved = await repo.saveReviewStates(tablesDB, graded);
      if (saved.some((s, i) => s.rowId !== graded[i].rowId)) {
        setStates((prev) => {
          const map = new Map(prev);
          for (const s of saved) map.set(s.cardId, s);
          return map;
        });
      }

      for (const entry of logs) void repo.logReview(tablesDB, entry).catch(() => undefined);
      if (goalJustMet || earned.length || streakEvents.length) void flush();

      return {
        xpEarned: xpEarned + bonusXp,
        stepsCovered: afterCovered.size,
        goalJustMet,
        newBadges: earned,
        streakEvents,
      };
    },
    [userId, progress, today, states, scheduler, settings, dayKey, tablesDB, flush],
  );

  /* ---------------------------------------------------------------- *
   * Mutations
   * ---------------------------------------------------------------- */

  const updateSettings = useCallback(
    async (patch: Partial<UserSettings>) => {
      if (!userId) return;
      const next = { ...settings, ...patch };
      setSettings(next);
      await repo.saveSettings(tablesDB, userId, next);
    },
    [settings, tablesDB, userId],
  );

  const completeOnboarding = useCallback(
    async (input: repo.OnboardingInput) => {
      if (!userId) throw new Error('Not signed in.');
      await repo.completeOnboarding(tablesDB, userId, input);
      await load();
    },
    [tablesDB, userId, load],
  );

  const value: StudyContextValue = {
    status,
    error,
    profile,
    settings,
    progress,
    today,
    dayKey,
    states,
    goalFor,
    stepsCoveredToday,
    goalMet,
    matureSteps,
    planPathwaySession,
    finishPathway,
    updateSettings,
    completeOnboarding,
    reload: load,
    flush,
  };

  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
};

export function useStudy(): StudyContextValue {
  const ctx = useContext(StudyContext);
  if (!ctx) throw new Error('useStudy must be used inside <StudyProvider>');
  return ctx;
}

/**
 * A step is "settled" when both its aspects have graduated to Review state
 * with an interval of three weeks or more. Recomputed from the full state map
 * rather than tracked incrementally — with only a few hundred rows this is
 * cheap, and it avoids drift bugs from partial delta updates.
 */
function computeMatureSteps(states: Map<string, ReviewState>): number {
  const byStep = new Map<string, ReviewState[]>();
  for (const s of states.values()) {
    const list = byStep.get(s.stepId) ?? [];
    list.push(s);
    byStep.set(s.stepId, list);
  }
  let count = 0;
  for (const aspects of byStep.values()) {
    if (
      aspects.length === 2 &&
      aspects.every((a) => a.state === State.Review && a.scheduledDays >= MATURE_INTERVAL_DAYS)
    ) {
      count += 1;
    }
  }
  return count;
}
