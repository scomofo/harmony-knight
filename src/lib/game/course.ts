/**
 * Curriculum content contracts.
 * - Every chapter, lesson, check, task, and concept has a stable string ID
 *   that is never reused or reordered semantically (deep links + saves).
 * - The registry lists all 11 chapters x 4 lessons. Bodies are authored per
 *   chapter; only authored lessons are playable.
 */

export type LearnBlock =
  | { kind: "text"; body: string }
  | { kind: "listen"; caption: string; midis: number[]; noteDuration?: number; durations?: number[] }
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
  audio?: { midis: number[]; labels?: string[]; durations?: number[] };
};

import type { TaskKind } from "./tasks.ts";

/** Authored task reference: deterministic per kind+seed. */
export type TaskSpec = { kind: TaskKind; seed: number; prompt?: string; variant?: string };

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

const CHAPTER_3: LessonBody[] = [
  {
    id: "ch3-l1-durations",
    chapterId: "ch3-rhythm",
    title: "Note Durations",
    estimateMinutes: 4,
    tryTask: { kind: "rhythm-echo", seed: 31 },
    learn: [
      {
        kind: "text",
        body: "Notes have lengths as well as pitches. A whole note lasts four beats, a half note two beats, a quarter note one beat, and an eighth note half a beat. Same pitch, different lengths — different music.",
      },
      {
        kind: "listen",
        caption: "Four quarters (1 1 1 1), then a half (2), then a whole (4) — count along.",
        midis: [60, 60, 60, 60, 62, 64],
        durations: [0.45, 0.45, 0.45, 0.45, 0.9, 1.8],
      },
      {
        kind: "text",
        body: "Two eighth notes fit inside one beat — that is why they are often beamed together in pairs. Count “1-and-2-and” and clap: every syllable is an eighth note.",
      },
      {
        kind: "listen",
        caption: "Eight eighth notes: 1-and-2-and-3-and-4-and.",
        midis: [60, 60, 60, 60, 60, 60, 60, 60],
        durations: [0.225, 0.225, 0.225, 0.225, 0.225, 0.225, 0.225, 0.225],
      },
    ],
    checks: [
      {
        id: "ch3-l1-c1",
        conceptId: "note-durations",
        question: "A half note lasts…",
        choices: ["Two beats", "One beat", "Four beats", "Half a beat"],
        answerIndex: 0,
        explanation: "Whole = 4, half = 2, quarter = 1, eighth = 1/2.",
        hint: "Half of a whole note's four beats is…",
      },
      {
        id: "ch3-l1-c2",
        conceptId: "note-durations",
        question: "How many eighth notes fit in one beat?",
        choices: ["Two", "One", "Four", "Eight"],
        answerIndex: 0,
        explanation: "An eighth note is half a beat, so two of them fill one beat.",
        hint: "“1-and” — how many sounds is that?",
      },
    ],
  },
  {
    id: "ch3-l2-meter",
    chapterId: "ch3-rhythm",
    title: "Simple and Compound Meter",
    estimateMinutes: 4,
    tryTask: { kind: "rhythm-echo", seed: 32 },
    learn: [
      {
        kind: "text",
        body: "Meter is how beats group together. The top number of a time signature tells you how many beats per bar: 4/4 means four quarter-note beats in every bar; 3/4 means three.",
      },
      {
        kind: "listen",
        caption: "4/4: four beats per bar. Feel the first beat as home base.",
        midis: [60, 60, 60, 60],
        durations: [0.5, 0.5, 0.5, 0.5],
      },
      {
        kind: "text",
        body: "In 6/8, beats group in threes: two big beats, each splitting into three eighth notes. Count “1-2-3, 4-5-6” — that rolling, lilting feel is compound meter.",
      },
      {
        kind: "listen",
        caption: "6/8: two groups of three eighth notes — 1-2-3, 4-5-6.",
        midis: [60, 60, 60, 60, 60, 60],
        durations: [0.3, 0.3, 0.3, 0.3, 0.3, 0.3],
      },
    ],
    checks: [
      {
        id: "ch3-l2-c1",
        conceptId: "meter",
        question: "In 4/4 time, each bar holds…",
        choices: ["Four quarter-note beats", "Four eighth-note beats", "Three quarter-note beats", "Two half-note beats"],
        answerIndex: 0,
        explanation: "Top number = 4 beats; bottom number = the quarter note gets each beat.",
        hint: "The top number counts the beats in every bar.",
      },
      {
        id: "ch3-l2-c2",
        conceptId: "meter",
        question: "6/8 is called compound meter because its beats…",
        choices: ["Split into three", "Split into two", "Are all accented", "Are silent"],
        answerIndex: 0,
        explanation: "In 6/8 each big beat divides into three eighth notes.",
        hint: "Count it: 1-2-3, 4-5-6 — how many small parts per big beat?",
      },
    ],
  },
  {
    id: "ch3-l3-dots",
    chapterId: "ch3-rhythm",
    title: "Dots",
    estimateMinutes: 3,
    tryTask: { kind: "rhythm-echo", seed: 33 },
    learn: [
      {
        kind: "text",
        body: "A dot after a note lengthens it by half its value. A dotted half note = half note + quarter = three beats. A dotted quarter = quarter + eighth = one and a half beats.",
      },
      {
        kind: "listen",
        caption: "Dotted quarter then eighth: long-short, long-short.",
        midis: [60, 60, 60, 60],
        durations: [0.675, 0.225, 0.675, 0.225],
      },
      {
        kind: "text",
        body: "That long-short snap drives marches, anthems, and pop hooks. Lean into the long note, then take the quick step after it.",
      },
      {
        kind: "listen",
        caption: "A dotted half note: three full beats on a single pitch.",
        midis: [64],
        durations: [1.35],
      },
    ],
    checks: [
      {
        id: "ch3-l3-c1",
        conceptId: "dotted-rhythm",
        question: "A dot adds to a note's length…",
        choices: ["Half its value again", "Double its value", "One extra beat", "Nothing — it is decoration"],
        answerIndex: 0,
        explanation: "Dot = +50%: a dotted half note is 2 + 1 = 3 beats.",
        hint: "A dotted half note lasts three beats. A plain half note lasts two. What did the dot add?",
      },
      {
        id: "ch3-l3-c2",
        conceptId: "dotted-rhythm",
        question: "A dotted quarter note lasts…",
        choices: ["One and a half beats", "Two beats", "Three beats", "Half a beat"],
        answerIndex: 0,
        explanation: "Quarter (1) + eighth (0.5) = 1.5 beats.",
        hint: "A quarter plus half a quarter is…",
      },
    ],
  },
  {
    id: "ch3-l4-rests",
    chapterId: "ch3-rhythm",
    title: "Rests, Ties, Syncopation",
    estimateMinutes: 4,
    tryTask: { kind: "rhythm-echo", seed: 34 },
    learn: [
      {
        kind: "text",
        body: "Silence is written too. Every note value has a matching rest: whole rest, half rest, quarter rest, eighth rest. Music breathes in the gaps between sounds.",
      },
      {
        kind: "listen",
        caption: "Quarter, quarter rest, quarter, quarter — hear the silence land exactly on its beat.",
        midis: [60, -1, 62, 64],
        durations: [0.45, 0.45, 0.45, 0.45],
      },
      {
        kind: "text",
        body: "A tie joins two notes into one longer sound — the second note is not re-struck. Two tied quarters sound exactly like one half note.",
      },
      {
        kind: "text",
        body: "Syncopation stresses the off-beat — the “and” between counts. It surprises the foot and makes music dance. Clap on “and” instead of the numbers: that is syncopation.",
      },
    ],
    checks: [
      {
        id: "ch3-l4-c1",
        conceptId: "rhythm-symbols",
        question: "A quarter rest means…",
        choices: ["One beat of silence", "One beat of sound", "Four beats of silence", "Play quietly"],
        answerIndex: 0,
        explanation: "Rests mirror note values: a quarter rest silences exactly one beat.",
        hint: "Match the rest to its note — a quarter note lasts one beat, so a quarter rest…",
      },
      {
        id: "ch3-l4-c2",
        conceptId: "rhythm-symbols",
        question: "Two quarter notes joined by a tie sound like…",
        choices: ["One half note", "Two separate quarters", "One whole note", "One eighth note"],
        answerIndex: 0,
        explanation: "A tie merges durations without re-striking: 1 + 1 = 2 beats.",
        hint: "Add the two quarters together — but the second one is never played again.",
      },
    ],
  },
];

