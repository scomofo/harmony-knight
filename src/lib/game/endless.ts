/**
 * Endless practice: infinite sessions driven by the seeded task engine.
 *
 * Each round picks a self-contained task family at random (seeded), builds
 * the task exactly as lessons do, and scores first-try correctness. The
 * session never ends on its own — the learner chooses "keep going" or
 * "wrap up" after every round. Fully offline; everything is local.
 */

import { mulberry32, type TaskKind } from "./tasks.ts";
import type { TaskSpec } from "./course.ts";

export type EndlessSpec = { kind: TaskKind; seed: number; variant?: string };

/** Self-contained families that judge themselves — no open-ended prompts. */
const FAMILIES: Array<{ kind: TaskKind; variants?: string[] }> = [
  { kind: "compare-pitch" },
  { kind: "note-id" },
  { kind: "rhythm-echo" },
  { kind: "scale-id", variants: ["modes"] },
  { kind: "interval-id" },
  { kind: "chord-id", variants: ["quality", "position"] },
  { kind: "cadence-id", variants: ["final", "open"] },
  { kind: "motion-id" },
  { kind: "modulation-id", variants: ["detect", "where", "fugue"] },
  { kind: "seventh-id" },
  { kind: "meter-id" },
  { kind: "species-id", variants: ["early", "late"] },
  { kind: "transform-id" },
];

export function endlessFamilies(): TaskKind[] {
  return FAMILIES.map((f) => f.kind);
}

/** Deterministic per (rand state): family, then variant, then seed. */
export function pickEndlessSpec(rand: () => number): EndlessSpec {
  const fam = FAMILIES[Math.floor(rand() * FAMILIES.length)]!;
  const variant = fam.variants?.length
    ? fam.variants[Math.floor(rand() * fam.variants.length)]
    : undefined;
  return {
    kind: fam.kind,
    seed: Math.floor(rand() * 1_000_000_000),
    ...(variant ? { variant } : {}),
  };
}

/** TaskSpec for buildTask(). The lesson id is a fixed namespace. */
export function endlessTaskSpec(spec: EndlessSpec): TaskSpec {
  return {
    kind: spec.kind,
    seed: spec.seed,
    ...(spec.variant ? { variant: spec.variant } : {}),
  };
}

export const ENDLESS_LESSON_ID = "endless-practice";

/** Points: 2 for a clean first try, 1 for solving after a miss. */
export const POINTS_FIRST_TRY = 2;
export const POINTS_SOLVED = 1;

export function pointsForRound(firstTry: boolean, solved: boolean): number {
  if (!solved) return 0;
  return firstTry ? POINTS_FIRST_TRY : POINTS_SOLVED;
}

/** Roll one round's spec from a session seed and round index (pure). */
export function roundSpec(sessionSeed: number, round: number): EndlessSpec {
  const rand = mulberry32(sessionSeed);
  let spec = pickEndlessSpec(rand);
  for (let i = 0; i < round; i++) spec = pickEndlessSpec(rand);
  return spec;
}

export type SessionSummary = {
  rounds: number;
  solved: number;
  firstTry: number;
  bestStreak: number;
  points: number;
};

/** Pure session scoring from per-round results. */
export function summarizeSession(
  rounds: Array<{ solved: boolean; firstTry: boolean }>,
): SessionSummary {
  let solved = 0;
  let firstTry = 0;
  let bestStreak = 0;
  let run = 0;
  let points = 0;
  for (const r of rounds) {
    if (r.solved) {
      solved += 1;
      run += 1;
      bestStreak = Math.max(bestStreak, run);
      if (r.firstTry) firstTry += 1;
      points += pointsForRound(r.firstTry, true);
    } else {
      run = 0;
    }
  }
  return { rounds: rounds.length, solved, firstTry, bestStreak, points };
}
