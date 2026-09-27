/**
 * Single Web Audio scheduler with a hard cancellation contract.
 *
 * - One AudioContext, three buses: master / sfx / music.
 * - Every scheduled tone is registered and cancellable by key.
 * - stop(key | all) cancels scheduled tones AND their visual highlight
 *   callbacks through the same token, so audio can never outlive its UI.
 * - Navigation, editing, muting, tab hiding, or starting a newer sound with
 *   the same key must call stop() first.
 */

import { midiToFreq } from "./music.ts";
import {
  ensureVoiceSamples,
  playCue,
  voiceSampleFor,
  VOICE_IDS,
  type EffectCue,
  type VoiceId,
} from "./voice.ts";

export type { EffectCue, VoiceId };
export { VOICE_IDS };

export type ToneOptions = {  /** Seconds from now to start. */
  at?: number;
  /** Duration in seconds. */
  duration?: number;
  /** 0..1 gain for this tone. */
  gain?: number;
  /**
   * Oscillator shape. Explicitly setting a type forces the oscillator path
   * (used by the timbre lesson, which teaches sine vs triangle) even when
   * a sampled voice is selected.
   */
  type?: OscillatorType;
  /** Instrument voice; defaults to the global voice (piano). */
  voice?: VoiceId | VoiceSpec;
  /** Called on the audio clock when the tone starts (for highlight sync). */
  onStart?: (time: number) => void;
  /** Called when the tone ends or is cancelled. */
  onEnd?: (cancelled: boolean) => void;
};

type ScheduledTone = {
  source: AudioScheduledSourceNode;
  gain: GainNode;
  onEnd?: (cancelled: boolean) => void;
  endTimer: number;
};

type Bus = {
  ctx: AudioContext;
  master: GainNode;
  sfx: GainNode;
  music: GainNode;
};

let bus: Bus | null = null;
let masterVolume = 0.8;
let muted = false;
/**
 * Equipped instrument voice: the default oscillator shape (and optional
 * gain trim) used when a tone doesn't name its own type. Set from the
 * shop's equipped instrument; the shop resolves by id string and falls
 * back to the default voice for unknown ids, so this never throws.
 */
export type VoiceSpec = { type: OscillatorType; gain?: number };

/**
 * Global instrument voice. A VoiceId ("piano" renders procedurally;
 * "sine" is the legacy oscillator) or a shop VoiceSpec (oscillator shape
 * + optional gain trim).
 */
let globalVoice: VoiceId | VoiceSpec = "piano";

/** Select the global instrument voice (used by lessons, games, creations, shop). */
export function setVoice(v: VoiceId | VoiceSpec): void {
  globalVoice = v;
  if (bus && typeof v === "string") void ensureVoiceSamples(bus.ctx, v).catch(() => {});
}

/** The current global instrument voice. */
export function getVoice(): VoiceId | VoiceSpec {
  return globalVoice;
}
/** For tests: the currently equipped voice. */
export function currentVoice(): VoiceId | VoiceSpec {
  return globalVoice;
}

/**
 * The global voice as a VoiceId, for the sampled-voice paths. Shop
 * VoiceSpecs have no samples; they fall back to the default piano.
 */
export function voiceIdOrDefault(): VoiceId {
  const v = getVoice();
  return typeof v === "string" ? v : "piano";
}
/** key -> active tones. The "" key is the shared default lane. */
const lanes = new Map<string, Set<ScheduledTone>>();

function getBus(): Bus {
  if (bus) return bus;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AC({ latencyHint: "interactive" });
  const master = ctx.createGain();
  const sfx = ctx.createGain();
  const music = ctx.createGain();
  sfx.gain.value = 0.85;
  music.gain.value = 0.35;
  sfx.connect(master);
  music.connect(master);
  master.connect(ctx.destination);
  applyMaster();
  bus = { ctx, master, sfx, music };
  // Warm the default voice's samples off the critical path; playTone falls
  // back to oscillators until they're ready.
  void ensureVoiceSamples(ctx, voiceIdOrDefault()).catch(() => {});
  return bus;
}

