/**
 * Household profiles: schema migration (legacy single save -> profiles
 * container), validation, and store-level CRUD + switching. The critical
 * acceptance path is a realistic pre-profiles save migrating with zero
 * data loss.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  MAX_PROFILE_NAME_LENGTH,
  PROFILES_KEY,
  PROFILES_VERSION,
  PROFILE_AVATARS,
  SAVE_KEY,
  defaultProfiles,
  defaultSave,
  migrateToProfiles,
  newProfile,
  sanitizeAvatar,
  sanitizeProfileName,
  validateProfiles,
  type ProfilesData,
  type SaveData,
} from "./schema.ts";
import { migrateLegacyStorage, useStore } from "./store.ts";

/** A realistic pre-profiles save: schema v3, every section populated. */
function realisticV3Save(): Record<string, unknown> {
  const save = defaultSave() as unknown as Record<string, unknown>;
  const settings = save.settings as Record<string, unknown>;
  return {
    ...save,
    version: 3,
    onboarded: true,
    harmonyPoints: 1234,
    grade: 3,
    settings: { ...settings, volume: 0.5, muted: true, grownUpsPin: "4321" },
    lessons: {
      "ch1-l1-pitch": {
        lessonId: "ch1-l1-pitch",
        step: "recall",
        answers: { q1: "C4" },
        checks: [{ checkId: "c1", correctFirstTry: true, assisted: false, answeredAt: 1000 }],
        tasks: [
          {
            taskId: "t1",
            draft: { notes: ["C4"] },
            feedback: "nice",
            firstCheckCorrect: true,
            assisted: false,
            updatedAt: 1001,
          },
        ],
        completedAt: null,
        completionPointsAwarded: false,
      },
    },
    concepts: {
      "major-triad": { conceptId: "major-triad", intervalDays: 3, dueAt: 2000, lastResult: "correct" },
    },
    noteEvidence: {
      E4: { note: "E4", attempts: 5, firstTryCorrect: 4, lastCorrect: true, dueAt: 3000 },
    },
    gradeWindows: { "2": { attempts: 10, correct: 9 } },
    learningDays: ["2026-09-24", "2026-09-25"],
    creations: [
      { id: "cr1", chapter: 2, name: "My tune", data: { steps: [1, 2] }, updatedAt: 4000 },
    ],
    gameStats: { strikePlays: 4, strikeBest: 1234, duelWins: 2, duelLosses: 1, duelDraws: 0 },
    questLog: { "2026-09-25": { learn: "done", play: "claimed" } },
  };
}

/** Start each test with one fresh "Default" profile and empty storage. */
function resetStore() {
  window.localStorage.clear();
  const ids = Object.keys(useStore.getState().profiles);
  for (const id of ids) useStore.getState().deleteProfile(id);
  const state = useStore.getState();
  expect(Object.keys(state.profiles)).toHaveLength(1);
}

beforeEach(resetStore);

