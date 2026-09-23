/**
 * TaskPlayer UI + store-level tests for the practical task family.
 *
 * RC evidence: tasks expose pure judgment, progressive hints mark attempts
 * assisted, first-try evidence is sticky, and TaskDrafts persist per lesson.
 */
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TaskPlayer } from "../components/game/TaskPlayer.tsx";
import { buildComparePitchTask, buildNoteIdTask, buildRhythmEchoTask, buildTask } from "../lib/game/tasks.ts";
import { midiToName } from "../lib/game/music.ts";
import { useStore } from "../lib/game/store.ts";

class FakeGain {
  gain = { value: 0 };
  connect() {}
}
class FakeOsc {
  type: OscillatorType = "sine";
  frequency = { value: 440 };
  connect() {}
  start() {}
  stop() {}
}
class FakeAudioContext {
  currentTime = 0;
  state: AudioContextState = "running";
  destination = {};
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
});

describe("recordTaskAttempt (store)", () => {
  it("records first-try correct unassisted as firstCheckCorrect", () => {
    const first = useStore.getState().recordTaskAttempt("ch1-l1-pitch", "compare-pitch:7", {
      draft: 1,
      feedback: "praise",
      correct: true,
      assisted: false,
    });
    expect(first).toBe(true);
    const rec = useStore.getState().save.lessons["ch1-l1-pitch"]!.tasks[0];
    expect(rec.firstCheckCorrect).toBe(true);
    expect(rec.assisted).toBe(false);
    expect(rec.draft).toBe(1);
  });

  it("is sticky: later attempts never erase first-try evidence", () => {
    const s = useStore.getState();
    s.recordTaskAttempt("l", "t", { draft: 1, feedback: null, correct: true, assisted: false });
    const second = useStore.getState().recordTaskAttempt("l", "t", { draft: 2, feedback: null, correct: false, assisted: false });
    expect(second).toBe(false);
    const rec = useStore.getState().save.lessons["l"]!.tasks[0];
    expect(rec.firstCheckCorrect).toBe(true);
  });

  it("assisted attempts are not first-try and assistance sticks", () => {
    const s = useStore.getState();
    const r1 = s.recordTaskAttempt("l", "t", { draft: 1, feedback: null, correct: true, assisted: true });
    expect(r1).toBe(false);
    useStore.getState().recordTaskAttempt("l", "t", { draft: 1, feedback: null, correct: true, assisted: false });
    expect(useStore.getState().save.lessons["l"]!.tasks[0].assisted).toBe(true);
  });
});

describe("buildTask dispatcher", () => {
  it("builds the compare-pitch family deterministically", () => {
    const a = buildTask("ch1-l1-pitch", { kind: "compare-pitch", seed: 7 });
    const b = buildTask("ch1-l1-pitch", { kind: "compare-pitch", seed: 7 });
    expect(a.taskId).toBe(b.taskId);
    expect(a.audio!.notes).toEqual(b.audio!.notes);
  });
  it("dispatches every authored family without throwing", () => {
    expect(buildTask("l", { kind: "compare-pitch", seed: 1 }).kind).toBe("compare-pitch");
    expect(buildTask("l", { kind: "note-id", seed: 1 }).kind).toBe("note-id");
    expect(buildTask("l", { kind: "rhythm-echo", seed: 1 }).kind).toBe("rhythm-echo");
    expect(buildTask("l", { kind: "scale-id", seed: 1 }).kind).toBe("scale-id");
    expect(buildTask("l", { kind: "interval-id", seed: 1 }).kind).toBe("interval-id");
    expect(buildTask("l", { kind: "chord-id", seed: 1, variant: "quality" }).kind).toBe("chord-id");
    expect(buildTask("l", { kind: "cadence-id", seed: 1, variant: "final" }).kind).toBe("cadence-id");
    expect(buildTask("l", { kind: "motion-id", seed: 1 }).kind).toBe("motion-id");
    expect(buildTask("l", { kind: "modulation-id", seed: 1, variant: "detect" }).kind).toBe("modulation-id");
    expect(buildTask("l", { kind: "self-attempt", seed: 1 }).kind).toBe("self-attempt");
  });
});

