/**
 * Daily quests and streaks: idempotent completion, explicit claim payouts,
 * and streak counting from learning days.
 */
import { describe, expect, it } from "vitest";
import {
  QUESTS,
  claimQuest,
  claimablePoints,
  completeQuest,
  currentStreak,
  daysBetween,
  freezeAvailable,
  guardedStreak,
  questStatus,
  todayKey,
} from "./quests.ts";

describe("quest engine", () => {
  it("formats device-local day keys", () => {
    expect(todayKey(new Date(2026, 8, 23))).toBe("2026-09-23");
    expect(todayKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("completing a quest is idempotent within a day", () => {
    const once = completeQuest({}, "learn", "2026-09-23");
    expect(questStatus(once, "2026-09-23").learn).toBe("done");
    const twice = completeQuest(once, "learn", "2026-09-23");
    expect(twice).toBe(once); // same reference: no-op
    // Other quests and other days are independent.
    expect(questStatus(once, "2026-09-23").play).toBeNull();
    expect(questStatus(once, "2026-09-24").learn).toBeNull();
  });

  it("claiming pays once and only for completed quests", () => {
    const log = completeQuest({}, "play", "2026-09-23");
    const first = claimQuest(log, "play", "2026-09-23");
    expect(first.claimed).toBe(true);
    expect(questStatus(first.log, "2026-09-23").play).toBe("claimed");
    const second = claimQuest(first.log, "play", "2026-09-23");
    expect(second.claimed).toBe(false); // never farms
    const uncompleted = claimQuest({}, "create", "2026-09-23");
    expect(uncompleted.claimed).toBe(false);
  });

  it("totals claimable points for the day", () => {
    let log = completeQuest({}, "learn", "2026-09-23");
    log = completeQuest(log, "create", "2026-09-23");
    const learnPoints = QUESTS.find((q) => q.id === "learn")!.points;
    const createPoints = QUESTS.find((q) => q.id === "create")!.points;
    expect(claimablePoints(log, "2026-09-23")).toBe(learnPoints + createPoints);
    const { log: claimed } = claimQuest(log, "learn", "2026-09-23");
    expect(claimablePoints(claimed, "2026-09-23")).toBe(createPoints);
  });

  it("quest progress resets each day", () => {
    const log = completeQuest({}, "learn", "2026-09-23");
    expect(questStatus(log, "2026-09-24").learn).toBeNull();
  });
});

describe("streaks", () => {
  it("counts consecutive days back from today", () => {
    const days = ["2026-09-21", "2026-09-22", "2026-09-23"];
    expect(currentStreak(days, "2026-09-23")).toBe(3);
  });

  it("stays alive when today is missing but yesterday is present", () => {
    const days = ["2026-09-21", "2026-09-22"];
    expect(currentStreak(days, "2026-09-23")).toBe(2);
  });

  it("breaks on a gap", () => {
    const days = ["2026-09-20", "2026-09-23"];
    expect(currentStreak(days, "2026-09-23")).toBe(1);
  });

  it("is zero with no recent activity", () => {
    expect(currentStreak(["2026-09-10"], "2026-09-23")).toBe(0);
    expect(currentStreak([], "2026-09-23")).toBe(0);
  });

  it("crosses month boundaries", () => {
    const days = ["2026-08-31", "2026-09-01"];
    expect(currentStreak(days, "2026-09-01")).toBe(2);
  });
});

describe("streak freeze", () => {
  it("is available until first use, then once per 7 days", () => {
    expect(freezeAvailable(null, "2026-09-23")).toBe(true);
    expect(freezeAvailable("2026-09-23", "2026-09-23")).toBe(false);
    expect(freezeAvailable("2026-09-23", "2026-09-29")).toBe(false);
    expect(freezeAvailable("2026-09-23", "2026-09-30")).toBe(true);
  });

  it("bridges a single missed day when the freeze is ready", () => {
    // Streak through the 21st, missed the 22nd, back on the 23rd.
    const days = ["2026-09-20", "2026-09-21"];
    expect(currentStreak(days, "2026-09-23")).toBe(0);
    const guarded = guardedStreak(days, "2026-09-23", null);
    expect(guarded.freezeBridged).toBe(true);
    expect(guarded.streak).toBe(3); // 2 prior days + today; the gap is forgiven
  });

  it("does not bridge when the freeze was used this week", () => {
    const days = ["2026-09-20", "2026-09-21"];
    const guarded = guardedStreak(days, "2026-09-23", "2026-09-20");
    expect(guarded).toEqual({ streak: 0, freezeBridged: false });
  });

  it("does not bridge a two-day gap", () => {
    const days = ["2026-09-20"];
    const guarded = guardedStreak(days, "2026-09-23", null);
    expect(guarded).toEqual({ streak: 0, freezeBridged: false });
  });

  it("leaves a healthy streak untouched", () => {
    const days = ["2026-09-22", "2026-09-23"];
    expect(guardedStreak(days, "2026-09-23", null)).toEqual({
      streak: 2,
      freezeBridged: false,
    });
  });

  it("daysBetween counts whole days across month boundaries", () => {
    expect(daysBetween("2026-09-23", "2026-09-30")).toBe(7);
    expect(daysBetween("2026-08-31", "2026-09-01")).toBe(1);
    expect(daysBetween("2026-09-23", "2026-09-23")).toBe(0);
  });
});
