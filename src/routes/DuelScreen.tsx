import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { DuelGame, type DuelResult } from "../components/game/DuelGame.tsx";
import { duelPoints, duelPointsForDay, formatWaitMs, rematchWaitMs } from "../lib/game/duel.ts";
import { todayKey } from "../lib/game/quests.ts";
import { useStore } from "../lib/game/store.ts";

type LastDuel = DuelResult & { points: number; reduced: boolean };

export function DuelScreen() {
  const grade = useStore((s) => s.save.grade);
  const recordDuelResult = useStore((s) => s.recordDuelResult);
  const addPoints = useStore((s) => s.addPoints);
  const stats = useStore((s) => s.save.gameStats);
  const [runId, setRunId] = useState(0);
  const [last, setLast] = useState<LastDuel | null>(null);
  // Ticking clock for the rematch cooldown countdown.
  const [now, setNow] = useState(() => Date.now());

  const waitMs = rematchWaitMs(stats.lastDuelAt, now);
  useEffect(() => {
    if (waitMs <= 0) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [waitMs]);

  const onFinish = (r: DuelResult) => {
    // Diminishing returns: count today's duels BEFORE recording this one.
    const playedToday = useStore.getState().save.gameStats.duelDayCounts[todayKey()] ?? 0;
    const points = duelPointsForDay(r.outcome, playedToday);
    recordDuelResult(r.outcome);
    addPoints(points);
    setLast({ ...r, points, reduced: playedToday > 0 && points < duelPoints(r.outcome) });
  };

  const rematch = () => {
    setLast(null);
    setRunId((n) => n + 1);
    setNow(Date.now());
  };

  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">⚔️ Duel</h1>
        <p className="text-sm text-white/60">
          {stats.duelWins}W · {stats.duelDraws}D · {stats.duelLosses}L
        </p>
      </div>
      <p className="mt-1 text-white/70">
        Spar against the <span className="font-semibold text-rose-300">Discord Sentinel</span>:
        six rounds of ear-training questions, only first attempts count. The Sentinel
        sharpens as your grade rises. Duels feed your harmony grade — lessons stay open
        either way.
      </p>
      <p className="mt-1 text-xs text-white/40">
        Fair-play rules: a short breather between rematches, and repeat duels on the
        same day earn fewer points.
      </p>
      <div className="mt-4" key={runId}>
        <DuelGame grade={grade} onFinish={onFinish} />
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={rematch}
          disabled={waitMs > 0}
          title={waitMs > 0 ? "Catch your breath — the Sentinel is resetting the board." : "Duel again"}
          className="rounded-xl border border-white/20 px-4 py-2 disabled:opacity-40"
        >
          {waitMs > 0 ? `Rematch in ${formatWaitMs(waitMs)}` : "Rematch"}
        </button>
        <Link to="/games" className="rounded-xl border border-white/20 px-4 py-2 text-white/70">
          ← Games
        </Link>
      </div>
      {last && (
        <p className="mt-2 text-sm text-white/50" role="status">
          {last.outcome === "win"
            ? `Victory — +${last.points} harmony points${last.reduced ? " (repeat duel today: reduced)" : ""}.`
            : last.outcome === "draw"
              ? `Draw — +${last.points} harmony points${last.reduced ? " (repeat duel today: reduced)" : ""}.`
              : "Defeat — no points, but the ear remembers."}
        </p>
      )}
    </div>
  );
}
