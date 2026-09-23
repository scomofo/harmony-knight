/**
 * Schema hardening tests: the v1 -> v2 migration (gameStats), per-field
 * sanitization, and strict import validation for every persisted object.
 */
import { describe, expect, it } from "vitest";
import {
  SAVE_VERSION,
  defaultSave,
  exportSave,
  importSave,
  migrateSave,
  sanitizeGameStats,
  validateSave,
} from "./schema.ts";

/** A save as written before the games milestone (schema v1, no gameStats). */
function v1Save(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const base = defaultSave() as unknown as Record<string, unknown>;
  delete base.gameStats;
  return { ...base, version: 1, ...overrides };
}

describe("v1 -> v2 migration", () => {
  it("adds default gameStats to a pre-games v1 save", () => {
    const migrated = migrateSave(v1Save());
    expect(migrated?.version).toBe(2);
    expect(migrated?.gameStats).toEqual({
      strikePlays: 0,
      strikeBest: 0,
      duelWins: 0,
      duelLosses: 0,
      duelDraws: 0,
    });
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
