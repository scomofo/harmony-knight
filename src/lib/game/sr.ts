/**
 * Note-level spaced repetition for Practice.
 * Evidence is per exact note+octave. A note clears when its latest answer
 * is correct AND recent first-try accuracy reaches 80%.
 */

import type { NoteEvidence } from "./schema.ts";

export const CLEAR_ACCURACY = 0.8;
const SHORT_INTERVAL = 1; // day, after a failed review
const LONG_INTERVAL = 3; // days, after a passed review

/**
 * Record one answered note. Returns the updated evidence and whether the
 * note just cleared (latest answer correct AND recent first-try accuracy
 * reaches 80%). Assisted-correct still counts as correct for scheduling;
 * only unassisted first-try answers feed the accuracy that clears notes.
 */
export function recordNoteAnswer(
  prev: NoteEvidence | null,
  note: string,
  correct: boolean,
  correctFirstTry: boolean,
  recentFirstTryAccuracy: number,
  now = Date.now(),
): { evidence: NoteEvidence; cleared: boolean } {
  const DAY = 24 * 60 * 60 * 1000;
  const attempts = (prev?.attempts ?? 0) + 1;
  const firstTryCorrect = (prev?.firstTryCorrect ?? 0) + (correctFirstTry ? 1 : 0);
  const cleared = correct && recentFirstTryAccuracy >= CLEAR_ACCURACY;
  const evidence: NoteEvidence = {
    note,
    attempts,
    firstTryCorrect,
    lastCorrect: correct,
    dueAt: now + (correct ? LONG_INTERVAL : SHORT_INTERVAL) * DAY,
  };
  return { evidence, cleared };
}

/** Notes that need work: wrong latest answer or due now. */
export function notesNeedingWork(
  evidence: Record<string, NoteEvidence>,
  now = Date.now(),
): NoteEvidence[] {
  return Object.values(evidence).filter((e) => !e.lastCorrect || e.dueAt <= now);
}

/** First-try accuracy over the last N answers (as a 0..1 fraction). */
export function recentAccuracy(history: boolean[]): number {
  if (history.length === 0) return 1;
  const correct = history.filter(Boolean).length;
  return correct / history.length;
}
