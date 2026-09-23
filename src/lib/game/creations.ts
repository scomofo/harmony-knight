/**
 * Creations: the open creative payoff, one prompt per chapter.
 * Autosaved named drafts, replayable, and deliberately outside mastery
 * and grade calculations — creation is play, not assessment.
 */

import { CHAPTERS } from "./course.ts";

export type CreationData = {
  notes: number[]; // MIDI, one per step
};

/** Validate opaque creation data from storage/import. */
export function parseCreationData(data: unknown): CreationData {
  if (typeof data !== "object" || data === null) return { notes: [] };
  const notes = (data as { notes?: unknown }).notes;
  if (!Array.isArray(notes)) return { notes: [] };
  return {
    notes: notes
      .filter((n): n is number => typeof n === "number" && Number.isFinite(n))
      .map((n) => Math.max(0, Math.min(127, Math.round(n))))
      .slice(0, 64),
  };
}

export const MAX_CREATION_STEPS = 32;

/** One creative prompt per chapter, derived from chapter metadata. */
export const CREATION_PROMPTS: Record<string, string> = {
  "ch1-sound": "Make a 4-note melody using only high and low sounds. Loud or soft — your call.",
  "ch2-notation": "Write an 8-note melody using only the notes C, D, E, F, G. Can you make it singable?",
  "ch3-rhythm": "Build a 2-bar rhythm piece: alternate long and short notes and feel the pulse.",
  "ch4-tonality": "Compose an 8-note melody in C major that starts and ends on C — home sweet home.",
  "ch5-chords": "Arpeggiate a chord progression: C – F – G – C, one chord per bar. Four notes per chord.",
  "ch6-phrases": "Write a musical question (4 notes) and its answer (4 notes). End the answer on C.",
  "ch7-voiceleading": "Write two smooth lines: a 4-note top voice and a 4-note bass that moves mostly by step.",
  "ch8-keychange": "Start your melody in C major, then modulate: end it in G major.",
  "ch9-colour": "Add color: use at least one seventh chord arpeggio and one surprising chromatic note.",
  "ch10-counterpoint": "Write a 4-note cantus firmus, then a second voice that moves against it.",
  "ch11-development": "Compose a fugue subject: a short, characterful idea with a clear shape.",
};

export function creationPromptForChapter(chapterId: string): string {
  return CREATION_PROMPTS[chapterId] ?? "Make something musical — any notes, any order.";
}

/** Chapter options for the creation picker, from curriculum metadata. */
export function creationChapters(): { id: string; title: string }[] {
  return CHAPTERS.map((c) => ({ id: c.id, title: c.title }));
}
