/**
 * Grown-ups dashboard: PIN kid-gate (set, mismatch, wrong/right entry) and
 * the progress/struggle-spot content behind it.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import {
  createRootRoute,
  createRoute,
  createRouter,
  createMemoryHistory,
  RouterProvider,
} from "@tanstack/react-router";
import { GrownUpsScreen } from "../routes/GrownUpsScreen.tsx";
import { HomeScreen } from "../routes/Screens.tsx";
import { useStore } from "../lib/game/store.ts";
import { QUESTS } from "../lib/game/quests.ts";

function renderGrownUps() {
  const rootRoute = createRootRoute({});
  const route = createRoute({ getParentRoute: () => rootRoute, path: "/", component: GrownUpsScreen });
  const router = createRouter({
    routeTree: rootRoute.addChildren([route]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return render(<RouterProvider router={router} />);
}

function renderHome() {
  const rootRoute = createRootRoute({});
  const route = createRoute({ getParentRoute: () => rootRoute, path: "/", component: HomeScreen });
  const router = createRouter({
    routeTree: rootRoute.addChildren([route]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return render(<RouterProvider router={router} />);
}

beforeEach(() => {
  window.localStorage.clear();
  useStore.getState().resetSave();
});

describe("PIN gate", () => {
  it("prompts to set a PIN on first visit", async () => {
    renderGrownUps();
    expect(await screen.findByLabelText("Choose a 4-digit PIN")).toBeTruthy();
  });

  it("rejects mismatched PINs and stays locked", async () => {
    renderGrownUps();
    const inputs = await screen.findAllByLabelText(/PIN/);
    fireEvent.change(inputs[0], { target: { value: "1234" } });
    fireEvent.change(inputs[1], { target: { value: "5678" } });
    fireEvent.click(screen.getByRole("button", { name: "Set PIN" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("don't match");
    expect(screen.queryByText("Learning days")).toBeNull();
  });

  it("matching PINs unlock the dashboard and persist the PIN", async () => {
    renderGrownUps();
    const inputs = await screen.findAllByLabelText(/PIN/);
    fireEvent.change(inputs[0], { target: { value: "1234" } });
    fireEvent.change(inputs[1], { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Set PIN" }));
    expect(await screen.findByText("Learning days")).toBeTruthy();
    expect(useStore.getState().save.settings.grownUpsPin).toBe("1234");
  });

  it("a wrong PIN stays locked; the right PIN unlocks", async () => {
    useStore.getState().updateSettings({ grownUpsPin: "9999" });
    renderGrownUps();
    expect(await screen.findByLabelText("Grown-ups PIN")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Grown-ups PIN"), { target: { value: "0000" } });
    fireEvent.click(screen.getByRole("button", { name: "Unlock" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("not the grown-ups PIN");
    expect(screen.queryByText("Learning days")).toBeNull();
    fireEvent.change(screen.getByLabelText("Grown-ups PIN"), { target: { value: "9999" } });
    fireEvent.click(screen.getByRole("button", { name: "Unlock" }));
    expect(await screen.findByText("Learning days")).toBeTruthy();
  });
});

describe("dashboard content", () => {
  function unlock() {
    useStore.getState().updateSettings({ grownUpsPin: "1234" });
    renderGrownUps();
    return screen.findByLabelText("Grown-ups PIN").then((input) => {
      fireEvent.change(input, { target: { value: "1234" } });
      fireEvent.click(screen.getByRole("button", { name: "Unlock" }));
      return screen.findByText("Learning days");
    });
  }

  it("surfaces concepts and notes that need practice", async () => {
    act(() => {
      useStore.getState().update((s) => ({
        ...s,
        concepts: {
          "note-names": {
            conceptId: "note-names",
            intervalDays: 1,
            dueAt: 0,
            lastResult: "wrong",
          },
        },
        noteEvidence: {
          E4: { note: "E4", attempts: 10, firstTryCorrect: 3, lastCorrect: false, dueAt: 0 },
        },
      }));
    });
    await unlock();
    expect(await screen.findByText(/note names/)).toBeTruthy();
    expect(screen.getByText(/Note E4/)).toBeTruthy();
  });

  it("shows smooth sailing when nothing is flagged", async () => {
    await unlock();
    expect(await screen.findByText("Nothing flagged — smooth sailing.")).toBeTruthy();
  });

  it("counts quests finished this week", async () => {
    useStore.getState().completeQuest("learn");
    useStore.getState().completeQuest("play");
    await unlock();
    expect(await screen.findByText("Daily quests finished this week: 2")).toBeTruthy();
  });
});

describe("quest strip on Home", () => {
  it("shows quests with claim buttons once complete", async () => {
    useStore.getState().completeQuest("learn");
    renderHome();
    expect(await screen.findByText("Today's quests")).toBeTruthy();
    const reward = QUESTS.find((q) => q.id === "learn")!.points;
    const claim = await screen.findByRole("button", { name: `Claim +${reward}` });
    fireEvent.click(claim);
    expect(useStore.getState().save.harmonyPoints).toBe(reward);
    expect(await screen.findByLabelText("Learn something new claimed")).toBeTruthy();
  });
});