describe("migrateToProfiles", () => {
  it("migrates a realistic v3 single save with zero data loss", () => {
    const original = realisticV3Save();
    const data = migrateToProfiles(original);
    expect(data).not.toBeNull();
    expect(data!.version).toBe(PROFILES_VERSION);

    const ids = Object.keys(data!.profiles);
    expect(ids).toHaveLength(1);
    const profile = data!.profiles[ids[0]];
    expect(profile.name).toBe("Default");
    expect(data!.activeProfileId).toBe(profile.id);

    // Everything survives except the PIN, which moves to device level.
    const expectedSettings = { ...(original.settings as Record<string, unknown>) };
    delete expectedSettings.grownUpsPin;
    expect(profile.save).toEqual({ ...original, settings: expectedSettings });
    expect(
      (profile.save.settings as unknown as Record<string, unknown>).grownUpsPin,
    ).toBeUndefined();
    expect(profile.save.harmonyPoints).toBe(1234);
    expect(profile.save.grade).toBe(3);
    expect(profile.save.lessons["ch1-l1-pitch"].step).toBe("recall");
    expect(profile.save.lessons["ch1-l1-pitch"].checks).toHaveLength(1);
    expect(profile.save.lessons["ch1-l1-pitch"].tasks).toHaveLength(1);
    expect(profile.save.concepts["major-triad"].intervalDays).toBe(3);
    expect(profile.save.noteEvidence["E4"].attempts).toBe(5);
    expect(profile.save.gradeWindows["2"]).toEqual({ attempts: 10, correct: 9 });
    expect(profile.save.learningDays).toEqual(["2026-09-24", "2026-09-25"]);
    expect(profile.save.creations).toHaveLength(1);
    expect(profile.save.creations[0].name).toBe("My tune");
    expect(profile.save.gameStats).toEqual({
      strikePlays: 4,
      strikeBest: 1234,
      duelWins: 2,
      duelLosses: 1,
      duelDraws: 0,
    });
    expect(profile.save.questLog).toEqual({ "2026-09-25": { learn: "done", play: "claimed" } });
    expect(profile.save.settings.volume).toBe(0.5);
    expect(profile.save.settings.muted).toBe(true);

    // The grown-ups PIN moves to device level, not into the profile.
    expect(data!.device.grownUpsPin).toBe("4321");
    expect(validateProfiles(data)).toBe(true);
  });

  it("migrates a pre-games v1 save through the full chain", () => {
    const original = realisticV3Save() as Record<string, unknown>;
    delete original.gameStats;
    delete original.questLog;
    (original as Record<string, unknown>).version = 1;
    const data = migrateToProfiles(original);
    expect(data).not.toBeNull();
    const profile = data!.profiles[data!.activeProfileId];
    expect(profile.save.gameStats).toEqual({
      strikePlays: 0,
      strikeBest: 0,
      duelWins: 0,
      duelLosses: 0,
      duelDraws: 0,
    });
    expect(profile.save.questLog).toEqual({});
    expect(profile.save.harmonyPoints).toBe(1234);
    expect(data!.device.grownUpsPin).toBe("4321");
  });

  it("leaves the device PIN null when the old save had none", () => {
    const original = realisticV3Save();
    const settings = original.settings as Record<string, unknown>;
    delete settings.grownUpsPin;
    const data = migrateToProfiles(original);
    expect(data!.device.grownUpsPin).toBeNull();
  });

  it("round-trips a valid container unchanged", () => {
    const data = defaultProfiles();
    const back = migrateToProfiles(JSON.parse(JSON.stringify(data)));
    expect(back).toEqual(data);
  });

  it("rejects corrupt containers without reinterpreting them as saves", () => {
    const good = defaultProfiles();
    const badActive = { ...good, activeProfileId: "missing" };
    expect(migrateToProfiles(badActive)).toBeNull();
    const badProfile = JSON.parse(JSON.stringify(good)) as ProfilesData;
    badProfile.profiles[good.activeProfileId].name = "";
    expect(migrateToProfiles(badProfile)).toBeNull();
    const empty: ProfilesData = { ...good, profiles: {} };
    expect(migrateToProfiles(empty)).toBeNull();
    const newer = { ...good, version: PROFILES_VERSION + 1 };
    expect(migrateToProfiles(newer)).toBeNull();
    // Container-shaped but with a non-record profiles field: must NOT fall
    // through to the single-save migration (version collision with save v1).
    expect(migrateToProfiles({ version: 1, profiles: "garbage" })).toBeNull();
    expect(migrateToProfiles(null)).toBeNull();
    expect(migrateToProfiles({})).toBeNull();
  });

  it("rejects a non-string device PIN", () => {
    const good = defaultProfiles();
    const bad = { ...good, device: { grownUpsPin: 1234 } };
    expect(validateProfiles(bad)).toBe(false);
    const ok = { ...good, device: { grownUpsPin: "0000" } };
    expect(validateProfiles(ok)).toBe(true);
  });
});

