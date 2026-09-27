import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useStore } from "../../lib/game/store.ts";
import { TeachingPlayer } from "./TeachingPlayer.tsx";
import { CHAPTERS } from "../../lib/game/course.ts";
import {
  DIAGNOSTIC_QUESTIONS,
  buildPlacement,
  recommendStartChapter,
  recommendationBlurb,
} from "../../lib/game/placement.ts";
import type {
  AgeBand,
  ExperienceLevel,
  Instrument,
  LearnerGoal,
  PlacementAnswer,
  PlayerProfile,
} from "../../lib/game/schema.ts";

type Step = "about" | "experience" | "goals" | "diagnostic" | "result";

const AGE_BANDS: { id: AgeBand; label: string; emoji: string }[] = [
  { id: "under-7", label: "6 and under", emoji: "🐣" },
  { id: "7-9", label: "7 to 9", emoji: "🌱" },
  { id: "10-12", label: "10 to 12", emoji: "🌿" },
  { id: "13-plus", label: "13 or older", emoji: "🌳" },
];

const EXPERIENCES: { id: ExperienceLevel; label: string; sub: string; emoji: string }[] = [
  { id: "brand-new", label: "Brand new", sub: "I've never really played music", emoji: "✨" },
  { id: "a-little", label: "A little", sub: "I've tried an instrument or sang a bit", emoji: "🎶" },
  { id: "played-before", label: "Played before", sub: "I can already play something", emoji: "🎼" },
];

const GOALS: { id: LearnerGoal; label: string; emoji: string }[] = [
  { id: "play-songs", label: "Play my favorite songs", emoji: "🎵" },
  { id: "understand-music", label: "Understand how music works", emoji: "🧠" },
  { id: "make-music", label: "Make my own music", emoji: "🎨" },
  { id: "just-exploring", label: "Just exploring", emoji: "🗺️" },
];

const INSTRUMENTS: { id: Instrument; label: string; emoji: string }[] = [
  { id: "piano", label: "Piano", emoji: "🎹" },
  { id: "guitar", label: "Guitar", emoji: "🎸" },
  { id: "voice", label: "Voice", emoji: "🎤" },
  { id: "violin", label: "Violin", emoji: "🎻" },
  { id: "ukulele", label: "Ukulele", emoji: "🎸" },
  { id: "other", label: "Something else", emoji: "🥁" },
  { id: "none-yet", label: "Not yet", emoji: "💫" },
];

const STEP_ORDER: Step[] = ["about", "experience", "goals", "diagnostic", "result"];
const STEP_LABELS: Record<Step, string> = {
  about: "Who's playing?",
  experience: "Your music so far",
  goals: "What do you want to do?",
  diagnostic: "A quick check-in",
  result: "Your starting point",
};

/**
 * First-session flow: who the player is (3 short screens), a quick
 * 8-question placement check, then a recommended starting chapter with an
 * override. Skippable at every step — skipping keeps the default profile
 * and starts at the beginning.
 */
