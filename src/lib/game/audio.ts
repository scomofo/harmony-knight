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

export type ToneOptions = {
  /** Seconds from now to start. */
  at?: number;
  /** Duration in seconds. */
  duration?: number;
  /** 0..1 gain for this tone. */
  gain?: number;
  /** Oscillator shape. */
  type?: OscillatorType;
  /** Called on the audio clock when the tone starts (for highlight sync). */
  onStart?: (time: number) => void;
  /** Called when the tone ends or is cancelled. */
  onEnd?: (cancelled: boolean) => void;
};

type ScheduledTone = {
  osc: OscillatorNode;
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

  const osc = b.ctx.createOscillator();
  const gain = b.ctx.createGain();
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(midiToFreq(midi), startAt);
  const peak = (opts.gain ?? 0.5) * (muted ? 0 : 1);
  // Simple envelope: quick attack, gentle release. No clicks.
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), startAt + 0.02);
  gain.gain.setValueAtTime(Math.max(0.0001, peak), startAt + Math.max(0.02, duration - 0.08));
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(gain);
  gain.connect(b.music);

  const tone: ScheduledTone = { osc, gain, onEnd: opts.onEnd, endTimer: 0 };
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
    osc.start(startAt);
    osc.stop(startAt + duration + 0.05);
  } catch {
    finish(true);
  }

  return () => {
    window.clearTimeout(startTimer);
    try {
      osc.stop();
    } catch {
      /* already stopped */
    }
    finish(true);
  };
}

/**
 * Play a sequence of MIDI notes back-to-back (or with gaps).
 * All tones share one lane so stop(lane) cancels the whole phrase.
 */
export function playSequence(
  midis: number[],
  opts: {
    lane?: string;
    noteDuration?: number;
    gap?: number;
    gain?: number;
    type?: OscillatorType;
    onNoteStart?: (index: number, time: number) => void;
    onDone?: (cancelled: boolean) => void;
  } = {},
): () => void {
  const key = opts.lane ?? "";
  const noteDuration = opts.noteDuration ?? 0.5;
  const gap = opts.gap ?? 0.05;
  const cancels: Array<() => void> = [];
  let doneCount = 0;
  let cancelled = false;
  midis.forEach((midi, i) => {
    const cancel = playTone(midi, {
      lane: key,
      at: i * (noteDuration + gap),
      duration: noteDuration,
      gain: opts.gain,
      type: opts.type,
      onStart: (t) => opts.onNoteStart?.(i, t),
      onEnd: (c) => {
        if (c) cancelled = true;
        doneCount += 1;
        if (doneCount === midis.length) opts.onDone?.(cancelled);
      },
    });
    cancels.push(cancel);
  });
  return () => cancels.forEach((c) => c());
}

/** Cancel every tone in a lane (default lane when omitted). */
export function stopLane(key = ""): void {
  const lane = lanes.get(key);
  if (!lane) return;
  [...lane].forEach((tone) => {
    try {
      tone.osc.stop();
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
}
