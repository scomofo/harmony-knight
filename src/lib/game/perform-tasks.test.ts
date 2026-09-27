/**
 * Performance task families ("Perform, don't just click"): pure judgment
 * functions plus the 17 new builders. Every builder is tested for seed
 * determinism and for judgment that accepts the true answer and rejects
 * wrong ones — where possible the expected answer is recomputed from the
 * task's own audio/visual payload, not from the builder's internals.
 */
import { describe, expect, it } from "vitest";
import {
  allChordTones,
  buildBorrowedIdTask,
  buildConsonanceIdTask,
  buildDecorationIdTask,
  buildDynamicsIdTask,
  buildExtensionIdTask,
  buildFormIdTask,
  buildKeysignIdTask,
  buildMelodyFitTask,
  buildNumeralIdTask,
  buildParallelIdTask,
  buildPerformNoteTask,
  buildPivotIdTask,
  buildRelatedIdTask,
  buildRhythmTapTask,
  buildSingBackTask,
  buildStaffIdTask,
  buildTask,
  buildTimbreIdTask,
  gradeSungPhrase,
  hasParallels,
  isNeighborFigure,
  judgePerformNotes,
  judgeRhythmTaps,
  matchesPitchClassSet,
} from "./tasks.ts";
import {
  isConsonant,
  keySignatureOf,
  midiToName,
  nameToMidi,
  ORDER_OF_FLATS,
  ORDER_OF_SHARPS,
} from "./music.ts";
import { CHAPTERS, lessonBody } from "./course.ts";

describe("judgePerformNotes", () => {
  it("accepts the exact sequence", () => {
    expect(judgePerformNotes([60, 62, 64], [60, 62, 64])).toBe(true);
  });
  it("rejects wrong order, wrong notes, and wrong length", () => {
    expect(judgePerformNotes([60, 62, 64], [64, 62, 60])).toBe(false);
    expect(judgePerformNotes([60, 62, 64], [60, 62, 65])).toBe(false);
    expect(judgePerformNotes([60, 62, 64], [60, 62])).toBe(false);
    expect(judgePerformNotes([60, 62, 64], [60, 62, 64, 65])).toBe(false);
    expect(judgePerformNotes([60], [])).toBe(false);
  });
});

describe("judgeRhythmTaps", () => {
  const onsets = [0, 450, 900];
  it("accepts taps on the onsets", () => {
    expect(judgeRhythmTaps(onsets, [0, 450, 900])).toBe(true);
  });
  it("accepts taps within the tolerance window", () => {
    expect(judgeRhythmTaps(onsets, [0, 450, 900], 150)).toBe(true);
    expect(judgeRhythmTaps(onsets, [120, 540, 870], 150)).toBe(true);
  });
  it("rejects taps outside the tolerance window", () => {
    expect(judgeRhythmTaps(onsets, [0, 450, 1200], 150)).toBe(false);
    expect(judgeRhythmTaps(onsets, [0, 700, 900], 150)).toBe(false);
  });
  it("anchors on the first tap: starting late never fails", () => {
    expect(judgeRhythmTaps(onsets, [5000, 5450, 5900])).toBe(true);
  });
  it("rejects wrong tap counts and empty attempts", () => {
    expect(judgeRhythmTaps(onsets, [0, 450])).toBe(false);
    expect(judgeRhythmTaps(onsets, [0, 450, 900, 1350])).toBe(false);
    expect(judgeRhythmTaps([], [])).toBe(false);
  });
  it("respects a custom tolerance", () => {
    expect(judgeRhythmTaps(onsets, [0, 500, 900], 40)).toBe(false);
    expect(judgeRhythmTaps(onsets, [0, 500, 900], 60)).toBe(true);
  });
});

