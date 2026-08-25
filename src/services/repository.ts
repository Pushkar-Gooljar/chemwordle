/**
 * Data access layer. Every Appwrite read/write lives here — components and
 * providers never touch `tablesDB` directly. Functions take the `TablesDB`
 * instance (from `useAppwrite()`) as their first argument so they share the
 * provider's authenticated client.
 */

import { ID, Permission, Query, Role, type Models, type TablesDB } from 'appwrite';

import { APPWRITE, TABLES, dailyStatsRowId, isNotFound } from '../lib/appwrite';
import { DEFAULT_ROLLOVER_HOUR, detectTimeZone, type DayKey } from '../lib/day';
import { DEFAULT_RETENTION } from '../lib/srs/scheduler';
import type {
  DailyStat,
  Mode,
  Profile,
  Progress,
  ReviewLogEntry,
  ReviewState,
  UserSettings,
} from '../data/srsTypes';

type Row = Models.Row;
const db = APPWRITE.databaseId;

function ownerOnly(userId: string): string[] {
  return [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ];
}

function publicRead(userId: string): string[] {
  return [
    Permission.read(Role.users()),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ];
}

/* ================================================================== *
 * Usernames — uniqueness via row ID
 * ================================================================== */

export const USERNAME_PATTERN = /^[a-z][a-z0-9_]{2,19}$/;

export function normaliseUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateUsername(raw: string): string | null {
  const value = normaliseUsername(raw);
  if (value.length < 3) return 'At least 3 characters.';
  if (value.length > 20) return 'At most 20 characters.';
  if (!/^[a-z]/.test(value)) return 'Start with a letter.';
  if (!USERNAME_PATTERN.test(value)) return 'Letters, numbers and underscores only.';
  if (RESERVED_USERNAMES.has(value)) return 'That one is reserved.';
  return null;
}

const RESERVED_USERNAMES = new Set([
  'admin', 'root', 'system', 'support', 'help', 'about', 'settings', 'login',
  'signin', 'signup', 'dashboard', 'leaderboard', 'api', 'null', 'undefined',
  'anonymous', 'moderator', 'staff', 'chemwordle',
]);

export async function isUsernameAvailable(tablesDB: TablesDB, username: string): Promise<boolean> {
  try {
    await tablesDB.getRow({ databaseId: db, tableId: TABLES.usernames, rowId: normaliseUsername(username) });
    return false;
  } catch (err) {
    if (isNotFound(err)) return true;
    throw err;
  }
}

export async function claimUsername(tablesDB: TablesDB, username: string, userId: string): Promise<void> {
  await tablesDB.createRow({
    databaseId: db,
    tableId: TABLES.usernames,
    rowId: normaliseUsername(username),
    data: { userId },
    permissions: [Permission.read(Role.users()), Permission.delete(Role.user(userId))],
  });
}

export async function releaseUsername(tablesDB: TablesDB, username: string): Promise<void> {
  try {
    await tablesDB.deleteRow({ databaseId: db, tableId: TABLES.usernames, rowId: normaliseUsername(username) });
  } catch (err) {
    if (!isNotFound(err)) throw err;
  }
}

/* ================================================================== *
 * Profiles
 * ================================================================== */

function toProfile(row: Row): Profile {
  return {
    userId: row.userId as string,
    username: row.username as string,
    usernameLower: row.usernameLower as string,
    fullName: row.fullName as string,
    schoolName: row.schoolName as string,
    schoolNameLower: row.schoolNameLower as string,
    yearOfBirth: row.yearOfBirth as number,
    avatarSeed: (row.avatarSeed as string) ?? '',
    onboardedAt: (row.onboardedAt as string) ?? null,
  };
}

