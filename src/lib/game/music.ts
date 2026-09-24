/**
 * Pure music-theory engine. No DOM, no audio, no state.
 * Every function is a pure input -> result mapping so judgments and
 * playback can share one source of truth.
 */

export const A4_MIDI = 69;
export const A4_FREQ = 440;

/** MIDI note number -> frequency in Hz. */
export function midiToFreq(midi: number): number {
  return A4_FREQ * Math.pow(2, (midi - A4_MIDI) / 12);
}

/** Frequency in Hz -> nearest MIDI note number. */
export function freqToMidi(freq: number): number {
  return Math.round(12 * Math.log2(freq / A4_FREQ) + A4_MIDI);
}

/** Fractional MIDI number (no rounding) — for cents/deviation work. */
export function freqToMidiFloat(freq: number): number {
  return 12 * Math.log2(freq / A4_FREQ) + A4_MIDI;
}

export type AccidentalSpell = "sharp" | "flat";

const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"] as const;
const LETTER_NAMES = ["C", "D", "E", "F", "G", "A", "B"] as const;

/** MIDI -> note name with octave, e.g. 60 -> "C4". */
export function midiToName(midi: number, spell: AccidentalSpell = "sharp"): string {
  const pc = ((midi % 12) + 12) % 12;
  const name = spell === "sharp" ? SHARP_NAMES[pc] : FLAT_NAMES[pc];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}

/** Pitch class (0-11) -> letter name without octave. */
export function pitchClassToLetter(pc: number): string {
  const normalized = ((pc % 12) + 12) % 12;
  // C=0, D=2, E=4, F=5, G=7, A=9, B=11
  const map: Record<number, string> = { 0: "C", 2: "D", 4: "E", 5: "F", 7: "G", 9: "A", 11: "B" };
  return map[normalized] ?? LETTER_NAMES[normalized % 7]!;
}

