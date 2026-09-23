import { describe, expect, it } from "vitest";
import { buildDuel, duelPoints, rivalSkillForGrade, scoreDuel } from "./duel.ts";

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
