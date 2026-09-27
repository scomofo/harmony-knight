/**
 * Procedural voice rendering: deterministic output, correct shaping,
 * sane sample selection, and graceful degradation.
 */
import { describe, expect, it } from "vitest";
import {
  ensureVoiceSamples,
  playCue,
  renderVoiceData,
  voiceSampleFor,
  VOICE_NOTES,
  VOICE_SECONDS,
  type EffectCue,
} from "./voice.ts";

const SR = 8000;
const SAMPLED: Array<"piano" | "music-box" | "organ"> = ["piano", "music-box", "organ"];

function rms(d: Float32Array, from: number, to: number): number {
  let s = 0;
  for (let i = from; i < to; i++) s += d[i] * d[i];
  return Math.sqrt(s / (to - from));
}

function peak(d: Float32Array): number {
  let p = 0;
  for (let i = 0; i < d.length; i++) p = Math.max(p, Math.abs(d[i]));
  return p;
}

/** Minimal BaseAudioContext fake: createBuffer only (no playback needed). */
function fakeRenderContext(sampleRate = SR) {
  return {
    sampleRate,
    createBuffer: (channels: number, length: number, rate: number) => {
      const data = new Float32Array(length);
      return {
        sampleRate: rate,
        numberOfChannels: channels,
        length,
        getChannelData: (ch: number) => {
          if (ch !== 0) throw new Error("mono only");
          return data;
        },
      };
    },
  };
}

/** Fuller fake for playCue: gain/oscillator/source nodes. */
function fakePlayContext(sampleRate = SR) {
  const node = () => ({ connect: () => {} });
  return {
    sampleRate,
    currentTime: 0,
    createBuffer: (channels: number, length: number, rate: number) => ({
      sampleRate: rate,
      numberOfChannels: channels,
      length,
      getChannelData: () => new Float32Array(length),
    }),
    createGain: () => ({
      ...node(),
      gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
    }),
    createOscillator: () => ({
      ...node(),
      type: "",
      frequency: { setValueAtTime: () => {} },
      start: () => {},
      stop: () => {},
    }),
    createBufferSource: () => ({
      ...node(),
      buffer: null,
      playbackRate: { value: 1 },
      start: () => {},
      stop: () => {},
    }),
  };
}

describe("renderVoiceData (pure DSP)", () => {
  it("renders each sampled voice deterministically", () => {
    for (const v of SAMPLED) {
      const a = renderVoiceData(v, 60, SR);
      const b = renderVoiceData(v, 60, SR);
      expect(a.length).toBe(Math.floor(SR * VOICE_SECONDS));
      expect(a).toEqual(b);
    }
  });

  it("stays finite and bounded", () => {
    for (const v of SAMPLED) {
      const d = renderVoiceData(v, 64, SR);
      for (let i = 0; i < d.length; i += 977) {
        expect(Number.isFinite(d[i])).toBe(true);
        expect(Math.abs(d[i])).toBeLessThan(1.1);
      }
    }
  });

  it("attacks from silence (no clicks) but is not silent", () => {
    for (const v of SAMPLED) {
      const d = renderVoiceData(v, 60, SR);
      expect(Math.abs(d[0])).toBeLessThan(0.01);
      expect(peak(d)).toBeGreaterThan(0.2);
    }
  });

  it("piano decays over its body", () => {
    const d = renderVoiceData("piano", 60, SR);
    const first = rms(d, 0, d.length >> 1);
    const second = rms(d, d.length >> 1, d.length);
    expect(second).toBeLessThan(first * 0.8);
  });

  it("organ sustains rather than decaying away", () => {
    const d = renderVoiceData("organ", 60, SR);
    const mid = rms(d, Math.floor(d.length * 0.25), Math.floor(d.length * 0.45));
    const tail = rms(d, Math.floor(d.length * 0.8), Math.floor(d.length * 0.95));
    expect(tail).toBeGreaterThan(mid * 0.35);
  });

  it("music-box shimmers then decays (long but finite)", () => {
    const d = renderVoiceData("music-box", 60, SR);
    const head = rms(d, 0, Math.floor(d.length * 0.25));
    const tail = rms(d, Math.floor(d.length * 0.75), d.length);
    expect(tail).toBeLessThan(head * 0.6);
    expect(tail).toBeGreaterThan(0); // still ringing — it is a music box
  });

  it("different notes produce different spectra", () => {
    const a = renderVoiceData("piano", 60, SR);
    const b = renderVoiceData("piano", 64, SR);
    expect(a).not.toEqual(b);
  });
});

describe("ensureVoiceSamples + voiceSampleFor", () => {
  it("renders and caches one octave per voice", async () => {
    const ctx = fakeRenderContext();
    const bufs = await ensureVoiceSamples(ctx as never, "piano");
    expect(bufs.length).toBe(VOICE_NOTES);
    expect(bufs.length).toBe(12);
    const again = await ensureVoiceSamples(ctx as never, "piano");
    expect(again).toBe(bufs); // cached, not re-rendered
  });

  it("returns [] for sine (oscillator path) and contexts without createBuffer", async () => {
    const ctx = fakeRenderContext();
    expect(await ensureVoiceSamples(ctx as never, "sine")).toEqual([]);
    expect(await ensureVoiceSamples({} as never, "piano")).toEqual([]);
  });

  it("voiceSampleFor is null until warmed", () => {
    const ctx = fakeRenderContext();
    expect(voiceSampleFor(ctx as never, "piano", 60)).toBeNull();
  });

  it("voiceSampleFor picks the nearest source note with the right rate", async () => {
    const ctx = fakeRenderContext();
    await ensureVoiceSamples(ctx as never, "piano");
    const exact = voiceSampleFor(ctx as never, "piano", 60)!;
    expect(exact).not.toBeNull();
    expect(exact.rate).toBeCloseTo(1, 5);
    // Every semitone C4..B4 is sampled, so 61 is exact too.
    expect(voiceSampleFor(ctx as never, "piano", 61)!.rate).toBeCloseTo(1, 5);
    // midi 78: nearest sampled note is B4 (71), pitched up 7 semitones.
    const high = voiceSampleFor(ctx as never, "piano", 78)!;
    expect(high.rate).toBeCloseTo(Math.pow(2, 7 / 12), 5);
    expect(high.buffer).toBe(voiceSampleFor(ctx as never, "piano", 71)!.buffer);
    // midi 90: same source, wider shift.
    expect(voiceSampleFor(ctx as never, "piano", 90)!.rate).toBeCloseTo(
      Math.pow(2, 19 / 12),
      5,
    );
  });
});

describe("playCue", () => {
  const cues: EffectCue[] = ["tick", "resolve", "soft", "clash", "win", "none"];

  it("is a no-op for 'none' even with a bare context", () => {
    expect(() => playCue({} as never, {} as never, "none", "piano")).not.toThrow();
  });

  it("plays every cue through the oscillator fallback when cold", () => {
    for (const cue of cues) {
      const ctx = fakePlayContext();
      expect(() => playCue(ctx as never, {} as never, cue, "piano")).not.toThrow();
    }
  });

  it("plays every cue through samples when warmed", async () => {
    const ctx = fakePlayContext();
    await ensureVoiceSamples(ctx as never, "piano");
    for (const cue of cues) {
      expect(() => playCue(ctx as never, {} as never, cue, "piano")).not.toThrow();
    }
  });

  it("sine voice stays on the oscillator path without throwing", async () => {
    const ctx = fakePlayContext();
    await ensureVoiceSamples(ctx as never, "sine");
    expect(() => playCue(ctx as never, {} as never, "win", "sine")).not.toThrow();
  });
});
