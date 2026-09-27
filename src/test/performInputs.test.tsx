/**
 * UI tests for the performance attempt inputs: keyboard, tap pad, and
 * microphone. These exercise the TaskPlayer wiring — the judgment itself
 * is covered exhaustively in the pure-function tests.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { TaskPlayer } from "../components/game/TaskPlayer.tsx";
import type { PracticalTask } from "../lib/game/tasks.ts";

function renderWithRouter(task: PracticalTask, lessonId: string) {
  const rootRoute = createRootRoute({});
  const route = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => <TaskPlayer lessonId={lessonId} task={task} />,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([route]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return render(<RouterProvider router={router} />);
}
import {
  buildDynamicsIdTask,
  buildParallelIdTask,
  buildPerformNoteTask,
  buildPivotIdTask,
  buildRhythmTapTask,
  buildSingBackTask,
  buildStaffIdTask,
  buildTask,
} from "../lib/game/tasks.ts";
import { midiToName } from "../lib/game/music.ts";
import { useStore } from "../lib/game/store.ts";
import { beforeEach } from "vitest";

beforeEach(() => {
  useStore.getState().resetSave();
  window.localStorage.clear();
  // TapPadAttempt unlocks audio on each tap; jsdom has no AudioContext.
  vi.stubGlobal(
    "AudioContext",
    class {
      state = "running";
      resume() {}
      createGain() {
        return { gain: { value: 0 }, connect() {} };
      }
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("KeyboardAttempt (perform-note)", () => {
  it("taps the closing sigh back note-for-note and records the draft", () => {
    const task = buildPerformNoteTask(104, "closing");
    render(<TaskPlayer lessonId="ch10-l2-closing" task={task} />);
    expect(screen.getByText(/closing sigh/)).toBeTruthy();

    // Tapping caps at the expected tap count.
    for (const name of ["F4", "E4", "C4", "D4"])
      fireEvent.click(screen.getByLabelText(name));
    expect(screen.getByText(/Tapped \(3\/3\): F4 – E4 – C4/)).toBeTruthy();

    fireEvent.click(screen.getByText("Check these notes"));
    expect(screen.getByText(/tension melting into home/)).toBeTruthy();
    const rec = useStore.getState().save.lessons["ch10-l2-closing"]!.tasks[0];
    expect(rec.firstCheckCorrect).toBe(true);
    expect(rec.draft).toEqual([65, 64, 60]);
  });

  it("a wrong order gets the nudge and stays retryable", () => {
    const task = buildPerformNoteTask(104, "closing");
    render(<TaskPlayer lessonId="ch10-l2-closing" task={task} />);
    for (const name of ["C4", "E4", "F4"])
      fireEvent.click(screen.getByLabelText(name));
    fireEvent.click(screen.getByText("Check these notes"));
    expect(screen.getByText(/Not quite/)).toBeTruthy();
    // Clear and retry works.
    fireEvent.click(screen.getByText("Clear"));
    expect(screen.getByText(/Tap 3 notes on the keyboard/)).toBeTruthy();
  });
});

describe("TapPadAttempt (rhythm-tap)", () => {
  it("a rhythm tapped on the onsets judges correct through the UI", () => {
    const task = buildRhythmTapTask(35);
    // Expected onsets recomputed from the rendered durations.
    const durs = task.audio!.durations!;
    const onsets: number[] = [];
    let t = 0;
    for (const d of durs) {
      onsets.push(Math.round(t * 1000));
      t += d;
    }
    vi.useFakeTimers();
    try {
      render(<TaskPlayer lessonId="ch3-l4-rests" task={task} />);
      const pad = screen.getByLabelText("Tap the rhythm pad");
      let prev = 0;
      for (const o of onsets) {
        vi.advanceTimersByTime(o - prev);
        prev = o;
        fireEvent.click(pad);
      }
      fireEvent.click(screen.getByText("Done — check my rhythm"));
      expect(screen.getByText(/you played time itself back/)).toBeTruthy();
      const rec = useStore.getState().save.lessons["ch3-l4-rests"]!.tasks[0];
      expect(rec.firstCheckCorrect).toBe(true);
      expect(rec.draft).toEqual(onsets);
    } finally {
      vi.useRealTimers();
    }
  });

  it("sloppy tapping gets the nudge", () => {
    const task = buildRhythmTapTask(35);
    render(<TaskPlayer lessonId="ch3-l4-rests" task={task} />);
    const pad = screen.getByLabelText("Tap the rhythm pad");
    fireEvent.click(pad);
    fireEvent.click(pad); // two instant taps: wrong shape
    fireEvent.click(screen.getByText("Done — check my rhythm"));
    expect(screen.getByText(/Listen once more and tap along/)).toBeTruthy();
  });
});

describe("MicAttempt (sing-back)", () => {
  it("explains gracefully when the microphone is unavailable", async () => {
    const task = buildSingBackTask(103);
    renderWithRouter(task, "ch10-l1-shape");
    fireEvent.click(await screen.findByText(/Turn on the microphone/));
    // jsdom has no mediaDevices: MicPitch reports unsupported.
    expect(await screen.findByText(/microphone isn't available/)).toBeTruthy();
    expect(await screen.findByText(/Singing Studio/)).toBeTruthy();
  });
});

describe("new choice families in TaskPlayer", () => {
  it("dynamics-id renders and judges the gain direction", () => {
    const task = buildDynamicsIdTask(8);
    const gains = task.audio!.gains!;
    const expected =
      gains[3]! > gains[0]!
        ? "Crescendo — growing louder"
        : "Diminuendo — growing softer";
    render(<TaskPlayer lessonId="ch1-l2-dynamics" task={task} />);
    fireEvent.click(screen.getByRole("button", { name: expected }));
    expect(screen.getByText(/You're hearing shape in loudness/)).toBeTruthy();
  });

  it("staff-id produce renders the staff visual and the keyboard", () => {
    const task = buildStaffIdTask(22, "produce");
    render(<TaskPlayer lessonId="ch2-l2-staff" task={task} />);
    expect(screen.getByRole("img", { name: "Staff notation" })).toBeTruthy();
    const v = task.visual!;
    const target = v.kind === "staff" ? v.notes[0]! : -1;
    fireEvent.click(screen.getByLabelText(midiToName(target)));
    fireEvent.click(screen.getByText("Check these notes"));
    expect(screen.getByText(/read and played/)).toBeTruthy();
  });

  it("parallel-id renders one duet player per candidate", () => {
    const task = buildParallelIdTask(72);
    render(<TaskPlayer lessonId="ch7-l2-parallels" task={task} />);
    expect(screen.getAllByTestId("duet-player")).toHaveLength(2);
    const answer = task.choices!.find((c) => task.judge(c))!;
    fireEvent.click(screen.getByRole("button", { name: answer }));
    expect(screen.getByText(/like a proper council/)).toBeTruthy();
  });

  it("pivot-id renders the old key, the pivot, and the new key", () => {
    const task = buildPivotIdTask(82);
    render(<TaskPlayer lessonId="ch8-l2-pivot" task={task} />);
    expect(screen.getByText("Old key: C major")).toBeTruthy();
    expect(screen.getByText(/The pivot chord/)).toBeTruthy();
    expect(screen.getByText(/New key:/)).toBeTruthy();
    const answer = task.choices!.find((c) => task.judge(c))!;
    fireEvent.click(screen.getByRole("button", { name: answer }));
    expect(screen.getByText(/You watched the doorway swing/)).toBeTruthy();
  });

  it("buildTask wires the replaced lessons end to end", () => {
    const t = buildTask("ch10-l2-closing", {
      kind: "perform-note",
      seed: 104,
      variant: "closing",
    });
    render(<TaskPlayer lessonId="ch10-l2-closing" task={t} />);
    expect(screen.getByTestId("task-player")).toBeTruthy();
    expect(screen.getByLabelText("Piano keyboard, one octave")).toBeTruthy();
  });
});
