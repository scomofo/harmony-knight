/**
 * Creation palettes: the 32-step sequencer follows the learner's progress.
 *
 * The creator used to offer one fixed octave divorced from the curriculum.
 * Now the keyboard range, the "always sound good" scale, the auto-bass
 * roots, and the rhythm grids are derived from the highest-completed
 * lesson's concepts: finishing the triad lesson unlocks chord stabs, the
 * ii-V-I lesson unlocks ii-V-I changes, the rhythm lessons unlock new
 * rhythm grids, and so on.
 *
 * Pure module: palette definitions, the concept -> palette map, and the
 * progress lookup. The creator UI owns presentation.
 */

import { CHAPTERS, lessonBody } from "./course.ts";

export type RhythmGrid = {
  id: string;
  label: string;
  hint: string;
  /** Steps per cycle; durations/accents must each have exactly this many entries. */
  cycle: number;
  /** Per-step duration multipliers, cycled over the melody. */
  durations: number[];
  /** Per-step gain multipliers (accents), cycled over the melody. */
  accents: number[];
};

export type Palette = {
  id: string;
  /** Curriculum concept that unlocks this palette ("" = the starter default). */
  conceptId: string;
  label: string;
  blurb: string;
  /** Creator keyboard window (inclusive MIDI). */
  from: number;
  to: number;
  /** Pitch classes the "always sound good" mode snaps melody notes to. */
  scalePcs: number[];
  /**
   * Per-bar chord tones (pitch classes) for smarter quantization: the
   * quantizer prefers the current bar's chord, cycled. Absent = scale only.
   */
  chordTones?: number[][];
  /** Bass roots (MIDI) for auto-harmonize: one per 4-step bar, cycled. */
  bassRoots: number[];
  /** Rhythm grids offered with this palette (first = default). */
  rhythmGrids: RhythmGrid[];
};

/* ------------------------------------------------------------------ */
/* Rhythm grids                                                          */
/* ------------------------------------------------------------------ */

const EVEN: RhythmGrid = {
  id: "even",
  label: "Even pulse",
  hint: "Every step the same length — the steady heartbeat.",
  cycle: 4,
  durations: [1, 1, 1, 1],
  accents: [1, 0.7, 0.85, 0.7],
};

const HEARTBEAT: RhythmGrid = {
  id: "heartbeat",
  label: "Heartbeat",
  hint: "Lub-dub: a strong beat and its echo.",
  cycle: 4,
  durations: [1, 1, 1, 1],
  accents: [1, 0.5, 0.75, 0.5],
};

const WALTZ: RhythmGrid = {
  id: "waltz",
  label: "Waltz 3/4",
  hint: "ONE-two-three, ONE-two-three — triple meter.",
  cycle: 3,
  durations: [1, 1, 1],
  accents: [1, 0.6, 0.6],
};

const DOTTED_MARCH: RhythmGrid = {
  id: "dotted-march",
  label: "Dotted march",
  hint: "Long-short, long-short — the dotted strut.",
  cycle: 4,
  durations: [1.5, 0.5, 1.5, 0.5],
  accents: [1, 0.6, 1, 0.6],
};

const SYNCOPATION: RhythmGrid = {
  id: "syncopation",
  label: "Off-beat",
  hint: "Accents land between the beats — syncopation.",
  cycle: 8,
  durations: [1, 1, 1, 1, 1, 1, 1, 1],
  accents: [0.6, 1, 0.6, 1, 0.6, 1, 0.6, 0.9],
};

const FIVE_FOUR: RhythmGrid = {
  id: "five-four",
  label: "5/4 groove",
  hint: "Five beats per cycle — the odd-meter swagger.",
  cycle: 5,
  durations: [1, 1, 1, 1, 1],
  accents: [1, 0.6, 0.6, 0.85, 0.6],
};

const SEVEN_EIGHT: RhythmGrid = {
  id: "seven-eight",
  label: "7/8 dance",
  hint: "Seven quick steps per cycle — the Balkan bounce.",
  cycle: 7,
  durations: [1, 1, 1, 1, 1, 1, 1],
  accents: [1, 0.6, 0.8, 0.6, 1, 0.6, 0.8],
};