const CHAPTER_4: LessonBody[] = [
  {
    id: "ch4-l1-major",
    chapterId: "ch4-tonality",
    title: "Major Scales",
    estimateMinutes: 4,
    tryTask: { kind: "scale-id", seed: 41 },
    learn: [
      {
        kind: "text",
        body: "A major scale is the familiar do-re-mi: whole-whole-half-whole-whole-whole-half. From C it is simply the white keys in order: C D E F G A B C.",
      },
      {
        kind: "listen",
        caption: "C major, ascending: do re mi fa sol la ti do.",
        midis: [60, 62, 64, 65, 67, 69, 71, 72],
        noteDuration: 0.4,
      },
      {
        kind: "text",
        body: "Start on any note and follow the same whole/half pattern to build that key's major scale. G major: G A B C D E F# G — the pattern forces one sharp.",
      },
      {
        kind: "listen",
        caption: "G major: the same pattern, one sharp (F#).",
        midis: [67, 69, 71, 72, 74, 76, 78, 79],
        noteDuration: 0.4,
      },
    ],
    checks: [
      {
        id: "ch4-l1-c1",
        conceptId: "major-scale",
        question: "The major scale pattern of whole (W) and half (H) steps is…",
        choices: ["W W H W W W H", "W H W W H W W", "H W W H W W W", "W W W H W W H"],
        answerIndex: 0,
        explanation: "Whole-whole-half-whole-whole-whole-half — sing do-re-mi and feel the half steps tuck in at mi-fa and ti-do.",
        hint: "Where are the half steps? Between mi-fa and ti-do.",
      },
      {
        id: "ch4-l1-c2",
        conceptId: "major-scale",
        question: "G major has…",
        choices: ["One sharp (F#)", "One flat (Bb)", "Two sharps", "No sharps or flats"],
        answerIndex: 0,
        explanation: "Walk WWHWWWH up from G: G A B C D E F# G — the seventh step must be F#.",
        hint: "Walk the pattern up from G and watch what happens at the seventh step.",
        audio: { midis: [67, 69, 71, 72, 74, 76, 78, 79] },
      },
    ],
  },
  {
    id: "ch4-l2-signatures",
    chapterId: "ch4-tonality",
    title: "Key Signatures",
    estimateMinutes: 4,
    tryTask: {
      kind: "self-attempt",
      seed: 0,
      prompt:
        "On paper (or in your head), write the order of sharps, then the key signatures for G, D, A, F, and Bb major from memory. Check yourself against the lesson — then mark this done. Honest recall is the whole exercise.",
    },
    learn: [
      {
        kind: "text",
        body: "A key signature — the sharps or flats printed at the start of every staff — names the key at a glance, so accidentals don't clutter every bar.",
      },
      {
        kind: "text",
        body: "Sharps always arrive in the same order: F# C# G# D# A# E# B#. Flats mirror it: Bb Eb Ab Db Gb Cb Fb. Memorize the two orders and every signature follows.",
      },
      {
        kind: "listen",
        caption: "D major scale: two sharps (F#, C#).",
        midis: [62, 64, 66, 67, 69, 71, 73, 74],
        noteDuration: 0.4,
      },
      {
        kind: "text",
        body: "One sharp = G major, two = D major, three = A major… One flat = F major, two = Bb major. And a shortcut: the last sharp in a signature is ti — one half-step below do.",
      },
    ],
    checks: [
      {
        id: "ch4-l2-c1",
        conceptId: "key-signatures",
        question: "The order in which sharps appear in key signatures is…",
        choices: ["F# C# G# D#…", "Bb Eb Ab Db…", "C# F# G# D#…", "G# D# A# E#…"],
        answerIndex: 0,
        explanation: "“Father Charles Goes Down And Ends Battle”: F# C# G# D# A# E# B#.",
        hint: "Think “Father Charles” — what letter does “Father” start with?",
      },
      {
        id: "ch4-l2-c2",
        conceptId: "key-signatures",
        question: "Two flats in the key signature means the key is…",
        choices: ["Bb major", "Eb major", "F major", "Ab major"],
        answerIndex: 0,
        explanation: "One flat = F major, two flats = Bb major, three = Eb major…",
        hint: "Count through the flat order: Bb first, then…",
      },
    ],
  },
  {
    id: "ch4-l3-circle",
    chapterId: "ch4-tonality",
    title: "Circle of Fifths",
    estimateMinutes: 4,
    tryTask: { kind: "scale-id", seed: 43 },
    learn: [
      {
        kind: "text",
        body: "The circle of fifths arranges all twelve keys in a ring: each step clockwise climbs a perfect fifth and adds one sharp; each step counterclockwise adds one flat.",
      },
      {
        kind: "text",
        body: "C sits at the top with no sharps or flats. Clockwise: G (1#), D (2#), A (3#)… Counterclockwise: F (1b), Bb (2b), Eb (3b)…",
      },
      {
        kind: "listen",
        caption: "The sharp side, climbing by fifths: C → G → D → A.",
        midis: [60, 67, 62, 69],
        noteDuration: 0.5,
      },
      {
        kind: "text",
        body: "Neighboring keys on the circle share almost all their notes, so closely-related keys sound close. Jump across the circle and the new key feels far away.",
      },
    ],
    checks: [
      {
        id: "ch4-l3-c1",
        conceptId: "circle-of-fifths",
        question: "Moving one step clockwise around the circle of fifths…",
        choices: ["Adds one sharp", "Adds one flat", "Removes one sharp", "Changes nothing"],
        answerIndex: 0,
        explanation: "Clockwise = up a perfect fifth = one more sharp (or one fewer flat).",
        hint: "Clockwise climbs — sharps pile up as you go around.",
      },
      {
        id: "ch4-l3-c2",
        conceptId: "circle-of-fifths",
        question: "The key a perfect fifth above D major is…",
        choices: ["A major", "G major", "E major", "C major"],
        answerIndex: 0,
        explanation: "D → A is a fifth up; A major carries three sharps.",
        hint: "Count five scale steps up from D: D E F# G A.",
      },
    ],
  },
  {
    id: "ch4-l4-minor",
    chapterId: "ch4-tonality",
    title: "Natural, Harmonic, Melodic Minor",
    estimateMinutes: 4,
    tryTask: { kind: "scale-id", seed: 44 },
    learn: [
      {
        kind: "text",
        body: "Every major key has a relative minor sharing its key signature — find la, the sixth degree. A minor shares C major's empty signature.",
      },
      {
        kind: "listen",
        caption: "A natural minor: A B C D E F G A — the same notes as C major, but A is home.",
        midis: [69, 71, 72, 74, 76, 77, 79, 81],
        noteDuration: 0.4,
      },
      {
        kind: "text",
        body: "Harmonic minor raises the seventh for a stronger pull home — G# in A minor, with an exotic leap as its fingerprint. Melodic minor raises the sixth and seventh ascending, then falls back to natural minor descending.",
      },
      {
        kind: "listen",
        caption: "A harmonic minor: hear the raised seventh (G#) lean into A.",
        midis: [69, 71, 72, 74, 76, 77, 80, 81],
        noteDuration: 0.4,
      },
    ],
    checks: [
      {
        id: "ch4-l4-c1",
        conceptId: "minor-scales",
        question: "The relative minor of C major is…",
        choices: ["A minor", "E minor", "G minor", "D minor"],
        answerIndex: 0,
        explanation: "Count to the sixth degree of C major: C(1) D(2) E(3) F(4) G(5) A(6).",
        hint: "La — the sixth note of do-re-mi.",
      },
      {
        id: "ch4-l4-c2",
        conceptId: "minor-scales",
        question: "Harmonic minor differs from natural minor by…",
        choices: ["A raised seventh", "A lowered third", "A raised fourth", "Two extra notes"],
        answerIndex: 0,
        explanation: "Raising the seventh builds a leading tone with a strong pull back to the tonic.",
        hint: "Which change gives minor its “exotic” leading-tone pull home?",
        audio: { midis: [69, 71, 72, 74, 76, 77, 80, 81] },
      },
    ],
  },
];

