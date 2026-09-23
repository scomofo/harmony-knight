/**
 * Game curriculum: 11 grades (0-10) across three phases.
 * Grades are an OPTIONAL progression layer: rolling windows of relevant
 * practice answers at 80-92% accuracy unlock drills and game status.
 * Teaching content is never gated by grade.
 */

export type CurriculumPhase = "foundation" | "intermediate" | "advanced";

export type AppRoute =
  | "/practice"
  | "/strike"
  | "/duel"
  | "/curriculum"
  | "/circle"
  | "/rhythm"
  | "/scale"
  | "/interval"
  | "/triad"
  | "/cadence"
  | "/sensory"
  | "/heatmap";

export type TopicId =
  | "sensory"
  | "note-reading"
  | "rhythm"
  | "keys"
  | "scales"
  | "intervals"
  | "triads"
  | "harmony"
  | "modulation"
  | "duel"
  | "strike";

export type CurriculumLevel = {
  level: number;
  title: string;
  subtitle: string;
  phase: CurriculumPhase;
  objectives: string[];
  narrativeTheme: string;
  /** The main drill for this level. */
  route: AppRoute;
  drillLabel: string;
  /** Topics whose answers count toward the grade trial for this level. */
  topics: TopicId[];
  /** Study screens that open once this level is reached. */
  unlocks: { to: AppRoute; label: string }[];
};

export const CURRICULUM: CurriculumLevel[] = [
  {
    level: 0,
    title: "The Sensory Entry Point",
    subtitle: "Sound Before Sight",
    phase: "foundation",
    objectives: ["High vs. low pitch", "Loud vs. soft dynamics", "Timbre recognition"],
    narrativeTheme: "Awakening — the knight discovers sound.",
    route: "/sensory",
    drillLabel: "Listening",
    topics: ["sensory", "note-reading"],
    unlocks: [{ to: "/sensory", label: "Listening" }],
  },
  {
    level: 1,
    title: "The Color-Coded Staff",
    subtitle: "Figurenotes & Landmark Notes",
    phase: "foundation",
    objectives: ["Figurenotes color and shape mapping", "Landmark notes: Middle C, Treble G, Bass F"],
    narrativeTheme: "First Light — the language of color and sound.",
    route: "/practice",
    drillLabel: "Practice",
    topics: ["note-reading"],
    unlocks: [],
  },
  {
    level: 2,
    title: "Rhythm & The Body",
    subtitle: "Beat, Duration & Meter",
    phase: "foundation",
    objectives: ["Whole, half, quarter, eighth notes", "Time signatures 4/4, 3/4, 2/4", "Dots"],
    narrativeTheme: "The Pulse — the heartbeat of music.",
    route: "/rhythm",
    drillLabel: "Rhythm",
    topics: ["rhythm"],
    unlocks: [{ to: "/rhythm", label: "Rhythm" }],
  },
  {
    level: 3,
    title: "Scales & Key Signatures",
    subtitle: "The Map of the Musical World",
    phase: "foundation",
    objectives: ["Major scale construction", "Key signatures to 4 sharps/flats", "Circle of fifths"],
    narrativeTheme: "The Map — from the Plains of C Major outward.",
    route: "/circle",
    drillLabel: "Key signatures",
    topics: ["keys", "scales"],
    unlocks: [
      { to: "/scale", label: "Scales" },
      { to: "/circle", label: "Circle of Fifths" },
    ],
  },
  {
    level: 4,
    title: "Intervals & Triads",
    subtitle: "Distances and Chord Shapes",
    phase: "foundation",
    objectives: ["Intervals unison to octave", "Major, minor, augmented, diminished triads"],
    narrativeTheme: "The Forge — harmonic building blocks.",
    route: "/interval",
    drillLabel: "Intervals",
    topics: ["intervals", "triads"],
    unlocks: [
      { to: "/interval", label: "Intervals" },
      { to: "/triad", label: "Triads" },
    ],
  },
  {
    level: 5,
    title: "Harmony Foundations",
    subtitle: "Cadences as Musical Punctuation",
    phase: "intermediate",
    objectives: ["Roman numerals I, IV, V, vi", "Perfect, plagal, half, deceptive cadences"],
    narrativeTheme: "The Grammar — harmonic sentences.",
    route: "/cadence",
    drillLabel: "Cadences",
    topics: ["harmony"],
    unlocks: [{ to: "/cadence", label: "Cadences" }],
  },
  {
    level: 6,
    title: "Part-Writing & Score Analysis",
    subtitle: "The Four Voices",
    phase: "intermediate",
    objectives: ["SATB independence", "Parallel 5ths/8ves detection", "Non-chord tones"],
    narrativeTheme: "The Council — four voices as one.",
    route: "/duel",
    drillLabel: "Duel",
    topics: ["duel", "harmony"],
    unlocks: [],
  },
  {
    level: 7,
    title: "Modulation & Pivot Chords",
    subtitle: "The Gateway",
    phase: "intermediate",
    objectives: ["Pivot chord modulation", "Closely related keys", "Secondary dominants"],
    narrativeTheme: "The Gateway — traveling between tonal worlds.",
    route: "/circle",
    drillLabel: "Related keys",
    topics: ["modulation", "keys"],
    unlocks: [],
  },
  {
    level: 8,
    title: "Advanced Harmony",
    subtitle: "The Full Score",
    phase: "intermediate",
    objectives: ["Seventh chords and chromatic color", "Odd meters and polyrhythms"],
    narrativeTheme: "The Orchestra — the full harmonic army.",
    route: "/rhythm",
    drillLabel: "Rhythm",
    topics: ["rhythm", "strike", "harmony"],
    unlocks: [{ to: "/strike", label: "Strike" }],
  },
  {
    level: 9,
    title: "Advanced Counterpoint",
    subtitle: "Species Counterpoint",
    phase: "advanced",
    objectives: ["First-species lines and cadences", "Second and third species", "Suspensions"],
    narrativeTheme: "The Duel — sparring with the Discord Sentinel.",
    route: "/duel",
    drillLabel: "Duel",
    topics: ["duel"],
    unlocks: [{ to: "/duel", label: "Duel" }],
  },
  {
    level: 10,
    title: "Fugue, Analysis & Modernism",
    subtitle: "The Masterwork",
    phase: "advanced",
    objectives: ["Fugal subjects and answers", "Modes and form", "Pitch-class transformations"],
    narrativeTheme: "The Masterwork — a harmonic legacy.",
    route: "/duel",
    drillLabel: "Duel",
    topics: ["duel", "intervals", "harmony"],
    unlocks: [],
  },
];

