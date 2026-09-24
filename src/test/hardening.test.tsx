/**
 * Release-hardening tests:
 * - Route titles for document.title on navigation.
 * - BreakReminder honors the session-length setting (previously dead).
 * - pagehide flushes the debounced persist synchronously (unload durability).
 * - The high-contrast toggle actually applies its document class.
 */
import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { titleFor } from "../router.tsx";
import { BreakReminder } from "../components/game/BreakReminder.tsx";
import { useStore } from "../lib/game/store.ts";
import { setMotionPolicy } from "../lib/game/effects.ts";

beforeEach(() => {
  window.localStorage.clear();
  useStore.getState().resetSave();
  vi.useRealTimers();
});

afterEach(() => {
  vi.useRealTimers();
  setMotionPolicy({ reducedMotion: false, highContrast: false, focusMode: true, muted: false });
});

describe("titleFor", () => {
  it("names game and lesson routes, falls back for unknown paths", () => {
    expect(titleFor("/strike")).toBe("Harmony Knight — Strike");
    expect(titleFor("/duel")).toBe("Harmony Knight — Duel");
    expect(titleFor("/studies/rhythm")).toBe("Harmony Knight — Studies");
    expect(titleFor("/lesson/ch1-l1-pitch")).toBe("Harmony Knight — Lesson");
    expect(titleFor("/grades")).toBe("Harmony Knight — Grades");
    expect(titleFor("/create")).toBe("Harmony Knight — Create");
    expect(titleFor("/settings")).toBe("Harmony Knight — Settings");
    expect(titleFor("/grown-ups")).toBe("Harmony Knight — Grown-ups");
    expect(titleFor("/")).toBe("Harmony Knight — music theory, one idea at a time");
  });
});

describe("BreakReminder", () => {
  const onboard = () => useStore.getState().update((s) => ({ ...s, onboarded: true }));

  it("stays silent until onboarding is complete", () => {
    vi.useFakeTimers();
    useStore.getState().updateSettings({ sessionMinutes: 1 });
    render(<BreakReminder />);
    act(() => {
      vi.advanceTimersByTime(600_000);
    });
    expect(screen.queryByText(/stretch/)).toBeNull();
  });

  it("appears after the configured session length and restarts on dismiss", () => {
    vi.useFakeTimers();
    onboard();
    useStore.getState().updateSettings({ sessionMinutes: 1 });
    render(<BreakReminder />);

    act(() => {
      vi.advanceTimersByTime(59_000);
    });
    expect(screen.queryByText(/stretch/)).toBeNull();

    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.getByText(/stretch/)).toBeTruthy();

    fireEvent.click(screen.getByText("Keep playing"));
    expect(screen.queryByText(/stretch/)).toBeNull();

    // Clock restarts: another full session length brings it back.
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByText(/stretch/)).toBeTruthy();
  });

  it("is announced politely without stealing focus", () => {
    vi.useFakeTimers();
    onboard();
    useStore.getState().updateSettings({ sessionMinutes: 1 });
    render(<BreakReminder />);
    act(() => {
      vi.advanceTimersByTime(61_000);
    });
    const banner = screen.getByRole("status");
    expect(banner).toBeTruthy();
    expect(document.activeElement).not.toBe(screen.getByText("Keep playing"));
  });
});

describe("pagehide flush", () => {
  it("writes pending debounced state synchronously on pagehide", () => {
    const s = useStore.getState();
    s.addPoints(7);
    // The debounce (150ms) has not fired: nothing on disk yet beyond reset.
    window.dispatchEvent(new Event("pagehide"));
    const raw = window.localStorage.getItem("harmony-knight-save-v1");
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!).harmonyPoints).toBe(7);
  });
});

describe("high contrast wiring", () => {
  it("toggles the document class the CSS hooks into", () => {
    setMotionPolicy({ reducedMotion: false, highContrast: true, focusMode: true, muted: false });
    expect(document.documentElement.classList.contains("hk-high-contrast")).toBe(true);
    setMotionPolicy({ reducedMotion: false, highContrast: false, focusMode: true, muted: false });
    expect(document.documentElement.classList.contains("hk-high-contrast")).toBe(false);
  });
});
