/**
 * Gamification.
 *
 * Design rule: rewards attach to *behaviour the schedule wants*, never to
 * volume for its own sake. Grinding 200 cards in one evening earns barely more
 * than hitting a 10-card goal, because cramming is exactly what spaced
 * repetition exists to replace. Consistency is what pays.
 */

import { addDays, daysBetween, type DayKey } from './day';
import { type Progress } from '../data/srsTypes';
import { Rating, type Grade } from './srs/scheduler';

/* ------------------------------------------------------------------ *
 * XP
 * ------------------------------------------------------------------ */

export const XP_RULES = {
  /** Every honest attempt earns something, including a wrong one. */
  attempt: 4,
  correct: 4,
  /** Small extra for effortless recall — the state we are aiming for. */
  easy: 2,
  /** Introducing new material. */
  newCard: 3,
  /** Hitting a mode's daily minimum. */
  goalPerMode: 25,
  /** Hitting both minimums on the same day. */
  bothGoals: 30,
  /** Streak bonus: +4% per day, capped so week 40 is not worth 3x week 1. */
  streakStep: 0.04,
  streakCap: 1.6,
} as const;

export function streakMultiplier(streak: number): number {
  return Math.min(XP_RULES.streakCap, 1 + streak * XP_RULES.streakStep);
}

export function xpForReview(input: {
  rating: Grade;
  isNew: boolean;
  streak: number;
}): number {
  let xp = XP_RULES.attempt;
  if (input.rating !== Rating.Again) xp += XP_RULES.correct;
  if (input.rating === Rating.Easy) xp += XP_RULES.easy;
  if (input.isNew) xp += XP_RULES.newCard;
  return Math.round(xp * streakMultiplier(input.streak));
}

/* ------------------------------------------------------------------ *
 * Levels
 * ------------------------------------------------------------------ */

/**
 * Cumulative XP for level n: 60 * n^1.6. Early levels arrive within a session
 * or two; later ones take weeks. Named after the syllabus's own progression so
 * the label means something to a 9701 student.
 */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(60 * Math.pow(level - 1, 1.6));
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level += 1;
  return level;
}

export function levelProgress(xp: number): { level: number; into: number; span: number; pct: number } {
  const level = levelFromXp(xp);
  const floor = xpForLevel(level);
  const ceiling = xpForLevel(level + 1);
  const span = Math.max(1, ceiling - floor);
  const into = xp - floor;
  return { level, into, span, pct: Math.min(100, Math.round((into / span) * 100)) };
}

export const LEVEL_TITLES = [
  'Beaker',
  'Reflux',
  'Distillate',
  'Nucleophile',
  'Electrophile',
  'Carbocation',
  'Mechanism',
  'Retrosynthesis',
  'Grignard',
  'Chief Chemist',
] as const;

export function levelTitle(level: number): string {
  return LEVEL_TITLES[Math.min(LEVEL_TITLES.length - 1, Math.floor((level - 1) / 3))];
}

/* ------------------------------------------------------------------ *
 * Streaks
 * ------------------------------------------------------------------ */

export const MAX_STREAK_FREEZES = 3;
/** One freeze earned per this many consecutive days. */
export const FREEZE_EARN_INTERVAL = 7;

export interface StreakUpdate {
  currentStreak: number;
  longestStreak: number;
  lastGoalDate: DayKey;
  streakFreezes: number;
  freezeUsedDates: string[];
  /** For the celebration UI. */
  events: Array<'extended' | 'started' | 'reset' | 'freeze-used' | 'freeze-earned' | 'record'>;
}

/**
 * Advance the streak because today's goal was met.
 *
 * Missed days are covered by freezes, one per day, oldest gap first. Freezes
 * are earned, not bought — a week of consistency buys one day of illness.
 * This is deliberately forgiving: the failure mode we care about is a student
 * abandoning the app after one bad week, not a student gaming a counter.
 */