const TRESILLO: RhythmGrid = {
  id: "tresillo",
  label: "3:2 clave",
  hint: "Three strokes against two — the polyrhythm heartbeat.",
  cycle: 8,
  durations: [1, 1, 1, 1, 1, 1, 1, 1],
  accents: [1, 0.4, 0.4, 1, 0.4, 0.4, 1, 0.4],
};

/* ------------------------------------------------------------------ */
/* Palettes, in curriculum unlock order                                  */
/* ------------------------------------------------------------------ */

const MAJOR_PCS = [0, 2, 4, 5, 7, 9, 11];

export const STARTER_PALETTE: Palette = {
  id: "starter",
  conceptId: "",
  label: "First octave",
  blurb: "One octave to play in. Finish lessons to unlock new palettes.",
  from: 60,
  to: 72,
  scalePcs: MAJOR_PCS,
  bassRoots: [36, 41, 43, 36], // C2 F2 G2 C2
  rhythmGrids: [EVEN],
};

export const PALETTES: Palette[] = [
  STARTER_PALETTE,
  {
    id: "steady-beat",
    conceptId: "pulse",
    label: "Steady beat",
    blurb: "Unlocked by Steady Pulse — feel the heartbeat under your melody.",
    from: 60,
    to: 72,
    scalePcs: MAJOR_PCS,
    bassRoots: [36, 41, 43, 36],
    rhythmGrids: [EVEN, HEARTBEAT],
  },
  {
    id: "note-names",
    conceptId: "note-alphabet",
    label: "Note names",
    blurb: "Unlocked by The Note Alphabet — exactly the white keys, C to B.",
    from: 60,
    to: 71,
    scalePcs: MAJOR_PCS,
    bassRoots: [36, 41, 43, 36],
    rhythmGrids: [EVEN, HEARTBEAT],
  },
  {
    id: "waltz-time",
    conceptId: "meter",
    label: "Waltz time",
    blurb: "Unlocked by Simple and Compound Meter — now in 3/4.",
    from: 60,
    to: 72,
    scalePcs: MAJOR_PCS,
    bassRoots: [36, 41, 43, 36],
    rhythmGrids: [EVEN, HEARTBEAT, WALTZ],
  },
  {
    id: "dotted-march",
    conceptId: "dotted-rhythm",
    label: "Dotted march",
    blurb: "Unlocked by Dots — the long-short strut.",
    from: 60,
    to: 72,
    scalePcs: MAJOR_PCS,
    bassRoots: [36, 41, 43, 36],
    rhythmGrids: [EVEN, HEARTBEAT, WALTZ, DOTTED_MARCH],
  },
  {
    id: "off-beat",
    conceptId: "rhythm-symbols",
    label: "Off-beat",
    blurb: "Unlocked by Rests, Ties, Syncopation — accents between the beats.",
    from: 60,
    to: 72,
    scalePcs: MAJOR_PCS,
    bassRoots: [36, 41, 43, 36],
    rhythmGrids: [EVEN, HEARTBEAT, WALTZ, DOTTED_MARCH, SYNCOPATION],
  },
  {
    id: "major-map",
    conceptId: "major-scale",
    label: "Major map",
    blurb: "Unlocked by Major Scales — two full octaves of C major.",
    from: 60,
    to: 84,
    scalePcs: MAJOR_PCS,
    bassRoots: [36, 41, 43, 36],
    rhythmGrids: [EVEN, HEARTBEAT, WALTZ, DOTTED_MARCH, SYNCOPATION],
  },
  {
    id: "minor-moods",
    conceptId: "minor-scales",
    label: "Minor moods",
    blurb: "Unlocked by Minor Scales — the natural minor palette, darker hues.",
    from: 57,
    to: 81,
    scalePcs: [0, 2, 3, 5, 7, 8, 10],
    bassRoots: [33, 38, 40, 33], // A1 D2 E2 A1
    rhythmGrids: [EVEN, HEARTBEAT, WALTZ, DOTTED_MARCH, SYNCOPATION],
  },
  {
    id: "chord-stabs",
    conceptId: "triad-qualities",
    label: "Chord stabs",
    blurb: "Unlocked by Triad Qualities — your melody snaps to C, F, G, C chord tones.",
    from: 60,
    to: 79,
    scalePcs: MAJOR_PCS,
    chordTones: [
      [0, 4, 7], // C
      [5, 9, 0], // F
      [7, 11, 2], // G
      [0, 4, 7], // C
    ],
    bassRoots: [36, 41, 43, 36],
    rhythmGrids: [EVEN, HEARTBEAT, WALTZ, DOTTED_MARCH, SYNCOPATION],
  },
  {
    id: "two-five-one",
    conceptId: "roman-numerals",
    label: "ii–V–I",
    blurb: "Unlocked by Roman Numerals — the jazz turnaround: Dm7, G7, Cmaj7.",
    from: 60,
    to: 79,
    scalePcs: MAJOR_PCS,
    chordTones: [
      [2, 5, 9, 0], // Dm7
      [7, 11, 2, 5], // G7
      [0, 4, 7, 11], // Cmaj7
    ],
    bassRoots: [38, 43, 36], // D2 G2 C2
    rhythmGrids: [EVEN, HEARTBEAT, WALTZ, DOTTED_MARCH, SYNCOPATION],
  },
  {
    id: "perfect-close",
    conceptId: "cadences",
    label: "Perfect close",
    blurb: "Unlocked by Cadences — authentic and plagal punctuation for your phrases.",
    from: 60,
    to: 79,
    scalePcs: MAJOR_PCS,
    chordTones: [
      [7, 11, 2, 5], // G7
      [0, 4, 7], // C
      [5, 9, 0], // F
      [0, 4, 7], // C
    ],
    bassRoots: [43, 36, 41, 36], // G2 C2 F2 C2
    rhythmGrids: [EVEN, HEARTBEAT, WALTZ, DOTTED_MARCH, SYNCOPATION],
  },
  {
    id: "secondary-fire",
    conceptId: "secondary-dominants",
    label: "Secondary fire",
    blurb: "Unlocked by Secondary Dominants — borrowed fireworks: C, A7, Dm7, G7.",
    from: 60,
    to: 79,
    scalePcs: MAJOR_PCS,
    chordTones: [
      [0, 4, 7], // C
      [9, 1, 4, 7], // A7
      [2, 5, 9], // Dm7
      [7, 11, 2], // G7
    ],
    bassRoots: [36, 33, 38, 43], // C2 A1 D2 G2
    rhythmGrids: [EVEN, HEARTBEAT, WALTZ, DOTTED_MARCH, SYNCOPATION],
  },
  {
    id: "seventh-sky",
    conceptId: "seventh-chords",
    label: "Seventh sky",
    blurb: "Unlocked by Seventh Chords — lush four-note harmony under every bar.",
    from: 60,
    to: 79,
    scalePcs: MAJOR_PCS,
    chordTones: [
      [0, 4, 7, 11], // Cmaj7
      [5, 9, 0, 4], // Fmaj7
      [2, 5, 9, 0], // Dm7
      [7, 11, 2, 5], // G7
    ],
    bassRoots: [36, 41, 38, 43], // C2 F2 D2 G2
    rhythmGrids: [EVEN, HEARTBEAT, WALTZ, DOTTED_MARCH, SYNCOPATION],
  },
  {
    id: "odd-grooves",
    conceptId: "odd-meters",
    label: "Odd grooves",
    blurb: "Unlocked by Odd Meters — 5/4, 7/8, and the 3:2 clave.",
    from: 60,
    to: 79,
    scalePcs: MAJOR_PCS,
    chordTones: [
      [0, 4, 7, 11],
      [5, 9, 0, 4],
      [2, 5, 9, 0],
      [7, 11, 2, 5],
    ],
    bassRoots: [36, 41, 38, 43],
    rhythmGrids: [EVEN, HEARTBEAT, WALTZ, DOTTED_MARCH, SYNCOPATION, FIVE_FOUR, SEVEN_EIGHT, TRESILLO],
  },
  {
    id: "dorian-doors",
    conceptId: "modes",
    label: "Dorian doors",
    blurb: "Unlocked by Modes — the Dorian color over a Dm7–G7 vamp.",
    from: 60,
    to: 79,
    scalePcs: [0, 2, 3, 5, 7, 9, 10],
    chordTones: [
      [2, 5, 9, 0], // Dm7
      [7, 11, 2, 5], // G7
    ],
    bassRoots: [38, 43], // D2 G2
    rhythmGrids: [EVEN, HEARTBEAT, WALTZ, DOTTED_MARCH, SYNCOPATION, FIVE_FOUR, SEVEN_EIGHT, TRESILLO],
  },
];

