/**
 * Persistent learner state. Zustand store backed by localStorage.
 * - Writes are debounced; every action stamps updatedAt.
 * - Import replaces the store only after validation + explicit confirmation
 *   (the caller handles confirmation UX); failures never touch live state.
 * - Storage quota failures are surfaced, never silent.
 */

import { create } from "zustand";
import {
  PROFILES_KEY,
  PROFILES_VERSION,
  SAVE_KEY,
  defaultProfiles,
  defaultSave,
  importSave,
  migrateToProfiles,
  newProfile,
  sanitizeAvatar,
  sanitizeProfileName,
  MAX_PROFILE_NAME_LENGTH,
  type ConceptReview,
  type DeviceSettings,
  type GameStats,
  type LessonProgress,
  type NoteEvidence,
  type ProfileData,
  type ProfilesData,
  type SaveData,
  type SavedCreation,
  type Settings,
} from "./schema.ts";
import { completeLesson, recordCheck, recordLearningDay, startLesson } from "./learning.ts";
import { recordNoteAnswer } from "./sr.ts";
import { advanceGrade, trialPassed } from "./grades.ts";
import {
  CONFUSION_DOMAINS,
  appendAttempt,
  confusionKey,
  recordConfusionHit,
  recordConfusionMiss,
  type AdaptiveAttempt,
} from "./adapt.ts";
import type { TaskKind } from "./tasks.ts";
import {
  QUESTS,
  claimQuest as claimQuestInLog,
  completeQuest as completeQuestInLog,
  todayKey,
  type QuestId,
} from "./quests.ts";
import {
  CONTEST_VOTING_BONUS,
  MAX_KEPT_WEEKS,
  createContestWeek,
  submissionPointsDue,
  submitToContest,
  voteInContest,
  votingBonusAvailable,
  type ContestEntry,
  type ContestMatchup,
  type ContestWeek,
} from "./contest.ts";
import type { Palette } from "./palettes.ts";

/** Keep only the most recent contest weeks (storage bound). */
function pruneContestWeeks(weeks: Record<string, ContestWeek>): Record<string, ContestWeek> {
  const ids = Object.keys(weeks).sort();
  if (ids.length <= MAX_KEPT_WEEKS) return weeks;
  const keep = new Set(ids.slice(-MAX_KEPT_WEEKS));
  return Object.fromEntries(Object.entries(weeks).filter(([id]) => keep.has(id)));
}

/** Stamp a quest completion + learning day onto a save draft. Idempotent per day. */
function stampQuest(save: SaveData, id: QuestId): SaveData {
  return {
    ...save,
    questLog: completeQuestInLog(save.questLog, id, todayKey()),
    learningDays: recordLearningDay(save.learningDays),
  };
}

export type SaveStatus = "ok" | "quota-exceeded" | "unavailable";

