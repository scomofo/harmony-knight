/**
 * Strike: the rhythm-striking game. Notes fall down four lanes toward a hit
 * line; the player strikes each lane in time.
 *
 * Pure engine: chart generation (deterministic per seed), hit judgment with
 * fixed timing windows, scoring with combo and Fever Mode. The component
 * owns rendering, input, and the audio clock; correctness lives here.
 */

import { FEVER_THRESHOLD } from "./curriculum.ts";
import { mulberry32 } from "./tasks.ts";

/** Four lanes on C-D-E-G: always consonant, always singable. */
export const STRIKE_LANES = [60, 62, 64, 67] as const;
export const STRIKE_LANE_KEYS = ["d", "f", "j", "k"] as const;

export type StrikeNote = {
  lane: number; // 0..3
  midi: number;
  /** Scheduled strike time, ms from chart start. */
  atMs: number;
};

export type StrikeChart = {
  seed: number;
  bpm: number;
  notes: StrikeNote[];
  /** Total chart length in ms (last note + tail). */
  durationMs: number;
};

/**
 * Build a deterministic chart: a random-walk melody over the four lanes,
 * mostly quarter notes with occasional eighth-note pairs. Deterministic
 * per (seed, noteCount).
 */
export function buildStrikeChart(seed: number, noteCount = 24, bpm = 112): StrikeChart {
  const rand = mulberry32(seed);
  const beatMs = 60_000 / bpm;
  const notes: StrikeNote[] = [];
  let lane = Math.floor(rand() * STRIKE_LANES.length);
  let atMs = 1200; // lead-in before the first note
  for (let i = 0; i < noteCount; i++) {
    notes.push({ lane, midi: STRIKE_LANES[lane]!, atMs: Math.round(atMs) });
    // Random walk: stay, or step to a neighboring lane.
    const step = Math.floor(rand() * 3) - 1;
    lane = Math.min(3, Math.max(0, lane + step));
    // Mostly quarters; sometimes an eighth-note pair hurries the line.
    const eighthPair = rand() < 0.22 && i + 1 < noteCount;
    atMs += eighthPair ? beatMs / 2 : beatMs;
  }
  return { seed, bpm, notes, durationMs: Math.round(atMs + beatMs) };
}

export type StrikeJudgment = "perfect" | "good" | "miss";

export const PERFECT_WINDOW_MS = 90;
export const GOOD_WINDOW_MS = 180;

/** Judge a lane strike against a note's scheduled time. */
export function judgeStrikeHit(deltaMs: number): StrikeJudgment {
  const d = Math.abs(deltaMs);
  if (d <= PERFECT_WINDOW_MS) return "perfect";
  if (d <= GOOD_WINDOW_MS) return "good";
  return "miss";
}

export type StrikeScore = {
  score: number;
  perfect: number;
  good: number;
  miss: number;
  maxCombo: number;
  /** 0..1 across all chart notes. */
  accuracy: number;
  /** Whether fever was reached at any point. */
  feverReached: boolean;
};

/**
 * Score a played chart. Perfect = 300, good = 100, miss breaks combo.
 * Fever Mode: once the combo reaches FEVER_THRESHOLD, points double
 * until the combo breaks. Pure and deterministic.
 */
export function scoreStrike(judgments: StrikeJudgment[]): StrikeScore {
  let score = 0;
  let combo = 0;
  let maxCombo = 0;
  let perfect = 0;
  let good = 0;
  let miss = 0;
  let feverReached = false;
  let fever = false;

  for (const j of judgments) {
    if (j === "miss") {
      miss += 1;
      combo = 0;
      fever = false;
      continue;
    }
    combo += 1;
    maxCombo = Math.max(maxCombo, combo);
    if (combo >= FEVER_THRESHOLD) {
      fever = true;
      feverReached = true;
    }
    const base = j === "perfect" ? 300 : 100;
    score += fever ? base * 2 : base;
    if (j === "perfect") perfect += 1;
    else good += 1;
  }

  const total = judgments.length;
  return {
    score,
    perfect,
    good,
    miss,
    maxCombo,
    accuracy: total === 0 ? 0 : (perfect + good) / total,
    feverReached,
  };
}

/** Harmony points earned from a strike result (persisted totals). */
export function strikePoints(result: StrikeScore): number {
  return Math.round(result.score / 100);
}
