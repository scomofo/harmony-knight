/**
 * Schema hardening tests: the v1 -> v4 migration chain (gameStats, quest
 * log, grown-ups PIN, player profile), per-field sanitization, and strict
 * import validation for every persisted object.
 */
import { describe, expect, it } from "vitest";
import {
  SAVE_VERSION,
  defaultProfile,
  defaultSave,
  exportSave,
  importSave,
  migrateSave,
  sanitizeGameStats,
  sanitizePlacement,
  sanitizeProfile,
  validateSave,
} from "./schema.ts";

/** A save as written before the games milestone (schema v1, no gameStats). */
function v1Save(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const base = defaultSave() as unknown as Record<string, unknown>;
  delete base.gameStats;
  return { ...base, version: 1, ...overrides };
}

describe("v1 -> v4 migration chain", () => {
  it("adds default gameStats to a pre-games v1 save", () => {
    const migrated = migrateSave(v1Save());
    expect(migrated?.version).toBe(SAVE_VERSION); // chains v1 -> v2 -> v3
    expect(migrated?.gameStats).toEqual({
      strikePlays: 0,
      strikeBest: 0,
      duelWins: 0,
      duelLosses: 0,
      duelDraws: 0,
    });
    expect(migrated?.questLog).toEqual({});
    // The grown-ups PIN moved to device level (profiles container); the
    // per-save migration chain no longer manages it.
    expect(migrated && validateSave(migrated)).toBe(true);
  });

  it("preserves valid gameStats written by the games-era v1 build", () => {
    const stats = { strikePlays: 4, strikeBest: 1234, duelWins: 2, duelLosses: 1, duelDraws: 0 };
    const migrated = migrateSave(v1Save({ gameStats: stats }));
    expect(migrated?.gameStats).toEqual(stats);
  });

  it("migrating keeps lesson progress and settings intact", () => {
    const base = v1Save();
    base.harmonyPoints = 42;
    base.grade = 3;
    base.settings = { ...(base.settings as Record<string, unknown>), muted: true };
    const migrated = migrateSave(base);
    expect(migrated?.harmonyPoints).toBe(42);
    expect(migrated?.grade).toBe(3);
    expect(migrated?.settings.muted).toBe(true);
  });

  it("rejects saves from a newer schema (no downgrade)", () => {
    expect(migrateSave({ ...defaultSave(), version: SAVE_VERSION + 1 })).toBeNull();
  });

  it("rejects versionless or non-object payloads", () => {
    expect(migrateSave(null)).toBeNull();
    expect(migrateSave("nope")).toBeNull();
    expect(migrateSave({})).toBeNull();
  });
});

describe("sanitizeGameStats", () => {
  it("repairs malformed fields individually, preserving the good ones", () => {
    expect(
      sanitizeGameStats({
        strikePlays: -5,
        strikeBest: NaN,
        duelWins: "3",
        duelLosses: 2.7,
        duelDraws: 1,
      }),
    ).toEqual({ strikePlays: 0, strikeBest: 0, duelWins: 0, duelLosses: 2, duelDraws: 1 });
  });

  it("returns defaults for non-records", () => {
    expect(sanitizeGameStats(null)).toEqual(sanitizeGameStats(undefined));
    expect(sanitizeGameStats([1, 2])).toEqual({
      strikePlays: 0,
      strikeBest: 0,
      duelWins: 0,
      duelLosses: 0,
      duelDraws: 0,
    });
  });
});

