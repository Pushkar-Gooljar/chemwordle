/**
 * Appwrite wiring constants.
 *
 * The app talks to Appwrite exclusively through the `@appwrite.io/react`
 * provider (`useAppwrite()` gives us `account` and `tablesDB`). Nothing here
 * constructs a Client — that is the provider's job — so there is exactly one
 * SDK client for the whole app and session state stays consistent.
 *
 * Appwrite 1.8+ renamed Databases -> TablesDB (collections -> tables,
 * documents -> rows, attributes -> columns). We use the TablesDB API throughout.
 */

export const APPWRITE = {
  endpoint: import.meta.env.VITE_APPWRITE_ENDPOINT as string,
  projectId: import.meta.env.VITE_APPWRITE_PROJECT_ID as string,
  databaseId: (import.meta.env.VITE_APPWRITE_DATABASE_ID as string) ?? 'chem9701',
} as const;

/** Table IDs. Must match `scripts/setup-appwrite.mjs` exactly. */
export const TABLES = {
  profiles: 'profiles',
  usernames: 'usernames',
  settings: 'user_settings',
  reviewStates: 'review_states',
  reviewLogs: 'review_logs',
  dailyStats: 'daily_stats',
  progress: 'progress',
} as const;

/** Appwrite Function IDs. Must match what's deployed — see docs/APPWRITE_SETUP.md. */
export const FUNCTIONS = {
  deleteAccount: 'delete-account',
} as const;

/** Appwrite row IDs are max 36 chars: a-z A-Z 0-9 . - _ and cannot lead with a special char. */
export const MAX_ROW_ID = 36;

/** Deterministic row ID for the one-row-per-user-per-day stats table. */
export function dailyStatsRowId(userId: string, dayKey: string): string {
  // dayKey is YYYY-MM-DD -> strip hyphens so 20-char userId + 1 + 8 = 29 chars.
  return `${userId}_${dayKey.replace(/-/g, '')}`.slice(0, MAX_ROW_ID);
}

/** True when an Appwrite SDK error is a "row does not exist" 404. */
export function isNotFound(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 404;
}

/** True when an Appwrite SDK error is a uniqueness conflict (409). */
export function isConflict(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 409;
}
