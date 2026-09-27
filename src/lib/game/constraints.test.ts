import { describe, expect, it } from "vitest";
import {
  basslineForPalette,
  gridAccents,
  gridDurations,
  quantizeMelodyToPalette,
  quantizeToPcs,
} from "./constraints.ts";
import { STARTER_PALETTE, paletteForProgress } from "./palettes.ts";

describe("quantizeToPcs", () => {
  const major = [0, 2, 4, 5, 7, 9, 11];

  it("leaves in-scale notes untouched", () => {
    expect(quantizeToPcs(60, major)).toBe(60);
    expect(quantizeToPcs(64, major)).toBe(64);
    expect(quantizeToPcs(71, major)).toBe(71);
  });

  it("snaps to the nearest pitch class", () => {
    expect(quantizeToPcs(61, major)).toBe(60); // C# -> C (tie goes down)
    expect(quantizeToPcs(63, major)).toBe(62); // Eb -> D
    expect(quantizeToPcs(66, major)).toBe(65); // F# -> F (tie goes down)
    expect(quantizeToPcs(70, major)).toBe(69); // Bb -> A
  });

  it("preserves the octave", () => {
    expect(quantizeToPcs(73, major)).toBe(72); // C#5 -> C5
    expect(quantizeToPcs(49, major)).toBe(48); // C#3 -> C3
  });

  it("is the identity for an empty pitch set", () => {
    expect(quantizeToPcs(61, [])).toBe(61);
  });

  it("clamps out-of-range midi", () => {
    expect(quantizeToPcs(200, major)).toBeLessThanOrEqual(127);
    expect(quantizeToPcs(-5, major)).toBeGreaterThanOrEqual(0);
  });
});

describe("quantizeMelodyToPalette", () => {
  it("quantizes the starter palette to C major", () => {
    const out = quantizeMelodyToPalette([60, 61, 62, 63], STARTER_PALETTE);
    expect(out).toEqual([60, 60, 62, 62]);
  });

  it("prefers each bar's chord tones when the palette defines them", () => {
    const palette = paletteForProgress(["ch6-l1-numerals"]); // ii-V-I
    const notes = [62, 64, 65, 67, 67, 69, 71, 72, 60, 61, 62, 63];
    const out = quantizeMelodyToPalette(notes, palette);
    expect(out).toHaveLength(notes.length);
    // Every output note lands on its bar's chord tones...
    out.forEach((m, i) => {
      const bar = Math.floor(i / 4);
      const tones = palette.chordTones![bar % palette.chordTones!.length]!;
      expect(tones).toContain(((m % 12) + 12) % 12);
    });
    // ...and a chromatic passing tone snaps to the nearest chord tone.
    expect(out[1]).toBe(65); // E -> F over Dm7
  });

  it("handles melodies shorter than a bar and empty melodies", () => {
    expect(quantizeMelodyToPalette([61], STARTER_PALETTE)).toEqual([60]);
    expect(quantizeMelodyToPalette([], STARTER_PALETTE)).toEqual([]);
  });
});

describe("basslineForPalette", () => {
  it("places one root per bar and rests elsewhere", () => {
    const bass = basslineForPalette(8, STARTER_PALETTE);
    expect(bass).toEqual([36, -1, -1, -1, 41, -1, -1, -1]);
  });

  it("cycles the roots for long melodies", () => {
    const bass = basslineForPalette(12, STARTER_PALETTE);
    expect([bass[0], bass[4], bass[8]]).toEqual([36, 41, 43]);
  });

  it("matches the melody length exactly", () => {
    expect(basslineForPalette(5, STARTER_PALETTE)).toHaveLength(5);
    expect(basslineForPalette(0, STARTER_PALETTE)).toHaveLength(0);
  });
});

describe("gridDurations / gridAccents", () => {
  it("cycles the grid pattern over the steps", () => {
    const grid = { cycle: 4, durations: [1.5, 0.5, 1.5, 0.5], accents: [1, 0.6, 1, 0.6] };
    const durs = gridDurations(6, grid, 0.4);
    expect(durs).toHaveLength(6);
    durs.forEach((d, i) => expect(d).toBeCloseTo([0.6, 0.2, 0.6, 0.2, 0.6, 0.2][i]!, 10));
    expect(gridAccents(6, grid)).toEqual([1, 0.6, 1, 0.6, 1, 0.6]);
  });

  it("supports odd cycles like 5/4 and 7/8", () => {
    const five = { cycle: 5, durations: [1, 1, 1, 1, 1], accents: [1, 0.6, 0.6, 0.85, 0.6] };
    expect(gridDurations(11, five, 0.4)).toHaveLength(11);
    expect(gridAccents(7, five)).toEqual([1, 0.6, 0.6, 0.85, 0.6, 1, 0.6]);
  });
});
