import { describe, expect, it } from "vitest";
import { CONCEPT_NAMES, conceptName } from "./learning.ts";
import { authoredLessons } from "./course.ts";

describe("conceptName", () => {
  it("names every concept id used by authored content", () => {
    const used = new Set<string>();
    for (const lesson of authoredLessons()) {
      for (const check of lesson.checks) used.add(check.conceptId);
    }
    expect(used.size).toBeGreaterThan(0);
    for (const id of used) {
      expect(CONCEPT_NAMES[id], `missing human name for concept "${id}"`).toBeTruthy();
      expect(conceptName(id)).not.toBe(id);
    }
  });

  it("falls back to the raw id for unknown concepts", () => {
    expect(conceptName("not-a-real-concept")).toBe("not-a-real-concept");
  });

  it("returns readable names, not identifiers", () => {
    expect(conceptName("pitch-direction")).toBe("High vs. low pitch");
    expect(conceptName("accidentals")).toContain("ccidental");
    expect(conceptName("note-durations")).not.toContain("-");
  });
});
