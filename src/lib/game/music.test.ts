import { describe, expect, it } from "vitest";
import {
  buildTriad,
  figurenoteColor,
  identifyTriad,
  intervalName,
  isConsonant,
  keySignatureOf,
  majorScale,
  midiToFreq,
  midiToName,
  nameToMidi,
  relativeMinor,
} from "./music.ts";

describe("music engine", () => {
  it("converts MIDI to frequency", () => {
    expect(midiToFreq(69)).toBeCloseTo(440, 5);
    expect(midiToFreq(60)).toBeCloseTo(261.63, 2);
  });

  it("names notes with octave", () => {
    expect(midiToName(60)).toBe("C4");
    expect(midiToName(61)).toBe("C#4");
    expect(midiToName(61, "flat")).toBe("Db4");
    expect(midiToName(48)).toBe("C3");
  });

  it("parses note names", () => {
    expect(nameToMidi("C4")).toBe(60);
    expect(nameToMidi("A4")).toBe(69);
    expect(nameToMidi("Bb3")).toBe(58);
  });

  it("names intervals", () => {
    expect(intervalName(60, 64)).toBe("M3");
    expect(intervalName(60, 67)).toBe("P5");
    expect(intervalName(60, 61)).toBe("m2");
    expect(intervalName(60, 72)).toBe("P8");
  });

  it("classifies consonance", () => {
    expect(isConsonant(7)).toBe(true);
    expect(isConsonant(4)).toBe(true);
    expect(isConsonant(1)).toBe(false);
    expect(isConsonant(6)).toBe(false);
  });

  it("builds and identifies triads", () => {
    expect(buildTriad(60, "major")).toEqual([60, 64, 67]);
    expect(identifyTriad([60, 64, 67])).toBe("major");
    expect(identifyTriad([60, 63, 67])).toBe("minor");
    expect(identifyTriad([60, 63, 66])).toBe("diminished");
    expect(identifyTriad([60, 64, 68])).toBe("augmented");
    expect(identifyTriad([60, 64])).toBeNull();
  });

  it("builds major scales and key signatures", () => {
    expect(majorScale(60)).toEqual([60, 62, 64, 65, 67, 69, 71]);
    expect(keySignatureOf("G")).toEqual({ sharps: 1, flats: 0 });
    expect(keySignatureOf("Bb")).toEqual({ sharps: 0, flats: 2 });
    expect(keySignatureOf("C")).toEqual({ sharps: 0, flats: 0 });
    expect(relativeMinor("C")).toBe("A");
    expect(relativeMinor("Eb")).toBe("C");
  });

  it("assigns Figurenotes colors", () => {
    expect(figurenoteColor(60)).toBe("#e53935"); // C red
    expect(figurenoteColor(67)).toBe("#1e88e5"); // G blue
    expect(figurenoteColor(60)).toBe(figurenoteColor(72)); // octave equivalence
  });
});
