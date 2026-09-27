/**
 * Versioned save schema. Every persisted object carries a schema version and
 * a migration path; import validation rejects malformed or incompatible data
 * without touching the live store.
 */

import type { QuestState } from "./quests.ts";
import type { AdaptiveAttempt, ConfusionPair } from "./adapt.ts";
import {
  isValidContestWeek,
  sanitizeContests,
  type ContestWeek,
} from "./contest.ts";
import { defaultShop, sanitizeShop, type ShopState } from "./shop.ts";

export const SAVE_VERSION = 7;
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
  // NOTE: the grown-ups PIN is intentionally NOT here. It is device-level
  // (see DeviceSettings below), not per-profile, so siblings sharing a
  // device share one grown-ups gate.
  /**
   * Creator "always sound good" mode: quantize to the palette and
   * auto-harmonize the bass. Default on.
   */
  cantFail: boolean;
};

/* ------------------------------------------------------------------ */
/* Player profile (first-session onboarding)                            */
/* ------------------------------------------------------------------ */

/** Self-reported age band, collected once during onboarding. */
export type AgeBand = "under-7" | "7-9" | "10-12" | "13-plus";
/** How much music the player has played before, in their own words. */
export type ExperienceLevel = "brand-new" | "a-little" | "played-before";
/** What the player hopes to get out of the game. */
export type LearnerGoal = "play-songs" | "understand-music" | "make-music" | "just-exploring";
/** Primary instrument, if any. */
export type Instrument = "piano" | "guitar" | "voice" | "violin" | "ukulele" | "other" | "none-yet";

export type PlacementAnswer = {
  questionId: string;
  correct: boolean;
};

/** Result of the onboarding placement diagnostic. */
export type PlacementResult = {
  completedAt: number;
  answers: PlacementAnswer[];
  /** Chapter number (1..11) the diagnostic recommends starting at. */
  recommendedStartChapter: number;
};

export type PlayerProfile = {
  /** Display name; empty until the player tells us. */
  name: string;
  ageBand: AgeBand;
  experience: ExperienceLevel;
  goal: LearnerGoal;
  instrument: Instrument;
  /** Null until the placement diagnostic is taken (or skipped). */
  placement: PlacementResult | null;
  /** When onboarding finished; null for pre-profile saves. */
  completedAt: number | null;
};

export type SaveData = {
  version: number;
  createdAt: number;
  updatedAt: number;
  onboarded: boolean;
  settings: Settings;
  /** First-session profile; defaults are unclaimed (completedAt null). */
  profile: PlayerProfile;
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
  /**
   * Adaptive engine (Phase 1): per-domain recent attempt log, newest last,
   * capped at 10 per domain. Drives per-user difficulty.
   */
  adaptiveAttempts: Record<string, AdaptiveAttempt[]>;
  /** Adaptive engine (Phase 1): confusion pairs with SR scheduling. */
  confusion: Record<string, ConfusionPair>;
  /** Weekly creation contests, keyed by ISO week id ("2026-W39"). */
  contests: Record<string, ContestWeek>;
  /** Shop: owned cosmetics and what's equipped. */
  shop: ShopState;
  /**
   * Endless-practice evidence, keyed by task kind:
   * { attempts, first-try correct }. Feeds skill ratings only — never
   * grade trials.
   */
  practiceEvidence: Record<string, { attempts: number; correct: number }>;
  /**
   * Streak freeze: YYYY-MM-DD the weekly freeze was last consumed, or
   * null when never used. One missed day per 7-day window keeps the streak.
   */
  streakFreeze: string | null;
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
  /** Last finished duel (ms epoch, 0 = never). Duel anti-farming. */
  lastDuelAt: number;
  /** Duels finished per device-local day (YYYY-MM-DD -> count). Anti-farming. */
  duelDayCounts: Record<string, number>;
};

export function defaultSettings(): Settings {
  return {
    volume: 0.8,
    muted: false,
    highContrast: false,
    reducedMotion: false,
    focusMode: true,
    sessionMinutes: 20,
    playbackSpeed: 1,
    cantFail: true,
  };
}

/**
 * Default profile for pre-profile saves (and for players who skip
 * onboarding): every field is the "unclaimed" choice, and completedAt is
 * null so the UI can invite the player to finish their profile.
 */
