import { describe, expect, it } from "vitest";
import {
  GOOD_WINDOW_MS,
  PERFECT_WINDOW_MS,
  buildStrikeChart,
  judgeStrikeHit,
  scoreStrike,
  strikePoints,
} from "./strike.ts";
import { FEVER_THRESHOLD } from "./curriculum.ts";

describe("buildStrikeChart", () => {
  it("is deterministic per seed", () => {
    const a = buildStrikeChart(42);
    const b = buildStrikeChart(42);
    expect(a).toEqual(b);
    expect(a.notes).toHaveLength(24);
  });

  it("walks neighboring lanes on the beat grid", () => {
    const chart = buildStrikeChart(7, 40, 120);
    const beatMs = 500;
    expect(chart.notes[0]!.atMs).toBeGreaterThanOrEqual(1000);
    for (let i = 1; i < chart.notes.length; i++) {
      const prev = chart.notes[i - 1]!;
      const cur = chart.notes[i]!;
      expect(Math.abs(cur.lane - prev.lane)).toBeLessThanOrEqual(1);
      const gap = cur.atMs - prev.atMs;
      // quarter or eighth spacing (rounded)
      expect([Math.round(beatMs), Math.round(beatMs / 2)]).toContain(gap);
      expect(cur.midi).toBe([60, 62, 64, 67][cur.lane]);
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
