/**
 * Games milestone tests: hub, studies unlocks, creations, strike/duel
 * screens, grade trials in the store, and focus-mode collapsing.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, within, act } from "@testing-library/react";
import {
  createRootRoute,
  createRoute,
  createRouter,
  createMemoryHistory,
  RouterProvider,
} from "@tanstack/react-router";
import { GamesScreen } from "../routes/GamesScreen.tsx";
import { StudiesHubScreen, StudyDrillScreen, unlockedStudies } from "../routes/StudiesScreen.tsx";
import { CreationsScreen } from "../routes/CreationsScreen.tsx";
import { StrikeScreen } from "../routes/StrikeScreen.tsx";
import { DuelScreen } from "../routes/DuelScreen.tsx";
import { GradesScreen } from "../routes/GradesScreen.tsx";
import { HomeScreen } from "../routes/Screens.tsx";
import { useStore } from "../lib/game/store.ts";
import { parseCreationData } from "../lib/game/creations.ts";
import { trialRequirement } from "../lib/game/grades.ts";

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
  const routes = [
    createRoute({ getParentRoute: () => rootRoute, path: "/", component: HomeScreen }),
    createRoute({ getParentRoute: () => rootRoute, path: "/games", component: GamesScreen }),
    createRoute({ getParentRoute: () => rootRoute, path: "/studies", component: StudiesHubScreen }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: "/studies/$studyId",
      component: StudyDrillScreen,
    }),
    createRoute({ getParentRoute: () => rootRoute, path: "/create", component: CreationsScreen }),
    createRoute({ getParentRoute: () => rootRoute, path: "/strike", component: StrikeScreen }),
    createRoute({ getParentRoute: () => rootRoute, path: "/duel", component: DuelScreen }),
    createRoute({ getParentRoute: () => rootRoute, path: "/grades", component: GradesScreen }),
  ];
  const routeTree = rootRoute.addChildren(routes);
  const history = createMemoryHistory({ initialEntries: [initialPath] });
  return createRouter({ routeTree, history });
}

const renderAt = (path: string) => render(<RouterProvider router={makeTestRouter(path)} />);

beforeAll(() => {
  (window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
});

beforeEach(() => {
  useStore.getState().resetSave();
  window.localStorage.clear();
  vi.useRealTimers();
});

describe("games hub", () => {
  it("lists Strike, Duel, Studies, Creations, Grades with live stats", async () => {
    renderAt("/games");
    for (const name of ["Strike", "Duel", "Studies", "Creations", "Grades"]) {
      expect(await screen.findByRole("link", { name: new RegExp(name) })).toBeTruthy();
    }
    expect(screen.getByText("Not played yet")).toBeTruthy();
  });
});

describe("studies unlocks", () => {
  it("derives unlocks from curriculum metadata: grade 0 opens only Listening", async () => {
    expect(unlockedStudies(0).map((u) => u.study.id)).toEqual(["listening"]);
    renderAt("/studies");
    expect(await screen.findByText("Open for practice")).toBeTruthy();
    expect(screen.getAllByText(/Unlocks at grade/)).toHaveLength(6);
  });

  it("grade 5 opens all seven studies", async () => {
    useStore.getState().setGrade(5);
    expect(unlockedStudies(5)).toHaveLength(7);
    renderAt("/studies");
    await screen.findByText("Cadences");
    expect(screen.queryByText(/Unlocks at grade/)).toBeNull();
  });

  it("drill screen runs 8 rounds of real tasks", async () => {
    renderAt("/studies/rhythm");
    expect(await screen.findByText(/Round 1 of 8/)).toBeTruthy();
    expect(screen.getByTestId("task-player")).toBeTruthy();
  });
});

describe("creations", () => {
  it("validates opaque creation data defensively", () => {
    expect(parseCreationData(null)).toEqual({ notes: [] });
    expect(parseCreationData({ notes: "nope" })).toEqual({ notes: [] });
    expect(parseCreationData({ notes: [60, "x", 999, -5, 62.4] })).toEqual({
      notes: [60, 127, 0, 62],
    });
    expect(parseCreationData({ notes: Array(100).fill(60) }).notes).toHaveLength(64);
  });

  it("compose -> name -> save -> persists a named draft", async () => {
    renderAt("/create");
    // Tap middle C on the keyboard.
    fireEvent.click(await screen.findByRole("button", { name: "C4" }));
    expect(screen.getByText("1", { selector: "span.text-\\[10px\\]" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Creation name"), {
      target: { value: "My first tune" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    const creations = useStore.getState().save.creations;
    expect(creations).toHaveLength(1);
    expect(creations[0]!.name).toBe("My first tune");
    expect(parseCreationData(creations[0]!.data).notes).toEqual([60]);
    expect(screen.getByText("Your creations (1)")).toBeTruthy();
  });
});

describe("strike screen", () => {
  it("renders the highway, start control, and best score", async () => {
    renderAt("/strike");
    expect(await screen.findByTestId("strike-game")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Start striking/ })).toBeTruthy();
    expect(screen.getByLabelText(/Strike highway/)).toBeTruthy();
  });
});

describe("duel screen", () => {
  it("renders the scoreboard and a real question; skip reveals the rival", async () => {
    renderAt("/duel");
    const game = await screen.findByTestId("duel-game");
    vi.useFakeTimers();
    expect(within(game).getByRole("heading", { name: /Sentinel/ })).toBeTruthy();
    expect(within(game).getByTestId("task-player")).toBeTruthy();
    fireEvent.click(within(game).getByRole("button", { name: "Skip round" }));
    fireEvent.click(within(game).getByRole("button", { name: /Reveal the Sentinel/ }));
    expect(within(game).getByText("The Sentinel listens…")).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(
      within(game).getByText(/The Sentinel (answered correctly|missed it)/),
    ).toBeTruthy();
    vi.useRealTimers();
  });
});

describe("grades", () => {
  it("hub shows the current grade card and trial terms", async () => {
    renderAt("/grades");
    expect(await screen.findByText("The Sensory Entry Point")).toBeTruthy();
    const req = trialRequirement(0);
    expect(screen.getByText(new RegExp(`${req.questions} questions`))).toBeTruthy();
    expect(screen.getByRole("button", { name: /Begin grade 0 trial/ })).toBeTruthy();
  });

  it("grade 10 shows the terminal message, no trial button", async () => {
    useStore.getState().setGrade(10);
    renderAt("/grades");
    expect(await screen.findByText(/Masterwork complete/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Begin grade/ })).toBeNull();
  });

  it("store: passing a trial advances one grade and stamps the window", () => {
    const s = useStore.getState();
    const req = trialRequirement(3);
    const results = Array(req.questions).fill(true);
    const { passed, grade } = s.recordTrialResult(3, results);
    expect(passed).toBe(true);
    expect(grade).toBe(0); // grade was 0; a trial for grade 3 does not move it
    s.setGrade(3);
    const second = useStore.getState().recordTrialResult(3, results);
    expect(second.passed).toBe(true);
    expect(second.grade).toBe(4);
    expect(useStore.getState().save.grade).toBe(4);
    expect(useStore.getState().save.gradeWindows["3"]).toEqual({
      attempts: req.questions,
      correct: req.questions,
    });
  });

  it("store: failing a trial keeps the grade but still stamps the window", () => {
    const s = useStore.getState();
    s.setGrade(2);
    const req = trialRequirement(2);
    const results = Array(req.questions).fill(false);
    const { passed, grade } = useStore.getState().recordTrialResult(2, results);
    expect(passed).toBe(false);
    expect(grade).toBe(2);
    expect(useStore.getState().save.grade).toBe(2);
    expect(useStore.getState().save.gradeWindows["2"]!.correct).toBe(0);
  });

  it("store: setGrade clamps to 0..10", () => {
    useStore.getState().setGrade(99);
    expect(useStore.getState().save.grade).toBe(10);
    useStore.getState().setGrade(-4);
    expect(useStore.getState().save.grade).toBe(0);
  });
});

describe("focus mode", () => {
  it("collapses the Play section on Home while focus mode is on", async () => {
    renderAt("/");
    await screen.findByText("Your quest");
    expect(screen.queryByText("⚡ Strike")).toBeNull();
    useStore.getState().updateSettings({ focusMode: false });
    renderAt("/");
    expect(await screen.findByText("⚡ Strike")).toBeTruthy();
  });
});