export function defaultProfile(): PlayerProfile {
  return {
    name: "",
    ageBand: "7-9",
    experience: "a-little",
    goal: "just-exploring",
    instrument: "none-yet",
    placement: null,
    completedAt: null,
  };
}

export function defaultGameStats(): GameStats {
  return {
    strikePlays: 0,
    strikeBest: 0,
    duelWins: 0,
    duelLosses: 0,
    duelDraws: 0,
    lastDuelAt: 0,
    duelDayCounts: {},
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
    profile: defaultProfile(),
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
    adaptiveAttempts: {},
    confusion: {},
    contests: {},
    shop: defaultShop(),
    practiceEvidence: {},
    streakFreeze: null,
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
  {
    from: 3,
    to: 4,
    // v4 introduces the player profile (onboarding answers + placement
    // diagnostic result). Existing saves get the unclaimed default profile;
    // a partial profile is sanitized per-field so one bad value never
    // wipes the rest.
    migrate: (data) => ({
      ...data,
      profile: sanitizeProfile(data.profile),
      version: 4,
    }),
  },
  {
    from: 4,
    to: 5,
    // v5 introduces the adaptive engine's evidence stores: per-domain
    // attempt logs and confusion pairs. Both are additive; a v4 save
    // keeps everything it had and starts with empty adaptive evidence.
    migrate: (data) => ({
      ...data,
      adaptiveAttempts: isRecord(data.adaptiveAttempts) ? data.adaptiveAttempts : {},
      confusion: isRecord(data.confusion) ? data.confusion : {},
      version: 5,
    }),
  },
  {
    from: 5,
    to: 6,
    // v6 introduces the weekly creation contests, the creator "always sound
    // good" toggle, and duel anti-farming stats. All additive: a v5 save
    // keeps everything it had, gaining defaults for the new fields.
    // (The grown-ups PIN stays device-level; a stale settings copy passes
    // through for migrateToProfiles to relocate.)
    migrate: (data) => {
      const rawSettings = isRecord(data.settings) ? data.settings : {};
      return {
        ...data,
        settings: {
          ...defaultSettings(),
          ...rawSettings,
          cantFail: typeof rawSettings.cantFail === "boolean" ? rawSettings.cantFail : true,
        },
        gameStats: sanitizeGameStats(data.gameStats),
        contests: sanitizeContests(data.contests),
        version: 6,
      };
    },
  },
  {
    from: 6,
    to: 7,
    // v7 introduces the shop, endless-practice evidence, and the streak
    // freeze. All additive; a v6 save keeps everything it had.
    migrate: (data) => ({
      ...data,
      shop: sanitizeShop(data.shop),
      practiceEvidence: sanitizePracticeEvidence(data.practiceEvidence),
      streakFreeze: validDateKey(data.streakFreeze) ? data.streakFreeze : null,
      version: 7,
    }),
  },
];

/** Coerce unknown input into a valid PlayerProfile, preserving good fields. */
export function sanitizeProfile(v: unknown): PlayerProfile {
  const d = defaultProfile();
  if (!isRecord(v)) return d;
  const oneOf = <T extends string>(x: unknown, allowed: readonly T[], fallback: T): T =>
    typeof x === "string" && (allowed as readonly string[]).includes(x) ? (x as T) : fallback;
  return {
    name: typeof v.name === "string" ? v.name.slice(0, 40) : d.name,
    ageBand: oneOf(v.ageBand, ["under-7", "7-9", "10-12", "13-plus"] as const, d.ageBand),
    experience: oneOf(v.experience, ["brand-new", "a-little", "played-before"] as const, d.experience),
    goal: oneOf(v.goal, ["play-songs", "understand-music", "make-music", "just-exploring"] as const, d.goal),
    instrument: oneOf(
      v.instrument,
      ["piano", "guitar", "voice", "violin", "ukulele", "other", "none-yet"] as const,
      d.instrument,
    ),
    placement: sanitizePlacement(v.placement),
    completedAt:
      typeof v.completedAt === "number" && Number.isFinite(v.completedAt) && v.completedAt >= 0
        ? v.completedAt
        : null,
  };
}

/** Coerce unknown input into a valid PlacementResult, or null when unusable. */
export function sanitizePlacement(v: unknown): PlacementResult | null {
  if (v === null || v === undefined) return null;
  if (!isRecord(v)) return null;
  const { completedAt, answers } = v;
  const chapter = v.recommendedStartChapter;
  if (
    typeof completedAt !== "number" ||
    !Number.isFinite(completedAt) ||
    completedAt < 0 ||
    typeof chapter !== "number" ||
    !Number.isInteger(chapter) ||
    chapter < 1 ||
    chapter > 11 ||
    !Array.isArray(answers) ||
    !answers.every(
      (a) => isRecord(a) && typeof a.questionId === "string" && typeof a.correct === "boolean",
    )
  ) {
    return null;
  }
  return {
    completedAt,
    answers: answers.map((a) => {
      const r = a as Record<string, unknown>;
      return { questionId: r.questionId as string, correct: r.correct as boolean };
    }),
    recommendedStartChapter: chapter,
  };
}

/** Coerce unknown input into a valid GameStats, preserving good fields. */
export function sanitizeGameStats(v: unknown): GameStats {
  const d = defaultGameStats();
  if (!isRecord(v)) return d;
  const num = (x: unknown, fallback: number): number =>
    typeof x === "number" && Number.isFinite(x) && x >= 0 ? Math.floor(x) : fallback;
  const dayCounts: Record<string, number> = {};
  if (isRecord(v.duelDayCounts)) {
    for (const [day, count] of Object.entries(v.duelDayCounts)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(day) && typeof count === "number" && Number.isFinite(count) && count >= 0) {
        dayCounts[day] = Math.floor(count);
      }
    }
  }
  return {
    strikePlays: num(v.strikePlays, d.strikePlays),
    strikeBest: num(v.strikeBest, d.strikeBest),
    duelWins: num(v.duelWins, d.duelWins),
    duelLosses: num(v.duelLosses, d.duelLosses),
    duelDraws: num(v.duelDraws, d.duelDraws),
    lastDuelAt: num(v.lastDuelAt, d.lastDuelAt),
    duelDayCounts: dayCounts,
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

/** Coerce unknown input into practice evidence, preserving good entries. */
export function sanitizePracticeEvidence(v: unknown): Record<string, { attempts: number; correct: number }> {
  if (!isRecord(v)) return {};
  const out: Record<string, { attempts: number; correct: number }> = {};
  for (const [kind, w] of Object.entries(v)) {
    if (!isRecord(w)) continue;
    const num = (x: unknown): number | null =>
      typeof x === "number" && Number.isFinite(x) && x >= 0 ? Math.floor(x) : null;
    const attempts = num(w.attempts);
    const correct = num(w.correct);
    if (attempts === null || correct === null) continue;
    out[kind] = { attempts, correct: Math.min(correct, attempts) };
  }
  return out;
}

function validDateKey(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
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
    typeof s.cantFail === "boolean"
    // grownUpsPin is no longer part of Settings (device-level now); a stale
    // copy lingering in an old persisted save is simply ignored.
  );
}

function validPlayerProfile(v: unknown): v is PlayerProfile {
  if (!isRecord(v)) return false;
  const oneOf = (x: unknown, allowed: readonly string[]) =>
    typeof x === "string" && allowed.includes(x);
  return (
    typeof v.name === "string" &&
    v.name.length <= 40 &&
    oneOf(v.ageBand, ["under-7", "7-9", "10-12", "13-plus"]) &&
    oneOf(v.experience, ["brand-new", "a-little", "played-before"]) &&
    oneOf(v.goal, ["play-songs", "understand-music", "make-music", "just-exploring"]) &&
    oneOf(v.instrument, ["piano", "guitar", "voice", "violin", "ukulele", "other", "none-yet"]) &&
    (v.placement === null || sanitizePlacement(v.placement) !== null) &&
    (v.completedAt === null ||
      (typeof v.completedAt === "number" && Number.isFinite(v.completedAt) && v.completedAt >= 0))
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
  const keys = ["strikePlays", "strikeBest", "duelWins", "duelLosses", "duelDraws", "lastDuelAt"] as const;
  const intsOk = keys.every((k) => {
    const n = v[k];
    return (
      typeof n === "number" && Number.isFinite(n) && n >= 0 && Math.floor(n) === n
    );
  });
  if (!intsOk) return false;
  const days = v.duelDayCounts;
  return (
    isRecord(days) &&
    Object.entries(days).every(
      ([day, count]) =>
        /^\d{4}-\d{2}-\d{2}$/.test(day) &&
        typeof count === "number" &&
        Number.isFinite(count) &&
        count >= 0 &&
        Math.floor(count) === count,
    )
  );
}

function validContests(v: unknown): v is Record<string, ContestWeek> {
  if (!isRecord(v)) return false;
  return Object.entries(v).every(
    ([weekId, week]) =>
      isValidContestWeek(week) && (week as ContestWeek).weekId === weekId,
  );
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

function validShop(v: unknown): v is ShopState {
  if (!isRecord(v)) return false;
  if (!Array.isArray(v.owned) || !v.owned.every((id) => typeof id === "string")) return false;
  return (
    typeof v.theme === "string" && typeof v.avatar === "string" && typeof v.instrument === "string"
  );
}

function validPracticeEvidence(v: unknown): boolean {
  if (!isRecord(v)) return false;
  return Object.values(v).every((w) => {
    if (!isRecord(w)) return false;
    const num = (x: unknown) =>
      typeof x === "number" && Number.isFinite(x) && x >= 0 && Math.floor(x) === x;
    return num(w.attempts) && num(w.correct) && (w.correct as number) <= (w.attempts as number);
  });
}

/** Every value in the record must itself be a record (no primitives/arrays). */
function recordOfRecords(v: unknown): v is Record<string, Record<string, unknown>> {
  return isRecord(v) && Object.values(v).every(isRecord);
}

/** Adaptive attempt logs: record of arrays of attempt records. */
function validAdaptiveAttempts(v: unknown): v is Record<string, AdaptiveAttempt[]> {
  if (!isRecord(v)) return false;
  return Object.values(v).every(
    (arr) => Array.isArray(arr) && arr.every(isRecord),
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
  if (!validPlayerProfile(data.profile)) return false;
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
  if (!validAdaptiveAttempts(data.adaptiveAttempts)) return false;
  if (!recordOfRecords(data.confusion)) return false;
  if (!validContests(data.contests)) return false;
  if (!validShop(data.shop)) return false;
  if (!validPracticeEvidence(data.practiceEvidence)) return false;
  if (data.streakFreeze !== null && !validDateKey(data.streakFreeze)) return false;
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

/* ------------------------------------------------------------------ */
/* Multi-profile container (household)                                 */
/* ------------------------------------------------------------------ */

/**
 * Household profiles: one device can hold several learners, each with a
 * full independent SaveData. The container is versioned separately from
 * SaveData; a pre-profiles single save migrates into one "Default" profile.
 * Everything stays in localStorage (PWA offline-safe).
 */
export const PROFILES_VERSION = 1;
export const PROFILES_KEY = "harmony-knight-profiles-v1";

export type ProfileData = {
  id: string;
  name: string;
  /** Emoji from PROFILE_AVATARS. */
  avatar: string;
  createdAt: number;
  save: SaveData;
};

/** Per-device (not per-profile) settings. */
export type DeviceSettings = {
  /** Kid-gate for the grown-ups dashboard. Null until a grown-up sets one. */
  grownUpsPin: string | null;
};

export type ProfilesData = {
  version: number;
  activeProfileId: string;
  profiles: Record<string, ProfileData>;
  device: DeviceSettings;
};

/** Kid-friendly avatar choices for the profile picker. */
export const PROFILE_AVATARS = [
  "⚔️",
  "🐉",
  "🦊",
  "🐱",
  "🦄",
  "🤖",
  "🦉",
  "🐸",
  "🐼",
  "🚀",
  "⭐",
  "👻",
] as const;

export const MAX_PROFILE_NAME_LENGTH = 24;

/** Collision-resistant profile id. */
export function newProfileId(): string {
  const rand = Math.floor(Math.random() * 0xffffffff).toString(36);
  return `p_${Date.now().toString(36)}_${rand}`;
}

/** Trim + clamp a profile name; falls back to "Knight" when blank. */
export function sanitizeProfileName(name: unknown): string {
  const clean = typeof name === "string" ? name.trim().slice(0, MAX_PROFILE_NAME_LENGTH) : "";
  return clean.length > 0 ? clean : "Knight";
}

/** Keep only avatars from the curated set; unknown values get the knight. */
export function sanitizeAvatar(avatar: unknown): string {
  return typeof avatar === "string" && (PROFILE_AVATARS as readonly string[]).includes(avatar)
    ? avatar
    : PROFILE_AVATARS[0];
}

export function defaultDeviceSettings(): DeviceSettings {
  return { grownUpsPin: null };
}

export function newProfile(name: string, avatar: string): ProfileData {
  const now = Date.now();
  return {
    id: newProfileId(),
    name: sanitizeProfileName(name),
    avatar: sanitizeAvatar(avatar),
    createdAt: now,
    save: defaultSave(),
  };
}

/** Fresh container: a single "Default" profile, nothing else. */
export function defaultProfiles(): ProfilesData {
  const profile = newProfile("Default", PROFILE_AVATARS[0]);
  return {
    version: PROFILES_VERSION,
    activeProfileId: profile.id,
    profiles: { [profile.id]: profile },
    device: defaultDeviceSettings(),
  };
}

function validProfile(p: unknown, key: string): p is ProfileData {
  if (!isRecord(p)) return false;
  return (
    p.id === key &&
    typeof p.name === "string" &&
    p.name.length > 0 &&
    p.name.length <= MAX_PROFILE_NAME_LENGTH &&
    typeof p.avatar === "string" &&
    p.avatar.length > 0 &&
    typeof p.createdAt === "number" &&
    Number.isFinite(p.createdAt) &&
    validateSave(p.save)
  );
}

function validDeviceSettings(v: unknown): v is DeviceSettings {
  if (!isRecord(v)) return false;
  return v.grownUpsPin === null || typeof v.grownUpsPin === "string";
}

/**
 * Validate an imported profiles container. Never throws; returns false for
 * anything unsafe to adopt.
 */
export function validateProfiles(data: unknown): data is ProfilesData {
  if (!isRecord(data)) return false;
  if (data.version !== PROFILES_VERSION) return false;
  if (typeof data.activeProfileId !== "string" || data.activeProfileId.length === 0) return false;
  if (!isRecord(data.profiles)) return false;
  const entries = Object.entries(data.profiles);
  if (entries.length === 0) return false;
  if (!entries.every(([key, p]) => validProfile(p, key))) return false;
  if (!(data.activeProfileId in data.profiles)) return false;
  if (!validDeviceSettings(data.device)) return false;
  // ~8MB cap keeps quota failures predictable across several profiles.
  try {
    if (JSON.stringify(data).length > 8 * 1024 * 1024) return false;
  } catch {
    return false;
  }
  return true;
}

/**
 * Migrate unknown persisted data into a ProfilesData container. Accepts:
 *  - a profiles container at PROFILES_VERSION (validated as-is), or
 *  - a pre-profiles single save (schema v1..v3): migrated through the save
 *    chain and wrapped into one "Default" profile. The grown-ups PIN, if
 *    set on the old save, moves to device level.
 * Returns null when the data cannot be adopted safely.
 */
export function migrateToProfiles(raw: unknown): ProfilesData | null {
  if (!isRecord(raw)) return null;
  // Anything container-shaped is a profiles container, valid or not: a
  // corrupt container must NEVER be reinterpreted as a single save (the
  // container version collides with save v1).
  if ("profiles" in raw || "activeProfileId" in raw) {
    return validateProfiles(raw) ? (raw as ProfilesData) : null;
  }
  // Legacy single save: run the save migration chain, then wrap.
  const save = migrateSave(raw);
  if (!save) return null;
  const profile = newProfile("Default", PROFILE_AVATARS[0]);
  const legacy = raw as Record<string, unknown>;
  const legacySettings = isRecord(legacy.settings) ? legacy.settings : {};
  // The PIN also survives on the migrated save record (v2->v3 migration
  // stamps it onto settings); read it from either spot.
  const migratedSettings = save.settings as unknown as Record<string, unknown>;
  const pin =
    typeof legacySettings.grownUpsPin === "string"
      ? legacySettings.grownUpsPin
      : typeof migratedSettings.grownUpsPin === "string"
        ? migratedSettings.grownUpsPin
        : null;
  if (pin !== null) delete migratedSettings.grownUpsPin;
  profile.save = save;
  return {
    version: PROFILES_VERSION,
    activeProfileId: profile.id,
    profiles: { [profile.id]: profile },
    device: { grownUpsPin: pin },
  };
}
