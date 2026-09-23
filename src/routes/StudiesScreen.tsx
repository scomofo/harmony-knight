/**
 * Studies: focused topic drills that reuse the practical task families.
 *
 * Which studies exist and when they unlock derives from curriculum
 * metadata (studiesFor / unlocks in curriculum.ts), not duplicated route
 * logic: each study declares the AppRoute that unlocks it.
 */

import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  isStudyUnlocked,
  studiesFor,
  CURRICULUM,
  type AppRoute,
} from "../lib/game/curriculum.ts";
import { buildTask } from "../lib/game/tasks.ts";
import type { TaskSpec } from "../lib/game/course.ts";
import { mulberry32 } from "../lib/game/tasks.ts";
import { TaskPlayer } from "../components/game/TaskPlayer.tsx";
import { emitEffect } from "../lib/game/effects.ts";
import { useStore } from "../lib/game/store.ts";

export type StudyDef = {
  id: string;
  title: string;
  blurb: string;
  /** The curriculum route whose unlock opens this study. */
  route: AppRoute;
  specs: TaskSpec[];
};

export const STUDIES: StudyDef[] = [
  {
    id: "listening",
    title: "Listening",
    blurb: "High vs. low, loud vs. soft — the sensory entry point.",
    route: "/sensory",
    specs: [{ kind: "compare-pitch", seed: 0 }],
  },
  {
    id: "rhythm",
    title: "Rhythm",
    blurb: "Echo rhythms and count the meter.",
    route: "/rhythm",
    specs: [
      { kind: "rhythm-echo", seed: 0 },
      { kind: "meter-id", seed: 0 },
    ],
  },
  {
    id: "scales",
    title: "Scales",
    blurb: "Major, minor, and the bittersweet Dorian.",
    route: "/scale",
    specs: [
      { kind: "scale-id", seed: 0 },
      { kind: "scale-id", seed: 0, variant: "modes" },
    ],
  },
  {
    id: "keys",
    title: "Keys & the Circle",
    blurb: "Track the tonal home as phrases change key.",
    route: "/circle",
    specs: [
      { kind: "modulation-id", seed: 0, variant: "detect" },
      { kind: "modulation-id", seed: 0, variant: "where" },
    ],
  },
  {
    id: "intervals",
    title: "Intervals",
    blurb: "Name the distance between two notes.",
    route: "/interval",
    specs: [{ kind: "interval-id", seed: 0 }],
  },
  {
    id: "triads",
    title: "Triads",
    blurb: "Qualities and positions, bottom to top.",
    route: "/triad",
    specs: [
      { kind: "chord-id", seed: 0, variant: "quality" },
      { kind: "chord-id", seed: 0, variant: "position" },
    ],
  },
  {
    id: "cadences",
    title: "Cadences",
    blurb: "Punctuation: closed, open, and deceptive endings.",
    route: "/cadence",
    specs: [
      { kind: "cadence-id", seed: 0, variant: "final" },
      { kind: "cadence-id", seed: 0, variant: "open" },
    ],
  },
];

/** The grade whose curriculum unlocks this study route. */
export function studyRequiredGrade(route: AppRoute): number {
  const level = CURRICULUM.find((l) => l.unlocks.some((u) => u.to === route));
  return level ? level.level : 0;
}

export function studyById(id: string): StudyDef | undefined {
  return STUDIES.find((s) => s.id === id);
}

/** Studies unlocked at the given grade, with their unlocking grade. */
export function unlockedStudies(grade: number): { study: StudyDef; atGrade: number }[] {
  return studiesFor(grade)
    .map((u) => {
      const study = STUDIES.find((s) => s.route === u.to);
      return study ? { study, atGrade: u.level } : null;
    })
    .filter((x): x is { study: StudyDef; atGrade: number } => x !== null)
    .filter(
      (x, i, arr) => arr.findIndex((y) => y.study.id === x.study.id) === i,
    );
}

const DRILL_ROUNDS = 8;

