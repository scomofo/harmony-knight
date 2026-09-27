/**
 * Every semantic effect event maps to a real implemented CSS class,
 * and every preset pairs a real sound cue.
 */
import { describe, expect, it } from "vitest";
// @ts-ignore node:fs has no bundled types in this project (no @types/node);
// vitest runs on node, so the import resolves at runtime.
import { readFileSync } from "node:fs";
import { EFFECT_CLASS, EFFECT_EVENTS, CALM_CLASS } from "./effectStyles.ts";
import { EFFECT_PRESETS } from "./effects.ts";

const cssUrl = new URL("../../styles.css", import.meta.url);
declare const process: { cwd(): string } | undefined;
// import.meta.url is not a file: URL under vitest's transform pipeline;
// fall back to the repo root (vitest runs with cwd = project root).
const css: string = readFileSync(
  typeof process !== "undefined" ? `${process.cwd()}/src/styles.css` : cssUrl,
  "utf8",
);

describe("effect styles", () => {
  it("covers every EffectEvent", () => {
    for (const event of EFFECT_EVENTS) {
      expect(EFFECT_CLASS[event], event).toBeTruthy();
      expect(EFFECT_CLASS[event]).toMatch(/^hk-fx-/);
    }
  });

  it("defines all classes in styles.css", () => {
    for (const event of EFFECT_EVENTS) {
      const cls = EFFECT_CLASS[event];
      expect(css.includes(`.${cls}`), `${event} -> .${cls} must exist in styles.css`).toBe(true);
    }
  });

  it("calm mode has a distinct class", () => {
    expect(css.includes(`.${CALM_CLASS}`), `.${CALM_CLASS} must exist in styles.css`).toBe(true);
  });

  it("every preset pairs a real sound cue (none is never used)", () => {
    for (const event of EFFECT_EVENTS) {
      const preset = EFFECT_PRESETS[event];
      expect(preset, event).toBeDefined();
      expect(preset.soundCue, event).not.toBe("none");
      expect(["tick", "resolve", "soft", "clash", "win"]).toContain(preset.soundCue);
    }
  });
});