export const MAX_GRADE = CURRICULUM.length - 1;

export function levelFor(grade: number): CurriculumLevel {
  return CURRICULUM.find((l) => l.level === grade) ?? CURRICULUM[0]!;
}

export function studiesFor(grade: number): { to: AppRoute; label: string; level: number }[] {
  return CURRICULUM.filter((l) => l.level <= grade).flatMap((l) =>
    l.unlocks.map((u) => ({ ...u, level: l.level })),
  );
}

export function isStudyUnlocked(route: AppRoute, grade: number): boolean {
  return CURRICULUM.some((l) => l.level <= grade && l.unlocks.some((u) => u.to === route));
}

export function topicCountsForGrade(topicId: string, grade: number): boolean {
  return levelFor(grade).topics.includes(topicId as TopicId);
}

export type GradeThreshold = { minSessionAttempts: number; minSessionAccuracy: number };

export const GRADE_THRESHOLDS: Record<number, GradeThreshold> = {
  0: { minSessionAttempts: 10, minSessionAccuracy: 0.8 },
  1: { minSessionAttempts: 20, minSessionAccuracy: 0.85 },
  2: { minSessionAttempts: 20, minSessionAccuracy: 0.85 },
  3: { minSessionAttempts: 20, minSessionAccuracy: 0.85 },
  4: { minSessionAttempts: 20, minSessionAccuracy: 0.85 },
  5: { minSessionAttempts: 30, minSessionAccuracy: 0.9 },
  6: { minSessionAttempts: 30, minSessionAccuracy: 0.9 },
  7: { minSessionAttempts: 30, minSessionAccuracy: 0.9 },
  8: { minSessionAttempts: 40, minSessionAccuracy: 0.9 },
  9: { minSessionAttempts: 40, minSessionAccuracy: 0.92 },
};

export const FEVER_THRESHOLD = 10;