describe("TaskPlayer (UI)", () => {
  it("plays the task, judges attempts, reveals progressive hints, and records the draft", () => {
    const task = buildComparePitchTask(7);
    const notes = task.audio!.notes;
    const correctButton = notes[0] > notes[1] ? "Note 1 is higher" : "Note 2 is higher";
    const wrongButton = notes[0] > notes[1] ? "Note 2 is higher" : "Note 1 is higher";

    render(<TaskPlayer lessonId="ch1-l1-pitch" task={task} />);
    expect(screen.getByTestId("task-player")).toBeTruthy();
    expect(screen.getByText(/Which one is higher in pitch/)).toBeTruthy();

    // Wrong attempt first: nudge appears, no praise.
    fireEvent.click(screen.getByText(wrongButton));
    expect(screen.getByText(/Listen once more/)).toBeTruthy();

    // Progressive hint marks the attempt assisted.
    fireEvent.click(screen.getByText(/Need a hint/));
    expect(screen.getByText(/Hint 1:/)).toBeTruthy();

    // Correct attempt after a hint: praise appears, recorded as assisted.
    fireEvent.click(screen.getByText(correctButton));
    expect(screen.getByText(/your ears knew/)).toBeTruthy();

    const rec = useStore.getState().save.lessons["ch1-l1-pitch"]!.tasks[0];
    expect(rec.taskId).toBe(task.taskId);
    expect(rec.firstCheckCorrect).toBe(false); // first attempt was wrong
    expect(rec.assisted).toBe(true); // hint was revealed
    expect(rec.feedback).toContain("your ears knew");
  });

  it("a clean first-try solve records firstCheckCorrect", () => {
    const task = buildComparePitchTask(7);
    const notes = task.audio!.notes;
    const correctButton = notes[0] > notes[1] ? "Note 1 is higher" : "Note 2 is higher";
    render(<TaskPlayer lessonId="ch1-l1-pitch" task={task} />);
    fireEvent.click(screen.getByText(correctButton));
    const rec = useStore.getState().save.lessons["ch1-l1-pitch"]!.tasks[0];
    expect(rec.firstCheckCorrect).toBe(true);
    expect(rec.assisted).toBe(false);
    expect(screen.getByText(/First try!/)).toBeTruthy();
  });

  it("renders one player per rhythm-echo segment and judges the match", () => {
    const task = buildRhythmEchoTask(31);
    const answer = task.choices!.find((c) => task.judge(c))!;
    render(<TaskPlayer lessonId="ch3-l1-durations" task={task} />);
    expect(screen.getByText("Target rhythm")).toBeTruthy();
    expect(screen.getByText("Candidate 1")).toBeTruthy();
    expect(screen.getByText("Candidate 2")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: answer }));
    expect(screen.getByText(/shape of time/)).toBeTruthy();
    const rec = useStore.getState().save.lessons["ch3-l1-durations"]!.tasks[0];
    expect(rec.firstCheckCorrect).toBe(true);
  });

  it("renders fixed answer choices for the note-id family and judges them", () => {
    const task = buildNoteIdTask(21);
    const answer = midiToName(task.audio!.notes[0]!);
    render(<TaskPlayer lessonId="ch2-l1-alphabet" task={task} />);
    for (const c of task.choices!) {
      expect(screen.getByRole("button", { name: c })).toBeTruthy();
    }
    fireEvent.click(screen.getByRole("button", { name: answer }));
    expect(screen.getByText(/The alphabet is becoming sound/)).toBeTruthy();
    const rec = useStore.getState().save.lessons["ch2-l1-alphabet"]!.tasks[0];
    expect(rec.firstCheckCorrect).toBe(true);
    expect(rec.draft).toBe(answer);
  });
});
