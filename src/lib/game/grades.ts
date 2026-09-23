/**
 * Grade trials: the optional progression layer (grades 0-10).
 *
 * Rules (from the roadmap):
 * - Each grade trial measures practice on that grade's own topics only.
 * - First attempts alone drive grade credit; corrections finish the phrase
 *   but do not count.
 * - Thresholds: rolling windows of N relevant answers at P accuracy
 *   (GRADE_THRESHOLDS in curriculum.ts).
 * - Grade 10 is terminal; teaching content is never gated by grade.
 *
 * Pure logic lives here; UI and persistence live in the screens and store.
 */

import {
  GRADE_THRESHOLDS,
  MAX_GRADE,
  levelFor,
  type TopicId,
} from "./curriculum.ts";
import { mulberry32 } from "./tasks.ts";
import type { TaskSpec } from "./course.ts";

/** A trial question: a practical task, a shortened game round, or both. */
export type TrialQuestion =
  | { kind: "task"; spec: TaskSpec }
  | { kind: "duel"; seed: number }
  | { kind: "strike"; seed: number };

/** Which task families provide evidence for each topic. */
export const TOPIC_TASK_SPECS: Record<TopicId, TaskSpec[]> = {
  sensory: [{ kind: "compare-pitch", seed: 0 }],
  "note-reading": [{ kind: "note-id", seed: 0 }],
  rhythm: [
    { kind: "rhythm-echo", seed: 0 },
    { kind: "meter-id", seed: 0 },
  ],
  keys: [{ kind: "scale-id", seed: 0 }],
  scales: [
    { kind: "scale-id", seed: 0 },
    { kind: "scale-id", seed: 0, variant: "modes" },
  ],
  intervals: [{ kind: "interval-id", seed: 0 }],
  triads: [
    { kind: "chord-id", seed: 0, variant: "quality" },
    { kind: "chord-id", seed: 0, variant: "position" },
  ],
  harmony: [
    { kind: "cadence-id", seed: 0, variant: "final" },
    { kind: "cadence-id", seed: 0, variant: "open" },
    { kind: "motion-id", seed: 0 },
    { kind: "seventh-id", seed: 0 },
    { kind: "species-id", seed: 0, variant: "early" },
    { kind: "species-id", seed: 0, variant: "late" },
    { kind: "transform-id", seed: 0 },
  ],
  modulation: [
    { kind: "modulation-id", seed: 0, variant: "detect" },
    { kind: "modulation-id", seed: 0, variant: "where" },
    { kind: "modulation-id", seed: 0, variant: "fugue" },
  ],
  // Game topics are trialed as shortened game rounds, not written tasks.
  duel: [],
  strike: [],
};

/**
 * Map every authored recall-check concept to the topic it evidences.
 * Kept exhaustive: conceptTopic() throws on unknown concepts so new
 * content cannot silently fall out of grade trials.
 */
export const CONCEPT_TOPICS: Record<string, TopicId> = {
  "pitch-direction": "sensory",
  dynamics: "sensory",
  timbre: "sensory",
  "note-alphabet": "note-reading",
  "staff-basics": "note-reading",
  "landmark-notes": "note-reading",
  accidentals: "note-reading",
  pulse: "rhythm",
  "note-durations": "rhythm",
  meter: "rhythm",
  "dotted-rhythm": "rhythm",
  "rhythm-symbols": "rhythm",
  "odd-meters": "rhythm",
  "key-signatures": "keys",
  "circle-of-fifths": "keys",
  "major-scale": "scales",
  "minor-scales": "scales",
  modes: "scales",
  intervals: "intervals",
  consonance: "intervals",
  "triad-qualities": "triads",
  "triad-inversions": "triads",
  "roman-numerals": "harmony",
  cadences: "harmony",
  "open-endings": "harmony",
  "melody-over-chords": "harmony",
  "voice-motion": "harmony",
  parallels: "harmony",
  "first-species": "harmony",
  "species-23": "harmony",
  "species-45": "harmony",
  "melodic-decoration": "harmony",
  "closing-gestures": "harmony",
  "seventh-chords": "harmony",
  extensions: "harmony",
  "borrowed-chords": "harmony",
  "melodic-shape": "harmony",
  fugue: "harmony",
  "musical-form": "harmony",
  transformations: "harmony",
  "related-keys": "modulation",
  "pivot-chords": "modulation",
  tonicization: "modulation",
  "secondary-dominants": "modulation",
};

export function conceptTopic(conceptId: string): TopicId {
  const topic = CONCEPT_TOPICS[conceptId];
  if (!topic) throw new Error(`No grade topic mapped for concept "${conceptId}"`);
  return topic;
}

/** Trial requirement for a grade: question count and pass accuracy. */
export function trialRequirement(grade: number): { questions: number; accuracy: number } {
  const t = GRADE_THRESHOLDS[grade];
  if (!t) throw new Error(`No trial threshold for grade ${grade}`);
  return { questions: t.minSessionAttempts, accuracy: t.minSessionAccuracy };
}

/**
 * Build a deterministic trial plan: N questions round-robin across the
 * grade's topics so every topic is measured. Duel/strike topics become
 * shortened game rounds. Deterministic per (grade, seed).
 */
export function trialPlan(grade: number, seed: number): TrialQuestion[] {
  const level = levelFor(grade);
  const { questions } = trialRequirement(grade);
  const rand = mulberry32(seed);
  const plan: TrialQuestion[] = [];
  for (let i = 0; i < questions; i++) {
    const topic = level.topics[i % level.topics.length]!;
    if (topic === "duel") {
      plan.push({ kind: "duel", seed: Math.floor(rand() * 1_000_000) });
      continue;
    }
    if (topic === "strike") {
      plan.push({ kind: "strike", seed: Math.floor(rand() * 1_000_000) });
      continue;
    }
    const specs = TOPIC_TASK_SPECS[topic];
    const base = specs[Math.floor(rand() * specs.length)]!;
    plan.push({
      kind: "task",
      spec: { ...base, seed: Math.floor(rand() * 1_000_000) },
    });
  }
  return plan;
}

/** First-attempt results → did the trial pass? */
export function trialPassed(results: boolean[], grade: number): boolean {
  const { questions, accuracy } = trialRequirement(grade);
  if (results.length < questions) return false;
  const correct = results.filter(Boolean).length;
  return correct / results.length >= accuracy;
}

export function trialAccuracy(results: boolean[]): number {
  if (results.length === 0) return 0;
  return results.filter(Boolean).length / results.length;
}

/**
 * Pure grade advancement: pass the trial for the current grade and move
 * up one (never beyond MAX_GRADE). Failing keeps the grade.
 */
export function advanceGrade(currentGrade: number, passed: boolean): number {
  if (!passed) return currentGrade;
  return Math.min(currentGrade + 1, MAX_GRADE);
}

/** Human label for a topic id (UI). */
export const TOPIC_LABELS: Record<TopicId, string> = {
  sensory: "Listening",
  "note-reading": "Note reading",
  rhythm: "Rhythm",
  keys: "Keys",
  scales: "Scales",
  intervals: "Intervals",
  triads: "Triads",
  harmony: "Harmony",
  modulation: "Modulation",
  duel: "Duel",
  strike: "Strike",
};