const CHAPTER_5: LessonBody[] = [
  {
    id: "ch5-l1-intervals",
    chapterId: "ch5-chords",
    title: "Intervals",
    estimateMinutes: 4,
    tryTask: { kind: "interval-id", seed: 51 },
    learn: [
      {
        kind: "text",
        body: "An interval is the distance between two pitches. We count letter names: C to E is a third (C-D-E), C to G is a fifth (C-D-E-F-G).",
      },
      {
        kind: "listen",
        caption: "A third (C–E), then a fifth (C–G), then an octave (C–C).",
        midis: [60, 64, 60, 67, 60, 72],
        noteDuration: 0.5,
      },
      {
        kind: "text",
        body: "Intervals have qualities too: thirds and sixths come in major (bright) and minor (tender) flavors, while unisons, fourths, fifths, and octaves are called perfect.",
      },
      {
        kind: "visual",
        caption: "C, E, G, C: the third, fifth, and octave above C.",
        visual: { kind: "keyboard", from: 60, to: 72, highlight: [60, 64, 67, 72] },
      },
    ],
    checks: [
      {
        id: "ch5-l1-c1",
        conceptId: "intervals",
        question: "C up to G is a…",
        choices: ["Fifth", "Third", "Sixth", "Octave"],
        answerIndex: 0,
        explanation: "Count the letters: C(1) D(2) E(3) F(4) G(5).",
        hint: "Count the letter names from C to G, including both ends.",
      },
      {
        id: "ch5-l1-c2",
        conceptId: "intervals",
        question: "Which interval is called “perfect”?",
        choices: ["The fifth", "The third", "The sixth", "The second"],
        answerIndex: 0,
        explanation: "Unisons, fourths, fifths, and octaves are perfect; 2nds, 3rds, 6ths, and 7ths come in major/minor.",
        hint: "It is the one that sounds most hollow and settled — neither major nor minor.",
      },
    ],
  },
  {
    id: "ch5-l2-consonance",
    chapterId: "ch5-chords",
    title: "Consonance and Tension",
    estimateMinutes: 4,
    tryTask: {
      kind: "self-attempt",
      seed: 0,
      prompt:
        "At your instrument (or in your head), play a major third, then a minor second. Sit with each: one feels like home, the other like it wants to move. Then resolve the tense one into the stable one. When you've felt the difference, mark this done.",
    },
    learn: [
      {
        kind: "text",
        body: "Some intervals sound stable and restful — consonant. Others sound tense, as if they want to move — dissonant. Thirds and sixths are sweet; seconds and sevenths bite.",
      },
      {
        kind: "listen",
        caption: "A major third (stable), then a minor second (tense).",
        midis: [60, 64, 60, 61],
        noteDuration: 0.6,
      },
      {
        kind: "text",
        body: "Dissonance is not bad — it is narrative. Tension asks a question; consonance answers it. Every great melody spends tension and earns rest.",
      },
      {
        kind: "listen",
        caption: "Tension resolving to rest: a minor second melting into a major third.",
        midis: [60, 61, 60, 64],
        durations: [0.5, 0.5, 0.5, 0.9],
      },
    ],
    checks: [
      {
        id: "ch5-l2-c1",
        conceptId: "consonance",
        question: "A minor second sounds…",
        choices: ["Tense and unstable", "Sweet and restful", "Exactly like a third", "Silent"],
        answerIndex: 0,
        explanation: "Seconds (and sevenths) are the most dissonant intervals — they itch to resolve.",
        hint: "Imagine C and C# together — restful or itchy?",
        audio: { midis: [60, 61] },
      },
      {
        id: "ch5-l2-c2",
        conceptId: "consonance",
        question: "In music, dissonance is…",
        choices: ["Tension that wants to resolve", "A mistake", "The same as silence", "Only for experts"],
        answerIndex: 0,
        explanation: "Dissonance creates the narrative pull that makes consonance satisfying.",
        hint: "Stories need conflict — what does tension do in music?",
      },
    ],
  },
  {
    id: "ch5-l3-triads",
    chapterId: "ch5-chords",
    title: "Triad Qualities",
    estimateMinutes: 4,
    tryTask: { kind: "chord-id", seed: 53, variant: "quality" },
    learn: [
      {
        kind: "text",
        body: "Stack two thirds and you get a triad — the basic chord. C-E-G: a major third plus a minor third makes a major triad, bright and sturdy.",
      },
      {
        kind: "listen",
        caption: "C major triad, arpeggiated: C E G.",
        midis: [60, 64, 67],
        durations: [0.4, 0.4, 0.9],
      },
      {
        kind: "text",
        body: "Flip the thirds — minor third plus major third — and the triad turns minor: C-Eb-G. Same outer frame (the fifth), darker color (the third).",
      },
      {
        kind: "listen",
        caption: "C minor triad: C Eb G — hear the third darken.",
        midis: [60, 63, 67],
        durations: [0.4, 0.4, 0.9],
      },
    ],
    checks: [
      {
        id: "ch5-l3-c1",
        conceptId: "triad-qualities",
        question: "A major triad is built from…",
        choices: ["A major third + a minor third", "A minor third + a major third", "Two major thirds", "Two minor thirds"],
        answerIndex: 0,
        explanation: "C–E (major 3rd) + E–G (minor 3rd) = C major triad.",
        hint: "The bottom third decides: a bright bottom third makes a major triad.",
      },
      {
        id: "ch5-l3-c2",
        conceptId: "triad-qualities",
        question: "C minor differs from C major by…",
        choices: ["One note: Eb instead of E", "One note: Gb instead of G", "Two notes", "Nothing — they are the same"],
        answerIndex: 0,
        explanation: "Only the third changes: E becomes Eb. Root and fifth stay put.",
        hint: "Which member of the triad carries its major/minor color?",
        audio: { midis: [60, 63, 67] },
      },
    ],
  },
  {
    id: "ch5-l4-inversions",
    chapterId: "ch5-chords",
    title: "Inversions",
    estimateMinutes: 4,
    tryTask: { kind: "chord-id", seed: 54, variant: "position" },
    learn: [
      {
        kind: "text",
        body: "A triad's notes can be reordered — that is an inversion. C-E-G with E in the bass is first inversion; with G in the bass, second inversion. Same chord, new color.",
      },
      {
        kind: "listen",
        caption: "C major: root position, first inversion, second inversion — same notes, different bass.",
        midis: [60, 64, 67, 64, 67, 72, 67, 72, 76],
        durations: [0.35, 0.35, 0.7, 0.35, 0.35, 0.7, 0.35, 0.35, 0.9],
      },
      {
        kind: "text",
        body: "The bass note colors the inversion: the root in the bass sounds sturdy, the third lyrical, the fifth open and floating.",
      },
      {
        kind: "text",
        body: "Composers invert chords to smooth the bass line — stepwise motion instead of leaps. When you listen for the bass, you hear which inversion you're in.",
      },
    ],
    checks: [
      {
        id: "ch5-l4-c1",
        conceptId: "triad-inversions",
        question: "A C major triad with E as the lowest note is in…",
        choices: ["First inversion", "Root position", "Second inversion", "There is no such thing"],
        answerIndex: 0,
        explanation: "Third in the bass = first inversion; fifth in the bass = second inversion.",
        hint: "The third of the chord is at the bottom — which inversion puts the third there?",
      },
      {
        id: "ch5-l4-c2",
        conceptId: "triad-inversions",
        question: "Why do composers invert triads?",
        choices: ["To smooth the bass line", "To make chords louder", "To change the key", "To add more notes"],
        answerIndex: 0,
        explanation: "Inversions let the bass walk stepwise instead of leaping from root to root.",
        hint: "Think about the bass singer's part — steps or leaps?",
      },
    ],
  },
];

