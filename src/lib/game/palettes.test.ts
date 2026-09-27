import { describe, expect, it } from "vitest";
import {
  STARTER_PALETTE,
  gridForPalette,
  lessonOrderIds,
  paletteForConcept,
  paletteForProgress,
  paletteProgress,
} from "./palettes.ts";

describe("paletteForProgress", () => {
  it("falls back to the starter palette with no completed lessons", () => {
    expect(paletteForProgress([])).toBe(STARTER_PALETTE);
    expect(paletteForProgress(new Set())).toBe(STARTER_PALETTE);
  });

  it("falls back when the top lesson's concepts have no palette mapping", () => {
    // ch1-l1 (pitch-direction) has no palette: starter until ch1-l4 (pulse).
    expect(paletteForProgress(["ch1-l1-pitch"]).id).toBe("starter");
    expect(paletteForProgress(["ch1-l2-dynamics", "ch1-l3-timbre"]).id).toBe("starter");
  });

  it("unlocks the steady-beat palette after the pulse lesson", () => {
    expect(paletteForProgress(["ch1-l4-pulse"]).id).toBe("steady-beat");
  });

  it("derives the palette from the highest-completed lesson", () => {
    // Major scales outranks the rhythm palettes even when both are done.
    const p = paletteForProgress(["ch3-l3-dots", "ch4-l1-major"]);
    expect(p.id).toBe("major-map");
    expect(p.from).toBe(60);
    expect(p.to).toBe(84);
  });

  it("maps ii-V-I after the roman numerals lesson", () => {
    const p = paletteForProgress(["ch6-l1-numerals"]);
    expect(p.id).toBe("two-five-one");
    expect(p.bassRoots).toEqual([38, 43, 36]); // Dm7 G7 Cmaj7 roots
    expect(p.chordTones).toHaveLength(3);
  });

  it("maps the pentatonic-style minor palette after the minor lesson", () => {
    const p = paletteForProgress(["ch4-l4-minor"]);
    expect(p.id).toBe("minor-moods");
    expect(p.scalePcs).toEqual([0, 2, 3, 5, 7, 8, 10]);
  });

  it("unlocks odd-meter rhythm grids after the polyrhythm lesson", () => {
    const p = paletteForProgress(["ch9-l4-polyrhythm"]);
    const gridIds = p.rhythmGrids.map((g) => g.id);
    expect(gridIds).toEqual(
      expect.arrayContaining(["five-four", "seven-eight", "tresillo"]),
    );
  });

  it("keeps the latest mapped palette when a later lesson has no mapping", () => {
    // ch10 lessons (counterpoint) have no palette: dorian-doors is from
    // ch11-l3-modes, but ch9-l4-polyrhythm is the latest mapped below it.
    const p = paletteForProgress(["ch9-l4-polyrhythm", "ch10-l1-shape"]);
    expect(p.id).toBe("odd-grooves");
  });

  it("ignores unknown lesson ids", () => {
    expect(paletteForProgress(["nope-not-a-lesson"]).id).toBe("starter");
  });
});

describe("paletteForConcept", () => {
  it("returns undefined for unmapped concepts", () => {
    expect(paletteForConcept("pitch-direction")).toBeUndefined();
    expect(paletteForConcept("fugue")).toBeUndefined();
  });

  it("maps known concepts", () => {
    expect(paletteForConcept("pulse")?.id).toBe("steady-beat");
    expect(paletteForConcept("seventh-chords")?.id).toBe("seventh-sky");
  });
});

describe("paletteProgress", () => {
  it("reports the starter palette and the first unlock with no progress", () => {
    const prog = paletteProgress([]);
    expect(prog.current.id).toBe("starter");
    expect(prog.unlockedByLesson).toBeNull();
    expect(prog.next?.palette.id).toBe("steady-beat");
    expect(prog.next?.lessonTitle).toBe("Steady Pulse");
  });

  it("names the unlocking lesson and the next palette", () => {
    const prog = paletteProgress(["ch1-l4-pulse"]);
    expect(prog.current.id).toBe("steady-beat");
    expect(prog.unlockedByLesson).toBe("Steady Pulse");
    expect(prog.next?.palette.id).toBe("note-names");
  });

  it("has no next palette once everything is complete", () => {
    const prog = paletteProgress(lessonOrderIds());
    expect(prog.next).toBeNull();
    expect(prog.current.id).toBe("dorian-doors");
  });
});

describe("gridForPalette", () => {
  it("finds a grid by id and falls back to the default", () => {
    const p = paletteForProgress(["ch3-l2-meter"]);
    expect(gridForPalette(p, "waltz").id).toBe("waltz");
    expect(gridForPalette(p, "nope").id).toBe(p.rhythmGrids[0]!.id);
  });

  it("every grid's durations/accents match its cycle", () => {
    for (const id of lessonOrderIds()) {
      const p = paletteForProgress([id]);
      for (const g of p.rhythmGrids) {
        expect(g.durations).toHaveLength(g.cycle);
        expect(g.accents).toHaveLength(g.cycle);
      }
    }
  });
});
