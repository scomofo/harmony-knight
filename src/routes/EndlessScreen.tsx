import { useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { TaskPlayer } from "../components/game/TaskPlayer.tsx";
import { useStore } from "../lib/game/store.ts";
import { buildTask } from "../lib/game/tasks.ts";
import {
  ENDLESS_LESSON_ID,
  endlessTaskSpec,
  pointsForRound,
  roundSpec,
  summarizeSession,
  type EndlessSpec,
} from "../lib/game/endless.ts";

/**
 * Endless practice: infinite sessions built from the seeded task engine.
 * Each round draws a random task family; solving earns harmony points and
 * feeds skill ratings. After every round the learner chooses "keep going"
 * or "wrap up" — the session never pressures them to continue. Fully
 * offline: every task is generated on-device.
 */
export function EndlessScreen() {
  const [sessionSeed, setSessionSeed] = useState<number | null>(null);
  return (
    <div className="mx-auto max-w-2xl p-4 pb-16 sm:p-6">
      {sessionSeed === null ? (
        <EndlessIntro onStart={() => setSessionSeed(Date.now())} />
      ) : (
        <EndlessSession key={sessionSeed} seed={sessionSeed} onRestart={() => setSessionSeed(Date.now())} />
      )}
    </div>
  );
}

function EndlessIntro({ onStart }: { onStart: () => void }) {
  return (
    <div className="mt-8 text-center">
      <p className="text-5xl" aria-hidden>♾️</p>
      <h1 className="mt-4 text-2xl font-bold">Endless practice</h1>
      <p className="mx-auto mt-3 max-w-md leading-relaxed text-white/70">
        An infinite stream of quick challenges drawn from everything
        you&apos;ve learned — fresh every round, generated right on this
        device. Solve for harmony points, build your skill ratings, and stop
        whenever you like. No timers, no pressure.
      </p>
      <ul className="mx-auto mt-4 max-w-md space-y-1 text-left text-sm text-white/60">
        <li>✨ First-try solve: +2 harmony points</li>
        <li>💪 Solved after a miss: +1 harmony point</li>
        <li>🔥 First-try streaks build within the session</li>
      </ul>
      <button
        type="button"
        onClick={onStart}
        className="mt-6 rounded-xl bg-indigo-500 px-6 py-4 text-lg font-bold text-white"
      >
        Start practicing
      </button>
      <Link to="/" className="mt-4 block text-sm text-white/50 underline">
        Back to the quest
      </Link>
    </div>
  );
}

type RoundResult = { solved: boolean; firstTry: boolean };

function EndlessSession({ seed, onRestart }: { seed: number; onRestart: () => void }) {
  const touchLearningDay = useStore((s) => s.touchLearningDay);
  const addPoints = useStore((s) => s.addPoints);
  const recordEndlessAttempt = useStore((s) => s.recordEndlessAttempt);

  const [roundIndex, setRoundIndex] = useState(0);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [resolved, setResolved] = useState(false);
  const [finished, setFinished] = useState(false);
  const recordedRef = useRef(-1);

  // Count today as a learning day the moment a session starts.
  useMemo(() => {
    touchLearningDay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const spec: EndlessSpec = useMemo(() => roundSpec(seed, roundIndex), [seed, roundIndex]);
  const task = useMemo(
    () => buildTask(ENDLESS_LESSON_ID, endlessTaskSpec(spec)),
    [spec],
  );

  const summary = summarizeSession(results);

  const handleResult = (r: { correct: boolean; firstTry: boolean; assisted: boolean }) => {
    // First onResult per round = the first attempt: evidence for ratings.
    if (recordedRef.current !== roundIndex) {
      recordedRef.current = roundIndex;
      recordEndlessAttempt(spec.kind, r.firstTry);
    }
    if (r.correct && !resolved) {
      setResolved(true);
      addPoints(pointsForRound(r.firstTry, true));
      setResults((prev) => [...prev, { solved: true, firstTry: r.firstTry }]);
    }
  };

  const nextRound = () => {
    setRoundIndex((i) => i + 1);
    setResolved(false);
  };

  if (finished) {
    return (
      <div className="mt-8 text-center">
        <p className="text-5xl" aria-hidden>🎶</p>
        <h1 className="mt-4 text-2xl font-bold">Session complete</h1>
        <p className="mt-1 text-sm text-white/60">Nicely played — every round sharpened a skill.</p>
        <dl className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-3 text-left">
          <Stat label="Rounds played" value={String(summary.rounds)} />
          <Stat label="First-try solves" value={String(summary.firstTry)} />
          <Stat label="Best first-try streak" value={String(summary.bestStreak)} />
          <Stat label="Points earned" value={`+${summary.points}`} />
        </dl>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={onRestart}
            className="rounded-xl bg-indigo-500 px-5 py-3 font-bold text-white"
          >
            Practice again
          </button>
          <Link
            to="/"
            className="rounded-xl border border-white/20 px-5 py-3 font-semibold text-white/80"
          >
            Back to the quest
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Endless practice</h1>
        <p className="text-sm text-white/60" aria-live="polite">
          Round {roundIndex + 1}
          {summary.bestStreak > 1 && (
            <span className="ml-2 font-semibold text-amber-300">🔥 {summary.bestStreak}</span>
          )}
        </p>
      </div>
      <p className="mt-1 text-sm text-white/60">
        {summary.rounds} solved · +{summary.points} points this session
      </p>

      <div className="mt-4">
        <TaskPlayer
          key={`${seed}-${roundIndex}`}
          task={task}
          onResult={handleResult}
          solvedNote="Solved! Your skill ratings just got a little sharper."
        />
      </div>

      {resolved && (
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={nextRound}
            autoFocus
            className="flex-1 rounded-xl bg-indigo-500 px-4 py-3 font-bold text-white"
          >
            Keep going →
          </button>
          <button
            type="button"
            onClick={() => setFinished(true)}
            className="flex-1 rounded-xl border border-white/20 px-4 py-3 font-semibold text-white/80"
          >
            Wrap up
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <dt className="text-xs text-white/50">{label}</dt>
      <dd className="text-2xl font-bold">{value}</dd>
    </div>
  );
}
