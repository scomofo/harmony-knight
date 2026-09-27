/**
 * Onboarding flow tests: profile capture, placement diagnostic, and the
 * branched-start recommendation — through the real UI on a test router.
 */
import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { OnboardingScreen } from "../routes/Screens.tsx";
import { DIAGNOSTIC_QUESTIONS } from "../lib/game/placement.ts";
import { useStore } from "../lib/game/store.ts";

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
    component: function LessonStub() {
      const { lessonId } = lessonRoute.useParams();
      return <div>LESSON:{lessonId}</div>;
    },
  });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => <div>HOME</div>,
  });
  const routeTree = rootRoute.addChildren([onboardingRoute, lessonRoute, indexRoute]);
  const history = createMemoryHistory({ initialEntries: [initialPath] });
  return createRouter({ routeTree, history });
}

beforeEach(() => {
  useStore.getState().resetSave();
  window.localStorage.clear();
  vi.useRealTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function walkProfileScreens() {
  fireEvent.click(screen.getByText("7 to 9"));
  fireEvent.click(screen.getByText("Continue →"));
  fireEvent.click(screen.getByText("Played before"));
  fireEvent.click(screen.getByText("Continue →"));
  fireEvent.click(screen.getByText("Just exploring"));
  fireEvent.click(screen.getByText("Not yet"));
  fireEvent.click(screen.getByText("Continue →"));
}

describe("OnboardingFlow", () => {
  it("skips cleanly from any step with the default profile", async () => {
    render(<RouterProvider router={makeTestRouter("/onboarding")} />);
    expect(await screen.findByText("Who's playing?")).toBeTruthy();
    fireEvent.click(screen.getByText("Skip for now"));
    expect(await screen.findByText("HOME")).toBeTruthy();
    const save = useStore.getState().save;
    expect(save.onboarded).toBe(true);
    expect(save.profile.completedAt).toBeNull();
    expect(save.profile.placement).toBeNull();
  });

  it("requires an age band before continuing", async () => {
    render(<RouterProvider router={makeTestRouter("/onboarding")} />);
    expect(await screen.findByText("Who's playing?")).toBeTruthy();
    expect(screen.getByText("Continue →")).toBeDisabled();
    fireEvent.click(screen.getByText("7 to 9"));
    expect(screen.getByText("Continue →")).not.toBeDisabled();
  });

  it("runs the diagnostic and recommends a starting chapter", async () => {
    // Render with real timers: the router's initial navigation is async.
    render(<RouterProvider router={makeTestRouter("/onboarding")} />);
    expect(await screen.findByText("Who's playing?")).toBeTruthy();
    // Fake timers only for the diagnostic's auto-advance delay.
    vi.useFakeTimers();
    walkProfileScreens();

    expect(screen.getByText("A quick check-in")).toBeTruthy();
    // Answer every question correctly.
    for (const q of DIAGNOSTIC_QUESTIONS) {
      const choice = q.choices[q.answerIndex]!;
      fireEvent.click(screen.getByText(choice));
      act(() => {
        vi.advanceTimersByTime(1500);
      });
    }

    // Strong everywhere + played-before -> Chapter 4 (Tonality).
    expect(screen.getByText("Your starting point")).toBeTruthy();
    expect(screen.getByText(/Begin Chapter 4/)).toBeTruthy();
    expect(screen.getAllByText(/8 of 8/).length).toBeGreaterThanOrEqual(1);
    const placement = useStore.getState().save.profile.placement;
    expect(placement).not.toBeNull();
    expect(placement!.recommendedStartChapter).toBe(4);
    expect(placement!.answers).toHaveLength(8);
    expect(placement!.answers.every((a) => a.correct)).toBe(true);

    // Beginning starts the chapter's first lesson and finishes onboarding.
    fireEvent.click(screen.getByText(/Begin Chapter 4/));
    const save = useStore.getState().save;
    expect(save.onboarded).toBe(true);
    expect(save.profile.completedAt).not.toBeNull();
    vi.useRealTimers();
    expect(await screen.findByText(/^LESSON:/)).toBeTruthy();
  });

  it("allows overriding the recommended chapter", async () => {
    // Render with real timers: the router's initial navigation is async.
    render(<RouterProvider router={makeTestRouter("/onboarding")} />);
    expect(await screen.findByText("Who's playing?")).toBeTruthy();
    vi.useFakeTimers();
    walkProfileScreens();
    fireEvent.click(screen.getByText(/Skip the check-in/));
    expect(screen.getByText("Your starting point")).toBeTruthy();

    // Override to Chapter 2 via the select.
    fireEvent.change(screen.getByLabelText(/different chapter/), { target: { value: "2" } });
    fireEvent.click(screen.getByText(/Begin Chapter 2/));
    vi.useRealTimers();
    expect(await screen.findByText("LESSON:ch2-l1-alphabet")).toBeTruthy();
  });
});
