/**
 * Maps semantic effect events to their CSS expression classes.
 * The keyframes live in styles.css; this mapping keeps the contract
 * testable: every EffectEvent must have a real class.
 */
import type { EffectEvent } from "./effects.ts";

export const EFFECT_CLASS: Record<EffectEvent, string> = {
  select: "hk-fx-select",
  correct: "hk-fx-correct",
  "needs-work": "hk-fx-needs-work",
  assisted: "hk-fx-assisted",
  mastery: "hk-fx-mastery",
  "due-cleared": "hk-fx-due-cleared",
  clash: "hk-fx-clash",
  "phrase-win": "hk-fx-phrase-win",
  fever: "hk-fx-fever",
};

/** Static-expression modifier for reduced-motion / high-contrast calm mode. */
export const CALM_CLASS = "hk-fx-calm";

export const EFFECT_EVENTS: EffectEvent[] = [
  "select",
  "correct",
  "needs-work",
  "assisted",
  "mastery",
  "due-cleared",
  "clash",
  "phrase-win",
  "fever",
];
