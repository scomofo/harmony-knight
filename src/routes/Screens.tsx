import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useStore } from "../lib/game/store.ts";
import { TeachingPlayer } from "../components/game/TeachingPlayer.tsx";
import { CHAPTERS, authoredLessons } from "../lib/game/course.ts";

export function OnboardingScreen() {
  const update = useStore((s) => s.update);
  const navigate = useNavigate();
  const [heard, setHeard] = useState(false);

  const start = () => {
    update((s) => ({ ...s, onboarded: true }));
    navigate({ to: "/lesson/$lessonId", params: { lessonId: "ch1-l1-pitch" } });
  };

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-xl flex-col justify-center p-6">
      <div className="text-6xl" aria-hidden>⚔️</div>
      <h1 className="mt-4 text-3xl font-bold">Quest of the Harmony Knight</h1>
      <p className="mt-3 leading-relaxed text-white/80">
        Music theory in short, focused sessions. Learn one idea, try it, recall it — then return
        to your saved place. No account. Your progress stays in this browser.
      </p>
      <div className="mt-6" onClick={() => setHeard(true)}>
        <TeachingPlayer
          midis={[60, 64, 67, 72]}
          caption="Optional: hear what a lesson sounds like. A rising major arpeggio."
          lane="onboarding"
        />
      </div>
      {heard && <p className="mt-2 text-sm text-emerald-300">That's the sound of C major climbing upward.</p>}
      <button
        type="button"
        onClick={start}
        className="mt-8 rounded-xl bg-indigo-500 px-6 py-4 text-lg font-bold text-white"
      >
        Begin the first lesson
      </button>
      <p className="mt-3 text-center text-sm text-white/50">About 3 minutes. Untimed. You can stop anytime.</p>
    </div>
  );
}

export function HomeScreen() {
  const save = useStore((s) => s.save);
  const lessons = authoredLessons();

  // Recommendation: resume unfinished -> start next new -> due recall -> free choice.
  const inProgress = lessons.find((l) => {
    const p = save.lessons[l.id];
    return p && p.step !== "done";
  });
  const nextNew = lessons.find((l) => !save.lessons[l.id]);
  const recommended = inProgress ?? nextNew;
  const dueCount = Object.values(save.concepts).filter((c) => c.dueAt <= Date.now()).length;

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <h1 className="text-2xl font-bold">Your quest</h1>
      <p className="mt-1 text-white/60">
        {save.harmonyPoints} harmony points · Grade {save.grade} · {save.learningDays.length} learning days
      </p>

      {recommended ? (
        <Link
          to="/lesson/$lessonId"
          params={{ lessonId: recommended.id }}
          className="mt-6 block rounded-2xl border border-indigo-400/40 bg-indigo-500/15 p-5"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-300">
            {inProgress ? "Continue where you left off" : "Recommended next"}
          </p>
          <p className="mt-1 text-xl font-bold">{recommended.title}</p>
          <p className="mt-1 text-sm text-white/60">
            {inProgress
              ? `Resume at the ${save.lessons[recommended.id]!.step} step — nothing is lost.`
              : `About ${recommended.estimateMinutes} minutes. Learn → Try it → Recall → Done.`}
          </p>
        </Link>
      ) : (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="font-semibold">Chapter 1 complete — well played, knight.</p>
          <p className="mt-1 text-sm text-white/60">More chapters are being authored.</p>
        </div>
      )}

      {dueCount > 0 && (
        <Link
          to="/practice"
          className="mt-4 block rounded-2xl border border-amber-400/30 bg-amber-500/10 p-5"
        >
          <p className="font-semibold text-amber-200">{dueCount} concept{dueCount === 1 ? "" : "s"} due for recall</p>
          <p className="mt-1 text-sm text-white/70">Review them in Practice — spacing grows with each success.</p>
        </Link>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Link to="/practice" className="rounded-xl border border-white/15 bg-white/5 p-4 font-semibold">
          Practice
        </Link>
        <Link to="/path" className="rounded-xl border border-white/15 bg-white/5 p-4 font-semibold">
          Learning path
        </Link>
      </div>

      {!save.settings.focusMode && (
        <section aria-label="Play">
          <h2 className="mt-8 text-lg font-semibold">Play</h2>
          <p className="mt-1 text-sm text-white/60">
            Optional games and creations — skill-building that never gates lessons.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Link to="/strike" className="rounded-xl border border-white/15 bg-white/5 p-4">
              <p className="font-semibold">⚡ Strike</p>
              <p className="mt-1 text-xs text-white/50">Rhythm striking, fever combos</p>
            </Link>
            <Link to="/duel" className="rounded-xl border border-white/15 bg-white/5 p-4">
              <p className="font-semibold">⚔️ Duel</p>
              <p className="mt-1 text-xs text-white/50">Spar the Discord Sentinel</p>
            </Link>
            <Link to="/studies" className="rounded-xl border border-white/15 bg-white/5 p-4">
              <p className="font-semibold">📚 Studies</p>
              <p className="mt-1 text-xs text-white/50">Focused topic drills</p>
            </Link>
            <Link to="/create" className="rounded-xl border border-white/15 bg-white/5 p-4">
              <p className="font-semibold">🎨 Create</p>
              <p className="mt-1 text-xs text-white/50">Compose and keep drafts</p>
            </Link>
          </div>
          <Link
            to="/grades"
            className="mt-3 block rounded-xl border border-amber-300/30 bg-amber-400/5 p-4"
          >
            <p className="font-semibold text-amber-200">🏅 Grades — trial for grade {save.grade}</p>
            <p className="mt-1 text-xs text-white/50">
              Optional progression trials, grades 0–10
            </p>
          </Link>
        </section>
      )}
    </div>
  );
}

export function LearningPathScreen() {
  const save = useStore((s) => s.save);
  return (
    <div className="mx-auto max-w-2xl p-4 pb-16 sm:p-6">
      <h1 className="text-2xl font-bold">Learning path</h1>
      <p className="mt-1 text-sm text-white/60">11 chapters · 44 lessons. All teaching is open — grades never lock lessons.</p>
      <div className="mt-6 space-y-6">
        {CHAPTERS.map((ch) => {
          const bodies = new Map(authoredLessons().map((l) => [l.id, l]));
          return (
            <section key={ch.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <h2 className="font-bold">
                Chapter {ch.index + 1} · {ch.title}
              </h2>
              <p className="text-sm italic text-white/50">{ch.theme}</p>
              <ol className="mt-3 space-y-2">
                {ch.lessons.map((l) => {
                  const done = save.lessons[l.id]?.step === "done";
                  const started = !!save.lessons[l.id];
                  const authored = bodies.has(l.id);
                  return (
                    <li key={l.id}>
                      {authored ? (
                        <Link
                          to="/lesson/$lessonId"
                          params={{ lessonId: l.id }}
                          className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                        >
                          <span className={done ? "text-white/50 line-through" : ""}>{l.title}</span>
                          <span className="text-sm text-white/50">
                            {done ? "✓ Done" : started ? `Resume: ${save.lessons[l.id]!.step}` : "Start"}
                          </span>
                        </Link>
                      ) : (
                        <div className="flex items-center justify-between rounded-lg border border-white/5 px-3 py-2 opacity-50">
                          <span>{l.title}</span>
                          <span className="text-sm text-white/40">Being authored</span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </div>
    </div>
  );
}
