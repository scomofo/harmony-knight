/**
 * tasks.ts — practical "Try it" task families.
 *
 * The roadmap asks for one practical task family per chapter, each with
 * progressive help, pure judgment, and persistence. This module is the pure
 * logic core: given lesson-relevant parameters it builds a task with
 * deterministic judgment. The UI layer renders it and the store persists it.
 */

import {
  buildTriad,
  dorianScale,
  isConsonant,
  majorScale,
  midiToName,
  nameToMidi,
  naturalMinorScale,
  ORDER_OF_FLATS,
  ORDER_OF_SHARPS,
  keySignatureOf,
} from "./music.ts";
import { singPhrase } from "./pitch.ts";
import type { LessonVisual, TaskSpec } from "./course.ts";

/** Stable identifiers for every task family, keyed in course.ts lesson bodies. */
export type TaskKind =
  | "self-attempt"
  | "compare-pitch"
  | "note-id"
  | "rhythm-echo"
  | "scale-id"
  | "interval-id"
  | "chord-id"
  | "cadence-id"
  | "motion-id"
  | "modulation-id"
  | "seventh-id"
  | "meter-id"
  | "species-id"
  | "transform-id"
  | "perform-note"
  | "rhythm-tap"
  | "sing-back"
  | "dynamics-id"
  | "timbre-id"
  | "staff-id"
  | "keysign-id"
  | "consonance-id"
  | "numeral-id"
  | "melody-fit"
  | "parallel-id"
  | "decoration-id"
  | "related-id"
  | "pivot-id"
  | "extension-id"
  | "borrowed-id"
  | "form-id";

/**
 * How the learner physically performs the attempt. Choice/button families
 * leave this absent; performance families declare their input here so the
 * UI can render the right controls (keyboard, tap pad, microphone).
 */
export type AttemptInput =
  | { kind: "keyboard"; from: number; to: number; expectedTaps: number }
  | { kind: "tap-pad"; beatMs: number }
  | { kind: "mic"; phrase: number[] };

export interface PracticalTask {
  kind: TaskKind;
  /** Stable id so persistence can reference the task instance. */
  taskId: string;
  /** Prompt shown to the learner before they attempt. */
  prompt: string;
  /** Progressive hints: revealed one at a time, each makes the attempt "assisted". */
  hints: string[];
  /** Audio payload the TeachingPlayer can render as interactive demos. */
  audio?: {
    notes: number[];
    labels?: string[];
    /** Per-note lengths in seconds; onsets accumulate so rhythms keep shape. */
    durations?: number[];
    /** Per-note gains (0..1), e.g. for crescendo/decrescendo phrases. */
    gains?: number[];
    /** Per-note oscillator shapes, e.g. for timbre comparison. */
    types?: OscillatorType[];
    /**
     * Optional separately-playable segments (e.g. target vs candidates).
     * When present, the UI renders one player per segment. A segment may
     * carry `voices` instead of a plain note line, rendered as a duet.
     */
    segments?: {
      label: string;
      notes: number[];
      durations?: number[];
      gains?: number[];
      types?: OscillatorType[];
      voices?: { label: string; notes: number[]; durations?: number[] }[];
    }[];
    /**
     * Optional simultaneous voices (e.g. two-part counterpoint). When
     * present, the UI renders a single control that starts one sequence
     * per voice on the same lane, so they sound together and stop together.
     */
    voices?: { label: string; notes: number[]; durations?: number[] }[];
  };
  /** Optional notation visual (e.g. a staff note to read), rendered above the attempt controls. */
  visual?: LessonVisual;
  /**
   * Optional fixed answer choices (rendered as buttons); the attempt value
   * is the chosen string. Absent for open-ended families (compare-pitch
   * uses its own 1/2 buttons; self-attempt needs none).
   */
  choices?: string[];
  /** Pure judgment: no UI, no persistence, deterministic on the attempt. */
  judge: (attempt: unknown) => boolean;
  /** How the learner performs the attempt; absent for choice/button families. */
  attemptInput?: AttemptInput;
  /** What to say when the learner gets it right. */
  praise: string;
  /** What to say when they need another go. */
  nudge: string;
}

/** Task ids are deterministic per spec so first-attempt evidence survives remounts. */
const taskIdFor = (kind: TaskKind, seed: string | number) => `${kind}:${seed}`;

/** Seeded PRNG so task generation is deterministic per lesson session. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * "Which note is higher?" — two notes, learner taps 1 or 2.
 * The family the Chapter 1 pitch lesson uses for its Try step.
 */
export function buildComparePitchTask(
  seed: number,
  opts: { low: number; high: number; gapMin?: number } = { low: 48, high: 72 },
): PracticalTask {
  const rand = mulberry32(seed);
  const gapMin = opts.gapMin ?? 2;
  let a = opts.low + Math.floor(rand() * (opts.high - opts.low - gapMin));
  let b =
    a + gapMin + Math.floor(rand() * Math.min(12, opts.high - a - gapMin));
  if (b > opts.high) b = opts.high;
  const higherIsFirst = rand() < 0.5;
  const notes = higherIsFirst ? [b, a] : [a, b];
  const answer: 1 | 2 = higherIsFirst ? 1 : 2;

  return {
    kind: "compare-pitch",
    taskId: taskIdFor("compare-pitch", seed),
    prompt: "Listen to the two notes. Which one is higher in pitch — 1 or 2?",
    hints: [
      "The higher note sounds brighter and more lifted, like a bird calling up.",
      `Note 1 is ${midiToName(notes[0])}, note 2 is ${midiToName(notes[1])}. Higher in the alphabet… isn't how it works — trust your ears first!`,
      `The ${answer === 1 ? "first" : "second"} note is higher.`,
    ],
    audio: { notes, labels: ["1", "2"] },
    judge: (attempt) => attempt === answer,
    praise:
      "Exactly — your ears knew. High and low is pitch, and you heard it.",
    nudge: "Listen once more. Ask yourself: which one sounds more lifted?",
  };
}

/**
 * "Hear it, name it": one note from the C4–C5 naturals, three letter-name
 * choices. Judgment is strict on the full name (letter + octave) so the
 * drill teaches exact note identity, not just the letter.
 */
export function buildNoteIdTask(seed: number): PracticalTask {
  const rand = mulberry32(seed);
  const pool = [60, 62, 64, 65, 67, 69, 71, 72]; // C4..C5 naturals
  const idx = Math.floor(rand() * pool.length);
  const midi = pool[idx]!;
  const name = midiToName(midi);
  const neighborIdx = idx > 0 ? idx - 1 : idx + 1;
  const neighbor = midiToName(pool[neighborIdx]!);
  const direction = idx > 0 ? "below" : "above";
  // Distractors: the two nearest other pool notes, shuffled with the answer.
  const distractors = [pool[idx - 1], pool[idx + 1]]
    .filter((n): n is number => n !== undefined && n !== midi)
    .slice(0, 2)
    .map((n) => midiToName(n));
  const choices = [...distractors.map((d) => d), name];
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [choices[i], choices[j]] = [choices[j]!, choices[i]!];
  }

  return {
    kind: "note-id",
    taskId: taskIdFor("note-id", seed),
    prompt: "Listen to the note, then choose its name — letter and octave.",
    audio: { notes: [midi] },
    choices,
    hints: [
      "Sing the scale slowly from C — C D E F G A B C — and count which step you heard.",
      `The note ${neighbor} sits right ${direction} it. One step away.`,
      `It is ${name}. Listen once more and lock it in.`,
    ],
    judge: (attempt) => attempt === name,
    praise: `That's it — ${name}. The alphabet is becoming sound.`,
    nudge: "Not quite — listen once more and sing the scale along with it.",
  };
}

/**
 * "Which one matches?": a target rhythm on one pitch, then two candidates —
 * one identical, one different. Pure rhythm discrimination: pitch never
 * varies, so only the shape of time is judged. Deterministic per seed.
 */
export function buildRhythmEchoTask(seed: number): PracticalTask {
  const rand = mulberry32(seed);
  // Rhythms in beats (quarter = 1); every pattern totals 2 beats.
  const patterns: number[][] = [
    [1, 1],
    [0.5, 0.5, 1],
    [1, 0.5, 0.5],
    [0.5, 1, 0.5],
    [1.5, 0.5],
    [0.5, 0.5, 0.5, 0.5],
  ];
  const targetIdx = Math.floor(rand() * patterns.length);
  let otherIdx = Math.floor(rand() * patterns.length);
  if (otherIdx === targetIdx) otherIdx = (otherIdx + 1) % patterns.length;
  const target = patterns[targetIdx]!;
  const other = patterns[otherIdx]!;
  const matchIsFirst = rand() < 0.5;
  const answer = matchIsFirst ? "1" : "2";
  const beat = 0.45; // seconds per beat
  const render = (p: number[]) => ({
    notes: p.map(() => 60),
    durations: p.map((b) => b * beat),
  });
  const shapeWord = (b: number) =>
    b < 1 ? "short" : b > 1 ? "long" : "steady";
  const shape = target.map(shapeWord).join(" – ");

  return {
    kind: "rhythm-echo",
    taskId: taskIdFor("rhythm-echo", seed),
    prompt:
      "Listen to the target rhythm, then to candidates 1 and 2. Which candidate matches the target?",
    choices: ["1", "2"],
    audio: {
      ...render(target),
      segments: [
        { label: "Target rhythm", ...render(target) },
        { label: "Candidate 1", ...render(matchIsFirst ? target : other) },
        { label: "Candidate 2", ...render(matchIsFirst ? other : target) },
      ],
    },
    hints: [
      "Tap your foot steadily while each plays — feel where the sounds land against your taps.",
      `The target goes: ${shape}. Which candidate moves the same way?`,
      `Candidate ${answer} matches the target. Listen once more and feel it.`,
    ],
    judge: (attempt) => attempt === answer,
    praise:
      "Exactly — you heard the shape of time. Rhythm is pattern, and you caught it.",
    nudge:
      "Listen once more. Tap along — which candidate lands the same way as the target?",
  };
}

/**
 * "Major or minor?": a one-octave scale on a seeded tonic, ascending.
 * The learner identifies the quality by ear — the third degree is the
 * tell. The "modes" variant instead contrasts major (Ionian) with Dorian
 * (minor color, bright sixth). Deterministic per seed; judgment is strict
 * on the quality name.
 */
export function buildScaleIdTask(
  seed: number,
  variant?: string,
): PracticalTask {
  if (variant !== undefined && variant !== "modes") {
    throw new Error(`Unknown scale-id variant: "${variant}"`);
  }
  const rand = mulberry32(seed);
  const tonics = [60, 62, 64, 65, 67]; // C D E F G — singable, familiar
  const tonic = tonics[Math.floor(rand() * tonics.length)]!;
  const modes = variant === "modes";
  const isMajor = rand() < 0.5;
  const steps = modes
    ? isMajor
      ? majorScale(tonic)
      : dorianScale(tonic)
    : isMajor
      ? majorScale(tonic)
      : naturalMinorScale(tonic);
  const notes = [...steps, tonic + 12];
  const answer = isMajor
    ? modes
      ? "Major (Ionian)"
      : "Major"
    : modes
      ? "Dorian"
      : "Minor";
  const tonicName = midiToName(tonic).replace(/\d/, "");

  return {
    kind: "scale-id",
    taskId: taskIdFor("scale-id", modes ? `modes:${seed}` : `${seed}`),
    prompt: modes
      ? "Listen to the scale, ascending one octave. Major (Ionian) — or Dorian?"
      : "Listen to the scale, ascending one octave. Is it major or minor?",
    audio: { notes },
    choices: modes ? ["Major (Ionian)", "Dorian"] : ["Major", "Minor"],
    hints: modes
      ? [
          "Dorian sounds minor — but listen to the sixth note: bright and raised, unlike natural minor.",
          "Sing the first three notes: “do-me” either way — now check the sixth: does it lift?",
          `It is ${answer} — ${tonicName} ${answer.toLowerCase()}. Listen once more and catch the sixth.`,
        ]
      : [
          "Listen to the third note of the scale — major thirds sound bright and open; minor thirds sound darker, more tender.",
          "Sing the first three notes along with it: does it go “do-mi” (bright) or “do-me” (soft)?",
          `It is ${answer} — ${tonicName} ${answer.toLowerCase()}. Listen once more and lock in the color.`,
        ],
    judge: (attempt) => attempt === answer,
    praise: `Exactly — ${tonicName} ${answer.toLowerCase()}. You're hearing quality, not just notes.`,
    nudge: modes
      ? "Listen once more, and lean into the sixth note — bright or dark?"
      : "Listen once more, and lean into the third note — bright or tender?",
  };
}