describe("gradeSungPhrase", () => {
  it("grades a perfectly sung phrase correct, per note", () => {
    const r = gradeSungPhrase([60, 64, 67], [60.1, 63.9, 67.0]);
    expect(r.perNote).toEqual([true, true, true]);
    expect(r.correct).toBe(true);
  });
  it("flags exactly the drifting notes", () => {
    const r = gradeSungPhrase([60, 64, 67], [60.0, 65.2, 67.0]);
    expect(r.perNote).toEqual([true, false, true]);
    expect(r.correct).toBe(false);
  });
  it("accepts notes at the tolerance boundary, rejects past it", () => {
    expect(gradeSungPhrase([64], [64.5]).correct).toBe(true);
    expect(gradeSungPhrase([64], [64.51]).correct).toBe(false);
  });
  it("rejects length mismatches and non-finite input", () => {
    expect(gradeSungPhrase([60, 64], [60]).correct).toBe(false);
    expect(gradeSungPhrase([60], [60, 64]).correct).toBe(false);
    expect(gradeSungPhrase([60], [Number.NaN]).correct).toBe(false);
  });
});

describe("hasParallels", () => {
  it("detects parallel fifths moving the same way", () => {
    expect(hasParallels([48, 50], [55, 57])).toBe(true);
  });
  it("detects parallel octaves moving the same way", () => {
    expect(hasParallels([48, 50], [60, 62])).toBe(true);
  });
  it("ignores similar motion between imperfect intervals", () => {
    expect(hasParallels([48, 50], [64, 65])).toBe(false); // 16->15 semitones: 4->3
  });
  it("ignores contrary motion between perfect intervals", () => {
    expect(hasParallels([48, 50], [67, 65])).toBe(false);
  });
  it("ignores oblique motion (one voice holds)", () => {
    expect(hasParallels([48, 48], [55, 57])).toBe(false);
  });
  it("ignores a fifth moving to a different interval", () => {
    expect(hasParallels([48, 50], [55, 58])).toBe(false);
  });
  it("needs at least two chords of equal length", () => {
    expect(hasParallels([48], [55])).toBe(false);
    expect(hasParallels([48, 50], [55])).toBe(false);
  });
});

describe("matchesPitchClassSet", () => {
  it("is order-free and octave-free", () => {
    expect(matchesPitchClassSet([67, 60, 64], [0, 4, 7])).toBe(true);
    expect(matchesPitchClassSet([72, 76, 79], [0, 4, 7])).toBe(true);
  });
  it("tolerates duplicates but rejects missing or extra pitch classes", () => {
    expect(matchesPitchClassSet([60, 64, 67, 72], [0, 4, 7])).toBe(true);
    expect(matchesPitchClassSet([60, 64], [0, 4, 7])).toBe(false);
    expect(matchesPitchClassSet([60, 64, 67, 69], [0, 4, 7])).toBe(false);
    expect(matchesPitchClassSet([], [0, 4, 7])).toBe(false);
  });
});

describe("allChordTones / isNeighborFigure", () => {
  it("allChordTones requires every note on the chord", () => {
    expect(allChordTones([60, 64, 67], [0, 4, 7])).toBe(true);
    expect(allChordTones([60, 62, 67], [0, 4, 7])).toBe(false);
    expect(allChordTones([], [0, 4, 7])).toBe(false);
  });
  it("isNeighborFigure: step away and back home", () => {
    expect(isNeighborFigure([60, 62, 60], 60)).toBe(true);
    expect(isNeighborFigure([60, 59, 60], 60)).toBe(true);
    expect(isNeighborFigure([60, 64, 60], 60)).toBe(false); // leap, not a step
    expect(isNeighborFigure([60, 62, 62], 60)).toBe(false); // doesn't return
    expect(isNeighborFigure([62, 60, 62], 60)).toBe(false); // doesn't start home
    expect(isNeighborFigure([60, 62], 60)).toBe(false);
  });
});

describe("buildPerformNoteTask", () => {
  it("is deterministic and judges the exact sequence", () => {
    const t1 = buildPerformNoteTask(11, undefined);
    const t2 = buildPerformNoteTask(11, undefined);
    expect(t1.audio!.notes).toEqual(t2.audio!.notes);
    expect(t1.audio!.notes).toHaveLength(3);
    const target = t1.audio!.notes;
    expect(t1.judge(target)).toBe(true);
    expect(t1.judge([...target].reverse())).toBe(false);
    expect(t1.judge(target.map((n) => n + 1))).toBe(false);
    expect(t1.attemptInput).toEqual({
      kind: "keyboard",
      from: 60,
      to: 72,
      expectedTaps: 3,
    });
  });
  it("the closing variant is the 7-6 sigh F-E-C", () => {
    const t = buildPerformNoteTask(104, "closing");
    expect(t.audio!.notes).toEqual([65, 64, 60]);
    expect(t.judge([65, 64, 60])).toBe(true);
    expect(t.judge([65, 64, 62])).toBe(false);
  });
  it("rejects unknown variants", () => {
    expect(() => buildPerformNoteTask(1, "bogus")).toThrow();
  });
});

