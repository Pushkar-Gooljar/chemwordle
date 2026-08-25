/**
 * Scheduling core — FSRS-6 via `ts-fsrs`.
 *
 * FSRS over SM-2 because it models memory explicitly (Difficulty, Stability,
 * Retrievability, fitted on hundreds of millions of real reviews) rather than
 * multiplying a single "ease factor". That gives a dial — `request_retention`
 * — instead of an emergent, unknowable review load, and published benchmarks
 * put it at roughly 20–30% fewer reviews for equal retention.
 *
 * `maximum_interval` is capped at 180 days rather than FSRS's 100-year default:
 * this is a subject with an exam date, and a step scheduled a year out is a
 * step seen once in Year 12 and never again before the paper.
 */

import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  State,
  type Card as FSRSCard,
  type FSRS,
  type Grade,
  type RecordLogItem,
} from 'ts-fsrs';

import { type CardTemplate, type Mode, type ReviewState } from '../../data/srsTypes';
import { stepIdFromCardId } from '../../data/deck';

export { Rating, State };
export type { Grade };

export const DEFAULT_RETENTION = 0.9;
export const LEECH_THRESHOLD = 6;

export interface SchedulerOptions {
  desiredRetention?: number;
  weights?: number[] | null;
}

export function createScheduler(options: SchedulerOptions = {}): FSRS {
  const { desiredRetention = DEFAULT_RETENTION, weights } = options;
  return fsrs(
    generatorParameters({
      request_retention: clamp(desiredRetention, 0.7, 0.98),
      maximum_interval: 180,
      enable_fuzz: true,
      // Same-day return for a missed step, so a rough pathway still feels
      // productive rather than punishing.
      enable_short_term: true,
      learning_steps: ['1m', '10m'],
      relearning_steps: ['10m'],
      ...(weights && weights.length ? { w: weights } : {}),
    }),
  );
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/* ------------------------------------------------------------------ */

export function freshState(
  userId: string,
  cardId: string,
  mode: Mode,
  template: CardTemplate,
  now: Date = new Date(),
): ReviewState {
  return toReviewState(createEmptyCard(now), { userId, cardId, mode, template });
}

export function toFsrsCard(state: ReviewState): FSRSCard {
  return {
    due: new Date(state.due),
    stability: state.stability,
    difficulty: state.difficulty,
    elapsed_days: state.elapsedDays,
    scheduled_days: state.scheduledDays,
    learning_steps: state.learningSteps,
    reps: state.reps,
    lapses: state.lapses,
    state: state.state as State,
    last_review: state.lastReview ? new Date(state.lastReview) : undefined,
  };
}

export function toReviewState(
  card: FSRSCard,
  meta: { userId: string; cardId: string; mode: Mode; template: CardTemplate; rowId?: string },
  previous?: ReviewState,
): ReviewState {
  return {
    rowId: meta.rowId ?? previous?.rowId,
    userId: meta.userId,
    cardId: meta.cardId,
    stepId: stepIdFromCardId(meta.cardId),
    mode: meta.mode,
    template: meta.template,
    due: card.due.toISOString(),
    stability: round(card.stability),
    difficulty: round(card.difficulty),
    elapsedDays: round(card.elapsed_days),
    scheduledDays: round(card.scheduled_days),
    learningSteps: card.learning_steps ?? 0,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    lastReview: card.last_review ? card.last_review.toISOString() : null,
    suspended: previous?.suspended ?? false,
    leech: card.lapses >= LEECH_THRESHOLD,
  };
}

function round(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}

/* ------------------------------------------------------------------ */

export interface GradeResult {
  next: ReviewState;
  log: RecordLogItem['log'];
}

export function gradeCard(
  scheduler: FSRS,
  state: ReviewState,
  rating: Grade,
  now: Date = new Date(),
): GradeResult {
  const result = scheduler.next(toFsrsCard(state), now, rating);
  const next = toReviewState(
    result.card,
    { userId: state.userId, cardId: state.cardId, mode: state.mode, template: state.template },
    state,
  );
  return { next, log: result.log };
}

/**
 * Map "solved this aspect in N attempts (out of 5)" to an FSRS rating. Failing
 * to solve within the attempt budget is Again; solving on the first try is
 * Easy; the effort in between scales down through Good to Hard.
 */
export function attemptsToGrade(attempts: number, solved: boolean): Grade {
  if (!solved) return Rating.Again;
  if (attempts <= 1) return Rating.Easy;
  if (attempts === 2) return Rating.Good;
  return Rating.Hard; // 3, 4, or 5 attempts
}

export function isCorrect(rating: Grade): boolean {
  return rating !== Rating.Again;
}

export function retrievability(scheduler: FSRS, state: ReviewState, now = new Date()): number {
  if (state.state === State.New) return 0;
  return scheduler.get_retrievability(toFsrsCard(state), now, false) as number;
}