type Store = {
  /** Active profile's save. Every game action below reads/writes this. */
  save: SaveData;
  saveStatus: SaveStatus;
  /** Household profiles. */
  activeProfileId: string;
  profiles: Record<string, ProfileData>;
  /** Grown-ups PIN — device-level, shared across profiles. */
  grownUpsPin: string | null;
  setGrownUpsPin: (pin: string | null) => void;
  /** Switch the active profile; its save becomes `save` everywhere. */
  switchProfile: (id: string) => void;
  /** Create a profile and switch to it. Returns the new profile id. */
  addProfile: (name: string, avatar: string) => string;
  /** Rename / change avatar. Blank renames keep the old name. */
  updateProfile: (id: string, patch: { name?: string; avatar?: string }) => void;
  /**
   * Delete a profile. Deleting the active one falls back to the oldest
   * remaining; deleting the last profile starts a fresh default.
   */
  deleteProfile: (id: string) => void;
  /** Merge a partial update and persist. */
  update: (fn: (s: SaveData) => SaveData) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  openLesson: (lessonId: string) => void;
  setLessonStep: (lessonId: string, step: LessonProgress["step"]) => void;
  /** Record a recall check answer; returns first-try correctness. */
  answerCheck: (
    lessonId: string,
    checkId: string,
    correct: boolean,
    assisted: boolean,
  ) => { correctFirstTry: boolean; isFirst: boolean };
  finishLesson: (lessonId: string) => number;
  recordConcept: (review: ConceptReview) => void;
  /** Record a practical task attempt (Try step). First-try correctness is per task id. */
  recordTaskAttempt: (
    lessonId: string,
    taskId: string,
    attempt: {
      draft: unknown;
      feedback: string | null;
      correct: boolean;
      assisted: boolean;
      /**
       * Adaptive engine (Phase 1): the task's kind + canonical answer.
       * When present, the attempt is appended to the per-domain adaptive
       * log and confusion pairs are tracked from unassisted misses with
       * a known named distractor.
       */
      taskKind?: TaskKind;
      answer?: unknown;
    },
  ) => boolean;
  /**
   * Record a targeted confusion-pair recall (Practice mix-up drill):
   * an unassisted correct answer advances the pair's SR schedule.
   */
  recordConfusionRecall: (domain: string, correct: string, wasCorrect: boolean) => void;
  answerNote: (note: string, correct: boolean, correctFirstTry: boolean, recentAccuracy: number) => boolean;
  addPoints: (n: number) => void;
  touchLearningDay: () => void;
  /** Set the grade directly (used by trial advancement). */
  setGrade: (grade: number) => void;
  /**
   * Record a finished grade trial: stamps the grade window, advances the
   * grade on pass. Returns whether the trial passed and the new grade.
   */
  recordTrialResult: (
    grade: number,
    results: boolean[],
  ) => { passed: boolean; grade: number };
  /** Create or update a creation draft (autosaved by the caller). */
  saveCreation: (creation: Omit<SavedCreation, "updatedAt">) => void;
  deleteCreation: (id: string) => void;
  /** Record a finished Strike/Duel game for stats. */
  recordGameResult: (
    game: "strike",
    result: { score: number },
  ) => void;
  recordDuelResult: (outcome: "win" | "loss" | "draw") => void;
  /** Ensure this week's contest exists (seeded bot bracket). */
  ensureContestWeek: (weekId: string, palette: Palette) => void;
  /**
   * Submit a creation to the week's contest. Returns harmony points paid
   * (submission reward, once per creation per week; 0 when already in).
   */
  submitContestEntry: (weekId: string, entry: ContestEntry) => number;
  /** Record a head-to-head vote in the week's contest. */
  voteContest: (weekId: string, matchup: ContestMatchup, winnerId: string) => void;
  /**
   * Claim the vote-every-matchup bonus once per week. Returns points paid.
   */
  claimContestVoteBonus: (weekId: string) => number;
  /** Record a daily quest completion (idempotent per day). */
  completeQuest: (id: QuestId) => void;
  /**
   * Claim a completed quest's point reward. Returns true when points were
   * paid; claiming is explicit so quest payouts never disturb the lesson
   * and game point accounting.
   */
  claimQuest: (id: QuestId) => boolean;
  replaceSave: (json: string) => { ok: true } | { ok: false; reason: string };
  resetSave: () => void;
};

function loadProfiles(): ProfilesData {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (raw) {
      const data = migrateToProfiles(JSON.parse(raw));
      if (data) {
        // Retire a stale legacy key if both somehow exist.
        try {
          localStorage.removeItem(SAVE_KEY);
        } catch {
          /* ignore */
        }
        return data;
      }
    }
  } catch {
    /* fall through to legacy / fresh */
  }
  return migrateLegacyStorage() ?? defaultProfiles();
}

/**
 * Adopt a pre-profiles single save (SAVE_KEY): run it through the save
 * migration chain, wrap it into a "Default" profile, persist under
 * PROFILES_KEY, and retire the legacy key. Exported for tests.
 */
export function migrateLegacyStorage(): ProfilesData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = migrateToProfiles(JSON.parse(raw));
    if (!data) return null;
    try {
      localStorage.setItem(PROFILES_KEY, JSON.stringify(data));
      localStorage.removeItem(SAVE_KEY);
    } catch {
      /* adopted in memory even if the write failed */
    }
    return data;
  } catch {
    return null;
  }
}