describe("profile name/avatar sanitizers", () => {
  it("trims, clamps, and falls back on blank names", () => {
    expect(sanitizeProfileName("  Maya  ")).toBe("Maya");
    expect(sanitizeProfileName("")).toBe("Knight");
    expect(sanitizeProfileName("   ")).toBe("Knight");
    expect(sanitizeProfileName(null)).toBe("Knight");
    expect(sanitizeProfileName("x".repeat(99))).toHaveLength(MAX_PROFILE_NAME_LENGTH);
  });

  it("only allows avatars from the curated set", () => {
    expect(sanitizeAvatar("🦊")).toBe("🦊");
    expect(sanitizeAvatar("💣")).toBe(PROFILE_AVATARS[0]);
    expect(sanitizeAvatar(null)).toBe(PROFILE_AVATARS[0]);
    expect(newProfile("A", "💣").avatar).toBe(PROFILE_AVATARS[0]);
  });
});

describe("store profile CRUD", () => {
  it("adds a profile and switches to it with a fresh save", () => {
    const before = useStore.getState().activeProfileId;
    const id = useStore.getState().addProfile("Maya", "🦊");
    const state = useStore.getState();
    expect(id).not.toBe(before);
    expect(state.activeProfileId).toBe(id);
    expect(state.profiles[id].name).toBe("Maya");
    expect(state.profiles[id].avatar).toBe("🦊");
    expect(state.save.harmonyPoints).toBe(0);
    expect(state.save.onboarded).toBe(false);
  });

  it("switching profiles swaps the active save everywhere", () => {
    const st = useStore.getState();
    const first = st.activeProfileId;
    st.addPoints(500);
    st.updateSettings({ volume: 0.2 });
    const second = st.addProfile("Leo", "🐉");

    // New profile starts fresh.
    expect(useStore.getState().save.harmonyPoints).toBe(0);
    expect(useStore.getState().save.settings.volume).toBe(0.8);

    // Switching back restores the first profile's save exactly.
    useStore.getState().switchProfile(first);
    expect(useStore.getState().save.harmonyPoints).toBe(500);
    expect(useStore.getState().save.settings.volume).toBe(0.2);

    // Progress made under the second profile is isolated.
    useStore.getState().switchProfile(second);
    useStore.getState().addPoints(50);
    useStore.getState().switchProfile(first);
    expect(useStore.getState().save.harmonyPoints).toBe(500);
  });

  it("ignores switching to unknown or already-active profiles", () => {
    const st = useStore.getState();
    const active = st.activeProfileId;
    st.switchProfile("nope");
    expect(useStore.getState().activeProfileId).toBe(active);
    st.switchProfile(active);
    expect(useStore.getState().activeProfileId).toBe(active);
  });

  it("renames and changes avatars; blank renames keep the old name", () => {
    const st = useStore.getState();
    const id = st.addProfile("Maya", "🦊");
    useStore.getState().updateProfile(id, { name: "Maya R.", avatar: "🐱" });
    expect(useStore.getState().profiles[id].name).toBe("Maya R.");
    expect(useStore.getState().profiles[id].avatar).toBe("🐱");
    useStore.getState().updateProfile(id, { name: "   " });
    expect(useStore.getState().profiles[id].name).toBe("Maya R.");
    useStore.getState().updateProfile("nope", { name: "Ghost" });
    expect(useStore.getState().profiles["nope"]).toBeUndefined();
  });

  it("deleting a non-active profile leaves the active one alone", () => {
    const st = useStore.getState();
    const first = st.activeProfileId;
    const second = st.addProfile("Leo", "🐉");
    useStore.getState().switchProfile(first);
    useStore.getState().deleteProfile(second);
    const after = useStore.getState();
    expect(Object.keys(after.profiles)).toEqual([first]);
    expect(after.activeProfileId).toBe(first);
  });

  it("deleting the active profile falls back to the oldest remaining", () => {
    const st = useStore.getState();
    const first = st.activeProfileId;
    st.addProfile("Leo", "🐉");
    const active = useStore.getState().activeProfileId;
    useStore.getState().deleteProfile(active);
    const after = useStore.getState();
    expect(after.activeProfileId).toBe(first);
    expect(after.profiles[first].name).toBe("Default");
  });

  it("deleting the last profile creates a fresh default", () => {
    const st = useStore.getState();
    const only = st.activeProfileId;
    st.addPoints(999);
    useStore.getState().deleteProfile(only);
    const after = useStore.getState();
    const ids = Object.keys(after.profiles);
    expect(ids).toHaveLength(1);
    expect(ids[0]).not.toBe(only);
    expect(after.activeProfileId).toBe(ids[0]);
    expect(after.profiles[ids[0]].name).toBe("Default");
    expect(after.save.harmonyPoints).toBe(0);
  });

  it("deleting an unknown profile is a no-op", () => {
    const before = Object.keys(useStore.getState().profiles);
    useStore.getState().deleteProfile("nope");
    expect(Object.keys(useStore.getState().profiles)).toEqual(before);
  });
});

