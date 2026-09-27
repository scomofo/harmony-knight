import { describe, expect, it } from "vitest";
import {
  buildDuel,
  DUEL_REMATCH_COOLDOWN_MS,
  duelPoints,
  duelPointsForDay,
  formatWaitMs,
  rematchWaitMs,
  rivalSkillForGrade,
  scoreDuel,
} from "./duel.ts";

describe("buildDuel", () => {
  it("is deterministic per seed with pre-rolled rival answers", () => {
    const a = buildDuel(42, 5);
    const b = buildDuel(42, 5);
    expect(a).toEqual(b);
    expect(a.rounds).toHaveLength(6);
    expect(a.rivalCorrect).toHaveLength(6);
  });

  it("varies specs and rival answers across seeds", () => {
    const a = buildDuel(1, 5);
    const c = buildDuel(2, 5);
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(c));
  });

  it("supports short duels for trials", () => {
    expect(buildDuel(9, 6, 4).rounds).toHaveLength(4);
  });

  it("draws every round spec from the duel pool", () => {
    const kinds = new Set(["interval-id", "chord-id", "scale-id", "cadence-id", "motion-id", "seventh-id"]);
    for (const r of buildDuel(123, 8).rounds) {
      expect(kinds.has(r.spec.kind)).toBe(true);
    }
  });
});

describe("rivalSkillForGrade", () => {
  it("grows with grade inside a fair band", () => {
    expect(rivalSkillForGrade(0)).toBeCloseTo(0.55);
    expect(rivalSkillForGrade(5)).toBeCloseTo(0.7);
    expect(rivalSkillForGrade(10)).toBe(0.85);
    expect(rivalSkillForGrade(99)).toBe(0.85);
  });
});

describe("scoreDuel", () => {
  it("tallies rounds and names the outcome", () => {
    expect(scoreDuel([true, true, false], [true, false, false])).toEqual({
      player: 2,
      rival: 1,
      outcome: "win",
    });
    expect(scoreDuel([true], [true])).toEqual({ player: 1, rival: 1, outcome: "draw" });
    expect(scoreDuel([false], [true])).toEqual({ player: 0, rival: 1, outcome: "loss" });
  });
});

describe("duelPoints", () => {
  it("rewards wins most, draws a little, losses nothing", () => {
    expect(duelPoints("win")).toBe(15);
    expect(duelPoints("draw")).toBe(5);
    expect(duelPoints("loss")).toBe(0);
  });
});

describe("rematchWaitMs", () => {
  it("is ready immediately when no duel has been played", () => {
    expect(rematchWaitMs(0, 1_000_000)).toBe(0);
    expect(rematchWaitMs(NaN, 1_000_000)).toBe(0);
  });

  it("enforces the cooldown after a duel", () => {
    const last = 1_000_000;
    expect(rematchWaitMs(last, last)).toBe(DUEL_REMATCH_COOLDOWN_MS);
    expect(rematchWaitMs(last, last + 30_000)).toBe(DUEL_REMATCH_COOLDOWN_MS - 30_000);
    expect(rematchWaitMs(last, last + DUEL_REMATCH_COOLDOWN_MS)).toBe(0);
    expect(rematchWaitMs(last, last + DUEL_REMATCH_COOLDOWN_MS + 999)).toBe(0);
  });
});

describe("duelPointsForDay", () => {
  it("pays full points for the day's first duel", () => {
    expect(duelPointsForDay("win", 0)).toBe(15);
    expect(duelPointsForDay("draw", 0)).toBe(5);
    expect(duelPointsForDay("loss", 0)).toBe(0);
  });

  it("diminishes returns for repeat duels the same day", () => {
    expect(duelPointsForDay("win", 1)).toBe(8); // 15/2
    expect(duelPointsForDay("win", 2)).toBe(5); // 15/3
    expect(duelPointsForDay("win", 3)).toBe(4); // 15/4
    expect(duelPointsForDay("draw", 1)).toBe(3); // 5/2
    expect(duelPointsForDay("draw", 2)).toBe(2); // 5/3
    expect(duelPointsForDay("draw", 5)).toBe(1);
  });

  it("never pays zero or negative for a scoring outcome", () => {
    expect(duelPointsForDay("win", 100)).toBeGreaterThanOrEqual(1);
    expect(duelPointsForDay("draw", 100)).toBeGreaterThanOrEqual(1);
    expect(duelPointsForDay("loss", 100)).toBe(0);
  });

  it("treats negative counts as zero", () => {
    expect(duelPointsForDay("win", -3)).toBe(15);
  });
});

describe("formatWaitMs", () => {
  it("formats countdowns legibly", () => {
    expect(formatWaitMs(0)).toBe("0s");
    expect(formatWaitMs(45_000)).toBe("45s");
    expect(formatWaitMs(90_000)).toBe("1m 30s");
    expect(formatWaitMs(61_200)).toBe("1m 2s");
  });
});
