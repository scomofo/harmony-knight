import { describe, expect, it } from "vitest";
import {
  ADVANCED_START_CHAPTER,
  DIAGNOSTIC_QUESTIONS,
  DOMAIN_CHAPTERS,
  buildPlacement,
  recommendationBlurb,
  recommendStartChapter,
  scoreDiagnostic,
} from "./placement.ts";

describe("DIAGNOSTIC_QUESTIONS", () => {
  it("covers 4 domains with 2 questions each", () => {
    expect(DIAGNOSTIC_QUESTIONS).toHaveLength(8);
    for (const domain of ["pitch", "rhythm", "notation", "chords"]) {
      expect(DIAGNOSTIC_QUESTIONS.filter((q) => q.domain === domain)).toHaveLength(2);
    }
  });

  it("has valid answer indexes and unique ids", () => {
    const ids = new Set<string>();
    for (const q of DIAGNOSTIC_QUESTIONS) {
      expect(ids.has(q.id)).toBe(false);
      ids.add(q.id);
      expect(q.answerIndex).toBeGreaterThanOrEqual(0);
      expect(q.answerIndex).toBeLessThan(q.choices.length);
      expect(q.choices.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("audio questions carry midis", () => {
    for (const q of DIAGNOSTIC_QUESTIONS) {
      if (q.audio) {
        expect(q.audio.midis.length).toBeGreaterThan(0);
        expect(q.audio.caption.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("scoreDiagnostic", () => {
  it("tallies per-domain scores and ignores unknown ids", () => {
    const answers = DIAGNOSTIC_QUESTIONS.map((q) => ({ questionId: q.id, correct: true }));
    answers.push({ questionId: "bogus", correct: true });
    const s = scoreDiagnostic(answers);
    expect(s.pitch).toEqual({ correct: 2, total: 2 });
    expect(s.chords).toEqual({ correct: 2, total: 2 });
  });

  it("handles empty answers", () => {
    const s = scoreDiagnostic([]);
    expect(s.notation).toEqual({ correct: 0, total: 0 });
  });
});

describe("recommendStartChapter", () => {
  const allCorrect = () =>
    DIAGNOSTIC_QUESTIONS.map((q) => ({ questionId: q.id, correct: true }));

  it("brand-new players always start at chapter 1", () => {
    const rec = recommendStartChapter("brand-new", allCorrect());
    expect(rec.chapter).toBe(1);
    expect(rec.reason).toBe("brand-new");
  });

  it("strong players start at the advanced chapter", () => {
    const rec = recommendStartChapter("played-before", allCorrect());
    expect(rec.chapter).toBe(ADVANCED_START_CHAPTER);
    expect(rec.reason).toBe("strong-all");
  });

  it("routes a weak domain to its chapter", () => {
    const answers = allCorrect().map((a) => ({ ...a, correct: true }));
    // Miss both notation questions.
    const bad = answers.map((a) =>
      a.questionId.startsWith("notation") ? { ...a, correct: false } : a,
    );
    const rec = recommendStartChapter("a-little", bad);
    expect(rec.chapter).toBe(DOMAIN_CHAPTERS.notation);
    expect(rec.reason).toBe("weak-domain");
    expect(rec.weakDomain).toBe("notation");
  });

  it("routes weak chords to the chords chapter", () => {
    const answers = allCorrect().map((a) =>
      a.questionId.startsWith("chords") ? { ...a, correct: false } : { ...a },
    );
    const rec = recommendStartChapter("played-before", answers);
    expect(rec.chapter).toBe(DOMAIN_CHAPTERS.chords);
    expect(rec.weakDomain).toBe("chords");
  });

  it("ties break toward the earlier chapter", () => {
    // Miss everything: all domains 0/2, earliest (pitch -> chapter 1) wins.
    const answers = DIAGNOSTIC_QUESTIONS.map((q) => ({ questionId: q.id, correct: false }));
    const rec = recommendStartChapter("a-little", answers);
    expect(rec.chapter).toBe(DOMAIN_CHAPTERS.pitch);
    expect(rec.weakDomain).toBe("pitch");
  });
});

describe("buildPlacement", () => {
  it("stores answers and the recommended chapter", () => {
    const answers = DIAGNOSTIC_QUESTIONS.map((q) => ({ questionId: q.id, correct: true }));
    const p = buildPlacement("played-before", answers, 1234);
    expect(p.completedAt).toBe(1234);
    expect(p.answers).toEqual(answers);
    expect(p.recommendedStartChapter).toBe(ADVANCED_START_CHAPTER);
  });
});

describe("recommendationBlurb", () => {
  it("returns non-empty copy for every reason", () => {
    const mk = (reason: "brand-new" | "weak-domain" | "strong-all") =>
      recommendationBlurb({
        chapter: 2,
        reason,
        weakDomain: reason === "weak-domain" ? "notation" : null,
        scores: scoreDiagnostic([]),
        totalCorrect: 0,
        totalQuestions: 0,
      });
    expect(mk("brand-new").length).toBeGreaterThan(0);
    expect(mk("weak-domain").length).toBeGreaterThan(0);
    expect(mk("strong-all").length).toBeGreaterThan(0);
  });
});