describe("validateSave (strict)", () => {
  it("accepts a fresh default save", () => {
    expect(validateSave(defaultSave())).toBe(true);
  });

  it("rejects a stale version stamp", () => {
    expect(validateSave({ ...defaultSave(), version: 1 })).toBe(false);
  });

  it("rejects non-integer or out-of-range grades", () => {
    expect(validateSave({ ...defaultSave(), grade: 2.5 })).toBe(false);
    expect(validateSave({ ...defaultSave(), grade: 11 })).toBe(false);
  });

  it("rejects non-finite or negative harmony points", () => {
    expect(validateSave({ ...defaultSave(), harmonyPoints: NaN })).toBe(false);
    expect(validateSave({ ...defaultSave(), harmonyPoints: -1 })).toBe(false);
  });

  it("rejects malformed gameStats", () => {
    const bad = (gameStats: unknown) => validateSave({ ...defaultSave(), gameStats });
    expect(bad({ ...defaultSave().gameStats, strikeBest: -1 })).toBe(false);
    expect(bad({ ...defaultSave().gameStats, duelWins: 1.5 })).toBe(false);
    expect(bad({ ...defaultSave().gameStats, duelDraws: "0" })).toBe(false);
    expect(bad(null)).toBe(false);
  });

  it("rejects malformed creations", () => {
    const good = {
      id: "c1",
      chapter: 3,
      name: "My tune",
      data: { steps: [] },
      updatedAt: 123,
    };
    expect(validateSave({ ...defaultSave(), creations: [good] })).toBe(true);
    const bad = (creations: unknown[]) => validateSave({ ...defaultSave(), creations });
    expect(bad([{ ...good, chapter: 99 }])).toBe(false);
    expect(bad([{ ...good, chapter: 0 }])).toBe(false);
    expect(bad([{ ...good, id: "" }])).toBe(false);
    expect(bad([{ ...good, updatedAt: -2 }])).toBe(false);
    expect(bad(["not-a-creation"])).toBe(false);
  });

  it("rejects malformed quest logs", () => {
    const good = { "2026-09-23": { learn: "done", play: "claimed" } };
    expect(validateSave({ ...defaultSave(), questLog: good })).toBe(true);
    const bad = (questLog: unknown) => validateSave({ ...defaultSave(), questLog });
    expect(bad({ "2026-09-23": { learn: "finished" } })).toBe(false);
    expect(bad({ "2026-09-23": { learn: 1 } })).toBe(false);
    expect(bad({ "2026-09-23": "done" })).toBe(false);
    expect(bad(null)).toBe(false);
  });

  it("ignores a stale grown-ups PIN copy lingering in settings", () => {
    // The PIN is device-level now; an old backup's per-save copy is simply
    // ignored, never a validation failure.
    const withStale = {
      ...defaultSave(),
      settings: { ...defaultSave().settings, grownUpsPin: "1234" },
    };
    expect(validateSave(withStale)).toBe(true);
  });

  it("rejects malformed grade windows", () => {
    const bad = (gradeWindows: unknown) => validateSave({ ...defaultSave(), gradeWindows });
    expect(bad({ "2": { attempts: 10, correct: 9 } })).toBe(true);
    expect(bad({ "2": { attempts: -1, correct: 9 } })).toBe(false);
    expect(bad({ "2": { attempts: 10 } })).toBe(false);
    expect(bad({ "2": "nope" })).toBe(false);
  });

  it("rejects non-record lesson/concept/evidence values", () => {
    expect(validateSave({ ...defaultSave(), lessons: { x: 5 } })).toBe(false);
    expect(validateSave({ ...defaultSave(), concepts: { x: [1] } })).toBe(false);
    expect(validateSave({ ...defaultSave(), noteEvidence: { x: null } })).toBe(false);
  });

  it("rejects non-string learning days", () => {
    expect(validateSave({ ...defaultSave(), learningDays: ["2026-09-23"] })).toBe(true);
    expect(validateSave({ ...defaultSave(), learningDays: [20260923] })).toBe(false);
  });

  it("export stamps the current version and import round-trips", () => {
    const json = exportSave(defaultSave());
    expect(JSON.parse(json).version).toBe(SAVE_VERSION);
    const back = importSave(json);
    expect(back).not.toBeNull();
    expect(back && validateSave(back)).toBe(true);
  });

  it("imported v1 JSON upgrades through the migration", () => {
    const json = JSON.stringify(v1Save());
    const back = importSave(json);
    expect(back?.version).toBe(SAVE_VERSION);
    expect(back?.gameStats.strikePlays).toBe(0);
  });
});

