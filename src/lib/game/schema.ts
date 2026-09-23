/**
 * Versioned save schema. Every persisted object carries a schema version and
 * a migration path; import validation rejects malformed or incompatible data
 * without touching the live store.
 */

export const SAVE_VERSION = 1;
export const SAVE_KEY = "harmony-knight-save-v1";

export type LessonStep = "learn" | "try" | "recall" | "done";

export type CheckResult = {
  checkId: string;
  correctFirstTry: boolean;
  assisted: boolean;
  answeredAt: number;
};

export type TaskDraft = {
  taskId: string;
  draft: unknown;
  feedback: string | null;
  firstCheckCorrect: boolean | null;
  assisted: boolean;
  updatedAt: number;
};

export type LessonProgress = {
  lessonId: string;
  step: LessonStep;
  /** Original first answers, preserved for before/after review. */
  answers: Record<string, unknown>;
  checks: CheckResult[];
  tasks: TaskDraft[];
  completedAt: number | null;
  completionPointsAwarded: boolean;
};

export type ConceptReview = {
  conceptId: string;
  /** Spaced-repetition interval in days: 1 -> 3 -> 7 -> 15 -> 30. */
  intervalDays: number;
  dueAt: number;
  lastResult: "correct" | "wrong" | "assisted" | null;
};

export type NoteEvidence = {
  /** Exact note+octave key, e.g. "E4". */
  note: string;
  attempts: number;
  firstTryCorrect: number;
  lastCorrect: boolean;
  /** Next review timestamp (ms). */
  dueAt: number;
};

export type Settings = {
  volume: number; // 0..1
  muted: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  focusMode: boolean;
  sessionMinutes: number;
  playbackSpeed: 1 | 0.75 | 0.5;
};

export type SaveData = {
  version: number;
  createdAt: number;
  updatedAt: number;
  onboarded: boolean;
  settings: Settings;
  lessons: Record<string, LessonProgress>;
  concepts: Record<string, ConceptReview>;
  noteEvidence: Record<string, NoteEvidence>;
  harmonyPoints: number;
  grade: number;
  gradeWindows: Record<string, { attempts: number; correct: number }>;
  learningDays: string[]; // YYYY-MM-DD, device-local calendar
  creations: SavedCreation[];
  gameStats: GameStats;
};

export type SavedCreation = {
  id: string;
  chapter: number;
  name: string;
  data: unknown;
  updatedAt: number;
};

export type GameStats = {
  strikePlays: number;
  strikeBest: number;
  duelWins: number;
  duelLosses: number;
  duelDraws: number;
};

export function defaultSettings(): Settings {
  return {
    volume: 0.8,
    muted: false,
    highContrast: false,
    reducedMotion: false,
    focusMode: true,
    sessionMinutes: 3,
    playbackSpeed: 1,
  };
}

export function defaultSave(): SaveData {
  const now = Date.now();
  return {
    version: SAVE_VERSION,
    createdAt: now,
    updatedAt: now,
    onboarded: false,
    settings: defaultSettings(),
    lessons: {},
    concepts: {},
    noteEvidence: {},
    harmonyPoints: 0,
    grade: 0,
    gradeWindows: {},
    learningDays: [],
    creations: [],
    gameStats: { strikePlays: 0, strikeBest: 0, duelWins: 0, duelLosses: 0, duelDraws: 0 },
  };
}

/* ------------------------------------------------------------------ */
/* Migrations                                                          */
/* ------------------------------------------------------------------ */

type Migration = {
  from: number;
  to: number;
  migrate: (data: Record<string, unknown>) => Record<string, unknown>;
};

const MIGRATIONS: Migration[] = [
  // v1 is the first shipped schema; older unknown shapes are rejected, not guessed.
];

/**
 * Migrate raw parsed data toward SAVE_VERSION. Returns null when the data
 * cannot be migrated safely (caller must keep the live store untouched).
 */
export function migrateSave(raw: unknown): SaveData | null {
  if (typeof raw !== "object" || raw === null) return null;
  const data = raw as Record<string, unknown>;
  if (typeof data.version !== "number") return null;
  let version = data.version;
  // Never downgrade: a save from a newer schema cannot be safely interpreted.
  if (version > SAVE_VERSION) return null;
  let current: Record<string, unknown> = { ...data };
  while (version < SAVE_VERSION) {
    const m = MIGRATIONS.find((x) => x.from === version);
    if (!m) return null;
    current = m.migrate(current);
    version = m.to;
  }
  const merged: SaveData = { ...defaultSave(), ...current, version: SAVE_VERSION };
  return validateSave(merged) ? merged : null;
}

/* ------------------------------------------------------------------ */
/* Import validation                                                   */
/* ------------------------------------------------------------------ */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function validSettings(s: unknown): s is Settings {
  if (!isRecord(s)) return false;
  return (
    typeof s.volume === "number" &&
    s.volume >= 0 &&
    s.volume <= 1 &&
    typeof s.muted === "boolean" &&
    typeof s.highContrast === "boolean" &&
    typeof s.reducedMotion === "boolean" &&
    typeof s.focusMode === "boolean" &&
    typeof s.sessionMinutes === "number" &&
    s.sessionMinutes >= 1 &&
    s.sessionMinutes <= 60 &&
    (s.playbackSpeed === 1 || s.playbackSpeed === 0.75 || s.playbackSpeed === 0.5)
  );
}

/**
 * Validate an imported save object: format, field ranges, and version.
 * Never throws; returns false for anything unsafe to adopt.
 */
export function validateSave(data: unknown): data is SaveData {
  if (!isRecord(data)) return false;
  if (data.version !== SAVE_VERSION) return false;
  if (typeof data.createdAt !== "number" || typeof data.updatedAt !== "number") return false;
  if (typeof data.onboarded !== "boolean") return false;
  if (!validSettings(data.settings)) return false;
  if (!isRecord(data.lessons) || !isRecord(data.concepts) || !isRecord(data.noteEvidence))
    return false;
  if (typeof data.harmonyPoints !== "number" || data.harmonyPoints < 0) return false;
  if (typeof data.grade !== "number" || data.grade < 0 || data.grade > 10) return false;
  if (!isRecord(data.gradeWindows)) return false;
  if (!Array.isArray(data.learningDays)) return false;
  if (!Array.isArray(data.creations)) return false;
  if (!isRecord(data.gameStats)) return false;
  // ~5MB cap keeps quota failures predictable.
  try {
    if (JSON.stringify(data).length > 5 * 1024 * 1024) return false;
  } catch {
    return false;
  }
  return true;
}

/** Serialize a save for export (downloadable JSON). */
export function exportSave(data: SaveData): string {
  return JSON.stringify({ ...data, version: SAVE_VERSION }, null, 2);
}

/**
 * Parse + validate an imported JSON string. Returns the migrated save or
 * null; the caller must keep the live store when null is returned.
 */
export function importSave(json: string): SaveData | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  return migrateSave(parsed);
}
