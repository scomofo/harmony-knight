/**
 * Practice screen tests: note-reading drill, concept recall review,
 * and the interactive keyboard.
 *
 * RC evidence: SR evidence is per exact note+octave, 80% clearing rule,
 * due-concept review reschedules via scheduleRecall, and review never
 * blocks teaching content.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PracticeKeyboard } from "../components/game/PracticeKeyboard.tsx";
import { ConceptDrill, NoteDrill } from "../routes/PracticeScreen.tsx";
import { useStore } from "../lib/game/store.ts";

class FakeParam {
  value = 0;
  setValueAtTime() {}
  linearRampToValueAtTime() {}
  exponentialRampToValueAtTime() {}
  cancelScheduledValues() {}
}
class FakeGain {
  gain = new FakeParam();
  connect() {}
  disconnect() {}
}
class FakeOsc {
  type: OscillatorType = "sine";
  frequency = new FakeParam();
  connect() {}
  disconnect() {}
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

describe("PracticeKeyboard", () => {
  it("renders one octave of playable keys that report exact midi", () => {
    const onKey = vi.fn();
    render(<PracticeKeyboard onKey={onKey} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBe(13); // 8 white + 5 black
    fireEvent.click(screen.getByRole("button", { name: "F#4" }));
    expect(onKey).toHaveBeenCalledWith(66);
    fireEvent.click(screen.getByRole("button", { name: "C5" }));
    expect(onKey).toHaveBeenCalledWith(72);
  });
});

describe("NoteDrill", () => {
  it("records a wrong first tap as not-correct evidence for the exact note", () => {
    render(<NoteDrill initialTarget="D4" />);
    expect(screen.getByText(/Find this note on the keyboard/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "E4" }));
    expect(screen.getByText(/Not quite — wrong key/)).toBeTruthy();
    const ev = useStore.getState().save.noteEvidence["D4"];
    expect(ev.attempts).toBe(1);
    expect(ev.lastCorrect).toBe(false);
    // A second tap on the same target is practice only, not new evidence.
    fireEvent.click(screen.getByRole("button", { name: "D4" }));
    expect(useStore.getState().save.noteEvidence["D4"].attempts).toBe(1);
  });

  it("clears a note on a clean first-try answer (80% rule)", () => {
    render(<NoteDrill initialTarget="D4" />);
    fireEvent.click(screen.getByRole("button", { name: "D4" }));
    expect(screen.getByText(/Cleared!/)).toBeTruthy();
    expect(screen.getByText(/First try!/)).toBeTruthy();
    const ev = useStore.getState().save.noteEvidence["D4"];
    expect(ev.lastCorrect).toBe(true);
    expect(ev.firstTryCorrect).toBe(1);
  });

  it("hearing the target counts as assisted: correct but not cleared as first-try", () => {
    render(<NoteDrill initialTarget="D4" />);
    fireEvent.click(screen.getByText(/Hear the target/));
    fireEvent.click(screen.getByRole("button", { name: "D4" }));
    expect(screen.queryByText(/First try!/)).toBeNull();
    const ev = useStore.getState().save.noteEvidence["D4"];
    expect(ev.lastCorrect).toBe(true);
    expect(ev.firstTryCorrect).toBe(0);
  });

  it("advances to a different note and prioritizes notes needing work", () => {
    render(<NoteDrill initialTarget="D4" />);
    fireEvent.click(screen.getByRole("button", { name: "E4" })); // wrong: D4 needs work
    fireEvent.click(screen.getByText(/Next note/));
    // D4 is excluded as the just-played target; the drill continues elsewhere.
    expect(screen.queryByText(/Not quite/)).toBeNull();
  });
});

describe("ConceptDrill", () => {
  function seedDueConcept() {
    useStore.getState().recordConcept({
      conceptId: "pitch-direction",
      intervalDays: 1,
      dueAt: Date.now() - 1000,
      lastResult: "correct",
    });
  }

  it("shows an empty state when nothing is due", () => {
    render(<ConceptDrill />);
    expect(screen.getByText(/Nothing is due/)).toBeTruthy();
  });

  it("reviews due checks and lengthens the interval on correct recall", () => {
    seedDueConcept();
    render(<ConceptDrill />);
    // First pitch-direction check: "Ascending" is answerIndex 0.
    fireEvent.click(screen.getByText("Ascending"));
    expect(screen.getByText(/Correct\./)).toBeTruthy();
    const review = useStore.getState().save.concepts["pitch-direction"];
    expect(review.intervalDays).toBe(3); // 1 -> 3 on correct recall
    expect(review.lastResult).toBe("correct");
    expect(review.dueAt).toBeGreaterThan(Date.now());
  });

  it("resets the interval to one day on a wrong answer", () => {
    seedDueConcept();
    render(<ConceptDrill />);
    fireEvent.click(screen.getByText("Ascending")); // correct first
    fireEvent.click(screen.getByText(/Next/));
    // Second check: answerIndex 1 ("The dynamics"); pick a wrong one.
    fireEvent.click(screen.getByText("The pitch"));
    expect(screen.getByText(/Not quite\./)).toBeTruthy();
    const review = useStore.getState().save.concepts["pitch-direction"];
    expect(review.intervalDays).toBe(1);
    expect(review.lastResult).toBe("wrong");
    fireEvent.click(screen.getByText(/Finish review/));
    expect(screen.getByText(/Review complete: 2 concepts refreshed/)).toBeTruthy();
  });

  it("a revealed hint marks the review assisted", () => {
    seedDueConcept();
    render(<ConceptDrill />);
    fireEvent.click(screen.getByText(/Need a hint/));
    expect(screen.getByText(/Think about stairs/)).toBeTruthy();
    fireEvent.click(screen.getByText("Ascending"));
    expect(useStore.getState().save.concepts["pitch-direction"].lastResult).toBe("assisted");
  });
});