/**
 * "How far apart?": two notes played melodically (ascending), chosen from a
 * beginner-distinguishable set — major 3rd, perfect 5th, octave. The learner
 * names the interval. Deterministic per seed.
 */
export function buildIntervalIdTask(seed: number): PracticalTask {
  const rand = mulberry32(seed);
  const lowers = [60, 62, 64, 65, 67]; // C D E F G
  const lower = lowers[Math.floor(rand() * lowers.length)]!;
  const options = [
    { semis: 4, name: "3rd" },
    { semis: 7, name: "5th" },
    { semis: 12, name: "Octave" },
  ];
  const pick = options[Math.floor(rand() * options.length)]!;
  const upper = lower + pick.semis;
  const choices = [...options.map((o) => o.name)];
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [choices[i], choices[j]] = [choices[j]!, choices[i]!];
  }

  return {
    kind: "interval-id",
    taskId: taskIdFor("interval-id", seed),
    prompt: "Listen to the two notes, low then high. Which interval is it?",
    audio: { notes: [lower, upper], durations: [0.5, 0.8] },
    choices,
    hints: [
      "Sing both notes. Does the second feel like a small step up, a medium leap, or a big arrival back home?",
      "Count the letter names from the first note to the second, including both ends — that count is the interval's number.",
      `It is a ${pick.name === "Octave" ? "n octave" : pick.name}. Listen once more and feel the distance.`,
    ],
    judge: (attempt) => attempt === pick.name,
    praise: `Exactly — a ${pick.name}. You're measuring musical distance by ear.`,
    nudge: "Listen once more. Small hop, medium leap, or all the way home?",
  };
}

/**
 * Triad ear training, arpeggiated bottom-to-top. Two variants:
 * - "quality": major vs minor triad (the third is the tell).
 * - "position": root position vs first inversion (the bass note is the tell).
 */
export function buildChordIdTask(
  seed: number,
  variant: string | undefined,
): PracticalTask {
  if (
    variant !== undefined &&
    variant !== "quality" &&
    variant !== "position"
  ) {
    throw new Error(`Unknown chord-id variant: "${variant}"`);
  }
  const mode = variant ?? "quality";
  const rand = mulberry32(seed);
  const roots = [60, 62, 65, 67]; // C D F G
  const root = roots[Math.floor(rand() * roots.length)]!;
  const rootName = midiToName(root).replace(/\d/, "");

  if (mode === "position") {
    const inverted = rand() < 0.5;
    const triad = buildTriad(root, "major");
    const notes = inverted ? [triad[1]!, triad[2]!, triad[0]! + 12] : triad;
    const answer = inverted ? "First inversion" : "Root position";
    return {
      kind: "chord-id",
      taskId: taskIdFor("chord-id", `${mode}:${seed}`),
      prompt:
        "Listen to the triad, arpeggiated bottom to top. Is the bass note the root of the chord?",
      audio: { notes, durations: [0.4, 0.4, 0.8] },
      choices: ["Root position", "First inversion"],
      hints: [
        "Focus on the very first, lowest note — then compare it with the top note.",
        inverted
          ? "The bottom note is the third of the chord (mi) — not the root (do)."
          : "The bottom note is do itself — the chord stands on its home note.",
        `It is ${answer.toLowerCase()}. Listen once more and feel where the chord stands.`,
      ],
      judge: (attempt) => attempt === answer,
      praise: `Exactly — ${answer.toLowerCase()}. You're hearing how a chord stands.`,
      nudge: "Listen once more, and lean into the bass note — home, or not?",
    };
  }

  const isMajor = rand() < 0.5;
  const quality = isMajor ? "major" : "minor";
  const notes = buildTriad(root, quality);
  const answer = isMajor ? "Major" : "Minor";
  return {
    kind: "chord-id",
    taskId: taskIdFor("chord-id", `${mode}:${seed}`),
    prompt:
      "Listen to the triad, arpeggiated bottom to top. Is it major or minor?",
    audio: { notes, durations: [0.4, 0.4, 0.8] },
    choices: ["Major", "Minor"],
    hints: [
      "Listen to the middle note — the third. Bright and open, or darker and tender?",
      "Sing the first two notes: do-mi (bright) or do-me (soft)? The bottom third decides the triad.",
      `It is ${answer} — ${rootName} ${quality}. Listen once more and lock in the color.`,
    ],
    judge: (attempt) => attempt === answer,
    praise: `Exactly — ${rootName} ${quality}. You're hearing harmony, not just notes.`,
    nudge:
      "Listen once more, and lean into the middle note — bright or tender?",
  };
}

/**
 * "Which ending?": a two-chord progression in a seeded major key, each chord
 * arpeggiated bottom-to-top with a held final note marking the boundary.
 * Two variants:
 * - "final": authentic (V–I) vs plagal (IV–I) — both close on the tonic.
 * - "open": closed ending (…–I) vs half cadence (…–V).
 */
export function buildCadenceIdTask(
  seed: number,
  variant: string | undefined,
): PracticalTask {
  if (variant !== undefined && variant !== "final" && variant !== "open") {
    throw new Error(`Unknown cadence-id variant: "${variant}"`);
  }
  const mode = variant ?? "final";
  const rand = mulberry32(seed);
  const tonics = [60, 62, 65, 67]; // C D F G
  const tonic = tonics[Math.floor(rand() * tonics.length)]!;
  const triadOn = (degree: number) => [0, 4, 7].map((s) => tonic + degree + s);
  const I = triadOn(0);
  const IV = triadOn(5);
  const V = triadOn(7);

  let first: number[];
  let second: number[];
  let answer: string;
  let prompt: string;
  let choices: string[];
  let hints: string[];
  let praise: string;
  const nudge =
    "Listen once more — focus on the very last chord. Home, or leaning forward?";

  if (mode === "open") {
    const firstPool = [I, IV, V];
    first = firstPool[Math.floor(rand() * firstPool.length)]!;
    const endsHome = rand() < 0.5;
    second = endsHome ? I : V;
    answer = endsHome ? "Closed (ends on I)" : "Open (ends on V)";
    prompt =
      "Listen to the phrase ending. Does it sound finished — or unfinished?";
    choices = ["Closed (ends on I)", "Open (ends on V)"];
    hints = [
      "Does the ending feel like arriving home — or like a sentence trailing off?",
      "A half cadence lands on V, the dominant: it leans forward, asking for more.",
      `It is ${answer.toLowerCase()}. Listen once more and feel the ${endsHome ? "arrival" : "lean"}.`,
    ];
    praise = `Exactly — ${answer.toLowerCase()}. You're hearing musical punctuation.`;
  } else {
    const authentic = rand() < 0.5;
    first = authentic ? V : IV;
    second = I;
    answer = authentic ? "Authentic (V–I)" : "Plagal (IV–I)";
    prompt = "Listen to the two chords. Which cadence closes the phrase?";
    choices = ["Authentic (V–I)", "Plagal (IV–I)"];
    hints = [
      "The authentic cadence drives home from the dominant — decisive, like a period. The plagal is gentler, like an 'amen'.",
      "Hum the bass notes: V–I leaps down a fifth to home; IV–I settles down more softly.",
      `It is ${answer}. Listen once more and feel the ${authentic ? "drive" : "gentleness"}.`,
    ];
    praise = `Exactly — ${answer.toLowerCase()}. You're hearing how phrases end.`;
  }

  const notes = [...first, ...second];
  const durations = [0.3, 0.3, 0.9, 0.35, 0.35, 1.1];
  return {
    kind: "cadence-id",
    taskId: taskIdFor("cadence-id", `${mode}:${seed}`),
    prompt,
    audio: { notes, durations },
    choices,
    hints,
    judge: (attempt) => attempt === answer,
    praise,
    nudge,
  };
}

/**
 * "How do the voices move?": two voices (lower C3–E3, upper C4–E4) each sing
 * two notes. The learner identifies the motion: similar (same direction),
 * contrary (opposite), or oblique (one holds). Rendered as two segment
 * players — one per voice — which is how the ear learns to separate them.
 * Deterministic per seed; some start/motion combos are unbuildable (a voice
 * at its range edge can't move outward), so construction uses rejection
 * sampling over the seeded rng.
 */
export function buildMotionIdTask(seed: number): PracticalTask {
  const rand = mulberry32(seed);
  const pick = <T>(arr: readonly T[]): T =>
    arr[Math.floor(rand() * arr.length)]!;

  const LOWER = { lo: 48, hi: 52, starts: [48, 50, 52] as const };
  const UPPER = { lo: 60, hi: 64, starts: [60, 62, 64] as const };
  const validDirs = (n: number, lo: number, hi: number): Array<1 | -1> => {
    const dirs: Array<1 | -1> = [];
    if (n + 2 <= hi) dirs.push(1);
    if (n - 2 >= lo) dirs.push(-1);
    return dirs;
  };

  type Motion = "similar" | "contrary" | "oblique";
  const answerName: Record<Motion, string> = {
    similar: "Similar motion",
    contrary: "Contrary motion",
    oblique: "Oblique motion",
  };

  /** Returns [lower1, lower2, upper1, upper2] or null when unbuildable. */
  const tryBuild = (
    l1: number,
    u1: number,
    motion: Motion,
  ): number[] | null => {
    const lDirs = validDirs(l1, LOWER.lo, LOWER.hi);
    const uDirs = validDirs(u1, UPPER.lo, UPPER.hi);
    if (motion === "similar") {
      const common = lDirs.filter((d) => uDirs.includes(d));
      if (common.length === 0) return null;
      const d = pick(common);
      return [l1, l1 + 2 * d, u1, u1 + 2 * d];
    }
    if (motion === "contrary") {
      const pairs: Array<[1 | -1, 1 | -1]> = [];
      for (const dl of lDirs)
        for (const du of uDirs) if (du === -dl) pairs.push([dl, du]);
      if (pairs.length === 0) return null;
      const [dl, du] = pick(pairs);
      return [l1, l1 + 2 * dl, u1, u1 + 2 * du];
    }
    // oblique: one voice holds, the other moves (oblique is always buildable)
    const moveLower = rand() < 0.5;
    if (moveLower) {
      const dl = pick(lDirs);
      return [l1, l1 + 2 * dl, u1, u1];
    }
    const du = pick(uDirs);
    return [l1, l1, u1, u1 + 2 * du];
  };

  let built: number[] | null = null;
  let motion: Motion = "oblique";
  // Oblique is always buildable, so this always terminates.
  while (built === null) {
    const l1 = pick(LOWER.starts);
    const u1 = pick(UPPER.starts);
    motion = pick(["similar", "contrary", "oblique"] as const);
    built = tryBuild(l1, u1, motion);
  }
  const [l1, l2, u1, u2] = built as [number, number, number, number];
  const answer = answerName[motion];

  const choices = ["Similar motion", "Contrary motion", "Oblique motion"];
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [choices[i], choices[j]] = [choices[j]!, choices[i]!];
  }

  return {
    kind: "motion-id",
    taskId: taskIdFor("motion-id", seed),
    prompt:
      "Play each voice on its own, then decide: how do the two voices move together?",
    audio: {
      notes: [l1, l2, u1, u2],
      segments: [
        { label: "Lower voice", notes: [l1, l2], durations: [0.5, 0.8] },
        { label: "Upper voice", notes: [u1, u2], durations: [0.5, 0.8] },
      ],
    },
    choices,
    hints: [
      "Play each voice alone. Does it go up, down, or stay on the same note?",
      "Same direction = similar. Opposite directions = contrary. One voice holding still = oblique.",
      `It is ${answer.toLowerCase()}. Play both voices once more and feel the dialogue.`,
    ],
    judge: (attempt) => attempt === answer,
    praise: `Exactly — ${answer.toLowerCase()}. You're hearing voices in dialogue.`,
    nudge: "Play each voice once more. Up, down, or staying put?",
  };
}

