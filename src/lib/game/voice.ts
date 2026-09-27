/**
 * Procedural instrument voices.
 *
 * Everything used to render through bare oscillators. These voices are
 * rendered procedurally into AudioBuffers once per AudioContext — no
 * downloads, no assets, fully offline-safe for the PWA. One octave
 * (C4..B4) is sampled; playback pitch-shifts the nearest sample (max 6
 * semitones), which keeps memory around 5 MB per context.
 *
 * - piano: additive synthesis with string inharmonicity, per-harmonic
 *   decay, and a hammer-noise transient. The default voice.
 * - music-box: bright, long-decay, few harmonics.
 * - organ: sustained harmonics (no baked decay; the note envelope shapes it).
 * - sine: not sampled — falls back to the oscillator path.
 */

import { midiToFreq } from "./music.ts";

export type VoiceId = "piano" | "music-box" | "organ" | "sine";
export const VOICE_IDS: VoiceId[] = ["piano", "music-box", "organ", "sine"];

/** Lowest sampled MIDI note (C4). */
export const VOICE_BASE_MIDI = 60;
/** Semitones sampled per voice (one octave). */
export const VOICE_NOTES = 12;
/** Seconds per rendered sample. */
export const VOICE_SECONDS = 2.5;

/** Deterministic PRNG so renders are stable across runs (mulberry32). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normalizePeak(out: Float32Array, peak = 0.9): void {
  let max = 0;
  for (let i = 0; i < out.length; i++) {
    const a = Math.abs(out[i]);
    if (a > max) max = a;
  }
  if (max > 0) {
    const g = peak / max;
    for (let i = 0; i < out.length; i++) out[i] *= g;
  }
}

/**
 * Render one piano-ish note: additive harmonics with real-string
 * inharmonicity (f_n = n·f0·√(1+B·n²)), faster decay for higher partials,
 * a 4 ms raised-cosine attack, and a short hammer-noise transient.
 * Pure DSP — no AudioContext needed, fully unit-testable.
 */
export function renderPianoData(f0: number, sampleRate: number, seconds = VOICE_SECONDS): Float32Array {
  const n = Math.max(1, Math.floor(sampleRate * seconds));
  const out = new Float32Array(n);
  const rand = mulberry32(Math.round(f0 * 1000));
  const amps = [1, 0.42, 0.2, 0.11, 0.06, 0.035, 0.02, 0.012];
  const B = 0.00035;
  const tau1 = Math.min(2.4, Math.max(0.5, 1.5 * Math.pow(110 / f0, 0.3)));
  const attack = 0.004;
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const aRaw = Math.min(1, t / attack);
    const aEnv = aRaw * aRaw * (3 - 2 * aRaw); // smoothstep attack
    let s = 0;
    for (let h = 1; h <= amps.length; h++) {
      const fh = h * f0 * Math.sqrt(1 + B * h * h);
      const tau = tau1 / (1 + 0.55 * (h - 1));
      s += amps[h - 1]! * Math.sin(2 * Math.PI * fh * t) * Math.exp(-t / tau);
    }
    if (t < 0.03) {
      const nz = (rand() * 2 - 1) * Math.exp(-t / 0.008) * 0.12;
      lp += 0.25 * (nz - lp);
      s += lp;
    }
    out[i] = s * aEnv;
  }
  normalizePeak(out);
  return out;
}

/** Bright long-decay voice: few harmonics, slow decay, no hammer noise. */
export function renderMusicBoxData(f0: number, sampleRate: number, seconds = VOICE_SECONDS): Float32Array {
  const n = Math.max(1, Math.floor(sampleRate * seconds));
  const out = new Float32Array(n);
  const amps = [1, 0.22, 0.07, 0.025];
  const attack = 0.003;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const aRaw = Math.min(1, t / attack);
    const aEnv = aRaw * aRaw * (3 - 2 * aRaw);
    let s = 0;
    for (let h = 1; h <= amps.length; h++) {
      const tau = 2.6 / h;
      s += amps[h - 1]! * Math.sin(2 * Math.PI * h * f0 * t) * Math.exp(-t / tau);
    }
    out[i] = s * aEnv;
  }
  normalizePeak(out);
  return out;
}

