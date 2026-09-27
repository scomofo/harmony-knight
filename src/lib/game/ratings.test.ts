/**
 * Skill ratings: letter mapping, evidence aggregation across stores,
 * mastered/struggling classification, and the weekly grown-up suggestion.
 */
import { describe, expect, it } from "vitest";
import {
  computeRatings,
  letterGrade,
  masteredDomains,
  strugglingDomains,
  weeklyAction,
  type DomainRating,
} from "./ratings.ts";
import type {
  ConceptReview,
  LessonProgress,
  NoteEvidence,
} from "./schema.ts";

const EMPTY = {
  lessons: {},
  concepts: {},
  noteEvidence: {},
  gradeWindows: {},
  practiceEvidence: {},
};

function lessonWith(
  checks: LessonProgress["checks"],
  tasks: LessonProgress["tasks"],
): LessonProgress {
  return {
    lessonId: "ch1-l1-pitch",
    step: "done",
    answers: {},
    checks,
    tasks,
    completedAt: 1,
    completionPointsAwarded: true,
  };
}

describe("letterGrade", () => {
  it("maps accuracy bands to letters", () => {
    expect(letterGrade(1)).toBe("A+");
    expect(letterGrade(0.97)).toBe("A+");
    expect(letterGrade(0.95)).toBe("A");
    expect(letterGrade(0.91)).toBe("A−");
    expect(letterGrade(0.88)).toBe("B+");
    expect(letterGrade(0.84)).toBe("B");
    expect(letterGrade(0.81)).toBe("B−");
    expect(letterGrade(0.78)).toBe("C+");
    expect(letterGrade(0.74)).toBe("C");
    expect(letterGrade(0.71)).toBe("C−");
    expect(letterGrade(0.65)).toBe("D");
    expect(letterGrade(0.2)).toBe("F");
    expect(letterGrade(0)).toBe("F");
  });

  it("clamps out-of-range input", () => {
    expect(letterGrade(2)).toBe("A+");
    expect(letterGrade(-1)).toBe("F");
  });
});

describe("computeRatings", () => {
  it("returns all six domains even with no evidence", () => {
    const ratings = computeRatings(EMPTY);
    expect(ratings).toHaveLength(6);
    for (const r of ratings) {
      expect(r.grade).toBeNull();
      expect(r.confidence).toBe("none");
      expect(r.attempts).toBe(0);
    }
  });

  it("aggregates lesson checks by concept topic", () => {
    // "pitch-direction" is a sensory concept -> listening domain.
    const lesson = lessonWith(
      [
        { checkId: "ch1-l1-c1", correctFirstTry: true, assisted: false, answeredAt: 1 },
        { checkId: "ch1-l1-c1", correctFirstTry: false, assisted: false, answeredAt: 2 },
        { checkId: "ch1-l1-c2", correctFirstTry: true, assisted: false, answeredAt: 3 },
        { checkId: "ch1-l1-c2", correctFirstTry: true, assisted: false, answeredAt: 4 },
      ],
      [],
    );
    const ratings = computeRatings({ ...EMPTY, lessons: { "ch1-l1-pitch": lesson } });
    const listening = ratings.find((r) => r.domain === "listening")!;
    expect(listening.attempts).toBe(4);
    expect(listening.correct).toBe(3);
    expect(listening.accuracy).toBe(0.75);
    expect(listening.grade).toBe("C");
    expect(listening.confidence).toBe("building");
  });

  it("aggregates practical tasks by task kind", () => {
    const lesson = lessonWith(
      [],
      [
        { taskId: "rhythm-echo:42", draft: null, feedback: null, firstCheckCorrect: true, assisted: false, updatedAt: 1 },
        { taskId: "rhythm-echo:43", draft: null, feedback: null, firstCheckCorrect: false, assisted: false, updatedAt: 2 },
        { taskId: "self-attempt:ch1", draft: null, feedback: null, firstCheckCorrect: true, assisted: false, updatedAt: 3 },
      ],
    );
    const ratings = computeRatings({ ...EMPTY, lessons: { x: lesson } });
    const rhythm = ratings.find((r) => r.domain === "rhythm")!;
    // self-attempt never counts as evidence.
    expect(rhythm.attempts).toBe(2);
    expect(rhythm.correct).toBe(1);
  });

  it("counts spaced concept reviews and note evidence", () => {
    const concepts: Record<string, ConceptReview> = {
      pulse: { conceptId: "pulse", intervalDays: 3, dueAt: 1, lastResult: "correct" },
      meter: { conceptId: "meter", intervalDays: 1, dueAt: 1, lastResult: "wrong" },
    };
    const noteEvidence: Record<string, NoteEvidence> = {
      E4: { note: "E4", attempts: 10, firstTryCorrect: 9, lastCorrect: true, dueAt: 1 },
    };
    const ratings = computeRatings({ ...EMPTY, concepts, noteEvidence });
    const rhythm = ratings.find((r) => r.domain === "rhythm")!;
    expect(rhythm.attempts).toBe(2);
    expect(rhythm.correct).toBe(1);
    const notes = ratings.find((r) => r.domain === "notes")!;
    expect(notes.attempts).toBe(10);
    expect(notes.correct).toBe(9);
    expect(notes.grade).toBe("A−");
    expect(notes.confidence).toBe("building");
  });

  it("marks solid confidence at 12+ attempts", () => {
    const noteEvidence: Record<string, NoteEvidence> = {
      E4: { note: "E4", attempts: 12, firstTryCorrect: 12, lastCorrect: true, dueAt: 1 },
    };
    const ratings = computeRatings({ ...EMPTY, noteEvidence });
    const notes = ratings.find((r) => r.domain === "notes")!;
    expect(notes.confidence).toBe("solid");
    expect(notes.grade).toBe("A+");
  });

  it("folds endless-practice evidence into its task-kind domain", () => {
    const ratings = computeRatings({
      ...EMPTY,
      practiceEvidence: { "chord-id": { attempts: 6, correct: 6 } },
    });
    const chords = ratings.find((r) => r.domain === "chords")!;
    expect(chords.attempts).toBe(6);
    expect(chords.accuracy).toBe(1);
  });

  it("distributes grade-trial windows across the grade's topics", () => {
    const ratings = computeRatings({
      ...EMPTY,
      gradeWindows: { "0": { attempts: 10, correct: 8 } },
    });
    const total = ratings.reduce((n, r) => n + r.attempts, 0);
    // Grade 0's topics share the 10 attempts; duel/strike topics are excluded.
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThanOrEqual(10);
  });

  it("ignores concepts with unknown ids instead of throwing", () => {
    const concepts: Record<string, ConceptReview> = {
      "not-a-concept": { conceptId: "not-a-concept", intervalDays: 1, dueAt: 1, lastResult: "wrong" },
    };
    expect(() => computeRatings({ ...EMPTY, concepts })).not.toThrow();
  });
});