/**
 * "Did the key change?": two short I–V–I phrases, each arpeggiated with a
 * held final tonic (the gap between phrases is the longer rest). Two variants:
 * - "detect": the second phrase stays in the same key or moves a fifth away.
 * - "where": the second phrase always moves — up a fifth (brighter) or down
 *   a fifth (warmer).
 */
export function buildModulationIdTask(
  seed: number,
  variant: string | undefined,
): PracticalTask {
  if (
    variant !== undefined &&
    variant !== "detect" &&
    variant !== "where" &&
    variant !== "fugue"
  ) {
    throw new Error(`Unknown modulation-id variant: "${variant}"`);
  }
  const mode = variant ?? "detect";
  const rand = mulberry32(seed);
  const tonics = [60, 62, 65, 67]; // C D F G
  const tonic = tonics[Math.floor(rand() * tonics.length)]!;

  /** I–V–I arpeggio in the given key; final tonic held longer. */
  const phrase = (t: number, finalHold: number) => {
    const I = [t, t + 4, t + 7];
    const V = [t + 7, t + 11, t + 14];
    return {
      notes: [...I, ...V, ...I],
      durations: [0.3, 0.3, 0.7, 0.3, 0.3, 0.7, 0.4, 0.4, finalHold],
    };
  };

  /** Fugue subject: a short 5-note motif, stated then restated. */
  const subject = (t: number, finalHold: number) => {
    const contour = [0, 2, 4, 5, 4];
    return {
      notes: contour.map((s) => t + s),
      durations: [0.35, 0.35, 0.35, 0.5, finalHold],
    };
  };

  let secondTonic: number;
  let answer: string;
  let prompt: string;
  let choices: string[];
  let hints: string[];
  let praise: string;

  if (mode === "where") {
    const up = rand() < 0.5;
    secondTonic = up ? tonic + 7 : tonic - 7;
    answer = up ? "Up a fifth — brighter" : "Down a fifth — warmer";
    prompt =
      "The second phrase moves to a new key a fifth away. Which direction — brighter or warmer?";
    choices = ["Up a fifth — brighter", "Down a fifth — warmer"];
    hints = [
      "Up a fifth feels brighter, like sunrise; down a fifth feels warmer, like sunset.",
      "Compare the final resting notes: does the second home sit higher or lower than the first?",
      `It moves ${up ? "up" : "down"} a fifth. Listen once more and feel the ${up ? "lift" : "settle"}.`,
    ];
    praise = `Exactly — ${up ? "up" : "down"} a fifth. You're hearing the geography of keys.`;
  } else {
    const same = rand() < 0.5;
    secondTonic = same ? tonic : tonic + (rand() < 0.5 ? 7 : -7);
    answer = same ? "Same key" : "New key";
    prompt =
      "Listen to both phrases. Does the second phrase stay in the same key — or move to a new one?";
    choices = ["Same key", "New key"];
    hints = [
      "Listen to where each phrase comes to rest. Does the second phrase land on the same home note as the first?",
      "Hum the final note of each phrase. Same pitch — or different?",
      `The second phrase is in ${same ? "the same key" : "a new key"}. Listen once more and track the home note.`,
    ];
    praise = `Exactly — ${same ? "same key" : "a new key"}. Your ear is tracking tonal home.`;
  }

  if (mode === "fugue") {
    const isAnswer = rand() < 0.5;
    secondTonic = isAnswer ? tonic + 7 : tonic;
    answer = isAnswer ? "Dominant — the answer" : "Tonic — subject again";
    prompt =
      "A fugue subject sounds, then returns. Does it come back on the tonic — or answer on the dominant?";
    choices = ["Tonic — subject again", "Dominant — the answer"];
    hints = [
      "The answer is the subject transposed up a fifth — hear whether the second phrase sits higher.",
      "Hum the first note of each phrase: same pitch, or a fifth higher?",
      `It ${isAnswer ? "answers on the dominant" : "stays on the tonic"}. Listen once more and track the opening note.`,
    ];
    praise = `Exactly — ${isAnswer ? "the answer on the dominant" : "the subject again on the tonic"}. You're hearing a fugue's opening dialogue.`;
  }

  const render = mode === "fugue" ? subject : phrase;
  const p1 = render(tonic, 1.6); // longer hold = the gap between phrases
  const p2 = render(secondTonic, 1.2);
  return {
    kind: "modulation-id",
    taskId: taskIdFor("modulation-id", `${mode}:${seed}`),
    prompt,
    audio: {
      notes: [...p1.notes, ...p2.notes],
      durations: [...p1.durations, ...p2.durations],
    },
    choices,
    hints,
    judge: (attempt) => attempt === answer,
    praise,
    nudge: "Listen once more — follow each phrase to its resting note.",
  };
}

/**
 * "Which seventh?": a seventh chord arpeggiated bottom-to-top on a seeded
 * root. Major seventh (glowing) vs dominant seventh (bluesy, leaning) — the
 * top note is the tell. Deterministic per seed.
 */
export function buildSeventhIdTask(seed: number): PracticalTask {
  const rand = mulberry32(seed);
  const roots = [60, 62, 64, 65, 67]; // C D E F G
  const root = roots[Math.floor(rand() * roots.length)]!;
  const isMaj7 = rand() < 0.5;
  const seventh = root + (isMaj7 ? 11 : 10);
  const notes = [root, root + 4, root + 7, seventh];
  const answer = isMaj7 ? "Major seventh" : "Dominant seventh";
  const rootName = midiToName(root).replace(/\d/, "");

  return {
    kind: "seventh-id",
    taskId: taskIdFor("seventh-id", seed),
    prompt:
      "Listen to the seventh chord, arpeggiated bottom to top. Major seventh or dominant seventh?",
    audio: { notes, durations: [0.35, 0.35, 0.35, 1.0] },
    choices: ["Major seventh", "Dominant seventh"],
    hints: [
      "Listen to the top note — the seventh. Sweet and glowing, or bluesy and leaning?",
      "Sing the bottom and top notes together: a major seventh sits one half-step below the octave; a minor seventh a whole step below.",
      `It is ${answer} — ${rootName}${isMaj7 ? "maj7" : "7"}. Listen once more and feel the top note.`,
    ],
    judge: (attempt) => attempt === answer,
    praise: `Exactly — ${rootName}${isMaj7 ? "maj7" : "7"}. You're hearing chord color.`,
    nudge:
      "Listen once more, and lean into the very top note — glowing or leaning?",
  };
}

/**
 * "How many beats?": two bars of pulses with the downbeat accented low and
 * the other beats high. The learner counts the meter: 3, 4, or 5 beats per
 * bar. Deterministic per seed.
 */
export function buildMeterIdTask(seed: number): PracticalTask {
  const rand = mulberry32(seed);
  const meters = [3, 4, 5] as const;
  const meter = meters[Math.floor(rand() * meters.length)]!;
  const beat = 0.42;
  const bar = [60, ...Array<number>(meter - 1).fill(67)];
  const notes = [...bar, ...bar];
  const answer = `${meter} beats`;
  const choices = ["3 beats", "4 beats", "5 beats"];
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [choices[i], choices[j]] = [choices[j]!, choices[i]!];
  }

  return {
    kind: "meter-id",
    taskId: taskIdFor("meter-id", seed),
    prompt:
      "Listen to the pulses — the low note marks each downbeat. How many beats are in each bar?",
    audio: { notes, durations: notes.map(() => beat) },
    choices,
    hints: [
      "Count along: 1-2-3, 1-2-3… where does the strong low pulse land?",
      "Tap the strong beats — how many lighter beats sit between them?",
      `It is ${answer} per bar. Count along once more and feel the cycle.`,
    ],
    judge: (attempt) => attempt === answer,
    praise: `Exactly — ${answer}. You're feeling the bar lines.`,
    nudge: "Count along once more. Where does the low pulse come back?",
  };
}

/**
 * "Which species?": a slow cantus firmus (4 whole notes) with a counterpoint
 * voice above, played together as a duet. Two variants:
 * - "early": first (1:1), second (2:1), or third (4:1) species.
 * - "late": second (2:1), fourth (syncopated), or fifth (florid) species.
 * The cantus is a seeded 4-note phrase; the counterpoint skeleton moves in
 * seeded thirds/sixths above it. Deterministic per seed.
 */
export function buildSpeciesIdTask(
  seed: number,
  variant: string | undefined,
): PracticalTask {
  if (variant !== "early" && variant !== "late") {
    throw new Error(`Unknown species-id variant: "${variant}"`);
  }
  const rand = mulberry32(seed);
  const pick = <T>(arr: readonly T[]): T =>
    arr[Math.floor(rand() * arr.length)]!;

  const cfs = [
    [48, 50, 52, 48],
    [48, 52, 50, 48],
    [48, 53, 52, 48],
    [48, 50, 53, 48],
  ];
  const cf = cfs[Math.floor(rand() * cfs.length)]!;
  const CF_DUR = 0.9;

  // Consonant skeleton: seeded thirds/sixths above each cantus note.
  const skeleton: number[] = [];
  let iv = pick([3, 4]);
  for (let i = 0; i < cf.length; i++) {
    if (i > 0 && rand() < 0.4) iv = iv === 3 ? 4 : 3;
    skeleton.push(cf[i]! + 12 + iv);
  }

  const species: "first" | "second" | "third" | "fourth" | "fifth" =
    variant === "early"
      ? pick(["first", "second", "third"] as const)
      : pick(["second", "fourth", "fifth"] as const);

  let cpNotes: number[];
  let cpDurations: number[];
  let answer: string;
  let choices: string[];

  if (species === "first") {
    cpNotes = [...skeleton];
    cpDurations = skeleton.map(() => CF_DUR);
    answer = "First species";
    choices = ["First species", "Second species", "Third species"];
  } else if (species === "second") {
    cpNotes = [];
    cpDurations = [];
    for (let i = 0; i < cf.length; i++) {
      const next = skeleton[Math.min(i + 1, cf.length - 1)]!;
      const step = Math.sign(next - skeleton[i]!) * (rand() < 0.5 ? 1 : 2);
      const passing =
        i < cf.length - 1 ? skeleton[i]! + step : skeleton[i]! - 2;
      cpNotes.push(skeleton[i]!, passing);
      cpDurations.push(0.45, 0.45);
    }
    answer = "Second species";
    choices =
      variant === "early"
        ? ["First species", "Second species", "Third species"]
        : ["Second species", "Fourth species", "Fifth species (florid)"];
  } else if (species === "third") {
    cpNotes = [];
    cpDurations = [];
    for (let i = 0; i < cf.length; i++) {
      const target = i < cf.length - 1 ? skeleton[i + 1]! : skeleton[i]! - 4;
      const start = skeleton[i]!;
      for (let k = 0; k < 4; k++) {
        cpNotes.push(Math.round(start + ((target - start) * k) / 4));
        cpDurations.push(0.2);
      }
    }
    answer = "Third species";
    choices = ["First species", "Second species", "Third species"];
  } else if (species === "fourth") {
    // Syncopated: a leading rest offsets the voice so each note enters
    // halfway through the cantus note and sustains across the barline.
    cpNotes = [-1, ...skeleton];
    cpDurations = [0.45, ...skeleton.map(() => CF_DUR)];
    answer = "Fourth species";
    choices = ["Second species", "Fourth species", "Fifth species (florid)"];
  } else {
    // Florid: mixed rhythm — quarters, a half, running quarters, a half.
    const rhythm = [0.45, 0.45, CF_DUR, 0.2, 0.2, 0.2, 0.2, CF_DUR];
    cpNotes = [skeleton[0]!];
    let n = skeleton[0]!;
    for (let k = 1; k < rhythm.length; k++) {
      n = Math.max(
        cf[0]! + 12,
        Math.min(cf[0]! + 26, n + pick([-2, -1, 1, 2])),
      );
      cpNotes.push(n);
    }
    cpNotes[cpNotes.length - 1] = skeleton[skeleton.length - 1]!;
    cpDurations = [...rhythm];
    answer = "Fifth species (florid)";
    choices = ["Second species", "Fourth species", "Fifth species (florid)"];
  }

  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [choices[i], choices[j]] = [choices[j]!, choices[i]!];
  }

  const countHint =
    variant === "early"
      ? "Count how many counterpoint notes dance over each slow cantus note: one, two, or four?"
      : "Is the upper line marching evenly, hanging back off the beat, or mixing long and short notes freely?";
  const theoryHint =
    variant === "early"
      ? "First species moves note-against-note; second puts two against one; third runs four quarters against one."
      : "Second species: steady two-against-one. Fourth: syncopated, always arriving late. Fifth: florid, freely mixed.";

  return {
    kind: "species-id",
    taskId: taskIdFor("species-id", `${variant}:${seed}`),
    prompt:
      "Two voices play together — a slow cantus firmus below, a counterpoint line above. Which species is the counterpoint?",
    audio: {
      notes: [...cf],
      voices: [
        {
          label: "Cantus firmus (slow)",
          notes: [...cf],
          durations: cf.map(() => CF_DUR),
        },
        { label: "Counterpoint", notes: cpNotes, durations: cpDurations },
      ],
    },
    choices,
    hints: [
      countHint,
      theoryHint,
      `It is ${answer.toLowerCase()} — listen once more and feel the rhythmic relationship.`,
    ],
    judge: (attempt) => attempt === answer,
    praise: `Exactly — ${answer.toLowerCase()}. You're hearing how independent lines share time.`,
    nudge:
      "Listen once more — count the upper notes against each slow bass note.",
  };
}

