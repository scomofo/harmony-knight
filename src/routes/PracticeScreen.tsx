import { useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { PracticeKeyboard } from "../components/game/PracticeKeyboard.tsx";
import { TaskPlayer } from "../components/game/TaskPlayer.tsx";
import { TeachingPlayer } from "../components/game/TeachingPlayer.tsx";
import { emitEffect } from "../lib/game/effects.ts";
import { playTone } from "../lib/game/audio.ts";
import { authoredLessons, type TaskSpec } from "../lib/game/course.ts";
import { dueConcepts, scheduleRecall } from "../lib/game/learning.ts";
import { midiToLetter, nameToMidi } from "../lib/game/music.ts";
import { notesNeedingWork, recentAccuracy } from "../lib/game/sr.ts";
import type { NoteEvidence } from "../lib/game/schema.ts";
import { useStore } from "../lib/game/store.ts";
import { buildTask } from "../lib/game/tasks.ts";

type Mode = "home" | "notes" | "concepts" | "tasks";

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
    </div>
  );
}

function PracticeHome({ onPick }: { onPick: (m: Mode) => void }) {
  const save = useStore((s) => s.save);
  const now = Date.now();
  const needyNotes = notesNeedingWork(save.noteEvidence, now).length;
  const due = dueConcepts(save.concepts, now).length;
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
      </div>
      {needyNotes === 0 && due === 0 && (
        <p className="mt-6 text-sm text-white/50">
          Everything is fresh. New notes unlock as you play, or <Link to="/path" className="underline">keep walking the path</Link>.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Note reading drill
// ---------------------------------------------------------------------------

const NOTE_RANGE = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"];

function pickTarget(evidence: Record<string, NoteEvidence>, exclude?: string, now = Date.now()): string {
  const needy = notesNeedingWork(evidence, now)
    .filter((e) => e.note !== exclude)
    .sort((a, b) => a.dueAt - b.dueAt);
  if (needy.length > 0) return needy[0]!.note;
  const fresh = NOTE_RANGE.filter((n) => !evidence[n] && n !== exclude);
  if (fresh.length > 0) return fresh[Math.floor(Math.random() * fresh.length)]!;
  const pool = NOTE_RANGE.filter((n) => n !== exclude);
  return pool[Math.floor(Math.random() * pool.length)]!;
}

export function NoteDrill({ initialTarget }: { initialTarget?: string }) {
  const answerNote = useStore((s) => s.answerNote);
  const [target, setTarget] = useState(() => initialTarget ?? pickTarget(useStore.getState().save.noteEvidence));
  const [recorded, setRecorded] = useState(false);
  const [heardTarget, setHeardTarget] = useState(false);
  const [verdict, setVerdict] = useState<{ ok: boolean; cleared: boolean; firstTry: boolean } | null>(null);
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
    setVerdict({ ok, cleared, firstTry: correctFirstTry });
    setRounds((n) => n + 1);
    if (cleared) setClearedCount((n) => n + 1);
    emitEffect({ event: ok && !heardTarget ? "correct" : ok ? "assisted" : "needs-work", cancelKey: `note-${target}` });
  };

  const hearTarget = () => {
    playTone(nameToMidi(target), { lane: "practice", duration: 0.6 });
    setHeardTarget(true);
  };

  const next = () => {
    setTarget((t) => pickTarget(useStore.getState().save.noteEvidence, t));
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

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
        <p className="text-sm text-white/60">Find this note on the keyboard</p>
        <p className="mt-2 text-5xl font-bold tracking-wide" aria-live="polite">
          {midiToLetter(nameToMidi(target))}
          <span className="text-2xl text-white/50">{target.replace(/^[A-G]/, "")}</span>
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
  const task = useMemo(() => buildTask(lessonId, spec), [lessonId, spec]);
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
