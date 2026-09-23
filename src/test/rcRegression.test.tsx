/**
 * Release-candidate regression gates, in one contract document:
 *
 * - First-attempt / correction / assistance semantics (checks).
 * - Points: awarded once per lesson, never farmable.
 * - Grade rules: threshold shape, full 0-10 coverage, grade persistence.
 * - Persistence: debounce flush, reload fidelity, import validation,
 *   oversized rejection, quota surfacing.
 * - Cancellation: audio lanes, mute, effect keys, focus-mode policy.
 *
 * Task/note first-attempt rules have their own suites
 * (taskPlayer.test.tsx, practice.test.tsx); this file pins the
 * shared store-level and engine-level guarantees.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  COMPLETION_POINTS,
  canTransition,
} from "../lib/game/learning.ts";
import {
  GRADE_THRESHOLDS,
  levelFor,
} from "../lib/game/curriculum.ts";
import { authoredLessons } from "../lib/game/course.ts";
import {
  defaultSave,
  exportSave,
  importSave,
  validateSave,
} from "../lib/game/schema.ts";
import { useStore } from "../lib/game/store.ts";
import {
  __resetAudioForTests,
  activeToneCount,
  playSequence,
  playTone,
  setMuted,
  stopAll,
  stopLane,
} from "../lib/game/audio.ts";
import {
  __resetEffectsForTests,
  cancelEffects,
  emitEffect,
  onEffect,
  setMotionPolicy,
} from "../lib/game/effects.ts";

// --- Full fake Web Audio: taps actually schedule tones here. ---

class FakeParam {
  value = 0;
  setValueAtTime() {}
  setTargetAtTime() {}
  linearRampToValueAtTime() {}
  exponentialRampToValueAtTime() {}
  cancelScheduledValues() {}
}
class FakeNode {
  connect() {}
  disconnect() {}
}
class FakeGain extends FakeNode {
  gain = new FakeParam();
}
class FakeOsc extends FakeNode {
  type: OscillatorType = "sine";
  frequency = new FakeParam();
  start() {}
  stop() {}
}
class FakeAudioContext {
  currentTime = 0;
  state: AudioContextState = "running";
  destination = new FakeNode();
  createGain() {
    return new FakeGain();
  }
  createOscillator() {
    return new FakeOsc();
  }
  resume() {
    return Promise.resolve();
  }
  close() {
    return Promise.resolve();
  }
}

beforeAll(() => {
  (window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
});

beforeEach(() => {
  useStore.getState().resetSave();
  window.localStorage.clear();
  __resetAudioForTests();
  __resetEffectsForTests();
  setMuted(false);
  vi.useRealTimers();
});

const flushPersist = () => new Promise((r) => setTimeout(r, 300));

// ---------------------------------------------------------------- points ---

describe("points", () => {
  it("awards completion points once per lesson; repeats never farm", () => {
    const s = useStore.getState();
    const first = s.finishLesson("ch1-l1-pitch");
    expect(first).toBe(COMPLETION_POINTS);
    expect(useStore.getState().save.harmonyPoints).toBe(COMPLETION_POINTS);

    const second = useStore.getState().finishLesson("ch1-l1-pitch");
    expect(second).toBe(0);
    expect(useStore.getState().save.harmonyPoints).toBe(COMPLETION_POINTS);
  });

  it("points are per lesson, not per session", () => {
    const s = useStore.getState();
    s.finishLesson("ch1-l1-pitch");
    s.finishLesson("ch1-l2-dynamics");
    expect(useStore.getState().save.harmonyPoints).toBe(2 * COMPLETION_POINTS);
  });
});

// ---------------------------------------------------------------- grades ---

describe("grade rules", () => {
  it("thresholds tighten monotonically from 80% toward 92%", () => {
    let lastAcc = 0;
    let lastAtt = 0;
    for (let g = 0; g <= 9; g++) {
      const t = GRADE_THRESHOLDS[g]!;
      expect(t.minSessionAccuracy).toBeGreaterThanOrEqual(lastAcc);
      expect(t.minSessionAccuracy).toBeGreaterThanOrEqual(0.8);
      expect(t.minSessionAccuracy).toBeLessThanOrEqual(0.92);
      expect(t.minSessionAttempts).toBeGreaterThanOrEqual(lastAtt);
      lastAcc = t.minSessionAccuracy;
      lastAtt = t.minSessionAttempts;
    }
    expect(GRADE_THRESHOLDS[0]!.minSessionAccuracy).toBe(0.8);
    expect(GRADE_THRESHOLDS[9]!.minSessionAccuracy).toBe(0.92);
  });

  it("defines all 11 grade levels 0-10", () => {
    for (let g = 0; g <= 10; g++) expect(levelFor(g).level).toBe(g);
  });

  it("teaching content is never gated by grade", () => {
    // Lesson availability does not depend on grade: the registry is the
    // same whether the learner is grade 0 or grade 10. If grade gating is
    // ever added to lesson lookup, this contract must be revisited first.
    const lessons = authoredLessons();
    expect(lessons.length).toBeGreaterThan(0);
    for (const l of lessons) {
      expect(l.id).toBeTruthy();
      expect(l.checks).toHaveLength(2);
    }
  });

  it("grade persists across a save/load round-trip", async () => {
    useStore.getState().update((s) => ({ ...s, grade: 7 }));
    await flushPersist();
    const raw = window.localStorage.getItem("harmony-knight-save-v1");
    expect(raw).toBeTruthy();
    const loaded = importSave(raw!);
    expect(loaded?.grade).toBe(7);
  });
});

// ------------------------------------------- first-attempt / correction ---

describe("first-attempt, correction, assistance (checks)", () => {
  it("records first-try correctness precisely", () => {
    const s = useStore.getState();
    // Clean first try.
    const a = s.answerCheck("l", "c1", true, false);
    expect(a).toEqual({ correctFirstTry: true, isFirst: true });
    // Wrong first try can never become first-try-correct later.
    s.answerCheck("l", "c2", false, false);
    const b = useStore.getState().answerCheck("l", "c2", true, false);
    expect(b).toEqual({ correctFirstTry: false, isFirst: false });
    // Assisted correct is not first-try.
    const c = useStore.getState().answerCheck("l", "c3", true, true);
    expect(c.correctFirstTry).toBe(false);
    expect(c.isFirst).toBe(true);
  });

  it("wrong answers are kept as mistakes but never block progress", () => {
    const s = useStore.getState();
    s.answerCheck("ch1-l1-pitch", "ch1-l1-c1", false, false);
    s.answerCheck("ch1-l1-pitch", "ch1-l1-c2", false, false);
    // The learner can still finish the recall step and complete the lesson.
    expect(canTransition("recall", "done")).toBe(true);
    const points = useStore.getState().finishLesson("ch1-l1-pitch");
    expect(points).toBe(COMPLETION_POINTS);
    const checks = useStore.getState().save.lessons["ch1-l1-pitch"]!.checks;
    expect(checks).toHaveLength(2);
    expect(checks.every((c) => c.correctFirstTry === false)).toBe(true);
  });
});

// ------------------------------------------------------------- persistence ---

describe("persistence", () => {
  it("debounced writes land in localStorage and validate", async () => {
    const s = useStore.getState();
    s.finishLesson("ch1-l1-pitch");
    s.answerNote("C4", true, true, 1);
    s.recordConcept({ conceptId: "pulse", intervalDays: 1, dueAt: Date.now(), lastResult: "correct" });
    // Not yet: the write is debounced.
    expect(window.localStorage.getItem("harmony-knight-save-v1")).toBeNull();
    await flushPersist();
    const raw = window.localStorage.getItem("harmony-knight-save-v1");
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(validateSave(parsed)).toBe(true);
    expect(parsed.lessons["ch1-l1-pitch"].completionPointsAwarded).toBe(true);
    expect(parsed.noteEvidence["C4"].lastCorrect).toBe(true);
    expect(parsed.concepts["pulse"].intervalDays).toBe(1);
  });

  it("export/import round-trips the whole save", () => {
    const s = useStore.getState();
    s.finishLesson("ch1-l1-pitch");
    const json = exportSave(useStore.getState().save);
    const back = importSave(json);
    expect(back?.harmonyPoints).toBe(COMPLETION_POINTS);
    expect(back?.lessons["ch1-l1-pitch"].step).toBe("done");
  });

  it("failed imports never touch live state", () => {
    const s = useStore.getState();
    s.finishLesson("ch1-l1-pitch");
    const before = useStore.getState().save.harmonyPoints;
    expect(s.replaceSave("not json")).toEqual({ ok: false, reason: expect.any(String) });
    expect(s.replaceSave(JSON.stringify({ ...defaultSave(), version: 999 }))).toEqual({
      ok: false,
      reason: expect.any(String),
    });
    expect(useStore.getState().save.harmonyPoints).toBe(before);
    expect(useStore.getState().save.lessons["ch1-l1-pitch"]).toBeTruthy();
  });

  it("rejects oversized payloads", () => {
    const big = { ...defaultSave(), noteEvidence: { x: "y".repeat(6 * 1024 * 1024) } };
    expect(importSave(JSON.stringify(big))).toBeNull();
  });

  it("surfaces storage quota failures instead of going silent", async () => {
    const spy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new DOMException("quota", "QuotaExceededError");
      });
    try {
      useStore.getState().addPoints(5);
      await flushPersist();
      expect(useStore.getState().saveStatus).toBe("quota-exceeded");
      // Live progress is kept even though the write failed.
      expect(useStore.getState().save.harmonyPoints).toBe(5);
    } finally {
      spy.mockRestore();
    }
  });
});

// ------------------------------------------------------------ cancellation ---

describe("cancellation", () => {
  it("stopLane cancels every tone in that lane and reports cancellation", () => {
    const ended: boolean[] = [];
    playTone(60, { lane: "lesson", onEnd: (c) => ended.push(c) });
    playTone(64, { lane: "lesson", onEnd: (c) => ended.push(c) });
    playTone(67, { lane: "other" });
    expect(activeToneCount()).toBe(3);
    stopLane("lesson");
    expect(activeToneCount()).toBe(1); // the "other" lane survives
    expect(ended).toEqual([true, true]);
  });

  it("the per-tone cancel function removes just that tone", () => {
    const cancel = playTone(60, { lane: "k" });
    playTone(64, { lane: "k" });
    cancel();
    expect(activeToneCount()).toBe(1);
  });

  it("stopAll silences every lane (navigation / tab-hide path)", () => {
    playSequence([60, 62, 64], { lane: "a" });
    playTone(70, { lane: "b" });
    expect(activeToneCount()).toBeGreaterThan(0);
    stopAll();
    expect(activeToneCount()).toBe(0);
  });

  it("muting cancels in-flight sound", () => {
    playTone(60, { lane: "music" });
    expect(activeToneCount()).toBe(1);
    setMuted(true);
    expect(activeToneCount()).toBe(0);
  });

  it("re-emitting with the same effect key cancels the prior effect", () => {
    const cleanups: string[] = [];
    const seen: string[] = [];
    const unsub = onEffect((resolved) => {
      seen.push(resolved.request.event);
      return () => cleanups.push(resolved.request.cancelKey!);
    });
    try {
      emitEffect({ event: "correct", cancelKey: "check-1" });
      emitEffect({ event: "needs-work", cancelKey: "check-1" });
      expect(cleanups).toEqual(["check-1"]); // first effect cleaned up by the second
      expect(seen).toEqual(["correct", "needs-work"]);
      cancelEffects("check-1");
      expect(cleanups).toEqual(["check-1", "check-1"]);
    } finally {
      unsub();
    }
  });

  it("cancelEffects() with no key clears everything", () => {
    let cleaned = 0;
    const unsub = onEffect(() => () => {
      cleaned += 1;
    });
    try {
      emitEffect({ event: "correct", cancelKey: "a" });
      emitEffect({ event: "correct", cancelKey: "b" });
      cancelEffects();
      expect(cleaned).toBe(2);
    } finally {
      unsub();
    }
  });

  it("focus mode suppresses fever theatrics", () => {
    setMotionPolicy({ focusMode: true, reducedMotion: false, highContrast: false, muted: false });
    let fired = 0;
    const unsub = onEffect(() => {
      fired += 1;
    });
    try {
      emitEffect({ event: "fever" });
      expect(fired).toBe(0);
      emitEffect({ event: "correct" });
      expect(fired).toBe(1);
    } finally {
      unsub();
    }
  });
});
