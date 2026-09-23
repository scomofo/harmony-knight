import { Link } from "@tanstack/react-router";
import { useStore } from "../lib/game/store.ts";

/**
 * Games hub: Strike, Duel, Studies, Creations, Grades.
 * All optional; teaching content is never gated by any of these.
 */
export function GamesScreen() {
  const stats = useStore((s) => s.save.gameStats);
  const grade = useStore((s) => s.save.grade);
  const creationCount = useStore((s) => s.save.creations.length);

  const cards = [
    {
      to: "/strike",
      icon: "⚡",
      title: "Strike",
      blurb: "Rhythm striking: hit notes as they cross the line. Fever at a 10-combo.",
      meta: stats.strikeBest > 0 ? `Best ${stats.strikeBest} · ${stats.strikePlays} plays` : "Not played yet",
    },
    {
      to: "/duel",
      icon: "⚔️",
      title: "Duel",
      blurb: "Ear-training sparring against the Discord Sentinel. Six rounds, first attempts count.",
      meta: `${stats.duelWins}W · ${stats.duelDraws}D · ${stats.duelLosses}L`,
    },
    {
      to: "/studies",
      icon: "📚",
      title: "Studies",
      blurb: "Focused drills: listening, rhythm, scales, keys, intervals, triads, cadences.",
      meta: "Unlocks with grade",
    },
    {
      to: "/create",
      icon: "🎨",
      title: "Creations",
      blurb: "One creative prompt per chapter. Compose, replay, keep drafts — pure play.",
      meta: creationCount > 0 ? `${creationCount} saved` : "No creations yet",
    },
    {
      to: "/grades",
      icon: "🏅",
      title: "Grades",
      blurb: "Optional trials, grades 0–10. Prove practical skill; never blocks lessons.",
      meta: `Grade ${grade}`,
    },
  ];

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="text-2xl font-bold">Games</h1>
      <p className="mt-1 text-white/70">
        Optional ways to play with everything the lessons teach. Nothing here gates
        the learning path.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="rounded-xl border border-white/15 bg-white/5 p-4 hover:border-amber-300/50"
          >
            <h2 className="text-lg font-semibold">
              {c.icon} {c.title}
            </h2>
            <p className="mt-1 text-sm text-white/60">{c.blurb}</p>
            <p className="mt-2 text-xs text-white/40">{c.meta}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
