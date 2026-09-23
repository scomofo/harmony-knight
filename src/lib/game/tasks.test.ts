import { describe, expect, it } from "vitest";
import { buildCadenceIdTask, buildChordIdTask, buildComparePitchTask, buildIntervalIdTask, buildMeterIdTask, buildModulationIdTask, buildMotionIdTask, buildNoteIdTask, buildRhythmEchoTask, buildScaleIdTask, buildSeventhIdTask, buildSelfAttemptTask, buildSpeciesIdTask, buildTask, mulberry32, type PracticalTask } from "./tasks.ts";
import { buildTriad, majorScale, midiToName, naturalMinorScale } from "./music.ts";

describe("mulberry32", () => {
  it("is deterministic for the same seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it("differs across seeds", () => {
    const a = mulberry32(1)();
    const b = mulberry32(2)();
    expect(a).not.toBe(b);
  });
});

describe("buildComparePitchTask", () => {
  it("is deterministic per seed and judges correctly", () => {
    const t1 = buildComparePitchTask(7);
    const t2 = buildComparePitchTask(7);
    expect(t1.audio!.notes).toEqual(t2.audio!.notes);

    const notes = t1.audio!.notes;
    const answer = (notes[0] > notes[1] ? 1 : 2) as 1 | 2;
    expect(t1.judge(answer)).toBe(true);
    expect(t1.judge(answer === 1 ? 2 : 1)).toBe(false);
  });

  it("respects the note range and minimum gap", () => {
    for (const seed of [1, 2, 3, 99, 12345]) {
      const t = buildComparePitchTask(seed, { low: 48, high: 72, gapMin: 2 });
      const [n1, n2] = t.audio!.notes;
      expect(n1).toBeGreaterThanOrEqual(48);
      expect(n1).toBeLessThanOrEqual(72);
      expect(n2).toBeGreaterThanOrEqual(48);
      expect(n2).toBeLessThanOrEqual(72);
      expect(Math.abs(n1 - n2)).toBeGreaterThanOrEqual(2);
      expect(n1).not.toBe(n2);
    }
  });

  it("the two orders both occur across seeds", () => {
    const answers = new Set<number>();
    for (let s = 0; s < 20; s++) {
      const t = buildComparePitchTask(s);
      const notes = t.audio!.notes;
      answers.add(notes[0] > notes[1] ? 1 : 2);
    }
    expect(answers.has(1)).toBe(true);
    expect(answers.has(2)).toBe(true);
  });

  it("offers three progressive hints", () => {
    const t = buildComparePitchTask(5);
    expect(t.hints).toHaveLength(3);
  });

  it("generates unique task ids", () => {
    const ids = new Set([1, 2, 3].map((s) => buildComparePitchTask(s).taskId));
    expect(ids.size).toBe(3);
  });
});

describe("buildNoteIdTask", () => {
  it("is deterministic per seed and judges the exact name", () => {
    const a = buildNoteIdTask(21);
    const b = buildNoteIdTask(21);
    expect(a.taskId).toBe(b.taskId);
    expect(a.audio!.notes).toEqual(b.audio!.notes);
    expect(a.choices).toContain(midiToName(a.audio!.notes[0]!));
    const answer = a.choices!.find((c) => a.judge(c));
    expect(answer).toBe(midiToName(a.audio!.notes[0]!));
    // Letter alone is not enough: octave matters.
    const letterOnly = midiToName(a.audio!.notes[0]!).replace(/\d/, "");
    if (letterOnly !== answer) expect(a.judge(letterOnly)).toBe(false);
  });

  it("offers three progressive hints", () => {
    const t = buildNoteIdTask(21);
    expect(t.hints).toHaveLength(3);
    expect(t.hints[2]).toContain(midiToName(t.audio!.notes[0]!));
  });

  it("buildTask dispatches note-id", () => {
    const t = buildTask("ch2-l1-alphabet", { kind: "note-id", seed: 21 });
    expect(t.kind).toBe("note-id");
    expect(t.taskId).toBe("note-id:21");
  });
});

