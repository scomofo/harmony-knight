/**
 * Richer feedback: beyond binary right/wrong.
 *
 * Pure copy-selection functions — measurable deviation in, coaching out.
 * Every message pairs the measurement with "what to listen for", so a
 * mistake teaches instead of just scoring.
 */
import { intervalName } from "./music.ts";

/** Spoken names for simple intervals (kid-legible). */
const SPOKEN_INTERVAL: Record<string, string> = {
  P1: "the same note",
  m2: "a half step",
  M2: "a whole step",
  m3: "a minor third",
  M3: "a major third",
  P4: "a perfect fourth",
  A4: "a tritone",
  d5: "a tritone",
  P5: "a perfect fifth",
  m6: "a minor sixth",
  M6: "a major sixth",
  m7: "a minor seventh",
  M7: "a major seventh",
  P8: "an octave",
};

function spokenInterval(lower: number, upper: number): string {
  const name = intervalName(lower, upper);
  return SPOKEN_INTERVAL[name] ?? `a ${name} apart`;
}

/**
 * Copy for a measured pitch deviation in cents (singing, mic tasks).
 * Positive = sharp, negative = flat.
 */
export function pitchDeviationCopy(cents: number): string {
  const abs = Math.abs(Math.round(cents));
  if (abs <= 10) return "Right on pitch — beautifully in tune.";
  const dir = cents > 0 ? "sharp" : "flat";
  const adjust = cents > 0 ? "ease a touch lower" : "lift a touch higher";
  let listen: string;
  if (abs <= 30) {
    listen =
      "Listen for your voice ringing cleanly with the target — when the wobble disappears, you're there.";
  } else if (abs <= 70) {
    listen =
      "Hum the target first, then slide your voice until the beating between the two slows to a stop.";
  } else {
    listen =
      "Sing the target on an open 'ah', hold it in your ears, then slide up or down to meet it — big gaps close fastest by sliding.";
  }
  return `${abs}¢ ${dir} — ${adjust}. ${listen}`;
}

/**
 * Coaching when the player produced the wrong pitch (tapped/sang gotMidi,
 * target was targetMidi). Empty string when they match.
 */
export function intervalMissCopy(targetMidi: number, gotMidi: number): string {
  const diff = targetMidi - gotMidi;
  if (diff === 0) return "";
  const direction = diff > 0 ? "higher" : "lower";
  const gap = spokenInterval(Math.min(targetMidi, gotMidi), Math.max(targetMidi, gotMidi));
  const listen =
    diff > 0
      ? "Hear the target first — notice how it sounds brighter and more lifted than what you played."
      : "Hear the target first — notice how it sounds warmer and more settled than what you played.";
  return `That's ${gap} ${direction} than the target. ${listen}`;
}

/**
 * Copy for a measured rhythm deviation in milliseconds (tap tasks).
 * Positive = late, negative = early.
 */
export function timingCopy(ms: number): string {
  const abs = Math.abs(Math.round(ms));
  if (abs <= 40) return "Right in the pocket — rock-solid timing.";
  const dir = ms > 0 ? "late" : "early";
  const fix =
    ms > 0
      ? "Try tapping just before you think the beat lands — your hands are slower than your ears."
      : "Let the beat come to you — count along out loud and land on the number.";
  return `${abs} ms ${dir}. ${fix}`;
}
