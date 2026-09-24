/**
 * Microphone pitch detection for the singing studio.
 *
 * The DSP (autocorrelation) is pure math so it stays unit-testable in
 * jsdom; the mic plumbing lives in MicPitch below. Nothing is recorded
 * or sent anywhere — analysis runs on-device, frame by frame.
 */
import { freqToMidiFloat } from "./music.ts";

export type PitchResult = {
  /** Detected fundamental frequency, Hz. */
  freq: number;
  /** Nearest MIDI note. */
  midi: number;
  /** Cents sharp (+) or flat (−) of that note. */
  cents: number;
  /** Normalized autocorrelation at the winning lag: 0..1, higher is surer. */
  clarity: number;
};

/**
 * A pitch result with its time attached: milliseconds since the mic started
 * streaming (performance.now() minus the mic-start anchor, the beat-zero
 * anchor idea). Without an anchor, per-frame timing is arbitrary.
 */
export type TimedPitch = PitchResult & {
  /** ms since the mic started streaming; always >= 0. */
  tMs: number;
};

/** Singing range we listen for: A1 (55 Hz) up to A5 (880 Hz). */
export const MIN_FREQ = 55;
export const MAX_FREQ = 880;

/** Frames below this RMS are silence/whisper, not a pitch. */
export const SILENCE_RMS = 0.02;

/** Minimum clarity (normalized autocorrelation) to accept a pitch. */
export const MIN_CLARITY = 0.8;

/**
 * Autocorrelation pitch detection. Returns null when the frame is silent,
 * noisy, or has no stable periodic content.
 */
export function detectPitch(samples: Float32Array, sampleRate: number): PitchResult | null {
  const n = samples.length;
  if (n < 512 || sampleRate <= 0) return null;

  let sum = 0;
  for (let i = 0; i < n; i++) sum += samples[i] * samples[i];
  const rms = Math.sqrt(sum / n);
  if (rms < SILENCE_RMS) return null;

  const zeroLag = sum; // sum of squares = autocorrelation at lag 0
  const minLag = Math.max(1, Math.floor(sampleRate / MAX_FREQ));
  const maxLag = Math.min(n - 1, Math.ceil(sampleRate / MIN_FREQ));

  // Normalized autocorrelation per lag, recomputed incrementally would be
  // nicer; the direct loop is ~1M multiply-adds for 2048 samples — fine.
  let bestLag = -1;
  let bestNorm = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    for (let i = 0; i < n - lag; i++) corr += samples[i] * samples[i + lag];
    const norm = corr / zeroLag;
    if (norm > bestNorm) {
      bestNorm = norm;
      bestLag = lag;
    }
  }
  if (bestLag < 0 || bestNorm < MIN_CLARITY) return null;

  // Parabolic interpolation around the peak for sub-sample accuracy.
  const corrAt = (lag: number): number => {
    let c = 0;
    for (let i = 0; i < n - lag; i++) c += samples[i] * samples[i + lag];
    return c / zeroLag;
  };
  let refined = bestLag;
  if (bestLag > minLag && bestLag < maxLag) {
    const a = corrAt(bestLag - 1);
    const b = bestNorm;
    const c = corrAt(bestLag + 1);
    const denom = a - 2 * b + c;
    if (denom !== 0) refined = bestLag + (0.5 * (a - c)) / denom;
  }

  const freq = sampleRate / refined;
  if (freq < MIN_FREQ * 0.9 || freq > MAX_FREQ * 1.1) return null;
  const midiFloat = freqToMidiFloat(freq);
  const midi = Math.round(midiFloat);
  return { freq, midi, cents: Math.round((midiFloat - midi) * 100), clarity: bestNorm };
}

/** Frequency smoothing window: median filter over this many frames. */
export const SMOOTH_FREQ_WINDOW = 5;
/** Cents smoothing window: moving average over this many frames. */
export const SMOOTH_CENTS_WINDOW = 3;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Production-style smoothing for the pitch stream: a median filter on
 * frequency (kills single-frame octave jumps and spikes) and a moving
 * average on cents (steadies the feedback meter). Silence resets the
 * windows so a new note always starts clean. Pure math — unit-testable.
 */
export class PitchSmoother {
  private freqs: number[] = [];
  private centVals: number[] = [];