describe("buildRhythmEchoTask", () => {
  it("is deterministic per seed with exactly one matching candidate", () => {
    const a = buildRhythmEchoTask(31);
    const b = buildRhythmEchoTask(31);
    expect(a.taskId).toBe(b.taskId);
    expect(a.audio!.segments).toHaveLength(3);
    expect(a.audio!.segments!.map((s) => s.label)).toEqual([
      "Target rhythm",
      "Candidate 1",
      "Candidate 2",
    ]);
    const answers = a.choices!.filter((c) => a.judge(c));
    expect(answers).toHaveLength(1);
    // Exactly one candidate's rhythm equals the target's.
    const target = a.audio!.segments![0]!.durations!;
    const matches = a.audio!.segments!.slice(1).filter((s) => s.durations!.join() === target.join());
    expect(matches).toHaveLength(1);
    expect(matches[0]!.label).toBe(`Candidate ${answers[0]}`);
    // Pitch never varies: rhythm is the only variable.
    for (const s of a.audio!.segments!) {
      expect(new Set(s.notes).size).toBe(1);
    }
  });

  it("offers three progressive hints ending in the answer", () => {
    const t = buildRhythmEchoTask(31);
    expect(t.hints).toHaveLength(3);
    const answer = t.choices!.find((c) => t.judge(c));
    expect(t.hints[2]).toContain(`Candidate ${answer}`);
  });

  it("buildTask dispatches rhythm-echo", () => {
    expect(buildTask("ch3-l1-durations", { kind: "rhythm-echo", seed: 31 }).taskId).toBe("rhythm-echo:31");
  });
});

describe("buildScaleIdTask", () => {
  it("is deterministic per seed with exactly one correct quality", () => {
    const a = buildScaleIdTask(41);
    const b = buildScaleIdTask(41);
    expect(a.taskId).toBe(b.taskId);
    expect(a.audio!.notes).toEqual(b.audio!.notes);
    const answers = a.choices!.filter((c) => a.judge(c));
    expect(answers).toHaveLength(1);
    expect(["Major", "Minor"]).toContain(answers[0]);
  });

  it("plays a true one-octave major or minor scale", () => {
    for (const seed of [41, 42, 43, 44, 45]) {
      const t = buildScaleIdTask(seed);
      const notes = t.audio!.notes;
      expect(notes).toHaveLength(8);
      expect(notes[7]! - notes[0]!).toBe(12);
      const answer = t.choices!.find((c) => t.judge(c))!;
      const expected = answer === "Major" ? majorScale(notes[0]!) : naturalMinorScale(notes[0]!);
      expect(notes.slice(0, 7)).toEqual(expected);
    }
  });

  it("offers three progressive hints ending in the answer", () => {
    const t = buildScaleIdTask(41);
    expect(t.hints).toHaveLength(3);
    const answer = t.choices!.find((c) => t.judge(c));
    expect(t.hints[2]).toContain(answer!);
  });

  it("buildTask dispatches scale-id", () => {
    expect(buildTask("ch4-l1-major", { kind: "scale-id", seed: 41 }).taskId).toBe("scale-id:41");
  });
});

describe("buildIntervalIdTask", () => {
  it("is deterministic per seed with exactly one correct interval", () => {
    const a = buildIntervalIdTask(51);
    const b = buildIntervalIdTask(51);
    expect(a.taskId).toBe(b.taskId);
    expect(a.audio!.notes).toEqual(b.audio!.notes);
    const answers = a.choices!.filter((c) => a.judge(c));
    expect(answers).toHaveLength(1);
    expect(["3rd", "5th", "Octave"]).toContain(answers[0]);
  });

  it("plays the true interval between the two notes", () => {
    for (const seed of [51, 52, 53, 54, 55]) {
      const t = buildIntervalIdTask(seed);
      const [lo, hi] = t.audio!.notes as [number, number];
      const answer = t.choices!.find((c) => t.judge(c))!;
      const expectedSemis = answer === "3rd" ? 4 : answer === "5th" ? 7 : 12;
      expect(hi - lo).toBe(expectedSemis);
    }
  });

  it("buildTask dispatches interval-id", () => {
    expect(buildTask("ch5-l1-intervals", { kind: "interval-id", seed: 51 }).taskId).toBe("interval-id:51");
  });
});

