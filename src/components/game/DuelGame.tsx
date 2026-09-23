/**
 * DuelGame: ear-training sparring against the Discord Sentinel.
 *
 * Each round asks a practical question; the player answers through the
 * normal task UI while the rival answers with seeded skill. Only each
 * side's first attempt counts. First to the higher score takes the duel.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildDuel,
  scoreDuel,
  type DuelOutcome,
} from "../../lib/game/duel.ts";
import { buildTask } from "../../lib/game/tasks.ts";
import { TaskPlayer } from "./TaskPlayer.tsx";
import { emitEffect } from "../../lib/game/effects.ts";

export type DuelResult = {
  player: boolean[];
  rival: boolean[];
  outcome: DuelOutcome;
  playerScore: number;
  rivalScore: number;
};

export function DuelGame({
  seed,
  grade = 5,
  rounds = 6,
  compact = false,
  onFinish,
}: {
  seed?: number;
  grade?: number;
  rounds?: number;
  compact?: boolean;
  onFinish?: (r: DuelResult) => void;
}) {
  const duelSeed = useMemo(
    () => seed ?? Math.floor(Math.random() * 1_000_000_000),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const duel = useMemo(
    () => buildDuel(duelSeed, grade, rounds),
    [duelSeed, grade, rounds],
  );

  const [roundIndex, setRoundIndex] = useState(0);
  const [player, setPlayer] = useState<(boolean | undefined)[]>(
    Array(duel.rounds.length).fill(undefined),
  );
  const [playerDone, setPlayerDone] = useState(false);
  const [rivalThinking, setRivalThinking] = useState(false);
  const [rivalRevealed, setRivalRevealed] = useState(false);
  const [finished, setFinished] = useState<DuelResult | null>(null);
  const thinkTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(thinkTimer.current), []);

  const round = duel.rounds[roundIndex]!;
  const task = useMemo(
    () => buildTask("duel", round.spec),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [duelSeed, roundIndex],
  );

  const onResult = (r: { correct: boolean; firstTry: boolean }) => {
    // Only the first attempt of the round counts for the duel score.
    setPlayer((prev) => {
      if (prev[roundIndex] !== undefined) return prev;
      const next = [...prev];
      next[roundIndex] = r.firstTry;
      return next;
    });
  };

  const revealRival = () => {
    setRivalThinking(true);
    thinkTimer.current = window.setTimeout(() => {
      setRivalThinking(false);
      setRivalRevealed(true);
      emitEffect({ event: "clash", cancelKey: `duel-${duelSeed}-${roundIndex}` });
    }, 900);
  };

  const next = () => {
    if (roundIndex + 1 >= duel.rounds.length) {
      const playerBools = player.map((p) => p === true);
      const s = scoreDuel(playerBools, duel.rivalCorrect);
      const result: DuelResult = {
        player: playerBools,
        rival: duel.rivalCorrect,
        outcome: s.outcome,
        playerScore: s.player,
        rivalScore: s.rival,
      };
      setFinished(result);
      emitEffect({
        event: s.outcome === "win" ? "mastery" : s.outcome === "draw" ? "correct" : "needs-work",
        cancelKey: `duel-${duelSeed}-done`,
      });
      onFinish?.(result);
    } else {
      setRoundIndex((i) => i + 1);
      setPlayerDone(false);
      setRivalRevealed(false);
    }
  };

  const scoreSoFar = scoreDuel(
    player.map((p) => p === true),
    duel.rivalCorrect.slice(0, roundIndex + (rivalRevealed ? 1 : 0)),
  );

  if (finished) {
    const msg =
      finished.outcome === "win"
        ? "Victory! The Sentinel bows to your ear."
        : finished.outcome === "draw"
          ? "A draw — the Sentinel nods with respect."
          : "The Sentinel takes this one. Rematch?";
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center" data-testid="duel-game" role="status">
        <h2 className="text-xl font-bold">{msg}</h2>
        <p className="mt-2 text-white/70">
          You {finished.playerScore} — {finished.rivalScore} Sentinel
        </p>
        <div className="mt-2 flex justify-center gap-1" aria-label="Round results">
          {finished.player.map((p, i) => (
            <span
              key={i}
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                p ? "bg-emerald-500/30 text-emerald-200" : "bg-white/10 text-white/50"
              }`}
            >
              {p ? "✓" : "·"}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="duel-game">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">
          ⚔️ You <span className="text-amber-300">{scoreSoFar.player}</span>
          <span className="text-white/40"> — </span>
          <span className="text-rose-300">{scoreSoFar.rival}</span> Sentinel
        </h2>
        <p className="text-sm text-white/60">
          Round {roundIndex + 1} of {duel.rounds.length}
        </p>
      </div>

      <div className="mt-3" key={`${duelSeed}-${roundIndex}`}>
        <TaskPlayer task={task} onResult={onResult} />
      </div>

      {!compact && (
        <p className="mt-2 text-xs text-white/40">
          Only your first attempt each round scores — the Sentinel answers from instinct.
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {!playerDone && player[roundIndex] === undefined && (
          <button
            type="button"
            onClick={() => {
              setPlayer((prev) => {
                const next = [...prev];
                next[roundIndex] = false; // skipped = wrong first attempt
                return next;
              });
              setPlayerDone(true);
            }}
            className="rounded-xl border border-white/20 px-4 py-2 text-white/70"
          >
            Skip round
          </button>
        )}
        {(playerDone || player[roundIndex] !== undefined) && !rivalRevealed && !rivalThinking && (
          <button
            type="button"
            onClick={revealRival}
            className="rounded-xl bg-rose-500/80 px-4 py-2 font-semibold"
          >
            Reveal the Sentinel's answer
          </button>
        )}
        {rivalThinking && (
          <p className="rounded-xl border border-white/10 px-4 py-2 text-white/60" role="status">
            The Sentinel listens…
          </p>
        )}
        {rivalRevealed && (
          <div className="flex w-full items-center gap-2">
            <p
              className={`flex-1 rounded-xl p-3 text-sm ${
                duel.rivalCorrect[roundIndex]
                  ? "bg-rose-500/15 text-rose-200"
                  : "bg-emerald-500/15 text-emerald-200"
              }`}
              role="status"
            >
              {duel.rivalCorrect[roundIndex]
                ? "The Sentinel answered correctly."
                : "The Sentinel missed it!"}
            </p>
            <button
              type="button"
              onClick={next}
              className="rounded-xl bg-indigo-500 px-4 py-2 font-semibold"
            >
              {roundIndex + 1 >= duel.rounds.length ? "Finish duel" : "Next round →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