export function OnboardingFlow() {
  const navigate = useNavigate();
  const update = useStore((s) => s.update);
  const alreadyOnboarded = useStore((s) => s.save.onboarded);
  const existing = useStore((s) => s.save.profile);

  const [step, setStep] = useState<Step>("about");
  const [name, setName] = useState(existing.name);
  const [ageBand, setAgeBand] = useState<AgeBand | null>(existing.completedAt ? existing.ageBand : null);
  const [experience, setExperience] = useState<ExperienceLevel | null>(
    existing.completedAt ? existing.experience : null,
  );
  const [goal, setGoal] = useState<LearnerGoal | null>(existing.completedAt ? existing.goal : null);
  const [instrument, setInstrument] = useState<Instrument | null>(
    existing.completedAt ? existing.instrument : null,
  );
  const [answers, setAnswers] = useState<PlacementAnswer[]>([]);
  const [diagnosticTaken, setDiagnosticTaken] = useState(false);
  const [overrideChapter, setOverrideChapter] = useState<number | null>(null);

  const stepIndex = STEP_ORDER.indexOf(step);

  const saveProfile = (patch: Partial<PlayerProfile>) => {
    update((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
  };

  const finish = (profile: Partial<PlayerProfile>, startLessonId: string) => {
    saveProfile({ ...profile, completedAt: Date.now() });
    update((s) => ({ ...s, onboarded: true }));
    navigate(
      startLessonId === "/"
        ? { to: "/" }
        : { to: "/lesson/$lessonId", params: { lessonId: startLessonId } },
    );
  };

  /** Skipping keeps whatever answers exist; the profile stays unclaimed. */
  const skipAll = () => {
    if (!alreadyOnboarded) update((s) => ({ ...s, onboarded: true }));
    navigate({ to: "/" });
  };

  const firstLessonOf = (chapter: number): string =>
    CHAPTERS[chapter - 1]?.lessons[0]?.id ?? "ch1-l1-pitch";

  const chip = <T extends string>(
    id: T,
    selected: T | null,
    onSelect: (v: T) => void,
    label: string,
    emoji?: string,
    sub?: string,
  ) => (
    <button
      key={id}
      type="button"
      aria-pressed={selected === id}
      onClick={() => onSelect(id)}
      className={`w-full rounded-2xl border p-4 text-left transition-colors ${
        selected === id
          ? "border-indigo-400/70 bg-indigo-500/20"
          : "border-white/15 bg-white/5 hover:border-white/40"
      }`}
    >
      <span className="flex items-center gap-3">
        {emoji && (
          <span className="text-2xl" aria-hidden>
            {emoji}
          </span>
        )}
        <span>
          <span className="block font-semibold">{label}</span>
          {sub && <span className="block text-sm text-white/60">{sub}</span>}
        </span>
      </span>
    </button>
  );

  const canContinue =
    (step === "about" && ageBand !== null) ||
    (step === "experience" && experience !== null) ||
    (step === "goals" && goal !== null && instrument !== null) ||
    step === "diagnostic" ||
    step === "result";

  const next = () => {
    if (step === "about") saveProfile({ name: name.trim().slice(0, 40), ageBand: ageBand ?? "7-9" });
    if (step === "experience") saveProfile({ experience: experience ?? "a-little" });
    if (step === "goals") saveProfile({ goal: goal ?? "just-exploring", instrument: instrument ?? "none-yet" });
    setStep(STEP_ORDER[stepIndex + 1]!);
  };

  // Diagnostic completion -> store placement, move to result.
  const completeDiagnostic = (finalAnswers: PlacementAnswer[]) => {
    const exp: ExperienceLevel = experience ?? "a-little";
    const placement = buildPlacement(exp, finalAnswers);
    saveProfile({ placement });
    setAnswers(finalAnswers);
    setDiagnosticTaken(true);
    setStep("result");
  };

  const rec =
    diagnosticTaken && (experience ?? "a-little")
      ? recommendStartChapter(experience ?? "a-little", answers)
      : null;
  const startChapter = overrideChapter ?? rec?.chapter ?? 1;
  const startChapterMeta = CHAPTERS[startChapter - 1];

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-xl flex-col justify-center p-6">
      <ol className="mb-6 flex gap-2" aria-label="Onboarding progress">
        {STEP_ORDER.map((s, i) => (
          <li
            key={s}
            aria-current={s === step ? "step" : undefined}
            className={`h-2 flex-1 rounded-full ${i <= stepIndex ? "bg-indigo-400" : "bg-white/15"}`}
          />
        ))}
      </ol>

      <div aria-live="polite">
        {step === "about" && (
          <section aria-labelledby="ob-about">
            <h1 id="ob-about" className="text-3xl font-bold">
              {STEP_LABELS.about}
            </h1>
            <p className="mt-2 text-white/70">Tell us who the knight is — just enough to tune the quest.</p>
            <label htmlFor="ob-name" className="mt-6 block text-sm font-semibold text-white/80">
              What should we call you? <span className="font-normal text-white/50">(optional)</span>
            </label>
            <input
              id="ob-name"
              type="text"
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
              placeholder="Knight of Harmony"
              autoComplete="nickname"
              className="mt-2 w-full rounded-xl border border-white/20 bg-black/40 px-4 py-3 text-lg"
            />
            <fieldset className="mt-6">
              <legend className="text-sm font-semibold text-white/80">How old are you?</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {AGE_BANDS.map((a) => chip(a.id, ageBand, setAgeBand, a.label, a.emoji))}
              </div>
            </fieldset>
          </section>
        )}

        {step === "experience" && (
          <section aria-labelledby="ob-exp">
            <h1 id="ob-exp" className="text-3xl font-bold">
              {STEP_LABELS.experience}
            </h1>
            <p className="mt-2 text-white/70">No wrong answers — this just tunes where we begin.</p>
            <div className="mt-6 space-y-2" role="group" aria-label="Experience level">
              {EXPERIENCES.map((e) => chip(e.id, experience, setExperience, e.label, e.emoji, e.sub))}
            </div>
          </section>
        )}

        {step === "goals" && (
          <section aria-labelledby="ob-goals">
            <h1 id="ob-goals" className="text-3xl font-bold">
              {STEP_LABELS.goals}
            </h1>
            <fieldset className="mt-6">
              <legend className="text-sm font-semibold text-white/80">What do you want to do with music?</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {GOALS.map((g) => chip(g.id, goal, setGoal, g.label, g.emoji))}
              </div>
            </fieldset>
            <fieldset className="mt-6">
              <legend className="text-sm font-semibold text-white/80">Do you play an instrument?</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {INSTRUMENTS.map((ins) => chip(ins.id, instrument, setInstrument, ins.label, ins.emoji))}
              </div>
            </fieldset>
          </section>
        )}

        {step === "diagnostic" && (
          <DiagnosticRunner
            onDone={completeDiagnostic}
            onSkip={() => {
              setDiagnosticTaken(false);
              setStep("result");
            }}
          />
        )}

        {step === "result" && (
          <section aria-labelledby="ob-result">
            <h1 id="ob-result" className="text-3xl font-bold">
              {STEP_LABELS.result}
            </h1>
            {rec ? (
              <div className="mt-4 rounded-2xl border border-indigo-400/40 bg-indigo-500/15 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-300">
                  Recommended start
                </p>
                <p className="mt-1 text-xl font-bold">
                  Chapter {rec.chapter} · {CHAPTERS[rec.chapter - 1]?.title}
                </p>
                <p className="mt-2 text-sm text-white/70">{recommendationBlurb(rec)}</p>
                <p className="mt-1 text-sm text-white/50">
                  You got {rec.totalCorrect} of {rec.totalQuestions} check-in questions right.
                </p>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="font-semibold">Starting at the beginning</p>
                <p className="mt-1 text-sm text-white/60">
                  You skipped the check-in — Chapter 1 is a great place to start.
                </p>
              </div>
            )}
            <label htmlFor="ob-chapter" className="mt-6 block text-sm font-semibold text-white/80">
              Or pick a different chapter:
            </label>
            <select
              id="ob-chapter"
              value={overrideChapter ?? rec?.chapter ?? 1}
              onChange={(e) => setOverrideChapter(Number(e.target.value))}
              className="mt-2 w-full rounded-xl border border-white/20 bg-black/40 px-4 py-3"
            >
              {CHAPTERS.map((c) => (
                <option key={c.id} value={c.index + 1}>
                  Chapter {c.index + 1} · {c.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => finish({}, firstLessonOf(startChapter))}
              className="mt-6 w-full rounded-xl bg-indigo-500 px-6 py-4 text-lg font-bold text-white"
            >
              Begin Chapter {startChapter}
              {startChapterMeta ? ` · ${startChapterMeta.title}` : ""}
            </button>
          </section>
        )}
      </div>

      {step !== "diagnostic" && step !== "result" && (
        <div className="mt-8 flex items-center justify-between">
          <button type="button" onClick={skipAll} className="text-sm text-white/50 underline">
            Skip for now
          </button>
          <button
            type="button"
            onClick={next}
            disabled={!canContinue}
            className="rounded-xl bg-indigo-500 px-6 py-3 font-bold text-white disabled:opacity-40"
          >
            Continue →
          </button>
        </div>
      )}
      {step === "result" && alreadyOnboarded && (
        <Link to="/" className="mt-4 block text-center text-sm text-white/50 underline">
          ← Back home without changing my start
        </Link>
      )}
    </div>
  );
}

function DiagnosticRunner({
  onDone,
  onSkip,
}: {
  onDone: (answers: PlacementAnswer[]) => void;
  onSkip: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<PlacementAnswer[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const q = DIAGNOSTIC_QUESTIONS[index]!;

  const answer = (choice: number) => {
    if (picked !== null) return;
    setPicked(choice);
    const correct = choice === q.answerIndex;
    const nextAnswers = [...answers, { questionId: q.id, correct }];
    setAnswers(nextAnswers);
    window.setTimeout(() => {
      if (index + 1 < DIAGNOSTIC_QUESTIONS.length) {
        setIndex(index + 1);
        setPicked(null);
      } else {
        onDone(nextAnswers);
      }
    }, 1400);
  };

  return (
    <section aria-labelledby="ob-diag" aria-live="polite">
      <h1 id="ob-diag" className="text-3xl font-bold">
        {STEP_LABELS.diagnostic}
      </h1>
      <p className="mt-2 text-white/70">
        {DIAGNOSTIC_QUESTIONS.length} quick questions — no score is kept, this only picks your
        starting chapter.
      </p>
      <p className="mt-4 text-sm text-white/50" aria-live="polite">
        Question {index + 1} of {DIAGNOSTIC_QUESTIONS.length}
      </p>
      <div key={q.id} className="mt-2 rounded-2xl border border-white/10 bg-white/5 p-5">
        <p className="text-lg font-semibold">{q.question}</p>
        {q.audio && (
          <div className="mt-3">
            <TeachingPlayer
              midis={q.audio.midis}
              caption={q.audio.caption}
              lane={`diagnostic-${q.id}`}
              noteDuration={0.5}
              durations={q.audio.durations}
            />
          </div>
        )}
        <div className="mt-4 space-y-2">
          {q.choices.map((c, i) => {
            const isAnswer = i === q.answerIndex;
            const isPicked = picked === i;
            return (
              <button
                key={i}
                type="button"
                disabled={picked !== null}
                onClick={() => answer(i)}
                className={`w-full rounded-xl border px-4 py-3 text-left ${
                  picked !== null && isAnswer
                    ? "border-emerald-400/60 bg-emerald-500/15"
                    : picked !== null && isPicked
                      ? "border-red-400/60 bg-red-500/10"
                      : "border-white/15 bg-white/5 hover:border-white/40"
                } disabled:opacity-90`}
              >
                {c}
              </button>
            );
          })}
        </div>
        {picked !== null && (
          <p role="status" className="mt-3 rounded-lg bg-white/5 p-3 text-sm text-white/85">
            {picked === q.answerIndex ? "Nice! " : "Good try — "}
            {q.explanation}
          </p>
        )}
      </div>
      <button type="button" onClick={onSkip} className="mt-4 text-sm text-white/50 underline">
        Skip the check-in — start at the beginning
      </button>
    </section>
  );
}