describe("buildChordIdTask", () => {
  it("quality variant plays a true major or minor triad", () => {
    for (const seed of [53, 54, 55, 56]) {
      const t = buildChordIdTask(seed, "quality");
      const notes = t.audio!.notes;
      expect(notes).toHaveLength(3);
      const answer = t.choices!.find((c) => t.judge(c))!;
      const expected = buildTriad(notes[0]!, answer === "Major" ? "major" : "minor");
      expect(notes).toEqual(expected);
    }
  });

  it("position variant puts the third in the bass exactly when inverted", () => {
    for (const seed of [53, 54, 55, 56, 57, 58]) {
      const t = buildChordIdTask(seed, "position");
      const notes = t.audio!.notes;
      const answer = t.choices!.find((c) => t.judge(c))!;
      if (answer === "Root position") {
        expect(notes).toEqual(buildTriad(notes[0]!, "major"));
      } else {
        // First inversion: third, fifth, root+octave.
        const root = notes[2]! - 12;
        const triad = buildTriad(root, "major");
        expect(notes).toEqual([triad[1], triad[2], triad[0]! + 12]);
      }
    }
  });

  it("rejects unknown variants with a clear error", () => {
    expect(() => buildChordIdTask(1, "spicy")).toThrow(/Unknown chord-id variant/);
  });

  it("buildTask dispatches chord-id with the spec variant", () => {
    const q = buildTask("ch5-l3-triads", { kind: "chord-id", seed: 53, variant: "quality" });
    expect(q.taskId).toBe("chord-id:quality:53");
    const p = buildTask("ch5-l4-inversions", { kind: "chord-id", seed: 54, variant: "position" });
    expect(p.taskId).toBe("chord-id:position:54");
  });
});

describe("buildCadenceIdTask", () => {
  it("is deterministic per seed with exactly one correct cadence", () => {
    const a = buildCadenceIdTask(62, "final");
    const b = buildCadenceIdTask(62, "final");
    expect(a.taskId).toBe(b.taskId);
    expect(a.audio!.notes).toEqual(b.audio!.notes);
    const answers = a.choices!.filter((c) => a.judge(c));
    expect(answers).toHaveLength(1);
  });

  it("final variant always closes on the tonic triad, from V or IV", () => {
    for (const seed of [62, 63, 64, 65, 66]) {
      const t = buildCadenceIdTask(seed, "final");
      const notes = t.audio!.notes;
      expect(notes).toHaveLength(6);
      const answer = t.choices!.find((c) => t.judge(c))!;
      const tonic = notes[3]!;
      const I = [tonic, tonic + 4, tonic + 7];
      expect(notes.slice(3)).toEqual(I);
      const expectedFirst =
        answer === "Authentic (V–I)"
          ? [tonic + 7, tonic + 11, tonic + 14]
          : [tonic + 5, tonic + 9, tonic + 12];
      expect(notes.slice(0, 3)).toEqual(expectedFirst);
    }
  });

  it("open variant ends on I exactly when the answer is closed", () => {
    const eq = (a: number[], b: number[]) => a.length === b.length && a.every((n, i) => n === b[i]);
    const triadOn = (tonic: number, degree: number) => [0, 4, 7].map((s) => tonic + degree + s);
    const tonics = [60, 62, 65, 67];
    for (const seed of [62, 63, 64, 65, 66, 67]) {
      const t = buildCadenceIdTask(seed, "open");
      const notes = t.audio!.notes;
      const isClosed = t.choices!.find((c) => t.judge(c)) === "Closed (ends on I)";
      // Exactly one key tonic is consistent with both chords and the answer…
      const matches = tonics.filter((tonic) => {
        const firstOk = [0, 5, 7].some((d) => eq(notes.slice(0, 3), triadOn(tonic, d)));
        const secondOk = eq(notes.slice(3), triadOn(tonic, isClosed ? 0 : 7));
        return firstOk && secondOk;
      });
      expect(matches).toHaveLength(1);
      // …and no tonic is consistent with the opposite ending, so the answer is unambiguous.
      const opposite = tonics.filter((tonic) => {
        const firstOk = [0, 5, 7].some((d) => eq(notes.slice(0, 3), triadOn(tonic, d)));
        const secondOk = eq(notes.slice(3), triadOn(tonic, isClosed ? 7 : 0));
        return firstOk && secondOk;
      });
      expect(opposite).toHaveLength(0);
    }
  });

  it("rejects unknown variants with a clear error", () => {
    expect(() => buildCadenceIdTask(1, "spicy")).toThrow(/Unknown cadence-id variant/);
  });

  it("buildTask dispatches cadence-id with the spec variant", () => {
    const f = buildTask("ch6-l2-cadences", { kind: "cadence-id", seed: 62, variant: "final" });
    expect(f.taskId).toBe("cadence-id:final:62");
    const o = buildTask("ch6-l3-open", { kind: "cadence-id", seed: 63, variant: "open" });
    expect(o.taskId).toBe("cadence-id:open:63");
  });
});

