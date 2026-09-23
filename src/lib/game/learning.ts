/**
 * Lesson state machine + spaced-recall scheduling.
 * Pure functions: explicit allowed transitions, no UI dependencies.
 *
 * Learn -> Try it -> Recall -> Done.
 * - Each step checkpoints; reload restores the exact step and original answers.
 * - First completion awards points once; repeats never farm.
 * - Recall intervals: 1 -> 3 -> 7 -> 15 -> 30 days. Wrong/assisted -> 1 day.
 */

import type { CheckResult, ConceptReview, LessonProgress, LessonStep } from "./schema.ts";

export const RECALL_INTERVALS = [1, 3, 7, 15, 30] as const;
export const COMPLETION_POINTS = 25;

const STEP_ORDER: LessonStep[] = ["learn", "try", "recall", "done"];

const ALLOWED: Record<LessonStep, LessonStep[]> = {
  learn: ["try"],
  try: ["recall", "learn"],
  recall: ["done", "try"],
  done: ["learn"], // revisit allowed; no extra credit
};

/** Can the lesson move from `from` to `to`? */
export function canTransition(from: LessonStep, to: LessonStep): boolean {
  return ALLOWED[from].includes(to);
}

export function nextStep(step: LessonStep): LessonStep | null {
  const i = STEP_ORDER.indexOf(step);
  return i >= 0 && i < STEP_ORDER.length - 1 ? STEP_ORDER[i + 1]! : null;
}

export type LessonDefinition = {
  id: string;
  chapter: number;
  title: string;
  estimateMinutes: number;
  checks: { id: string; conceptId: string }[];
};

/**
 * Record an answered recall check. Returns the updated check list and
 * whether this answer was the lesson's first completion of that check.
 * Explanations are shown after every answer; wrong answers are kept as
 * mistakes for recall scheduling but never block progress.
 */
export function recordCheck(
  existing: CheckResult[],
  checkId: string,
  correct: boolean,
  assisted: boolean,
  now = Date.now(),
): { checks: CheckResult[]; isFirst: boolean } {
  const isFirst = !existing.some((c) => c.checkId === checkId);
  const checks = existing.filter((c) => c.checkId !== checkId);
  checks.push({ checkId, correctFirstTry: correct && !assisted, assisted, answeredAt: now });
  return { checks, isFirst };
}

/**
 * Advance the spaced-repetition schedule for a concept.
 * Correct unassisted recall lengthens the interval; wrong or assisted
 * recall returns to a 1-day interval. Early repeats do not lengthen it.
 */
export function scheduleRecall(
  prev: ConceptReview | null,
  conceptId: string,
  result: "correct" | "wrong" | "assisted",
  now = Date.now(),
): ConceptReview {
  const DAY = 24 * 60 * 60 * 1000;
  let intervalDays: number;
  if (result === "correct") {
    const prevIndex = prev ? RECALL_INTERVALS.indexOf(prev.intervalDays as (typeof RECALL_INTERVALS)[number]) : -1;
    intervalDays = RECALL_INTERVALS[Math.min(prevIndex + 1, RECALL_INTERVALS.length - 1)]!;
  } else {
    intervalDays = 1;
  }
  return {
    conceptId,
    intervalDays,
    dueAt: now + intervalDays * DAY,
    lastResult: result,
  };
}

/** Concepts due for recall at `now`. */
export function dueConcepts(concepts: Record<string, ConceptReview>, now = Date.now()): ConceptReview[] {
  return Object.values(concepts).filter((c) => c.dueAt <= now);
}

/**
 * Apply lesson completion. Points are awarded once per lesson, ever.
 * Returns the updated progress and points earned by this call (0 or 25).
 */
export function completeLesson(progress: LessonProgress, now = Date.now()): { progress: LessonProgress; points: number } {
  const points = progress.completionPointsAwarded ? 0 : COMPLETION_POINTS;
  return {
    progress: {
      ...progress,
      step: "done",
      completedAt: progress.completedAt ?? now,
      completionPointsAwarded: true,
    },
    points,
  };
}

/** Fresh progress record for a lesson the learner just opened. */
export function startLesson(lessonId: string): LessonProgress {
  return {
    lessonId,
    step: "learn",
    answers: {},
    checks: [],
    tasks: [],
    completedAt: null,
    completionPointsAwarded: false,
  };
}

/** Today's date key on the device-local calendar (YYYY-MM-DD). */
export function todayKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Record a learning day without streak debt: a day counts once. */
export function recordLearningDay(days: string[], now = new Date()): string[] {
  const key = todayKey(now);
  return days.includes(key) ? days : [...days, key];
}
