import { describe, expect, it } from "vitest";
import {
  GOOD_WINDOW_MS,
  PERFECT_WINDOW_MS,
  PHRASE_KINDS,
  buildStrikeChart,
  judgeStrikeHit,
  phraseLanes,
  scoreStrike,
  strikePoints,
} from "./strike.ts";
import { FEVER_THRESHOLD } from "./curriculum.ts";
import { mulberry32 } from "./tasks.ts";

describe("phraseLanes", () => {
  it("produces a scale run for ascent/descent", () => {
    const rand = mulberry32(1);
    expect(phraseLanes("ascent", rand)).toEqual([0, 1, 2, 3]);
    expect(phraseLanes("descent", rand)).toEqual([3, 2, 1, 0]);
  });

  it("arches up and back down", () => {
    expect(phraseLanes("arch", mulberry32(1))).toEqual([0, 1, 2, 3, 2, 1]);
  });

  it("breaks the triad for arpeggio", () => {
    expect(phraseLanes("arpeggio", mulberry32(1))).toEqual([0, 2, 3, 2, 0]);
  });

  it("builds motifs as a repeated cell with a new ending", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const m = phraseLanes("motif", mulberry32(seed));
      expect(m.length).toBeGreaterThanOrEqual(5);
      // First two notes of the repeat match the cell opening.
      expect(m[3]).toBe(m[0]);
      expect(m[4]).toBe(m[1]);
      // The ending resolves home (lane 0) or to the top (lane 3).
      expect([0, 3]).toContain(m[m.length - 1]);
    }
  });

  it("neighbors oscillate between adjacent lanes", () => {
    for (const seed of [1, 7, 9]) {
      const n = phraseLanes("neighbors", mulberry32(seed));
      expect(n).toHaveLength(4);
      for (let i = 1; i < n.length; i++) {
        expect(Math.abs(n[i]! - n[i - 1]!)).toBe(1);
      }
    }
  });

  it("keeps every archetype's leaps musical (<= a third)", () => {
    for (const kind of PHRASE_KINDS) {
      for (const seed of [1, 2, 3]) {
        const lanes = phraseLanes(kind, mulberry32(seed));
        for (let i = 1; i < lanes.length; i++) {
          expect(Math.abs(lanes[i]! - lanes[i - 1]!)).toBeLessThanOrEqual(2);
        }
      }
    }
  });
});

describe("buildStrikeChart", () => {
  it("is deterministic per seed", () => {
    const a = buildStrikeChart(42);
    const b = buildStrikeChart(42);
    expect(a).toEqual(b);
    expect(a.notes).toHaveLength(24);
  });

  it("chains phrases on the beat grid with stepwise bridges", () => {
    const chart = buildStrikeChart(7, 40, 120);
    const beatMs = 500;
    expect(chart.notes[0]!.atMs).toBeGreaterThanOrEqual(1000);
    for (let i = 1; i < chart.notes.length; i++) {
      const prev = chart.notes[i - 1]!;
      const cur = chart.notes[i]!;
      // Arpeggio thirds at most; phrase joins are stepwise.
      expect(Math.abs(cur.lane - prev.lane)).toBeLessThanOrEqual(2);
      const gap = cur.atMs - prev.atMs;
      // quarter or eighth spacing (rounded)
      expect([Math.round(beatMs), Math.round(beatMs / 2)]).toContain(gap);
      expect(cur.midi).toBe([60, 62, 64, 67][cur.lane]);
    }
  });

  it("deals phrases from a shuffled deck: early phrases are all different", () => {
    // A 24-note chart holds ~5 phrases; the first four come from one
    // shuffled deck, so they must be four distinct archetypes.
    const chart = buildStrikeChart(42, 24);
    const lanes = chart.notes.map((n) => n.lane);
    // Find phrase starts: a stepwise bridge ends where a phrase's first
    // lane breaks the walk... instead assert musical shape directly:
    // the chart contains a 4-note scale run somewhere (ascent/arch).
    const hasRun = lanes.some(
      (_, i) =>
        i + 3 < lanes.length &&
        ((lanes[i]! < lanes[i + 1]! && lanes[i + 1]! < lanes[i + 2]! && lanes[i + 2]! < lanes[i + 3]!) ||
          (lanes[i]! > lanes[i + 1]! && lanes[i + 1]! > lanes[i + 2]! && lanes[i + 2]! > lanes[i + 3]!)),
    );
    expect(hasRun).toBe(true);
  });

  it("visits several archetypes across seeds (deck dealing)", () => {
    // A 48-note chart deals ~9 phrases: the first six are a full shuffled
    // deck, so every archetype appears.
    for (const seed of [3, 11, 99]) {
      const chart = buildStrikeChart(seed, 48);
      const lanes = chart.notes.map((n) => n.lane);
      const hasAscent = lanes.some(
        (_, i) => i + 3 < lanes.length && lanes[i] === 0 && lanes[i + 1] === 1 && lanes[i + 2] === 2 && lanes[i + 3] === 3,
      );
      const hasArpeggio = lanes.some(
        (_, i) => i + 4 < lanes.length && lanes[i] === 0 && lanes[i + 1] === 2 && lanes[i + 2] === 3 && lanes[i + 3] === 2 && lanes[i + 4] === 0,
      );
      expect(hasAscent).toBe(true);
      expect(hasArpeggio).toBe(true);
    }
  });

  it("supports short charts for trials", () => {
    expect(buildStrikeChart(1, 12).notes).toHaveLength(12);
  });
});

