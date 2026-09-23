/**
 * Curriculum content contracts.
 * - Every chapter, lesson, check, task, and concept has a stable string ID
 *   that is never reused or reordered semantically (deep links + saves).
 * - The registry lists all 11 chapters x 4 lessons. Bodies are authored per
 *   chapter; only authored lessons are playable.
 */

export type LearnBlock =
  | { kind: "text"; body: string }
  | { kind: "listen"; caption: string; midis: number[]; noteDuration?: number }
  | { kind: "visual"; caption: string; visual: LessonVisual };

export type LessonVisual =
  | { kind: "staff"; clef: "treble" | "bass"; notes: number[]; labels?: string[] }
  | { kind: "keyboard"; from: number; to: number; highlight: number[] };

export type RecallCheck = {
  id: string;
  conceptId: string;
  question: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
  /** Progressive help: revealing it marks the attempt assisted. */
  hint: string;
  /** Optional audio the learner can replay while answering. */
  audio?: { midis: number[]; labels?: string[] };
};

import type { TaskKind } from "./tasks.ts";

export type TaskSpec = { kind: TaskKind; seed: number };

export type LessonBody = {
  id: string;
  chapterId: string;
  title: string;
  estimateMinutes: number;
  learn: LearnBlock[];
  /** Practical task shown in the Try step (optional). */
  tryTask?: TaskSpec;
  checks: RecallCheck[]; // exactly 2 per the content contract
};

export type ChapterMeta = {
  id: string;
  index: number; // zero-based
  title: string;
  theme: string;
  lessons: { id: string; title: string }[];
};

/** Stable registry: 11 chapters, 4 lessons each. Titles per the course map. */
export const CHAPTERS: ChapterMeta[] = [
  {
    id: "ch1-sound",
    index: 0,
    title: "Sound",
    theme: "Awakening — the knight discovers sound.",
    lessons: [
      { id: "ch1-l1-pitch", title: "High and Low: Pitch" },
      { id: "ch1-l2-dynamics", title: "Loud and Soft: Dynamics" },
      { id: "ch1-l3-timbre", title: "Tone Color: Timbre" },
      { id: "ch1-l4-pulse", title: "Steady Pulse" },
    ],
  },
  {
    id: "ch2-notation",
    index: 1,
    title: "Notation",
    theme: "First Light — reading the page.",
    lessons: [
      { id: "ch2-l1-alphabet", title: "The Note Alphabet" },
      { id: "ch2-l2-staff", title: "The Staff" },
      { id: "ch2-l3-landmarks", title: "Landmark Notes" },
      { id: "ch2-l4-accidentals", title: "Semitones and Accidentals" },
    ],
  },
  {
    id: "ch3-rhythm",
    index: 2,
    title: "Rhythm",
    theme: "The Pulse — feeling time.",
    lessons: [
      { id: "ch3-l1-durations", title: "Note Durations" },
      { id: "ch3-l2-meter", title: "Simple and Compound Meter" },
      { id: "ch3-l3-dots", title: "Dots" },
      { id: "ch3-l4-rests", title: "Rests, Ties, Syncopation" },
    ],
  },
  {
    id: "ch4-tonality",
    index: 3,
    title: "Tonality",
    theme: "The Map — keys and scales.",
    lessons: [
      { id: "ch4-l1-major", title: "Major Scales" },
      { id: "ch4-l2-signatures", title: "Key Signatures" },
      { id: "ch4-l3-circle", title: "Circle of Fifths" },
      { id: "ch4-l4-minor", title: "Natural, Harmonic, Melodic Minor" },
    ],
  },
  {
    id: "ch5-chords",
    index: 4,
    title: "Building Chords",
    theme: "The Forge — crafting harmony.",
    lessons: [
      { id: "ch5-l1-intervals", title: "Intervals" },
      { id: "ch5-l2-consonance", title: "Consonance and Tension" },
      { id: "ch5-l3-triads", title: "Triad Qualities" },
      { id: "ch5-l4-inversions", title: "Inversions" },
    ],
  },
  {
    id: "ch6-phrases",
    index: 5,
    title: "Musical Phrases",
    theme: "The Grammar — harmonic sentences.",
    lessons: [
      { id: "ch6-l1-numerals", title: "Roman Numerals" },
      { id: "ch6-l2-cadences", title: "Authentic and Plagal Cadences" },
      { id: "ch6-l3-open", title: "Open Endings" },
      { id: "ch6-l4-melody", title: "Melody Over Chords" },
    ],
  },
  {
    id: "ch7-voiceleading",
    index: 6,
    title: "Voice Leading",
    theme: "The Council — voices in dialogue.",
    lessons: [
      { id: "ch7-l1-species", title: "First-Species Voices" },
      { id: "ch7-l2-parallels", title: "Parallels" },
      { id: "ch7-l3-motion", title: "Motion and SATB" },
      { id: "ch7-l4-decoration", title: "Melodic Decoration" },
    ],
  },
  {
    id: "ch8-keychange",
    index: 7,
    title: "Changing Key",
    theme: "The Gateway — between tonal worlds.",
    lessons: [
      { id: "ch8-l1-related", title: "Closely Related Keys" },
      { id: "ch8-l2-pivot", title: "Pivot Chords" },
      { id: "ch8-l3-tonicization", title: "Tonicization and Modulation" },
      { id: "ch8-l4-secondary", title: "Secondary Dominants" },
    ],
  },
  {
    id: "ch9-color",
    index: 8,
    title: "Colour and Rhythm",
    theme: "The Orchestra — full color.",
    lessons: [
      { id: "ch9-l1-sevenths", title: "Seventh Chords" },
      { id: "ch9-l2-extensions", title: "Extensions" },
      { id: "ch9-l3-borrowed", title: "Borrowed Chords" },
      { id: "ch9-l4-polyrhythm", title: "Odd Meters and 3:2 Polyrhythm" },
    ],
  },
  {
    id: "ch10-counterpoint",
    index: 9,
    title: "Counterpoint",
    theme: "The Duel — lines in contest.",
    lessons: [
      { id: "ch10-l1-shape", title: "Melodic Shape" },
      { id: "ch10-l2-closing", title: "Closing Gestures" },
      { id: "ch10-l3-species23", title: "Second and Third Species" },
      { id: "ch10-l4-florid", title: "Fourth and Fifth Species" },
    ],
  },
  {
    id: "ch11-development",
    index: 10,
    title: "Development",
    theme: "The Masterwork — a harmonic legacy.",
    lessons: [
      { id: "ch11-l1-fugue", title: "Fugue Subjects and Answers" },
      { id: "ch11-l2-form", title: "Development and Form" },
      { id: "ch11-l3-modes", title: "Modes" },
      { id: "ch11-l4-pcset", title: "Pitch-Class Transformations" },
    ],
  },
];

