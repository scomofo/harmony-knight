import { useStore } from "../../lib/game/store.ts";
import {
  QUESTS,
  freezeAvailable,
  guardedStreak,
  questStatus,
  todayKey,
  type QuestId,
} from "../../lib/game/quests.ts";

/**
 * Today's quests strip on Home.
 *
 * Streaks are deliberately quiet here: a small day-count with the weekly
 * freeze status, never flames-first. Skill ratings (rendered above this
 * strip on Home) carry the progress story instead. No shaming copy about
 * broken streaks exists anywhere.
 */
export function QuestStrip() {
  const questLog = useStore((s) => s.save.questLog);
  const learningDays = useStore((s) => s.save.learningDays);
  const streakFreeze = useStore((s) => s.save.streakFreeze);
  const claimQuest = useStore((s) => s.claimQuest);

  const today = todayKey();
  const status = questStatus(questLog, today);
  const { streak, freezeBridged } = guardedStreak(learningDays, today, streakFreeze);
  const freezeReady = freezeAvailable(streakFreeze, today);
  // The bridge is consumed the moment the learner returns; show it then.
  const freezeKept = freezeBridged || streakFreeze === today;
  const doneCount = QUESTS.filter((q) => status[q.id]).length;

  return (
    <section
      aria-label="Today's quests"
      className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">
          Today&apos;s quests{" "}
          <span className="text-sm font-normal text-white/50">
            {doneCount}/{QUESTS.length}
          </span>
        </h2>
        <p className="shrink-0 text-xs text-white/50" aria-live="polite">
          {streak >= 2 ? (
            <>{streak} days in a row{freezeKept ? " · ❄️ freeze kept it going" : ""}</>
          ) : streak === 1 ? (
            <>Day 1 — every streak starts somewhere</>
          ) : (
            <>Small steps count</>
          )}
        </p>
      </div>
      <ul className="mt-3 space-y-2">
        {QUESTS.map((quest) => (
          <QuestCard key={quest.id} id={quest.id} claim={() => claimQuest(quest.id)} />
        ))}
      </ul>
      <p className="mt-3 text-xs text-white/40">
        {freezeReady
          ? "❄️ Streak freeze ready — one missed day a week won't break your run."
          : "❄️ Streak freeze recharges weekly."}
      </p>
    </section>
  );
}

function QuestCard({ id, claim }: { id: QuestId; claim: () => void }) {
  const quest = QUESTS.find((q) => q.id === id)!;
  const state = useStore((s) => s.save.questLog[todayKey()]?.[id] ?? null);

  return (
    <li className="flex items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-2">
      <div>
        <p className="text-sm font-semibold">{quest.title}</p>
        <p className="text-xs text-white/50">{quest.blurb}</p>
      </div>
      {state === "claimed" ? (
        <span className="shrink-0 text-sm font-semibold text-emerald-300" aria-label={`${quest.title} claimed`}>
          ✓ Done
        </span>
      ) : state === "done" ? (
        <button
          type="button"
          onClick={claim}
          className="shrink-0 rounded-lg bg-amber-400 px-3 py-1.5 text-sm font-bold text-amber-950"
        >
          Claim +{quest.points}
        </button>
      ) : (
        <span className="shrink-0 text-xs text-white/40">Not yet</span>
      )}
    </li>
  );
}
