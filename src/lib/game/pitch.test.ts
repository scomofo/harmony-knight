/** Pitch detection: synthetic tones in, musical answers out (pure math, no mic). */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  detectPitch,
  singPhrase,
  PitchSmoother,
  holdTick,
  HOLD_TICK_MS,
  MicPitch,
  type PitchResult,
  type TimedPitch,
} from "./pitch.ts";
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

describe("PitchSmoother", () => {
  const frame = (freq: number, cents = 0): PitchResult => ({
    freq,
    midi: 69,
    cents,
    clarity: 0.9,
  });

  it("median filter kills a single outlier frame", () => {
    const s = new PitchSmoother();
    let out: PitchResult | null = null;
    for (const f of [440, 440, 880, 440, 440]) out = s.push(frame(f));
    expect(out).not.toBeNull();
    expect(out!.freq).toBeCloseTo(440, 0);
    expect(out!.midi).toBe(69); // recomputed from the median frequency
  });

  it("moving average smooths cents over the last 3 frames", () => {
    const s = new PitchSmoother();
    s.push(frame(440, 10));
    s.push(frame(440, 20));
    const out = s.push(frame(440, 30));
    expect(out!.cents).toBe(20);
  });

  it("resets on silence so the next note starts clean", () => {
    const s = new PitchSmoother();
    s.push(frame(440));
    s.push(frame(440));
    expect(s.push(null)).toBeNull();
    const out = s.push(frame(660)); // E5 — would be 550 if the old frames bled through
    expect(out!.freq).toBeCloseTo(660, 0);
    expect(out!.midi).toBe(76);
  });
});

describe("holdTick", () => {
  it("charges the hold on an on-target frame", () => {
    expect(holdTick(0, true, false)).toBe(HOLD_TICK_MS);
  });

  it("drains off-target frames 1.5x and floors at zero", () => {
    expect(holdTick(200, false, false)).toBe(50);
    expect(holdTick(10, false, false)).toBe(0);
  });

  it("holds steady inside the onset grace window", () => {
    expect(holdTick(200, false, true)).toBe(200);
    expect(holdTick(0, false, true)).toBe(0);
  });

  it("an on-target frame still charges during grace", () => {
    expect(holdTick(0, true, true)).toBe(HOLD_TICK_MS);
  });
});

describe("MicPitch timestamps", () => {
  class FakeAnalyser {
    fftSize = 2048;
    getFloatTimeDomainData(arr: Float32Array) {
      for (let i = 0; i < arr.length; i++)
        arr[i] = 0.5 * Math.sin((2 * Math.PI * 440 * i) / 44100);
    }
  }
  class FakeAudioContext {
    sampleRate = 44100;
    createMediaStreamSource() {
      return { connect() {} };
    }
    createAnalyser() {
      return new FakeAnalyser();
    }
    close() {
      return Promise.resolve();
    }
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    delete (window.navigator as unknown as Record<string, unknown>).mediaDevices;
  });

  it("anchors tMs to mic start and smooths the first frame", async () => {
    vi.stubGlobal("AudioContext", FakeAudioContext);
    vi.stubGlobal("requestAnimationFrame", () => 1);
    vi.stubGlobal("cancelAnimationFrame", () => undefined);
    Object.defineProperty(window.navigator, "mediaDevices", {
      value: { getUserMedia: async () => ({ getTracks: () => [] }) },
      configurable: true,
    });
    const mic = new MicPitch();
    const seen: (TimedPitch | null)[] = [];
    mic.onPitch = (p) => seen.push(p);
    const state = await mic.start();
    try {
      expect(state).toBe("live");
      expect(seen).toHaveLength(1);
      const p = seen[0];
      expect(p).not.toBeNull();
      expect(p!.midi).toBe(69);
      expect(typeof p!.tMs).toBe("number");
      expect(p!.tMs).toBeGreaterThanOrEqual(0);
    } finally {
      mic.dispose();
    }
  });
});
