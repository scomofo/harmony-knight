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

/* ------------------------------------------------------------------ */
/* Anti-farming: rematch cooldown + diminishing daily returns            */
/* ------------------------------------------------------------------ */

/** Minimum wait between duel finishes and the next rematch start. */
export const DUEL_REMATCH_COOLDOWN_MS = 90_000;

/**
 * Milliseconds until a rematch may start (0 when ready). Pass the
 * gameStats.lastDuelAt timestamp; 0/never = ready immediately.
 */
export function rematchWaitMs(lastDuelAt: number, now: number): number {
  if (!Number.isFinite(lastDuelAt) || lastDuelAt <= 0) return 0;
  return Math.max(0, lastDuelAt + DUEL_REMATCH_COOLDOWN_MS - now);
}

/**
 * Diminishing point returns per opponent per day: the day's first duel
 * pays full points, each further duel that day pays less (15 -> 8 -> 5 ->
 * 4 -> ...; draws 5 -> 3 -> 2 -> 1 -> ...; losses always 0). Legible in
 * the UI as "repeat duel today: reduced points".
 */
export function duelPointsForDay(outcome: DuelOutcome, duelsPlayedToday: number): number {
  const base = duelPoints(outcome);
  if (base === 0) return 0;
  const n = Math.max(0, Math.floor(duelsPlayedToday));
  return Math.max(1, Math.round(base / (1 + n)));
}

/** Human "Xm Ys" countdown for the rematch button. */
export function formatWaitMs(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return m > 0 ? `${m}m ${rest}s` : `${rest}s`;
}
