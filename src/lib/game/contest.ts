/**
 * Creation contests: a weekly, fully local competition.
 *
 * Each week the player may submit creations; the Discord Sentinel and two
 * clockwork rivals (seeded per week, deterministic) fill out the bracket.
 * Entries face off head-to-head: the player votes the matchups involving
 * their own entries, bot-vs-bot matchups resolve by a deterministic appeal
 * score, and the leaderboard persists in the save.
 *
 * Pure engine: week ids, bot generation, matchups, voting, standings.
 * The store owns persistence; the component owns presentation.
 */

import { mulberry32 } from "./tasks.ts";
import type { Palette } from "./palettes.ts";
import { STARTER_PALETTE } from "./palettes.ts";

export type ContestEntry = {
  /** "player:<creationId>" or "bot:<botId>". */
  id: string;
  name: string;
  author: string;
  bot: boolean;
  /** Resolved MIDI steps. */
  notes: number[];
  submittedAt: number;
};

export type ContestWeek = {
  weekId: string;
  entries: ContestEntry[];
  /** matchupId -> winning entry id (player votes). */
  votes: Record<string, string>;
  /** Anti double-pay: entry ids already rewarded + whether the vote bonus paid. */
  rewardsPaid: { submissions: string[]; votingBonus: boolean };
};

export type ContestMatchup = {
  id: string;
  a: string; // entry id
  b: string; // entry id
};

export type ContestStanding = {
  entry: ContestEntry;
  wins: number;
  losses: number;
  appeal: number;
};

/** Harmony points for submitting a creation to the week's contest. */
export const CONTEST_SUBMISSION_POINTS = 5;
/** Harmony points for voting every matchup that involves a player entry. */
export const CONTEST_VOTING_BONUS = 5;
/** Past weeks kept in the save (storage bound). */
export const MAX_KEPT_WEEKS = 8;

export type ContestBot = { id: string; name: string; blurb: string };

export const CONTEST_BOTS: ContestBot[] = [
  { id: "sentinel", name: "Discord Sentinel", blurb: "The house rival. Plays to win." },
  { id: "rook", name: "Rhythm Rook", blurb: "A clockwork improviser. Never misses a beat." },
  { id: "baron", name: "Bass Baron", blurb: "Loyal to the low end." },
];

/* ------------------------------------------------------------------ */
/* Week ids                                                              */
/* ------------------------------------------------------------------ */

/** ISO-8601 week id ("2026-W39") on the device-local calendar. */
export function contestWeekId(date: Date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day + 3); // Thursday pins the ISO year
  const firstThursday = new Date(d.getFullYear(), 0, 4);
  const fday = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - fday + 3);
  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / 604_800_000);
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* ------------------------------------------------------------------ */
/* Entries                                                               */
/* ------------------------------------------------------------------ */

const BOT_NAMES: Record<string, string[]> = {
  sentinel: ["Static Fanfare", "Dissonant March", "Feedback Loop", "Minor Menace"],
  rook: ["Tick Tock Tune", "Metronome's Dream", "Clockwork Carol", "Steady Eddy"],
  baron: ["Low Rider", "Subterranean", "Root Position", "Deep Cut"],
};

/**
 * Deterministic bot entry for a week: a stepwise random walk over the
 * palette scale, seeded by week + bot so every device agrees and every
 * week sounds different.
 */
export function botEntryForWeek(
  bot: ContestBot,
  weekId: string,
  palette: Palette = STARTER_PALETTE,
): ContestEntry {
  const rand = mulberry32(hashString(`${weekId}:${bot.id}`));
  const scale = palette.scalePcs.length > 0 ? palette.scalePcs : [0, 2, 4, 5, 7, 9, 11];
  const steps = 16 + Math.floor(rand() * 9); // 16..24
  let degree = 7 + Math.floor(rand() * 5);
  const notes: number[] = [];
  for (let i = 0; i < steps; i++) {
    degree += Math.floor(rand() * 5) - 2;
    degree = Math.max(0, Math.min(scale.length * 2 - 1, degree));
    const octave = Math.floor(degree / scale.length);
    notes.push(60 + octave * 12 + scale[degree % scale.length]!);
  }
  const titles = BOT_NAMES[bot.id] ?? ["Untitled"];
  return {
    id: `bot:${bot.id}`,
    name: titles[Math.floor(rand() * titles.length)]!,
    author: bot.name,
    bot: true,
    notes,
    submittedAt: 0,
  };
}