const BY_CONCEPT = new Map(PALETTES.filter((p) => p.conceptId !== "").map((p) => [p.conceptId, p]));

/** Palette for a single concept id, or undefined when unmapped. */
export function paletteForConcept(conceptId: string): Palette | undefined {
  return BY_CONCEPT.get(conceptId);
}

/** Curriculum-ordered lesson ids (44). */
export function lessonOrderIds(): string[] {
  return CHAPTERS.flatMap((c) => c.lessons.map((l) => l.id));
}

/** Deduplicated concept ids taught by a lesson (from its recall checks). */
export function conceptsForLesson(lessonId: string): string[] {
  const body = lessonBody(lessonId);
  if (!body) return [];
  return [...new Set(body.checks.map((c) => c.conceptId))];
}

function lessonTitle(lessonId: string): string {
  for (const c of CHAPTERS) {
    const l = c.lessons.find((x) => x.id === lessonId);
    if (l) return l.title;
  }
  return lessonId;
}

/** Lesson that first teaches a palette's concept (unlock order anchor). */
function unlockLessonFor(palette: Palette): string | null {
  if (palette.conceptId === "") return null;
  for (const id of lessonOrderIds()) {
    if (conceptsForLesson(id).includes(palette.conceptId)) return id;
  }
  return null;
}

