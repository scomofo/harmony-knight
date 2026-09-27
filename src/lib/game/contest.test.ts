import { describe, expect, it } from "vitest";
import {
  CONTEST_BOTS,
  CONTEST_SUBMISSION_POINTS,
  CONTEST_VOTING_BONUS,
  botEntryForWeek,
  contestLeaderboard,
  contestMatchups,
  contestWeekId,
  createContestWeek,
  entryAppeal,
  isValidContestWeek,
  matchupWinner,
  pendingPlayerMatchups,
  playerEntryForCreation,
  sanitizeContests,
  submissionPointsDue,
  submitToContest,
  voteInContest,
  votingBonusAvailable,
} from "./contest.ts";
import { STARTER_PALETTE } from "./palettes.ts";
import { SAVE_VERSION, defaultSave, migrateSave, validateSave } from "./schema.ts";

const WEEK = "2026-W39";

function weekWithPlayer() {
  const week = createContestWeek(WEEK, STARTER_PALETTE);
  const player = playerEntryForCreation({ id: "c1", name: "My Tune", notes: [60, 62, 64, 65, 67] })!;
  return submitToContest(week, player)!;
}

describe("contestWeekId", () => {
  it("produces ISO week ids", () => {
    expect(contestWeekId(new Date(2026, 8, 26))).toBe("2026-W39"); // Sat Sep 26 2026
    expect(contestWeekId(new Date(2026, 8, 27))).toBe("2026-W39"); // Sunday same week
    expect(contestWeekId(new Date(2026, 8, 28))).toBe("2026-W40"); // Monday next week
  });

  it("handles year boundaries", () => {
    expect(contestWeekId(new Date(2026, 0, 1))).toBe("2026-W01");
  });
});

describe("createContestWeek", () => {
  it("seeds the three bot rivals", () => {
    const week = createContestWeek(WEEK, STARTER_PALETTE);
    expect(week.entries).toHaveLength(3);
    expect(week.entries.map((e) => e.author)).toEqual(CONTEST_BOTS.map((b) => b.name));
    expect(week.entries.every((e) => e.bot)).toBe(true);
    expect(week.votes).toEqual({});
  });

  it("is deterministic per week and varies across weeks", () => {
    const a = createContestWeek(WEEK, STARTER_PALETTE);
    const b = createContestWeek(WEEK, STARTER_PALETTE);
    const c = createContestWeek("2026-W40", STARTER_PALETTE);
    expect(a.entries).toEqual(b.entries);
    expect(JSON.stringify(a.entries)).not.toBe(JSON.stringify(c.entries));
  });

  it("generates playable melodies (16-24 steps, real midi)", () => {
    for (const bot of CONTEST_BOTS) {
      const e = botEntryForWeek(bot, WEEK, STARTER_PALETTE);
      expect(e.notes.length).toBeGreaterThanOrEqual(16);
      expect(e.notes.length).toBeLessThanOrEqual(24);
      expect(e.notes.every((n) => n >= 0 && n <= 127)).toBe(true);
    }
  });
});

describe("playerEntryForCreation", () => {
  it("builds a player entry from a creation", () => {
    const e = playerEntryForCreation({ id: "c1", name: "My Tune", notes: [60, 62] })!;
    expect(e.id).toBe("player:c1");
    expect(e.author).toBe("You");
    expect(e.bot).toBe(false);
  });

  it("rejects empty creations", () => {
    expect(playerEntryForCreation({ id: "c1", name: "Empty", notes: [] })).toBeNull();
  });
});

describe("submitToContest", () => {
  it("adds a player entry once", () => {
    const week = createContestWeek(WEEK, STARTER_PALETTE);
    const entry = playerEntryForCreation({ id: "c1", name: "Tune", notes: [60] })!;
    const next = submitToContest(week, entry)!;
    expect(next.entries).toHaveLength(4);
    expect(submitToContest(next, entry)).toBeNull(); // duplicate
  });

  it("pays submission points once per entry", () => {
    const week = weekWithPlayer();
    expect(submissionPointsDue(week, "player:c1")).toBe(CONTEST_SUBMISSION_POINTS);
    const paid = {
      ...week,
      rewardsPaid: { ...week.rewardsPaid, submissions: ["player:c1"] },
    };
    expect(submissionPointsDue(paid, "player:c1")).toBe(0);
    expect(submissionPointsDue(paid, "bot:sentinel")).toBe(0); // bots never pay
  });
});

describe("matchups + voting", () => {
  it("pairs every entry exactly once", () => {
    const week = weekWithPlayer(); // 4 entries -> 6 matchups
    const matchups = contestMatchups(week);
    expect(matchups).toHaveLength(6);
    const ids = new Set(matchups.map((m) => m.id));
    expect(ids.size).toBe(6);
  });

  it("bot-vs-bot matchups resolve deterministically without a vote", () => {
    const week = createContestWeek(WEEK, STARTER_PALETTE);
    const botMatchup = contestMatchups(week)[0]!;
    const w1 = matchupWinner(week, botMatchup);
    const w2 = matchupWinner(week, botMatchup);
    expect(w1).not.toBeNull();
    expect(w1).toBe(w2);
  });

  it("player matchups await the player's vote", () => {
    const week = weekWithPlayer();
    const pending = pendingPlayerMatchups(week);
    expect(pending.length).toBeGreaterThan(0);
    const m = pending[0]!;
    expect(matchupWinner(week, m)).toBeNull();
    const voted = voteInContest(week, m, m.a);
    expect(matchupWinner(voted, m)).toBe(m.a);
    expect(pendingPlayerMatchups(voted)).toHaveLength(pending.length - 1);
  });

  it("rejects invalid votes without changing the week", () => {
    const week = weekWithPlayer();
    const m = contestMatchups(week)[0]!;
    expect(voteInContest(week, m, "player:nope")).toBe(week); // unknown entry
    // bot:sentinel is not in the rook-vs-baron matchup.
    const rookVsBaron = contestMatchups(week).find(
      (x) => x.a === "bot:rook" && x.b === "bot:baron",
    )!;
    expect(voteInContest(week, rookVsBaron, "bot:sentinel")).toBe(week);
    // ...but it is a legal vote in its own matchup.
    expect(voteInContest(week, m, "bot:sentinel").votes[m.id]).toBe("bot:sentinel");
  });

  it("the voting bonus is claimable only when every player matchup is voted", () => {
    let week = weekWithPlayer();
    expect(votingBonusAvailable(week)).toBe(false);
    for (const m of pendingPlayerMatchups(week)) {
      week = voteInContest(week, m, m.a);
    }
    expect(votingBonusAvailable(week)).toBe(true);
    const claimed = { ...week, rewardsPaid: { ...week.rewardsPaid, votingBonus: true } };
    expect(votingBonusAvailable(claimed)).toBe(false);
    expect(CONTEST_VOTING_BONUS).toBe(5);
  });
});