/**
 * "What happened to the motif?": a short motif sounds, then returns
 * transformed — transposed (same shape, new pitch), inverted (contour
 * mirrored around the first note), or retrograde (backwards). The learner
 * names the transformation. Deterministic per seed.
 */
export function buildTransformIdTask(seed: number): PracticalTask {
  const rand = mulberry32(seed);
  const pick = <T>(arr: readonly T[]): T =>
    arr[Math.floor(rand() * arr.length)]!;
  // Asymmetric diatonic motifs: every transform stays distinct.
  const motifs = [
    [60, 62, 64, 62],
    [60, 64, 67, 65],
    [62, 64, 67, 64],
    [60, 62, 65, 64],
  ];
  const motif = pick(motifs);
  const first = motif[0]!;

  const kind = pick(["transposition", "inversion", "retrograde"] as const);
  let transformed: number[];
  let answer: string;
  if (kind === "transposition") {
    const shift = pick([5, 7, -5, 4]);
    transformed = motif.map((n) => n + shift);
    answer = "Transposition";
  } else if (kind === "inversion") {
    transformed = motif.map((n) => first - (n - first));
    answer = "Inversion";
  } else {
    transformed = [...motif].reverse();
    answer = "Retrograde";
  }

  const choices = ["Transposition", "Inversion", "Retrograde"];
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [choices[i], choices[j]] = [choices[j]!, choices[i]!];
  }

  const describe =
    kind === "transposition"
      ? "the same shape on new pitches"
      : kind === "inversion"
        ? "the contour mirrored — ups become downs"
        : "the motif played backwards";

  return {
    kind: "transform-id",
    taskId: taskIdFor("transform-id", seed),
    prompt:
      "A short motif sounds, then returns transformed. Was it transposed, inverted, or played in retrograde?",
    audio: {
      notes: [...motif, ...transformed],
      durations: [0.4, 0.4, 0.4, 0.9, 0.4, 0.4, 0.4, 1.2],
    },
    choices,
    hints: [
      "Does the second phrase keep the shape (transposition), mirror it (inversion), or run it backwards (retrograde)?",
      "Follow the contour: same ups-and-downs, opposite ups-and-downs, or reversed note order?",
      `It is ${answer.toLowerCase()} — ${describe}. Listen once more and follow the shape.`,
    ],
    judge: (attempt) => attempt === answer,
    praise: `Exactly — ${answer.toLowerCase()}. You're hearing musical ideas transformed.`,
    nudge:
      "Listen once more — trace the shape of each phrase with your finger.",
  };
}

/* ------------------------------------------------------------------ */
/* Performance-task judgment: pure functions, unit-tested in tasks.test.ts */
/* ------------------------------------------------------------------ */

const pcOf = (m: number): number => ((m % 12) + 12) % 12;

/** Exact sequence match: every tapped note equals the target, in order. */
export function judgePerformNotes(target: number[], played: number[]): boolean {
  return (
    played.length === target.length && target.every((n, i) => played[i] === n)
  );
}

/** Default timing window for tap-back rhythms. */
export const RHYTHM_TAP_TOL_MS = 150;

/**
 * Grade a tapped-back rhythm. tapsMs are raw performance.now() stamps; the
 * first tap anchors time zero, so starting late never fails the attempt.
 * Correct when the tap count matches and every tap lands within tolMs of
 * its expected onset.
 */
export function judgeRhythmTaps(
  targetOnsetsMs: number[],
  tapsMs: number[],
  tolMs: number = RHYTHM_TAP_TOL_MS,
): boolean {
  if (tapsMs.length !== targetOnsetsMs.length || tapsMs.length === 0)
    return false;
  const t0 = tapsMs[0]!;
  return targetOnsetsMs.every(
    (onset, i) => Math.abs(tapsMs[i]! - t0 - onset) <= tolMs,
  );
}

/** Pitch tolerance for sung notes, in semitones. */
export const SING_TOL_SEMIS = 0.5;

/**
 * Grade a sung-back phrase note by note. Each sung note (as fractional
 * MIDI) must round to its target — i.e. sit within tolSemis of it.
 */
export function gradeSungPhrase(
  target: number[],
  sungMidiFloat: number[],
  tolSemis: number = SING_TOL_SEMIS,
): { perNote: boolean[]; correct: boolean } {
  const perNote = target.map((t, i) => {
    const s = sungMidiFloat[i];
    return s !== undefined && Number.isFinite(s) && Math.abs(s - t) <= tolSemis;
  });
  return {
    perNote,
    correct: sungMidiFloat.length === target.length && perNote.every(Boolean),
  };
}

/**
 * Detect parallel perfect fifths/octaves: consecutive chords where both
 * voices sit on the same perfect interval (unison, fifth, octave) and move
 * in the same direction. Pure voice-leading analysis on outer voices.
 */
export function hasParallels(lower: number[], upper: number[]): boolean {
  if (lower.length !== upper.length || lower.length < 2) return false;
  const iv = (l: number, u: number): number => (((u - l) % 12) + 12) % 12;
  for (let i = 0; i + 1 < lower.length; i++) {
    const a = iv(lower[i]!, upper[i]!);
    const b = iv(lower[i + 1]!, upper[i + 1]!);
    if ((a === 0 || a === 7) && a === b) {
      const dl = Math.sign(lower[i + 1]! - lower[i]!);
      const du = Math.sign(upper[i + 1]! - upper[i]!);
      if (dl !== 0 && dl === du) return true;
    }
  }
  return false;
}

/**
 * Order-free chord-tone check: the played pitch-class set must equal the
 * target set exactly — right notes, any order, any octave, no extras.
 */
export function matchesPitchClassSet(
  played: number[],
  targetPcs: number[],
): boolean {
  const have = new Set(played.map(pcOf));
  return have.size === targetPcs.length && targetPcs.every((p) => have.has(p));
}

/** Every played note is a chord tone (for melody-over-chords production). */
export function allChordTones(played: number[], chordPcs: number[]): boolean {
  return played.length > 0 && played.every((m) => chordPcs.includes(pcOf(m)));
}

/**
 * Neighbor figure around a reference tone: the reference, a step away (a
 * semitone or whole tone), and straight back home.
 */
export function isNeighborFigure(played: number[], tone: number): boolean {
  return (
    played.length === 3 &&
    played[0] === tone &&
    played[2] === tone &&
    (Math.abs(played[1]! - tone) === 1 || Math.abs(played[1]! - tone) === 2)
  );
}

/* ------------------------------------------------------------------ */
/* Performance task families: hear it, then play / tap / sing it back. */
/* ------------------------------------------------------------------ */

/**
 * "Hear it, play it": a short phrase sounds, then the learner plays it
 * back on the keyboard — same notes, same order. The "closing" variant is
 * the classic 7–6 sigh (F–E–C) from the Closing Gestures lesson.
 */
export function buildPerformNoteTask(
  seed: number,
  variant: string | undefined,
): PracticalTask {
  if (variant !== undefined && variant !== "closing") {
    throw new Error(`Unknown perform-note variant: "${variant}"`);
  }
  const closing = variant === "closing";
  const target = closing ? [65, 64, 60] : singPhrase(seed, 3);
  const names = target.map((m) => midiToName(m)).join(" – ");

  return {
    kind: "perform-note",
    taskId: taskIdFor(
      "perform-note",
      variant ? `${variant}:${seed}` : `${seed}`,
    ),
    prompt: closing
      ? "Listen to the closing sigh — it leans, sighs, and comes home. Now play it back on the keyboard below, in the same order."
      : "Listen to the three notes, then play them back on the keyboard below — same notes, same order.",
    audio: { notes: target, durations: target.map(() => 0.55) },
    attemptInput: {
      kind: "keyboard",
      from: 60,
      to: 72,
      expectedTaps: target.length,
    },
    hints: [
      "Sing the phrase in your head first — hear each step before your fingers move.",
      `The notes are ${names}. Find each one on the keyboard before you tap.`,
      `Tap, in order: ${names}.`,
    ],
    judge: (attempt) =>
      Array.isArray(attempt) && judgePerformNotes(target, attempt as number[]),
    praise: closing
      ? "That sigh landed perfectly — tension melting into home."
      : "Exactly — note for note, in order. Your fingers are hearing now.",
    nudge:
      "Not quite — listen once more, then tap the notes in the same order.",
  };
}

/**
 * "Hear it, tap it": a rhythm sounds on one pitch, then the learner taps
 * it back on the tap pad. The first tap anchors time zero, so starting
 * late is never punished — only the shape of time is graded, in
 * millisecond windows. Rests (silent gaps) are part of the pattern.
 */
export function buildRhythmTapTask(seed: number): PracticalTask {
  const rand = mulberry32(seed);
  // Beats per onset; negative = rest (silence keeps the beat).
  const patterns: number[][] = [
    [1, 1],
    [0.5, 0.5, 1],
    [1, 0.5, 0.5],
    [0.5, -0.5, 0.5, 1],
    [1, 1, 0.5, 0.5],
    [1.5, 0.5, 1],
  ];
  const pattern = patterns[Math.floor(rand() * patterns.length)]!;
  const beatMs = 450;
  const onsets: number[] = [];
  const notes: number[] = [];
  const durations: number[] = [];
  let t = 0;
  for (const b of pattern) {
    onsets.push(Math.round(t * beatMs));
    notes.push(b < 0 ? -1 : 67);
    durations.push((Math.abs(b) * beatMs) / 1000);
    t += Math.abs(b);
  }
  const shapeWord = (b: number) =>
    b < 0 ? "rest" : b < 1 ? "short" : b > 1 ? "long" : "steady";
  const shape = pattern.map(shapeWord).join(" – ");

  return {
    kind: "rhythm-tap",
    taskId: taskIdFor("rhythm-tap", seed),
    prompt:
      "Listen to the rhythm, then tap it back on the pad below — the same shape in time. Your first tap starts the clock, so take a breath before you begin.",
    audio: { notes, durations },
    attemptInput: { kind: "tap-pad", beatMs },
    hints: [
      "Count along while it plays — “1 and 2 and” — and feel where each tap lands.",
      `The pattern goes: ${shape}. Tap it exactly that way.`,
      "Tap steadily: your first tap starts your clock, and each tap should land where you heard the sound.",
    ],
    judge: (attempt) =>
      Array.isArray(attempt) && judgeRhythmTaps(onsets, attempt as number[]),
    praise: "Right on the beat — you played time itself back.",
    nudge:
      "Listen once more and tap along with the sound before you try on your own.",
  };
}

