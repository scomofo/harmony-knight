/**
 * First-session placement diagnostic: a short 6–8 question check across
 * pitch, rhythm, notation, and chords, ending in a recommended starting
 * chapter. The recommendation is advisory only — the player can always
 * override it.
 *
 * Pure logic: questions, scoring, and the chapter recommendation rule live
 * here so they are unit-testable without the UI. The UI keeps the player's
 * raw answers; this module derives everything else.
 */

import type { ExperienceLevel, PlacementAnswer, PlacementResult } from "./schema.ts";

export type DiagnosticDomain = "pitch" | "rhythm" | "notation" | "chords";

export type DiagnosticQuestion = {
  id: string;
  domain: DiagnosticDomain;
  question: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
  /** Optional audio to play while answering (sequential note midis). */
  audio?: { midis: number[]; caption: string; durations?: number[] };
};

/**
 * Eight questions, two per domain. Audio-backed where the ear matters
 * (pitch, rhythm); text where the idea matters (notation, chords).
 */
export const DIAGNOSTIC_QUESTIONS: DiagnosticQuestion[] = [
  {
    id: "pitch-1",
    domain: "pitch",
    question: "Listen — which sound is HIGHER?",
    choices: ["The second sound", "The first sound", "They are the same"],
    answerIndex: 0,
    explanation: "The second sound climbs higher than the first.",
    audio: { midis: [60, 67], caption: "Two sounds: low, then high." },
  },
  {
    id: "pitch-2",
    domain: "pitch",
    question: "Listen — which sound is LOWER?",
    choices: ["The first sound", "The second sound", "They are the same"],
    answerIndex: 1,
    explanation: "The second sound drops lower than the first.",
    audio: { midis: [67, 60], caption: "Two sounds: high, then low." },
  },
  {
    id: "rhythm-1",
    domain: "rhythm",
    question: "Listen — how many sounds do you hear?",
    choices: ["3", "4", "2"],
    answerIndex: 0,
    explanation: "Three even beats: 1, 2, 3.",
    audio: { midis: [60, 60, 60], caption: "Count the sounds.", durations: [0.35, 0.35, 0.35] },
  },
  {
    id: "rhythm-2",
    domain: "rhythm",
    question: "Listen — which sound lasts the LONGEST?",
    choices: ["The first sound", "The last sound", "They are all the same"],
    answerIndex: 1,
    explanation: "The last sound stretches out — it lasts twice as long.",
    audio: { midis: [60, 60, 60], caption: "Three sounds: short, short, long.", durations: [0.25, 0.25, 0.6] },
  },
  {
    id: "notation-1",
    domain: "notation",
    question: "The musical alphabet goes A B C D E F G, then starts over. What comes right after G?",
    choices: ["A", "H", "G again"],
    answerIndex: 0,
    explanation: "After G the alphabet wraps back to A.",
  },
  {
    id: "notation-2",
    domain: "notation",
    question: "A sharp sign (♯) tells the player to…",
    choices: ["Play one step higher", "Play one step lower", "Play twice as loud"],
    answerIndex: 0,
    explanation: "Sharp = up a tiny step (one semitone). Flat = down.",
  },
  {
    id: "chords-1",
    domain: "chords",
    question: "When several different notes sound AT THE SAME TIME, that is called a…",
    choices: ["Chord", "Scale", "Rest"],
    answerIndex: 0,
    explanation: "A chord stacks notes together; a scale lines them up one by one.",
  },
  {
    id: "chords-2",
    domain: "chords",
    question: "A triad is a chord built from how many notes?",
    choices: ["3", "2", "4"],
    answerIndex: 0,
    explanation: "Tri- means three: root, third, fifth.",
  },
];

/** Which chapter each diagnostic domain maps to when it is the weak spot. */
export const DOMAIN_CHAPTERS: Record<DiagnosticDomain, number> = {
  pitch: 1, // Sound
  notation: 2, // Notation
  rhythm: 3, // Rhythm
  chords: 5, // Building Chords
};

/** The "skip ahead" chapter for players who ace the diagnostic. */
export const ADVANCED_START_CHAPTER = 4; // Tonality

