/**
 * "Always sound good" constraints (Incredibox-style can't-fail mode).
 *
 * When enabled in the creator:
 * - tapped melody notes are quantized to the active palette's pitch
 *   material: the current bar's chord tones when the palette defines them,
 *   otherwise the palette scale;
 * - playback adds an auto-harmonized bassline: one chord root per bar from
 *   the palette's bass roots.
 *
 * Pure functions; the creator UI owns the toggle and playback.
 */

import type { Palette } from "./palettes.ts";

export const CANT_FAIL_STEPS_PER_BAR = 4;

/** Circular distance between two pitch classes (0-11). */
function pcDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 12;
  return Math.min(d, 12 - d);
}

/**
 * Snap a MIDI note to the nearest pitch class in `pcs`. Deterministic:
 * ties resolve to the lower pitch class. Empty set = identity.
 */
export function quantizeToPcs(midi: number, pcs: number[]): number {
  const m = Math.max(0, Math.min(127, Math.round(midi)));
  if (pcs.length === 0) return m;
  const pc = ((m % 12) + 12) % 12;
  let best = pcs[0]!;
  let bestDist = pcDistance(pc, best);
  for (const c of pcs) {
    const d = pcDistance(pc, c);
    if (d < bestDist) {
      best = c;
      bestDist = d;
    }
  }
  return Math.max(0, Math.min(127, m - pc + best));
}

/**
 * Quantize a melody to a palette. Each 4-step bar prefers its chord tones
 * (when the palette defines them), falling back to the palette scale.
 */
export function quantizeMelodyToPalette(
  notes: number[],
  palette: Palette,
  stepsPerBar: number = CANT_FAIL_STEPS_PER_BAR,
): number[] {
  return notes.map((n, i) => {
    const bar = Math.floor(i / stepsPerBar);
    const chord = palette.chordTones?.[bar % palette.chordTones.length];
    return quantizeToPcs(n, chord && chord.length > 0 ? chord : palette.scalePcs);
  });
}

/**
 * Auto-harmonize bassline for a step sequence: the palette's bass root at
 * the start of each bar, -1 (rest) on the other steps. Same length as the
 * melody so both lanes stay in lockstep during playback.
 */
export function basslineForPalette(
  stepCount: number,
  palette: Palette,
  stepsPerBar: number = CANT_FAIL_STEPS_PER_BAR,
): number[] {
  const bass: number[] = new Array(stepCount).fill(-1);
  for (let i = 0; i < stepCount; i += stepsPerBar) {
    const bar = Math.floor(i / stepsPerBar);
    bass[i] = palette.bassRoots[bar % palette.bassRoots.length]!;
  }
  return bass;
}

/**
 * Per-step playback durations for a rhythm grid: base step duration scaled
 * by the grid's per-step multiplier, cycled.
 */
export function gridDurations(
  stepCount: number,
  grid: { cycle: number; durations: number[] },
  baseDuration: number,
): number[] {
  const out: number[] = [];
  for (let i = 0; i < stepCount; i++) {
    out.push(baseDuration * grid.durations[i % grid.cycle]!);
  }
  return out;
}

/**
 * Per-step playback gains for a rhythm grid: the grid's accent pattern,
 * cycled.
 */
export function gridAccents(
  stepCount: number,
  grid: { cycle: number; accents: number[] },
): number[] {
  const out: number[] = [];
  for (let i = 0; i < stepCount; i++) {
    out.push(grid.accents[i % grid.cycle]!);
  }
  return out;
}
