/**
 * Pathway selection — the actual scheduler.
 *
 * The student never picks a target or reviews a step directly. They ask for
 * "10 aromatic steps today", and this module decides which pathway puzzles get
 * them there, by scoring every reachable compound as a candidate target: its
 * shortest route covers some set of steps, and a route is worth playing in
 * proportion to how urgently those steps need practice.
 *
 * Greedy set-cover, run once per session build:
 *
 *   1. Score every step still needing practice today (overdue > new > not-yet-due).
 *   2. Score every candidate target by the steps its route would newly cover.
 *   3. Take the best route, mark its steps covered, repeat until the goal is
 *      met or nothing useful remains.
 *
 * This is not optimal set-cover (that's NP-hard and pointless to solve exactly
 * for ~20 candidates) — it is deliberately simple and inspectable, and with a
 * deck this size the difference from optimal is never visible to a student.
 */

import type { FSRS } from 'ts-fsrs';

import { candidateTargets, pathToSteps, rootNode, shortestPath, type StepDefinition } from '../../data/deck';
import { type Mode, type ReviewState } from '../../data/srsTypes';
import { State, retrievability } from './scheduler';

export interface PlannedPathway {
  target: string;
  path: string[];
  steps: StepDefinition[];
  /** How many of this route's steps are new to the student. */
  newSteps: number;
}

export interface SessionPlan {
  pathways: PlannedPathway[];
  /** Distinct step IDs the plan would cover (today's existing + these). */
  coveredStepIds: Set<string>;
  /** True if the goal was fully met; false if the deck ran out first. */
  goalMet: boolean;
}

const NEW_STEP_SCORE = 15;
const NEW_ASPECT_SCORE = 10; // one of the two aspects already seen, one still new
const DUE_BASE_SCORE = 8;
const MAX_CANDIDATES_PER_ROUND = 200; // safety valve, not a real limit at this deck size

function isFullyNew(step: StepDefinition, states: Map<string, ReviewState>): boolean {
  return !states.has(step.productCardId) && !states.has(step.conditionsCardId);
}

/** Higher = more worth visiting today. Negative values are still selectable if nothing better exists. */
function stepUrgency(
  step: StepDefinition,
  states: Map<string, ReviewState>,
  scheduler: FSRS,
  now: Date,
  newAllowed: boolean,
): number {
  const product = states.get(step.productCardId);
  const conditions = states.get(step.conditionsCardId);

  if (!product && !conditions) return newAllowed ? NEW_STEP_SCORE : -1;

  const aspectScore = (state: ReviewState | undefined): number => {
    if (!state) return NEW_ASPECT_SCORE;
    if (state.suspended) return -1000;
    const dueMs = new Date(state.due).getTime();
    if (dueMs <= now.getTime()) {
      const overdueDays = (now.getTime() - dueMs) / 86_400_000;
      // Grows past NEW_STEP_SCORE after ~9 days overdue, so a backlog
      // eventually outranks fresh introductions without needing a hard switch.
      return DUE_BASE_SCORE + Math.min(overdueDays, 40) * 0.8;
    }
    const daysUntilDue = (dueMs - now.getTime()) / 86_400_000;
    // Not due yet: mildly discouraged, but never excluded — a step can still
    // be worth revisiting inside a route chosen for other reasons, and this
    // keeps it selectable as padding when nothing urgent is left.
    return -Math.min(daysUntilDue, 30) * 0.1;
  };

  // The weaker of the two aspects drives whether the step is worth another look.
  return Math.max(aspectScore(product), aspectScore(conditions));
}

/**
 * How many *fully new* steps a route would introduce. Used to keep pathway
 * selection honest against the student's "new steps per day" setting even
 * though a route can't be built one step at a time — if a plausible route to
 * a due step happens to pass through unfamiliar territory, that's still new
 * material and still counts against the budget.
 */
function newStepsInPath(steps: StepDefinition[], states: Map<string, ReviewState>): number {
  return steps.filter((s) => isFullyNew(s, states)).length;
}

export interface PlanSessionInput {
  mode: Mode;
  states: Map<string, ReviewState>;
  scheduler: FSRS;
  now?: Date;
  /** Distinct step IDs already covered earlier today (resuming a session). */
  alreadyCovered?: Set<string>;
  dailyGoalSteps: number;
  newBudgetRemaining: number;
}

export function planSession(input: PlanSessionInput): SessionPlan {
  const {
    mode,
    states,
    scheduler,
    now = new Date(),
    alreadyCovered = new Set<string>(),
    dailyGoalSteps,
    newBudgetRemaining,
  } = input;

  const start = rootNode(mode);
  const targets = candidateTargets(mode);
  const covered = new Set(alreadyCovered);
  const pathways: PlannedPathway[] = [];
  let newUsed = 0;

  // No explicit deck-size cap needed: once every step is covered, no candidate
  // route can add anything new, `best` comes back null, and the loop below
  // stops on its own — even if `dailyGoalSteps` exceeds the whole deck.
  let round = 0;
  while (covered.size < dailyGoalSteps && round < MAX_CANDIDATES_PER_ROUND) {
    round += 1;

    let best: PlannedPathway | null = null;
    let bestScore = 0;

    for (const target of targets) {
      const path = shortestPath(mode, start, target);
      if (!path) continue;
      const steps = pathToSteps(mode, path);
      if (!steps.length) continue;

      const uncovered = steps.filter((s) => !covered.has(s.id));
      if (!uncovered.length) continue; // fully redundant this session

      const newInPath = newStepsInPath(steps, states);
      const newAllowedHere = newUsed + newInPath <= newBudgetRemaining;

      const score = uncovered.reduce((sum, step) => {
        const stepIsNew = isFullyNew(step, states);
        if (stepIsNew && !newAllowedHere) return sum; // over budget: contributes nothing
        return sum + Math.max(0, stepUrgency(step, states, scheduler, now, newAllowedHere));
      }, 0);

      // Normalise by route length so a long detour isn't preferred purely for
      // dragging in extra (possibly low-value) steps.
      const efficiency = score / steps.length;
      if (efficiency > bestScore) {
        bestScore = efficiency;
        best = { target, path, steps, newSteps: newInPath };
      }
    }

    if (!best || bestScore <= 0) break; // nothing left worth playing

    pathways.push(best);
    for (const step of best.steps) covered.add(step.id);
    newUsed += best.newSteps;
  }

  return { pathways, coveredStepIds: covered, goalMet: covered.size >= dailyGoalSteps };
}

/** For the dashboard: how many steps in a mode are at least a little overdue right now. */
export function countDueSteps(mode: Mode, states: Map<string, ReviewState>, now = new Date()): number {
  const seen = new Set<string>();
  let count = 0;
  for (const state of states.values()) {
    if (state.mode !== mode || state.suspended || seen.has(state.stepId)) continue;
    if (state.state !== State.New && new Date(state.due).getTime() <= now.getTime()) {
      seen.add(state.stepId);
      count += 1;
    }
  }
  return count;
}