describe("buildMotionIdTask", () => {
  it("is deterministic per seed with exactly one correct motion", () => {
    const a = buildMotionIdTask(71);
    const b = buildMotionIdTask(71);
    expect(a.taskId).toBe(b.taskId);
    expect(a.audio!.segments).toEqual(b.audio!.segments);
    const answers = a.choices!.filter((c) => a.judge(c));
    expect(answers).toHaveLength(1);
    expect(["Similar motion", "Contrary motion", "Oblique motion"]).toContain(answers[0]);
  });

  it("renders one segment per voice with two notes each", () => {
    const t = buildMotionIdTask(71);
    expect(t.audio!.segments).toHaveLength(2);
    expect(t.audio!.segments!.map((s) => s.label)).toEqual(["Lower voice", "Upper voice"]);
    for (const seg of t.audio!.segments!) expect(seg.notes).toHaveLength(2);
  });

  it("builds true similar/contrary/oblique motion without voice crossing", () => {
    for (const seed of [71, 72, 73, 74, 75, 76, 77, 78, 79, 80]) {
      const t = buildMotionIdTask(seed);
      const [lower, upper] = t.audio!.segments!;
      const [l1, l2] = lower.notes as [number, number];
      const [u1, u2] = upper.notes as [number, number];
      const answer = t.choices!.find((c) => t.judge(c))!;
      const dl = Math.sign(l2 - l1);
      const du = Math.sign(u2 - u1);
      if (answer === "Similar motion") {
        expect(dl).not.toBe(0);
        expect(du).toBe(dl);
      } else if (answer === "Contrary motion") {
        expect(dl).not.toBe(0);
        expect(du).toBe(-dl);
      } else {
        expect([dl, du].filter((d) => d === 0)).toHaveLength(1);
      }
      // Stepwise motion, voices never cross.
      expect(Math.abs(l2 - l1)).toBeLessThanOrEqual(2);
      expect(Math.abs(u2 - u1)).toBeLessThanOrEqual(2);
      expect(Math.min(u1, u2)).toBeGreaterThan(Math.max(l1, l2));
    }
  });

  it("buildTask dispatches motion-id", () => {
    expect(buildTask("ch7-l1-species", { kind: "motion-id", seed: 71 }).taskId).toBe("motion-id:71");
  });
});

describe("buildModulationIdTask", () => {
  it("is deterministic per seed with exactly one correct answer", () => {
    const a = buildModulationIdTask(83, "detect");
    const b = buildModulationIdTask(83, "detect");
    expect(a.taskId).toBe(b.taskId);
    expect(a.audio!.notes).toEqual(b.audio!.notes);
    const answers = a.choices!.filter((c) => a.judge(c));
    expect(answers).toHaveLength(1);
  });

  it("voices two true I–V–I phrases", () => {
    for (const seed of [83, 84, 85, 86]) {
      for (const variant of ["detect", "where"] as const) {
        const t = buildModulationIdTask(seed, variant);
        const notes = t.audio!.notes;
        expect(notes).toHaveLength(18);
        for (const offset of [0, 9]) {
          const p = notes.slice(offset, offset + 9);
          const tonic = p[0]!;
          // I arpeggio, V arpeggio, I arpeggio.
          expect(p.slice(0, 3)).toEqual([tonic, tonic + 4, tonic + 7]);
          expect(p.slice(3, 6)).toEqual([tonic + 7, tonic + 11, tonic + 14]);
          expect(p.slice(6, 9)).toEqual([tonic, tonic + 4, tonic + 7]);
        }
      }
    }
  });

  it("detect variant moves a fifth exactly when the answer is 'New key'", () => {
    for (const seed of [83, 84, 85, 86, 87, 88]) {
      const t = buildModulationIdTask(seed, "detect");
      const notes = t.audio!.notes;
      const answer = t.choices!.find((c) => t.judge(c))!;
      const shift = notes[9]! - notes[0]!;
      if (answer === "Same key") expect(shift).toBe(0);
      else expect(Math.abs(shift)).toBe(7);
    }
  });

  it("where variant moves up exactly when the answer says brighter", () => {
    for (const seed of [83, 84, 85, 86, 87, 88]) {
      const t = buildModulationIdTask(seed, "where");
      const notes = t.audio!.notes;
      const answer = t.choices!.find((c) => t.judge(c))!;
      const shift = notes[9]! - notes[0]!;
      expect(Math.abs(shift)).toBe(7);
      expect(answer === "Up a fifth — brighter").toBe(shift === 7);
    }
  });

  it("rejects unknown variants with a clear error", () => {
    expect(() => buildModulationIdTask(1, "spicy")).toThrow(/Unknown modulation-id variant/);
  });

  it("buildTask dispatches modulation-id with the spec variant", () => {
    const d = buildTask("ch8-l3-tonicization", { kind: "modulation-id", seed: 83, variant: "detect" });
    expect(d.taskId).toBe("modulation-id:detect:83");
    const w = buildTask("ch8-l4-secondary", { kind: "modulation-id", seed: 84, variant: "where" });
    expect(w.taskId).toBe("modulation-id:where:84");
  });
});