export function chapterById(id: string): ChapterMeta | undefined {
  return CHAPTERS.find((c) => c.id === id);
}

export function lessonMeta(lessonId: string): { chapter: ChapterMeta; index: number } | undefined {
  for (const chapter of CHAPTERS) {
    const index = chapter.lessons.findIndex((l) => l.id === lessonId);
    if (index >= 0) return { chapter, index };
  }
  return undefined;
}

/* ------------------------------------------------------------------ */
/* Authored lesson bodies (vertical slice: chapter 1)                   */
/* ------------------------------------------------------------------ */

const CHAPTER_1: LessonBody[] = [
  {
    id: "ch1-l1-pitch",
    chapterId: "ch1-sound",
    title: "High and Low: Pitch",
    estimateMinutes: 3,
    tryTask: { kind: "compare-pitch", seed: 7 },
    learn: [
      {
        kind: "text",
        body: "Pitch is how high or low a sound feels. A smaller, tighter vibration sounds higher; a slower, wider one sounds lower. In music we name pitches with letters: A, B, C, D, E, F, G, repeating.",
      },
      {
        kind: "listen",
        caption: "Press play. Notice the second note sitting higher than the first.",
        midis: [60, 67],
      },
      {
        kind: "text",
        body: "Going up in pitch is called ascending; going down is descending. Two notes at the same height are the same pitch, even if one is louder.",
      },
    ],
    checks: [
      {
        id: "ch1-l1-c1",
        conceptId: "pitch-direction",
        question: "You hear two notes. The second is higher than the first. This is called…",
        choices: ["Ascending", "Descending", "Staying the same", "Getting louder"],
        answerIndex: 0,
        explanation: "Ascending means moving to a higher pitch. Loudness is a separate idea — dynamics.",
        hint: "Think about stairs: does the melody climb up or walk down?",
        audio: { midis: [60, 67] },
      },
      {
        id: "ch1-l1-c2",
        conceptId: "pitch-direction",
        question: "Two notes sound at exactly the same height, but the second is louder. What changed?",
        choices: ["The pitch", "The dynamics", "The timbre", "The tempo"],
        answerIndex: 1,
        explanation: "Same height means the same pitch. Only the loudness changed — that's dynamics.",
        hint: "Height is pitch. What word describes how strong or gentle a sound is?",
        audio: { midis: [64, 64] },
      },
    ],
  },
  {
    id: "ch1-l2-dynamics",
    chapterId: "ch1-sound",
    title: "Loud and Soft: Dynamics",
    estimateMinutes: 3,
    learn: [
      {
        kind: "text",
        body: "Dynamics describe how loud or soft music is. Musicians write piano (soft, marked p) and forte (loud, marked f) — Italian words you'll see in every score.",
      },
      {
        kind: "listen",
        caption: "Same pitch, two volumes. First soft, then loud.",
        midis: [62, 62],
      },
      {
        kind: "text",
        body: "A gradual move from soft to loud is a crescendo; loud to soft is a diminuendo. Dynamics shape feeling without changing a single pitch.",
      },
    ],
    checks: [
      {
        id: "ch1-l2-c1",
        conceptId: "dynamics",
        question: "In written music, the marking 'p' (piano) means play…",
        choices: ["Loudly", "Softly", "Faster", "Higher"],
        answerIndex: 1,
        explanation: "Piano means soft. Forte (f) means loud.",
        hint: "Piano starts with p — think of playing something gently.",
      },
      {
        id: "ch1-l2-c2",
        conceptId: "dynamics",
        question: "A passage that grows gradually from soft to loud is called a…",
        choices: ["Diminuendo", "Crescendo", "Staccato", "Fermata"],
        answerIndex: 1,
        explanation: "Crescendo means growing louder. Diminuendo is the opposite.",
        hint: "Crescere is Italian for \"to grow\".",
      },
    ],
  },
  {
    id: "ch1-l3-timbre",
    chapterId: "ch1-sound",
    title: "Tone Color: Timbre",
    estimateMinutes: 3,
    learn: [
      {
        kind: "text",
        body: "Timbre (pronounced TAM-ber) is the color of a sound — what lets you tell a trumpet from a violin playing the same note. Every instrument shapes its overtones differently.",
      },
      {
        kind: "text",
        body: "Try this: hum a note, then sing the same note with an 'ee' vowel. Same pitch, same loudness — but the color changes. That's timbre at work in your own voice.",
      },
      {
        kind: "listen",
        caption: "Same pitch played twice with different tone shapes (sine, then triangle).",
        midis: [65, 65],
      },
    ],
    checks: [
      {
        id: "ch1-l3-c1",
        conceptId: "timbre",
        question: "What lets you tell a piano from a guitar playing the same note at the same volume?",
        choices: ["Pitch", "Dynamics", "Timbre", "Tempo"],
        answerIndex: 2,
        explanation: "Timbre is tone color — the fingerprint of each instrument's sound.",
        hint: "It is the reason you can name the instrument with your eyes closed.",
      },
      {
        id: "ch1-l3-c2",
        conceptId: "timbre",
        question: "Changing the vowel you sing on ('ah' vs 'ee') changes the note's…",
        choices: ["Pitch", "Timbre", "Rhythm", "Key"],
        answerIndex: 1,
        explanation: "The pitch stays put; the vowel reshapes the overtones, so the timbre changes.",
        hint: "The pitch does not move — only the shape of the sound changes.",
      },
    ],
  },
  {
    id: "ch1-l4-pulse",
    chapterId: "ch1-sound",
    title: "Steady Pulse",
    estimateMinutes: 3,
    learn: [
      {
        kind: "text",
        body: "Almost all music moves on a steady pulse — a heartbeat you could tap your foot to. Tempo is the speed of that pulse: fast tempos feel urgent, slow ones feel calm.",
      },
      {
        kind: "listen",
        caption: "Four steady beats. Try tapping along.",
        midis: [60, 60, 60, 60],
        noteDuration: 0.25,
      },
      {
        kind: "text",
        body: "The pulse keeps going even when the melody rests or rushes. Finding it is the first skill of rhythm — everything in chapter 3 builds on this feeling.",
      },
    ],
    checks: [
      {
        id: "ch1-l4-c1",
        conceptId: "pulse",
        question: "The steady heartbeat underneath music that you can tap along to is called the…",
        choices: ["Melody", "Pulse", "Timbre", "Phrase"],
        answerIndex: 1,
        explanation: "The pulse is the underlying beat. Melody rides on top of it.",
        hint: "It is the part you tap your foot to.",
      },
      {
        id: "ch1-l4-c2",
        conceptId: "pulse",
        question: "Tempo describes…",
        choices: ["How loud the music is", "The speed of the pulse", "The instrument playing", "The key of the piece"],
        answerIndex: 1,
        explanation: "Tempo is pulse speed. Loudness is dynamics; the key is tonality.",
        hint: "Largo is slow, presto is fast — both describe this.",
      },
    ],
  },
];

