/** Pitch detection: synthetic tones in, musical answers out (pure math, no mic). */
import { describe, expect, it } from "vitest";
import { detectPitch, singPhrase } from "./pitch.ts";
import { midiToName } from "./music.ts";

function sine(freq: number, sampleRate: number, length = 2048, amp = 0.5): Float32Array {
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) out[i] = amp * Math.sin((2 * Math.PI * freq * i) / sampleRate);
  return out;
}

describe("detectPitch", () => {
  it("detects a clean A4", () => {
    const p = detectPitch(sine(440, 44100), 44100);
    expect(p).not.toBeNull();
    expect(p!.freq).toBeCloseTo(440, 0);
    expect(p!.midi).toBe(69);
    expect(Math.abs(p!.cents)).toBeLessThanOrEqual(5);
    expect(midiToName(p!.midi)).toBe("A4");
  });

  it("detects low and high ends of the singing range", () => {
    const low = detectPitch(sine(110, 44100), 44100); // A2
    expect(low?.midi).toBe(45);
    const high = detectPitch(sine(659.25, 44100), 44100); // E5
    expect(high?.midi).toBe(76);
  });

  it("reports cents sharp and flat", () => {
    const sharp = detectPitch(sine(452, 44100), 44100); // ~+47 cents
    expect(sharp?.midi).toBe(69);
    expect(sharp!.cents).toBeGreaterThan(20);
    const flat = detectPitch(sine(428, 44100), 44100); // ~−47 cents
    expect(flat?.midi).toBe(69);
    expect(flat!.cents).toBeLessThan(-20);
  });

  it("returns null for silence", () => {
    expect(detectPitch(new Float32Array(2048), 44100)).toBeNull();
  });

  it("returns null for whisper-quiet input", () => {
    expect(detectPitch(sine(440, 44100, 2048, 0.005), 44100)).toBeNull();
  });

  it("returns null for noise (no stable pitch)", () => {
    const noise = new Float32Array(2048);
    let h = 12345;
    for (let i = 0; i < noise.length; i++) {
      h = (h * 1664525 + 1013904223) >>> 0;
      noise[i] = (h / 0xffffffff) * 2 - 1;
    }
    expect(detectPitch(noise, 44100)).toBeNull();
  });

  it("rejects degenerate input", () => {
    expect(detectPitch(new Float32Array(100), 44100)).toBeNull();
    expect(detectPitch(sine(440, 44100), 0)).toBeNull();
  });
});

describe("singPhrase", () => {
  it("stays on the C major pentatonic", () => {
    const penta = new Set([60, 62, 64, 67, 69, 72]);
    for (let seed = 0; seed < 20; seed++) {
      const phrase = singPhrase(seed);
      expect(phrase).toHaveLength(4);
      for (const n of phrase) expect(penta.has(n)).toBe(true);
    }
  });

  it("is reproducible for a seed and varies across seeds", () => {
    expect(singPhrase(7)).toEqual(singPhrase(7));
    expect(singPhrase(7)).not.toEqual(singPhrase(8));
  });
});
