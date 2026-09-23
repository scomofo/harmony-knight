import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  authoredLessons,
  chapterById,
  lessonBody,
  lessonMeta,
  type LearnBlock,
} from "../lib/game/course.ts";
import { canTransition, dueConcepts, scheduleRecall } from "../lib/game/learning.ts";
import { stopAll } from "../lib/game/audio.ts";
import { DuetPlayer } from "../components/game/DuetPlayer.tsx";
import { cancelEffects, emitEffect } from "../lib/game/effects.ts";
import { useStore } from "../lib/game/store.ts";
import type { LessonStep } from "../lib/game/schema.ts";
import { TeachingPlayer } from "../components/game/TeachingPlayer.tsx";
import { TaskPlayer } from "../components/game/TaskPlayer.tsx";
import { LessonVisualView } from "../components/game/LessonVisual.tsx";
import { buildTask } from "../lib/game/tasks.ts";

function LearnBlockView({ block, index }: { block: LearnBlock; index: number }) {
  if (block.kind === "text") return <p className="leading-relaxed text-white/90">{block.body}</p>;
  if (block.kind === "visual")
    return (
      <figure>
        <LessonVisualView visual={block.visual} />
        <figcaption className="mt-1 text-sm text-white/60">{block.caption}</figcaption>
      </figure>
    );
  if (block.kind === "duet")
    return (
      <DuetPlayer
        voices={block.voices.map((v) => ({ label: v.label, notes: v.midis, durations: v.durations }))}
        caption={block.caption}
        lane={`learn-duet-${index}`}
      />
    );
  return (
    <TeachingPlayer
      midis={block.midis}
      caption={block.caption}
      lane={`learn-${index}`}
      noteDuration={block.noteDuration ?? 0.5}
      durations={block.durations}
    />
  );
}

