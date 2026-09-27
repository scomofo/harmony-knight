/**
 * Per-domain skill ratings. Aggregates first-try evidence from every
 * existing evidence store — lesson checks, practical tasks, spaced concept
 * reviews, note evidence, endless-practice evidence, and grade-trial
 * windows — into per-domain ratings like "Listening: B+, Rhythm: A".
 *
 * Pure functions only; the UI renders what these return. Ratings describe
 * demonstrated skill, never streaks or grind.
 */

import { authoredLessons } from "./course.ts";
import { CONCEPT_TOPICS } from "./grades.ts";
import { levelFor, type TopicId } from "./curriculum.ts";
import type {
  CheckResult,
  ConceptReview,
  LessonProgress,
  NoteEvidence,
  TaskDraft,
} from "./schema.ts";
import type { TaskKind } from "./tasks.ts";

export type DomainId = "listening" | "notes" | "rhythm" | "scales" | "chords" | "theory";

export const DOMAINS: Array<{ id: DomainId; label: string }> = [
  { id: "listening", label: "Listening" },
  { id: "notes", label: "Note reading" },
  { id: "rhythm", label: "Rhythm" },
  { id: "scales", label: "Scales & keys" },
  { id: "chords", label: "Chords & harmony" },
  { id: "theory", label: "Theory" },
];

const TOPIC_DOMAINS: Record<TopicId, DomainId> = {
  sensory: "listening",
  "note-reading": "notes",
  rhythm: "rhythm",
  keys: "scales",
  scales: "scales",
  intervals: "theory",
  triads: "chords",
  harmony: "chords",
  modulation: "theory",
  duel: "theory",
  strike: "rhythm",
};

const TASK_DOMAINS: Partial<Record<TaskKind, DomainId>> = {
  "compare-pitch": "listening",
  "note-id": "notes",
  "rhythm-echo": "rhythm",
  "scale-id": "scales",
  "interval-id": "theory",
  "chord-id": "chords",
  "cadence-id": "chords",
  "motion-id": "theory",
  "modulation-id": "theory",
  "seventh-id": "chords",
  "meter-id": "rhythm",
  "species-id": "theory",
  "transform-id": "theory",
  // self-attempt judges everything correct by design — not evidence.
};

export type DomainRating = {
  domain: DomainId;
  label: string;
  attempts: number;
  correct: number;
  /** 0..1 first-try accuracy. */
  accuracy: number;
  /** Letter grade, or null when there is too little evidence to rate. */
  grade: string | null;
  /** none < 4 attempts, building < 12, solid at 12+. */
  confidence: "none" | "building" | "solid";
};

const MIN_EVIDENCE = 4;
const SOLID_EVIDENCE = 12;

/** Accuracy -> letter grade. */
export function letterGrade(accuracy: number): string {
  const a = Math.max(0, Math.min(1, accuracy));
  if (a >= 0.97) return "A+";
  if (a >= 0.93) return "A";
  if (a >= 0.9) return "A−";
  if (a >= 0.87) return "B+";
  if (a >= 0.83) return "B";
  if (a >= 0.8) return "B−";
  if (a >= 0.77) return "C+";
  if (a >= 0.73) return "C";
  if (a >= 0.7) return "C−";
  if (a >= 0.6) return "D";
  return "F";
}

type Evidence = {
  lessons: Record<string, LessonProgress>;
  concepts: Record<string, ConceptReview>;
  noteEvidence: Record<string, NoteEvidence>;
  gradeWindows: Record<string, { attempts: number; correct: number }>;
  practiceEvidence: Record<string, { attempts: number; correct: number }>;
};

function checkIdToConcept(): Map<string, string> {
  const map = new Map<string, string>();
  for (const lesson of authoredLessons()) {
    for (const check of lesson.checks) map.set(check.id, check.conceptId);
  }
  return map;
}

function topicDomain(topic: TopicId): DomainId {
  return TOPIC_DOMAINS[topic];
}

/**
 * Compute per-domain ratings from the evidence stores. Deterministic and
 * total: every domain appears, even with zero evidence.
 */
