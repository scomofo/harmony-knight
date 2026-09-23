import { describe, expect, it } from "vitest";
import {
  COMPLETION_POINTS,
  canTransition,
  completeLesson,
  dueConcepts,
  nextStep,
  recordCheck,
  recordLearningDay,
  scheduleRecall,
  startLesson,
  todayKey,
} from "./learning.ts";
import { notesNeedingWork, recentAccuracy, recordNoteAnswer } from "./sr.ts";
import { defaultSave, exportSave, importSave, migrateSave, validateSave } from "./schema.ts";
import { CURRICULUM, GRADE_THRESHOLDS, topicCountsForGrade } from "./curriculum.ts";
import { validateContent } from "./course.ts";

describe("lesson state machine", () => {
  it("allows only the Learn -> Try -> Recall -> Done path", () => {
    expect(canTransition("learn", "try")).toBe(true);
    expect(canTransition("try", "recall")).toBe(true);
    expect(canTransition("recall", "done")).toBe(true);
    expect(canTransition("learn", "done")).toBe(false);
    expect(canTransition("learn", "recall")).toBe(false);
    expect(nextStep("recall")).toBe("done");
    expect(nextStep("done")).toBeNull();
  });

  it("records checks preserving first-try truth", () => {
    const { checks, isFirst } = recordCheck([], "c1", true, false);
    expect(isFirst).toBe(true);
    expect(checks[0]!.correctFirstTry).toBe(true);
    const retry = recordCheck(checks, "c1", true, false);
    expect(retry.isFirst).toBe(false);
    // Assisted correct is not first-try credit
    const assisted = recordCheck([], "c2", true, true);
    expect(assisted.checks[0]!.correctFirstTry).toBe(false);
    expect(assisted.checks[0]!.assisted).toBe(true);
  });

  it("awards completion points exactly once", () => {
    const p = startLesson("ch1-l1-pitch");
    const first = completeLesson(p);
    expect(first.points).toBe(COMPLETION_POINTS);
    const second = completeLesson(first.progress);
    expect(second.points).toBe(0);
  });
});

describe("recall scheduling", () => {
  const DAY = 24 * 60 * 60 * 1000;
  it("walks 1 -> 3 -> 7 -> 15 -> 30 on correct recall", () => {
    let prev = scheduleRecall(null, "pitch-direction", "correct", 0);
    expect(prev.intervalDays).toBe(1);
    for (const expected of [3, 7, 15, 30, 30]) {
      prev = scheduleRecall(prev, "pitch-direction", "correct", prev.dueAt);
      expect(prev.intervalDays).toBe(expected);
    }
  });

  it("resets to 1 day on wrong or assisted recall", () => {
    const prev = scheduleRecall(null, "x", "correct", 0);
    const after = scheduleRecall({ ...prev, intervalDays: 15 }, "x", "wrong", 0);
    expect(after.intervalDays).toBe(1);
    const assisted = scheduleRecall({ ...prev, intervalDays: 15 }, "x", "assisted", 0);
    expect(assisted.intervalDays).toBe(1);
    expect(after.dueAt).toBe(DAY);
  });

  it("finds due concepts", () => {
    const now = 10 * DAY;
    const concepts = {
      a: { conceptId: "a", intervalDays: 1, dueAt: 5 * DAY, lastResult: "correct" as const },
      b: { conceptId: "b", intervalDays: 7, dueAt: 20 * DAY, lastResult: "correct" as const },
    };
    expect(dueConcepts(concepts, now).map((c) => c.conceptId)).toEqual(["a"]);
  });

  it("records learning days without streak debt", () => {
    const d = new Date(2026, 8, 23);
    const days = recordLearningDay(recordLearningDay([], d), d);
    expect(days).toHaveLength(1);
    expect(todayKey(d)).toBe("2026-09-23");
  });
});

describe("note spaced repetition", () => {
  it("clears a note at 80% recent accuracy with a correct latest answer", () => {
    const { cleared, evidence } = recordNoteAnswer(null, "E4", true, true, 0.9, 0);
    expect(cleared).toBe(true);
    expect(evidence.lastCorrect).toBe(true);
  });

  it("does not clear below 80% or on a wrong latest answer", () => {
    expect(recordNoteAnswer(null, "E4", true, true, 0.7, 0).cleared).toBe(false);
    expect(recordNoteAnswer(null, "E4", false, false, 0.95, 0).cleared).toBe(false);
  });

  it("assisted-correct counts as correct for scheduling but not for first-try accuracy", () => {
    const { cleared, evidence } = recordNoteAnswer(null, "E4", true, false, 0.95, 0);
    expect(evidence.lastCorrect).toBe(true);
    expect(evidence.firstTryCorrect).toBe(0);
    expect(evidence.dueAt).toBe(3 * 24 * 60 * 60 * 1000); // long interval, like any correct answer
    expect(cleared).toBe(true); // correct + 80% recent first-try accuracy
  });

  it("flags weak and due notes", () => {
    const now = 1000;
    const evidence = {
      "E4": { note: "E4", attempts: 3, firstTryCorrect: 1, lastCorrect: false, dueAt: now + 99999 },
      "G4": { note: "G4", attempts: 5, firstTryCorrect: 5, lastCorrect: true, dueAt: now - 1 },
      "C4": { note: "C4", attempts: 5, firstTryCorrect: 5, lastCorrect: true, dueAt: now + 99999 },
    };
    const needy = notesNeedingWork(evidence, now).map((e) => e.note).sort();
    expect(needy).toEqual(["E4", "G4"]);
  });

  it("computes recent accuracy", () => {
    expect(recentAccuracy([true, true, true, true, false])).toBe(0.8);
    expect(recentAccuracy([])).toBe(1);
  });
});

describe("save schema, migrations, import validation", () => {
  it("round-trips export/import", () => {
    const save = { ...defaultSave(), harmonyPoints: 50, onboarded: true };
    const imported = importSave(exportSave(save));
    expect(imported?.harmonyPoints).toBe(50);
    expect(imported?.onboarded).toBe(true);
  });

  it("rejects malformed imports without touching live state", () => {
    expect(importSave("not json")).toBeNull();
    expect(importSave(JSON.stringify({ ...defaultSave(), grade: 99 }))).toBeNull();
    expect(importSave(JSON.stringify({ ...defaultSave(), settings: { volume: 5 } }))).toBeNull();
  });

  it("fills defaults for sparse but valid saves", () => {
    const imported = importSave(JSON.stringify({ version: 1 }));
    expect(imported).not.toBeNull();
    expect(imported?.settings.focusMode).toBe(true);
  });

  it("rejects unknown versions (no guessing)", () => {
    expect(migrateSave({ version: 0 })).toBeNull();
    expect(migrateSave({ version: 999 })).toBeNull();
    expect(validateSave(defaultSave())).toBe(true);
  });
});

describe("curriculum", () => {
  it("has 11 grades with thresholds 0-9", () => {
    expect(CURRICULUM).toHaveLength(11);
    for (let g = 0; g <= 9; g++) expect(GRADE_THRESHOLDS[g]).toBeDefined();
    expect(topicCountsForGrade("sensory", 0)).toBe(true);
    expect(topicCountsForGrade("duel", 0)).toBe(false);
  });
});

describe("content structure", () => {
  it("passes structural validation", () => {
    expect(validateContent()).toEqual([]);
  });
});