/** Build the persisted container from current store state. */
function containerOf(s: {
  activeProfileId: string;
  profiles: Record<string, ProfileData>;
  grownUpsPin: string | null;
}): ProfilesData {
  return {
    version: PROFILES_VERSION,
    activeProfileId: s.activeProfileId,
    profiles: s.profiles,
    device: { grownUpsPin: s.grownUpsPin } satisfies DeviceSettings,
  };
}

let writeTimer: number | undefined;
function writeNow(data: ProfilesData, setStatus?: (s: SaveStatus) => void): void {
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(data));
  } catch (e) {
    setStatus?.(
      e instanceof DOMException && e.name === "QuotaExceededError" ? "quota-exceeded" : "unavailable",
    );
  }
}
/**
 * Debounced persist. The container is built from live state at fire time,
 * so a profile switch (written synchronously) can never be clobbered by a
 * stale debounced write.
 */
function persist(setStatus: (s: SaveStatus) => void): void {
  window.clearTimeout(writeTimer);
  writeTimer = window.setTimeout(() => writeNow(containerOf(useStore.getState()), setStatus), 150);
}
/** Identity changes (switch/add/delete/PIN) persist synchronously. */
function persistNow(setStatus: (s: SaveStatus) => void): void {
  window.clearTimeout(writeTimer);
  writeNow(containerOf(useStore.getState()), setStatus);
}

/**
 * Flush any pending debounced write synchronously when the page is being
 * torn down. Without this, the last ~150ms of progress could be lost when
 * the tab closes before the debounce fires.
 */
function flushSync(): void {
  window.clearTimeout(writeTimer);
  writeNow(containerOf(useStore.getState()));
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flushSync);
}

const initial = loadProfiles();
const initialActive = initial.profiles[initial.activeProfileId];

