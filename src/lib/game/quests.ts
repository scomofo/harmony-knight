/**
 * Daily quests and streaks — the habit loop.
 *
 * Three quests refresh every device-local day. Completion is recorded
 * automatically from normal play (idempotent per day); the point reward is
 * claimed explicitly from the quest card, so quest payouts never disturb
 * the lesson/game point accounting the release gates pin down.
 */

export type QuestId = "learn" | "play" | "create";

export type Quest = {
  id: QuestId;
  title: string;
  blurb: string;
  /** Harmony points paid once per day on explicit claim. */
  points: number;
};

export const QUESTS: Quest[] = [
  { id: "learn", title: "Learn something new", blurb: "Answer a recall check or finish a lesson.", points: 5 },
  { id: "play", title: "Take the stage", blurb: "Finish a Strike run or a Duel.", points: 5 },
  { id: "create", title: "Make something", blurb: "Save a creation or finish a study drill.", points: 5 },
];

export type QuestState = "done" | "claimed";

/** Device-local YYYY-MM-DD. */
export function todayKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function shiftKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return todayKey(dt);
}

/** Status of every quest for a given day. */
export function questStatus(
  questLog: Record<string, Record<string, QuestState>>,
  date: string,
): Record<QuestId, QuestState | null> {
  const day = questLog[date] ?? {};
  return {
    learn: day.learn ?? null,
    play: day.play ?? null,
    create: day.create ?? null,
  };
}

/**
 * Record a quest completion. Idempotent: completing twice in one day is a
 * no-op, and claiming is a separate explicit step.
 */
export function completeQuest(
  questLog: Record<string, Record<string, QuestState>>,
  id: QuestId,
  date: string,
): Record<string, Record<string, QuestState>> {
  const day = questLog[date] ?? {};
  if (day[id]) return questLog;
  return { ...questLog, [date]: { ...day, [id]: "done" } };
}

/** Claim a completed quest's reward. Returns the updated log and whether points are owed. */
export function claimQuest(
  questLog: Record<string, Record<string, QuestState>>,
  id: QuestId,
  date: string,
): { log: Record<string, Record<string, QuestState>>; claimed: boolean } {
  const day = questLog[date] ?? {};
  if (day[id] !== "done") return { log: questLog, claimed: false };
  return { log: { ...questLog, [date]: { ...day, [id]: "claimed" } }, claimed: true };
}

/**
 * Consecutive-day streak from learning days. A streak is alive when today
 * or yesterday is present; it counts back unbroken from the most recent
 * active day.
 */
export function currentStreak(learningDays: string[], today: string): number {
  const set = new Set(learningDays);
  let cursor = today;
  if (!set.has(cursor)) {
    cursor = shiftKey(today, -1);
    if (!set.has(cursor)) return 0;
  }
  let streak = 0;
  while (set.has(cursor)) {
    streak += 1;
    cursor = shiftKey(cursor, -1);
  }
  return streak;
}

/** Points available to claim today (completed but unclaimed quests). */
export function claimablePoints(
  questLog: Record<string, Record<string, QuestState>>,
  date: string,
): number {
  const status = questStatus(questLog, date);
  return QUESTS.filter((q) => status[q.id] === "done").reduce((n, q) => n + q.points, 0);
}
