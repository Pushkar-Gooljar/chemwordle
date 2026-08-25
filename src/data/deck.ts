/**
 * Deck = the reaction graph, plus the machinery to turn it into playable
 * pathways.
 *
 * The unit of spaced repetition is a **step** — one reaction arrow — not a
 * whole pathway and not a "flashcard". A step is scheduled as two aspects
 * (`product`: can you predict what forms; `conditions`: can you recall the
 * reagents) because that mirrors the game's own two phases, but the student
 * never sees a step in isolation. They only ever see it inside a pathway
 * puzzle, exactly like the original game — the scheduler's only job is
 * choosing *which* pathway to serve, by picking a target whose route covers
 * the steps most in need of practice.
 */

import { AROMATIC_DATA } from './aromaticData';
import { ALIPHATIC_DATA } from './aliphaticData';
import { type Compound, type Transition } from './types';
import { type CardTemplate, type Mode } from './srsTypes';

const ROOT: Record<Mode, string> = { aromatic: 'benzene', aliphatic: 'alkane' };

const DATA: Record<Mode, Record<string, Compound>> = {
  aromatic: AROMATIC_DATA,
  aliphatic: ALIPHATIC_DATA,
};

export function compoundData(mode: Mode): Record<string, Compound> {
  return DATA[mode];
}

export function rootNode(mode: Mode): string {
  return ROOT[mode];
}

/** One reaction arrow — the unit of scheduling. */
export interface StepDefinition {
  /** Stable, content-derived ID (no template suffix — see `makeStepId`). */
  id: string;
  mode: Mode;
  fromKey: string;
  toKey: string;
  from: Compound;
  to: Compound;
  process: string;
  reagents: string[];
  catalysts: string[];
  conditions: Transition['conditions'];
  notes: string;
  tags: string[];
  /** Breadth-first distance from the mode's root compound. */
  depth: number;
  /** ReviewState.cardId for "can you predict the product". */
  productCardId: string;
  /** ReviewState.cardId for "can you recall the reagents and conditions". */
  conditionsCardId: string;
}

/* ------------------------------------------------------------------ *
 * Stable IDs
 * ------------------------------------------------------------------ */

function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36).padStart(7, '0');
}

/**
 * A step's ID hashes its chemical identity — endpoints, process, reagent set —
 * never its prose. This is the contract between the bundle and the database:
 * fixing a typo in `notes` leaves every student's schedule intact; changing
 * which reagents a step uses correctly mints a new step, because it is a new
 * fact. Once shipped, treat this as append-only.
 */
function makeStepId(mode: Mode, fromKey: string, toKey: string, process: string, reagents: string[]): string {
  const identity = [fromKey, toKey, process, [...reagents].sort().join('+')].join('|');
  return `${mode.slice(0, 2)}:${fnv1a(identity)}`;
}

export function cardIdFor(stepId: string, template: CardTemplate): string {
  return `${stepId}:${template[0]}`;
}

export function stepIdFromCardId(cardId: string): string {
  return cardId.slice(0, cardId.lastIndexOf(':'));
}

/* ------------------------------------------------------------------ *
 * Build
 * ------------------------------------------------------------------ */

function computeDepths(data: Record<string, Compound>, root: string): Map<string, number> {
  const depth = new Map<string, number>([[root, 0]]);
  const queue: string[] = [root];
  while (queue.length) {
    const node = queue.shift()!;
    const d = depth.get(node)!;
    for (const t of data[node]?.transitions ?? []) {
      if (!depth.has(t.target)) {
        depth.set(t.target, d + 1);
        queue.push(t.target);
      }
    }
  }
  const fallback = Math.max(0, ...depth.values()) + 1;
  for (const key of Object.keys(data)) if (!depth.has(key)) depth.set(key, fallback);
  return depth;
}