export type DomainScores = Record<DiagnosticDomain, { correct: number; total: number }>;

const DOMAINS: DiagnosticDomain[] = ["pitch", "rhythm", "notation", "chords"];

/** Tally correct answers per domain. Unknown question ids are ignored. */
export function scoreDiagnostic(answers: PlacementAnswer[]): DomainScores {
  const byId = new Map(DIAGNOSTIC_QUESTIONS.map((q) => [q.id, q]));
  const scores: DomainScores = {
    pitch: { correct: 0, total: 0 },
    rhythm: { correct: 0, total: 0 },
    notation: { correct: 0, total: 0 },
    chords: { correct: 0, total: 0 },
  };
  for (const a of answers) {
    const q = byId.get(a.questionId);
    if (!q) continue;
    const s = scores[q.domain];
    s.total += 1;
    if (a.correct) s.correct += 1;
  }
  return scores;
}

export type Recommendation = {
  /** Chapter number 1..11. */
  chapter: number;
  reason:
    | "brand-new"
    | "weak-domain"
    | "strong-all";
  /** The weakest domain, when reason is "weak-domain". */
  weakDomain: DiagnosticDomain | null;
  scores: DomainScores;
  totalCorrect: number;
  totalQuestions: number;
};

/**
 * Recommend a starting chapter.
 * - "brand-new" players always start at Chapter 1: they told us to.
 * - Otherwise the weakest domain (ties break toward the earlier chapter)
 *   decides the chapter; a player strong everywhere starts at Chapter 4.
 */
export function recommendStartChapter(
  experience: ExperienceLevel,
  answers: PlacementAnswer[],
): Recommendation {
  const scores = scoreDiagnostic(answers);
  const totalCorrect = DOMAINS.reduce((n, d) => n + scores[d].correct, 0);
  const totalQuestions = DOMAINS.reduce((n, d) => n + scores[d].total, 0);

  if (experience === "brand-new") {
    return {
      chapter: 1,
      reason: "brand-new",
      weakDomain: null,
      scores,
      totalCorrect,
      totalQuestions,
    };
  }

  let weakDomain: DiagnosticDomain = DOMAINS[0]!;
  for (const d of DOMAINS) {
    const w = scores[weakDomain];
    const s = scores[d];
    // Strictly fewer correct, or same correct with more attempts, wins.
    if (s.correct < w.correct || (s.correct === w.correct && s.total > w.total)) {
      weakDomain = d;
    }
  }

  const weakScore = scores[weakDomain];
  const strongEverywhere = DOMAINS.every((d) => scores[d].correct >= 2);
  if (strongEverywhere && weakScore.correct === 2) {
    return {
      chapter: ADVANCED_START_CHAPTER,
      reason: "strong-all",
      weakDomain: null,
      scores,
      totalCorrect,
      totalQuestions,
    };
  }
  return {
    chapter: DOMAIN_CHAPTERS[weakDomain],
    reason: "weak-domain",
    weakDomain,
    scores,
    totalCorrect,
    totalQuestions,
  };
}

/** Build the stored placement result from raw answers. */
export function buildPlacement(
  experience: ExperienceLevel,
  answers: PlacementAnswer[],
  now = Date.now(),
): PlacementResult {
  const rec = recommendStartChapter(experience, answers);
  return {
    completedAt: now,
    answers,
    recommendedStartChapter: rec.chapter,
  };
}

/** Human-readable reason for a recommendation, shown on the result screen. */
export function recommendationBlurb(rec: Recommendation): string {
  switch (rec.reason) {
    case "brand-new":
      return "You told us you're brand new to music — we'll start at the very first sound and build up from there.";
    case "strong-all":
      return `You nailed ${rec.totalCorrect} of ${rec.totalQuestions} — the basics are already yours, so we'll start a little further in where the new ideas begin.`;
    case "weak-domain": {
      const label: Record<DiagnosticDomain, string> = {
        pitch: "hearing high and low",
        rhythm: "feeling the beat",
        notation: "reading notes",
        chords: "chords",
      };
      return `We'll shore up ${label[rec.weakDomain!]} first — everything later builds on it.`;
    }
  }
}