describe("entryAppeal", () => {
  it("is deterministic and bounded", () => {
    const notes = [60, 62, 64, 65, 67, 69, 71, 72];
    expect(entryAppeal(notes)).toBe(entryAppeal(notes));
    expect(entryAppeal(notes)).toBeGreaterThanOrEqual(0);
    expect(entryAppeal(notes)).toBeLessThanOrEqual(1);
    expect(entryAppeal([])).toBe(0);
  });

  it("rewards variety over a single repeated note", () => {
    expect(entryAppeal([60, 62, 64, 65, 67])).toBeGreaterThan(entryAppeal([60, 60, 60, 60, 60]));
  });
});

describe("contestLeaderboard", () => {
  it("ranks by wins, then appeal", () => {
    let week = weekWithPlayer();
    for (const m of pendingPlayerMatchups(week)) {
      // Player wins every matchup.
      const playerSide = week.entries.find((e) => e.id === m.a && !e.bot) ? m.a : m.b;
      week = voteInContest(week, m, playerSide);
    }
    const board = contestLeaderboard(week);
    expect(board[0]!.entry.id).toBe("player:c1");
    expect(board[0]!.wins).toBe(3);
    // Total decided matchups = 6, each contributes exactly one win.
    expect(board.reduce((s, r) => s + r.wins, 0)).toBe(6);
  });
});

describe("contest save validation + migration", () => {
  it("accepts a well-formed week", () => {
    expect(isValidContestWeek(createContestWeek(WEEK, STARTER_PALETTE))).toBe(true);
  });

  it("rejects malformed weeks", () => {
    expect(isValidContestWeek(null)).toBe(false);
    expect(isValidContestWeek({ ...createContestWeek(WEEK), weekId: "bogus" })).toBe(false);
    expect(isValidContestWeek({ ...createContestWeek(WEEK), entries: [{ id: 1 }] })).toBe(false);
  });

  it("sanitizeContests drops invalid weeks and keeps valid ones", () => {
    const good = createContestWeek(WEEK, STARTER_PALETTE);
    const out = sanitizeContests({ [WEEK]: good, bad: { weekId: "nope" } });
    expect(Object.keys(out)).toEqual([WEEK]);
    expect(sanitizeContests(null)).toEqual({});
    expect(sanitizeContests([])).toEqual({});
  });

  it("migrates a v3 save through the chain: contests + cantFail + duel stats", () => {
    // Simulate a genuine v3 save: none of the newer fields exist yet.
    const v3settings = { ...defaultSave().settings } as Record<string, unknown>;
    delete v3settings.cantFail;
    const v3stats = { ...defaultSave().gameStats } as Record<string, unknown>;
    delete v3stats.lastDuelAt;
    delete v3stats.duelDayCounts;
    const v3 = {
      ...defaultSave(),
      version: 3,
      settings: v3settings,
      gameStats: v3stats,
    } as unknown as Record<string, unknown>;
    delete v3.contests;
    const migrated = migrateSave(v3);
    expect(migrated).not.toBeNull();
    expect(migrated!.version).toBe(SAVE_VERSION);
    expect(migrated!.contests).toEqual({});
    expect(migrated!.settings.cantFail).toBe(true);
    expect(migrated!.gameStats.lastDuelAt).toBe(0);
    expect(migrated!.gameStats.duelDayCounts).toEqual({});
    // Pre-existing v3 stats survive the migration untouched.
    expect(migrated!.gameStats.duelWins).toBe(defaultSave().gameStats.duelWins);
  });

  it("preserves an explicit cantFail=false across migration", () => {
    const v3 = {
      ...defaultSave(),
      version: 3,
      settings: { ...defaultSave().settings, cantFail: false },
    } as unknown as Record<string, unknown>;
    const migrated = migrateSave(v3);
    expect(migrated!.settings.cantFail).toBe(false);
  });

  it("validates the new fields on a v4 save", () => {
    const base = defaultSave();
    expect(validateSave(base)).toBe(true);
    expect(validateSave({ ...base, contests: { [WEEK]: createContestWeek(WEEK) } })).toBe(true);
    expect(validateSave({ ...base, contests: { [WEEK]: { weekId: "bogus" } } })).toBe(false);
    expect(
      validateSave({ ...base, gameStats: { ...base.gameStats, lastDuelAt: -1 } }),
    ).toBe(false);
    expect(
      validateSave({ ...base, settings: { ...base.settings, cantFail: "yes" } }),
    ).toBe(false);
  });
});
