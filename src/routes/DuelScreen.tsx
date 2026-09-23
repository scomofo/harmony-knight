import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { DuelGame, type DuelResult } from "../components/game/DuelGame.tsx";
import { duelPoints } from "../lib/game/duel.ts";
import { useStore } from "../lib/game/store.ts";

export function DuelScreen() {
  const grade = useStore((s) => s.save.grade);
  const recordDuelResult = useStore((s) => s.recordDuelResult);
  const addPoints = useStore((s) => s.addPoints);
  const stats = useStore((s) => s.save.gameStats);
  const [runId, setRunId] = useState(0);
  const [last, setLast] = useState<DuelResult | null>(null);

  const onFinish = (r: DuelResult) => {
    setLast(r);
    recordDuelResult(r.outcome);
    addPoints(duelPoints(r.outcome));
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
      <div className="mt-4" key={runId}>
        <DuelGame grade={grade} onFinish={onFinish} />
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setLast(null);
            setRunId((n) => n + 1);
          }}
          className="rounded-xl border border-white/20 px-4 py-2"
        >
          Rematch
        </button>
        <Link to="/games" className="rounded-xl border border-white/20 px-4 py-2 text-white/70">
          ← Games
        </Link>
      </div>
      {last && (
        <p className="mt-2 text-sm text-white/50" role="status">
          {last.outcome === "win"
            ? `Victory — +${duelPoints(last.outcome)} harmony points.`
            : last.outcome === "draw"
              ? `Draw — +${duelPoints(last.outcome)} harmony points.`
              : "Defeat — no points, but the ear remembers."}
        </p>
      )}
    </div>
  );
}