/** Player entry from a saved creation. Returns null when it has no notes. */
export function playerEntryForCreation(
  creation: { id: string; name: string; notes: number[] },
  now: number = Date.now(),
): ContestEntry | null {
  if (creation.notes.length === 0) return null;
  return {
    id: `player:${creation.id}`,
    name: creation.name,
    author: "You",
    bot: false,
    notes: creation.notes,
    submittedAt: now,
  };
}

/* ------------------------------------------------------------------ */
/* Appeal: deterministic bot-vs-bot tiebreak                             */
/* ------------------------------------------------------------------ */

/**
 * Deterministic "crowd appeal" 0..1 from the notes alone: length, pitch
 * variety, and contour variety. Transparent (shown as stars) and identical
 * for player and bot entries.
 */
export function entryAppeal(notes: number[]): number {
  if (notes.length === 0) return 0;
  const lengthScore = Math.min(1, notes.length / 24);
  const varietyScore = Math.min(1, new Set(notes.map((n) => n % 12)).size / 7);
  let turns = 0;
  for (let i = 2; i < notes.length; i++) {
    const d1 = Math.sign(notes[i - 1]! - notes[i - 2]!);
    const d2 = Math.sign(notes[i]! - notes[i - 1]!);
    if (d1 !== 0 && d2 !== 0 && d1 !== d2) turns++;
  }
  const contourScore = notes.length > 2 ? Math.min(1, turns / (notes.length / 3)) : 0;
  return Math.max(
    0,
    Math.min(1, 0.35 * lengthScore + 0.35 * varietyScore + 0.3 * contourScore),
  );
}

/* ------------------------------------------------------------------ */
/* Matchups + voting                                                     */
/* ------------------------------------------------------------------ */

export function matchupId(a: string, b: string): string {
  return [a, b].sort().join("‖");
}

/** Every unordered entry pair, in entry order. */
export function contestMatchups(week: ContestWeek): ContestMatchup[] {
  const out: ContestMatchup[] = [];
  for (let i = 0; i < week.entries.length; i++) {
    for (let j = i + 1; j < week.entries.length; j++) {
      const a = week.entries[i]!.id;
      const b = week.entries[j]!.id;
      out.push({ id: matchupId(a, b), a, b });
    }
  }
  return out;
}

function entryById(week: ContestWeek, id: string): ContestEntry | undefined {
  return week.entries.find((e) => e.id === id);
}

/**
 * Winner of a matchup: the player's vote when present; otherwise, for
 * bot-vs-bot pairs, the higher appeal (ties -> the lexicographically
 * smaller id, still deterministic). Null = awaiting the player's vote.
 */
export function matchupWinner(week: ContestWeek, matchup: ContestMatchup): string | null {
  const voted = week.votes[matchup.id];
  if (voted && (voted === matchup.a || voted === matchup.b)) return voted;
  const a = entryById(week, matchup.a);
  const b = entryById(week, matchup.b);
  if (!a || !b) return null;
  if (a.bot && b.bot) {
    const appealA = entryAppeal(a.notes);
    const appealB = entryAppeal(b.notes);
    if (appealA === appealB) return a.id < b.id ? a.id : b.id;
    return appealA > appealB ? a.id : b.id;
  }
  return null;
}

/** Record a player vote. Invalid matchup/winner ids leave the week unchanged. */
export function voteInContest(
  week: ContestWeek,
  matchup: ContestMatchup,
  winnerId: string,
): ContestWeek {
  if (winnerId !== matchup.a && winnerId !== matchup.b) return week;
  if (!week.entries.some((e) => e.id === matchup.a) || !week.entries.some((e) => e.id === matchup.b)) {
    return week;
  }
  return { ...week, votes: { ...week.votes, [matchup.id]: winnerId } };
}

/** Matchups the player still needs to vote (involve a player entry, no vote yet). */
export function pendingPlayerMatchups(week: ContestWeek): ContestMatchup[] {
  return contestMatchups(week).filter((m) => {
    const a = entryById(week, m.a);
    const b = entryById(week, m.b);
    if (!a || !b) return false;
    if (a.bot && b.bot) return false;
    return !week.votes[m.id];
  });
}