describe("v3 -> v4 profile migration", () => {
  /** A save as written by the v3 build (pre-profile): no profile key. */
  function v3Save(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    const base = defaultSave() as unknown as Record<string, unknown>;
    delete base.profile;
    return { ...base, version: 3, ...overrides };
  }

  it("adds the unclaimed default profile to a pre-profile v3 save", () => {
    const migrated = migrateSave(v3Save());
    expect(migrated?.version).toBe(SAVE_VERSION);
    expect(migrated?.profile).toEqual(defaultProfile());
    expect(migrated?.profile.completedAt).toBeNull();
    expect(migrated && validateSave(migrated)).toBe(true);
  });

  it("preserves a valid profile through migration", () => {
    const profile = {
      ...defaultProfile(),
      name: "Avery",
      ageBand: "10-12",
      experience: "played-before",
      completedAt: 123456,
    };
    const migrated = migrateSave(v3Save({ profile }));
    expect(migrated?.profile.name).toBe("Avery");
    expect(migrated?.profile.experience).toBe("played-before");
    expect(migrated?.profile.completedAt).toBe(123456);
  });

  it("sanitizes a malformed profile per-field instead of wiping it", () => {
    const profile = {
      name: "Avery",
      ageBand: "ancient",
      experience: "played-before",
      goal: "world-domination",
      instrument: "lute",
      placement: { garbage: true },
      completedAt: "yesterday",
    };
    const migrated = migrateSave(v3Save({ profile }));
    expect(migrated?.profile.name).toBe("Avery");
    expect(migrated?.profile.ageBand).toBe(defaultProfile().ageBand);
    expect(migrated?.profile.experience).toBe("played-before");
    expect(migrated?.profile.goal).toBe(defaultProfile().goal);
    expect(migrated?.profile.placement).toBeNull();
    expect(migrated?.profile.completedAt).toBeNull();
    expect(migrated && validateSave(migrated)).toBe(true);
  });

  it("keeps a well-formed placement through migration", () => {
    const placement = {
      completedAt: 999,
      answers: [{ questionId: "pitch-1", correct: true }],
      recommendedStartChapter: 2,
    };
    const migrated = migrateSave(v3Save({ profile: { ...defaultProfile(), placement } }));
    expect(migrated?.profile.placement).toEqual(placement);
  });

  it("defaults the session length to 20 minutes for new saves", () => {
    expect(defaultSave().settings.sessionMinutes).toBe(20);
  });
});

describe("sanitizeProfile / sanitizePlacement", () => {
  it("returns the default profile for non-records", () => {
    expect(sanitizeProfile(null)).toEqual(defaultProfile());
    expect(sanitizeProfile("nope")).toEqual(defaultProfile());
  });

  it("truncates overlong names", () => {
    expect(sanitizeProfile({ name: "x".repeat(100) }).name).toHaveLength(40);
  });

  it("rejects out-of-range placement chapters", () => {
    const base = { completedAt: 1, answers: [], recommendedStartChapter: 12 };
    expect(sanitizePlacement(base)).toBeNull();
    expect(sanitizePlacement({ ...base, recommendedStartChapter: 0 })).toBeNull();
    expect(sanitizePlacement({ ...base, recommendedStartChapter: 3 })).toEqual({
      completedAt: 1,
      answers: [],
      recommendedStartChapter: 3,
    });
  });

  it("rejects malformed placement answers", () => {
    expect(
      sanitizePlacement({ completedAt: 1, answers: [{ questionId: 5, correct: true }], recommendedStartChapter: 1 }),
    ).toBeNull();
  });

  it("validateSave rejects a save with a bad profile", () => {
    expect(validateSave({ ...defaultSave(), profile: { ...defaultProfile(), ageBand: "old" } })).toBe(false);
    expect(validateSave({ ...defaultSave(), profile: null })).toBe(false);
    expect(
      validateSave({ ...defaultSave(), profile: { ...defaultProfile(), name: "x".repeat(41) } }),
    ).toBe(false);
  });
});