/**
 * "Hear it, sing it": a short phrase sounds, then the learner sings it
 * back into the microphone, one note at a time. Each note lands when the
 * detected pitch holds within ±50 cents of the target; grading is per
 * note, in fractional MIDI, so the feedback can name exactly which note
 * drifted.
 */
export function buildSingBackTask(seed: number): PracticalTask {
  const phrase = singPhrase(seed, 4);
  const names = phrase.map((m) => midiToName(m)).join(" – ");

  return {
    kind: "sing-back",
    taskId: taskIdFor("sing-back", seed),
    prompt:
      "Listen to the phrase, then sing it back on a comfortable “ah” — one note at a time. Each note lands when you hold it in tune.",
    audio: { notes: phrase, durations: phrase.map(() => 0.6) },
    attemptInput: { kind: "mic", phrase },
    hints: [
      "Hum the phrase first to find your starting note — no rush.",
      `The phrase is ${names}. Hear each step before you sing it.`,
      "If a note won't land, slide gently until the meter settles — small moves.",
    ],
    judge: (attempt) =>
      Array.isArray(attempt) &&
      gradeSungPhrase(phrase, attempt as number[]).correct,
    praise: "Beautiful — every note landed in tune. Your voice found them all.",
    nudge: "Listen once more, then sing it slowly — one steady note at a time.",
  };
}

/**
 * "Which way is the wind blowing?": a four-note phrase on one pitch with
 * rising or falling gains. The learner names the dynamic shape —
 * crescendo or diminuendo. The performance connection: dynamics shape
 * feeling without changing a single pitch.
 */
export function buildDynamicsIdTask(seed: number): PracticalTask {
  const rand = mulberry32(seed);
  const crescendo = rand() < 0.5;
  const gains = crescendo ? [0.18, 0.34, 0.52, 0.72] : [0.72, 0.52, 0.34, 0.18];
  const answer = crescendo
    ? "Crescendo — growing louder"
    : "Diminuendo — growing softer";
  const choices = ["Crescendo — growing louder", "Diminuendo — growing softer"];
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [choices[i], choices[j]] = [choices[j]!, choices[i]!];
  }

  return {
    kind: "dynamics-id",
    taskId: taskIdFor("dynamics-id", seed),
    prompt:
      "Four notes, same pitch — but the volume is moving. Is it a crescendo or a diminuendo?",
    audio: { notes: [62, 62, 62, 62], durations: [0.5, 0.5, 0.5, 0.7], gains },
    choices,
    hints: [
      "Does the phrase feel like it's leaning toward you — or stepping away?",
      crescendo
        ? "Each note arrives a little stronger than the last — that's the wind rising."
        : "Each note arrives a little gentler than the last — that's the wind falling.",
      `It is ${answer.toLowerCase()}. Listen once more and ride the volume.`,
    ],
    judge: (attempt) => attempt === answer,
    praise: `Exactly — ${answer.toLowerCase()}. You're hearing shape in loudness.`,
    nudge:
      "Listen once more — is the last note stronger or gentler than the first?",
  };
}

/**
 * "Which one has more edge?": the same pitch twice — once pure (sine),
 * once buzzier (triangle). The learner picks which note has more edge,
 * connecting the lesson's “ah vs ee” experiment to oscillator color.
 */
export function buildTimbreIdTask(seed: number): PracticalTask {
  const rand = mulberry32(seed);
  const edgyFirst = rand() < 0.5;
  const types: OscillatorType[] = edgyFirst
    ? ["triangle", "sine"]
    : ["sine", "triangle"];
  const answer = edgyFirst ? "Note 1" : "Note 2";

  return {
    kind: "timbre-id",
    taskId: taskIdFor("timbre-id", seed),
    prompt:
      "Two notes, same pitch — but one is smooth and pure, the other has more edge and buzz. Which one has more edge — 1 or 2?",
    audio: { notes: [65, 65], durations: [0.7, 0.9], types },
    choices: ["Note 1", "Note 2"],
    hints: [
      "Forget the pitch — it's identical. Listen to the color: round and hollow, or bright and reedy?",
      "The buzzier note carries more overtones — like “ee” against “ah”.",
      `Note ${answer === "Note 1" ? "1" : "2"} has the edge. Listen once more and hear the color.`,
    ],
    judge: (attempt) => attempt === answer,
    praise: "Exactly — you heard the color inside the pitch. That's timbre.",
    nudge: "Listen once more — which note sounds buzzier, more reedy?",
  };
}

/**
 * Reading the staff, two ways:
 * - "identify": a note on the staff (label hidden) — name its letter.
 * - "produce": read the staff note, then play it on the keyboard.
 */
export function buildStaffIdTask(
  seed: number,
  variant: string | undefined,
): PracticalTask {
  if (
    variant !== undefined &&
    variant !== "identify" &&
    variant !== "produce"
  ) {
    throw new Error(`Unknown staff-id variant: "${variant}"`);
  }
  const mode = variant ?? "identify";
  const rand = mulberry32(seed);
  const pool = [64, 65, 67, 69, 71, 72, 74, 76, 77, 79]; // E4..G5, no ledger lines needed
  const target = pool[Math.floor(rand() * pool.length)]!;
  const letter = midiToName(target).replace(/\d/, "");
  const visual: LessonVisual = {
    kind: "staff",
    clef: "treble",
    notes: [target],
    labels: [""],
  };

  if (mode === "produce") {
    return {
      kind: "staff-id",
      taskId: taskIdFor("staff-id", `produce:${seed}`),
      prompt: "Read the note on the staff, then play it on the keyboard below.",
      visual,
      audio: { notes: [target], durations: [0.8] },
      attemptInput: { kind: "keyboard", from: 60, to: 79, expectedTaps: 1 },
      hints: [
        "Lines, bottom to top: E G B D F. Spaces: F A C E. Where does the note sit?",
        `Count from the bottom line (E): the note is ${letter}. Find it on the keyboard.`,
        `It is ${letter} — play ${midiToName(target)} on the keyboard.`,
      ],
      judge: (attempt) =>
        Array.isArray(attempt) &&
        judgePerformNotes([target], attempt as number[]),
      praise: `Exactly — ${letter}, read and played. The page is becoming sound.`,
      nudge: "Read it once more — line or space? — then find that key.",
    };
  }

  // Distractors: neighboring letters from the pool, unique.
  const idx = pool.indexOf(target);
  const neighborLetters = [pool[idx - 1], pool[idx + 1]]
    .filter((n): n is number => n !== undefined)
    .map((n) => midiToName(n).replace(/\d/, ""))
    .filter((l) => l !== letter)
    .slice(0, 2);
  const choices = [...neighborLetters, letter];
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [choices[i], choices[j]] = [choices[j]!, choices[i]!];
  }

  return {
    kind: "staff-id",
    taskId: taskIdFor("staff-id", `identify:${seed}`),
    prompt: "Read the note on the staff. Which letter name is it?",
    visual,
    audio: { notes: [target], durations: [0.8] },
    choices,
    hints: [
      "Lines, bottom to top: E G B D F (“Every Good Boy Deserves Fudge”). Spaces: F A C E (“face”).",
      "Is the note sitting on a line, or in a space? Count up from the bottom.",
      `It is ${letter}. Look once more and see it.`,
    ],
    judge: (attempt) => attempt === letter,
    praise: `Exactly — ${letter}. You're reading the map.`,
    nudge: "Look once more — line or space? Count from the bottom line (E).",
  };
}

/**
 * Key signatures, two ways:
 * - "identify": hear a major scale, name the key signature it belongs to.
 * - "produce": given a major key, build its signature from memory —
 *   which accidentals does it contain?
 */
export function buildKeysignIdTask(
  seed: number,
  variant: string | undefined,
): PracticalTask {
  if (
    variant !== undefined &&
    variant !== "identify" &&
    variant !== "produce"
  ) {
    throw new Error(`Unknown keysign-id variant: "${variant}"`);
  }
  const mode = variant ?? "identify";
  const rand = mulberry32(seed);
  const keys = [
    { key: "G", n: 1, sharp: true },
    { key: "D", n: 2, sharp: true },
    { key: "A", n: 3, sharp: true },
    { key: "F", n: 1, sharp: false },
    { key: "Bb", n: 2, sharp: false },
    { key: "Eb", n: 3, sharp: false },
  ];
  const pick = keys[Math.floor(rand() * keys.length)]!;
  const sig = keySignatureOf(pick.key);
  const order = pick.sharp ? ORDER_OF_SHARPS : ORDER_OF_FLATS;
  const accList = order.slice(0, pick.n).join(" ");
  const countWord = `${pick.n} ${pick.sharp ? "sharp" : "flat"}${pick.n > 1 ? "s" : ""}`;
  // Sanity: the authored table must agree with music.ts.
  if ((pick.sharp ? sig.sharps : sig.flats) !== pick.n) {
    throw new Error(`Key signature table mismatch for ${pick.key}`);
  }
  const label = `${pick.key} major — ${countWord} (${accList})`;

  if (mode === "produce") {
    // Physical production: play the major scale itself. The key signature
    // isn't a list to recite — it's the sharps/flats your fingers must obey.
    const tonicPc = nameToMidi(`${pick.key}4`) % 12;
    let base = 60 + tonicPc;
    if (base + 12 > 72) base -= 12;
    const scale = [...majorScale(base), base + 12];
    return {
      kind: "keysign-id",
      taskId: taskIdFor("keysign-id", `produce:${seed}`),
      prompt: `Play the ${pick.key} major scale ascending, starting on ${midiToName(base, pick.sharp ? "sharp" : "flat").replace(/\d/, "")} — the key signature (${countWord}: ${accList}) decides which notes are sharp or flat.`,
      audio: {
        notes: scale,
        durations: scale.map(() => 0.4),
      },
      attemptInput: {
        kind: "keyboard",
        from: base,
        to: base + 12,
        expectedTaps: 8,
      },
      hints: [
        pick.sharp
          ? "Sharps arrive in order: “Father Charles Goes Down And Ends Battle” — F♯ C♯ G♯ D♯ A♯ E♯ B♯."
          : "Flats arrive in order: “Battle Ends And Down Goes Charles' Father” — B♭ E♭ A♭ D♭ G♭ C♭ F♭.",
        `This scale needs ${accList} — find ${pick.sharp ? "the sharpened" : "the flattened"} keys before you play.`,
        "Listen to the demo once, then play all eight notes from bottom to top.",
      ],
      judge: (attempt) => judgePerformNotes(scale, attempt as number[]),
      praise: `Exactly — ${accList}, under your fingers. The signature is in your hands now.`,
      nudge:
        "Listen to the demo once more — which notes are sharp or flat? Then play the scale again.",
    };
  }

  const distractors = keys
    .filter((k) => k.key !== pick.key)
    .sort(() => rand() - 0.5)
    .slice(0, 2)
    .map((k) => {
      const o = k.sharp ? ORDER_OF_SHARPS : ORDER_OF_FLATS;
      return `${k.key} major — ${k.n} ${k.sharp ? "sharp" : "flat"}${k.n > 1 ? "s" : ""} (${o.slice(0, k.n).join(" ")})`;
    });
  const choices = [label, ...distractors];
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [choices[i], choices[j]] = [choices[j]!, choices[i]!];
  }
  const tonic = nameToMidi(`${pick.key}4`);
  const scale = [...majorScale(tonic), tonic + 12];

  return {
    kind: "keysign-id",
    taskId: taskIdFor("keysign-id", `identify:${seed}`),
    prompt: "Listen to the major scale. Which key signature does it belong to?",
    audio: { notes: scale, durations: scale.map(() => 0.4) },
    choices,
    hints: [
      "The key signature is the scale's fingerprint — which sharps or flats does this scale demand?",
      `Listen for the telltale altered notes: this scale needs ${countWord}.`,
      `It is ${label}. Listen once more and hear the ${pick.sharp ? "sharps" : "flats"}.`,
    ],
    judge: (attempt) => attempt === label,
    praise: `Exactly — ${label}. You're reading keys by ear.`,
    nudge: "Listen once more — which notes are sharpened or flattened?",
  };
}