/** Standings: wins from decided matchups, sorted by wins then appeal. */
export function contestLeaderboard(week: ContestWeek): ContestStanding[] {
  const table = new Map<string, { wins: number; losses: number }>();
  for (const e of week.entries) table.set(e.id, { wins: 0, losses: 0 });
  for (const m of contestMatchups(week)) {
    const winner = matchupWinner(week, m);
    if (!winner) continue;
    const loser = winner === m.a ? m.b : m.a;
    table.get(winner)!.wins++;
    table.get(loser)!.losses++;
  }
  return week.entries
    .map((entry) => ({
      entry,
      wins: table.get(entry.id)!.wins,
      losses: table.get(entry.id)!.losses,
      appeal: entryAppeal(entry.notes),
    }))
    .sort((x, y) => y.wins - x.wins || y.appeal - x.appeal || x.entry.name.localeCompare(y.entry.name));
}

/* ------------------------------------------------------------------ */
/* Week lifecycle                                                        */
/* ------------------------------------------------------------------ */

/** Fresh week seeded with the bot bracket. Idempotent per week id. */
export function createContestWeek(weekId: string, palette: Palette = STARTER_PALETTE): ContestWeek {
  return {
    weekId,
    entries: CONTEST_BOTS.map((b) => botEntryForWeek(b, weekId, palette)),
    votes: {},
    rewardsPaid: { submissions: [], votingBonus: false },
  };
}

/** Add a player entry; null when that creation is already submitted. */
export function submitToContest(week: ContestWeek, entry: ContestEntry): ContestWeek | null {
  if (week.entries.some((e) => e.id === entry.id)) return null;
  return { ...week, entries: [...week.entries, entry] };
}

/** Submission points due for an entry (0 when already paid). */
export function submissionPointsDue(week: ContestWeek, entryId: string): number {
  const entry = entryById(week, entryId);
  if (!entry || entry.bot) return 0;
  return week.rewardsPaid.submissions.includes(entryId) ? 0 : CONTEST_SUBMISSION_POINTS;
}

/** Whether the vote-every-matchup bonus is claimable right now. */
export function votingBonusAvailable(week: ContestWeek): boolean {
  if (week.rewardsPaid.votingBonus) return false;
  const playerEntries = week.entries.filter((e) => !e.bot);
  if (playerEntries.length === 0) return false;
  return pendingPlayerMatchups(week).length === 0;
}

/* ------------------------------------------------------------------ */
/* Validation (for the save migration)                                   */
/* ------------------------------------------------------------------ */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function validEntry(v: unknown): v is ContestEntry {
  if (!isRecord(v)) return false;
  return (
    typeof v.id === "string" &&
    v.id.length > 0 &&
    typeof v.name === "string" &&
    typeof v.author === "string" &&
    typeof v.bot === "boolean" &&
    Array.isArray(v.notes) &&
    v.notes.every((n) => typeof n === "number" && Number.isFinite(n)) &&
    typeof v.submittedAt === "number" &&
    Number.isFinite(v.submittedAt)
  );
}

/** Validate a persisted contest week; false = drop the week, keep the save. */
export function isValidContestWeek(v: unknown): v is ContestWeek {
  if (!isRecord(v)) return false;
  if (typeof v.weekId !== "string" || !/^\d{4}-W\d{2}$/.test(v.weekId)) return false;
  if (!Array.isArray(v.entries) || !v.entries.every(validEntry)) return false;
  const ids = new Set(v.entries.map((e) => (e as ContestEntry).id));
  if (!isRecord(v.votes)) return false;
  for (const [mid, winner] of Object.entries(v.votes)) {
    if (typeof winner !== "string" || !ids.has(winner)) return false;
    const parts = mid.split("‖");
    if (parts.length !== 2 || !parts.every((p) => ids.has(p))) return false;
  }
  const rp = v.rewardsPaid;
  if (!isRecord(rp)) return false;
  if (!Array.isArray(rp.submissions) || !rp.submissions.every((s) => typeof s === "string")) return false;
  if (typeof rp.votingBonus !== "boolean") return false;
  return true;
}

/** Coerce unknown persisted contests; invalid weeks are dropped. */
export function sanitizeContests(v: unknown): Record<string, ContestWeek> {
  if (!isRecord(v)) return {};
  const out: Record<string, ContestWeek> = {};
  for (const [weekId, week] of Object.entries(v)) {
    if (typeof weekId === "string" && isValidContestWeek(week) && week.weekId === weekId) {
      out[weekId] = week;
    }
  }
  // Bound storage: keep the most recent weeks only.
  const kept = Object.keys(out).sort().slice(-MAX_KEPT_WEEKS);
  return Object.fromEntries(kept.map((id) => [id, out[id]!]));
}