export function computeRatings(evidence: Evidence): DomainRating[] {
  const attempts: Record<DomainId, number> = {
    listening: 0, notes: 0, rhythm: 0, scales: 0, chords: 0, theory: 0,
  };
  const correct: Record<DomainId, number> = {
    listening: 0, notes: 0, rhythm: 0, scales: 0, chords: 0, theory: 0,
  };
  const add = (d: DomainId, n: number, c: number) => {
    attempts[d] += n;
    correct[d] += c;
  };

  // Lesson recall checks (first-try only).
  const checkConcepts = checkIdToConcept();
  const recordChecks = (checks: CheckResult[]) => {
    for (const c of checks) {
      const conceptId = checkConcepts.get(c.checkId);
      const topic = conceptId ? CONCEPT_TOPICS[conceptId] : undefined;
      if (!topic) continue;
      add(topicDomain(topic), 1, c.correctFirstTry ? 1 : 0);
    }
  };

  // Practical tasks (first-check correctness).
  const recordTasks = (tasks: TaskDraft[]) => {
    for (const t of tasks) {
      if (t.firstCheckCorrect === null) continue;
      const kind = t.taskId.split(":")[0] as TaskKind;
      const domain = TASK_DOMAINS[kind];
      if (!domain) continue;
      add(domain, 1, t.firstCheckCorrect ? 1 : 0);
    }
  };

  for (const lesson of Object.values(evidence.lessons)) {
    recordChecks(lesson.checks);
    recordTasks(lesson.tasks);
  }

  // Spaced concept reviews: latest result is one sample.
  for (const c of Object.values(evidence.concepts)) {
    if (c.lastResult === null) continue;
    const topic = CONCEPT_TOPICS[c.conceptId];
    if (!topic) continue;
    add(topicDomain(topic), 1, c.lastResult === "correct" ? 1 : 0);
  }

  // Note evidence -> note reading.
  for (const n of Object.values(evidence.noteEvidence)) {
    if (n.attempts > 0) add("notes", n.attempts, n.firstTryCorrect);
  }

  // Endless-practice evidence, keyed by task kind.
  for (const [kind, w] of Object.entries(evidence.practiceEvidence)) {
    const domain = TASK_DOMAINS[kind as TaskKind];
    if (!domain || w.attempts <= 0) continue;
    add(domain, w.attempts, Math.min(w.correct, w.attempts));
  }

  // Grade-trial windows: distribute across the grade's topics.
  for (const [gradeKey, w] of Object.entries(evidence.gradeWindows)) {
    const grade = Number(gradeKey);
    if (!Number.isInteger(grade) || w.attempts <= 0) continue;
    const topics = levelFor(grade).topics.filter((t) => t !== "duel" && t !== "strike");
    if (topics.length === 0) continue;
    const share = 1 / topics.length;
    for (const t of topics) add(topicDomain(t), w.attempts * share, w.correct * share);
  }

  return DOMAINS.map(({ id, label }) => {
    const n = attempts[id];
    const c = Math.min(correct[id], n);
    const accuracy = n > 0 ? c / n : 0;
    const confidence: DomainRating["confidence"] =
      n < MIN_EVIDENCE ? "none" : n < SOLID_EVIDENCE ? "building" : "solid";
    return {
      domain: id,
      label,
      attempts: Math.round(n),
      correct: Math.round(c),
      accuracy,
      grade: confidence === "none" ? null : letterGrade(accuracy),
      confidence,
    };
  });
}

/** Domains the learner has demonstrably mastered: solid evidence, 90%+. */
export function masteredDomains(ratings: DomainRating[]): DomainRating[] {
  return ratings.filter((r) => r.confidence === "solid" && r.accuracy >= 0.9);
}

/** Domains that could use support: rated evidence below 70% accuracy. */
export function strugglingDomains(ratings: DomainRating[]): DomainRating[] {
  return ratings.filter((r) => r.grade !== null && r.accuracy < 0.7);
}

function pretty(id: string): string {
  return id.replace(/[-_]/g, " ");
}

const WEEKLY_ACTIVITY: Record<DomainId, string> = {
  listening: "5 minutes of high/low listening",
  notes: "5 minutes of note finding on the keyboard",
  rhythm: "5 minutes of rhythm tapping",
  scales: "5 minutes of scale singing",
  chords: "5 minutes of chord listening",
  theory: "5 minutes of pattern spotting",
};

export type WeeklyAction = {
  domain: DomainId;
  headline: string;
  detail: string;
};

/**
 * ONE concrete weekly suggestion for a grown-up: the weakest rated domain,
 * with a sticking point named when the evidence names one (a concept whose
 * latest recall slipped, or a note with shaky first-try accuracy).
 */
export function weeklyAction(
  ratings: DomainRating[],
  concepts: Record<string, ConceptReview>,
  noteEvidence: Record<string, NoteEvidence>,
): WeeklyAction {
  const rated = ratings.filter((r) => r.grade !== null);
  const weakest =
    [...rated].sort((a, b) => a.accuracy - b.accuracy)[0] ??
    ratings.find((r) => r.domain === "listening")!;
  const domain = weakest.domain;

  // Sticking point: a slipped concept in this domain, else a shaky note.
  let sticking: string | null = null;
  const slipped = Object.values(concepts)
    .filter((c) => {
      const topic = CONCEPT_TOPICS[c.conceptId];
      return (
        topic &&
        TOPIC_DOMAINS[topic] === domain &&
        (c.lastResult === "wrong" || c.lastResult === "assisted")
      );
    })
    .sort((a, b) => (a.conceptId < b.conceptId ? -1 : 1))[0];
  if (slipped) {
    sticking = pretty(slipped.conceptId);
  } else if (domain === "notes") {
    const shaky = Object.values(noteEvidence)
      .filter((n) => n.attempts >= 3)
      .sort((a, b) => a.firstTryCorrect / a.attempts - b.firstTryCorrect / b.attempts)[0];
    if (shaky) sticking = `note ${shaky.note}`;
  }

  return {
    domain,
    headline: `This week: ${WEEKLY_ACTIVITY[domain]}`,
    detail: sticking
      ? `${sticking[0]!.toUpperCase()}${sticking.slice(1)} keeps slipping — a little extra time there goes a long way. Short and often beats one long session.`
      : `Keep it light and regular — short sessions a few times this week build the habit better than one long push.`,
  };
}