describe("buildSeventhIdTask", () => {
  it("is deterministic per seed with exactly one correct seventh", () => {
    const a = buildSeventhIdTask(91);
    const b = buildSeventhIdTask(91);
    expect(a.taskId).toBe(b.taskId);
    expect(a.audio!.notes).toEqual(b.audio!.notes);
    const answers = a.choices!.filter((c) => a.judge(c));
    expect(answers).toHaveLength(1);
    expect(["Major seventh", "Dominant seventh"]).toContain(answers[0]);
  });

  it("voices a true major triad plus the matching seventh", () => {
    for (const seed of [91, 92, 93, 94, 95]) {
      const t = buildSeventhIdTask(seed);
      const notes = t.audio!.notes;
      expect(notes).toHaveLength(4);
      const answer = t.choices!.find((c) => t.judge(c))!;
      const root = notes[0]!;
      expect(notes.slice(0, 3)).toEqual([root, root + 4, root + 7]);
      const expectedSeventh = root + (answer === "Major seventh" ? 11 : 10);
      expect(notes[3]).toBe(expectedSeventh);
    }
  });

  it("buildTask dispatches seventh-id", () => {
    expect(buildTask("ch9-l1-sevenths", { kind: "seventh-id", seed: 91 }).taskId).toBe("seventh-id:91");
  });
});

describe("buildMeterIdTask", () => {
  it("is deterministic per seed with exactly one correct meter", () => {
    const a = buildMeterIdTask(94);
    const b = buildMeterIdTask(94);
    expect(a.taskId).toBe(b.taskId);
    expect(a.audio!.notes).toEqual(b.audio!.notes);
    const answers = a.choices!.filter((c) => a.judge(c));
    expect(answers).toHaveLength(1);
    expect(["3 beats", "4 beats", "5 beats"]).toContain(answers[0]);
  });

  it("accents the downbeat exactly every N pulses, two bars", () => {
    for (const seed of [94, 95, 96, 97, 98, 99]) {
      const t = buildMeterIdTask(seed);
      const notes = t.audio!.notes;
      const answer = t.choices!.find((c) => t.judge(c))!;
      const meter = parseInt(answer, 10);
      expect(notes).toHaveLength(meter * 2);
      notes.forEach((n, i) => {
        expect(n).toBe(i % meter === 0 ? 60 : 67);
      });
    }
  });

  it("buildTask dispatches meter-id", () => {
    expect(buildTask("ch9-l4-polyrhythm", { kind: "meter-id", seed: 94 }).taskId).toBe("meter-id:94");
  });
});