  push(p: PitchResult | null): PitchResult | null {
    if (!p) {
      this.freqs = [];
      this.centVals = [];
      return null;
    }
    this.freqs.push(p.freq);
    if (this.freqs.length > SMOOTH_FREQ_WINDOW) this.freqs.shift();
    this.centVals.push(p.cents);
    if (this.centVals.length > SMOOTH_CENTS_WINDOW) this.centVals.shift();

    const freq = median(this.freqs);
    const midiFloat = freqToMidiFloat(freq);
    const midi = Math.round(midiFloat);
    const cents = Math.round(
      this.centVals.reduce((a, b) => a + b, 0) / this.centVals.length,
    );
    return { freq, midi, cents, clarity: p.clarity };
  }
}

/** One hold-meter tick, in ms. */
export const HOLD_TICK_MS = 100;
/** Hold drain per tick when the singer is off-target (multiple of a tick). */
export const HOLD_DRAIN = 1.5;

/**
 * One step of the singing studio's hold-to-match meter. On-target frames
 * charge the hold; off-target frames drain it (never below zero); frames
 * inside the onset grace window leave it untouched so a slow vocal attack
 * isn't punished before the voice stabilizes.
 */
export function holdTick(holdMs: number, onTarget: boolean, inGrace: boolean): number {
  if (onTarget) return holdMs + HOLD_TICK_MS;
  if (inGrace) return holdMs;
  return Math.max(0, holdMs - HOLD_TICK_MS * HOLD_DRAIN);
}

export type MicState = "idle" | "requesting" | "live" | "denied" | "unsupported" | "error";

/**
 * Streams microphone audio into detectPitch and reports results through
 * onPitch. Each result is smoothed (median on frequency, moving average on
 * cents) and timestamped in milliseconds since the mic started streaming —
 * the timing anchor, so any future per-note timing feedback isn't arbitrary.
 * Call dispose() when done (unmount, route change) — it stops the tracks,
 * closes the context, and cancels the frame loop.
 */
export class MicPitch {
  onPitch: ((pitch: TimedPitch | null) => void) | null = null;
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private raf = 0;
  private buf: Float32Array<ArrayBuffer> = new Float32Array(0);
  private smoother = new PitchSmoother();
  /** performance.now() captured when streaming starts; tMs is relative to this. */
  private t0 = 0;

  async start(): Promise<MicState> {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== "function" ||
      typeof AudioContext === "undefined"
    ) {
      return "unsupported";
    }
    let stream: MediaStream;
    try {
      // Raw-ish capture: pitch detection wants the voice, not the cleanup.
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        video: false,
      });
    } catch {
      return "denied"; // NotAllowedError, NotFoundError, OverconstrainedError…
    }
    try {
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      src.connect(analyser);
      this.ctx = ctx;
      this.stream = stream;
      this.analyser = analyser;
      this.buf = new Float32Array(analyser.fftSize);
      this.t0 = performance.now();
      this.smoother = new PitchSmoother();
      const loop = () => {
        if (!this.analyser || !this.ctx) return;
        this.analyser.getFloatTimeDomainData(this.buf);
        const raw = detectPitch(this.buf, this.ctx.sampleRate);
        const smooth = this.smoother.push(raw);
        this.onPitch?.(smooth ? { ...smooth, tMs: performance.now() - this.t0 } : null);
        this.raf = requestAnimationFrame(loop);
      };
      loop();
      return "live";
    } catch {
      this.dispose();
      return "error";
    }
  }

  dispose(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.ctx) {
      void this.ctx.close().catch(() => undefined);
      this.ctx = null;
    }
    this.analyser = null;
    this.onPitch = null;
  }
}

/**
 * Phrase generator for call-and-response: a short random walk on the C
 * major pentatonic (C4–C5), seeded so drills are reproducible.
 */
export function singPhrase(seed: number, length = 4): number[] {
  const penta = [60, 62, 64, 67, 69, 72];
  let h = seed >>> 0;
  const rand = () => {
    h = (h * 1664525 + 1013904223) >>> 0;
    return h / 0xffffffff;
  };
  let idx = 2; // start on E
  const phrase = [penta[idx]];
  for (let i = 1; i < length; i++) {
    idx += Math.floor(rand() * 5) - 2; // step −2..+2
    idx = Math.max(0, Math.min(penta.length - 1, idx));
    phrase.push(penta[idx]);
  }
  return phrase;
}