/**
 * Consonance and tension, two ways:
 * - "identify": hear an interval — settled or tense?
 * - "produce": play any two notes that clash (a dissonant interval).
 */
export function buildConsonanceIdTask(
  seed: number,
  variant: string | undefined,
): PracticalTask {
  if (
    variant !== undefined &&
    variant !== "identify" &&
    variant !== "produce"
  ) {
    throw new Error(`Unknown consonance-id variant: "${variant}"`);
  }
  const mode = variant ?? "identify";
  const rand = mulberry32(seed);
  const pick = <T>(arr: readonly T[]): T =>
    arr[Math.floor(rand() * arr.length)]!;

  if (mode === "produce") {
    return {
      kind: "consonance-id",
      taskId: taskIdFor("consonance-id", `produce:${seed}`),
      prompt:
        "Play any two notes that clash — a tense, dissonant interval that wants to move (like a minor second).",
      audio: { notes: [60, 61], durations: [0.6, 1.0] },
      attemptInput: { kind: "keyboard", from: 60, to: 72, expectedTaps: 2 },
      hints: [
        "Seconds and sevenths bite; thirds and sixths are sweet. Aim for the bite.",
        "Try two neighboring keys — a half step apart. Feel the rub?",
        "Play any minor second (one semitone) or major seventh — both ache to resolve.",
      ],
      judge: (attempt) => {
        if (!Array.isArray(attempt)) return false;
        const played = attempt as number[];
        return (
          played.length === 2 && !isConsonant(Math.abs(played[1]! - played[0]!))
        );
      },
      praise:
        "There's the ache — beautifully tense. Now you know what dissonance feels like under your fingers.",
      nudge:
        "Aim closer together — neighbors clash; thirds rest. Try a half step.",
    };
  }

  const consonant = [3, 4, 7, 8, 9];
  const dissonant = [1, 2, 6, 10, 11];
  const tense = rand() < 0.5;
  const lower = 60 + Math.floor(rand() * 5);
  const upper = lower + pick(tense ? dissonant : consonant);
  const answer = tense ? "Dissonant — tense" : "Consonant — settled";

  return {
    kind: "consonance-id",
    taskId: taskIdFor("consonance-id", `identify:${seed}`),
    prompt:
      "Two notes, low then high. Does the interval sound settled — or tense, like it wants to move?",
    audio: { notes: [lower, upper], durations: [0.6, 1.0] },
    choices: ["Consonant — settled", "Dissonant — tense"],
    hints: [
      "Let the second note ring. Does your ear relax — or lean forward, waiting?",
      tense
        ? "Seconds and sevenths bite — this one wants to resolve."
        : "Thirds, sixths, and perfect intervals rest — this one is home.",
      `It is ${answer.toLowerCase()}. Sit with it once more and feel the ${tense ? "pull" : "rest"}.`,
    ],
    judge: (attempt) => attempt === answer,
    praise: `Exactly — ${answer.toLowerCase()}. You're feeling harmony's gravity.`,
    nudge: "Listen once more — does it rest, or does it lean?",
  };
}

/**
 * Roman numerals, two ways:
 * - "identify": hear the home chord (I), then a mystery chord — name its numeral.
 * - "produce": play the named chord (I, IV, or V) in the given major key.
 */
export function buildNumeralIdTask(
  seed: number,
  variant: string | undefined,
): PracticalTask {
  if (
    variant !== undefined &&
    variant !== "identify" &&
    variant !== "produce"
  ) {
    throw new Error(`Unknown numeral-id variant: "${variant}"`);
  }
  const mode = variant ?? "produce";
  const rand = mulberry32(seed);
  const keys = ["C", "F", "G"];
  const degrees = [
    { n: "I", iv: [0, 4, 7] },
    { n: "IV", iv: [5, 9, 12] },
    { n: "V", iv: [7, 11, 14] },
  ];
  const key = keys[Math.floor(rand() * keys.length)]!;
  const deg = degrees[Math.floor(rand() * degrees.length)]!;
  const tonic = nameToMidi(`${key}4`);
  const home = [0, 4, 7].map((s) => tonic + s);
  const triad = deg.iv.map((s) => tonic + s);
  const triadPcs = triad.map((m) => ((m % 12) + 12) % 12);
  const arp = (ns: number[]) => ({
    notes: ns,
    durations: ns.map((_, i) => (i === ns.length - 1 ? 0.9 : 0.35)),
  });

  if (mode === "identify") {
    const choices = ["I", "IV", "V"];
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [choices[i], choices[j]] = [choices[j]!, choices[i]!];
    }
    return {
      kind: "numeral-id",
      taskId: taskIdFor("numeral-id", `identify:${seed}`),
      prompt: `You hear the home chord (I) in ${key} major, then a mystery chord. Which roman numeral is the mystery chord?`,
      audio: {
        notes: [...home, ...triad],
        segments: [
          { label: "Home chord (I)", ...arp(home) },
          { label: "Mystery chord", ...arp(triad) },
        ],
      },
      choices,
      hints: [
        "Compare the mystery chord to home: does it feel like home itself, a neighbor, or the dominant pulling?",
        "The V chord leans forward hard; IV feels like a sibling; I feels like arrival.",
        `It is ${deg.n}. Listen once more and feel its relationship to home.`,
      ],
      judge: (attempt) => attempt === deg.n,
      praise: `Exactly — ${deg.n} in ${key} major. You're reading harmony's grammar.`,
      nudge: "Listen once more — home, neighbor, or the one that pulls?",
    };
  }

  return {
    kind: "numeral-id",
    taskId: taskIdFor("numeral-id", `produce:${seed}`),
    prompt: `Play the ${deg.n} chord in ${key} major on the keyboard below — three notes, any order, any octave.`,
    audio: {
      notes: home,
      durations: home.map((_, i) => (i === home.length - 1 ? 0.9 : 0.35)),
    },
    attemptInput: { kind: "keyboard", from: 60, to: 72, expectedTaps: 3 },
    hints: [
      `${deg.n} in ${key} major is built on scale degree ${deg.iv[0] === 0 ? "1" : deg.iv[0] === 5 ? "4" : "5"} — stack two thirds above it.`,
      `The chord tones are ${triad.map((m) => midiToName(m)).join(", ")}. Find all three.`,
      `Play ${triad.map((m) => midiToName(m)).join(" – ")} in any order.`,
    ],
    judge: (attempt) =>
      Array.isArray(attempt) &&
      matchesPitchClassSet(attempt as number[], triadPcs),
    praise: `That's the ${deg.n} chord — ${key} major under your fingers.`,
    nudge: "Check your three notes — are they all chord tones, with no extras?",
  };
}

/**
 * Melody over chords, two ways:
 * - "identify": hear the chord, then two melodies — which sits entirely on chord tones?
 * - "produce": play a three-note melody using only chord tones.
 */
export function buildMelodyFitTask(
  seed: number,
  variant: string | undefined,
): PracticalTask {
  if (
    variant !== undefined &&
    variant !== "identify" &&
    variant !== "produce"
  ) {
    throw new Error(`Unknown melody-fit variant: "${variant}"`);
  }
  const mode = variant ?? "produce";
  const rand = mulberry32(seed);
  const pick = <T>(arr: readonly T[]): T =>
    arr[Math.floor(rand() * arr.length)]!;
  const roots = [60, 65, 67]; // C, F, G
  const root = pick(roots);
  const chord = [root, root + 4, root + 7];
  const chordPcs = chord.map((m) => ((m % 12) + 12) % 12);
  const toneNames = chord
    .map((m) => midiToName(m).replace(/\d/, ""))
    .join(", ");
  const arp = (ns: number[]) => ({
    notes: ns,
    durations: ns.map((_, i) => (i === ns.length - 1 ? 1.0 : 0.35)),
  });

  /** A 3-note melody from chord tones across two octaves. */
  const goodMelody = () =>
    [0, 1, 2].map(() => chord[pick([0, 1, 2])]! + (rand() < 0.5 ? 0 : 12));

  if (mode === "identify") {
    const good = goodMelody();
    const bad = [...good];
    const strayIdx = Math.floor(rand() * 3);
    // A non-chord scale tone: the 2nd or 4th degree above the root.
    bad[strayIdx] = root + pick([2, 5]) + (rand() < 0.5 ? 0 : 12);
    const goodFirst = rand() < 0.5;
    const answer = goodFirst ? "Melody 1" : "Melody 2";
    return {
      kind: "melody-fit",
      taskId: taskIdFor("melody-fit", `identify:${seed}`),
      prompt:
        "Hear the chord, then two melodies. One uses only chord tones; the other strays. Which melody sits entirely on the chord?",
      audio: {
        notes: chord,
        segments: [
          { label: "The chord", ...arp(chord) },
          {
            label: "Melody 1",
            notes: goodFirst ? good : bad,
            durations: [0.4, 0.4, 0.8],
          },
          {
            label: "Melody 2",
            notes: goodFirst ? bad : good,
            durations: [0.4, 0.4, 0.8],
          },
        ],
      },
      choices: ["Melody 1", "Melody 2"],
      hints: [
        `The chord tones are ${toneNames}. Hum them, then test each melody note against them.`,
        "The stray note will feel like it leans — listen for the one that doesn't quite belong.",
        `${answer} stays on the chord. Listen once more and catch the stray note.`,
      ],
      judge: (attempt) => attempt === answer,
      praise: "Exactly — you heard which line belongs to the harmony.",
      nudge: "Listen once more — which melody has a note that leans away?",
    };
  }

  return {
    kind: "melody-fit",
    taskId: taskIdFor("melody-fit", `produce:${seed}`),
    prompt: `Play a three-note melody using ONLY chord tones (${toneNames}) — any order, any octave. Make it yours.`,
    audio: { notes: chord, durations: [0.35, 0.35, 1.0] },
    attemptInput: { kind: "keyboard", from: 60, to: 72, expectedTaps: 3 },
    hints: [
      `Chord tones are home: ${toneNames}. Every other note is a visitor — leave the visitors out this time.`,
      "Try landing on the root, then wandering between the other two tones.",
      `Play any three of ${toneNames} — for example ${chord.map((m) => midiToName(m)).join(" – ")}.`,
    ],
    judge: (attempt) =>
      Array.isArray(attempt) && allChordTones(attempt as number[], chordPcs),
    praise:
      "Lovely — every note sat on the chord. That's melody floating on harmony.",
    nudge:
      "One of your notes strayed off the chord — stick to the chord tones this time.",
  };
}

/**
 * "Which candidate moves cleanly?": two two-chord outer-voice
 * progressions as duets — one with parallel fifths/octaves, one without.
 * The learner picks the clean one. Construction uses rejection sampling
 * over the seeded rng, verified by hasParallels.
 */