export async function getProfile(tablesDB: TablesDB, userId: string): Promise<Profile | null> {
  try {
    const row = await tablesDB.getRow({ databaseId: db, tableId: TABLES.profiles, rowId: userId });
    return toProfile(row);
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

export interface OnboardingInput {
  username: string;
  fullName: string;
  schoolName: string;
  yearOfBirth: number;
}

export async function completeOnboarding(
  tablesDB: TablesDB,
  userId: string,
  input: OnboardingInput,
): Promise<Profile> {
  const usernameLower = normaliseUsername(input.username);
  await claimUsername(tablesDB, usernameLower, userId);

  try {
    const row = await tablesDB.upsertRow({
      databaseId: db,
      tableId: TABLES.profiles,
      rowId: userId,
      data: {
        userId,
        username: input.username.trim(),
        usernameLower,
        fullName: input.fullName.trim(),
        schoolName: input.schoolName.trim(),
        schoolNameLower: input.schoolName.trim().toLowerCase(),
        yearOfBirth: input.yearOfBirth,
        avatarSeed: usernameLower,
        onboardedAt: new Date().toISOString(),
      },
      // Owner-only: a real name, school and year of birth for users who are
      // usually under 18. Public ranking reads `progress` instead, which
      // carries only a username.
      permissions: ownerOnly(userId),
    });

    await Promise.all([
      ensureSettings(tablesDB, userId),
      ensureProgress(tablesDB, userId, input.username.trim(), input.schoolName.trim().toLowerCase()),
    ]);

    return toProfile(row);
  } catch (err) {
    await releaseUsername(tablesDB, usernameLower).catch(() => undefined);
    throw err;
  }
}

/* ================================================================== *
 * Settings
 * ================================================================== */

export const DEFAULT_SETTINGS: UserSettings = {
  dailyGoalAromatic: 10,
  dailyGoalAliphatic: 10,
  newPerDayAromatic: 4,
  newPerDayAliphatic: 4,
  desiredRetention: DEFAULT_RETENTION,
  timezone: detectTimeZone(),
  dayRolloverHour: DEFAULT_ROLLOVER_HOUR,
  theme: 'system',
  reminderEmails: true,
  fsrsWeights: null,
};

function toSettings(row: Row): UserSettings {
  const raw = row.fsrsWeights as string | undefined;
  let weights: number[] | null = null;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.every((n) => typeof n === 'number')) weights = parsed;
    } catch {
      weights = null;
    }
  }
  return {
    dailyGoalAromatic: row.dailyGoalAromatic as number,
    dailyGoalAliphatic: row.dailyGoalAliphatic as number,
    newPerDayAromatic: row.newPerDayAromatic as number,
    newPerDayAliphatic: row.newPerDayAliphatic as number,
    desiredRetention: row.desiredRetention as number,
    timezone: row.timezone as string,
    dayRolloverHour: row.dayRolloverHour as number,
    theme: row.theme as UserSettings['theme'],
    reminderEmails: row.reminderEmails as boolean,
    fsrsWeights: weights,
  };
}