/**
 * Sustained organ voice: steady harmonics, no baked decay. The note's gain
 * envelope shapes attack/release; the last 0.4 s fades to zero so a held
 * buffer never clicks if it runs out.
 */
export function renderOrganData(f0: number, sampleRate: number, seconds = VOICE_SECONDS): Float32Array {
  const n = Math.max(1, Math.floor(sampleRate * seconds));
  const out = new Float32Array(n);
  const amps = [1, 0.45, 0.28, 0.18, 0.1];
  const attack = 0.02;
  const fadeStart = Math.max(0, seconds - 0.4);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const aRaw = Math.min(1, t / attack);
    const aEnv = aRaw * aRaw * (3 - 2 * aRaw);
    let fade = 1;
    if (t > fadeStart) fade = Math.max(0, 1 - (t - fadeStart) / 0.4);
    let s = 0;
    for (let h = 1; h <= amps.length; h++) {
      s += amps[h - 1]! * Math.sin(2 * Math.PI * h * f0 * t);
    }
    out[i] = s * aEnv * fade;
  }
  normalizePeak(out, 0.7);
  return out;
}

/** Pure render dispatch (sine has no samples — it uses the oscillator path). */
export function renderVoiceData(
  voice: Exclude<VoiceId, "sine">,
  midi: number,
  sampleRate: number,
  seconds = VOICE_SECONDS,
): Float32Array {
  const f0 = midiToFreq(midi);
  switch (voice) {
    case "piano":
      return renderPianoData(f0, sampleRate, seconds);
    case "music-box":
      return renderMusicBoxData(f0, sampleRate, seconds);
    case "organ":
      return renderOrganData(f0, sampleRate, seconds);
  }
}

type VoiceCache = Map<VoiceId, AudioBuffer[]>;
const cache = new WeakMap<BaseAudioContext, VoiceCache>();

function tick(): Promise<void> {
  return new Promise((r) => window.setTimeout(r, 0));
}

/**
 * Render (or fetch from cache) one octave of samples for a voice.
 * Async with yields between notes so first paint never janks. Never throws:
 * contexts without createBuffer (test fakes) resolve to [] and callers fall
 * back to oscillators.
 */
export async function ensureVoiceSamples(
  ctx: BaseAudioContext,
  voice: VoiceId,
): Promise<AudioBuffer[]> {
  if (voice === "sine") return [];
  try {
    let byVoice = cache.get(ctx);
    if (!byVoice) {
      byVoice = new Map();
      cache.set(ctx, byVoice);
    }
    const hit = byVoice.get(voice);
    if (hit) return hit;
    const bufs: AudioBuffer[] = [];
    for (let s = 0; s < VOICE_NOTES; s++) {
      const data = renderVoiceData(voice, VOICE_BASE_MIDI + s, ctx.sampleRate);
      const buf = ctx.createBuffer(1, data.length, ctx.sampleRate);
      buf.getChannelData(0).set(data);
      bufs.push(buf);
      if (s % 3 === 2) await tick();
    }
    byVoice.set(voice, bufs);
    return bufs;
  } catch {
    return [];
  }
}

/** Synchronous cache read: null when samples aren't ready (use osc fallback). */
export function voiceSampleFor(
  ctx: BaseAudioContext,
  voice: VoiceId,
  midi: number,
): { buffer: AudioBuffer; rate: number } | null {
  const bufs = cache.get(ctx)?.get(voice);
  if (!bufs || bufs.length === 0) return null;
  let best = 0;
  let bestDist = Infinity;
  for (let s = 0; s < bufs.length; s++) {
    const d = Math.abs(VOICE_BASE_MIDI + s - midi);
    if (d < bestDist) {
      bestDist = d;
      best = s;
    }
  }
  const buffer = bufs[best]!;
  return { buffer, rate: Math.pow(2, (midi - (VOICE_BASE_MIDI + best)) / 12) };
}