export function buildParallelIdTask(seed: number): PracticalTask {
  const rand = mulberry32(seed);
  const pick = <T>(arr: readonly T[]): T =>
    arr[Math.floor(rand() * arr.length)]!;

  /** A two-chord frame with genuine parallel perfect intervals. */
  const buildParallel = (): { lower: number[]; upper: number[] } => {
    const iv = pick([7, 12]);
    const l1 = pick([48, 50]);
    const dir = l1 === 48 ? 1 : -1;
    const l2 = l1 + 2 * dir;
    return { lower: [l1, l2], upper: [l1 + iv, l2 + iv] };
  };
  /** A two-chord frame with contrary motion — never parallels. */
  const buildClean = (): { lower: number[]; upper: number[] } => {
    const templates: Array<{ lower: number[]; upper: number[] }> = [
      { lower: [48, 50], upper: [67, 65] },
      { lower: [50, 48], upper: [64, 67] },
      { lower: [48, 48], upper: [60, 64] },
    ];
    return pick(templates);
  };

  let parallel = buildParallel();
  let guard = 0;
  while (!hasParallels(parallel.lower, parallel.upper) && guard++ < 50)
    parallel = buildParallel();
  let clean = buildClean();
  guard = 0;
  while (hasParallels(clean.lower, clean.upper) && guard++ < 50)
    clean = buildClean();

  const cleanFirst = rand() < 0.5;
  const first = cleanFirst ? clean : parallel;
  const second = cleanFirst ? parallel : clean;
  const answer = cleanFirst ? "Candidate 1" : "Candidate 2";
  const seg = (label: string, v: { lower: number[]; upper: number[] }) => ({
    label,
    notes: [],
    voices: [
      { label: "Lower voice", notes: v.lower, durations: [0.7, 1.1] },
      { label: "Upper voice", notes: v.upper, durations: [0.7, 1.1] },
    ],
  });

  return {
    kind: "parallel-id",
    taskId: taskIdFor("parallel-id", seed),
    prompt:
      "Two candidates, two voices each. One has parallel fifths or octaves — the voices fuse into one. Which candidate moves cleanly, with NO parallels?",
    audio: {
      notes: [],
      segments: [seg("Candidate 1", first), seg("Candidate 2", second)],
    },
    choices: ["Candidate 1", "Candidate 2"],
    hints: [
      "Listen to each candidate's two voices together. Do they stay two distinct voices — or melt into one?",
      "Parallels happen when both voices move the same way between the same perfect interval.",
      `${answer} is the clean one. Listen once more and hear the voices stay separate.`,
    ],
    judge: (attempt) => attempt === answer,
    praise:
      "Exactly — two voices, moving like a proper council, not a fused echo.",
    nudge: "Listen once more — which candidate's voices melt into one?",
  };
}

/**
 * Melodic decoration, two ways:
 * - "identify": hear a three-note figure — passing tone or neighbor tone?
 * - "produce": play a neighbor figure around C (step away and back).
 */
export function buildDecorationIdTask(
  seed: number,
  variant: string | undefined,
): PracticalTask {
  if (
    variant !== undefined &&
    variant !== "identify" &&
    variant !== "produce"
  ) {
    throw new Error(`Unknown decoration-id variant: "${variant}"`);
  }
  const mode = variant ?? "produce";
  const rand = mulberry32(seed);
  const pick = <T>(arr: readonly T[]): T =>
    arr[Math.floor(rand() * arr.length)]!;

  if (mode === "identify") {
    const passing = rand() < 0.5;
    const figure = passing
      ? pick([
          [60, 62, 64],
          [65, 64, 62],
        ])
      : pick([
          [60, 62, 60],
          [67, 65, 67],
        ]);
    const answer = passing ? "Passing tone" : "Neighbor tone";
    return {
      kind: "decoration-id",
      taskId: taskIdFor("decoration-id", `identify:${seed}`),
      prompt:
        "Three notes: the middle one decorates the line. Does it pass through to a new tone — or lean away and come back?",
      audio: { notes: figure, durations: [0.4, 0.4, 0.9] },
      choices: ["Passing tone", "Neighbor tone"],
      hints: [
        "Where does the figure end? A passing tone arrives somewhere new; a neighbor returns home.",
        passing
          ? "The line keeps walking forward — the middle note fills the gap."
          : "The line steps out and steps right back — the middle note is a detour.",
        `It is a ${answer.toLowerCase()}. Listen once more and track the middle note.`,
      ],
      judge: (attempt) => attempt === answer,
      praise: `Exactly — a ${answer.toLowerCase()}. You're hearing ornament do its work.`,
      nudge:
        "Listen once more — does the last note arrive somewhere new, or back home?",
    };
  }

  return {
    kind: "decoration-id",
    taskId: taskIdFor("decoration-id", `produce:${seed}`),
    prompt:
      "Play a neighbor figure around C: start on C, step to the note beside it, then come straight back home — three notes.",
    audio: { notes: [60], durations: [1.2] },
    attemptInput: { kind: "keyboard", from: 60, to: 72, expectedTaps: 3 },
    hints: [
      "A neighbor tone steps away and returns: C – D – C.",
      "The first and last notes must both be C; the middle one sits right beside it.",
      "Play C, then D, then C again.",
    ],
    judge: (attempt) =>
      Array.isArray(attempt) && isNeighborFigure(attempt as number[], 60),
    praise:
      "There's the decoration — away and home again. The line is ornamented.",
    nudge: "Start and end on C, with one neighboring note in the middle.",
  };
}

/**
 * Closely related keys, two ways:
 * - "identify": hear a phrase in C, then in a related key — which one?
 * - "produce": name the dominant key of a given major key.
 */
export function buildRelatedIdTask(
  seed: number,
  variant: string | undefined,
): PracticalTask {
  if (
    variant !== undefined &&
    variant !== "identify" &&
    variant !== "produce"
  ) {
    throw new Error(`Unknown related-id variant: "${variant}"`);
  }
  const mode = variant ?? "produce";
  const rand = mulberry32(seed);
  const pick = <T>(arr: readonly T[]): T =>
    arr[Math.floor(rand() * arr.length)]!;

  /** I–V–I arpeggio in the given key; final tonic held longer. */
  const phrase = (tonic: number) => {
    const I = [tonic, tonic + 4, tonic + 7];
    const V = [tonic + 7, tonic + 11, tonic + 14];
    const notes = [...I, ...V, ...I];
    const durations = [0.3, 0.3, 0.7, 0.3, 0.3, 0.7, 0.4, 0.4, 1.4];
    return { notes, durations };
  };

  if (mode === "identify") {
    const target = pick([
      { key: "G", tonic: 67, label: "G major — the dominant" },
      { key: "F", tonic: 65, label: "F major — the subdominant" },
    ]);
    const p1 = phrase(60);
    const p2 = phrase(target.tonic);
    return {
      kind: "related-id",
      taskId: taskIdFor("related-id", `identify:${seed}`),
      prompt:
        "The first phrase is in C major. The second moves to a closely related key — which one?",
      audio: {
        notes: [...p1.notes, ...p2.notes],
        durations: [...p1.durations, ...p2.durations],
        segments: [
          { label: "First phrase (C major)", ...p1 },
          { label: "Second phrase", ...p2 },
        ],
      },
      choices: [
        "G major — the dominant",
        "F major — the subdominant",
        "A minor — the relative minor",
      ],
      hints: [
        "Follow each phrase to its resting note — where is home the second time?",
        target.key === "G"
          ? "The dominant key sits a fifth above — brighter, one sharp."
          : "The subdominant key sits a fifth below — warmer, one flat.",
        `It is ${target.label}. Listen once more and track the home note.`,
      ],
      judge: (attempt) => attempt === target.label,
      praise: `Exactly — ${target.label}. You're hearing the neighborhood of keys.`,
      nudge:
        "Listen once more — does the second home sit higher or lower than C?",
    };
  }

  const bases = [
    { base: "C", dom: "G", domTonic: 67 },
    { base: "F", dom: "C", domTonic: 60 },
    { base: "G", dom: "D", domTonic: 62 },
    { base: "Bb", dom: "F", domTonic: 65 },
  ];
  const entry = pick(bases);
  const triadPcs = [0, 4, 7].map((iv) => (entry.domTonic + iv) % 12);

  return {
    kind: "related-id",
    taskId: taskIdFor("related-id", `produce:${seed}`),
    prompt: `${entry.base} major's dominant key — its closest neighbor, a fifth above — is ${entry.dom} major. Play the ${entry.dom} major tonic triad on the keyboard to plant your flag in the new key.`,
    audio: {
      notes: [entry.domTonic, entry.domTonic + 4, entry.domTonic + 7],
      durations: [0.5, 0.5, 1.2],
    },
    attemptInput: { kind: "keyboard", from: 60, to: 72, expectedTaps: 3 },
    hints: [
      "The dominant key sits a perfect fifth above the tonic — and its tonic triad is major.",
      `Build the triad from ${entry.dom}: root, a major third above, a perfect fifth above.`,
      "Listen to the demo triad once, then play those three pitch classes in any order or octave.",
    ],
    judge: (attempt) => matchesPitchClassSet(attempt as number[], triadPcs),
    praise: `Exactly — the ${entry.dom} major triad. You've arrived in the dominant key.`,
    nudge:
      "Listen to the demo triad once more, then find those three notes on the keyboard.",
  };
}

/**
 * "Name the doorway": a pivot chord sounds between an old-key phrase and
 * a new-key phrase. The learner names the pivot's function in the NEW key.
 * Seeded over genuine shared chords (C→G and C→F), all diatonic in both.
 */
export function buildPivotIdTask(
  seed: number,
  variant?: string,
): PracticalTask {
  if (
    variant !== undefined &&
    variant !== "identify" &&
    variant !== "produce"
  ) {
    throw new Error(`Unknown pivot-id variant: "${variant}"`);
  }
  const mode = variant ?? "identify";
  const rand = mulberry32(seed);
  const pick = <T>(arr: readonly T[]): T =>
    arr[Math.floor(rand() * arr.length)]!;
  type Pivot = { chord: number[]; name: string; old: string; new: string };
  const table: Record<string, { newKey: string; pivots: Pivot[] }> = {
    G: {
      newKey: "G",
      pivots: [
        { chord: [57, 60, 64], name: "A minor", old: "vi", new: "ii" },
        { chord: [64, 67, 71], name: "E minor", old: "iii", new: "vi" },
        { chord: [60, 64, 67], name: "C major", old: "I", new: "IV" },
      ],
    },
    F: {
      newKey: "F",
      pivots: [
        { chord: [62, 65, 69], name: "D minor", old: "ii", new: "vi" },
        { chord: [57, 60, 64], name: "A minor", old: "vi", new: "iii" },
        { chord: [60, 64, 67], name: "C major", old: "I", new: "V" },
      ],
    },
  };
  const newKey = pick(["G", "F"]);
  const entry = table[newKey]!;
  const pivot = pick(entry.pivots);
  const phrase = (tonic: number) => {
    const I = [tonic, tonic + 4, tonic + 7];
    const V = [tonic + 7, tonic + 11, tonic + 14];
    const notes = [...I, ...V, ...I];
    const durations = [0.3, 0.3, 0.7, 0.3, 0.3, 0.7, 0.4, 0.4, 1.4];
    return { notes, durations };
  };
  const pOld = phrase(60);
  const pNew = phrase(nameToMidi(`${newKey}4`));
  const pivotArp = {
    notes: pivot.chord,
    durations: pivot.chord.map((_, i) =>
      i === pivot.chord.length - 1 ? 1.2 : 0.4,
    ),
  };

  if (mode === "produce") {
    // Physical production: play the shared chord itself. The doorway isn't
    // a label — it's three notes your hand can hold.
    const pcs = pivot.chord.map((n) => ((n % 12) + 12) % 12);
    return {
      kind: "pivot-id",
      taskId: taskIdFor("pivot-id", `produce:${seed}`),
      prompt: `The pivot chord between C major and ${newKey} major is ${pivot.name} — ${pivot.old} in the old key, ${pivot.new} in the new. Play it on the keyboard: three notes, any order or octave.`,
      audio: {
        notes: [...pOld.notes, ...pivot.chord, ...pNew.notes],
        segments: [
          { label: "Old key: C major", ...pOld },
          { label: `The pivot chord (${pivot.name})`, ...pivotArp },
          { label: `New key: ${newKey} major`, ...pNew },
        ],
      },
      attemptInput: { kind: "keyboard", from: 60, to: 72, expectedTaps: 3 },
      hints: [
        "The pivot chord is literally the same notes in both keys — that's what makes the doorway work.",
        `Hear the middle chord in the demo: ${pivot.name}. Find those three pitch classes.`,
        "Play the three notes together or as an arpeggio — order and octave don't matter.",
      ],
      judge: (attempt) => matchesPitchClassSet(attempt as number[], pcs),
      praise: `Exactly — ${pivot.name}, the doorway itself, under your fingers.`,
      nudge:
        "Listen to the middle chord in the demo once more, then find those three notes.",
    };
  }
  const numeralPool = ["ii", "iii", "IV", "V", "vi"].filter(
    (n) => n !== pivot.new && n !== pivot.old,
  );
  const distractor = pick(numeralPool);
  const choices = [pivot.new, pivot.old, distractor];
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [choices[i], choices[j]] = [choices[j]!, choices[i]!];
  }

  return {
    kind: "pivot-id",
    taskId: taskIdFor("pivot-id", seed),
    prompt: `The middle chord is the doorway — ${pivot.name}, at home in both keys. In the NEW key (${newKey} major), it functions as…`,
    audio: {
      notes: [...pOld.notes, ...pivot.chord, ...pNew.notes],
      segments: [
        { label: "Old key: C major", ...pOld },
        { label: `The pivot chord (${pivot.name})`, ...pivotArp },
        { label: `New key: ${newKey} major`, ...pNew },
      ],
    },
    choices,
    hints: [
      `In the old key (C major) it is ${pivot.old} — now re-hear it as a citizen of ${newKey} major.`,
      "Count scale degrees in the new key: which degree does the chord's root sit on?",
      `In ${newKey} major it is ${pivot.new}. Hear it once more wearing its new meaning.`,
    ],
    judge: (attempt) => attempt === pivot.new,
    praise: `Exactly — ${pivot.new} in ${newKey} major. You watched the doorway swing.`,
    nudge:
      "Hear the pivot chord inside the new key's phrase — which scale degree is its root?",
  };
}

