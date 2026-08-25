/**
 * Study days, not calendar days.
 *
 * A student revising at 1am should have that count towards the previous day —
 * otherwise a late-night session silently breaks a streak the next evening.
 * Every daily figure in the app (goal progress, streak, heatmap) is keyed by a
 * "study day": the calendar date in the user's timezone, shifted back one day
 * when the local hour is before their rollover hour (default 4am).
 */

export type DayKey = string; // 'YYYY-MM-DD'

export const DEFAULT_ROLLOVER_HOUR = 4;

/** The browser's IANA timezone, e.g. 'Indian/Mauritius'. Falls back to UTC. */
export function detectTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
}

function localParts(at: Date, timeZone: string): LocalParts {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0');
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour') };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** The study-day key for an instant, in a given timezone. */
export function studyDayKey(
  at: Date = new Date(),
  timeZone: string = detectTimeZone(),
  rolloverHour: number = DEFAULT_ROLLOVER_HOUR,
): DayKey {
  const { year, month, day, hour } = localParts(at, timeZone);
  // Anchor in UTC purely for safe date arithmetic — no timezone maths happens here.
  const anchor = Date.UTC(year, month - 1, day);
  const shifted = hour < rolloverHour ? new Date(anchor - 86_400_000) : new Date(anchor);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

/** Move a day key forward or backward by whole days. */
export function addDays(key: DayKey, delta: number): DayKey {
  const [y, m, d] = key.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d) + delta * 86_400_000);
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

/** Whole days between two day keys (b - a). Negative if b precedes a. */
export function daysBetween(a: DayKey, b: DayKey): number {
  const toMs = (k: DayKey) => {
    const [y, m, d] = k.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toMs(b) - toMs(a)) / 86_400_000);
}

/** The last `count` day keys ending at `end`, oldest first. Used by the heatmap. */
export function dayRange(end: DayKey, count: number): DayKey[] {
  return Array.from({ length: count }, (_, i) => addDays(end, i - count + 1));
}

/** Human label for a day key, e.g. "Mon 24 Aug". */
export function formatDayKey(key: DayKey): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}