function applyMaster() {
  if (!bus) return;
  const v = muted ? 0 : masterVolume * masterVolume;
  bus.master.gain.setTargetAtTime(v, bus.ctx.currentTime, 0.03);
}

export function unlockAudio(): void {
  const b = getBus();
  if (b.ctx.state === "suspended") void b.ctx.resume();
}

export function setVolume(v: number): void {
  masterVolume = Math.max(0, Math.min(1, v));
  applyMaster();
}

export function setMuted(m: boolean): void {
  muted = m;
  if (m) stopAll(); // muting cancels in-flight sound
  applyMaster();
}

export function isMuted(): boolean {
  return muted;
}

/** Current audio-clock time (seconds). Null when audio never started. */
export function audioNow(): number | null {
  return bus ? bus.ctx.currentTime : null;
}

function track(key: string, tone: ScheduledTone): void {
  let lane = lanes.get(key);
  if (!lane) {
    lane = new Set();
    lanes.set(key, lane);
  }
  lane.add(tone);
}

function untrack(key: string, tone: ScheduledTone): void {
  const lane = lanes.get(key);
  if (!lane) return;
  lane.delete(tone);
  if (lane.size === 0) lanes.delete(key);
}

/**
 * Schedule one tone. Returns a cancel function for that tone.
 * Tones are scheduled on the shared AudioContext clock.
 */
export function playTone(
  midi: number,
  opts: ToneOptions & { lane?: string } = {},
): () => void {
  const b = getBus();
  if (b.ctx.state === "suspended") void b.ctx.resume();
  const key = opts.lane ?? "";
  const at = opts.at ?? 0;
  const duration = opts.duration ?? 0.5;
  const startAt = b.ctx.currentTime + at;
  const voice = opts.voice ?? getVoice();
  const isSpec = typeof voice === "object";
  // An explicit oscillator type forces the oscillator path: the timbre
  // lesson (ch1-l3) teaches sine vs triangle and must not be re-voiced.
  // A shop VoiceSpec is always oscillator-based; "sine" is the legacy
  // oscillator voice; "piano" (and any other VoiceId) uses samples.
  const useOsc = opts.type !== undefined || voice === "sine" || isSpec;

  const gain = b.ctx.createGain();
  const peak = (opts.gain ?? (isSpec ? voice.gain : undefined) ?? 0.5) * (muted ? 0 : 1);
  // Simple envelope: quick attack, gentle release. No clicks.
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), startAt + 0.02);
  gain.gain.setValueAtTime(Math.max(0.0001, peak), startAt + Math.max(0.02, duration - 0.08));
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  let source: AudioScheduledSourceNode;
  const sampled = !useOsc && !isSpec ? voiceSampleFor(b.ctx, voice, midi) : null;
  if (sampled) {
    const src = b.ctx.createBufferSource();
    src.buffer = sampled.buffer;
    src.playbackRate.value = sampled.rate;
    src.connect(gain);
    source = src;
  } else {
    const osc = b.ctx.createOscillator();
    osc.type = opts.type ?? (isSpec ? voice.type : "triangle");
    osc.frequency.setValueAtTime(midiToFreq(midi), startAt);
    osc.connect(gain);
    source = osc;
  }
  gain.connect(b.music);

  const tone: ScheduledTone = { source, gain, onEnd: opts.onEnd, endTimer: 0 };
  track(key, tone);
  let finished = false;
  const finish = (cancelled: boolean) => {
    if (finished) return;
    finished = true;
    untrack(key, tone);
    window.clearTimeout(tone.endTimer);
    tone.onEnd?.(cancelled);
  };

  const startDelayMs = Math.max(0, at * 1000);
  const startTimer = window.setTimeout(() => {
    if (finished) return;
    opts.onStart?.(b.ctx.currentTime);
  }, startDelayMs);
  tone.endTimer = window.setTimeout(() => finish(false), startDelayMs + duration * 1000 + 50);

  try {
    source.start(startAt);
    source.stop(startAt + duration + 0.05);
  } catch {
    finish(true);
  }

  return () => {
    window.clearTimeout(startTimer);
    try {
      source.stop();
    } catch {
      /* already stopped */
    }
    finish(true);
  };
}

