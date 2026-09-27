import { useEffect, useState } from "react";
import { onEffect, type ResolvedEffect } from "../../lib/game/effects.ts";
import { playEffectCue } from "../../lib/game/audio.ts";
import { CALM_CLASS, EFFECT_CLASS } from "../../lib/game/effectStyles.ts";

/**
 * Renders semantic effect events three ways:
 * - a written announcement (the reduced-motion equivalent and the
 *   screen-reader path — same information, no travel, no pulse),
 * - a paired sound cue through the voice engine (unless muted),
 * - a scoped visual expression: the event's CSS class is applied to the
 *   anchor element for the preset's duration, then removed. Newer events
 *   with the same cancel key (or navigation/mute/tab-hide) cancel the
 *   prior expression via the bus's cleanup contract.
 */
export function EffectLayer() {
  const [current, setCurrent] = useState<ResolvedEffect | null>(null);

  useEffect(
    () =>
      onEffect((effect) => {
        setCurrent(effect);
        if (!effect.policy.muted) playEffectCue(effect.preset.soundCue);
        const cls = EFFECT_CLASS[effect.preset.event];
        const el = effect.request.anchor
          ? document.getElementById(effect.request.anchor)
          : null;
        if (el) {
          el.classList.add(cls);
          if (effect.calm) el.classList.add(CALM_CLASS);
        }
        const t = window.setTimeout(
          () => setCurrent(null),
          effect.preset.durationMs + 200,
        );
        return () => {
          window.clearTimeout(t);
          if (el) el.classList.remove(cls, CALM_CLASS);
        };
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