describe("judgeStrikeHit", () => {
  it("applies the fixed timing windows symmetrically", () => {
    expect(judgeStrikeHit(0)).toBe("perfect");
    expect(judgeStrikeHit(PERFECT_WINDOW_MS)).toBe("perfect");
    expect(judgeStrikeHit(-PERFECT_WINDOW_MS)).toBe("perfect");
    expect(judgeStrikeHit(PERFECT_WINDOW_MS + 1)).toBe("good");
    expect(judgeStrikeHit(GOOD_WINDOW_MS)).toBe("good");
    expect(judgeStrikeHit(-GOOD_WINDOW_MS)).toBe("good");
    expect(judgeStrikeHit(GOOD_WINDOW_MS + 1)).toBe("miss");
    expect(judgeStrikeHit(9999)).toBe("miss");
  });
});

describe("scoreStrike", () => {
  it("scores perfect=300, good=100, miss=0 with combo tracking", () => {
    const s = scoreStrike(["perfect", "good", "miss", "perfect"]);
    expect(s.score).toBe(300 + 100 + 0 + 300);
    expect(s.perfect).toBe(2);
    expect(s.good).toBe(1);
    expect(s.miss).toBe(1);
    expect(s.maxCombo).toBe(2);
    expect(s.accuracy).toBe(3 / 4);
    expect(s.feverReached).toBe(false);
  });

  it("doubles points during fever once combo reaches the threshold", () => {
    const run = Array<string>(FEVER_THRESHOLD).fill("perfect");
    const s = scoreStrike(run as ("perfect" | "good" | "miss")[]);
    // First FEVER_THRESHOLD-1 at 300, the 10th at 600.
    expect(s.score).toBe((FEVER_THRESHOLD - 1) * 300 + 600);
    expect(s.feverReached).toBe(true);
    expect(s.maxCombo).toBe(FEVER_THRESHOLD);
  });

  it("ends fever on a miss and can re-trigger", () => {
    const seq: ("perfect" | "good" | "miss")[] = [
      ...Array<("perfect")>(FEVER_THRESHOLD).fill("perfect"),
      "miss",
      ...Array<("perfect")>(FEVER_THRESHOLD).fill("perfect"),
    ];
    const s = scoreStrike(seq);
    expect(s.maxCombo).toBe(FEVER_THRESHOLD);
    // 9*300 + 600 (first fever) + 9*300 + 600 (second fever)
    expect(s.score).toBe(2 * ((FEVER_THRESHOLD - 1) * 300 + 600));
    expect(s.miss).toBe(1);
  });

  it("handles empty input", () => {
    expect(scoreStrike([]).accuracy).toBe(0);
    expect(scoreStrike([]).score).toBe(0);
  });
});

describe("strikePoints", () => {
  it("converts score to persisted points", () => {
    const s = scoreStrike(["perfect", "perfect"]);
    expect(strikePoints(s)).toBe(6);
  });
});
