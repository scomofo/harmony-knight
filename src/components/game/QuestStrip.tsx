import { useStore } from "../../lib/game/store.ts";
import {
  QUESTS,
  currentStreak,
  questStatus,
  todayKey,
  type QuestId,
} from "../../lib/game/quests.ts";

/**
 * Today's quests strip on Home: streak flame plus one card per quest.
 * Completion is detected automatically; the point reward is claimed with
 * an explicit, satisfying tap.
 */
export function QuestStrip() {
  const questLog = useStore((s) => s.save.questLog);
  const learningDays = useStore((s) => s.save.learningDays);
  const claimQuest = useStore((s) => s.claimQuest);

  const today = todayKey();
  const status = questStatus(questLog, today);
  const streak = currentStreak(learningDays, today);
  const doneCount = QUESTS.filter((q) => status[q.id]).length;

  return (
    <section
      aria-label="Today's quests"
      className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4"
    >
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">
          Today&apos;s quests{" "}
          <span className="text-sm font-normal text-white/50">
            {doneCount}/{QUESTS.length}
          </span>
        </h2>
        {streak >= 1 ? (
          <p className="text-sm font-semibold text-amber-300" aria-label={`${streak}-day streak`}>
            🔥 {streak}-day streak
          </p>
        ) : (
          <p className="text-xs text-white/50">Finish a quest to start a streak</p>
        )}
      </div>
      <ul className="mt-3 space-y-2">
        {QUESTS.map((quest) => (
          <QuestCard key={quest.id} id={quest.id} claim={() => claimQuest(quest.id)} />
        ))}
      </ul>
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