describe("mastered / struggling", () => {
  const rated = (domain: DomainRating["domain"], accuracy: number, confidence: DomainRating["confidence"]): DomainRating => ({
    domain,
    label: domain,
    attempts: 20,
    correct: Math.round(20 * accuracy),
    accuracy,
    grade: letterGrade(accuracy),
    confidence,
  });

  it("mastered needs solid evidence at 90%+", () => {
    const ratings = [
      rated("rhythm", 0.95, "solid"),
      rated("notes", 0.95, "building"), // not solid -> not mastered
      rated("chords", 0.85, "solid"), // below 90 -> not mastered
    ];
    expect(masteredDomains(ratings).map((r) => r.domain)).toEqual(["rhythm"]);
  });

  it("struggling needs rated evidence below 70%", () => {
    const ratings = [
      rated("theory", 0.5, "solid"),
      rated("scales", 0.69, "building"),
      { ...rated("notes", 0.9, "solid"), grade: null, confidence: "none" as const, attempts: 1, accuracy: 0 },
    ];
    expect(strugglingDomains(ratings).map((r) => r.domain)).toEqual(["theory", "scales"]);
  });
});

describe("weeklyAction", () => {
  const rated = (domain: DomainRating["domain"], accuracy: number): DomainRating => ({
    domain,
    label: domain,
    attempts: 10,
    correct: Math.round(10 * accuracy),
    accuracy,
    grade: letterGrade(accuracy),
    confidence: "building",
  });

  it("picks the weakest rated domain with a concrete activity", () => {
    const ratings = [rated("rhythm", 0.6), rated("notes", 0.9), rated("chords", 0.8)];
    const action = weeklyAction(ratings, {}, {});
    expect(action.domain).toBe("rhythm");
    expect(action.headline).toBe("This week: 5 minutes of rhythm tapping");
    expect(action.detail.length).toBeGreaterThan(0);
  });

  it("names a slipped concept as the sticking point", () => {
    const ratings = [rated("rhythm", 0.6)];
    const concepts: Record<string, ConceptReview> = {
      "dotted-rhythm": { conceptId: "dotted-rhythm", intervalDays: 1, dueAt: 1, lastResult: "wrong" },
    };
    const action = weeklyAction(ratings, concepts, {});
    expect(action.detail).toContain("Dotted rhythm");
  });

  it("names a shaky note for the note-reading domain", () => {
    const ratings = [rated("notes", 0.6)];
    const noteEvidence: Record<string, NoteEvidence> = {
      E4: { note: "E4", attempts: 5, firstTryCorrect: 1, lastCorrect: false, dueAt: 1 },
    };
    const action = weeklyAction(ratings, {}, noteEvidence);
    expect(action.detail).toContain("E4");
  });

  it("still returns one suggestion with no evidence at all", () => {
    const ratings = computeRatings(EMPTY);
    const action = weeklyAction(ratings, {}, {});
    expect(action.headline).toMatch(/^This week: /);
    expect(action.detail.length).toBeGreaterThan(0);
  });
});