const CHAPTER_2: LessonBody[] = [
  {
    id: "ch2-l1-alphabet",
    chapterId: "ch2-notation",
    title: "The Note Alphabet",
    estimateMinutes: 3,
    tryTask: { kind: "note-id", seed: 21 },
    learn: [
      {
        kind: "text",
        body: "Music names its pitches with only seven letters: A, B, C, D, E, F, G. After G the alphabet starts over at A — each full cycle is called an octave.",
      },
      {
        kind: "listen",
        caption: "The white keys climb the alphabet: C D E F G A B, then C again an octave higher.",
        midis: [60, 62, 64, 65, 67, 69, 71, 72],
        noteDuration: 0.35,
      },
      {
        kind: "visual",
        caption: "The two highlighted keys are both C, one octave apart. Same letter, same color family — different height.",
        visual: { kind: "keyboard", from: 60, to: 72, highlight: [60, 72] },
      },
      {
        kind: "text",
        body: "Octaves get numbers so we can point at an exact note: middle C is C4, the C above it is C5. Say the letter, then the number: D4, G4, B4.",
      },
    ],
    checks: [
      {
        id: "ch2-l1-c1",
        conceptId: "note-alphabet",
        question: "After G, the musical alphabet…",
        choices: ["Starts over at A", "Continues to H", "Stops", "Starts over at C"],
        answerIndex: 0,
        explanation: "Only seven letters, A to G, then the cycle repeats — each cycle is an octave.",
        hint: "How many different letter names do the white keys use?",
        audio: { midis: [67, 69] },
      },
      {
        id: "ch2-l1-c2",
        conceptId: "note-alphabet",
        question: "Middle C is written as…",
        choices: ["C4", "C3", "C5", "C0"],
        answerIndex: 0,
        explanation: "Middle C is C4 — the C nearest the middle of the piano keyboard.",
        hint: "The number 4 marks the middle octave.",
      },
    ],
  },
  {
    id: "ch2-l2-staff",
    chapterId: "ch2-notation",
    title: "The Staff",
    estimateMinutes: 4,
    tryTask: { kind: "self-attempt", seed: 0 },
    learn: [
      {
        kind: "text",
        body: "Written music lives on the staff: five lines and four spaces. Higher on the staff means higher in pitch — the page is a map of high and low.",
      },
      {
        kind: "visual",
        caption: "The treble clef curls around the G line. The lines, bottom to top, are E G B D F.",
        visual: { kind: "staff", clef: "treble", notes: [64, 67, 71, 72, 76], labels: ["E", "G", "B", "D", "F"] },
      },
      {
        kind: "text",
        body: "The spaces spell F A C E — “face”. Lines and spaces together give every white key a home, stepping the alphabet: E F G A B C D E F.",
      },
      {
        kind: "visual",
        caption: "The spaces, bottom to top: F A C E.",
        visual: { kind: "staff", clef: "treble", notes: [65, 69, 72, 77], labels: ["F", "A", "C", "E"] },
      },
    ],
    checks: [
      {
        id: "ch2-l2-c1",
        conceptId: "staff-basics",
        question: "On the treble staff, the bottom line is…",
        choices: ["E", "F", "G", "C"],
        answerIndex: 0,
        explanation: "Lines bottom-to-top: E G B D F.",
        hint: "“Every Good Boy Deserves Fudge” — what is the first word's letter?",
      },
      {
        id: "ch2-l2-c2",
        conceptId: "staff-basics",
        question: "The four spaces of the treble staff spell…",
        choices: ["FACE", "EGBD", "ACEG", "GBDF"],
        answerIndex: 0,
        explanation: "Bottom to top, the spaces are F A C E.",
        hint: "It is an English word you already know.",
      },
    ],
  },
  {
    id: "ch2-l3-landmarks",
    chapterId: "ch2-notation",
    title: "Landmark Notes",
    estimateMinutes: 3,
    tryTask: { kind: "note-id", seed: 23 },
    learn: [
      {
        kind: "text",
        body: "You don't have to count every line. Three landmark notes orient the whole staff: middle C (C4), treble G (G4, the second line), and bass F (F3).",
      },
      {
        kind: "visual",
        caption: "Middle C hangs below the staff on its own little ledger line; G4 sits on the second line, inside the treble clef's curl.",
        visual: { kind: "staff", clef: "treble", notes: [60, 67], labels: ["C4", "G4"] },
      },
      {
        kind: "text",
        body: "Find a landmark, then walk the alphabet up or down to any neighbor. G4 is home base for the treble staff — one step up is A4, one step down is F4.",
      },
      {
        kind: "listen",
        caption: "Middle C, then treble G: two landmarks, a fifth apart.",
        midis: [60, 67],
      },
    ],
    checks: [
      {
        id: "ch2-l3-c1",
        conceptId: "landmark-notes",
        question: "Treble G — the note the treble clef curls around — is…",
        choices: ["G4", "G3", "G5", "C4"],
        answerIndex: 0,
        explanation: "The treble clef's inner curl circles the second line: G4.",
        hint: "It lives in the same octave as middle C.",
      },
      {
        id: "ch2-l3-c2",
        conceptId: "landmark-notes",
        question: "One alphabet step above G4 is…",
        choices: ["A4", "F4", "G5", "B4"],
        answerIndex: 0,
        explanation: "Walk the alphabet: …F, G, A… so one step up from G4 is A4.",
        hint: "Say it: F G A — what comes after G?",
      },
    ],
  },
  {
    id: "ch2-l4-accidentals",
    chapterId: "ch2-notation",
    title: "Semitones and Accidentals",
    estimateMinutes: 4,
    tryTask: { kind: "compare-pitch", seed: 24 },
    learn: [
      {
        kind: "text",
        body: "The smallest step in Western music is the semitone — one key to the very next, white or black. E to F is a semitone; so is B to C.",
      },
      {
        kind: "listen",
        caption: "C to C-sharp: the smallest possible step up.",
        midis: [60, 61],
        noteDuration: 0.4,
      },
      {
        kind: "text",
        body: "A sharp (♯) raises a note one semitone; a flat (♭) lowers it one semitone. A natural (♮) cancels them, back to the white key.",
      },
      {
        kind: "visual",
        caption: "C-sharp is the black key just above C — one semitone higher.",
        visual: { kind: "keyboard", from: 60, to: 64, highlight: [60, 61] },
      },
    ],
    checks: [
      {
        id: "ch2-l4-c1",
        conceptId: "accidentals",
        question: "A sharp sign (♯) tells the player to…",
        choices: ["Play one semitone higher", "Play one semitone lower", "Play twice as loud", "Hold the note longer"],
        answerIndex: 0,
        explanation: "Sharp = up one semitone. Flat = down one semitone.",
        hint: "Think of a sharp point aiming upward.",
        audio: { midis: [60, 61] },
      },
      {
        id: "ch2-l4-c2",
        conceptId: "accidentals",
        question: "E to F is…",
        choices: ["A semitone", "A whole tone", "An octave", "A third"],
        answerIndex: 0,
        explanation: "E and F are neighbors with no black key between — one semitone.",
        hint: "Is there a black key between E and F on the piano?",
      },
    ],
  },
];