describe("device-level PIN", () => {
  it("survives profile switches and is shared across profiles", () => {
    useStore.getState().setGrownUpsPin("1234");
    const second = useStore.getState().addProfile("Leo", "🐉");
    expect(useStore.getState().grownUpsPin).toBe("1234");
    useStore.getState().switchProfile(second);
    expect(useStore.getState().grownUpsPin).toBe("1234");
    useStore.getState().setGrownUpsPin(null);
    expect(useStore.getState().grownUpsPin).toBeNull();
  });
});

describe("profile persistence", () => {
  it("persists profile identity changes to localStorage synchronously", () => {
    const id = useStore.getState().addProfile("Maya", "🦊");
    const raw = window.localStorage.getItem(PROFILES_KEY);
    expect(raw).not.toBeNull();
    const data = JSON.parse(raw!) as ProfilesData;
    expect(data.activeProfileId).toBe(id);
    expect(data.profiles[id].name).toBe("Maya");
    expect(validateProfiles(data)).toBe(true);

    useStore.getState().switchProfile(id);
    const again = JSON.parse(window.localStorage.getItem(PROFILES_KEY)!) as ProfilesData;
    expect(again.activeProfileId).toBe(id);
  });

  it("migrateLegacyStorage adopts a legacy save, writes the new key, retires the old", () => {
    window.localStorage.clear();
    const original = realisticV3Save();
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(original));

    const data = migrateLegacyStorage();
    expect(data).not.toBeNull();
    expect(data!.profiles[data!.activeProfileId].save.harmonyPoints).toBe(1234);
    expect(data!.device.grownUpsPin).toBe("4321");

    // New key written, legacy key retired.
    expect(window.localStorage.getItem(SAVE_KEY)).toBeNull();
    const stored = JSON.parse(window.localStorage.getItem(PROFILES_KEY)!) as ProfilesData;
    expect(validateProfiles(stored)).toBe(true);
    expect(stored.profiles[stored.activeProfileId].save.lessons["ch1-l1-pitch"].step).toBe("recall");
  });

  it("migrateLegacyStorage returns null when no legacy save exists", () => {
    window.localStorage.clear();
    expect(migrateLegacyStorage()).toBeNull();
  });

  it("import/export of a profile save never resurrects a stale PIN", () => {
    const st = useStore.getState();
    st.setGrownUpsPin("7777");
    // A backup from the pre-profiles era still carries a per-save PIN.
    const legacy = realisticV3Save();
    const result = st.replaceSave(JSON.stringify(legacy));
    expect(result.ok).toBe(true);
    const after = useStore.getState();
    expect(after.save.harmonyPoints).toBe(1234);
    expect(
      (after.save.settings as unknown as Record<string, unknown>).grownUpsPin,
    ).toBeUndefined();
    // The device PIN is untouched by the import.
    expect(after.grownUpsPin).toBe("7777");
  });

  it("resetSave only resets the active profile", () => {
    const st = useStore.getState();
    const first = st.activeProfileId;
    st.addPoints(500);
    const second = st.addProfile("Leo", "🐉");
    useStore.getState().addPoints(50);
    useStore.getState().resetSave();
    expect(useStore.getState().save.harmonyPoints).toBe(0);
    useStore.getState().switchProfile(first);
    expect(useStore.getState().save.harmonyPoints).toBe(500);
    expect(second).not.toBe(first);
  });
});

describe("type surface", () => {
  it("SaveData no longer declares a per-profile grownUpsPin", () => {
    const save: SaveData = defaultSave();
    // @ts-expect-error — the PIN moved to device level; per-save copies are stale data.
    expect(save.settings.grownUpsPin).toBeUndefined();
  });
});
