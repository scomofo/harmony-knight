import { useState } from "react";
import { TeachingPlayer } from "./TeachingPlayer.tsx";
import { emitEffect } from "../../lib/game/effects.ts";
import { useStore } from "../../lib/game/store.ts";
import type { PracticalTask } from "../../lib/game/tasks.ts";

/**
 * Renders an authored practical task inside the lesson Try step.
 *
 * - Interactive audio demo + attempt controls, driven by the task's kind.
 * - Progressive hints; each hint marks the attempt assisted.
 * - Pure judgment via task.judge; outcome recorded in the store as a TaskDraft
 *   (firstCheckCorrect + assisted), so review variants and regression tests
 *   can read it later.
 * - Practice is never a gate: solving is celebrated, struggling is coached,
 *   and the learner can always move on.
 */
export function TaskPlayer({ lessonId, task }: { lessonId: string; task: PracticalTask }) {
  const recordTaskAttempt = useStore((s) => s.recordTaskAttempt);
  const [hintCount, setHintCount] = useState(0);
  const [verdict, setVerdict] = useState<{ ok: boolean; firstTry: boolean } | null>(null);
  const [solved, setSolved] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const attempt = (value: unknown) => {
    if (solved) return;
    const ok = task.judge(value);
    const assisted = hintCount > 0;
    const firstTry = recordTaskAttempt(lessonId, task.taskId, {
      draft: value,
      feedback: ok ? task.praise : task.nudge,
      correct: ok,
      assisted,
    });
    setAttempts((n) => n + 1);
    setVerdict({ ok, firstTry });
    if (ok) setSolved(true);
    emitEffect({
      event: ok && !assisted ? "correct" : ok ? "assisted" : "needs-work",
      cancelKey: task.taskId,
    });
  };

  const revealHint = () => {
    if (hintCount < task.hints.length) {
      setHintCount((n) => n + 1);
      setVerdict(null);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4" data-testid="task-player">
      <h2 className="font-semibold">Try it yourself</h2>
      <p className="mt-2 text-white/80">{task.prompt}</p>

      {task.audio && (
        <div className="mt-3 space-y-2">
          {task.audio.segments ? (
            task.audio.segments.map((seg, i) => (
              <TeachingPlayer
                key={seg.label}
                midis={seg.notes}
                caption={seg.label}
                lane={`task-${task.taskId}-${i}`}
                durations={seg.durations}
              />
            ))
          ) : (
            <TeachingPlayer
              midis={task.audio.notes}
              caption="Listen, then answer."
              lane={`task-${task.taskId}`}
              durations={task.audio.durations}
            />
          )}
        </div>
      )}

      <AttemptControls kind={task.kind} choices={task.choices} disabled={solved} onAttempt={attempt} />

      {task.hints.length > 0 && hintCount < task.hints.length && !solved && (
        <button
          type="button"
          onClick={revealHint}
          className="mt-2 text-sm text-white/60 underline"
        >
          Need a hint? (marks this attempt assisted)
        </button>
      )}
      {hintCount > 0 && (
        <div className="mt-2 space-y-1">
          {task.hints.slice(0, hintCount).map((h, i) => (
            <p key={i} className="rounded-lg bg-amber-500/10 p-2 text-sm text-amber-200">
              Hint {i + 1}: {h}
            </p>
          ))}
        </div>
      )}

      {verdict && (
        <p
          role="status"
          className={`mt-3 rounded-lg p-3 text-sm ${
            verdict.ok ? "bg-emerald-500/15 text-emerald-200" : "bg-white/5 text-white/85"
          }`}
        >
          {verdict.ok ? task.praise : task.nudge}
          {verdict.ok && verdict.firstTry && attempts === 1 && (
            <span className="ml-2 text-amber-300">First try!</span>
          )}
        </p>
      )}
      {solved && (
        <p className="mt-2 text-sm text-white/60">
          Nicely done — this attempt is saved in your lesson journal.
        </p>
      )}
    </div>
  );
}

function AttemptControls({
  kind,
  choices,
  disabled,
  onAttempt,
}: {
  kind: PracticalTask["kind"];
  choices?: string[];
  disabled: boolean;
  onAttempt: (value: unknown) => void;
}) {
  if (choices && choices.length > 0) {
    return (
      <div className="mt-3 grid grid-cols-3 gap-2" role="group" aria-label="Answer choices">
        {choices.map((c) => (
          <button
            key={c}
            type="button"
            disabled={disabled}
            onClick={() => onAttempt(c)}
            className="rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-lg font-semibold hover:border-white/50 disabled:opacity-40"
          >
            {c}
          </button>
        ))}
      </div>
    );
  }
  if (kind === "compare-pitch") {
    return (
      <div className="mt-3 flex gap-2" role="group" aria-label="Which note is higher">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAttempt(1)}
          className="flex-1 rounded-xl border border-white/20 bg-white/5 px-4 py-3 font-semibold hover:border-white/50 disabled:opacity-40"
        >
          Note 1 is higher
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAttempt(2)}
          className="flex-1 rounded-xl border border-white/20 bg-white/5 px-4 py-3 font-semibold hover:border-white/50 disabled:opacity-40"
        >
          Note 2 is higher
        </button>
      </div>
    );
  }
  // self-attempt and future families: honest completion.
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onAttempt("done")}
      className="mt-3 w-full rounded-xl bg-indigo-500 px-4 py-3 font-semibold text-white disabled:opacity-40"
    >
      {disabled ? "Tried ✓" : "I've tried it"}
    </button>
  );
}
