import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useStore } from "../lib/game/store.ts";
import { CHAPTERS } from "../lib/game/course.ts";
import { currentStreak, todayKey } from "../lib/game/quests.ts";

function dayKeys(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    out.push(todayKey(d));
  }
  return out;
}

function pretty(id: string): string {
  return id.replace(/[-_]/g, " ");
}

/**
 * Grown-ups dashboard: what the learner has done, where they're thriving,
 * and what might need practice. Behind a 4-digit kid-gate PIN — a speed
 * bump for little fingers, not real security (everything is local).
 */
export function GrownUpsScreen() {
  const pin = useStore((s) => s.save.settings.grownUpsPin);
  const [unlocked, setUnlocked] = useState(false);
  const [changing, setChanging] = useState(false);

  if (!unlocked || changing) {
    return (
      <div className="mx-auto max-w-md p-4 sm:p-6">
        <PinGate
          mode={pin === null || changing ? "set" : "enter"}
          onDone={() => {
            setUnlocked(true);
            setChanging(false);
          }}
        />
      </div>
    );
  }
  return <Dashboard onChangePin={() => setChanging(true)} />;
}

function PinGate({ mode, onDone }: { mode: "set" | "enter"; onDone: () => void }) {
  const pin = useStore((s) => s.save.settings.grownUpsPin);
  const updateSettings = useStore((s) => s.updateSettings);
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    if (mode === "set") {
      if (!/^\d{4}$/.test(first)) return setError("PINs are 4 digits.");
      if (first !== second) return setError("Those PINs don't match — try again.");
      updateSettings({ grownUpsPin: first });
      onDone();
    } else {
      if (first === pin) onDone();
      else {
        setError("That's not the grown-ups PIN.");
        setFirst("");
      }
    }
  };

  const inputClass =
    "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-center text-2xl tracking-[0.5em]";

  return (
    <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6">
      <h1 className="text-xl font-bold">Grown-ups</h1>
      <p className="mt-1 text-sm text-white/60">
        {mode === "set"
          ? "Choose a 4-digit PIN so little knights can't wander in here."
          : "Enter the grown-ups PIN to see progress."}
      </p>
      <div className="mt-4 space-y-3">
        <input
          aria-label={mode === "set" ? "Choose a 4-digit PIN" : "Grown-ups PIN"}
          className={inputClass}
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          type="password"
          value={first}
          onChange={(e) => setFirst(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        {mode === "set" && (
          <input
            aria-label="Repeat the PIN"
            className={inputClass}
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            type="password"
            placeholder="••••"
            value={second}
            onChange={(e) => setSecond(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        )}
        {error && (
          <p role="alert" className="text-sm text-red-300">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={submit}
          className="w-full rounded-xl bg-indigo-500 px-4 py-3 font-semibold"
        >
          {mode === "set" ? "Set PIN" : "Unlock"}
        </button>
        <Link to="/" className="block text-center text-sm text-white/50 underline">
          Back to the quest
        </Link>
      </div>
    </div>
  );
}

function Dashboard({ onChangePin }: { onChangePin: () => void }) {
  const save = useStore((s) => s.save);
  const streak = currentStreak(save.learningDays, todayKey());

  const chapters = CHAPTERS.map((ch) => ({
    title: ch.title,
    done: ch.lessons.filter((l) => save.lessons[l.id]?.step === "done").length,
    total: ch.lessons.length,
  }));
  const totalDone = chapters.reduce((n, c) => n + c.done, 0);
  const totalLessons = chapters.reduce((n, c) => n + c.total, 0);

  const struggling = Object.values(save.concepts).filter(
    (c) => c.lastResult === "wrong" || c.lastResult === "assisted",
  );
  const weakNotes = Object.values(save.noteEvidence).filter(
    (n) => n.attempts >= 3 && n.firstTryCorrect / n.attempts < 0.7,
  );

  const weekQuests = dayKeys(7).reduce(
    (n, key) => n + Object.keys(save.questLog[key] ?? {}).length,
    0,
  );

  const stats = save.gameStats;
  const statCards: Array<[string, string]> = [
    ["Learning days", String(save.learningDays.length)],
    ["Day streak", String(streak)],
    ["Harmony points", String(save.harmonyPoints)],
    ["Grade", String(save.grade)],
  ];

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Grown-ups</h1>
        <Link to="/" className="text-sm text-white/60 underline">
          Back to the quest
        </Link>
      </div>
      <p className="mt-1 text-sm text-white/50">
        Progress, gently. The lock resets every visit — little knights stay out.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {statCards.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-white/50">{label}</p>
          </div>
        ))}
      </div>

      <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="font-semibold">
          Lessons <span className="text-sm font-normal text-white/50">{totalDone}/{totalLessons}</span>
        </h2>
        <ul className="mt-3 space-y-2">
          {chapters.map((ch) => (
            <li key={ch.title}>
              <div className="flex justify-between text-sm">
                <span>{ch.title}</span>
                <span className="text-white/50">
                  {ch.done}/{ch.total}
                </span>
              </div>
              <div
                className="mt-1 h-2 overflow-hidden rounded-full bg-white/10"
                role="progressbar"
                aria-valuenow={ch.done}
                aria-valuemin={0}
                aria-valuemax={ch.total}
                aria-label={`${ch.title} progress`}
              >
                <div
                  className="h-full rounded-full bg-indigo-400"
                  style={{ width: `${(ch.done / ch.total) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="font-semibold">Might need practice</h2>
        {struggling.length === 0 && weakNotes.length === 0 ? (
          <p className="mt-2 text-sm text-white/60">Nothing flagged — smooth sailing.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-white/75">
            {struggling.map((c) => (
              <li key={c.conceptId}>
                {pretty(c.conceptId)}{" "}
                <span className="text-white/40">
                  (last try: {c.lastResult === "assisted" ? "needed help" : "missed"})
                </span>
              </li>
            ))}
            {weakNotes.map((n) => (
              <li key={n.note}>
                Note {n.note}{" "}
                <span className="text-white/40">
                  ({n.firstTryCorrect}/{n.attempts} first-try correct)
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="font-semibold">Play</h2>
        <ul className="mt-2 space-y-1 text-sm text-white/75">
          <li>Daily quests finished this week: {weekQuests}</li>
          <li>
            Strike: {stats.strikePlays} plays · best {stats.strikeBest}
          </li>
          <li>
            Duel vs the Sentinel: {stats.duelWins}W · {stats.duelLosses}L · {stats.duelDraws}D
          </li>
          <li>Creations saved: {save.creations.length}</li>
        </ul>
      </section>

      <button
        type="button"
        onClick={onChangePin}
        className="mt-4 rounded-xl border border-white/15 px-4 py-2 text-sm text-white/70"
      >
        Change PIN
      </button>
    </div>
  );
}