const AUTHORED = new Map<string, LessonBody>(
  [...CHAPTER_1, ...CHAPTER_2].map((l) => [l.id, l]),
);

/** Authored body for a lesson, or undefined when not yet written. */
export function lessonBody(lessonId: string): LessonBody | undefined {
  return AUTHORED.get(lessonId);
}

/** All authored (playable) lessons. */
export function authoredLessons(): LessonBody[] {
  return [...AUTHORED.values()];
}

/** Validate content structure: unique stable IDs, exactly 2 checks per authored lesson. */
export function validateContent(): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const ch of CHAPTERS) {
    for (const l of ch.lessons) {
      if (seen.has(l.id)) errors.push(`Duplicate lesson id: ${l.id}`);
      seen.add(l.id);
    }
  }
  for (const body of AUTHORED.values()) {
    if (body.checks.length !== 2) errors.push(`${body.id}: expected 2 checks, found ${body.checks.length}`);
    const checkIds = new Set<string>();
    for (const c of body.checks) {
      if (seen.has(c.id)) errors.push(`Duplicate check id: ${c.id}`);
      seen.add(c.id);
      checkIds.add(c.id);
      if (c.answerIndex < 0 || c.answerIndex >= c.choices.length)
        errors.push(`${c.id}: answerIndex out of range`);
    }
    if (!lessonMeta(body.id)) errors.push(`${body.id}: no registry entry`);
  }
  return errors;
}
