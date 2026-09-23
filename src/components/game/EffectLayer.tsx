import { useEffect, useState } from "react";
import { onEffect, type ResolvedEffect } from "../../lib/game/effects.ts";

/**
 * Renders semantic effect events as written feedback.
 * The written announcement IS the reduced-motion equivalent: same
 * information, no travel, no pulse. Full-expression visuals are layered
 * through data attributes for CSS.
 */
export function EffectLayer() {
  const [current, setCurrent] = useState<ResolvedEffect | null>(null);

  useEffect(
    () =>
      onEffect((effect) => {
        setCurrent(effect);
        const t = window.setTimeout(() => setCurrent(null), effect.preset.durationMs + 200);
        return () => window.clearTimeout(t);
      }),
    [],
  );

  if (!current) return null;
  const label: Record<ResolvedEffect["preset"]["event"], string> = {
    select: "Selected",
    correct: "Correct",
    "needs-work": "Needs work — see the explanation",
    assisted: "Hint shown — attempt marked assisted",
    mastery: "Mastered",
    "due-cleared": "Due review cleared",
    clash: "Clash — the Sentinel answers",
    "phrase-win": "Phrase complete",
    fever: "Fever mode",
  };
  return (
    <div
      aria-live="polite"
      data-effect={current.preset.event}
      data-calm={current.calm}
      className="pointer-events-none fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-full border border-white/20 bg-black/80 px-4 py-2 text-sm font-semibold text-white"
    >
      {label[current.preset.event]}
    </div>
  );
}
