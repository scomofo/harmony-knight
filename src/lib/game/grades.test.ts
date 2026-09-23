import { describe, expect, it } from "vitest";
import {
  CONCEPT_TOPICS,
  TOPIC_TASK_SPECS,
  advanceGrade,
  conceptTopic,
  trialPassed,
  trialPlan,
  trialRequirement,
} from "./grades.ts";
import { CURRICULUM, GRADE_THRESHOLDS, MAX_GRADE } from "./curriculum.ts";
import { authoredLessons } from "./course.ts";

describe("trialRequirement", () => {
  it("matches the roadmap's grade windows", () => {
    expect(trialRequirement(0)).toEqual({ questions: 10, accuracy: 0.8 });
    expect(trialRequirement(5)).toEqual({ questions: 30, accuracy: 0.9 });
    expect(trialRequirement(9)).toEqual({ questions: 40, accuracy: 0.92 });
    expect(Object.keys(GRADE_THRESHOLDS)).toHaveLength(10); // grades 0-9; 10 is terminal
  });

  it("throws for the terminal grade and unknowns", () => {
    expect(() => trialRequirement(10)).toThrow();
    expect(() => trialRequirement(99)).toThrow();
  });
});

describe("trialPlan", () => {
  it("builds exactly the required number of questions per grade", () => {
    for (let g = 0; g <= 9; g++) {
      const plan = trialPlan(g, 1234);
      expect(plan).toHaveLength(trialRequirement(g).questions);
    }
  });

  it("is deterministic per seed and varies across seeds", () => {
    const a = trialPlan(3, 42);
    const b = trialPlan(3, 42);
    const c = trialPlan(3, 43);
    expect(a).toEqual(b);
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(c));
  });

  it("measures every topic of the grade (round-robin coverage)", () => {
    for (const level of CURRICULUM) {
      if (level.level === 10) continue;
      const plan = trialPlan(level.level, 7);
      for (const topic of level.topics) {
        if (topic === "duel" || topic === "strike") continue;
        const specs = TOPIC_TASK_SPECS[topic];
        const kinds = new Set(specs.map((s) => `${s.kind}:${s.variant ?? ""}`));
        const covered = plan.some(
          (q) =>
            q.kind === "task" && kinds.has(`${q.spec.kind}:${q.spec.variant ?? ""}`),
        );
        expect(covered).toBe(true);
      }
    }
  });

  it("routes duel/strike topics to game rounds", () => {
    const plan = trialPlan(8, 99); // topics: rhythm, strike, harmony
    expect(plan.some((q) => q.kind === "strike")).toBe(true);
    const duelPlan = trialPlan(6, 99); // topics: duel, harmony
    expect(duelPlan.some((q) => q.kind === "duel")).toBe(true);
  });
});

describe("trialPassed", () => {
  it("enforces the accuracy gate on first attempts", () => {
    const req = trialRequirement(0); // 10 at 80%
    const pass = Array(req.questions).fill(true);
    pass[0] = false;
    pass[1] = false; // 8/10 = 80%
    expect(trialPassed(pass, 0)).toBe(true);
    pass[2] = false; // 7/10 = 70%
    expect(trialPassed(pass, 0)).toBe(false);
  });

  it("rejects short result lists", () => {
    expect(trialPassed([true, true, true], 0)).toBe(false);
  });
});

describe("advanceGrade", () => {
  it("moves up one grade on pass, stays on fail, caps at terminal", () => {
    expect(advanceGrade(3, true)).toBe(4);
    expect(advanceGrade(3, false)).toBe(3);
    expect(advanceGrade(MAX_GRADE, true)).toBe(MAX_GRADE);
    expect(advanceGrade(9, true)).toBe(10);
  });
});

describe("conceptTopic", () => {
  it("maps every authored check concept to a topic", () => {
    const concepts = new Set<string>();
    for (const lesson of authoredLessons()) {
      for (const check of lesson.checks) concepts.add(check.conceptId);
    }
    expect(concepts.size).toBeGreaterThan(0);
    for (const c of concepts) {
      expect(() => conceptTopic(c)).not.toThrow();
    }
    // And the map covers exactly the authored concepts (no dead entries).
    expect(new Set(Object.keys(CONCEPT_TOPICS))).toEqual(concepts);
  });
});
