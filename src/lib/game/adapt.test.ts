/**
 * Adaptive engine (Phase 1) tests: the heuristic is pure, so the math gets
 * tested directly — skill estimates, difficulty thresholds, mastery,
 * confusion-pair scheduling, targeted tasks, and the store/schema wiring.
 */
import { describe, expect, it, beforeEach } from "vitest";
import {
  appendAttempt,
  buildTargetedTask,
  CONFUSION_DOMAINS,
  confusionDue,
  confusionKey,
  describeDifficulty,
  difficultyFor,
  difficultyLevel,
  MASTERY_MIN_EVIDENCE,
  MASTERY_THRESHOLD,
  masteryForLesson,
  recordConfusionHit,
  recordConfusionMiss,
  skillEstimate,
  type AdaptiveAttempt,
  type ConfusionPair,
} from "./adapt.ts";
import {
  buildIntervalIdTask,
  buildNoteIdTask,
  buildRhythmEchoTask,
  buildTask,
  INTERVAL_ID_FULL,
} from "./tasks.ts";
import { midiToName } from "./music.ts";
import { useStore } from "./store.ts";
import { migrateSave, SAVE_VERSION } from "./schema.ts";
import type { LessonProgress } from "./schema.ts";

const att = (correct: boolean, assisted = false, at = 0): AdaptiveAttempt => ({
  at,
  correct,
  firstTry: true,
  assisted,
});

/* ------------------------------------------------------------------ */
/* skillEstimate                                                       */
/* ------------------------------------------------------------------ */

describe("skillEstimate", () => {
  it("returns null with no evidence", () => {
    expect(skillEstimate([])).toBeNull();
  });

  it("scores perfect play as 1 and total misses as 0", () => {
    expect(skillEstimate([att(true), att(true), att(true)])).toBe(1);
    expect(skillEstimate([att(false), att(false)])).toBe(0);
  });

  it("weights recent attempts more than old ones", () => {
    const oldWrongRecentRight = [
      att(false), att(false), att(false), att(false),
      att(true), att(true), att(true), att(true),
    ];
    const oldRightRecentWrong = [
      att(true), att(true), att(true), att(true),
      att(false), att(false), att(false), att(false),
    ];
    const improving = skillEstimate(oldWrongRecentRight)!;
    const declining = skillEstimate(oldRightRecentWrong)!;
    // Same raw accuracy (50%), but recency weighting separates them.
    expect(improving).toBeGreaterThan(0.5);
    expect(declining).toBeLessThan(0.5);
    expect(improving).toBeGreaterThan(declining);
  });

  it("counts assisted-correct as half", () => {
    expect(skillEstimate([att(true, true)])).toBe(0.5);
    const mixed = skillEstimate([att(true, true), att(true, false)])!;
    // weights 1,2 → (0.5*1 + 1*2)/3
    expect(mixed).toBeCloseTo((0.5 + 2) / 3, 5);
  });

  it("only looks at the last N attempts", () => {
    const many = [...Array<AdaptiveAttempt>(20)].map(() => att(false));
    many.push(att(true));
    // Last 10: 9 wrong + 1 right → weights favor the recent right answer.
    const est = skillEstimate(many, 10)!;
    expect(est).toBeGreaterThan(0);
    expect(est).toBeLessThan(0.5);
    // A single recent wrong after 20 rights still drags the estimate down.
    const rights = [...Array<AdaptiveAttempt>(20)].map(() => att(true));
    rights.push(att(false));
    expect(skillEstimate(rights, 10)!).toBeLessThan(1);
  });
});

describe("appendAttempt", () => {
  it("caps the log at 10, keeping the newest", () => {
    let log: AdaptiveAttempt[] = [];
    for (let i = 0; i < 15; i++) log = appendAttempt(log, att(true, false, i));
    expect(log).toHaveLength(10);
    expect(log[0]!.at).toBe(5);
    expect(log[9]!.at).toBe(14);
  });
});

