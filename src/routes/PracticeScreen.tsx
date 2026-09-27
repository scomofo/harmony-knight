import { useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { PracticeKeyboard } from "../components/game/PracticeKeyboard.tsx";
import { TaskPlayer } from "../components/game/TaskPlayer.tsx";
import { TeachingPlayer } from "../components/game/TeachingPlayer.tsx";
import { emitEffect } from "../lib/game/effects.ts";
import { playTone } from "../lib/game/audio.ts";
import { authoredLessons, type TaskSpec } from "../lib/game/course.ts";
import { dueConcepts, scheduleRecall } from "../lib/game/learning.ts";
import { nameToMidi } from "../lib/game/music.ts";
import { intervalMissCopy } from "../lib/game/feedback.ts";
import { notesNeedingWork, recentAccuracy } from "../lib/game/sr.ts";
import {
  buildTargetedTask,
  confusionDue,
  confusionKey,
  difficultyFor,
} from "../lib/game/adapt.ts";
import type { NoteEvidence } from "../lib/game/schema.ts";
import { useStore } from "../lib/game/store.ts";
import { buildTask } from "../lib/game/tasks.ts";

type Mode = "home" | "notes" | "concepts" | "tasks" | "mixups";

export function PracticeScreen() {
  const [mode, setMode] = useState<Mode>("home");
  return (
    <div className="mx-auto max-w-2xl p-4 pb-16 sm:p-6">
      {mode !== "home" && (
        <button type="button" onClick={() => setMode("home")} className="mb-4 text-sm text-white/60 underline">
          ← Practice home
        </button>
      )}
      {mode === "home" && <PracticeHome onPick={setMode} />}
      {mode === "notes" && <NoteDrill />}
      {mode === "concepts" && <ConceptDrill />}
      {mode === "tasks" && <TaskReviewList />}
      {mode === "mixups" && <ConfusionDrill />}
    </div>
  );
}

function PracticeHome({ onPick }: { onPick: (m: Mode) => void }) {
  const save = useStore((s) => s.save);
  const now = Date.now();
  const needyNotes = notesNeedingWork(save.noteEvidence, now).length;
  const due = dueConcepts(save.concepts, now).length;
  const mixups = confusionDue(save.confusion, now).length;
  const finishedWithTasks = authoredLessons().filter(
    (l) => save.lessons[l.id]?.step === "done" && l.tryTask,
  ).length;

  const card = (m: Mode, title: string, sub: string, badge: string | null) => (
    <button
      type="button"
      onClick={() => onPick(m)}
      className="w-full rounded-2xl border border-white/10 bg-white/5 p-5 text-left hover:border-white/30"
    >
      <span className="flex items-center justify-between">
        <span className="text-lg font-bold">{title}</span>
        {badge && <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-200">{badge}</span>}
      </span>
      <span className="mt-1 block text-sm text-white/60">{sub}</span>
    </button>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold">Practice</h1>
      <p className="mt-1 text-sm text-white/60">Short drills, spaced for you. Nothing here gates the lessons.</p>
      <div className="mt-6 space-y-3">
        {card("notes", "🎹 Note reading", "See a note name, find it on the keyboard. Evidence is per exact note and octave.", needyNotes > 0 ? `${needyNotes} need work` : null)}
        {card("concepts", "🧠 Recall review", "Due concepts return as quick checks. Correct recall lengthens the interval; misses reset to one day.", due > 0 ? `${due} due` : null)}
        {card("tasks", "🛠️ Try-it again", "Redo practical tasks from finished lessons — a second look with fresh ears.", finishedWithTasks > 0 ? `${finishedWithTasks} available` : null)}
        {card("mixups", "🔀 Untangle mix-ups", "Targeted recalls for pairs you've mixed up — short, spaced, and kind.", mixups > 0 ? `${mixups} to untangle` : null)}
      </div>
      {needyNotes === 0 && due === 0 && mixups === 0 && (
        <p className="mt-6 text-sm text-white/50">
          Everything is fresh.{" "}
          {accidentalsUnlocked(save.lessons) ? (
            <>Sharps are in the drill mix now — </>
          ) : (
            <>
              Finish “Semitones and Accidentals” (Chapter 2, Lesson 4) to add sharps
              to this drill —{" "}
            </>
          )}
          or <Link to="/path" className="underline">keep walking the path</Link>.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Note reading drill
// ---------------------------------------------------------------------------

const NOTE_RANGE_WHITE = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"];
/** Black keys between C4 and C5, spelled as sharps to match the practice keyboard's key labels. */
const NOTE_RANGE_ACCIDENTALS = ["C#4", "D#4", "F#4", "G#4", "A#4"];

/**
 * Whether the accidental range is unlocked: the player finished
 * "Semitones and Accidentals" (ch2-l4), the lesson that teaches sharps/flats.
 */
export function accidentalsUnlocked(lessons: Record<string, { step: string }>): boolean {
  return lessons["ch2-l4-accidentals"]?.step === "done";
}

export function drillRange(lessons: Record<string, { step: string }>): string[] {
  return accidentalsUnlocked(lessons)
    ? [...NOTE_RANGE_WHITE, ...NOTE_RANGE_ACCIDENTALS]
    : NOTE_RANGE_WHITE;
}

function pickTarget(
  evidence: Record<string, NoteEvidence>,
  range: string[],
  exclude?: string,
  now = Date.now(),
): string {
  const needy = notesNeedingWork(evidence, now)
    .filter((e) => e.note !== exclude && range.includes(e.note))
    .sort((a, b) => a.dueAt - b.dueAt);
  if (needy.length > 0) return needy[0]!.note;
  const fresh = range.filter((n) => !evidence[n] && n !== exclude);
  if (fresh.length > 0) return fresh[Math.floor(Math.random() * fresh.length)]!;
  const pool = range.filter((n) => n !== exclude);
  return pool[Math.floor(Math.random() * pool.length)]!;
}

/** Render a note name like "C#4" with the letter big and the rest small. */
function TargetName({ target }: { target: string }) {
  const m = /^([A-G])([#♯b♭]?)(\d+)$/.exec(target);
  if (!m) return <>{target}</>;
  return (
    <>
      {m[1]}
      {m[2] && <span className="text-3xl">{m[2] === "#" ? "♯" : m[2] === "b" ? "♭" : m[2]}</span>}
      <span className="text-2xl text-white/50">{m[3]}</span>
    </>
  );
}

export function NoteDrill({ initialTarget }: { initialTarget?: string }) {
  const answerNote = useStore((s) => s.answerNote);
  const lessons = useStore((s) => s.save.lessons);
  const range = drillRange(lessons);
  const [target, setTarget] = useState(() => initialTarget ?? pickTarget(useStore.getState().save.noteEvidence, range));
  const [recorded, setRecorded] = useState(false);
  const [heardTarget, setHeardTarget] = useState(false);
  const [verdict, setVerdict] = useState<{ ok: boolean; cleared: boolean; firstTry: boolean; coach?: string } | null>(null);
  const [lastTapped, setLastTapped] = useState<number | null>(null);
  const [rounds, setRounds] = useState(0);
  const [clearedCount, setClearedCount] = useState(0);
  const historyRef = useRef<boolean[]>([]);

  const tap = (midi: number) => {
    playTone(midi, { lane: "practice", duration: 0.6 });
    setLastTapped(midi);
    if (recorded) return;
    const ok = midi === nameToMidi(target);
    const correctFirstTry = ok && !heardTarget;
    historyRef.current.push(correctFirstTry);
    const recent = recentAccuracy(historyRef.current.slice(-10));
    const cleared = answerNote(target, ok, correctFirstTry, recent);
    setRecorded(true);
    setVerdict({
      ok,
      cleared,
      firstTry: correctFirstTry,
      coach: ok ? undefined : intervalMissCopy(nameToMidi(target), midi),
    });
    setRounds((n) => n + 1);
    if (cleared) setClearedCount((n) => n + 1);
    emitEffect({ event: ok && !heardTarget ? "correct" : ok ? "assisted" : "needs-work", anchor: "note-drill-card", cancelKey: `note-${target}` });
  };

  const hearTarget = () => {
    playTone(nameToMidi(target), { lane: "practice", duration: 0.6 });
    setHeardTarget(true);
  };

  const next = () => {
    setTarget((t) => pickTarget(useStore.getState().save.noteEvidence, range, t));
    setRecorded(false);
    setHeardTarget(false);
    setVerdict(null);
    setLastTapped(null);
  };

  return (
    <div data-testid="note-drill">
      <h1 className="text-2xl font-bold">Note reading</h1>
      <p className="mt-1 text-sm text-white/60">
        Round {rounds + 1} · {clearedCount} cleared this session
      </p>

      <div id="note-drill-card" className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
        <p className="text-sm text-white/60">Find this note on the keyboard</p>
        <p className="mt-2 text-5xl font-bold tracking-wide" aria-live="polite">
          <TargetName target={target} />
        </p>
        <button type="button" onClick={hearTarget} className="mt-3 text-sm text-white/60 underline">
          🔊 Hear the target (counts as a hint)
        </button>
      </div>

      <div className="mt-4">
        <PracticeKeyboard onKey={tap} lastTapped={lastTapped} />
      </div>

      {verdict && (
        <div role="status" className={`mt-4 rounded-xl p-4 text-sm ${verdict.ok ? "bg-emerald-500/15 text-emerald-200" : "bg-white/5 text-white/85"}`}>
          {verdict.ok ? (
            <>
              {verdict.cleared ? "Cleared! This note is solid — see you in a few days." : `That's ${target}. One more clean round and it clears.`}
              {verdict.firstTry && <span className="ml-2 text-amber-300">First try!</span>}
            </>
          ) : (
            <>Not quite — wrong key. Look for {target} on the keyboard and try again, or hear the target first.</>
          )}
          {verdict.coach && (
            <p className="mt-2 text-white/70">🎯 {verdict.coach}</p>
          )}
          <div className="mt-3">
            <button
              type="button"
              onClick={next}
              className="rounded-xl bg-indigo-500 px-4 py-2 font-semibold text-white"
            >
              Next note →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Concept recall review (spaced repetition)
// ---------------------------------------------------------------------------

type ReviewItem = { conceptId: string; lessonTitle: string; checkId: string; question: string; choices: string[]; answerIndex: number; explanation: string; hint: string; audio?: { midis: number[] } };

function buildReviewQueue(): ReviewItem[] {
  const concepts = useStore.getState().save.concepts;
  const due = dueConcepts(concepts);
  const items: ReviewItem[] = [];
  for (const c of due) {
    for (const lesson of authoredLessons()) {
      for (const check of lesson.checks) {
        if (check.conceptId === c.conceptId) {
          items.push({
            conceptId: c.conceptId,
            lessonTitle: lesson.title,
            checkId: check.id,
            question: check.question,
            choices: check.choices,
            answerIndex: check.answerIndex,
            explanation: check.explanation,
            hint: check.hint,
            audio: check.audio ? { midis: check.audio.midis } : undefined,
          });
        }
      }
    }
  }
  return items;
}

export function ConceptDrill() {
  const recordConcept = useStore((s) => s.recordConcept);
  const [queue] = useState<ReviewItem[]>(buildReviewQueue);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [hintShown, setHintShown] = useState(false);
  const [done, setDone] = useState(0);

  const item = queue[index];
  if (!item) {
    return (
      <div data-testid="concept-drill">
        <h1 className="text-2xl font-bold">Recall review</h1>
        <p className="mt-4 rounded-xl bg-emerald-500/15 p-4 text-emerald-200">
          {done === 0 ? "Nothing is due — your memory is in fine shape." : `Review complete: ${done} concept${done === 1 ? "" : "s"} refreshed.`}
        </p>
      </div>
    );
  }

  const answer = (choice: number) => {
    if (picked !== null) return;
    setPicked(choice);
    const correct = choice === item.answerIndex;
    const result = correct ? (hintShown ? "assisted" : "correct") : "wrong";
    const prev = useStore.getState().save.concepts[item.conceptId] ?? null;
    recordConcept(scheduleRecall(prev, item.conceptId, result));
    setDone((n) => n + 1);
    emitEffect({ event: result === "correct" ? "correct" : result === "assisted" ? "assisted" : "needs-work", cancelKey: item.checkId });
  };

  const next = () => {
    setIndex((i) => i + 1);
    setPicked(null);
    setHintShown(false);
  };

  return (
    <div data-testid="concept-drill">
      <h1 className="text-2xl font-bold">Recall review</h1>
      <p className="mt-1 text-sm text-white/60">
        {index + 1} of {queue.length} · from “{item.lessonTitle}”
      </p>
      <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="font-semibold">{item.question}</p>
        {item.audio && (
          <div className="mt-2">
            <TeachingPlayer midis={item.audio.midis} caption="Listen again while you answer." lane="review" />
          </div>
        )}
        <div className="mt-3 space-y-2">
          {item.choices.map((c, i) => {
            const isAnswer = i === item.answerIndex;
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
        {picked === null && !hintShown && (
          <button type="button" onClick={() => setHintShown(true)} className="mt-3 text-sm text-white/60 underline">
            Need a hint? (counts as assisted)
          </button>
        )}
        {hintShown && picked === null && (
          <p className="mt-2 rounded-lg bg-amber-500/10 p-2 text-sm text-amber-200">{item.hint}</p>
        )}
        {picked !== null && (
          <div className="mt-3">
            <p role="status" className="rounded-lg bg-white/5 p-3 text-sm text-white/85">
              {picked === item.answerIndex ? "Correct." : "Not quite."} {item.explanation}
            </p>
            <button
              type="button"
              onClick={next}
              className="mt-3 rounded-xl bg-indigo-500 px-4 py-2 font-semibold text-white"
            >
              {index + 1 < queue.length ? "Next →" : "Finish review"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Task review: redo practical tasks from finished lessons
// ---------------------------------------------------------------------------

function TaskReviewList() {
  const save = useStore((s) => s.save);
  const [openId, setOpenId] = useState<string | null>(null);
  const lessons = useMemo(
    () => authoredLessons().filter((l) => save.lessons[l.id]?.step === "done" && l.tryTask),
    [save.lessons],
  );
  if (lessons.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Try-it again</h1>
        <p className="mt-2 text-sm text-white/60">Finish a lesson to unlock its practical task here for review.</p>
      </div>
    );
  }
  return (
    <div>
      <h1 className="text-2xl font-bold">Try-it again</h1>
      <p className="mt-1 text-sm text-white/60">A second look with fresh ears. Re-attempts update your journal.</p>
      <div className="mt-4 space-y-3">
        {lessons.map((l) => (
          <TaskReviewCard key={l.id} lessonId={l.id} title={l.title} spec={l.tryTask!} open={openId === l.id} onToggle={() => setOpenId((o) => (o === l.id ? null : l.id))} />
        ))}
      </div>
    </div>
  );
}

function TaskReviewCard({
  lessonId,
  title,
  spec,
  open,
  onToggle,
}: {
  lessonId: string;
  title: string;
  spec: TaskSpec;
  open: boolean;
  onToggle: () => void;
}) {
  const save = useStore((s) => s.save);
  const task = useMemo(() => {
    // Adaptive engine (Phase 1): same per-domain difficulty as the lesson.
    const diff = difficultyFor(spec.kind, save.adaptiveAttempts[spec.kind]);
    return buildTask(lessonId, spec, diff.level);
  }, [lessonId, spec, save.adaptiveAttempts]);
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <button type="button" onClick={onToggle} className="w-full text-left font-semibold">
        {title} <span className="text-white/40">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="mt-3">
          <TaskPlayer lessonId={lessonId} task={task} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Confusion drill: targeted recall for mixed-up pairs
// ---------------------------------------------------------------------------

const DOMAIN_LABELS: Record<string, string> = {
  "note-id": "note names",
  "interval-id": "intervals",
  "scale-id": "scales",
  "chord-id": "chords",
};

function ConfusionDrill() {
  const save = useStore((s) => s.save);
  const recordConfusionRecall = useStore((s) => s.recordConfusionRecall);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [salt, setSalt] = useState(0);
  const recordedRef = useRef<Set<string>>(new Set());
  const due = confusionDue(save.confusion);

  if (due.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold">🔀 Untangle mix-ups</h1>
        <p className="mt-2 text-sm text-white/60">
          No mix-ups due right now. When you confuse two answers, they'll show up here
          for a quick targeted recall.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">🔀 Untangle mix-ups</h1>
      <p className="mt-1 text-sm text-white/60">
        Short targeted recalls for pairs you've mixed up. Getting one right spaces the
        next review further out — misses bring it back sooner. Nothing here gates lessons.
      </p>
      <div className="mt-4 space-y-3">
        {due.map((pair) => {
          const key = confusionKey(pair.domain, pair.correct, pair.chosen);
          const task = buildTargetedTask(pair.domain, pair.correct, salt);
          if (!task) return null;
          const open = openKey === key;
          return (
            <div key={key} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <button
                type="button"
                onClick={() => setOpenKey(open ? null : key)}
                className="w-full text-left"
              >
                <span className="font-semibold">
                  {pair.correct} <span className="font-normal text-white/50">vs {pair.chosen}</span>
                </span>
                <span className="mt-1 block text-xs text-white/50">
                  {DOMAIN_LABELS[pair.domain] ?? pair.domain} · mixed up {pair.misses}×{" "}
                  <span className="text-white/40">{open ? "▾" : "▸"}</span>
                </span>
              </button>
              {open && (
                <div className="mt-3">
                  <TaskPlayer
                    task={task}
                    onResult={(r) => {
                      const once = `${key}:${salt}`;
                      if (recordedRef.current.has(once)) return;
                      recordedRef.current.add(once);
                      recordConfusionRecall(pair.domain, pair.correct, r.correct && !r.assisted);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setSalt((n) => n + 1)}
                    className="mt-3 rounded-xl border border-white/20 px-4 py-2 text-sm text-white/80"
                  >
                    Another one →
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