export function extendStreak(progress: Progress, today: DayKey): StreakUpdate {
  const events: StreakUpdate['events'] = [];
  const last = progress.lastGoalDate;

  let current = progress.currentStreak;
  let freezes = progress.streakFreezes;
  const freezeUsed = [...progress.freezeUsedDates];

  if (last === today) {
    // Already counted. Idempotent by design — this runs on every review.
    return {
      currentStreak: current,
      longestStreak: progress.longestStreak,
      lastGoalDate: today,
      streakFreezes: freezes,
      freezeUsedDates: freezeUsed,
      events,
    };
  }

  const gap = last ? daysBetween(last, today) : Infinity;

  if (gap === 1) {
    current += 1;
    events.push('extended');
  } else if (Number.isFinite(gap) && gap > 1) {
    const missed = gap - 1;
    if (missed <= freezes) {
      for (let i = 1; i <= missed; i++) freezeUsed.push(addDays(last!, i));
      freezes -= missed;
      current += 1;
      events.push('freeze-used', 'extended');
    } else {
      current = 1;
      events.push('reset');
    }
  } else {
    current = 1;
    events.push('started');
  }

  if (current > 0 && current % FREEZE_EARN_INTERVAL === 0 && freezes < MAX_STREAK_FREEZES) {
    freezes += 1;
    events.push('freeze-earned');
  }

  const longest = Math.max(progress.longestStreak, current);
  if (longest > progress.longestStreak) events.push('record');

  return {
    currentStreak: current,
    longestStreak: longest,
    lastGoalDate: today,
    streakFreezes: freezes,
    freezeUsedDates: freezeUsed.slice(-60),
    events,
  };
}

/**
 * Whether a streak shown in the UI is still alive, without writing anything.
 * A streak "lapses" only once the grace window (today + freezes) has passed.
 */
export function streakIsAlive(progress: Progress, today: DayKey): boolean {
  if (!progress.lastGoalDate) return false;
  const gap = daysBetween(progress.lastGoalDate, today);
  return gap <= 1 + progress.streakFreezes;
}

/* ------------------------------------------------------------------ *
 * Badges
 * ------------------------------------------------------------------ */

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** Rough tier, used only for colour. */
  tier: 'bronze' | 'silver' | 'gold';
  earned: (ctx: BadgeContext) => boolean;
}

export interface BadgeContext {
  progress: Progress;
  matureSteps: number;
  perfectSession: boolean;
  sessionSize: number;
  modesCoveredToday: number;
}

export const BADGES: Badge[] = [
  {
    id: 'first-step',
    name: 'First Step',
    description: 'Review your first reaction.',
    icon: 'FlaskConical',
    tier: 'bronze',
    earned: (c) => c.progress.totalReviews >= 1,
  },
  {
    id: 'week-one',
    name: 'Seven Straight',
    description: 'Hit your daily goal seven days running.',
    icon: 'Flame',
    tier: 'bronze',
    earned: (c) => c.progress.currentStreak >= 7,
  },
  {
    id: 'month-one',
    name: 'Thirty Straight',
    description: 'Hit your daily goal thirty days running.',
    icon: 'Flame',
    tier: 'gold',
    earned: (c) => c.progress.currentStreak >= 30,
  },
  {
    id: 'both-papers',
    name: 'Ambidextrous',
    description: 'Meet both the aromatic and aliphatic goals in one day.',
    icon: 'Split',
    tier: 'silver',
    earned: (c) => c.modesCoveredToday >= 2,
  },
  {
    id: 'flawless',
    name: 'Flawless',
    description: 'Finish a session of 20 or more with nothing marked Again.',
    icon: 'Sparkles',
    tier: 'silver',
    earned: (c) => c.perfectSession && c.sessionSize >= 20,
  },
  {
    id: 'mature-50',
    name: 'Settled',
    description: 'Hold 50 reactions at intervals of three weeks or longer.',
    icon: 'Anchor',
    tier: 'silver',
    earned: (c) => c.matureSteps >= 50,
  },
  {
    id: 'mature-200',
    name: 'Second Nature',
    description: 'Hold 200 reactions at intervals of three weeks or longer.',
    icon: 'Brain',
    tier: 'gold',
    earned: (c) => c.matureSteps >= 200,
  },
  {
    id: 'thousand',
    name: 'Thousand Reviews',
    description: 'Complete 1,000 reviews.',
    icon: 'Trophy',
    tier: 'gold',
    earned: (c) => c.progress.totalReviews >= 1000,
  },
  {
    id: 'accurate',
    name: 'Sharp',
    description: 'Reach 85% lifetime accuracy over at least 200 reviews.',
    icon: 'Target',
    tier: 'silver',
    earned: (c) =>
      c.progress.totalReviews >= 200 &&
      c.progress.totalCorrect / c.progress.totalReviews >= 0.85,
  },
];

const BADGE_BY_ID = new Map(BADGES.map((b) => [b.id, b]));

export function getBadge(id: string): Badge | undefined {
  return BADGE_BY_ID.get(id);
}

/** Returns only the newly-earned badge IDs, so the UI can celebrate once. */
export function newlyEarnedBadges(ctx: BadgeContext): string[] {
  const already = new Set(ctx.progress.badges);
  return BADGES.filter((b) => !already.has(b.id) && b.earned(ctx)).map((b) => b.id);
}

/** A card is "mature" once its interval reaches three weeks — the usual bar. */
export const MATURE_INTERVAL_DAYS = 21;