export const useStore = create<Store>()((set, get) => ({
  save: initialActive.save,
  saveStatus: "ok",
  activeProfileId: initial.activeProfileId,
  profiles: initial.profiles,
  grownUpsPin: initial.device.grownUpsPin,

  setGrownUpsPin: (pin) => {
    set({ grownUpsPin: pin });
    persistNow((saveStatus) => set({ saveStatus }));
  },

  switchProfile: (id) => {
    const state = get();
    if (!state.profiles[id] || id === state.activeProfileId) return;
    set({ activeProfileId: id, save: state.profiles[id].save });
    persistNow((saveStatus) => set({ saveStatus }));
  },

  addProfile: (name, avatar) => {
    const profile = newProfile(name, avatar);
    set((state) => ({
      profiles: { ...state.profiles, [profile.id]: profile },
      activeProfileId: profile.id,
      save: profile.save,
    }));
    persistNow((saveStatus) => set({ saveStatus }));
    return profile.id;
  },

  updateProfile: (id, patch) => {
    const state = get();
    const profile = state.profiles[id];
    if (!profile) return;
    const renamed =
      patch.name === undefined
        ? profile.name
        : patch.name.trim().slice(0, MAX_PROFILE_NAME_LENGTH) || profile.name;
    set({
      profiles: {
        ...state.profiles,
        [id]: {
          ...profile,
          name: sanitizeProfileName(renamed),
          avatar: patch.avatar === undefined ? profile.avatar : sanitizeAvatar(patch.avatar),
        },
      },
    });
    persistNow((saveStatus) => set({ saveStatus }));
  },

  deleteProfile: (id) => {
    const state = get();
    if (!state.profiles[id]) return;
    const remaining = Object.values(state.profiles)
      .filter((p) => p.id !== id)
      .sort((a, b) => a.createdAt - b.createdAt);
    if (remaining.length === 0) {
      // Last profile out: start over with a fresh default rather than an
      // empty, unusable container.
      const fresh = defaultProfiles();
      const only = fresh.profiles[fresh.activeProfileId];
      set({ profiles: fresh.profiles, activeProfileId: fresh.activeProfileId, save: only.save });
    } else {
      const profiles = { ...state.profiles };
      delete profiles[id];
      const activeProfileId =
        state.activeProfileId === id ? remaining[0].id : state.activeProfileId;
      set({ profiles, activeProfileId, save: profiles[activeProfileId].save });
    }
    persistNow((saveStatus) => set({ saveStatus }));
  },

  update: (fn) => {
    const state = get();
    const save = { ...fn(state.save), updatedAt: Date.now() };
    const profile = state.profiles[state.activeProfileId];
    const profiles = profile
      ? { ...state.profiles, [state.activeProfileId]: { ...profile, save } }
      : state.profiles;
    set({ save, profiles });
    persist((saveStatus) => set({ saveStatus }));
  },

  updateSettings: (patch) =>
    get().update((s) => ({ ...s, settings: { ...s.settings, ...patch } })),

  openLesson: (lessonId) =>
    get().update((s) => ({
      ...s,
      lessons: { ...s.lessons, [lessonId]: s.lessons[lessonId] ?? startLesson(lessonId) },
    })),

  setLessonStep: (lessonId, step) =>
    get().update((s) => {
      const prev = s.lessons[lessonId] ?? startLesson(lessonId);
      return { ...s, lessons: { ...s.lessons, [lessonId]: { ...prev, step } } };
    }),

  answerCheck: (lessonId, checkId, correct, assisted) => {
    const prev = get().save.lessons[lessonId] ?? startLesson(lessonId);
    const { checks, isFirst } = recordCheck(prev.checks, checkId, correct, assisted);
    const correctFirstTry = correct && !assisted && isFirst;
    get().update((s) =>
      stampQuest(
        {
          ...s,
          lessons: { ...s.lessons, [lessonId]: { ...prev, checks } },
        },
        "learn",
      ),
    );
    return { correctFirstTry, isFirst };
  },

  finishLesson: (lessonId) => {
    const prev = get().save.lessons[lessonId] ?? startLesson(lessonId);
    const { progress, points } = completeLesson(prev);
    get().update((s) => ({
      ...s,
      lessons: { ...s.lessons, [lessonId]: progress },
      harmonyPoints: s.harmonyPoints + points,
    }));
    return points;
  },

  recordConcept: (review) =>
    get().update((s) => ({ ...s, concepts: { ...s.concepts, [review.conceptId]: review } })),

  recordTaskAttempt: (lessonId, taskId, attempt) => {
    const prev = get().save.lessons[lessonId] ?? startLesson(lessonId);
    const existing = prev.tasks.find((t) => t.taskId === taskId);
    // Return value describes THIS attempt; stored evidence is sticky.
    const thisAttemptFirstTry = !existing && attempt.correct && !attempt.assisted;
    const firstCheckCorrect = existing?.firstCheckCorrect === true || thisAttemptFirstTry;
    const record = {
      taskId,
      draft: attempt.draft,
      feedback: attempt.feedback,
      firstCheckCorrect,
      assisted: attempt.assisted || existing?.assisted === true,
      updatedAt: Date.now(),
    };
    const tasks = existing
      ? prev.tasks.map((t) => (t.taskId === taskId ? record : t))
      : [...prev.tasks, record];
    get().update((s) => {
      const next: SaveData = {
        ...s,
        lessons: { ...s.lessons, [lessonId]: { ...prev, tasks } },
      };
      // Adaptive engine evidence (Phase 1): per-domain attempt log +
      // confusion pairs. Pure helpers; judgment logic untouched.
      if (attempt.taskKind) {
        const kind = attempt.taskKind;
        const entry: AdaptiveAttempt = {
          at: Date.now(),
          correct: attempt.correct,
          firstTry: thisAttemptFirstTry,
          assisted: attempt.assisted,
        };
        next.adaptiveAttempts = {
          ...next.adaptiveAttempts,
          [kind]: appendAttempt(next.adaptiveAttempts[kind] ?? [], entry),
        };
        if (CONFUSION_DOMAINS.has(kind) && typeof attempt.answer === "string") {
          const correct = attempt.answer;
          if (!attempt.correct && !attempt.assisted && typeof attempt.draft === "string" && attempt.draft !== correct) {
            const key = confusionKey(kind, correct, attempt.draft);
            next.confusion = {
              ...next.confusion,
              [key]: recordConfusionMiss(next.confusion[key] ?? null, kind, correct, attempt.draft),
            };
          } else if (attempt.correct && !attempt.assisted) {
            next.confusion = recordConfusionHit(next.confusion, kind, correct);
          }
        }
      }
      return next;
    });
    return thisAttemptFirstTry;
  },

  recordConfusionRecall: (domain, correct, wasCorrect) =>
    get().update((s) => {
      const prefix = `${domain}|||${correct}|||`;
      if (!wasCorrect) {
        // A miss in the drill re-arms the pair as due now.
        const key = Object.keys(s.confusion).find((k) => k.startsWith(prefix));
        if (!key) return s;
        const pair = s.confusion[key]!;
        return {
          ...s,
          confusion: {
            ...s.confusion,
            [key]: recordConfusionMiss(pair, pair.domain, pair.correct, pair.chosen),
          },
        };
      }
      return { ...s, confusion: recordConfusionHit(s.confusion, domain, correct) };
    }),

  answerNote: (note, correct, correctFirstTry, recentAccuracy) => {
    const prev: NoteEvidence | null = get().save.noteEvidence[note] ?? null;
    const { evidence, cleared } = recordNoteAnswer(prev, note, correct, correctFirstTry, recentAccuracy);
    get().update((s) => ({
      ...s,
      noteEvidence: { ...s.noteEvidence, [note]: evidence },
    }));
    return cleared;
  },

  addPoints: (n) => get().update((s) => ({ ...s, harmonyPoints: s.harmonyPoints + n })),

  touchLearningDay: () =>
    get().update((s) => ({ ...s, learningDays: recordLearningDay(s.learningDays) })),

  setGrade: (grade) =>
    get().update((s) => ({ ...s, grade: Math.max(0, Math.min(10, Math.round(grade))) })),

  recordTrialResult: (grade, results) => {
    const passed = trialPassed(results, grade);
    const correct = results.filter(Boolean).length;
    const next = get().save.grade === grade ? advanceGrade(grade, passed) : get().save.grade;
    get().update((s) => ({
      ...s,
      grade: next,
      gradeWindows: {
        ...s.gradeWindows,
        [String(grade)]: { attempts: results.length, correct },
      },
    }));
    return { passed, grade: next };
  },

  saveCreation: (creation) =>
    get().update((s) => {
      const record: SavedCreation = { ...creation, updatedAt: Date.now() };
      const existing = s.creations.some((c) => c.id === record.id);
      return stampQuest(
        {
          ...s,
          creations: existing
            ? s.creations.map((c) => (c.id === record.id ? record : c))
            : [...s.creations, record],
        },
        "create",
      );
    }),

  deleteCreation: (id) =>
    get().update((s) => ({ ...s, creations: s.creations.filter((c) => c.id !== id) })),

  recordGameResult: (game, result) =>
    get().update((s) => {
      if (game !== "strike") return s;
      const stats: GameStats = {
        ...s.gameStats,
        strikePlays: s.gameStats.strikePlays + 1,
        strikeBest: Math.max(s.gameStats.strikeBest, result.score),
      };
      return stampQuest({ ...s, gameStats: stats }, "play");
    }),

  recordDuelResult: (outcome) =>
    get().update((s) => {
      const day = todayKey();
      return stampQuest(
        {
          ...s,
          gameStats: {
            ...s.gameStats,
            duelWins: s.gameStats.duelWins + (outcome === "win" ? 1 : 0),
            duelLosses: s.gameStats.duelLosses + (outcome === "loss" ? 1 : 0),
            duelDraws: s.gameStats.duelDraws + (outcome === "draw" ? 1 : 0),
            // Anti-farming: cooldown anchor + per-day count for diminishing returns.
            lastDuelAt: Date.now(),
            duelDayCounts: {
              ...s.gameStats.duelDayCounts,
              [day]: (s.gameStats.duelDayCounts[day] ?? 0) + 1,
            },
          },
        },
        "play",
      );
    }),

  ensureContestWeek: (weekId, palette) =>
    get().update((s) => {
      if (s.contests[weekId]) return s;
      const weeks = { ...s.contests, [weekId]: createContestWeek(weekId, palette) };
      return { ...s, contests: pruneContestWeeks(weeks) };
    }),

  submitContestEntry: (weekId, entry) => {
    const week = get().save.contests[weekId];
    if (!week) return 0;
    const next = submitToContest(week, entry);
    if (!next) return 0; // already submitted
    const points = submissionPointsDue(week, entry.id);
    get().update((s) => ({
      ...s,
      contests: {
        ...s.contests,
        [weekId]: {
          ...next,
          rewardsPaid: {
            ...next.rewardsPaid,
            submissions: [...next.rewardsPaid.submissions, entry.id],
          },
        },
      },
      harmonyPoints: s.harmonyPoints + points,
    }));
    return points;
  },

  voteContest: (weekId, matchup, winnerId) =>
    get().update((s) => {
      const week = s.contests[weekId];
      if (!week) return s;
      return { ...s, contests: { ...s.contests, [weekId]: voteInContest(week, matchup, winnerId) } };
    }),

  /** Claim the vote-every-matchup bonus once; returns points paid (0 or bonus). */
  claimContestVoteBonus: (weekId) => {
    const week = get().save.contests[weekId];
    if (!week || !votingBonusAvailable(week)) return 0;
    get().update((s) => {
      const w = s.contests[weekId];
      if (!w || !votingBonusAvailable(w)) return s;
      return {
        ...s,
        contests: {
          ...s.contests,
          [weekId]: { ...w, rewardsPaid: { ...w.rewardsPaid, votingBonus: true } },
        },
        harmonyPoints: s.harmonyPoints + CONTEST_VOTING_BONUS,
      };
    });
    return CONTEST_VOTING_BONUS;
  },

  completeQuest: (id) => get().update((s) => stampQuest(s, id)),

  claimQuest: (id) => {
    const date = todayKey();
    const { log, claimed } = claimQuestInLog(get().save.questLog, id, date);
    if (!claimed) return false;
    const quest = QUESTS.find((q) => q.id === id);
    const points = quest?.points ?? 0;
    get().update((s) => ({
      ...s,
      questLog: log,
      harmonyPoints: s.harmonyPoints + points,
    }));
    return true;
  },

  /**
   * Replace the ACTIVE profile's save with an imported backup. Other
   * profiles are untouched. The grown-ups PIN is device-level, so an
   * imported save never carries one (a stale copy from an old backup is
   * stripped, never resurrected).
   */
  replaceSave: (json) => {
    const imported = importSave(json);
    if (!imported) return { ok: false, reason: "Import failed validation and was rejected." };
    delete (imported.settings as unknown as Record<string, unknown>).grownUpsPin;
    const state = get();
    const profile = state.profiles[state.activeProfileId];
    const profiles = profile
      ? { ...state.profiles, [state.activeProfileId]: { ...profile, save: imported } }
      : state.profiles;
    set({ save: imported, profiles, saveStatus: "ok" });
    window.clearTimeout(writeTimer);
    try {
      localStorage.setItem(PROFILES_KEY, JSON.stringify(containerOf(get())));
    } catch {
      return { ok: false, reason: "Storage quota exceeded; live progress kept." };
    }
    return { ok: true };
  },

  /** Reset the ACTIVE profile's save to fresh. Other profiles are untouched. */
  resetSave: () => {
    const state = get();
    const fresh = defaultSave();
    const profile = state.profiles[state.activeProfileId];
    const profiles = profile
      ? { ...state.profiles, [state.activeProfileId]: { ...profile, save: fresh } }
      : state.profiles;
    set({ save: fresh, profiles, saveStatus: "ok" });
    window.clearTimeout(writeTimer);
    try {
      localStorage.setItem(PROFILES_KEY, JSON.stringify(containerOf(get())));
    } catch {
      /* fresh save is tiny; ignore */
    }
  },
}));
