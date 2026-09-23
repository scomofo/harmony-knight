/**
 * Grades: the optional progression layer (grades 0-10).
 *
 * Each grade trial measures practice on that grade's own topics only;
 * first attempts alone drive credit. Passing advances one grade; failing
 * keeps the grade with no penalty. Teaching content is never gated.
 */

import { useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CURRICULUM, MAX_GRADE, levelFor } from "../lib/game/curriculum.ts";
import {
  TOPIC_LABELS,
  advanceGrade,
  trialAccuracy,
  trialPlan,
  trialRequirement,
  type TrialQuestion,
} from "../lib/game/grades.ts";
import { buildTask } from "../lib/game/tasks.ts";
import type { TaskSpec } from "../lib/game/course.ts";
import { TaskPlayer } from "../components/game/TaskPlayer.tsx";
import { StrikeGame } from "../components/game/StrikeGame.tsx";
import { DuelGame } from "../components/game/DuelGame.tsx";
import { emitEffect } from "../lib/game/effects.ts";
import { useStore } from "../lib/game/store.ts";

const TRIAL_PASS_POINTS = 25;

export function GradesScreen() {
  const grade = useStore((s) => s.save.grade);
  const gradeWindows = useStore((s) => s.save.gradeWindows);
  const [trialing, setTrialing] = useState(false);
  const level = levelFor(grade);

  if (trialing && grade <= MAX_GRADE - 1) {
    return <GradeTrial grade={grade} onDone={() => setTrialing(false)} />;
  }

  const req = grade <= MAX_GRADE - 1 ? trialRequirement(grade) : null;
  const lastWindow = gradeWindows[String(grade)];

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="text-2xl font-bold">Grades</h1>
      <p className="mt-1 text-white/70">
        Optional trials of your practical skill — they unlock status and studies,
        never lessons. Fail with no penalty; every attempt teaches.
      </p>

      <div className="mt-4 rounded-xl border border-amber-300/30 bg-amber-400/5 p-4">
        <p className="text-xs uppercase tracking-wide text-amber-300/80">
          {level.phase} · Grade {level.level}
        </p>
        <h2 className="mt-1 text-xl font-bold">{level.title}</h2>
        <p className="text-sm text-white/60">{level.subtitle}</p>
        <p className="mt-2 text-sm italic text-white/50">“{level.narrativeTheme}”</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/80">
          {level.objectives.map((o) => (
            <li key={o}>{o}</li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap gap-1">
          {level.topics.map((t) => (
            <span key={t} className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/70">
              {TOPIC_LABELS[t]}
            </span>
          ))}
        </div>
        {req && (
          <p className="mt-3 text-sm text-white/70">
            Trial: <span className="font-semibold text-white">{req.questions} questions</span> on{" "}
            {level.topics.map((t) => TOPIC_LABELS[t]).join(", ")} at{" "}
            <span className="font-semibold text-white">≥{Math.round(req.accuracy * 100)}%</span>{" "}
            first-try accuracy.
          </p>
        )}
        {lastWindow && (
          <p className="mt-1 text-xs text-white/50">
            Last trial: {lastWindow.correct}/{lastWindow.attempts} correct.
          </p>
        )}
        {grade >= MAX_GRADE ? (
          <p className="mt-3 rounded-lg bg-emerald-500/15 p-3 text-sm text-emerald-200">
            🏆 Masterwork complete — grade 10, the terminal grade. The legacy is yours.
          </p>
        ) : (
          <button
            type="button"
            onClick={() => setTrialing(true)}
            className="mt-3 rounded-xl bg-amber-400 px-5 py-2 font-bold text-neutral-900"
          >
            Begin grade {grade} trial
          </button>
        )}
      </div>

      <h2 className="mt-6 text-lg font-semibold">The road</h2>
      <ol className="mt-2 space-y-1">
        {CURRICULUM.map((l) => {
          const w = gradeWindows[String(l.level)];
          const cleared =
            l.level < grade ||
            (w !== undefined &&
              l.level <= MAX_GRADE - 1 &&
              w.correct / Math.max(1, w.attempts) >= trialRequirement(l.level).accuracy &&
              w.attempts >= trialRequirement(l.level).questions);
          return (
            <li
              key={l.level}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm ${
                l.level === grade
                  ? "border-amber-300/40 bg-amber-400/5"
                  : "border-white/5 bg-white/[0.02]"
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  cleared ? "bg-emerald-500/30 text-emerald-200" : "bg-white/10 text-white/50"
                }`}
              >
                {cleared ? "✓" : l.level}
              </span>
              <span className={l.level === grade ? "font-semibold" : "text-white/70"}>
                Grade {l.level} — {l.title}
              </span>
              {l.level === grade && (
                <span className="ml-auto text-xs text-amber-300">current</span>
              )}
            </li>
          );
        })}
      </ol>

      <Link to="/games" className="mt-6 inline-block text-sm text-white/60 underline">
        ← Back to games
      </Link>
    </div>
  );
}

function GradeTrial({ grade, onDone }: { grade: number; onDone: () => void }) {
  const seedRef = useRef(Math.floor(Math.random() * 1_000_000_000));
  const [runId, setRunId] = useState(0);
  const recordTrialResult = useStore((s) => s.recordTrialResult);
  const addPoints = useStore((s) => s.addPoints);
  const plan = useMemo(() => trialPlan(grade, seedRef.current + runId), [grade, runId]);

  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<(boolean | undefined)[]>(
    Array(plan.length).fill(undefined),
  );
  const [answered, setAnswered] = useState(false);
  const [outcome, setOutcome] = useState<{ passed: boolean; grade: number } | null>(null);

  const record = (correct: boolean) => {
    setResults((prev) => {
      if (prev[index] !== undefined) return prev;
      const next = [...prev];
      next[index] = correct;
      return next;
    });
    setAnswered(true);
  };

  const next = () => {
    if (index + 1 >= plan.length) {
      const final = results.map((r) => r === true);
      const { passed, grade: nextGrade } = recordTrialResult(grade, final);
      if (passed) addPoints(TRIAL_PASS_POINTS);
      emitEffect({
        event: passed ? "mastery" : "needs-work",
        cancelKey: `trial-${grade}`,
      });
      setOutcome({ passed, grade: nextGrade });
    } else {
      setIndex((i) => i + 1);
      setAnswered(false);
    }
  };

  if (outcome) {
    const req = trialRequirement(grade);
    const acc = trialAccuracy(results.map((r) => r === true));
    return (
      <div className="mx-auto max-w-2xl p-4 text-center">
        <h1 className="text-2xl font-bold">
          {outcome.passed ? "🎉 Trial passed!" : "Not yet — and that's fine."}
        </h1>
        <p className="mt-2 text-white/70">
          {Math.round(acc * 100)}% first-try accuracy · needed {Math.round(req.accuracy * 100)}%
          {outcome.passed && (
            <> · grade {advanceGrade(grade, true)} unlocked · +{TRIAL_PASS_POINTS} points</>
          )}
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-1" aria-label="Question results">
          {results.map((r, i) => (
            <span
              key={i}
              className={`h-3 w-3 rounded-full ${r ? "bg-emerald-400" : "bg-white/20"}`}
            />
          ))}
        </div>
        <div className="mt-4 flex justify-center gap-2">
          {!outcome.passed && (
            <button
              type="button"
              onClick={() => {
                setRunId((n) => n + 1);
                setIndex(0);
                setResults(Array(plan.length).fill(undefined));
                setAnswered(false);
                setOutcome(null);
              }}
              className="rounded-xl bg-indigo-500 px-4 py-2 font-semibold"
            >
              Retry trial
            </button>
          )}
          <button
            type="button"
            onClick={onDone}
            className="rounded-xl border border-white/20 px-4 py-2"
          >
            Back to grades
          </button>
        </div>
      </div>
    );
  }

  const q: TrialQuestion = plan[index]!;
  const req = trialRequirement(grade);

  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Grade {grade} trial</h1>
        <p className="text-sm text-white/60">
          Question {index + 1} of {plan.length} · need ≥{Math.round(req.accuracy * 100)}%
        </p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10" aria-hidden>
        <div
          className="h-full bg-amber-400 transition-all"
          style={{ width: `${((index + (answered ? 1 : 0)) / plan.length) * 100}%` }}
        />
      </div>

      <div className="mt-4" key={`${runId}-${index}`}>
        {q.kind === "task" && (
          <TrialTask
            spec={q.spec}
            onFirstAttempt={(correct) => record(correct)}
          />
        )}
        {q.kind === "duel" && (
          <DuelGame
            seed={q.seed}
            grade={grade}
            rounds={4}
            compact
            onFinish={(r) => record(r.outcome !== "loss")}
          />
        )}
        {q.kind === "strike" && (
          <StrikeGame
            seed={q.seed}
            noteCount={12}
            compact
            onFinish={(s) => record(s.accuracy >= 0.7)}
          />
        )}
      </div>

      <div className="mt-3">
        <button
          type="button"
          onClick={next}
          disabled={!answered}
          className="rounded-xl bg-indigo-500 px-5 py-2 font-semibold disabled:opacity-40"
        >
          {index + 1 >= plan.length ? "Finish trial" : "Next question →"}
        </button>
        {!answered && (
          <p className="mt-1 text-xs text-white/40">
            Answer the question — only your first attempt counts toward the trial.
          </p>
        )}
      </div>
    </div>
  );
}

/** A single trial task question: first attempt is recorded, corrections finish the phrase. */
function TrialTask({
  spec,
  onFirstAttempt,
}: {
  spec: TaskSpec;
  onFirstAttempt: (correct: boolean) => void;
}) {
  const task = useMemo(() => buildTask("trial", spec), [spec]);
  const recorded = useRef(false);
  return (
    <TaskPlayer
      task={task}
      onResult={(r) => {
        if (!recorded.current) {
          recorded.current = true;
          onFirstAttempt(r.firstTry);
        }
      }}
    />
  );
}
