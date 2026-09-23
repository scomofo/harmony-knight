import { describe, expect, it } from "vitest";
import { buildComparePitchTask, buildNoteIdTask, buildSelfAttemptTask, buildTask, mulberry32 } from "./tasks.ts";
import { midiToName } from "./music.ts";

describe("mulberry32", () => {
  it("is deterministic for the same seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it("differs across seeds", () => {
    const a = mulberry32(1)();
    const b = mulberry32(2)();
    expect(a).not.toBe(b);
  });
});

describe("buildComparePitchTask", () => {
  it("is deterministic per seed and judges correctly", () => {
    const t1 = buildComparePitchTask(7);
    const t2 = buildComparePitchTask(7);
    expect(t1.audio!.notes).toEqual(t2.audio!.notes);

    const notes = t1.audio!.notes;
    const answer = (notes[0] > notes[1] ? 1 : 2) as 1 | 2;
    expect(t1.judge(answer)).toBe(true);
    expect(t1.judge(answer === 1 ? 2 : 1)).toBe(false);
  });

  it("respects the note range and minimum gap", () => {
    for (const seed of [1, 2, 3, 99, 12345]) {
      const t = buildComparePitchTask(seed, { low: 48, high: 72, gapMin: 2 });
      const [n1, n2] = t.audio!.notes;
      expect(n1).toBeGreaterThanOrEqual(48);
      expect(n1).toBeLessThanOrEqual(72);
      expect(n2).toBeGreaterThanOrEqual(48);
      expect(n2).toBeLessThanOrEqual(72);
      expect(Math.abs(n1 - n2)).toBeGreaterThanOrEqual(2);
      expect(n1).not.toBe(n2);
    }
  });

  it("the two orders both occur across seeds", () => {
    const answers = new Set<number>();
    for (let s = 0; s < 20; s++) {
      const t = buildComparePitchTask(s);
      const notes = t.audio!.notes;
      answers.add(notes[0] > notes[1] ? 1 : 2);
    }
    expect(answers.has(1)).toBe(true);
    expect(answers.has(2)).toBe(true);
  });

  it("offers three progressive hints", () => {
    const t = buildComparePitchTask(5);
    expect(t.hints).toHaveLength(3);
  });

  it("generates unique task ids", () => {
    const ids = new Set([1, 2, 3].map((s) => buildComparePitchTask(s).taskId));
    expect(ids.size).toBe(3);
  });
});

describe("buildNoteIdTask", () => {
  it("is deterministic per seed and judges the exact name", () => {
    const a = buildNoteIdTask(21);
    const b = buildNoteIdTask(21);
    expect(a.taskId).toBe(b.taskId);
    expect(a.audio!.notes).toEqual(b.audio!.notes);
    expect(a.choices).toContain(midiToName(a.audio!.notes[0]!));
    const answer = a.choices!.find((c) => a.judge(c));
    expect(answer).toBe(midiToName(a.audio!.notes[0]!));
    // Letter alone is not enough: octave matters.
    const letterOnly = midiToName(a.audio!.notes[0]!).replace(/\d/, "");
    if (letterOnly !== answer) expect(a.judge(letterOnly)).toBe(false);
  });

  it("offers three progressive hints", () => {
    const t = buildNoteIdTask(21);
    expect(t.hints).toHaveLength(3);
    expect(t.hints[2]).toContain(midiToName(t.audio!.notes[0]!));
  });

  it("buildTask dispatches note-id", () => {
    const t = buildTask("ch2-l1-alphabet", { kind: "note-id", seed: 21 });
    expect(t.kind).toBe("note-id");
    expect(t.taskId).toBe("note-id:21");
  });
});

describe("buildSelfAttemptTask", () => {
  it("always accepts and never shames", () => {
    const t = buildSelfAttemptTask("ch1-l3-timbre");
    expect(t.judge("done")).toBe(true);
    expect(t.taskId).toBe("self-attempt:ch1-l3-timbre");
    expect(t.nudge).toBe("");
  });
  it("task ids are stable across builds (first-attempt evidence survives remounts)", () => {
    expect(buildComparePitchTask(7).taskId).toBe(buildComparePitchTask(7).taskId);
    expect(buildSelfAttemptTask("x").taskId).toBe(buildSelfAttemptTask("x").taskId);
  });
});