export function StudiesHubScreen() {
  const grade = useStore((s) => s.save.grade);
  const unlocked = unlockedStudies(grade);
  const unlockedIds = new Set(unlocked.map((u) => u.study.id));

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="text-2xl font-bold">Studies</h1>
      <p className="mt-1 text-white/70">
        Focused drills on each topic. New studies unlock as your grade rises —
        practice here is for skill, not for grade credit.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {STUDIES.map((study) => {
          const open = unlockedIds.has(study.id) || isStudyUnlocked(study.route, grade);
          const need = studyRequiredGrade(study.route);
          const card = (
            <div
              className={`rounded-xl border p-4 ${
                open
                  ? "border-white/15 bg-white/5 hover:border-amber-300/50"
                  : "border-white/5 bg-white/[0.02] opacity-60"
              }`}
            >
              <h2 className="font-semibold">{study.title}</h2>
              <p className="mt-1 text-sm text-white/60">{study.blurb}</p>
              <p className="mt-2 text-xs text-white/40">
                {open ? "Open for practice" : `Unlocks at grade ${need}`}
              </p>
            </div>
          );
          return open ? (
            <Link key={study.id} to="/studies/$studyId" params={{ studyId: study.id }}>
              {card}
            </Link>
          ) : (
            <div key={study.id}>{card}</div>
          );
        })}
      </div>
      <Link to="/games" className="mt-6 inline-block text-sm text-white/60 underline">
        ← Back to games
      </Link>
    </div>
  );
}

function seedFor(studyId: string, drillNo: number, round: number): number {
  let h = 0;
  for (const ch of studyId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (h + drillNo * 100003 + round * 1009) >>> 0;
}

export function StudyDrillScreen() {
  const { studyId } = useParams({ strict: false }) as { studyId: string };
  const navigate = useNavigate();
  const addPoints = useStore((s) => s.addPoints);
  const study = studyById(studyId);
  const [drillNo, setDrillNo] = useState(0);
  const [round, setRound] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [firstTryCount, setFirstTryCount] = useState(0);
  const [done, setDone] = useState(false);

  const specs = useMemo(() => {
    if (!study) return [];
    const rand = mulberry32(seedFor(study.id, drillNo, 0));
    return Array.from({ length: DRILL_ROUNDS }, (_, i) => {
      const base = study.specs[Math.floor(rand() * study.specs.length)]!;
      return { ...base, seed: seedFor(study.id, drillNo, i + 1) };
    });
  }, [study, drillNo]);

  if (!study) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <p>Unknown study.</p>
        <Link to="/studies" className="text-sm text-white/60 underline">
          ← Back to studies
        </Link>
      </div>
    );
  }

  const spec = specs[round]!;
  const task = useMemo(
    () => buildTask(`study:${study.id}`, spec),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [study.id, drillNo, round],
  );

  const onResult = (r: { correct: boolean; firstTry: boolean }) => {
    if (!answered && r.correct) {
      setAnswered(true);
      if (r.firstTry) {
        setFirstTryCount((n) => n + 1);
        addPoints(2);
        emitEffect({ event: "correct", cancelKey: `study-${study.id}-${round}` });
      }
    }
  };

  const next = () => {
    if (round + 1 >= DRILL_ROUNDS) {
      setDone(true);
      emitEffect({ event: "phrase-win", cancelKey: `study-${study.id}-done` });
    } else {
      setRound((r) => r + 1);
      setAnswered(false);
    }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-2xl p-4 text-center">
        <h1 className="text-2xl font-bold">{study.title} drill complete</h1>
        <p className="mt-2 text-white/70">
          {firstTryCount} of {DRILL_ROUNDS} correct on the first try.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              setDrillNo((n) => n + 1);
              setRound(0);
              setAnswered(false);
              setFirstTryCount(0);
              setDone(false);
            }}
            className="rounded-xl bg-indigo-500 px-4 py-2 font-semibold"
          >
            Drill again
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: "/studies" })}
            className="rounded-xl border border-white/20 px-4 py-2"
          >
            All studies
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{study.title} drill</h1>
        <p className="text-sm text-white/60">
          Round {round + 1} of {DRILL_ROUNDS} · {firstTryCount} first-try
        </p>
      </div>
      <div className="mt-3" key={`${drillNo}-${round}`}>
        <TaskPlayer task={task} onResult={onResult} />
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={next}
          disabled={!answered}
          className="rounded-xl bg-indigo-500 px-4 py-2 font-semibold disabled:opacity-40"
        >
          {round + 1 >= DRILL_ROUNDS ? "Finish" : "Next round →"}
        </button>
        <button
          type="button"
          onClick={next}
          className="rounded-xl border border-white/20 px-4 py-2 text-white/70"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
