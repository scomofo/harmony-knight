/**
 * Endless practice: seeded family picking, session scoring, and the
 * keep-going / wrap-up flow's pure helpers.
 */
import { describe, expect, it } from "vitest";
import {
  ENDLESS_LESSON_ID,
  POINTS_FIRST_TRY,
  POINTS_SOLVED,
  endlessFamilies,
  endlessTaskSpec,
  pickEndlessSpec,
  pointsForRound,
  roundSpec,
  summarizeSession,
} from "./endless.ts";
import { buildTask, mulberry32 } from "./tasks.ts";

describe("endless family picking", () => {
  it("is deterministic for a fixed seed", () => {
    const a = pickEndlessSpec(mulberry32(1234));
    const b = pickEndlessSpec(mulberry32(1234));
    expect(a).toEqual(b);
  });

  it("covers many families across draws", () => {
    const rand = mulberry32(99);
    const kinds = new Set(Array.from({ length: 200 }, () => pickEndlessSpec(rand).kind));
    expect(kinds.size).toBeGreaterThan(6);
  });

  it("never picks open-ended or game families", () => {
    const rand = mulberry32(7);
    for (let i = 0; i < 200; i++) {
      const spec = pickEndlessSpec(rand);
      expect(spec.kind).not.toBe("self-attempt");
      expect(endlessFamilies()).toContain(spec.kind);
    }
  });

  it("roundSpec is stable per (sessionSeed, round)", () => {
    expect(roundSpec(555, 3)).toEqual(roundSpec(555, 3));
    expect(roundSpec(555, 3)).not.toEqual(roundSpec(555, 4));
  });

  it("every picked spec builds a real task", () => {
    const rand = mulberry32(2026);
    for (let i = 0; i < 40; i++) {
      const spec = pickEndlessSpec(rand);
      const task = buildTask(ENDLESS_LESSON_ID, endlessTaskSpec(spec));
      expect(task.kind).toBe(spec.kind);
      expect(typeof task.judge).toBe("function");
      expect(task.prompt.length).toBeGreaterThan(0);
    }
  });
});

describe("scoring", () => {
  it("awards 2 for a first-try solve, 1 for a later solve, 0 for unsolved", () => {
    expect(pointsForRound(true, true)).toBe(POINTS_FIRST_TRY);
    expect(pointsForRound(false, true)).toBe(POINTS_SOLVED);
    expect(pointsForRound(false, false)).toBe(0);
    expect(pointsForRound(true, false)).toBe(0);
  });

  it("summarizes a session: rounds, accuracy, best streak, points", () => {
    const summary = summarizeSession([
      { solved: true, firstTry: true }, // +2, streak 1
      { solved: true, firstTry: false }, // +1, streak 2
      { solved: false, firstTry: false }, // streak resets
      { solved: true, firstTry: true }, // +2, streak 1
    ]);
    expect(summary.rounds).toBe(4);
    expect(summary.solved).toBe(3);
    expect(summary.firstTry).toBe(2);
    expect(summary.bestStreak).toBe(2);
    expect(summary.points).toBe(5);
  });

  it("handles an empty session", () => {
    expect(summarizeSession([])).toEqual({
      rounds: 0,
      solved: 0,
      firstTry: 0,
      bestStreak: 0,
      points: 0,
    });
  });
});
