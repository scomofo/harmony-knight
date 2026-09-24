/**
 * Versioned save schema. Every persisted object carries a schema version and
 * a migration path; import validation rejects malformed or incompatible data
 * without touching the live store.
 */

import type { QuestState } from "./quests.ts";

export const SAVE_VERSION = 3;
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
  /** Kid-gate for the grown-ups dashboard. Null until a grown-up sets one. */
  grownUpsPin: string | null;
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
  /** Daily quests: date -> quest id -> "done" | "claimed". */
  questLog: Record<string, Record<string, QuestState>>;
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
    grownUpsPin: null,
  };
}

export function defaultGameStats(): GameStats {
  return { strikePlays: 0, strikeBest: 0, duelWins: 0, duelLosses: 0, duelDraws: 0 };
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
    gameStats: defaultGameStats(),
    questLog: {},
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
  {
    from: 1,
    to: 2,
    // v2 introduces gameStats. Saves written by the games build already
    // carry it (schema v1); pre-games saves get defaults. Malformed values
    // are sanitized per-field so one bad stat never wipes the rest.
    migrate: (data) => ({
      ...data,
      gameStats: sanitizeGameStats(data.gameStats),
      version: 2,
    }),
  },
  {
    from: 2,
    to: 3,
    // v3 introduces the daily quest log and the grown-ups PIN. Both are
    // additive; a v2 save keeps everything it had.
    migrate: (data) => {
      const rawSettings = isRecord(data.settings) ? data.settings : {};
      const pin = typeof rawSettings.grownUpsPin === "string" ? rawSettings.grownUpsPin : null;
      return {
        ...data,
        questLog: isRecord(data.questLog) ? data.questLog : {},
        // Merge over full defaults: a sparse settings object must never
        // clobber the fields the defaults provide.
        settings: { ...defaultSettings(), ...rawSettings, grownUpsPin: pin },
        version: 3,
      };
    },
  },
];

/** Coerce unknown input into a valid GameStats, preserving good fields. */
export function sanitizeGameStats(v: unknown): GameStats {
  const d = defaultGameStats();
  if (!isRecord(v)) return d;
  const num = (x: unknown, fallback: number): number =>
    typeof x === "number" && Number.isFinite(x) && x >= 0 ? Math.floor(x) : fallback;
  return {
    strikePlays: num(v.strikePlays, d.strikePlays),
    strikeBest: num(v.strikeBest, d.strikeBest),
    duelWins: num(v.duelWins, d.duelWins),
    duelLosses: num(v.duelLosses, d.duelLosses),
    duelDraws: num(v.duelDraws, d.duelDraws),
  };
}

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
    (s.playbackSpeed === 1 || s.playbackSpeed === 0.75 || s.playbackSpeed === 0.5) &&
    (s.grownUpsPin === null || typeof s.grownUpsPin === "string")
  );
}

function validQuestLog(v: unknown): boolean {
  if (!isRecord(v)) return false;
  return Object.values(v).every(
    (day) =>
      isRecord(day) &&
      Object.values(day).every((s) => s === "done" || s === "claimed"),
  );
}

function validGameStats(v: unknown): v is GameStats {
  if (!isRecord(v)) return false;
  const keys = ["strikePlays", "strikeBest", "duelWins", "duelLosses", "duelDraws"] as const;
  return keys.every((k) => {
    const n = v[k];
    return (
      typeof n === "number" && Number.isFinite(n) && n >= 0 && Math.floor(n) === n
    );
  });
}

function validCreation(v: unknown): v is SavedCreation {
  if (!isRecord(v)) return false;
  return (
    typeof v.id === "string" &&
    v.id.length > 0 &&
    typeof v.chapter === "number" &&
    Number.isInteger(v.chapter) &&
    v.chapter >= 1 &&
    v.chapter <= 11 &&
    typeof v.name === "string" &&
    typeof v.updatedAt === "number" &&
    Number.isFinite(v.updatedAt) &&
    v.updatedAt >= 0
    // `data` is intentionally opaque: parsed defensively at render time.
  );
}

function validGradeWindows(v: unknown): boolean {
  if (!isRecord(v)) return false;
  return Object.values(v).every((w) => {
    if (!isRecord(w)) return false;
    const num = (x: unknown) =>
      typeof x === "number" && Number.isFinite(x) && x >= 0;
    return num(w.attempts) && num(w.correct);
  });
}

/** Every value in the record must itself be a record (no primitives/arrays). */
function recordOfRecords(v: unknown): v is Record<string, Record<string, unknown>> {
  return isRecord(v) && Object.values(v).every(isRecord);
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
  if (!recordOfRecords(data.lessons) || !recordOfRecords(data.concepts) || !recordOfRecords(data.noteEvidence))
    return false;
  if (typeof data.harmonyPoints !== "number" || !Number.isFinite(data.harmonyPoints) || data.harmonyPoints < 0)
    return false;
  if (typeof data.grade !== "number" || !Number.isInteger(data.grade) || data.grade < 0 || data.grade > 10)
    return false;
  if (!validGradeWindows(data.gradeWindows)) return false;
  if (!Array.isArray(data.learningDays) || !data.learningDays.every((d) => typeof d === "string"))
    return false;
  if (!Array.isArray(data.creations) || !data.creations.every(validCreation)) return false;
  if (!validGameStats(data.gameStats)) return false;
  if (!validQuestLog(data.questLog)) return false;
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
