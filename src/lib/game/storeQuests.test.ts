/**
 * Store-level quest integration: normal play records quest completions
 * automatically, and claiming pays harmony points exactly once per quest
 * per day — without disturbing the lesson/game point accounting.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "./store.ts";
import { QUESTS, todayKey } from "./quests.ts";

function act() {
  return useStore.getState();
}

function todayLog() {
  return useStore.getState().save.questLog[todayKey()];
}

beforeEach(() => {
  localStorage.clear();
  act().resetSave();
});

describe("quest integration", () => {
  it("answering a check completes the learn quest", () => {
    act().answerCheck("lesson-1", "check-a", true, false);
    expect(todayLog()?.learn).toBe("done");
    // No points yet: rewards are claimed explicitly.
    expect(useStore.getState().save.harmonyPoints).toBe(0);
  });

  it("finishing a Strike run completes the play quest", () => {
    act().recordGameResult("strike", { score: 100 });
    expect(todayLog()?.play).toBe("done");
  });

  it("finishing a Duel completes the play quest", () => {
    act().recordDuelResult("win");
    expect(todayLog()?.play).toBe("done");
  });

  it("saving a creation completes the create quest", () => {
    act().saveCreation({
      id: "c1",
      chapter: 1,
      name: "My tune",
      data: { notes: [60, 62, 64] },
    });
    expect(todayLog()?.create).toBe("done");
  });

  it("claiming a quest pays its points exactly once", () => {
    act().answerCheck("lesson-1", "check-a", true, false);
    const reward = QUESTS.find((q) => q.id === "learn")!.points;
    expect(act().claimQuest("learn")).toBe(true);
    expect(useStore.getState().save.harmonyPoints).toBe(reward);
    // Second claim is a no-op: no farming.
    expect(act().claimQuest("learn")).toBe(false);
    expect(useStore.getState().save.harmonyPoints).toBe(reward);
  });

  it("claiming an uncompleted quest pays nothing", () => {
    expect(act().claimQuest("play")).toBe(false);
    expect(useStore.getState().save.harmonyPoints).toBe(0);
  });

  it("quest activity stamps a learning day", () => {
    expect(useStore.getState().save.learningDays).toEqual([]);
    act().recordGameResult("strike", { score: 50 });
    expect(useStore.getState().save.learningDays).toContain(todayKey());
  });
});