/* ------------------------------------------------------------------ */
/* difficulty                                                           */
/* ------------------------------------------------------------------ */

describe("difficultyLevel", () => {
  it("maps null evidence to standard", () => {
    expect(difficultyLevel(null)).toBe(1);
  });
  it("goes gentle below 0.55 and spicy at/above 0.85", () => {
    expect(difficultyLevel(0)).toBe(0);
    expect(difficultyLevel(0.549)).toBe(0);
    expect(difficultyLevel(0.55)).toBe(1);
    expect(difficultyLevel(0.84)).toBe(1);
    expect(difficultyLevel(0.85)).toBe(2);
    expect(difficultyLevel(1)).toBe(2);
  });
});

describe("difficultyFor / describeDifficulty", () => {
  it("returns standard with a null blurb for unknown domains and no evidence", () => {
    const d = difficultyFor("species-id", undefined);
    expect(d.level).toBe(1);
    expect(d.blurb).toBeNull();
  });
  it("explains itself in UI copy", () => {
    expect(describeDifficulty(2).blurb).toContain("nailing these");
    expect(describeDifficulty(0).blurb).toContain("gentle");
    expect(describeDifficulty(1).blurb).toBeNull();
  });
  it("derives the level from the attempt log", () => {
    const hot = Array<AdaptiveAttempt>(10).fill(att(true));
    expect(difficultyFor("note-id", hot).level).toBe(2);
    const cold = Array<AdaptiveAttempt>(10).fill(att(false));
    expect(difficultyFor("note-id", cold).level).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/* mastery                                                             */
/* ------------------------------------------------------------------ */

function progressWith(checks: boolean[], tasks: (boolean | null)[]): LessonProgress {
  return {
    lessonId: "l",
    step: "done",
    answers: {},
    checks: checks.map((correctFirstTry, i) => ({
      checkId: `c${i}`,
      correctFirstTry,
      assisted: false,
      answeredAt: i,
    })),
    tasks: tasks.map((firstCheckCorrect, i) => ({
      taskId: `t${i}`,
      draft: null,
      feedback: null,
      firstCheckCorrect,
      assisted: false,
      updatedAt: i,
    })),
    completedAt: 1,
    completionPointsAwarded: true,
  };
}

describe("masteryForLesson", () => {
  it("needs minimum evidence before awarding mastery", () => {
    expect(masteryForLesson(undefined)).toEqual({ mastered: false, accuracy: 0, evidenceCount: 0 });
    const one = masteryForLesson(progressWith([true], []));
    expect(one.evidenceCount).toBe(1);
    expect(one.mastered).toBe(false);
    expect(MASTERY_MIN_EVIDENCE).toBe(2);
  });

  it("awards mastery at 100% first-try", () => {
    const m = masteryForLesson(progressWith([true, true], [true]));
    expect(m.mastered).toBe(true);
    expect(m.accuracy).toBe(1);
    expect(m.evidenceCount).toBe(3);
  });

  it("awards mastery exactly at the 80% boundary", () => {
    expect(MASTERY_THRESHOLD).toBe(0.8);
    const m = masteryForLesson(progressWith([true, true, true, true], [false]));
    expect(m.accuracy).toBe(0.8);
    expect(m.mastered).toBe(true);
  });

  it("withholds mastery below 80%", () => {
    const m = masteryForLesson(progressWith([true, true], [false]));
    expect(m.accuracy).toBeCloseTo(2 / 3, 5);
    expect(m.mastered).toBe(false);
  });

  it("skips tasks never checked and counts assisted checks as misses", () => {
    const m = masteryForLesson(progressWith([true, false], [null, true]));
    // evidence: check T, check F, task T → 2/3
    expect(m.evidenceCount).toBe(3);
    expect(m.mastered).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* confusion pairs                                                     */
/* ------------------------------------------------------------------ */

describe("confusionKey", () => {
  it("builds a stable namespaced key", () => {
    expect(confusionKey("interval-id", "3rd", "5th")).toBe("interval-id|||3rd|||5th");
  });
});

describe("recordConfusionMiss", () => {
  it("starts a new pair due immediately", () => {
    const p = recordConfusionMiss(null, "interval-id", "3rd", "5th", 1000);
    expect(p.misses).toBe(1);
    expect(p.hits).toBe(0);
    expect(p.dueAt).toBe(1000);
    expect(p.intervalDays).toBe(1);
  });
  it("increments misses and keeps hits", () => {
    const prev = recordConfusionMiss(null, "interval-id", "3rd", "5th", 1000);
    const again = { ...prev, hits: 1 };
    const p = recordConfusionMiss(again, "interval-id", "3rd", "5th", 2000);
    expect(p.misses).toBe(2);
    expect(p.hits).toBe(1);
    expect(p.dueAt).toBe(2000);
  });
});

describe("recordConfusionHit", () => {
  const pair = (correct: string, chosen: string, misses = 2): ConfusionPair => ({
    domain: "interval-id",
    correct,
    chosen,
    misses,
    hits: 0,
    lastAt: 1000,
    dueAt: 1000,
    intervalDays: 1,
  });

  it("lengthens the interval for every pair sharing domain+correct", () => {
    const pairs = {
      [confusionKey("interval-id", "3rd", "5th")]: pair("3rd", "5th"),
      [confusionKey("interval-id", "3rd", "Octave")]: pair("3rd", "Octave"),
      [confusionKey("interval-id", "5th", "3rd")]: pair("5th", "3rd"),
    };
    const next = recordConfusionHit(pairs, "interval-id", "3rd", 2000);
    const a = next[confusionKey("interval-id", "3rd", "5th")]!;
    const b = next[confusionKey("interval-id", "3rd", "Octave")]!;
    const untouched = next[confusionKey("interval-id", "5th", "3rd")]!;
    expect(a.hits).toBe(1);
    expect(a.intervalDays).toBe(3); // 1 → 3 on the SR ladder
    expect(a.dueAt).toBe(2000 + 3 * 24 * 60 * 60 * 1000);
    expect(b.hits).toBe(1);
    expect(untouched.hits).toBe(0);
    expect(untouched.intervalDays).toBe(1);
  });

  it("leaves the map untouched when nothing matches", () => {
    const pairs = { [confusionKey("interval-id", "3rd", "5th")]: pair("3rd", "5th") };
    const next = recordConfusionHit(pairs, "note-id", "E4", 2000);
    expect(next).toEqual(pairs);
  });
});

describe("confusionDue", () => {
  const now = 10_000;
  const mk = (misses: number, hits: number, dueAt: number): ConfusionPair => ({
    domain: "interval-id",
    correct: "3rd",
    chosen: "5th",
    misses,
    hits,
    lastAt: 1000,
    dueAt,
    intervalDays: 1,
  });

  it("returns active, due pairs sorted most-overdue first", () => {
    const pairs = {
      a: mk(2, 0, 9000),
      b: mk(3, 1, 5000),
      settled: mk(1, 1, 1000), // misses !> hits
      future: mk(2, 0, 50_000), // not due yet
    };
    const due = confusionDue(pairs, now);
    expect(due.map((p) => p.dueAt)).toEqual([5000, 9000]);
  });

  it("is empty with no pairs", () => {
    expect(confusionDue({}, now)).toEqual([]);
  });
});

describe("CONFUSION_DOMAINS", () => {
  it("covers only musically-named choice families", () => {
    expect(CONFUSION_DOMAINS.has("note-id")).toBe(true);
    expect(CONFUSION_DOMAINS.has("interval-id")).toBe(true);
    expect(CONFUSION_DOMAINS.has("rhythm-echo")).toBe(false);
    expect(CONFUSION_DOMAINS.has("compare-pitch")).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* buildTargetedTask                                                   */
/* ------------------------------------------------------------------ */

describe("buildTargetedTask", () => {
  it("builds a note-id task whose answer matches, deterministically", () => {
    const a = buildTargetedTask("note-id", "E4", 7)!;
    const b = buildTargetedTask("note-id", "E4", 7)!;
    expect(a).not.toBeNull();
    expect(a.answer).toBe("E4");
    expect(a.judge("E4")).toBe(true);
    expect(a.audio!.notes).toEqual(b.audio!.notes);
    expect(a.taskId).toBe(b.taskId);
  });

  it("targets every interval-id answer including the spicy ones", () => {
    for (const name of ["Minor 3rd", "3rd", "4th", "5th", "Octave"]) {
      const t = buildTargetedTask("interval-id", name, 3)!;
      expect(t.answer).toBe(name);
      expect(t.judge(name)).toBe(true);
    }
  });

  it("picks the right variant for scale-id and chord-id", () => {
    const dorian = buildTargetedTask("scale-id", "Dorian", 1)!;
    expect(dorian.answer).toBe("Dorian");
    expect(dorian.prompt).toContain("Dorian");

    const inv = buildTargetedTask("chord-id", "First inversion", 1)!;
    expect(inv.answer).toBe("First inversion");

    const major = buildTargetedTask("chord-id", "Major", 1)!;
    expect(major.answer).toBe("Major");
  });

  it("returns null for unsupported domains", () => {
    expect(buildTargetedTask("rhythm-echo", "1", 0)).toBeNull();
    expect(buildTargetedTask("species-id", "x", 0)).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* difficulty-threaded task generation                                 */
/* ------------------------------------------------------------------ */

describe("difficulty-threaded generation", () => {
  it("keeps default generation identical to the pre-adaptive builders", () => {
    for (const seed of [1, 21, 99, 12345]) {
      const def = buildNoteIdTask(seed);
      const viaTask = buildTask("l", { kind: "note-id", seed });
      expect(viaTask.audio!.notes).toEqual(def.audio!.notes);
      expect(viaTask.choices).toEqual(def.choices);
      expect(viaTask.difficulty).toBe(1);
    }
  });

  it("is deterministic per (seed, level)", () => {
    const spec = { kind: "note-id", seed: 42 } as const;
    for (const level of [0, 1, 2] as const) {
      const a = buildTask("l", spec, level);
      const b = buildTask("l", spec, level);
      expect(a.audio!.notes).toEqual(b.audio!.notes);
      expect(a.choices).toEqual(b.choices);
      expect(a.difficulty).toBe(level);
    }
  });

  it("note-id: gentle narrows the range and choices, spicy widens them", () => {
    const gentle = buildTask("l", { kind: "note-id", seed: 5 }, 0);
    expect(gentle.choices).toHaveLength(2);
    expect(gentle.audio!.notes[0]).toBeGreaterThanOrEqual(60);
    expect(gentle.audio!.notes[0]).toBeLessThanOrEqual(64);

    const spicy = buildTask("l", { kind: "note-id", seed: 5 }, 2);
    expect(spicy.choices).toHaveLength(4);
    // The spicy pool reaches C6; across seeds some note must exceed C5.
    const highs = new Set<number>();
    for (let s = 0; s < 40; s++) highs.add(buildTask("l", { kind: "note-id", seed: s }, 2).audio!.notes[0]!);
    expect(Math.max(...highs)).toBeGreaterThan(72);
  });

  it("note-id builder honors explicit pool/choiceCount opts", () => {
    const t = buildNoteIdTask(21, { pool: [60, 62, 64], choiceCount: 2 });
    expect(t.choices).toHaveLength(2);
    expect(t.judge(t.answer)).toBe(true);
    expect(t.answer).toBe(midiToName(t.audio!.notes[0]!));
  });

  it("rhythm-echo: gentle slows the beat and shrinks the vocabulary", () => {
    const gentle = buildRhythmEchoTask(31, { beat: 0.55, patterns: [[1, 1], [0.5, 0.5, 1]] });
    const total = gentle.audio!.durations!.reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1.1, 5); // 2 beats × 0.55
    const def = buildRhythmEchoTask(31);
    expect(def.audio!.durations!.reduce((a, b) => a + b, 0)).toBeCloseTo(0.9, 5);

    const viaTask = buildTask("l", { kind: "rhythm-echo", seed: 31 }, 0);
    expect(viaTask.difficulty).toBe(0);
    expect(viaTask.answer).toMatch(/^[12]$/);
  });

  it("interval-id: gentle contrasts 3rd vs octave, spicy adds minor 3rd + 4th", () => {
    const gentle = buildTask("l", { kind: "interval-id", seed: 9 }, 0);
    expect(gentle.choices).toHaveLength(2);
    expect(new Set(gentle.choices)).toEqual(new Set(["3rd", "Octave"]));

    const spicy = buildIntervalIdTask(9, { intervals: INTERVAL_ID_FULL });
    expect(spicy.choices).toHaveLength(5);
    expect(spicy.judge(spicy.answer)).toBe(true);

    const viaTask = buildTask("l", { kind: "interval-id", seed: 9 }, 2);
    expect(viaTask.choices).toHaveLength(5);
    expect(viaTask.difficulty).toBe(2);
  });

  it("exposes the canonical answer on choice tasks", () => {
    const note = buildNoteIdTask(21);
    expect(note.answer).toBe(midiToName(note.audio!.notes[0]!));
    const rhythm = buildRhythmEchoTask(31);
    expect(rhythm.choices).toContain(rhythm.answer);
  });
});

/* ------------------------------------------------------------------ */
/* store integration                                                   */
/* ------------------------------------------------------------------ */

function act() {
  return useStore.getState();
}

beforeEach(() => {
  localStorage.clear();
  act().resetSave();
});

describe("adaptive store wiring", () => {
  it("logs attempts per domain, capped at 10", () => {
    for (let i = 0; i < 13; i++) {
      act().recordTaskAttempt("lesson-1", `note-id:${i}`, {
        draft: "C4",
        feedback: null,
        correct: i % 2 === 0,
        assisted: false,
        taskKind: "note-id",
        answer: "D4",
      });
    }
    const log = act().save.adaptiveAttempts["note-id"]!;
    expect(log).toHaveLength(10);
    // Oldest kept is attempt index 3.
    expect(log[0]!.correct).toBe(false); // i=3 odd → wrong
    expect(log[9]!.correct).toBe(true); // i=12 even → right
  });

  it("does not touch adaptive evidence without a taskKind", () => {
    act().recordTaskAttempt("lesson-1", "x:1", {
      draft: "done",
      feedback: null,
      correct: true,
      assisted: false,
    });
    expect(act().save.adaptiveAttempts).toEqual({});
    expect(act().save.confusion).toEqual({});
  });

  it("records a confusion pair on an unassisted miss with a known distractor", () => {
    act().recordTaskAttempt("lesson-1", "interval-id:1", {
      draft: "5th",
      feedback: null,
      correct: false,
      assisted: false,
      taskKind: "interval-id",
      answer: "3rd",
    });
    const key = confusionKey("interval-id", "3rd", "5th");
    const pair = act().save.confusion[key]!;
    expect(pair.misses).toBe(1);
    expect(pair.chosen).toBe("5th");
  });

  it("ignores assisted misses and non-string answers for confusion", () => {
    act().recordTaskAttempt("lesson-1", "interval-id:1", {
      draft: "5th",
      feedback: null,
      correct: false,
      assisted: true, // hinted → weaker evidence, not tracked
      taskKind: "interval-id",
      answer: "3rd",
    });
    act().recordTaskAttempt("lesson-1", "compare-pitch:1", {
      draft: 1,
      feedback: null,
      correct: false,
      assisted: false,
      taskKind: "compare-pitch",
      answer: 2,
    });
    expect(act().save.confusion).toEqual({});
  });

  it("an unassisted correct advances the pair's schedule", () => {
    const miss = {
      draft: "5th", feedback: null, correct: false, assisted: false,
      taskKind: "interval-id" as const, answer: "3rd" as unknown,
    };
    act().recordTaskAttempt("lesson-1", "interval-id:1", miss);
    const key = confusionKey("interval-id", "3rd", "5th");
    expect(act().save.confusion[key]!.intervalDays).toBe(1);
    act().recordTaskAttempt("lesson-1", "interval-id:2", {
      draft: "3rd", feedback: null, correct: true, assisted: false,
      taskKind: "interval-id", answer: "3rd",
    });
    const pair = act().save.confusion[key]!;
    expect(pair.hits).toBe(1);
    expect(pair.intervalDays).toBe(3);
    expect(pair.dueAt).toBeGreaterThan(Date.now());
  });

  it("recordConfusionRecall credits hits and re-arms on misses", () => {
    act().recordTaskAttempt("lesson-1", "note-id:1", {
      draft: "D4", feedback: null, correct: false, assisted: false,
      taskKind: "note-id", answer: "E4",
    });
    const key = confusionKey("note-id", "E4", "D4");
    act().recordConfusionRecall("note-id", "E4", true);
    expect(act().save.confusion[key]!.hits).toBe(1);
    act().recordConfusionRecall("note-id", "E4", false);
    const pair = act().save.confusion[key]!;
    expect(pair.misses).toBe(2);
    expect(pair.hits).toBe(1);
  });
});

/* ------------------------------------------------------------------ */
/* schema migration                                                    */
/* ------------------------------------------------------------------ */

describe("adaptive schema migration", () => {
  it("migrates a v3 save through the chain with empty adaptive evidence", () => {
    const v3 = {
      version: 3,
      createdAt: 1,
      updatedAt: 1,
      onboarded: true,
      settings: {
        volume: 0.8, muted: false, highContrast: false, reducedMotion: false,
        focusMode: true, sessionMinutes: 3, playbackSpeed: 1, grownUpsPin: null,
      },
      lessons: {},
      concepts: {},
      noteEvidence: {},
      harmonyPoints: 0,
      grade: 0,
      gradeWindows: {},
      learningDays: [],
      creations: [],
      gameStats: { strikePlays: 0, strikeBest: 0, duelWins: 0, duelLosses: 0, duelDraws: 0 },
      questLog: {},
    };
    const migrated = migrateSave(v3);
    expect(migrated).not.toBeNull();
    expect(migrated!.version).toBe(SAVE_VERSION);
    expect(migrated!.adaptiveAttempts).toEqual({});
    expect(migrated!.confusion).toEqual({});
    // Nothing else lost.
    expect(migrated!.onboarded).toBe(true);
    expect(migrated!.grade).toBe(0);
  });

  it("rejects malformed adaptive evidence on import", () => {
    const bad = {
      version: 4,
      createdAt: 1,
      updatedAt: 1,
      onboarded: false,
      settings: {
        volume: 0.8, muted: false, highContrast: false, reducedMotion: false,
        focusMode: true, sessionMinutes: 3, playbackSpeed: 1, grownUpsPin: null,
      },
      lessons: {},
      concepts: {},
      noteEvidence: {},
      harmonyPoints: 0,
      grade: 0,
      gradeWindows: {},
      learningDays: [],
      creations: [],
      gameStats: { strikePlays: 0, strikeBest: 0, duelWins: 0, duelLosses: 0, duelDraws: 0 },
      questLog: {},
      adaptiveAttempts: { "note-id": "not-an-array" },
      confusion: {},
    };
    expect(migrateSave(bad)).toBeNull();
  });
});
