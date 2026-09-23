/**
 * Full lesson-flow smoke test through the real components and real store.
 *
 * Covers the browser QA steps we can't run from a sandboxed browser:
 * onboarding -> first lesson -> Learn -> Try -> Recall -> Done, answering
 * checks through the UI, explanations appearing, completion points awarded,
 * and persistence surviving a simulated reload (fresh store from localStorage).
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  createRootRoute,
  createRoute,
  createRouter,
  createMemoryHistory,
  RouterProvider,
} from "@tanstack/react-router";
import { OnboardingScreen } from "../routes/Screens.tsx";
import { LessonScreen } from "../routes/LessonScreen.tsx";
import { useStore } from "../lib/game/store.ts";
import { SAVE_KEY } from "../lib/game/schema.ts";

// Minimal fake Web Audio so audio.ts never touches the real thing.
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

function makeTestRouter(initialPath: string) {
  const rootRoute = createRootRoute();
  const onboardingRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/onboarding",
    component: OnboardingScreen,
  });
  const lessonRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/lesson/$lessonId",
    component: function LessonRoute() {
      const { lessonId } = lessonRoute.useParams();
      return <LessonScreen lessonId={lessonId} />;
    },
  });
  const routeTree = rootRoute.addChildren([onboardingRoute, lessonRoute]);
  const history = createMemoryHistory({ initialEntries: [initialPath] });
  return createRouter({ routeTree, history });
}

beforeAll(() => {
  (window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
});

beforeEach(() => {
  useStore.getState().resetSave();
  window.localStorage.clear();
});

const flushPersist = () => new Promise((r) => setTimeout(r, 300));

describe("lesson flow", () => {
  it("onboarding -> learn -> try -> recall -> done, through the real UI", async () => {
    render(<RouterProvider router={makeTestRouter("/onboarding")} />);

    // 1. Onboarding renders.
    expect(await screen.findByText("Quest of the Harmony Knight")).toBeTruthy();

    // 2. Begin the first lesson.
    fireEvent.click(screen.getByText("Begin the first lesson"));
    await waitFor(() => expect(screen.getByText("High and Low: Pitch")).toBeTruthy());

    // 3. Learn -> Try.
    fireEvent.click(screen.getByText("Continue to Try it"));
    expect(screen.getByText(/check my recall/i)).toBeTruthy();

    // 4. Try -> Recall.
    fireEvent.click(screen.getByText(/I've tried it — check my recall/i));
    expect(screen.getByText(/The second is higher than the first/)).toBeTruthy();

    // 5. Answer check 1 WRONG ("Descending"), explanation appears.
    fireEvent.click(screen.getByText("Descending"));
    await waitFor(() =>
      expect(screen.getByText(/Ascending means moving to a higher pitch/)).toBeTruthy(),
    );

    // 6. Answer check 2 RIGHT ("The dynamics"), explanation appears.
    fireEvent.click(screen.getByText("The dynamics"));
    await waitFor(() =>
      expect(screen.getByText(/Only the loudness changed/)).toBeTruthy(),
    );

    // 7. Finish the lesson.
    fireEvent.click(screen.getByText("Finish lesson"));
    await waitFor(() => expect(screen.getByText("Lesson complete")).toBeTruthy());
    expect(screen.getByText(/harmony points — first completion/)).toBeTruthy();

    // 8. Store reflects the finished lesson.
    const save = useStore.getState().save;
    expect(save.lessons["ch1-l1-pitch"]?.step).toBe("done");
    const checks = save.lessons["ch1-l1-pitch"]?.checks ?? [];
    const c1 = checks.find((c) => c.checkId === "ch1-l1-c1");
    const c2 = checks.find((c) => c.checkId === "ch1-l1-c2");
    expect(c1?.correctFirstTry).toBe(false); // answered "Descending" first
    expect(c2?.correctFirstTry).toBe(true); // answered "The dynamics" first
    expect(c1?.assisted).toBe(false);
    expect(save.harmonyPoints).toBeGreaterThan(0);
    // Recall scheduled for the pitch-direction concept.
    expect(save.concepts["pitch-direction"]?.dueAt).toBeGreaterThan(Date.now());
  });

  it("completion survives a simulated reload (fresh store from localStorage)", async () => {
    // Drive the flow via the store + a rendered lesson to the Done step.
    render(<RouterProvider router={makeTestRouter("/lesson/ch1-l2-dynamics")} />);
    await waitFor(() => expect(screen.getByText("Loud and Soft: Dynamics")).toBeTruthy());

    useStore.getState().finishLesson("ch1-l2-dynamics");
    await flushPersist();

    const raw = window.localStorage.getItem(SAVE_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!).lessons["ch1-l2-dynamics"].step).toBe("done");

    // Simulated reload: fresh module registry -> fresh store hydrates from localStorage.
    vi.resetModules();
    const fresh = await import("../lib/game/store.ts");
    const freshSave = fresh.useStore.getState().save;
    expect(freshSave.lessons["ch1-l2-dynamics"]?.step).toBe("done");
  });
});
