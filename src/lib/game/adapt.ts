/**
 * adapt.ts — Phase 1 of the Adaptive Engine: heuristic adaptivity.
 *
 * Pure functions only: per-domain skill estimates from recent evidence,
 * difficulty selection, lesson mastery, and confusion-pair spaced recall.
 * UI and persistence live in the screens and store.
 *
 * What this is NOT (explicitly Phase 2, out of scope here):
 * IRT / Bayesian psychometrics — no item-response model, no ability
 * posterior, no information-based item selection. The heuristic below
 * (recency-weighted moving accuracy) is deliberately simple and
 * explainable in UI copy. A future Phase 2 can replace skillEstimate()
 * with a proper estimator behind the same AdaptiveAttempt evidence.
 *
 * Domains are task kinds (see tasks.ts TaskKind). Phase 1 wires
 * difficulty into three families: note-id, rhythm-echo, interval-id.
 * Other families always generate at standard difficulty (follow-up).
 */

import type { LessonProgress } from "./schema.ts";
import type { TaskKind, PracticalTask } from "./tasks.ts";
import {
  buildChordIdTask,
  buildIntervalIdTask,
  buildNoteIdTask,
  buildScaleIdTask,
  INTERVAL_ID_FULL,
} from "./tasks.ts";
import { RECALL_INTERVALS } from "./learning.ts";

/* ------------------------------------------------------------------ */
/* Attempt evidence                                                    */
/* ------------------------------------------------------------------ */

/** One judged task attempt, appended per domain (newest last, cap 10). */
export type AdaptiveAttempt = {
  at: number;
  correct: boolean;
  firstTry: boolean;
  assisted: boolean;
};

/** Recent attempts, newest last. Pure helper for tests and UI. */
export function appendAttempt(
  log: AdaptiveAttempt[],
  attempt: AdaptiveAttempt,
  cap = 10,
): AdaptiveAttempt[] {
  return [...log, attempt].slice(-cap);
}

/* ------------------------------------------------------------------ */
/* Skill estimate + difficulty                                         */
/* ------------------------------------------------------------------ */

/**
 * Recency-weighted moving accuracy over the last N attempts.
 * Linear weights (oldest 1 … newest N) so recent form matters most.
 * An assisted-correct attempt scores 0.5: hints helped, so it says
 * less about independent skill. Returns null with no evidence.
 */
export function skillEstimate(
  attempts: AdaptiveAttempt[],
  window = 10,
): number | null {
  const recent = attempts.slice(-window);
  if (recent.length === 0) return null;
  let weighted = 0;
  let total = 0;
  for (let i = 0; i < recent.length; i++) {
    const a = recent[i]!;
    const weight = i + 1;
    const score = a.correct ? (a.assisted ? 0.5 : 1) : 0;
    weighted += weight * score;
    total += weight;
  }
  return weighted / total;
}

/** 0 = gentle, 1 = standard, 2 = spicy. */
export type DifficultyLevel = 0 | 1 | 2;

export type TaskDifficulty = {
  level: DifficultyLevel;
  /** Short label for UI. */
  label: string;
  /** Explainable copy: why the difficulty is what it is. Null at standard. */
  blurb: string | null;
};

const GENTLE_BELOW = 0.55;
const SPICY_AT = 0.85;

/** Map a skill estimate to a difficulty level. No evidence → standard. */
export function difficultyLevel(estimate: number | null): DifficultyLevel {
  if (estimate === null) return 1;
  if (estimate < GENTLE_BELOW) return 0;
  if (estimate >= SPICY_AT) return 2;
  return 1;
}

/**
 * Difficulty for a domain from its attempt log. Unknown/unwired domains
 * always return standard — callers thread the level into task builders.
 */
export function difficultyFor(
  domain: TaskKind,
  attempts: AdaptiveAttempt[] | undefined,
): TaskDifficulty {
  void domain;
  const level = difficultyLevel(skillEstimate(attempts ?? []));
  return describeDifficulty(level);
}

/** Explainable label + copy for a difficulty level. Null blurb at standard. */
export function describeDifficulty(level: DifficultyLevel): TaskDifficulty {
  if (level === 0) {
    return {
      level,
      label: "Gentle",
      blurb: "Keeping it gentle while you warm up 🌱",
    };
  }
  if (level === 2) {
    return {
      level,
      label: "Spicy",
      blurb: "Getting trickier because you're nailing these 🎯",
    };
  }
  return { level, label: "Standard", blurb: null };
}

/* ------------------------------------------------------------------ */
/* Mastery gating (~80%, never blocking)                               */
/* ------------------------------------------------------------------ */

/** First-try accuracy at or above this over recent evidence = mastered. */
export const MASTERY_THRESHOLD = 0.8;
/** Minimum first-try data points before mastery can be awarded. */
export const MASTERY_MIN_EVIDENCE = 2;

export type MasteryState = {
  mastered: boolean;
  /** 0..1 first-try accuracy over the lesson's evidence. */
  accuracy: number;
  evidenceCount: number;
};

/**
 * Lesson mastery from first-try evidence: recall checks
 * (correctFirstTry) + practical tasks (sticky firstCheckCorrect).
 * A lesson counts as mastered at ~80% first-try accuracy with at least
 * MASTERY_MIN_EVIDENCE data points. Mastery never blocks: it unlocks the
 * next lesson with encouragement; unmastered suggests practice.
 */