export type EffectCue = "tick" | "resolve" | "soft" | "clash" | "win" | "none";

type CueNote = { midi: number; at: number; duration: number; gain: number };

const CUES: Record<Exclude<EffectCue, "none">, CueNote[]> = {
  tick: [{ midi: 96, at: 0, duration: 0.07, gain: 0.16 }],
  resolve: [
    { midi: 64, at: 0, duration: 0.35, gain: 0.4 },
    { midi: 67, at: 0.09, duration: 0.4, gain: 0.4 },
  ],
  soft: [{ midi: 57, at: 0, duration: 0.5, gain: 0.2 }],
  clash: [
    { midi: 61, at: 0, duration: 0.4, gain: 0.28 },
    { midi: 62, at: 0, duration: 0.4, gain: 0.28 },
  ],
  win: [
    { midi: 60, at: 0, duration: 0.4, gain: 0.38 },
    { midi: 64, at: 0.08, duration: 0.4, gain: 0.38 },
    { midi: 67, at: 0.16, duration: 0.5, gain: 0.38 },
    { midi: 72, at: 0.24, duration: 0.6, gain: 0.4 },
  ],
};

/**
 * Play a UI sound cue through the voice engine. Uses sampled voices when
 * ready, oscillator fallback otherwise. Never throws (test fakes).
 */
export function playCue(
  ctx: BaseAudioContext,
  dest: AudioNode,
  cue: EffectCue,
  voice: VoiceId,
): void {
  if (cue === "none") return;
  try {
    const now = ctx.currentTime;
    for (const n of CUES[cue]) {
      const gain = ctx.createGain();
      const startAt = now + n.at;
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, n.gain), startAt + 0.01);
      gain.gain.setValueAtTime(Math.max(0.0001, n.gain), startAt + Math.max(0.01, n.duration - 0.06));
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + n.duration);
      gain.connect(dest);
      const v = voice !== "sine" ? voiceSampleFor(ctx, voice, n.midi) : null;
      if (v) {
        const src = ctx.createBufferSource();
        src.buffer = v.buffer;
        src.playbackRate.value = v.rate;
        src.connect(gain);
        src.start(startAt);
        src.stop(startAt + n.duration + 0.05);
      } else {
        const osc = ctx.createOscillator();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(midiToFreq(n.midi), startAt);
        osc.connect(gain);
        osc.start(startAt);
        osc.stop(startAt + n.duration + 0.05);
      }
    }
  } catch {
    /* audio is best-effort for cues */
  }
}

/**
 * Render one voice note into an OfflineAudioContext (WAV export path).
 * Awaits sample generation, then falls back to oscillator if unavailable.
 */
export async function renderVoiceNote(
  ctx: OfflineAudioContext,
  voice: VoiceId,
  midi: number,
  at: number,
  duration: number,
  peak = 0.5,
): Promise<void> {
  await ensureVoiceSamples(ctx, voice);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), at + 0.01);
  gain.gain.setValueAtTime(Math.max(0.0001, peak), at + Math.max(0.01, duration - 0.08));
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  gain.connect(ctx.destination);
  const v = voice !== "sine" ? voiceSampleFor(ctx, voice, midi) : null;
  if (v) {
    const src = ctx.createBufferSource();
    src.buffer = v.buffer;
    src.playbackRate.value = v.rate;
    src.connect(gain);
    src.start(at);
    src.stop(at + duration + 0.05);
  } else {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(midiToFreq(midi), at);
    osc.connect(gain);
    osc.start(at);
    osc.stop(at + duration + 0.05);
  }
}

/**
 * Test note: the cache is a WeakMap keyed by AudioContext, so dropping the
 * context (e.g. audio.ts __resetAudioForTests setting bus = null) releases
 * its samples. Tests should use a fresh context per case rather than
 * sharing one across cache-state assertions.
 */
