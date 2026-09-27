/**
 * Richer feedback: measurable deviation in, coaching out.
 */
import { describe, expect, it } from "vitest";
import { intervalMissCopy, pitchDeviationCopy, timingCopy } from "./feedback.ts";

describe("pitchDeviationCopy", () => {
  it("calls near-perfect pitch in tune", () => {
    expect(pitchDeviationCopy(0)).toMatch(/in tune/i);
    expect(pitchDeviationCopy(9)).toMatch(/in tune/i);
    expect(pitchDeviationCopy(-10)).toMatch(/in tune/i);
  });

  it("names direction and magnitude beyond the tolerance", () => {
    expect(pitchDeviationCopy(25)).toMatch(/25¢ sharp/);
    expect(pitchDeviationCopy(-45)).toMatch(/45¢ flat/);
  });

  it("always teaches how to fix it", () => {
    for (const cents of [25, -60, 120]) {
      expect(pitchDeviationCopy(cents).length).toBeGreaterThan("25¢ sharp".length);
    }
  });
});

describe("intervalMissCopy", () => {
  it("stays silent on a match", () => {
    expect(intervalMissCopy(60, 60)).toBe("");
  });

  it("names the gap and direction in plain words", () => {
    // C4 -> E4: a major third higher than what you played.
    expect(intervalMissCopy(64, 60)).toMatch(/major third higher/);
    // Target C4, played E4: a major third lower.
    expect(intervalMissCopy(60, 64)).toMatch(/major third lower/);
    // Half-step miss, the most common one.
    expect(intervalMissCopy(60, 61)).toMatch(/half step lower/);
  });

  it("teaches what to listen for", () => {
    expect(intervalMissCopy(67, 60)).toMatch(/Hear the target/i);
  });
});

describe("timingCopy", () => {
  it("praises pocket timing", () => {
    expect(timingCopy(0)).toMatch(/pocket/i);
    expect(timingCopy(-30)).toMatch(/pocket/i);
  });

  it("names direction and magnitude", () => {
    expect(timingCopy(120)).toMatch(/120 ms late/);
    expect(timingCopy(-85)).toMatch(/85 ms early/);
  });

  it("offers a concrete fix", () => {
    expect(timingCopy(120)).toMatch(/tapping just before/i);
    expect(timingCopy(-85)).toMatch(/Let the beat come to you/i);
  });
});