export async function getSettings(tablesDB: TablesDB, userId: string): Promise<UserSettings | null> {
  try {
    const row = await tablesDB.getRow({ databaseId: db, tableId: TABLES.settings, rowId: userId });
    return toSettings(row);
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

export async function ensureSettings(tablesDB: TablesDB, userId: string): Promise<UserSettings> {
  const existing = await getSettings(tablesDB, userId);
  if (existing) return existing;
  return saveSettings(tablesDB, userId, DEFAULT_SETTINGS);
}

export async function saveSettings(
  tablesDB: TablesDB,
  userId: string,
  settings: UserSettings,
): Promise<UserSettings> {
  const row = await tablesDB.upsertRow({
    databaseId: db,
    tableId: TABLES.settings,
    rowId: userId,
    data: {
      ...settings,
      // Appwrite rejects an explicit `null` for an optional varchar column on
      // create — "optional" means the key may be omitted, not that `null` is
      // a valid value. `''` round-trips to `null` in `toSettings` below.
      fsrsWeights: settings.fsrsWeights ? JSON.stringify(settings.fsrsWeights) : '',
    },
    permissions: ownerOnly(userId),
  });
  return toSettings(row);
}

/* ================================================================== *
 * Review states (one row per step-aspect)
 * ================================================================== */

function toReviewStateRow(row: Row): ReviewState {
  return {
    rowId: row.$id,
    userId: row.userId as string,
    cardId: row.cardId as string,
    stepId: row.stepId as string,
    mode: row.mode as Mode,
    template: row.template as ReviewState['template'],
    due: row.due as string,
    stability: row.stability as number,
    difficulty: row.difficulty as number,
    elapsedDays: row.elapsedDays as number,
    scheduledDays: row.scheduledDays as number,
    learningSteps: (row.learningSteps as number) ?? 0,
    reps: row.reps as number,
    lapses: row.lapses as number,
    state: row.state as number,
    lastReview: (row.lastReview as string) || null,
    suspended: (row.suspended as boolean) ?? false,
    leech: (row.leech as boolean) ?? false,
  };
}

function fromReviewState(state: ReviewState) {
  return {
    userId: state.userId,
    cardId: state.cardId,
    stepId: state.stepId,
    mode: state.mode,
    template: state.template,
    due: state.due,
    stability: state.stability,
    difficulty: state.difficulty,
    elapsedDays: state.elapsedDays,
    scheduledDays: state.scheduledDays,
    learningSteps: state.learningSteps,
    reps: state.reps,
    lapses: state.lapses,
    state: state.state,
    // See toSettings/saveSettings: Appwrite rejects explicit `null` for an
    // optional varchar on create, so an unset lastReview goes over the wire
    // as '' and comes back as null via the `|| null` above.
    lastReview: state.lastReview ?? '',
    suspended: state.suspended,
    leech: state.leech,
  };
}

const PAGE = 100;

/**
 * Load every scheduling row the student owns, once, at sign-in. The deck is a
 * few hundred rows at most, so this is cheaper and far more responsive than
 * querying per pathway — the whole session is scheduled locally against it.
 */
export async function listReviewStates(tablesDB: TablesDB, userId: string): Promise<ReviewState[]> {
  const out: ReviewState[] = [];
  let cursor: string | undefined;

  for (;;) {
    const queries = [
      Query.equal('userId', userId),
      Query.limit(PAGE),
      Query.orderAsc('$id'),
      ...(cursor ? [Query.cursorAfter(cursor)] : []),
    ];
    const page = await tablesDB.listRows({ databaseId: db, tableId: TABLES.reviewStates, queries, total: false });
    out.push(...page.rows.map(toReviewStateRow));
    if (page.rows.length < PAGE) break;
    cursor = page.rows[page.rows.length - 1].$id;
  }
  return out;
}

export async function saveReviewState(tablesDB: TablesDB, state: ReviewState): Promise<ReviewState> {
  const data = fromReviewState(state);
  if (state.rowId) {
    const row = await tablesDB.updateRow({ databaseId: db, tableId: TABLES.reviewStates, rowId: state.rowId, data });
    return { ...state, rowId: row.$id };
  }
  const row = await tablesDB.createRow({
    databaseId: db,
    tableId: TABLES.reviewStates,
    rowId: ID.unique(),
    data,
    permissions: ownerOnly(state.userId),
  });
  return { ...state, rowId: row.$id };
}

/** Batched save. Appwrite has no multi-row upsert on the client SDK, so this is parallel single writes. */
export async function saveReviewStates(tablesDB: TablesDB, states: ReviewState[]): Promise<ReviewState[]> {
  return Promise.all(states.map((s) => saveReviewState(tablesDB, s)));
}

export async function setSuspended(tablesDB: TablesDB, state: ReviewState, suspended: boolean): Promise<ReviewState> {
  return saveReviewState(tablesDB, { ...state, suspended });
}

/* ================================================================== *
 * Review logs (append-only)
 * ================================================================== */

export async function logReview(tablesDB: TablesDB, entry: ReviewLogEntry): Promise<void> {
  await tablesDB.createRow({
    databaseId: db,
    tableId: TABLES.reviewLogs,
    rowId: ID.unique(),
    data: entry,
    permissions: [Permission.read(Role.user(entry.userId))],
  });
}

/* ================================================================== *
 * Daily stats
 * ================================================================== */

function toDailyStat(row: Row): DailyStat {
  return {
    userId: row.userId as string,
    date: row.date as string,
    aromaticSteps: (row.aromaticSteps as string[]) ?? [],
    aliphaticSteps: (row.aliphaticSteps as string[]) ?? [],
    aromaticNew: (row.aromaticNew as number) ?? 0,
    aliphaticNew: (row.aliphaticNew as number) ?? 0,
    aromaticGoal: row.aromaticGoal as number,
    aliphaticGoal: row.aliphaticGoal as number,
    goalMet: row.goalMet as boolean,
    xp: row.xp as number,
    correct: row.correct as number,
    total: row.total as number,
    timeMs: row.timeMs as number,
  };
}

export function emptyDailyStat(userId: string, date: DayKey): DailyStat {
  return {
    userId,
    date,
    aromaticSteps: [],
    aliphaticSteps: [],
    aromaticNew: 0,
    aliphaticNew: 0,
    aromaticGoal: 0,
    aliphaticGoal: 0,
    goalMet: false,
    xp: 0,
    correct: 0,
    total: 0,
    timeMs: 0,
  };
}

export async function getDailyStat(tablesDB: TablesDB, userId: string, date: DayKey): Promise<DailyStat | null> {
  try {
    const row = await tablesDB.getRow({
      databaseId: db,
      tableId: TABLES.dailyStats,
      rowId: dailyStatsRowId(userId, date),
    });
    return toDailyStat(row);
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

export async function saveDailyStat(tablesDB: TablesDB, stat: DailyStat): Promise<DailyStat> {
  const row = await tablesDB.upsertRow({
    databaseId: db,
    tableId: TABLES.dailyStats,
    rowId: dailyStatsRowId(stat.userId, stat.date),
    data: stat,
    permissions: ownerOnly(stat.userId),
  });
  return toDailyStat(row);
}

export async function listDailyStats(tablesDB: TablesDB, userId: string, days = 120): Promise<DailyStat[]> {
  const page = await tablesDB.listRows({
    databaseId: db,
    tableId: TABLES.dailyStats,
    queries: [Query.equal('userId', userId), Query.orderDesc('date'), Query.limit(days)],
    total: false,
  });
  return page.rows.map(toDailyStat);
}

/* ================================================================== *
 * Progress (XP, streak, badges) + leaderboard
 * ================================================================== */

function toProgress(row: Row): Progress {
  return {
    userId: row.userId as string,
    username: row.username as string,
    schoolNameLower: row.schoolNameLower as string,
    totalXp: row.totalXp as number,
    level: row.level as number,
    currentStreak: row.currentStreak as number,
    longestStreak: row.longestStreak as number,
    lastGoalDate: (row.lastGoalDate as string) || null,
    streakFreezes: row.streakFreezes as number,
    freezeUsedDates: (row.freezeUsedDates as string[]) ?? [],
    totalReviews: row.totalReviews as number,
    totalCorrect: row.totalCorrect as number,
    badges: (row.badges as string[]) ?? [],
    matureSteps: (row.matureSteps as number) ?? 0,
    updatedAt: row.updatedAt as string,
  };
}

export function emptyProgress(userId: string, username: string, schoolNameLower: string): Progress {
  return {
    userId,
    username,
    schoolNameLower,
    totalXp: 0,
    level: 1,
    currentStreak: 0,
    longestStreak: 0,
    lastGoalDate: null,
    streakFreezes: 0,
    freezeUsedDates: [],
    totalReviews: 0,
    totalCorrect: 0,
    badges: [],
    matureSteps: 0,
    updatedAt: new Date().toISOString(),
  };
}

export async function getProgress(tablesDB: TablesDB, userId: string): Promise<Progress | null> {
  try {
    const row = await tablesDB.getRow({ databaseId: db, tableId: TABLES.progress, rowId: userId });
    return toProgress(row);
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

export async function ensureProgress(
  tablesDB: TablesDB,
  userId: string,
  username: string,
  schoolNameLower: string,
): Promise<Progress> {
  const existing = await getProgress(tablesDB, userId);
  if (existing) return existing;
  return saveProgress(tablesDB, emptyProgress(userId, username, schoolNameLower));
}

export async function saveProgress(tablesDB: TablesDB, progress: Progress): Promise<Progress> {
  const row = await tablesDB.upsertRow({
    databaseId: db,
    tableId: TABLES.progress,
    rowId: progress.userId,
    data: {
      ...progress,
      // Same Appwrite quirk as fsrsWeights/lastReview above: an unset date
      // must go over the wire as '' on create, never as an explicit `null`.
      lastGoalDate: progress.lastGoalDate ?? '',
      updatedAt: new Date().toISOString(),
    },
    permissions: publicRead(progress.userId),
  });
  return toProgress(row);
}

export type LeaderboardScope = 'global' | 'school';
export type LeaderboardMetric = 'totalXp' | 'currentStreak';

export async function listLeaderboard(
  tablesDB: TablesDB,
  options: { scope: LeaderboardScope; schoolNameLower?: string; metric?: LeaderboardMetric; limit?: number },
): Promise<Progress[]> {
  const { scope, schoolNameLower, metric = 'totalXp', limit = 25 } = options;
  const queries = [Query.orderDesc(metric), Query.limit(limit)];
  if (scope === 'school' && schoolNameLower) queries.unshift(Query.equal('schoolNameLower', schoolNameLower));

  const page = await tablesDB.listRows({
    databaseId: db,
    tableId: TABLES.progress,
    queries,
    total: false,
    ttl: 60,
  });
  return page.rows.map(toProgress);
}