function buildMode(mode: Mode): StepDefinition[] {
  const data = DATA[mode];
  const depths = computeDepths(data, ROOT[mode]);
  const steps: StepDefinition[] = [];

  for (const [fromKey, compound] of Object.entries(data)) {
    for (const transition of compound.transitions) {
      const to = data[transition.target];
      if (!to) continue; // dangling target — ignore rather than crash a session

      const id = makeStepId(mode, fromKey, transition.target, transition.process, transition.reagents);
      steps.push({
        id,
        mode,
        fromKey,
        toKey: transition.target,
        from: compound,
        to,
        process: transition.process,
        reagents: transition.reagents,
        catalysts: transition.catalysts,
        conditions: transition.conditions,
        notes: transition.notes,
        tags: Array.from(new Set([...compound.tags, ...to.tags])),
        depth: depths.get(fromKey) ?? 99,
        productCardId: cardIdFor(id, 'product'),
        conditionsCardId: cardIdFor(id, 'conditions'),
      });
    }
  }
  return steps;
}

export const STEPS: Record<Mode, StepDefinition[]> = {
  aromatic: buildMode('aromatic'),
  aliphatic: buildMode('aliphatic'),
};

const STEP_BY_ID = new Map(
  [...STEPS.aromatic, ...STEPS.aliphatic].map((s) => [s.id, s] as const),
);

export function getStep(id: string): StepDefinition | undefined {
  return STEP_BY_ID.get(id);
}

export function stepCount(mode: Mode): number {
  return STEPS[mode].length;
}

/* ------------------------------------------------------------------ *
 * Pathfinding
 *
 * Only shortest paths are used, exactly as the original game did: BFS from
 * the root, and where a compound has several transitions leading to the same
 * target, the first-declared one wins (`.find`). This matches the original
 * `findPath` behaviour exactly, so puzzles look and feel identical.
 * ------------------------------------------------------------------ */

export function shortestPath(mode: Mode, start: string, target: string): string[] | null {
  const data = DATA[mode];
  const queue: { node: string; path: string[] }[] = [{ node: start, path: [start] }];
  const visited = new Set([start]);

  while (queue.length) {
    const { node, path } = queue.shift()!;
    if (node === target) return path;
    for (const t of data[node]?.transitions ?? []) {
      if (!visited.has(t.target)) {
        visited.add(t.target);
        queue.push({ node: t.target, path: [...path, t.target] });
      }
    }
  }
  return null;
}

/** The steps along a compound path, in order. One entry per arrow. */
export function pathToSteps(mode: Mode, path: string[]): StepDefinition[] {
  const data = DATA[mode];
  const out: StepDefinition[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i];
    const to = path[i + 1];
    const transition = data[from]?.transitions.find((t) => t.target === to);
    if (!transition) continue;
    const id = makeStepId(mode, from, to, transition.process, transition.reagents);
    const step = STEP_BY_ID.get(id);
    if (step) out.push(step);
  }
  return out;
}

/**
 * Every compound worth offering as a pathway target — i.e. every compound
 * whose route actually needs to exist for its steps to ever get scheduled.
 *
 * A 1-edge target (start → target directly, zero intermediates) is only
 * offered when that step has no longer route at all — a genuine dead end
 * like benzene → cyclohexane, which has no onward transitions of its own and
 * so can never appear as an intermediate inside a longer pathway. Whenever a
 * longer route *does* cover the same step (e.g. benzene → methylbenzene is
 * also the first step of benzene → methylbenzene → benzoic acid), the direct
 * 1-edge version is dropped: serving it would be a degenerate puzzle with no
 * intermediate to guess, exercising a step a longer, more useful route
 * already reaches.
 */
export function candidateTargets(mode: Mode, maxEdges = 7): string[] {
  const start = ROOT[mode];
  const data = DATA[mode];

  const withPath = Object.keys(data)
    .filter((key) => key !== start)
    .map((key) => ({ key, path: shortestPath(mode, start, key) }))
    .filter((t): t is { key: string; path: string[] } => t.path !== null && t.path.length - 1 <= maxEdges);

  const extended = withPath.filter((t) => t.path.length - 1 >= 2);
  const direct = withPath.filter((t) => t.path.length - 1 === 1);

  const coveredStepIds = new Set(extended.flatMap((t) => pathToSteps(mode, t.path).map((s) => s.id)));

  const necessaryDirect = direct.filter((t) =>
    pathToSteps(mode, t.path).some((s) => !coveredStepIds.has(s.id)),
  );

  return [...extended, ...necessaryDirect].map((t) => t.key);
}