/** Note name like "C#4" or "Eb3" -> MIDI number. */
export function nameToMidi(name: string): number {
  const m = /^([A-Ga-g])([#b♯♭]?)(-?\d+)$/.exec(name.trim());
  if (!m) throw new Error(`Invalid note name: ${name}`);
  const letter = m[1]!.toUpperCase();
  const acc = m[2]!;
  const octave = parseInt(m[3]!, 10);
  const base: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let pc = base[letter]!;
  if (acc === "#" || acc === "♯") pc += 1;
  if (acc === "b" || acc === "♭") pc -= 1;
  return (octave + 1) * 12 + pc;
}

/** Letter name of a MIDI note's natural spelling, e.g. 60 -> "C". */
export function midiToLetter(midi: number): string {
  return pitchClassToLetter(midi % 12);
}

/** Semitone distance, absolute. */
export function semitonesBetween(a: number, b: number): number {
  return Math.abs(b - a);
}

/** Diatonic letter steps between two MIDI notes (for interval quality naming). */
export function letterStepsBetween(lower: number, upper: number): number {
  const letters = ["C", "D", "E", "F", "G", "A", "B"];
  const lo = letters.indexOf(midiToLetter(lower));
  const hi = letters.indexOf(midiToLetter(upper));
  const octaves = Math.floor(upper / 12) - Math.floor(lower / 12);
  return (hi - lo + 7 * octaves) % 7 === 0 && hi < lo
    ? hi - lo + 7 * (octaves + 1)
    : hi - lo + 7 * octaves;
}

const INTERVAL_TABLE: Record<string, string> = {
  "0-0": "P1",
  "1-1": "m2",
  "2-1": "M2",
  "3-2": "m3",
  "4-2": "M3",
  "5-3": "P4",
  "6-3": "A4",
  "6-4": "d5",
  "7-4": "P5",
  "8-5": "m6",
  "9-5": "M6",
  "10-6": "m7",
  "11-6": "M7",
  "12-0": "P8",
};

/**
 * Simple interval name between two MIDI notes (ascending, within an octave).
 * Returns e.g. "M3", "P5". For compound intervals the name includes the
 * compound number, e.g. "M10".
 */
export function intervalName(lower: number, upper: number): string {
  const [lo, hi] = lower <= upper ? [lower, upper] : [upper, lower];
  const semis = hi - lo;
  const octaves = Math.floor(semis / 12);
  const simpleSemis = semis % 12;
  const steps = letterStepsBetween(lo, hi) % 7;
  const key = `${simpleSemis}-${steps}`;
  const simple = INTERVAL_TABLE[key] ?? `?${semis}`;
  if (octaves === 0) return simple;
  const simpleNum = parseInt(simple.slice(1), 10);
  const quality = simple[0]!;
  return `${quality}${simpleNum + 7 * octaves}`;
}

/** True for perfect consonances and imperfect consonances (3rds/6ths). */
export function isConsonant(semitones: number): boolean {
  const s = ((semitones % 12) + 12) % 12;
  return s === 0 || s === 3 || s === 4 || s === 5 || s === 7 || s === 8 || s === 9;
}

export type TriadQuality = "major" | "minor" | "diminished" | "augmented";

export const TRIAD_FORMULAS: Record<TriadQuality, [number, number, number]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  diminished: [0, 3, 6],
  augmented: [0, 4, 8],
};

/** Build a triad (root position) from a root MIDI note and quality. */
export function buildTriad(root: number, quality: TriadQuality): number[] {
  const [a, b, c] = TRIAD_FORMULAS[quality];
  return [root + a, root + b, root + c];
}

/** Identify triad quality from three pitch classes, or null. */
export function identifyTriad(pitches: number[]): TriadQuality | null {
  const pcs = [...new Set(pitches.map((p) => ((p % 12) + 12) % 12))].sort((a, b) => a - b);
  if (pcs.length !== 3) return null;
  for (const root of pcs) {
    const rel = pcs.map((p) => (p - root + 12) % 12).sort((a, b) => a - b);
    const key = rel.join(",");
    if (key === "0,4,7") return "major";
    if (key === "0,3,7") return "minor";
    if (key === "0,3,6") return "diminished";
    if (key === "0,4,8") return "augmented";
  }
  return null;
}

/** Major scale semitone offsets from the tonic. */
export const MAJOR_SCALE_STEPS = [0, 2, 4, 5, 7, 9, 11] as const;

/** MIDI notes of a major scale starting on tonicMidi (one octave). */
export function majorScale(tonicMidi: number): number[] {
  return MAJOR_SCALE_STEPS.map((s) => tonicMidi + s);
}

/** Natural minor scale semitone offsets. */
export const NATURAL_MINOR_STEPS = [0, 2, 3, 5, 7, 8, 10] as const;

export function naturalMinorScale(tonicMidi: number): number[] {
  return NATURAL_MINOR_STEPS.map((s) => tonicMidi + s);
}

/** Dorian mode semitone offsets: minor with a raised (major) sixth. */
export const DORIAN_STEPS = [0, 2, 3, 5, 7, 9, 10] as const;

export function dorianScale(tonicMidi: number): number[] {
  return DORIAN_STEPS.map((s) => tonicMidi + s);
}

/** Order of sharps and flats for key signatures. */
export const ORDER_OF_SHARPS = ["F#", "C#", "G#", "D#", "A#", "E#", "B#"] as const;
export const ORDER_OF_FLATS = ["Bb", "Eb", "Ab", "Db", "Gb", "Cb", "Fb"] as const;

/** Circle of fifths: major keys from Cb to C#. Index 6 is C. */
export const CIRCLE_OF_FIFTHS = [
  "Cb",
  "Gb",
  "Db",
  "Ab",
  "Eb",
  "Bb",
  "F",
  "C",
  "G",
  "D",
  "A",
  "E",
  "B",
  "F#",
  "C#",
] as const;

export type KeySignature = { sharps: number; flats: number };

/** Number of sharps/flats in a major key signature. */
export function keySignatureOf(majorKey: string): KeySignature {
  const idx = (CIRCLE_OF_FIFTHS as readonly string[]).indexOf(majorKey);
  if (idx === -1) throw new Error(`Unknown major key: ${majorKey}`);
  const stepsFromC = idx - 7;
  return stepsFromC >= 0 ? { sharps: stepsFromC, flats: 0 } : { sharps: 0, flats: -stepsFromC };
}

/** Relative minor key name for a major key. */
export function relativeMinor(majorKey: string): string {
  const map: Record<string, string> = {
    Cb: "Ab",
    Gb: "Eb",
    Db: "Bb",
    Ab: "F",
    Eb: "C",
    Bb: "G",
    F: "D",
    C: "A",
    G: "E",
    D: "B",
    A: "F#",
    E: "C#",
    B: "G#",
    "F#": "D#",
    "C#": "A#",
  };
  const minor = map[majorKey];
  if (!minor) throw new Error(`Unknown major key: ${majorKey}`);
  return minor;
}

/**
 * Figurenotes-style color per natural pitch class.
 * C=0 red, D=2 orange, E=4 yellow, F=5 green, G=7 blue, A=9 purple, B=11 pink.
 */
export function figurenoteColor(midi: number): string {
  const pc = ((midi % 12) + 12) % 12;
  const map: Record<number, string> = {
    0: "#e53935",
    2: "#fb8c00",
    4: "#fdd835",
    5: "#43a047",
    7: "#1e88e5",
    9: "#8e24aa",
    11: "#d81b60",
  };
  return map[pc] ?? "#9e9e9e";
}

/** Shape name per pitch class for the color+shape mapping. */
export function figurenoteShape(midi: number): string {
  const pc = ((midi % 12) + 12) % 12;
  const map: Record<number, string> = {
    0: "circle",
    2: "triangle",
    4: "square",
    5: "pentagon",
    7: "hexagon",
    9: "star",
    11: "diamond",
  };
  return map[pc] ?? "circle";
}

/** Clamp a MIDI note into a range. */
export function clampMidi(midi: number, min = 0, max = 127): number {
  return Math.max(min, Math.min(max, Math.round(midi)));
}