export function LessonScreen({ lessonId }: { lessonId: string }) {
  const body = lessonBody(lessonId);
  const save = useStore((s) => s.save);
  const openLesson = useStore((s) => s.openLesson);
  const setLessonStep = useStore((s) => s.setLessonStep);
  const answerCheck = useStore((s) => s.answerCheck);
  const finishLesson = useStore((s) => s.finishLesson);
  const recordConcept = useStore((s) => s.recordConcept);
  const touchLearningDay = useStore((s) => s.touchLearningDay);

  const [picked, setPicked] = useState<Record<string, number>>({});
  const [hintShown, setHintShown] = useState<Record<string, boolean>>({});
  const [earned, setEarned] = useState<number | null>(null);

  useEffect(() => {
    openLesson(lessonId);
    touchLearningDay();
    return () => {
      stopAll(); // navigation cancels audio + highlights
      cancelEffects();
    };
  }, [lessonId]);

  const progress = save.lessons[lessonId];
  const step: LessonStep = progress?.step ?? "learn";

  const nextLesson = useMemo(() => {
    const all = authoredLessons();
    const i = all.findIndex((l) => l.id === lessonId);
    return i >= 0 ? all[i + 1] : undefined;
  }, [lessonId]);

  if (!body) {
    const meta = lessonMeta(lessonId);
    return (
      <div className="mx-auto max-w-2xl p-6">
        <h1 className="text-2xl font-bold">{meta ? `${meta.chapter.title} · ${meta.chapter.lessons[meta.index]!.title}` : "Lesson"}</h1>
        <p className="mt-4 text-white/70">
          This lesson is being authored. Teaching is never locked behind unfinished content — explore
          Chapter 1 in the meantime.
        </p>
        <Link to="/path" className="mt-6 inline-block rounded-lg bg-indigo-500 px-4 py-2 font-semibold">
          Back to the learning path
        </Link>
      </div>
    );
  }

  const go = (to: LessonStep) => {
    if (canTransition(step, to)) setLessonStep(lessonId, to);
  };

  const answer = (checkId: string, choiceIndex: number) => {
    const check = body.checks.find((c) => c.id === checkId)!;
    if (picked[checkId] !== undefined) return; // one recorded answer per check per visit
    const correct = choiceIndex === check.answerIndex;
    const assisted = !!hintShown[checkId];
    setPicked((p) => ({ ...p, [checkId]: choiceIndex }));
    answerCheck(lessonId, checkId, correct, assisted);
    emitEffect({ event: correct && !assisted ? "correct" : correct ? "assisted" : "needs-work", cancelKey: checkId });
  };

  const showHint = (checkId: string) => {
    setHintShown((h) => ({ ...h, [checkId]: true }));
    emitEffect({ event: "assisted", cancelKey: checkId });
  };

  const bothAnswered = body.checks.every((c) => picked[c.id] !== undefined);

  const finish = () => {
    // Schedule recall per concept from the recorded first-check outcomes.
    for (const check of body.checks) {
      const recorded = progress?.checks.find((c) => c.checkId === check.id);
      const result = !recorded
        ? "wrong"
        : recorded.assisted
          ? "assisted"
          : recorded.correctFirstTry
            ? "correct"
            : "wrong";
      const prev = save.concepts[check.conceptId] ?? null;
      recordConcept(scheduleRecall(prev, check.conceptId, result));
    }
    const points = finishLesson(lessonId);
    setEarned(points);
    emitEffect({ event: "mastery", cancelKey: "lesson" });
    go("done");
  };

  const chapter = chapterById(body.chapterId);
  const task = useMemo(
    () => (body.tryTask ? buildTask(body.id, body.tryTask) : null),
    [body],
  );

  return (
    <div className="mx-auto max-w-2xl p-4 pb-16 sm:p-6">
      <nav className="text-sm text-white/50">
        <Link to="/path" className="underline">Learning path</Link>
        {" / "}{chapter?.title}
      </nav>
      <h1 className="mt-2 text-2xl font-bold">{body.title}</h1>
      <StepTabs step={step} />

      {step === "learn" && (
        <div className="mt-6 space-y-5">
          {body.learn.map((b, i) => (
            <LearnBlockView key={i} block={b} index={i} />
          ))}
          <button
            type="button"
            onClick={() => go("try")}
            className="w-full rounded-xl bg-indigo-500 px-4 py-3 font-semibold text-white"
          >
            Continue to Try it
          </button>
        </div>
      )}

      {step === "try" && (
        <div className="mt-6 space-y-5">
          {task ? (
            <TaskPlayer lessonId={lessonId} task={task} />
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h2 className="font-semibold">Try it yourself</h2>
              <p className="mt-2 text-white/80">
                Say it back in your own words — or sing, tap, or play the idea from this lesson. There is no wrong attempt here; trying is the step.
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => go("learn")}
              className="rounded-xl border border-white/20 px-4 py-3 text-white/80"
            >
              Review the lesson
            </button>
            <button
              type="button"
              onClick={() => go("recall")}
              className="flex-1 rounded-xl bg-indigo-500 px-4 py-3 font-semibold text-white"
            >
              I've tried it — check my recall
            </button>
          </div>
        </div>
      )}

      {step === "recall" && (
        <div className="mt-6 space-y-6">
          {body.checks.map((check, ci) => {
            const choice = picked[check.id];
            const answered = choice !== undefined;
            return (
              <fieldset key={check.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <legend className="sr-only">Recall check {ci + 1}</legend>
                <p className="font-semibold">{check.question}</p>
                {check.audio && (
                  <div className="mt-3">
                    <TeachingPlayer midis={check.audio.midis} caption="Listen again — take your time." lane={check.id} noteDuration={0.6} durations={check.audio.durations} />
                  </div>
                )}
                <div className="mt-3 space-y-2" role="radiogroup" aria-label={check.question}>
                  {check.choices.map((c, i) => {
                    const isAnswer = i === check.answerIndex;
                    const isPicked = choice === i;
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={answered}
                        onClick={() => answer(check.id, i)}
                        className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                          answered && isAnswer
                            ? "border-emerald-400 bg-emerald-500/20"
                            : answered && isPicked
                              ? "border-red-400 bg-red-500/15"
                              : "border-white/15 bg-white/5 hover:border-white/40"
                        } ${answered ? "cursor-default" : ""}`}
                      >
                        {c}
                        {answered && isAnswer && <span className="ml-2 text-emerald-300">✓</span>}
                      </button>
                    );
                  })}
                </div>
                {!answered && !hintShown[check.id] && (
                  <button
                    type="button"
                    onClick={() => showHint(check.id)}
                    className="mt-2 text-sm text-white/60 underline"
                  >
                    Need a hint? (marks this attempt assisted)
                  </button>
                )}
                {hintShown[check.id] && !answered && (
                  <p className="mt-2 rounded-lg bg-amber-500/10 p-2 text-sm text-amber-200">{check.hint}</p>
                )}
                {answered && (
                  <p className="mt-3 rounded-lg bg-white/5 p-3 text-sm text-white/85">
                    <span className="font-semibold">Why: </span>
                    {check.explanation}
                  </p>
                )}
              </fieldset>
            );
          })}
          <button
            type="button"
            disabled={!bothAnswered}
            onClick={finish}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white disabled:opacity-40"
          >
            {bothAnswered ? "Finish lesson" : "Answer both checks to finish"}
          </button>
        </div>
      )}

      {step === "done" && (
        <div className="mt-6 space-y-4 text-center">
          <div className="text-5xl" aria-hidden>🎼</div>
          <h2 className="text-xl font-bold">Lesson complete</h2>
          {earned !== null && earned > 0 && (
            <p className="text-amber-300">+{earned} harmony points — first completion.</p>
          )}
          {earned === 0 && (
            <p className="text-white/60">Revisits don't award points again — the knowledge is the reward.</p>
          )}
          <DueRecall />
          <div className="flex flex-col gap-2">
            {nextLesson && (
              <Link
                to="/lesson/$lessonId"
                params={{ lessonId: nextLesson.id }}
                className="rounded-xl bg-indigo-500 px-4 py-3 font-semibold text-white"
              >
                Next: {nextLesson.title}
              </Link>
            )}
            <Link to="/path" className="rounded-xl border border-white/20 px-4 py-3 text-white/80">
              Back to the learning path
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function StepTabs({ step }: { step: LessonStep }) {
  const steps: { id: LessonStep; label: string }[] = [
    { id: "learn", label: "Learn" },
    { id: "try", label: "Try it" },
    { id: "recall", label: "Recall" },
    { id: "done", label: "Done" },
  ];
  const order = steps.map((s) => s.id);
  return (
    <ol className="mt-4 flex gap-1" aria-label="Lesson progress">
      {steps.map((s) => {
        const reached = order.indexOf(s.id) <= order.indexOf(step);
        return (
          <li
            key={s.id}
            aria-current={s.id === step ? "step" : undefined}
            className={`flex-1 rounded-lg px-2 py-1.5 text-center text-xs font-semibold ${
              s.id === step ? "bg-indigo-500 text-white" : reached ? "bg-white/15 text-white/80" : "bg-white/5 text-white/40"
            }`}
          >
            {s.label}
          </li>
        );
      })}
    </ol>
  );
}

export function DueRecall() {
  const concepts = useStore((s) => s.save.concepts);
  const due = dueConcepts(concepts);
  if (due.length === 0) return null;
  return (
    <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-left">
      <h3 className="font-semibold text-amber-200">Due for recall</h3>
      <ul className="mt-1 list-disc pl-5 text-sm text-white/80">
        {due.map((d) => (
          <li key={d.conceptId}>{d.conceptId}</li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-white/60">Revisit the lesson to refresh — spacing grows to 30 days.</p>
    </div>
  );
}