/**
 * Palette for the learner's progress: the highest-completed lesson's
 * concepts, mapped to a palette. Walks back through earlier lessons when
 * the top lesson's concepts have no palette; falls back to the starter
 * palette when nothing maps.
 */
export function paletteForProgress(completedLessonIds: Iterable<string>): Palette {
  const completed = new Set(completedLessonIds);
  const order = lessonOrderIds();
  for (let i = order.length - 1; i >= 0; i--) {
    const lessonId = order[i]!;
    if (!completed.has(lessonId)) continue;
    for (const conceptId of conceptsForLesson(lessonId)) {
      const palette = BY_CONCEPT.get(conceptId);
      if (palette) return palette;
    }
  }
  return STARTER_PALETTE;
}

export type PaletteProgress = {
  current: Palette;
  /** Lesson that unlocked the current palette (null = starter). */
  unlockedByLesson: string | null;
  /** Next palette to unlock, with the lesson that unlocks it. */
  next: { palette: Palette; lessonId: string; lessonTitle: string } | null;
};

/**
 * Current palette plus the next unlock, for the creator's "what's next" line.
 */
export function paletteProgress(completedLessonIds: Iterable<string>): PaletteProgress {
  const completed = new Set(completedLessonIds);
  const current = paletteForProgress(completed);
  let next: PaletteProgress["next"] = null;
  for (const palette of PALETTES) {
    if (palette.conceptId === "") continue;
    const lessonId = unlockLessonFor(palette);
    if (lessonId && !completed.has(lessonId)) {
      next = { palette, lessonId, lessonTitle: lessonTitle(lessonId) };
      break;
    }
  }
  const unlockedBy = current.conceptId === "" ? null : unlockLessonFor(current);
  return {
    current,
    unlockedByLesson: unlockedBy ? lessonTitle(unlockedBy) : null,
    next,
  };
}

/** Grid lookup by id within a palette (falls back to the palette default). */
export function gridForPalette(palette: Palette, gridId: string): RhythmGrid {
  return palette.rhythmGrids.find((g) => g.id === gridId) ?? palette.rhythmGrids[0]!;
}