describe("buildSpeciesIdTask", () => {
  const cfVoice = (t: PracticalTask) => t.audio!.voices![0]!;
  const cpVoice = (t: PracticalTask) => t.audio!.voices![1]!;

  it("is deterministic per seed+variant with exactly one correct species", () => {
    const a = buildSpeciesIdTask(101, "early");
    const b = buildSpeciesIdTask(101, "early");
    expect(a.taskId).toBe(b.taskId);
    expect(a.audio!.voices).toEqual(b.audio!.voices);
    const answers = a.choices!.filter((c) => a.judge(c));
    expect(answers).toHaveLength(1);
  });

  it("always voices a 4-note cantus firmus of whole notes", () => {
    for (const seed of [101, 102, 103]) {
      for (const variant of ["early", "late"] as const) {
        const cf = cfVoice(buildSpeciesIdTask(seed, variant));
        expect(cf.notes).toHaveLength(4);
        expect(cf.durations).toEqual([0.9, 0.9, 0.9, 0.9]);
      }
    }
  });

  it("early variant covers first/second/third with the right note counts", () => {
    const seen = new Set<string>();
    for (const seed of [101, 102, 103, 104, 105, 106, 107, 108]) {
      const t = buildSpeciesIdTask(seed, "early");
      const answer = t.choices!.find((c) => t.judge(c))!;
      seen.add(answer);
      const cp = cpVoice(t);
      const cf = cfVoice(t);
      if (answer === "First species") {
        expect(cp.notes).toHaveLength(4);
        // Consonant skeleton: thirds/sixths above each cantus note.
        cp.notes.forEach((n, i) => expect([3, 4]).toContain(n - cf.notes[i]! - 12));
      } else if (answer === "Second species") {
        expect(cp.notes).toHaveLength(8);
        for (let i = 0; i < 4; i++) expect([3, 4]).toContain(cp.notes[2 * i]! - cf.notes[i]! - 12);
      } else {
        expect(answer).toBe("Third species");
        expect(cp.notes).toHaveLength(16);
      }
    }
    expect(seen).toEqual(new Set(["First species", "Second species", "Third species"]));
  });

  it("late variant covers second/fourth/fifth with the right rhythmic profiles", () => {
    const seen = new Set<string>();
    for (const seed of [101, 102, 103, 104, 105, 106, 107, 108, 109, 110]) {
      const t = buildSpeciesIdTask(seed, "late");
      const answer = t.choices!.find((c) => t.judge(c))!;
      seen.add(answer);
      const cp = cpVoice(t);
      const cf = cfVoice(t);
      if (answer === "Second species") {
        expect(cp.notes).toHaveLength(8);
        expect(new Set(cp.durations)).toEqual(new Set([0.45]));
      } else if (answer === "Fourth species") {
        // Leading rest offsets the voice: syncopation.
        expect(cp.notes[0]).toBe(-1);
        expect(cp.notes).toHaveLength(5);
      } else {
        expect(answer).toBe("Fifth species (florid)");
        expect(cp.notes).toHaveLength(8);
        expect(new Set(cp.durations).size).toBeGreaterThan(1);
        // Resolves home: consonant with the final cantus note.
        const last = cp.notes[cp.notes.length - 1]!;
        expect([3, 4]).toContain(last - cf.notes[3]! - 12);
      }
    }
    expect(seen).toEqual(new Set(["Second species", "Fourth species", "Fifth species (florid)"]));
  });

  it("rejects unknown variants with a clear error", () => {
    expect(() => buildSpeciesIdTask(1, "baroque")).toThrow(/Unknown species-id variant/);
  });

  it("buildTask dispatches species-id with the spec variant", () => {
    expect(buildTask("ch10-l3-species23", { kind: "species-id", seed: 101, variant: "early" }).taskId).toBe(
      "species-id:early:101",
    );
  });
});

describe("buildSelfAttemptTask", () => {
  it("always accepts and never shames", () => {
    const t = buildSelfAttemptTask("ch1-l3-timbre");
    expect(t.judge("done")).toBe(true);
    expect(t.taskId).toBe("self-attempt:ch1-l3-timbre");
    expect(t.nudge).toBe("");
  });
  it("task ids are stable across builds (first-attempt evidence survives remounts)", () => {
    expect(buildComparePitchTask(7).taskId).toBe(buildComparePitchTask(7).taskId);
    expect(buildSelfAttemptTask("x").taskId).toBe(buildSelfAttemptTask("x").taskId);
  });
  it("uses an authored custom prompt when one is given", () => {
    const custom = "Write the order of sharps from memory.";
    const t = buildTask("ch4-l2-signatures", { kind: "self-attempt", seed: 0, prompt: custom });
    expect(t.prompt).toBe(custom);
    expect(t.taskId).toBe("self-attempt:ch4-l2-signatures");
  });
  it("falls back to the generic prompt otherwise", () => {
    const t = buildTask("ch2-l2-staff", { kind: "self-attempt", seed: 0 });
    expect(t.prompt).toContain("honest attempt");
  });
});