/**
 * Play a UI sound cue (effect bus pairings) on the sfx bus through the
 * current voice. Best-effort: never throws, silent when muted.
 */
export function playEffectCue(cue: EffectCue): void {
  if (cue === "none" || muted) return;
  try {
    const b = getBus();
    playCue(b.ctx, b.sfx, cue, voiceIdOrDefault());
  } catch {
    /* cues are decorative */
  }
}

/**
 * Play a sequence of MIDI notes back-to-back (or with gaps).
 * All tones share one lane so stop(lane) cancels the whole phrase.
 *
 * `durations` gives a per-note length in seconds (index-aligned with
 * midis); onsets accumulate so rhythms keep their shape. When omitted,
 * every note uses `noteDuration`.
 *
 * A midi value of -1 is a rest: no tone is scheduled, but its duration
 * still advances the onset clock, so silence lands on the beat.
 */
export function playSequence(
  midis: number[],
  opts: {
    lane?: string;
    noteDuration?: number;
    durations?: number[];
    gap?: number;
    gain?: number;
    type?: OscillatorType;
    /** Per-note overrides: gains[i] / types[i] fall back to gain / type. */
    gains?: number[];
    types?: OscillatorType[];
    onNoteStart?: (index: number, time: number) => void;
    onDone?: (cancelled: boolean) => void;
  } = {},
): () => void {
  const key = opts.lane ?? "";
  const noteDuration = opts.noteDuration ?? 0.5;
  const gap = opts.gap ?? 0.05;
  const cancels: Array<() => void> = [];
  let pending = 0;
  let cancelled = false;
  let onset = 0;
  const noteDone = (c: boolean) => {
    if (c) cancelled = true;
    pending -= 1;
    if (pending === 0) opts.onDone?.(cancelled);
  };
  midis.forEach((midi, i) => {
    const dur = opts.durations?.[i] ?? noteDuration;
    if (midi >= 0) {
      pending += 1;
      const cancel = playTone(midi, {
        lane: key,
        at: onset,
        duration: dur,
        gain: opts.gains?.[i] ?? opts.gain,
        type: opts.types?.[i] ?? opts.type,
        onStart: (t) => opts.onNoteStart?.(i, t),
        onEnd: noteDone,
      });
      cancels.push(cancel);
    }
    onset += dur + gap;
  });
  if (pending === 0) opts.onDone?.(false);
  return () => cancels.forEach((c) => c());
}

/** Cancel every tone in a lane (default lane when omitted). */
export function stopLane(key = ""): void {
  const lane = lanes.get(key);
  if (!lane) return;
  [...lane].forEach((tone) => {
    try {
      tone.source.stop();
    } catch {
      /* already stopped */
    }
    window.clearTimeout(tone.endTimer);
    lanes.get(key)?.delete(tone);
    tone.onEnd?.(true);
  });
  lanes.delete(key);
}

/** Cancel all scheduled audio. Call on navigation, tab hide, and mute. */
export function stopAll(): void {
  [...lanes.keys()].forEach((key) => stopLane(key));
}

/** For tests: how many tones are currently scheduled. */
export function activeToneCount(): number {
  let n = 0;
  lanes.forEach((lane) => (n += lane.size));
  return n;
}

/** For tests: reset module state (only meaningful in jsdom with a mock). */
export function __resetAudioForTests(): void {
  lanes.clear();
  bus = null;
  globalVoice = "piano";
}
