/**
 * Semantic effect bus. Domain logic emits named events; the bus selects a
 * preset; the motion policy substitutes or suppresses movement.
 *
 * Rules (from the roadmap's effect contract):
 * - Effects communicate before they decorate. Progress never waits on an effect.
 * - Effects never mutate score, grade, recall, or navigation state.
 * - Navigating, editing, hiding the tab, muting, or a newer event with the
 *   same cancellation key cancels the prior effect.
 * - Reduced motion removes travel, shake, parallax, repeated pulses, large
 *   scale changes. High contrast never depends on glow alone.
 */

export type EffectEvent =
  | "select"
  | "correct"
  | "needs-work"
  | "assisted"
  | "mastery"
  | "due-cleared"
  | "clash"
  | "phrase-win"
  | "fever";

export type EffectPreset = {
  event: EffectEvent;
  /** Full-expression description (for docs/QA). */
  motion: string;
  /** Reduced-motion equivalent: same information, no travel/pulse. */
  calm: string;
  /** Duration class in ms. */
  durationMs: number;
  /** Paired sound cue name (played through the audio scheduler). */
  soundCue: "tick" | "resolve" | "soft" | "clash" | "win" | "none";
  /** High-contrast-safe: never glow-only. */
  visual: "highlight" | "check" | "outline" | "badge" | "flash-free";
};

export const EFFECT_PRESETS: Record<EffectEvent, EffectPreset> = {
  select: {
    event: "select",
    motion: "80-120ms highlight sweep + soft tick",
    calm: "instant border/value change",
    durationMs: 120,
    soundCue: "tick",
    visual: "highlight",
  },
  correct: {
    event: "correct",
    motion: "short resolved glow on the answer + notation accent",
    calm: "color + check shape + written result",
    durationMs: 400,
    soundCue: "resolve",
    visual: "check",
  },
  "needs-work": {
    event: "needs-work",
    motion: "contained pulse at the relevant item",
    calm: "persistent outline + written explanation",
    durationMs: 600,
    soundCue: "soft",
    visual: "outline",
  },
  assisted: {
    event: "assisted",
    motion: "quiet clue reveal, no celebratory burst",
    calm: "label + highlighted inspection area",
    durationMs: 300,
    soundCue: "none",
    visual: "highlight",
  },
  mastery: {
    event: "mastery",
    motion: "single restrained flourish",
    calm: "static badge + progress update",
    durationMs: 800,
    soundCue: "win",
    visual: "badge",
  },
  "due-cleared": {
    event: "due-cleared",
    motion: "single restrained flourish",
    calm: "static badge + progress update",
    durationMs: 800,
    soundCue: "win",
    visual: "badge",
  },
  clash: {
    event: "clash",
    motion: "local impact ripple + ghost-tone response",
    calm: "flash-free shape swap + ghost tone",
    durationMs: 500,
    soundCue: "clash",
    visual: "outline",
  },
  "phrase-win": {
    event: "phrase-win",
    motion: "layered resolve, then clear summary",
    calm: "summary emphasis with no movement",
    durationMs: 900,
    soundCue: "win",
    visual: "badge",
  },
  fever: {
    event: "fever",
    motion: "warm edge glow while active",
    calm: "static badge while active",
    durationMs: 0,
    soundCue: "none",
    visual: "badge",
  },
};

export type MotionPolicy = {
  reducedMotion: boolean;
  highContrast: boolean;
  focusMode: boolean;
  muted: boolean;
};

export type EffectRequest = {
  event: EffectEvent;
  /** DOM anchor id or element ref key, for scoped feedback. */
  anchor?: string;
  /** Newer request with the same key cancels the older one. */
  cancelKey?: string;
  intensity?: "subtle" | "normal" | "strong";
};

export type ResolvedEffect = {
  preset: EffectPreset;
  request: EffectRequest;
  policy: MotionPolicy;
  /** True when the calm expression must be used. */
  calm: boolean;
};

type EffectListener = (effect: ResolvedEffect) => (() => void) | void;

const listeners = new Set<EffectListener>();
/** cancelKey -> cleanup of the in-flight effect. */
const inflight = new Map<string, () => void>();

let policy: MotionPolicy = {
  reducedMotion: false,
  highContrast: false,
  focusMode: true,
  muted: false,
};

export function setMotionPolicy(p: Partial<MotionPolicy>): void {
  policy = { ...policy, ...p };
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("hk-reduced-motion", policy.reducedMotion);
    document.documentElement.classList.toggle("hk-high-contrast", policy.highContrast);
  }
}

export function getMotionPolicy(): MotionPolicy {
  return { ...policy };
}

export function onEffect(listener: EffectListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Emit a semantic effect. Focus mode suppresses score-theatrics events
 * (fever) unless the learner opted into game challenges.
 */
export function emitEffect(request: EffectRequest): void {
  const preset = EFFECT_PRESETS[request.event];
  if (policy.focusMode && request.event === "fever") return;
  const calm =
    policy.reducedMotion ||
    (policy.highContrast && preset.visual === "highlight");
  const key = request.cancelKey ?? request.event;
  inflight.get(key)?.();
  inflight.delete(key);

  const resolved: ResolvedEffect = { preset, request, policy: { ...policy }, calm };
  const cleanups: Array<() => void> = [];
  listeners.forEach((l) => {
    const cleanup = l(resolved);
    if (typeof cleanup === "function") cleanups.push(cleanup);
  });
  if (cleanups.length > 0) {
    inflight.set(key, () => cleanups.forEach((c) => c()));
    if (preset.durationMs > 0) {
      window.setTimeout(() => {
        if (inflight.get(key) === undefined) return;
        inflight.delete(key);
        cleanups.forEach((c) => c());
      }, preset.durationMs + 50);
    }
  }
}

/** Cancel effects by key, or all of them. */
export function cancelEffects(key?: string): void {
  if (key) {
    inflight.get(key)?.();
    inflight.delete(key);
    return;
  }
  inflight.forEach((cleanup) => cleanup());
  inflight.clear();
}

/** For tests. */
export function __resetEffectsForTests(): void {
  listeners.clear();
  inflight.clear();
  policy = { reducedMotion: false, highContrast: false, focusMode: true, muted: false };
}
