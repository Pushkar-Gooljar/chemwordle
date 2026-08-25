import { type ConditionSpec, type Compound, type Transition } from './types';

export type Mode = 'aromatic' | 'aliphatic';
export const MODES: Mode[] = ['aromatic', 'aliphatic'];

/**
 * Every step is scheduled as two aspects, because the game itself tests two
 * different things about the same arrow: Phase 1 asks "what does this
 * produce" (`product`), Phase 2 asks "what reagents and conditions get you
 * there" (`conditions`). Both are exercised every time the step appears in a
 * played pathway — nothing renders them separately.
 */
export type CardTemplate = 'product' | 'conditions';

/** Persisted FSRS scheduling state for one aspect of one step, one user. */
export interface ReviewState {
  rowId?: string;
  userId: string;
  cardId: string; // `${stepId}:p` or `${stepId}:c`
  stepId: string;
  mode: Mode;
  template: CardTemplate;

  due: string; // ISO
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  /** ts-fsrs State: 0 New, 1 Learning, 2 Review, 3 Relearning. */
  state: number;
  lastReview: string | null;

  suspended: boolean;
  leech: boolean;
}

/** One slot's outcome inside a completed (or abandoned) pathway. */
export interface PathwayStepAttempt {
  attempts: number;
  solved: boolean;
}

/** What the game hands back when a pathway ends, win or lose. */
export interface PathwayFinishResult {
  mode: Mode;
  target: string;
  /** Full compound path, start to target inclusive. */
  path: string[];
  /** One entry per step (path.length - 1), aligned by index. `null` = never reached. */
  productResults: (PathwayStepAttempt | null)[];
  conditionResults: (PathwayStepAttempt | null)[];
  durationMs: number;
}

export interface ReviewLogEntry {
  userId: string;
  stepId: string;
  mode: Mode;
  template: CardTemplate;
  rating: number;
  state: number;
  dueBefore: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reviewedAt: string;
  attempts: number;
  correct: boolean;
}

export interface UserSettings {
  dailyGoalAromatic: number;
  dailyGoalAliphatic: number;
  newPerDayAromatic: number;
  newPerDayAliphatic: number;
  desiredRetention: number;
  timezone: string;
  dayRolloverHour: number;
  theme: 'light' | 'dark' | 'system';
  reminderEmails: boolean;
  fsrsWeights: number[] | null;
}

export interface Profile {
  userId: string;
  username: string;
  usernameLower: string;
  fullName: string;
  schoolName: string;
  schoolNameLower: string;
  yearOfBirth: number;
  avatarSeed: string;
  onboardedAt: string | null;
}

export interface Progress {
  userId: string;
  username: string;
  schoolNameLower: string;
  totalXp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastGoalDate: string | null;
  streakFreezes: number;
  freezeUsedDates: string[];
  totalReviews: number;
  totalCorrect: number;
  badges: string[];
  matureSteps: number;
  updatedAt: string;
}

/**
 * One day's progress towards the two goals. `aromaticSteps` /
 * `aliphaticSteps` hold the *distinct step IDs* attempted today — the goal is
 * "10 different steps", so what counts is the set, not a raw review tally.
 */
export interface DailyStat {
  userId: string;
  date: string;
  aromaticSteps: string[];
  aliphaticSteps: string[];
  aromaticNew: number;
  aliphaticNew: number;
  aromaticGoal: number;
  aliphaticGoal: number;
  goalMet: boolean;
  xp: number;
  correct: number;
  total: number;
  timeMs: number;
}

export type { ConditionSpec, Compound, Transition };
