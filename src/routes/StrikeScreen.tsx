import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { StrikeGame } from "../components/game/StrikeGame.tsx";
import { strikePoints, type StrikeScore } from "../lib/game/strike.ts";
import { FEVER_THRESHOLD } from "../lib/game/curriculum.ts";
import { useStore } from "../lib/game/store.ts";

export function StrikeScreen() {
  const recordGameResult = useStore((s) => s.recordGameResult);
  const addPoints = useStore((s) => s.addPoints);
  const strikeBest = useStore((s) => s.save.gameStats.strikeBest);
  const [runId, setRunId] = useState(0);
  const [lastScore, setLastScore] = useState<StrikeScore | null>(null);

  const onFinish = (score: StrikeScore) => {
    setLastScore(score);
    recordGameResult("strike", { score: score.score });
    addPoints(strikePoints(score));
  };

  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">⚡ Strike</h1>
        {strikeBest > 0 && (
          <p className="text-sm text-white/60">Best: {strikeBest}</p>
        )}
      </div>
      <p className="mt-1 text-white/70">
        Notes fall down four lanes — strike each one as it crosses the line. A {FEVER_THRESHOLD}-note
        combo ignites <span className="font-semibold text-amber-300">fever</span> for double points.
        Strike feeds your rhythm grade, but never blocks a lesson.
      </p>
      <div className="mt-4" key={runId}>
        <StrikeGame onFinish={onFinish} />
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setLastScore(null);
            setRunId((n) => n + 1);
          }}
          className="rounded-xl border border-white/20 px-4 py-2"
        >
          New chart
        </button>
        <Link to="/games" className="rounded-xl border border-white/20 px-4 py-2 text-white/70">
          ← Games
        </Link>
      </div>
      {lastScore && (
        <p className="mt-2 text-sm text-white/50" role="status">
          Last run: {lastScore.score} points · +{strikePoints(lastScore)} harmony points banked.
        </p>
      )}
    </div>
  );
}
