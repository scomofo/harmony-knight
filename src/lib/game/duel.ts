/**
 * Duel: an ear-training sparring match against a simulated rival.
 *
 * Each round asks a question from the practical task families; the player
 * answers through the normal task UI while the rival "answers" with a
 * seeded skill level that grows with grade. First to the higher score wins.
 *
 * Pure engine: duel construction, bot simulation, scoring. The component
 * owns presentation, timing, and effects.
 */

import { mulberry32 } from "./tasks.ts";
import type { TaskSpec } from "./course.ts";

/** Task families eligible for duel rounds (auto-judged, single answer). */
export const DUEL_SPECS: TaskSpec[] = [
  { kind: "interval-id", seed: 0 },
  { kind: "chord-id", seed: 0, variant: "quality" },
  { kind: "scale-id", seed: 0 },
  { kind: "cadence-id", seed: 0, variant: "final" },
  { kind: "motion-id", seed: 0 },
  { kind: "seventh-id", seed: 0 },
];

export type DuelRound = {
  index: number;
  spec: TaskSpec;
};

export type Duel = {
  seed: number;
  grade: number;
  rounds: DuelRound[];
  /** Rival's per-round correctness, pre-rolled for determinism. */
  rivalCorrect: boolean[];
};

/** Rival skill: a fair fight that sharpens with grade (55% → 85%). */
export function rivalSkillForGrade(grade: number): number {
  return Math.min(0.85, Math.max(0.5, 0.55 + grade * 0.03));
}

/** Build a deterministic duel: specs and rival answers per (seed, grade). */
export function buildDuel(seed: number, grade: number, roundCount = 6): Duel {
  const rand = mulberry32(seed);
  const skill = rivalSkillForGrade(grade);
  const rounds: DuelRound[] = [];
  const rivalCorrect: boolean[] = [];
  for (let i = 0; i < roundCount; i++) {
    const base = DUEL_SPECS[Math.floor(rand() * DUEL_SPECS.length)]!;
    rounds.push({ index: i, spec: { ...base, seed: Math.floor(rand() * 1_000_000) } });
    rivalCorrect.push(rand() < skill);
  }
  return { seed, grade, rounds, rivalCorrect };
}

export type DuelOutcome = "win" | "draw" | "loss";

/** Score a finished duel from per-round correctness. */
export function scoreDuel(
  playerCorrect: boolean[],
  rivalCorrect: boolean[],
): { player: number; rival: number; outcome: DuelOutcome } {
  const player = playerCorrect.filter(Boolean).length;
  const rival = rivalCorrect.filter(Boolean).length;
  const outcome: DuelOutcome = player > rival ? "win" : player < rival ? "loss" : "draw";
  return { player, rival, outcome };
}

/** Harmony points for a duel outcome (persisted totals). */
export function duelPoints(outcome: DuelOutcome): number {
  return outcome === "win" ? 15 : outcome === "draw" ? 5 : 0;
}