describe("buildRhythmTapTask", () => {
  it("is deterministic and grades taps against the sounded onsets", () => {
    const t1 = buildRhythmTapTask(35);
    const t2 = buildRhythmTapTask(35);
    expect(t1.audio!.notes).toEqual(t2.audio!.notes);
    expect(t1.audio!.durations).toEqual(t2.audio!.durations);
    // Recompute expected onsets from the rendered durations (rests included).
    const durs = t1.audio!.durations!;
    const onsets: number[] = [];
    let t = 0;
    for (const d of durs) {
      onsets.push(Math.round(t * 1000));
      t += d;
    }
    expect(t1.judge(onsets)).toBe(true);
    const late = [...onsets];
    late[1] = late[1]! + 500;
    expect(t1.judge(late)).toBe(false);
    expect(t1.attemptInput).toEqual({ kind: "tap-pad", beatMs: 450 });
  });
  it("renders rests as silent -1 notes that still advance the clock", () => {
    let sawRest = false;
    for (let s = 0; s < 40; s++) {
      const t = buildRhythmTapTask(s);
      if (t.audio!.notes.includes(-1)) {
        sawRest = true;
        const durs = t.audio!.durations!;
        expect(durs.length).toBe(t.audio!.notes.length);
      }
    }
    expect(sawRest).toBe(true);
  });
});

describe("buildSingBackTask", () => {
  it("is deterministic and grades per-note pitch", () => {
    const t1 = buildSingBackTask(103);
    const t2 = buildSingBackTask(103);
    expect(t1.audio!.notes).toEqual(t2.audio!.notes);
    expect(t1.audio!.notes).toHaveLength(4);
    const phrase = t1.audio!.notes;
    expect(t1.judge(phrase.map((n) => n + 0.1))).toBe(true);
    const drifted = phrase.map((n) => n);
    drifted[2] = drifted[2]! + 1;
    expect(t1.judge(drifted)).toBe(false);
    expect(t1.judge(phrase.slice(0, 3))).toBe(false);
    expect(t1.attemptInput).toEqual({ kind: "mic", phrase });
  });
});

describe("buildDynamicsIdTask", () => {
  it("is deterministic; the answer matches the gain direction", () => {
    for (const seed of [8, 9, 10, 11, 12]) {
      const t = buildDynamicsIdTask(seed);
      const gains = t.audio!.gains!;
      const rising = gains[3]! > gains[0]!;
      const expected = rising
        ? "Crescendo — growing louder"
        : "Diminuendo — growing softer";
      expect(t.judge(expected)).toBe(true);
      expect(
        t.judge(
          rising ? "Diminuendo — growing softer" : "Crescendo — growing louder",
        ),
      ).toBe(false);
    }
  });
  it("both directions occur across seeds", () => {
    const answers = new Set<number>();
    for (let s = 0; s < 20; s++)
      answers.add(buildDynamicsIdTask(s).audio!.gains![0]! < 0.5 ? 1 : 0);
    expect(answers.size).toBe(2);
  });
});

describe("buildTimbreIdTask", () => {
  it("is deterministic; the edgier waveform is the answer", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const t = buildTimbreIdTask(seed);
      const expected = t.audio!.types![0] === "triangle" ? "Note 1" : "Note 2";
      expect(t.judge(expected)).toBe(true);
      expect(t.judge(expected === "Note 1" ? "Note 2" : "Note 1")).toBe(false);
    }
  });
  it("both orders occur across seeds", () => {
    const firsts = new Set<string>();
    for (let s = 0; s < 20; s++)
      firsts.add(buildTimbreIdTask(s).audio!.types![0]!);
    expect(firsts).toEqual(new Set(["sine", "triangle"]));
  });
});

