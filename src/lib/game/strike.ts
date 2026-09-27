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

/**
 * Musical phrase archetypes over the four lanes (C-D-E-G):
 * - ascent / descent: a scale run up or down.
 * - arch: up the scale and back — a sung phrase shape.
 * - arpeggio: the C-E-G triad broken up and back down.
 * - motif: a short cell repeated with a new ending (call and answer).
 * - neighbors: an upper-neighbor figure, the smallest ornament.
 */
export const PHRASE_KINDS = [
  "ascent",
  "descent",
  "arch",
  "arpeggio",
  "motif",
  "neighbors",
] as const;
export type PhraseKind = (typeof PHRASE_KINDS)[number];

/** Lane sequence for one phrase archetype; intra-phrase jumps are ≤ 2. */
export function phraseLanes(kind: PhraseKind, rand: () => number): number[] {
  switch (kind) {
    case "ascent":
      return [0, 1, 2, 3];
    case "descent":
      return [3, 2, 1, 0];
    case "arch":
      return [0, 1, 2, 3, 2, 1];
    case "arpeggio":
      return [0, 2, 3, 2, 0];
    case "neighbors": {
      const n = rand() < 0.5 ? 1 : 2;
      return rand() < 0.5 ? [n, n + 1, n, n + 1] : [n + 1, n, n + 1, n];
    }
    case "motif": {
      // A 2-3 note cell, repeated with a changed ending.
      const s = Math.floor(rand() * 2); // 0 or 1, so s+2 stays on the lanes
      const cell = rand() < 0.5 ? [s, s + 1, s + 2] : [s + 2, s + 1, s];
      const ending = rand() < 0.5 ? 0 : 3;
      return [...cell, ...cell.slice(0, 2), ending];
    }
  }
}

/** Fisher–Yates shuffle with the caller's seeded rand. */
export function shuffledDeck<T>(items: readonly T[], rand: () => number): T[] {
  const deck = [...items];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [deck[i], deck[j]] = [deck[j]!, deck[i]!];
  }
  return deck;
}

export type StrikeChart = {
  seed: number;
  bpm: number;
  notes: StrikeNote[];
  /** Total chart length in ms (last note + tail). */
  durationMs: number;
};

/**
 * Build a deterministic chart out of musical phrases — scale runs, arches,
 * arpeggios, and short motifs — chained with stepwise bridges so the line
 * always moves like music, not a coin flip. Phrases are dealt from a
 * seed-shuffled deck, so every chart visits several different archetypes.
 * Deterministic per (seed, noteCount, bpm).
 */
export function buildStrikeChart(seed: number, noteCount = 24, bpm = 112): StrikeChart {
  const rand = mulberry32(seed);
  const beatMs = 60_000 / bpm;
  const lanes: number[] = [];
  let lane = Math.floor(rand() * STRIKE_LANES.length);
  const deck = shuffledDeck(PHRASE_KINDS, rand);
  let dealt = 0;
  const nextKind = (): PhraseKind => {
    if (dealt >= deck.length) {
      deck.push(...shuffledDeck(PHRASE_KINDS, rand));
    }
    return deck[dealt++]!;
  };
  while (lanes.length < noteCount) {
    const phrase = phraseLanes(nextKind(), rand);
    // Stepwise bridge into the phrase start: the line walks, never jumps.
    const start = phrase[0]!;
    while (lane !== start && lanes.length < noteCount) {
      lane += Math.sign(start - lane);
      lanes.push(lane);
    }
    for (const l of phrase) {
      if (lanes.length >= noteCount) break;
      lanes.push(l);
      lane = l;
    }
  }
  const notes: StrikeNote[] = [];
  let atMs = 1200; // lead-in before the first note
  for (let i = 0; i < lanes.length; i++) {
    const l = lanes[i]!;
    notes.push({ lane: l, midi: STRIKE_LANES[l]!, atMs: Math.round(atMs) });
    // Mostly quarters; sometimes an eighth-note pair hurries the line.
    const eighthPair = rand() < 0.22 && i + 1 < lanes.length;
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
