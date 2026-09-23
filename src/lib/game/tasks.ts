/**
 * tasks.ts — practical "Try it" task families.
 *
 * The roadmap asks for one practical task family per chapter, each with
 * progressive help, pure judgment, and persistence. This module is the pure
 * logic core: given lesson-relevant parameters it builds a task with
 * deterministic judgment. The UI layer renders it and the store persists it.
 */

import { buildTriad, majorScale, midiToName, naturalMinorScale } from "./music.ts";
import type { TaskSpec } from "./course.ts";

/** Stable identifiers for every task family, keyed in course.ts lesson bodies. */
export type TaskKind =
  | "self-attempt"
  | "compare-pitch"
  | "note-id"
  | "rhythm-echo"
  | "scale-id"
  | "interval-id"
  | "chord-id";

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
    /**
     * Optional separately-playable segments (e.g. target vs candidates).
     * When present, the UI renders one player per segment.
     */
    segments?: { label: string; notes: number[]; durations?: number[] }[];
  };
  /**
   * Optional fixed answer choices (rendered as buttons); the attempt value
   * is the chosen string. Absent for open-ended families (compare-pitch
   * uses its own 1/2 buttons; self-attempt needs none).
   */
  choices?: string[];
  /** Pure judgment: no UI, no persistence, deterministic on the attempt. */
  judge: (attempt: unknown) => boolean;
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
  let b = a + gapMin + Math.floor(rand() * Math.min(12, opts.high - a - gapMin));
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
    praise: "Exactly — your ears knew. High and low is pitch, and you heard it.",
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
  const shapeWord = (b: number) => (b < 1 ? "short" : b > 1 ? "long" : "steady");
  const shape = target.map(shapeWord).join(" – ");

  return {
    kind: "rhythm-echo",
    taskId: taskIdFor("rhythm-echo", seed),
    prompt: "Listen to the target rhythm, then to candidates 1 and 2. Which candidate matches the target?",
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
    praise: "Exactly — you heard the shape of time. Rhythm is pattern, and you caught it.",
    nudge: "Listen once more. Tap along — which candidate lands the same way as the target?",
  };
}

/**
 * "Major or minor?": a one-octave scale on a seeded tonic, ascending.
 * The learner identifies the quality by ear — the third degree is the
 * tell. Deterministic per seed; judgment is strict on the quality name.
 */
export function buildScaleIdTask(seed: number): PracticalTask {
  const rand = mulberry32(seed);
  const tonics = [60, 62, 64, 65, 67]; // C D E F G — singable, familiar
  const tonic = tonics[Math.floor(rand() * tonics.length)]!;
  const isMajor = rand() < 0.5;
  const steps = isMajor ? majorScale(tonic) : naturalMinorScale(tonic);
  const notes = [...steps, tonic + 12];
  const answer = isMajor ? "Major" : "Minor";
  const tonicName = midiToName(tonic).replace(/\d/, "");

  return {
    kind: "scale-id",
    taskId: taskIdFor("scale-id", seed),
    prompt: "Listen to the scale, ascending one octave. Is it major or minor?",
    audio: { notes },
    choices: ["Major", "Minor"],
    hints: [
      "Listen to the third note of the scale — major thirds sound bright and open; minor thirds sound darker, more tender.",
      "Sing the first three notes along with it: does it go “do-mi” (bright) or “do-me” (soft)?",
      `It is ${answer} — ${tonicName} ${answer.toLowerCase()}. Listen once more and lock in the color.`,
    ],
    judge: (attempt) => attempt === answer,
    praise: `Exactly — ${tonicName} ${answer.toLowerCase()}. You're hearing quality, not just notes.`,
    nudge: "Listen once more, and lean into the third note — bright or tender?",
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
export function buildChordIdTask(seed: number, variant: string | undefined): PracticalTask {
  if (variant !== undefined && variant !== "quality" && variant !== "position") {
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
      prompt: "Listen to the triad, arpeggiated bottom to top. Is the bass note the root of the chord?",
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
    prompt: "Listen to the triad, arpeggiated bottom to top. Is it major or minor?",
    audio: { notes, durations: [0.4, 0.4, 0.8] },
    choices: ["Major", "Minor"],
    hints: [
      "Listen to the middle note — the third. Bright and open, or darker and tender?",
      "Sing the first two notes: do-mi (bright) or do-me (soft)? The bottom third decides the triad.",
      `It is ${answer} — ${rootName} ${quality}. Listen once more and lock in the color.`,
    ],
    judge: (attempt) => attempt === answer,
    praise: `Exactly — ${rootName} ${quality}. You're hearing harmony, not just notes.`,
    nudge: "Listen once more, and lean into the middle note — bright or tender?",
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
      return buildScaleIdTask(spec.seed);
    case "interval-id":
      return buildIntervalIdTask(spec.seed);
    case "chord-id":
      return buildChordIdTask(spec.seed, spec.variant);
    case "self-attempt":
      return buildSelfAttemptTask(lessonId, spec.prompt);
  }
}

/** The fallback every unauthored lesson gets: honest practice, no judgment. */
export function buildSelfAttemptTask(lessonId: string, prompt?: string): PracticalTask {
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