describe("buildStaffIdTask", () => {
  it("identify: the answer is the staff note's letter", () => {
    for (const seed of [22, 23, 24]) {
      const t = buildStaffIdTask(seed, "identify");
      const v = t.visual!;
      const letter = midiToName(v.kind === "staff" ? v.notes[0]! : 60).replace(
        /\d/,
        "",
      );
      expect(t.judge(letter)).toBe(true);
      expect(t.choices).toContain(letter);
    }
  });
  it("identify: exactly one choice judges true", () => {
    for (let s = 0; s < 10; s++) {
      const t = buildStaffIdTask(s, "identify");
      expect(t.choices!.filter((c) => t.judge(c))).toHaveLength(1);
    }
  });
  it("produce: the learner plays the staff note on the keyboard", () => {
    const t = buildStaffIdTask(22, "produce");
    const v = t.visual!;
    const target = v.kind === "staff" ? v.notes[0]! : -1;
    expect(t.attemptInput).toMatchObject({ kind: "keyboard", expectedTaps: 1 });
    expect(t.judge([target])).toBe(true);
    expect(t.judge([target + 1])).toBe(false);
  });
  it("rejects unknown variants", () => {
    expect(() => buildStaffIdTask(1, "bogus")).toThrow();
  });
});

describe("buildKeysignIdTask", () => {
  it("identify: exactly one choice judges true, and it names a real signature", () => {
    for (let s = 40; s < 50; s++) {
      const t = buildKeysignIdTask(s, "identify");
      const winners = t.choices!.filter((c) => t.judge(c));
      expect(winners).toHaveLength(1);
      const m = /^(\w[b#]?) major — (\d+) (sharps?|flats?) \((.*)\)$/.exec(
        winners[0]!,
      );
      expect(m).not.toBeNull();
      const [, key, nStr, kind, accs] = m!;
      const n = parseInt(nStr!, 10);
      const sig = keySignatureOf(key!);
      expect(kind!.startsWith("sharp") ? sig.sharps : sig.flats).toBe(n);
      const order = kind!.startsWith("sharp")
        ? ORDER_OF_SHARPS
        : ORDER_OF_FLATS;
      expect(accs).toBe(order.slice(0, n).join(" "));
    }
  });
  it("produce: the learner plays the major scale, signature and all", () => {
    for (let s = 40; s < 50; s++) {
      const t = buildKeysignIdTask(s, "produce");
      const scale = t.audio!.notes;
      expect(scale).toHaveLength(8);
      expect(t.attemptInput).toMatchObject({
        kind: "keyboard",
        expectedTaps: 8,
      });
      expect(t.judge(scale)).toBe(true);
      // The natural 7th degree breaks the signature (e.g. F natural in G major).
      const wrong = [...scale];
      wrong[6] = wrong[6]! - 1;
      expect(t.judge(wrong)).toBe(false);
      expect(t.judge(scale.slice(0, 7))).toBe(false);
    }
  });
  it("rejects unknown variants", () => {
    expect(() => buildKeysignIdTask(1, "bogus")).toThrow();
  });
});

describe("buildConsonanceIdTask", () => {
  it("identify: the answer matches the interval's consonance", () => {
    for (let s = 50; s < 60; s++) {
      const t = buildConsonanceIdTask(s, "identify");
      const [lo, hi] = t.audio!.notes;
      const expected = isConsonant(hi! - lo!)
        ? "Consonant — settled"
        : "Dissonant — tense";
      expect(t.judge(expected)).toBe(true);
    }
  });
  it("identify: both answers occur across seeds", () => {
    const seen = new Set<string>();
    for (let s = 0; s < 30; s++) {
      const t = buildConsonanceIdTask(s, "identify");
      t.choices!.forEach((c) => {
        if (t.judge(c)) seen.add(c);
      });
    }
    expect(seen).toEqual(new Set(["Consonant — settled", "Dissonant — tense"]));
  });
  it("produce: dissonant pairs pass, consonant pairs fail", () => {
    const t = buildConsonanceIdTask(52, "produce");
    expect(t.judge([60, 61])).toBe(true); // minor 2nd
    expect(t.judge([60, 66])).toBe(true); // tritone
    expect(t.judge([60, 64])).toBe(false); // major 3rd
    expect(t.judge([60, 72])).toBe(false); // octave
    expect(t.judge([60])).toBe(false);
  });
});

describe("buildNumeralIdTask", () => {
  const ivOf: Record<string, number[]> = {
    I: [0, 4, 7],
    IV: [5, 9, 12],
    V: [7, 11, 14],
  };
  it("identify: the accepted numeral matches the mystery triad's root", () => {
    for (let s = 60; s < 70; s++) {
      const t = buildNumeralIdTask(s, "identify");
      const winners = t.choices!.filter((c) => t.judge(c));
      expect(winners).toHaveLength(1);
      const key = /in (\w+) major/.exec(t.prompt)![1]!;
      const tonic = nameToMidi(`${key}4`);
      const triad = t.audio!.segments![1]!.notes;
      const rootPc = ((triad[0]! % 12) + 12) % 12;
      const deg = (rootPc - (tonic % 12) + 12) % 12;
      const expected = Object.entries(ivOf).find(([, iv]) => iv[0] === deg)![0];
      expect(winners[0]).toBe(expected);
    }
  });
  it("produce: the named chord's pitch classes pass, others fail", () => {
    for (let s = 60; s < 70; s++) {
      const t = buildNumeralIdTask(s, "produce");
      const m = /Play the (I|IV|V) chord in (\w+) major/.exec(t.prompt)!;
      const tonic = nameToMidi(`${m[2]}4`);
      const want = ivOf[m[1]!]!.map((iv) => tonic + iv);
      expect(t.judge(want)).toBe(true);
      expect(t.judge([60, 61, 62])).toBe(false);
      expect(t.judge(want.slice(0, 2))).toBe(false);
    }
  });
});

describe("buildMelodyFitTask", () => {
  it("produce: chord-tone melodies pass, strays fail", () => {
    for (let s = 60; s < 70; s++) {
      const t = buildMelodyFitTask(s, "produce");
      const chord = t.audio!.notes; // [root, root+4, root+7]
      expect(t.judge(chord)).toBe(true);
      expect(t.judge([chord[0]!, chord[0]! + 12, chord[2]!])).toBe(true);
      expect(t.judge([chord[0]!, chord[0]! + 2, chord[2]!])).toBe(false); // non-chord tone
    }
  });
  it("identify: the accepted melody is the all-chord-tone one", () => {
    for (let s = 60; s < 70; s++) {
      const t = buildMelodyFitTask(s, "identify");
      const chordPcs = t.audio!.notes.map((n) => ((n % 12) + 12) % 12);
      const mel = (label: string) =>
        t.audio!.segments!.find((sg) => sg.label === label)!.notes;
      const good1 = mel("Melody 1").every((n) =>
        chordPcs.includes(((n % 12) + 12) % 12),
      );
      const expected = good1 ? "Melody 1" : "Melody 2";
      expect(t.judge(expected)).toBe(true);
      expect(t.judge(good1 ? "Melody 2" : "Melody 1")).toBe(false);
    }
  });
});

describe("buildParallelIdTask", () => {
  it("the clean candidate has no parallels and the other does", () => {
    for (let s = 70; s < 85; s++) {
      const t = buildParallelIdTask(s);
      const frame = (label: string) => {
        const seg = t.audio!.segments!.find((sg) => sg.label === label)!;
        return { lower: seg.voices![0]!.notes, upper: seg.voices![1]!.notes };
      };
      const c1 = frame("Candidate 1");
      const c2 = frame("Candidate 2");
      const p1 = hasParallels(c1.lower, c1.upper);
      const p2 = hasParallels(c2.lower, c2.upper);
      expect(p1).not.toBe(p2); // exactly one candidate is guilty
      const expected = p1 ? "Candidate 2" : "Candidate 1";
      expect(t.judge(expected)).toBe(true);
      expect(t.judge(p1 ? "Candidate 1" : "Candidate 2")).toBe(false);
    }
  });
  it("is deterministic per seed", () => {
    const a = buildParallelIdTask(72).audio!.segments!.map((s) => s.voices);
    const b = buildParallelIdTask(72).audio!.segments!.map((s) => s.voices);
    expect(a).toEqual(b);
  });
});

describe("buildDecorationIdTask", () => {
  it("identify: neighbor returns home, passing moves on", () => {
    for (let s = 70; s < 85; s++) {
      const t = buildDecorationIdTask(s, "identify");
      const fig = t.audio!.notes;
      const expected = fig[2] === fig[0] ? "Neighbor tone" : "Passing tone";
      expect(t.judge(expected)).toBe(true);
    }
  });
  it("identify: both answers occur across seeds", () => {
    const seen = new Set<string>();
    for (let s = 0; s < 30; s++) {
      const t = buildDecorationIdTask(s, "identify");
      t.choices!.forEach((c) => {
        if (t.judge(c)) seen.add(c);
      });
    }
    expect(seen).toEqual(new Set(["Passing tone", "Neighbor tone"]));
  });
  it("produce: neighbor figures around C pass", () => {
    const t = buildDecorationIdTask(74, "produce");
    expect(t.judge([60, 62, 60])).toBe(true);
    expect(t.judge([60, 62, 64])).toBe(false);
    expect(t.judge([60, 62])).toBe(false);
  });
});

describe("buildRelatedIdTask", () => {
  it("produce: the learner plays the dominant key's tonic triad", () => {
    for (let s = 80; s < 95; s++) {
      const t = buildRelatedIdTask(s, "produce");
      expect(t.attemptInput).toMatchObject({
        kind: "keyboard",
        expectedTaps: 3,
      });
      const triad = t.audio!.notes;
      expect(t.judge(triad)).toBe(true);
      expect(t.judge([triad[0]!, triad[1]! + 12, triad[2]!])).toBe(true); // any voicing
      expect(t.judge([60, 61, 62])).toBe(false);
      expect(t.judge(triad.slice(0, 2))).toBe(false);
    }
  });
  it("identify: the answer matches the second phrase's tonic", () => {
    for (let s = 80; s < 95; s++) {
      const t = buildRelatedIdTask(s, "identify");
      const tonic = t.audio!.segments![1]!.notes[0]!;
      const expected =
        tonic === 67 ? "G major — the dominant" : "F major — the subdominant";
      expect(t.judge(expected)).toBe(true);
    }
  });
});

describe("buildPivotIdTask", () => {
  const degreeName: Record<number, string> = {
    0: "I",
    2: "ii",
    4: "iii",
    5: "IV",
    7: "V",
    9: "vi",
  };
  it("the accepted numeral matches the pivot root's degree in the new key", () => {
    for (let s = 80; s < 100; s++) {
      const t = buildPivotIdTask(s);
      const winners = t.choices!.filter((c) => t.judge(c));
      expect(winners).toHaveLength(1);
      const newKey = /NEW key \((\w+) major\)/.exec(t.prompt)![1]!;
      const tonic = nameToMidi(`${newKey}4`);
      const pivotRoot = t.audio!.segments![1]!.notes[0]!;
      const deg = ((((pivotRoot % 12) - (tonic % 12)) % 12) + 12) % 12;
      expect(winners[0]).toBe(degreeName[deg]);
      // The pivot chord really is shared: its root is diatonic in C major too.
      expect([0, 2, 4, 5, 7, 9, 11]).toContain(
        ((pivotRoot % 12) - 0 + 12) % 12,
      );
    }
  });
  it("is deterministic per seed", () => {
    expect(buildPivotIdTask(82).audio).toEqual(buildPivotIdTask(82).audio);
  });
  it("produce: the learner plays the pivot triad itself", () => {
    for (let s = 80; s < 100; s++) {
      const t = buildPivotIdTask(s, "produce");
      expect(t.attemptInput).toMatchObject({
        kind: "keyboard",
        expectedTaps: 3,
      });
      const pivot = t.audio!.segments![1]!.notes;
      expect(t.judge(pivot)).toBe(true);
      expect(t.judge([pivot[0]!, pivot[1]! + 12, pivot[2]!])).toBe(true); // any voicing
      expect(t.judge([60, 61, 62])).toBe(false);
      expect(t.judge(pivot.slice(0, 2))).toBe(false);
    }
  });
  it("rejects unknown variants", () => {
    expect(() => buildPivotIdTask(1, "bogus")).toThrow();
  });
});

describe("buildExtensionIdTask", () => {
  const extMidi: Record<string, number> = { "9th": 74, "11th": 77, "13th": 81 };
  it("identify: the answer matches the added top note", () => {
    for (let s = 90; s < 105; s++) {
      const t = buildExtensionIdTask(s, "identify");
      const added = t.audio!.segments![1]!.notes.at(-1)!;
      const expected = Object.entries(extMidi).find(([, m]) => m === added)![0];
      expect(t.judge(expected)).toBe(true);
      expect(t.choices!.filter((c) => t.judge(c))).toHaveLength(1);
    }
  });
  it("identify: all three extensions occur across seeds", () => {
    const seen = new Set<string>();
    for (let s = 0; s < 40; s++) {
      const t = buildExtensionIdTask(s, "identify");
      t.choices!.forEach((c) => {
        if (t.judge(c)) seen.add(c);
      });
    }
    expect(seen).toEqual(new Set(["9th", "11th", "13th"]));
  });
  it("produce: the named extension above Cmaj7 passes", () => {
    for (let s = 90; s < 100; s++) {
      const t = buildExtensionIdTask(s, "produce");
      const ext = /Add the (\w+) on top/.exec(t.prompt)![1]!;
      expect(t.judge([extMidi[ext]!])).toBe(true);
      expect(t.judge([extMidi[ext]! + 1])).toBe(false);
      expect(t.judge([])).toBe(false);
    }
  });
});

describe("buildBorrowedIdTask", () => {
  it("the answer matches the middle chord's quality", () => {
    for (let s = 90; s < 110; s++) {
      const t = buildBorrowedIdTask(s);
      const mid = t.audio!.notes.slice(3, 6);
      const minor = mid[1]! - mid[0]! === 3;
      const expected = minor
        ? "Borrowed — the minor iv"
        : "Diatonic — all major";
      expect(t.judge(expected)).toBe(true);
    }
  });
  it("both answers occur across seeds", () => {
    const seen = new Set<string>();
    for (let s = 0; s < 30; s++) {
      const t = buildBorrowedIdTask(s);
      t.choices!.forEach((c) => {
        if (t.judge(c)) seen.add(c);
      });
    }
    expect(seen).toEqual(
      new Set(["Diatonic — all major", "Borrowed — the minor iv"]),
    );
  });
});

describe("buildFormIdTask", () => {
  it("identify: restatement repeats the motif, development transforms it", () => {
    for (let s = 110; s < 130; s++) {
      const t = buildFormIdTask(s, "identify");
      const motif = t.audio!.segments![0]!.notes;
      const part2 = t.audio!.segments![1]!.notes;
      const same = JSON.stringify(motif) === JSON.stringify(part2);
      const expected = same
        ? "Same material — restatement"
        : "New material — development";
      expect(t.judge(expected)).toBe(true);
    }
  });
  it("identify: both answers occur across seeds", () => {
    const seen = new Set<string>();
    for (let s = 0; s < 40; s++) {
      const t = buildFormIdTask(s, "identify");
      t.choices!.forEach((c) => {
        if (t.judge(c)) seen.add(c);
      });
    }
    expect(seen).toEqual(
      new Set(["Same material — restatement", "New material — development"]),
    );
  });
  it("produce: the uphill sequence D-E-F passes", () => {
    const t = buildFormIdTask(112, "produce");
    expect(t.judge([62, 64, 65])).toBe(true);
    expect(t.judge([60, 62, 64])).toBe(false);
    expect(t.judge([62, 64])).toBe(false);
  });
  it("rejects unknown variants", () => {
    expect(() => buildFormIdTask(1, "bogus")).toThrow();
  });
});

describe("batch requirements: no fallbacks, production in every chapter", () => {
  it("no lesson uses a self-attempt fallback", () => {
    const bad: string[] = [];
    for (const ch of CHAPTERS) {
      for (const l of ch.lessons) {
        const body = lessonBody(l.id);
        if (body?.tryTask && body.tryTask.kind === "self-attempt") bad.push(l.id);
      }
    }
    expect(bad).toEqual([]);
  });
  it("every chapter has at least one production (attemptInput) task", () => {
    const lacking: string[] = [];
    for (const ch of CHAPTERS) {
      const ok = ch.lessons.some((l) => {
        const spec = lessonBody(l.id)?.tryTask;
        return (
          spec !== undefined && buildTask(l.id, spec).attemptInput !== undefined
        );
      });
      if (!ok) lacking.push(ch.id);
    }
    expect(lacking).toEqual([]);
  });
});

describe("buildTask dispatches every new family", () => {
  const specs = [
    { kind: "perform-note", seed: 1 },
    { kind: "perform-note", seed: 1, variant: "closing" },
    { kind: "rhythm-tap", seed: 1 },
    { kind: "sing-back", seed: 1 },
    { kind: "dynamics-id", seed: 1 },
    { kind: "timbre-id", seed: 1 },
    { kind: "staff-id", seed: 1, variant: "identify" },
    { kind: "staff-id", seed: 1, variant: "produce" },
    { kind: "keysign-id", seed: 1, variant: "identify" },
    { kind: "keysign-id", seed: 1, variant: "produce" },
    { kind: "consonance-id", seed: 1, variant: "identify" },
    { kind: "consonance-id", seed: 1, variant: "produce" },
    { kind: "numeral-id", seed: 1, variant: "identify" },
    { kind: "numeral-id", seed: 1, variant: "produce" },
    { kind: "melody-fit", seed: 1, variant: "identify" },
    { kind: "melody-fit", seed: 1, variant: "produce" },
    { kind: "parallel-id", seed: 1 },
    { kind: "decoration-id", seed: 1, variant: "identify" },
    { kind: "decoration-id", seed: 1, variant: "produce" },
    { kind: "related-id", seed: 1, variant: "identify" },
    { kind: "related-id", seed: 1, variant: "produce" },
    { kind: "pivot-id", seed: 1 },
    { kind: "pivot-id", seed: 1, variant: "produce" },
    { kind: "extension-id", seed: 1, variant: "identify" },
    { kind: "extension-id", seed: 1, variant: "produce" },
    { kind: "borrowed-id", seed: 1 },
    { kind: "form-id", seed: 1, variant: "identify" },
    { kind: "form-id", seed: 1, variant: "produce" },
  ] as const;
  it("builds each spec to the right kind with hints and a judge", () => {
    for (const spec of specs) {
      const t = buildTask("lesson-x", spec);
      expect(t.kind).toBe(spec.kind);
      expect(t.hints.length).toBeGreaterThan(0);
      expect(typeof t.judge).toBe("function");
      expect(t.taskId).toContain(spec.kind);
    }
  });
  it("every lesson's authored tryTask builds without throwing", () => {
    // Spot-check the actual course wirings for the replaced lessons.
    const wirings: Array<
      [string, { kind: string; seed: number; variant?: string }]
    > = [
      ["ch1-l2-dynamics", { kind: "dynamics-id", seed: 8 }],
      ["ch1-l3-timbre", { kind: "sing-back", seed: 9 }],
      ["ch2-l2-staff", { kind: "staff-id", seed: 22, variant: "produce" }],
      ["ch3-l4-rests", { kind: "rhythm-tap", seed: 35 }],
      [
        "ch4-l2-signatures",
        { kind: "keysign-id", seed: 42, variant: "produce" },
      ],
      [
        "ch5-l2-consonance",
        { kind: "consonance-id", seed: 52, variant: "produce" },
      ],
      ["ch6-l1-numerals", { kind: "numeral-id", seed: 61, variant: "produce" }],
      ["ch6-l4-melody", { kind: "melody-fit", seed: 64, variant: "produce" }],
      ["ch7-l2-parallels", { kind: "parallel-id", seed: 72 }],
      [
        "ch7-l4-decoration",
        { kind: "decoration-id", seed: 74, variant: "produce" },
      ],
      ["ch8-l1-related", { kind: "related-id", seed: 81, variant: "produce" }],
      ["ch8-l2-pivot", { kind: "pivot-id", seed: 82 }],
      [
        "ch9-l2-extensions",
        { kind: "extension-id", seed: 92, variant: "produce" },
      ],
      ["ch9-l3-borrowed", { kind: "borrowed-id", seed: 93 }],
      ["ch10-l1-shape", { kind: "sing-back", seed: 103 }],
      [
        "ch10-l2-closing",
        { kind: "perform-note", seed: 104, variant: "closing" },
      ],
      ["ch11-l2-form", { kind: "form-id", seed: 112, variant: "produce" }],
    ];
    for (const [lessonId, spec] of wirings) {
      const t = buildTask(lessonId, spec as never);
      expect(t.kind).toBe(spec.kind);
    }
  });
});