/**
 * Extensions, two ways:
 * - "identify": hear a seventh chord, then the same chord with an
 *   extension on top — name the extension (9th, 11th, 13th).
 * - "produce": hear Cmaj7, then play the named extension above it.
 */
export function buildExtensionIdTask(
  seed: number,
  variant: string | undefined,
): PracticalTask {
  if (
    variant !== undefined &&
    variant !== "identify" &&
    variant !== "produce"
  ) {
    throw new Error(`Unknown extension-id variant: "${variant}"`);
  }
  const mode = variant ?? "produce";
  const rand = mulberry32(seed);
  const pick = <T>(arr: readonly T[]): T =>
    arr[Math.floor(rand() * arr.length)]!;
  const base = [60, 64, 67, 71]; // Cmaj7
  const ext = pick([
    { n: "9th", midi: 74 },
    { n: "11th", midi: 77 },
    { n: "13th", midi: 81 },
  ]);
  const arp = (ns: number[]) => ({
    notes: ns,
    durations: ns.map((_, i) => (i === ns.length - 1 ? 1.1 : 0.35)),
  });

  if (mode === "identify") {
    return {
      kind: "extension-id",
      taskId: taskIdFor("extension-id", `identify:${seed}`),
      prompt:
        "A seventh chord sounds, then returns wearing one more note on top. Which extension was added?",
      audio: {
        notes: [...base, ...base, ext.midi],
        segments: [
          { label: "Seventh chord", ...arp(base) },
          { label: "With extension", ...arp([...base, ext.midi]) },
        ],
      },
      choices: ["9th", "11th", "13th"],
      hints: [
        "The new note sits on top — how far above the root does it float?",
        "The 9th is a step above the octave; the 11th a fourth; the 13th a sixth.",
        `It is the ${ext.n}. Listen once more and hear how high it floats.`,
      ],
      judge: (attempt) => attempt === ext.n,
      praise: `Exactly — the ${ext.n}. You're hearing the perfume on the chord.`,
      nudge:
        "Listen once more — focus on the very top note. How high does it float?",
    };
  }

  return {
    kind: "extension-id",
    taskId: taskIdFor("extension-id", `produce:${seed}`),
    prompt: `This is Cmaj7. Add the ${ext.n} on top — play it on the keyboard above the chord.`,
    audio: { notes: base, durations: [0.35, 0.35, 0.35, 1.1] },
    attemptInput: { kind: "keyboard", from: 60, to: 84, expectedTaps: 1 },
    hints: [
      `The ${ext.n} sits ${ext.n === "9th" ? "a whole step above the octave" : ext.n === "11th" ? "a fourth above the octave" : "a sixth above the octave"} — count up from C.`,
      `The note is ${midiToName(ext.midi)}. Find it above middle C.`,
      `Play ${midiToName(ext.midi)} — the ${ext.n} crowning the chord.`,
    ],
    judge: (attempt) =>
      Array.isArray(attempt) &&
      judgePerformNotes([ext.midi], attempt as number[]),
    praise: `There's the ${ext.n} — Cmaj${ext.n === "9th" ? "9" : ext.n === "11th" ? "11" : "13"} under your fingers.`,
    nudge: `Aim higher — the ${ext.n} floats above the seventh. Count up from C.`,
  };
}

/**
 * "Diatonic or borrowed?": a four-chord phrase I–?–V–I where the middle
 * chord is either IV or the borrowed iv (from C minor). The learner names
 * which world the visitor comes from.
 */
export function buildBorrowedIdTask(seed: number): PracticalTask {
  const rand = mulberry32(seed);
  const borrowed = rand() < 0.5;
  const I = [60, 64, 67];
  const mid = borrowed ? [65, 68, 72] : [65, 69, 72]; // Fm vs F
  const V = [67, 71, 74];
  const notes = [...I, ...mid, ...V, ...I];
  const durations = notes.map((_, i) => (i === notes.length - 1 ? 1.1 : 0.35));
  const answer = borrowed ? "Borrowed — the minor iv" : "Diatonic — all major";

  return {
    kind: "borrowed-id",
    taskId: taskIdFor("borrowed-id", seed),
    prompt:
      "Four chords: home, a visitor, tension, home. Does the visitor come from C major — or borrowed from C minor?",
    audio: { notes, durations },
    choices: ["Diatonic — all major", "Borrowed — the minor iv"],
    hints: [
      "Listen to the second chord: bright and open (major), or darkened (minor)?",
      "The borrowed iv steals F minor from C minor — hear the shadow pass through the phrase.",
      `It is ${answer.toLowerCase()}. Listen once more and feel the ${borrowed ? "shadow" : "light"}.`,
    ],
    judge: (attempt) => attempt === answer,
    praise: `Exactly — ${answer.toLowerCase()}. You're hearing borrowed color.`,
    nudge: "Listen once more — focus on the second chord. Bright, or darkened?",
  };
}

/**
 * Development and form, two ways:
 * - "identify": hear two parts — restatement or development?
 * - "produce": develop the motif by sequencing it up one step (D–E–F).
 */
export function buildFormIdTask(
  seed: number,
  variant: string | undefined,
): PracticalTask {
  if (
    variant !== undefined &&
    variant !== "identify" &&
    variant !== "produce"
  ) {
    throw new Error(`Unknown form-id variant: "${variant}"`);
  }
  const mode = variant ?? "produce";
  const rand = mulberry32(seed);
  const motif = [60, 62, 64];
  const durations = [0.4, 0.4, 0.9];

  if (mode === "identify") {
    const developed = rand() < 0.5;
    const kind = rand() < 0.5 ? "inversion" : "fragment";
    const devNotes = kind === "inversion" ? [60, 58, 56] : [64, 62];
    const part2 = developed ? devNotes : motif;
    const answer = developed
      ? "New material — development"
      : "Same material — restatement";
    return {
      kind: "form-id",
      taskId: taskIdFor("form-id", `identify:${seed}`),
      prompt:
        "Two parts. Does the second restate the opening idea — or develop it into something new?",
      audio: {
        notes: [...motif, ...part2],
        segments: [
          { label: "Part 1", notes: motif, durations },
          { label: "Part 2", notes: part2, durations: part2.map(() => 0.5) },
        ],
      },
      choices: ["Same material — restatement", "New material — development"],
      hints: [
        "Compare the shapes: same ups-and-downs, or has the idea been turned or broken?",
        developed
          ? kind === "inversion"
            ? "The contour is mirrored — ups became downs. That's development."
            : "Only a fragment returns, repeated — the idea broken into pieces. That's development."
          : "The same three notes return unchanged — that's restatement.",
        `It is ${answer.toLowerCase()}. Listen once more and track the idea.`,
      ],
      judge: (attempt) => attempt === answer,
      praise: `Exactly — ${answer.toLowerCase()}. You're hearing form think.`,
      nudge:
        "Listen once more — does Part 2 say the same thing, or take the idea somewhere new?",
    };
  }

  return {
    kind: "form-id",
    taskId: taskIdFor("form-id", `produce:${seed}`),
    prompt:
      "Develop the motif by sequencing it up one step: play D – E – F on the keyboard.",
    audio: { notes: motif, durations },
    attemptInput: { kind: "keyboard", from: 60, to: 72, expectedTaps: 3 },
    hints: [
      "A sequence repeats the idea higher: every note of C – D – E moves up one step.",
      "C becomes D, D becomes E, E becomes F.",
      "Play D – E – F — the motif, one step uphill.",
    ],
    judge: (attempt) =>
      Array.isArray(attempt) &&
      judgePerformNotes([62, 64, 65], attempt as number[]),
    praise:
      "There's the sequence — the same idea, one step uphill. That's development under your fingers.",
    nudge: "Move every note of C – D – E up one step: D – E – F.",
  };
}

/** Build a concrete task from an authored spec (deterministic per seed). */
export function buildTask(lessonId: string, spec: TaskSpec): PracticalTask {
  switch (spec.kind) {
    case "compare-pitch":
      return buildComparePitchTask(spec.seed);
    case "note-id":
      return buildNoteIdTask(spec.seed);
    case "rhythm-echo":
      return buildRhythmEchoTask(spec.seed);
    case "scale-id":
      return buildScaleIdTask(spec.seed, spec.variant);
    case "interval-id":
      return buildIntervalIdTask(spec.seed);
    case "chord-id":
      return buildChordIdTask(spec.seed, spec.variant);
    case "cadence-id":
      return buildCadenceIdTask(spec.seed, spec.variant);
    case "motion-id":
      return buildMotionIdTask(spec.seed);
    case "modulation-id":
      return buildModulationIdTask(spec.seed, spec.variant);
    case "seventh-id":
      return buildSeventhIdTask(spec.seed);
    case "meter-id":
      return buildMeterIdTask(spec.seed);
    case "species-id":
      return buildSpeciesIdTask(spec.seed, spec.variant);
    case "transform-id":
      return buildTransformIdTask(spec.seed);
    case "perform-note":
      return buildPerformNoteTask(spec.seed, spec.variant);
    case "rhythm-tap":
      return buildRhythmTapTask(spec.seed);
    case "sing-back":
      return buildSingBackTask(spec.seed);
    case "dynamics-id":
      return buildDynamicsIdTask(spec.seed);
    case "timbre-id":
      return buildTimbreIdTask(spec.seed);
    case "staff-id":
      return buildStaffIdTask(spec.seed, spec.variant);
    case "keysign-id":
      return buildKeysignIdTask(spec.seed, spec.variant);
    case "consonance-id":
      return buildConsonanceIdTask(spec.seed, spec.variant);
    case "numeral-id":
      return buildNumeralIdTask(spec.seed, spec.variant);
    case "melody-fit":
      return buildMelodyFitTask(spec.seed, spec.variant);
    case "parallel-id":
      return buildParallelIdTask(spec.seed);
    case "decoration-id":
      return buildDecorationIdTask(spec.seed, spec.variant);
    case "related-id":
      return buildRelatedIdTask(spec.seed, spec.variant);
    case "pivot-id":
      return buildPivotIdTask(spec.seed, spec.variant);
    case "extension-id":
      return buildExtensionIdTask(spec.seed, spec.variant);
    case "borrowed-id":
      return buildBorrowedIdTask(spec.seed);
    case "form-id":
      return buildFormIdTask(spec.seed, spec.variant);
    case "self-attempt":
      return buildSelfAttemptTask(lessonId, spec.prompt);
  }
}

/** The fallback every unauthored lesson gets: honest practice, no judgment. */
export function buildSelfAttemptTask(
  lessonId: string,
  prompt?: string,
): PracticalTask {
  return {
    kind: "self-attempt",
    taskId: taskIdFor("self-attempt", lessonId),
    prompt:
      prompt ??
      `Try the key idea from this lesson at your instrument (or hum it). When you've given it an honest attempt, mark it done. There is no wrong attempt here; trying is the step.`,
    hints: [],
    judge: () => true,
    praise: "Done is better than perfect. The idea is in your hands now.",
    nudge: "",
  };
}
