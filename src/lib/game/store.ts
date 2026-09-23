/**
 * Persistent learner state. Zustand store backed by localStorage.
 * - Writes are debounced; every action stamps updatedAt.
 * - Import replaces the store only after validation + explicit confirmation
 *   (the caller handles confirmation UX); failures never touch live state.
 * - Storage quota failures are surfaced, never silent.
 */

import { create } from "zustand";
import {
  SAVE_KEY,
  defaultSave,
  importSave,
  migrateSave,
  type ConceptReview,
  type GameStats,
  type LessonProgress,
  type NoteEvidence,
  type SaveData,
  type SavedCreation,
  type Settings,
} from "./schema.ts";
import { completeLesson, recordCheck, recordLearningDay, startLesson } from "./learning.ts";
import { recordNoteAnswer } from "./sr.ts";
import { advanceGrade, trialPassed } from "./grades.ts";

export type SaveStatus = "ok" | "quota-exceeded" | "unavailable";

type Store = {
  save: SaveData;
  saveStatus: SaveStatus;
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
    attempt: { draft: unknown; feedback: string | null; correct: boolean; assisted: boolean },
  ) => boolean;
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
  replaceSave: (json: string) => { ok: true } | { ok: false; reason: string };
  resetSave: () => void;
};

function load(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    const migrated = migrateSave(JSON.parse(raw));
    return migrated ?? defaultSave();
  } catch {
    return defaultSave();
  }
}

let writeTimer: number | undefined;
function persist(save: SaveData, setStatus: (s: SaveStatus) => void): void {
  window.clearTimeout(writeTimer);
  writeTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    } catch (e) {
      setStatus(e instanceof DOMException && e.name === "QuotaExceededError" ? "quota-exceeded" : "unavailable");
    }
  }, 150);
}

export const useStore = create<Store>()((set, get) => ({
  save: load(),
  saveStatus: "ok",

  update: (fn) => {
    const save = { ...fn(get().save), updatedAt: Date.now() };
    set({ save });
    persist(save, (saveStatus) => set({ saveStatus }));
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
    get().update((s) => ({
      ...s,
      lessons: { ...s.lessons, [lessonId]: { ...prev, checks } },
    }));
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
    get().update((s) => ({
      ...s,
      lessons: { ...s.lessons, [lessonId]: { ...prev, tasks } },
    }));
    return thisAttemptFirstTry;
  },

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
      return {
        ...s,
        creations: existing
          ? s.creations.map((c) => (c.id === record.id ? record : c))
          : [...s.creations, record],
      };
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
      return { ...s, gameStats: stats };
    }),

  recordDuelResult: (outcome) =>
    get().update((s) => ({
      ...s,
      gameStats: {
        ...s.gameStats,
        duelWins: s.gameStats.duelWins + (outcome === "win" ? 1 : 0),
        duelLosses: s.gameStats.duelLosses + (outcome === "loss" ? 1 : 0),
        duelDraws: s.gameStats.duelDraws + (outcome === "draw" ? 1 : 0),
      },
    })),

  replaceSave: (json) => {
    const imported = importSave(json);
    if (!imported) return { ok: false, reason: "Import failed validation and was rejected." };
    set({ save: imported, saveStatus: "ok" });
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(imported));
    } catch {
      return { ok: false, reason: "Storage quota exceeded; live progress kept." };
    }
    return { ok: true };
  },

  resetSave: () => {
    const fresh = defaultSave();
    set({ save: fresh, saveStatus: "ok" });
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(fresh));
    } catch {
      /* fresh save is tiny; ignore */
    }
  },
}));