const CHAPTER_6: LessonBody[] = [
  {
    id: "ch6-l1-numerals",
    chapterId: "ch6-phrases",
    title: "Roman Numerals",
    estimateMinutes: 4,
    tryTask: {
      kind: "self-attempt",
      seed: 0,
      prompt:
        "On paper, write the seven diatonic triads of G major with their roman numerals: I, ii, iii, IV, V, vi, vii°. Remember — uppercase for major, lowercase for minor. Check yourself against the lesson, then mark this done.",
    },
    learn: [
      {
        kind: "text",
        body: "Roman numerals name chords by scale degree. In C major: C is I, Dm is ii, Em is iii, F is IV, G is V, Am is vi, Bdim is vii°. Uppercase = major, lowercase = minor.",
      },
      {
        kind: "text",
        body: "This system travels: I–IV–V means the same relationship in every key. Learn the pattern once, play it everywhere.",
      },
      {
        kind: "listen",
        caption: "I–IV–V in C: C, F, G triads, arpeggiated.",
        midis: [60, 64, 67, 65, 69, 72, 67, 71, 74],
        durations: [0.3, 0.3, 0.7, 0.3, 0.3, 0.7, 0.3, 0.3, 0.9],
      },
      {
        kind: "text",
        body: "The three majors — I, IV, V — carry most songs. The three minors — ii, iii, vi — add color. The vii° is the spice: tense, rare, and pointed.",
      },
    ],
    checks: [
      {
        id: "ch6-l1-c1",
        conceptId: "roman-numerals",
        question: "In C major, the V chord is…",
        choices: ["G major", "F major", "A minor", "C major"],
        answerIndex: 0,
        explanation: "Count up five: C(1) D(2) E(3) F(4) G(5) — and V is always major.",
        hint: "Walk up five scale steps from C.",
      },
      {
        id: "ch6-l1-c2",
        conceptId: "roman-numerals",
        question: "Lowercase roman numerals mean the chord is…",
        choices: ["Minor", "Major", "Diminished", "Out of tune"],
        answerIndex: 0,
        explanation: "Uppercase = major (I, IV, V); lowercase = minor (ii, iii, vi); vii° takes the degree sign.",
        hint: "Case carries quality — which case marks the minor chords?",
      },
    ],
  },
  {
    id: "ch6-l2-cadences",
    chapterId: "ch6-phrases",
    title: "Authentic and Plagal Cadences",
    estimateMinutes: 4,
    tryTask: { kind: "cadence-id", seed: 62, variant: "final" },
    learn: [
      {
        kind: "text",
        body: "A cadence is chordal punctuation. V–I is the authentic cadence — the period at the end of the sentence: decisive, final, home.",
      },
      {
        kind: "listen",
        caption: "Authentic cadence: V–I in C (G → C).",
        midis: [67, 71, 74, 60, 64, 67],
        durations: [0.3, 0.3, 0.8, 0.4, 0.4, 1.1],
      },
      {
        kind: "text",
        body: "IV–I is the plagal cadence — the “Amen” ending. Gentler and warmer: a benediction rather than a decree.",
      },
      {
        kind: "listen",
        caption: "Plagal cadence: IV–I in C (F → C).",
        midis: [65, 69, 72, 60, 64, 67],
        durations: [0.3, 0.3, 0.8, 0.4, 0.4, 1.1],
      },
    ],
    checks: [
      {
        id: "ch6-l2-c1",
        conceptId: "cadences",
        question: "An authentic cadence is…",
        choices: ["V–I", "IV–I", "I–V", "ii–V"],
        answerIndex: 0,
        explanation: "The dominant driving to the tonic is the strongest close in tonal music.",
        hint: "Which chord most wants to resolve home? That is the dominant.",
        audio: { midis: [67, 71, 74, 60, 64, 67], durations: [0.3, 0.3, 0.8, 0.4, 0.4, 1.1] },
      },
      {
        id: "ch6-l2-c2",
        conceptId: "cadences",
        question: "The plagal cadence (IV–I) is nicknamed…",
        choices: ["The “Amen” cadence", "The “question” cadence", "The “wrong-note” cadence", "The “jazz” cadence"],
        answerIndex: 0,
        explanation: "Its gentle warmth closes hymns — “a-men” sung over IV–I.",
        hint: "Think of the end of a hymn.",
      },
    ],
  },
  {
    id: "ch6-l3-open",
    chapterId: "ch6-phrases",
    title: "Open Endings",
    estimateMinutes: 4,
    tryTask: { kind: "cadence-id", seed: 63, variant: "open" },
    learn: [
      {
        kind: "text",
        body: "Not every phrase ends at home. A half cadence lands on V — the dominant — leaving the sentence unfinished, leaning forward into whatever comes next.",
      },
      {
        kind: "listen",
        caption: "Half cadence: I–V in C — the phrase stays open.",
        midis: [60, 64, 67, 67, 71, 74],
        durations: [0.3, 0.3, 0.8, 0.4, 0.4, 1.1],
      },
      {
        kind: "text",
        body: "Landing on I feels like arriving; landing on V feels like pausing mid-thought. Composers spend open endings to pull you into the next phrase.",
      },
      {
        kind: "listen",
        caption: "Closed ending for contrast: I–V–I — open, then home.",
        midis: [60, 64, 67, 67, 71, 74, 60, 64, 67],
        durations: [0.3, 0.3, 0.6, 0.3, 0.3, 0.6, 0.4, 0.4, 1.1],
      },
    ],
    checks: [
      {
        id: "ch6-l3-c1",
        conceptId: "open-endings",
        question: "A half cadence ends on…",
        choices: ["V", "I", "IV", "vi"],
        answerIndex: 0,
        explanation: "Landing on the dominant leaves tension unresolved — the phrase stays open.",
        hint: "Which chord leans forward instead of arriving?",
        audio: { midis: [60, 64, 67, 67, 71, 74], durations: [0.3, 0.3, 0.8, 0.4, 0.4, 1.1] },
      },
      {
        id: "ch6-l3-c2",
        conceptId: "open-endings",
        question: "An open ending makes the listener…",
        choices: ["Want the next phrase", "Fall asleep", "Forget the key", "Stop listening"],
        answerIndex: 0,
        explanation: "Unresolved tension is a question; the next phrase is the answer.",
        hint: "What does an unfinished sentence make you want?",
      },
    ],
  },
  {
    id: "ch6-l4-melody",
    chapterId: "ch6-phrases",
    title: "Melody Over Chords",
    estimateMinutes: 4,
    tryTask: {
      kind: "self-attempt",
      seed: 0,
      prompt:
        "Hum or play a short four-note melody over a C major triad. First land on a chord tone (C, E, or G) and feel how settled it is — then try landing on a non-chord tone and feel the difference. Mark this done when you've tried both.",
    },
    learn: [
      {
        kind: "text",
        body: "Melody floats on harmony: chord tones — the notes of the current chord — sound settled; other scale notes add passing color.",
      },
      {
        kind: "text",
        body: "Over a C chord, C, E, and G feel like home. D and F lean toward them — gentle tension you can spend by resolving.",
      },
      {
        kind: "listen",
        caption: "C major chord tones: C E G — the safe landing notes.",
        midis: [60, 64, 67],
        durations: [0.4, 0.4, 0.9],
      },
      {
        kind: "text",
        body: "Great melodies mix both: land on chord tones, travel on the rest. That balance is what makes a tune singable and alive.",
      },
    ],
    checks: [
      {
        id: "ch6-l4-c1",
        conceptId: "melody-over-chords",
        question: "Over a C major chord, which notes sound most settled?",
        choices: ["C, E, G", "D, F, A", "F#, C#, G#", "Any notes at random"],
        answerIndex: 0,
        explanation: "Chord tones always agree with the harmony underneath.",
        hint: "Which notes spell the C major triad?",
      },
      {
        id: "ch6-l4-c2",
        conceptId: "melody-over-chords",
        question: "Non-chord scale tones in a melody mostly…",
        choices: ["Add passing color between chord tones", "Ruin the song", "Change the key", "Do nothing at all"],
        answerIndex: 0,
        explanation: "They create gentle tension that resolves when the melody lands on a chord tone.",
        hint: "Travel notes versus landing notes — what is the traveling for?",
      },
    ],
  },
];

const AUTHORED = new Map<string, LessonBody>(
  [...CHAPTER_1, ...CHAPTER_2, ...CHAPTER_3, ...CHAPTER_4, ...CHAPTER_5, ...CHAPTER_6].map((l) => [l.id, l]),
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