export function masteryForLesson(
  progress: LessonProgress | undefined,
): MasteryState {
  if (!progress) return { mastered: false, accuracy: 0, evidenceCount: 0 };
  const checks = progress.checks.map((c) => c.correctFirstTry);
  const tasks = progress.tasks
    .map((t) => t.firstCheckCorrect)
    .filter((v): v is boolean => v !== null);
  const evidence = [...checks, ...tasks];
  if (evidence.length < MASTERY_MIN_EVIDENCE) {
    return { mastered: false, accuracy: 0, evidenceCount: evidence.length };
  }
  const accuracy = evidence.filter(Boolean).length / evidence.length;
  return {
    mastered: accuracy >= MASTERY_THRESHOLD,
    accuracy,
    evidenceCount: evidence.length,
  };
}

/* ------------------------------------------------------------------ */
/* Confusion-pair spaced repetition                                    */
/* ------------------------------------------------------------------ */

/**
 * A confused pair: the learner picked `chosen` when the answer was
 * `correct`, on an unassisted attempt with musically-named choices.
 * Scheduled like spaced-repetition items (same interval ladder as
 * learning.ts RECALL_INTERVALS): a fresh mix-up is due right away;
 * successful recalls lengthen the interval.
 */
export type ConfusionPair = {
  domain: string;
  correct: string;
  chosen: string;
  misses: number;
  hits: number;
  lastAt: number;
  dueAt: number;
  intervalDays: number;
};

/** Domains whose choices are musically named (not positional 1/2). */
export const CONFUSION_DOMAINS: ReadonlySet<string> = new Set([
  "note-id",
  "interval-id",
  "scale-id",
  "chord-id",
]);

export function confusionKey(domain: string, correct: string, chosen: string): string {
  return `${domain}|||${correct}|||${chosen}`;
}

function nextIntervalDays(current: number): number {
  const i = RECALL_INTERVALS.indexOf(
    current as (typeof RECALL_INTERVALS)[number],
  );
  return RECALL_INTERVALS[Math.min(i + 1, RECALL_INTERVALS.length - 1)]!;
}

/**
 * Record an unassisted wrong choice where the distractor is known.
 * A fresh mix-up is due immediately so Practice can offer to untangle it;
 * repeat misses keep it due now.
 */
export function recordConfusionMiss(
  prev: ConfusionPair | null,
  domain: string,
  correct: string,
  chosen: string,
  now = Date.now(),
): ConfusionPair {
  return {
    domain,
    correct,
    chosen,
    misses: (prev?.misses ?? 0) + 1,
    hits: prev?.hits ?? 0,
    lastAt: now,
    dueAt: now,
    intervalDays: 1,
  };
}

/**
 * Record a recall of a previously confused pair: an unassisted correct
 * answer whose canonical answer matches the pair's `correct`. Successful
 * recall lengthens the interval along the SR ladder.
 */
export function recordConfusionHit(
  pairs: Record<string, ConfusionPair>,
  domain: string,
  correct: string,
  now = Date.now(),
): Record<string, ConfusionPair> {
  const prefix = `${domain}|||${correct}|||`;
  const next: Record<string, ConfusionPair> = { ...pairs };
  for (const [key, pair] of Object.entries(pairs)) {
    if (!key.startsWith(prefix)) continue;
    const intervalDays = nextIntervalDays(pair.intervalDays);
    next[key] = {
      ...pair,
      hits: pair.hits + 1,
      lastAt: now,
      dueAt: now + intervalDays * 24 * 60 * 60 * 1000,
      intervalDays,
    };
  }
  return next;
}

/**
 * Pairs needing work: more misses than successful recalls, and due.
 * Sorted most-overdue first. These are the targeted recall items fed
 * into spaced practice.
 */
export function confusionDue(
  pairs: Record<string, ConfusionPair>,
  now = Date.now(),
): ConfusionPair[] {
  return Object.values(pairs)
    .filter((p) => p.misses > p.hits && p.dueAt <= now)
    .sort((a, b) => a.dueAt - b.dueAt);
}

/* ------------------------------------------------------------------ */
/* Targeted recall tasks                                               */
/* ------------------------------------------------------------------ */

/** Naturals C4–C6: every note-id answer lives in this pool at any level. */
const TARGET_NOTE_POOL = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79, 81, 83, 84];

function targetedVariant(domain: string, correct: string): string | undefined {
  if (domain === "scale-id") {
    return correct === "Major (Ionian)" || correct === "Dorian" ? "modes" : undefined;
  }
  if (domain === "chord-id") {
    return correct === "Root position" || correct === "First inversion"
      ? "position"
      : "quality";
  }
  return undefined;
}

/**
 * Build a task of `domain` whose canonical answer equals `correct` —
 * a targeted recall item for a confusion pair. Deterministic per
 * (domain, correct, salt): seeds are tried in order until the generated
 * task's answer matches. Returns null only if no seed in the search
 * window matches (should not happen for the supported domains).
 */
export function buildTargetedTask(
  domain: string,
  correct: string,
  salt = 0,
): PracticalTask | null {
  if (!CONFUSION_DOMAINS.has(domain)) return null;
  const build = (seed: number): PracticalTask => {
    switch (domain) {
      case "note-id":
        return buildNoteIdTask(seed, { pool: TARGET_NOTE_POOL, choiceCount: 3 });
      case "interval-id":
        return buildIntervalIdTask(seed, { intervals: INTERVAL_ID_FULL });
      case "scale-id":
        return buildScaleIdTask(seed, targetedVariant(domain, correct));
      case "chord-id":
        return buildChordIdTask(seed, targetedVariant(domain, correct));
      default:
        throw new Error(`No targeted builder for domain "${domain}"`);
    }
  };
  for (let i = 0; i < 1000; i++) {
    const task = build(salt * 100003 + i);
    if (task.answer === correct) return task;
  }
  return null;
}
