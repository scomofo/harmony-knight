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
  | "chord-id"
  | "cadence-id"
  | "motion-id"
  | "modulation-id"
  | "seventh-id"
  | "meter-id"
  | "species-id";

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
    /**
     * Optional simultaneous voices (e.g. two-part counterpoint). When
     * present, the UI renders a single control that starts one sequence
     * per voice on the same lane, so they sound together and stop together.
     */
    voices?: { label: string; notes: number[]; durations?: number[] }[];
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

/**
 * "Which ending?": a two-chord progression in a seeded major key, each chord
 * arpeggiated bottom-to-top with a held final note marking the boundary.
 * Two variants:
 * - "final": authentic (V–I) vs plagal (IV–I) — both close on the tonic.
 * - "open": closed ending (…–I) vs half cadence (…–V).
 */
export function buildCadenceIdTask(seed: number, variant: string | undefined): PracticalTask {
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
  const nudge = "Listen once more — focus on the very last chord. Home, or leaning forward?";

  if (mode === "open") {
    const firstPool = [I, IV, V];
    first = firstPool[Math.floor(rand() * firstPool.length)]!;
    const endsHome = rand() < 0.5;
    second = endsHome ? I : V;
    answer = endsHome ? "Closed (ends on I)" : "Open (ends on V)";
    prompt = "Listen to the phrase ending. Does it sound finished — or unfinished?";
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
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)]!;

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
  const tryBuild = (l1: number, u1: number, motion: Motion): number[] | null => {
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
      for (const dl of lDirs) for (const du of uDirs) if (du === -dl) pairs.push([dl, du]);
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
    prompt: "Play each voice on its own, then decide: how do the two voices move together?",
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
export function buildModulationIdTask(seed: number, variant: string | undefined): PracticalTask {
  if (variant !== undefined && variant !== "detect" && variant !== "where") {
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
    prompt = "The second phrase moves to a new key a fifth away. Which direction — brighter or warmer?";
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
    prompt = "Listen to both phrases. Does the second phrase stay in the same key — or move to a new one?";
    choices = ["Same key", "New key"];
    hints = [
      "Listen to where each phrase comes to rest. Does the second phrase land on the same home note as the first?",
      "Hum the final note of each phrase. Same pitch — or different?",
      `The second phrase is in ${same ? "the same key" : "a new key"}. Listen once more and track the home note.`,
    ];
    praise = `Exactly — ${same ? "same key" : "a new key"}. Your ear is tracking tonal home.`;
  }

  const p1 = phrase(tonic, 1.6); // longer hold = the gap between phrases
  const p2 = phrase(secondTonic, 1.2);
  return {
    kind: "modulation-id",
    taskId: taskIdFor("modulation-id", `${mode}:${seed}`),
    prompt,
    audio: { notes: [...p1.notes, ...p2.notes], durations: [...p1.durations, ...p2.durations] },
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
    prompt: "Listen to the seventh chord, arpeggiated bottom to top. Major seventh or dominant seventh?",
    audio: { notes, durations: [0.35, 0.35, 0.35, 1.0] },
    choices: ["Major seventh", "Dominant seventh"],
    hints: [
      "Listen to the top note — the seventh. Sweet and glowing, or bluesy and leaning?",
      "Sing the bottom and top notes together: a major seventh sits one half-step below the octave; a minor seventh a whole step below.",
      `It is ${answer} — ${rootName}${isMaj7 ? "maj7" : "7"}. Listen once more and feel the top note.`,
    ],
    judge: (attempt) => attempt === answer,
    praise: `Exactly — ${rootName}${isMaj7 ? "maj7" : "7"}. You're hearing chord color.`,
    nudge: "Listen once more, and lean into the very top note — glowing or leaning?",
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
    prompt: "Listen to the pulses — the low note marks each downbeat. How many beats are in each bar?",
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
export function buildSpeciesIdTask(seed: number, variant: string | undefined): PracticalTask {
  if (variant !== "early" && variant !== "late") {
    throw new Error(`Unknown species-id variant: "${variant}"`);
  }
  const rand = mulberry32(seed);
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)]!;

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
    variant === "early" ? pick(["first", "second", "third"] as const) : pick(["second", "fourth", "fifth"] as const);

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
      const passing = i < cf.length - 1 ? skeleton[i]! + step : skeleton[i]! - 2;
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
      n = Math.max(cf[0]! + 12, Math.min(cf[0]! + 26, n + pick([-2, -1, 1, 2])));
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
        { label: "Cantus firmus (slow)", notes: [...cf], durations: cf.map(() => CF_DUR) },
        { label: "Counterpoint", notes: cpNotes, durations: cpDurations },
      ],
    },
    choices,
    hints: [countHint, theoryHint, `It is ${answer.toLowerCase()} — listen once more and feel the rhythmic relationship.`],
    judge: (attempt) => attempt === answer,
    praise: `Exactly — ${answer.toLowerCase()}. You're hearing how independent lines share time.`,
    nudge: "Listen once more — count the upper notes against each slow bass note.",
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
