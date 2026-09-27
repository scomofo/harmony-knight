import { useMemo } from "react";
import { computeRatings, type DomainRating } from "../../lib/game/ratings.ts";
import { useStore } from "../../lib/game/store.ts";

/**
 * Per-domain skill ratings: letter grade + progress bar per domain.
 * Ratings describe demonstrated skill from first-try evidence; domains
 * without enough evidence show a quiet "not yet" instead of a grade.
 */
export function SkillRatings() {
  const save = useStore((s) => s.save);
  const ratings = useMemo(
    () =>
      computeRatings({
        lessons: save.lessons,
        concepts: save.concepts,
        noteEvidence: save.noteEvidence,
        gradeWindows: save.gradeWindows,
        practiceEvidence: save.practiceEvidence,
      }),
    [save.lessons, save.concepts, save.noteEvidence, save.gradeWindows, save.practiceEvidence],
  );

  return (
    <section aria-label="Skill ratings" className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
      <h2 className="font-semibold">Skill ratings</h2>
      <p className="mt-1 text-xs text-white/50">
        From your first-try answers across lessons, practice, and trials.
      </p>
      <ul className="mt-3 space-y-3">
        {ratings.map((r) => (
          <RatingRow key={r.domain} rating={r} />
        ))}
      </ul>
    </section>
  );
}

function RatingRow({ rating }: { rating: DomainRating }) {
  const pct = Math.round(rating.accuracy * 100);
  return (
    <li>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{rating.label}</span>
        {rating.grade ? (
          <span className="flex items-baseline gap-2">
            <span className="text-xs text-white/50">
              {pct}%{rating.confidence === "building" ? " · building" : ""}
            </span>
            <span
              className="inline-block min-w-8 rounded-lg bg-indigo-500/25 px-2 py-0.5 text-center text-sm font-bold text-indigo-200"
              aria-label={`${rating.label} rating ${rating.grade}`}
            >
              {rating.grade}
            </span>
          </span>
        ) : (
          <span className="text-xs text-white/40">Not yet — play a little to unlock</span>
        )}
      </div>
      <div
        className="mt-1 h-2 overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-valuenow={rating.grade ? pct : 0}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${rating.label} accuracy`}
      >
        <div
          className={`h-full rounded-full ${rating.grade ? "bg-indigo-400" : "bg-white/20"}`}
          style={{ width: `${rating.grade ? pct : 0}%` }}
        />
      </div>
    </li>
  );
}
