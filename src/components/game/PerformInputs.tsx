import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { PracticeKeyboard } from "./PracticeKeyboard.tsx";
import { playSequence, stopLane, unlockAudio } from "../../lib/game/audio.ts";
import { midiToName, freqToMidiFloat } from "../../lib/game/music.ts";
import {
  MicPitch,
  holdTick,
  HOLD_TICK_MS,
  type MicState,
  type TimedPitch,
} from "../../lib/game/pitch.ts";
import type { AttemptInput } from "../../lib/game/tasks.ts";

/**
 * Performance attempt controls for the new "perform, don't just click"
 * task families. Each component collects one attempt value and hands it
 * to onAttempt for the task's pure judgment:
 * - KeyboardAttempt: taps on the PracticeKeyboard -> number[] of midis.
 * - TapPadAttempt: taps on a pad -> number[] of ms stamps (first tap = 0).
 * - MicAttempt: sung phrase via the mic pitch pipeline -> number[] of
 *   fractional midis, one per target note, auto-submitted on completion.
 *
 * Nothing here judges: the task's judge() owns correctness. These are
 * input devices with accessible live regions for progress and results.
 */

export function KeyboardAttempt({
  config,
  disabled,
  onAttempt,
}: {
  config: Extract<AttemptInput, { kind: "keyboard" }>;
  disabled: boolean;
  onAttempt: (value: number[]) => void;
}) {
  const [taps, setTaps] = useState<number[]>([]);

  const tap = (m: number) => {
    if (disabled) return;
    setTaps((t) => (t.length >= config.expectedTaps ? t : [...t, m]));
  };
  const clear = () => setTaps([]);
  const full = taps.length === config.expectedTaps;

  return (
    <div className="mt-3">
      <PracticeKeyboard
        from={config.from}
        to={config.to}
        onKey={tap}
        disabled={disabled}
        lastTapped={taps.length > 0 ? taps[taps.length - 1]! : null}
      />
      <p
        role="status"
        aria-live="polite"
        className="mt-2 text-sm text-white/70"
      >
        {taps.length === 0
          ? `Tap ${config.expectedTaps} note${config.expectedTaps === 1 ? "" : "s"} on the keyboard.`
          : `Tapped (${taps.length}/${config.expectedTaps}): ${taps.map((m) => midiToName(m)).join(" – ")}`}
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={clear}
          disabled={disabled || taps.length === 0}
          className="rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold disabled:opacity-40"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => onAttempt(taps)}
          disabled={disabled || !full}
          className="flex-1 rounded-xl bg-indigo-500 px-4 py-2 font-semibold text-white disabled:opacity-40"
        >
          {full
            ? "Check these notes"
            : `Tap ${config.expectedTaps - taps.length} more`}
        </button>
      </div>
    </div>
  );
}

export function TapPadAttempt({
  config,
  disabled,
  onAttempt,
}: {
  config: Extract<AttemptInput, { kind: "tap-pad" }>;
  disabled: boolean;
  onAttempt: (value: number[]) => void;
}) {
  const [taps, setTaps] = useState<number[]>([]);
  const t0Ref = useRef(0);

  const tap = () => {
    if (disabled) return;
    unlockAudio();
    const now = performance.now();
    if (taps.length === 0) t0Ref.current = now;
    setTaps([...taps, now - t0Ref.current]);
  };
  const reset = () => setTaps([]);

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={tap}
        disabled={disabled}
        aria-label="Tap the rhythm pad"
        className="h-28 w-full rounded-2xl border-2 border-indigo-400/50 bg-indigo-500/20 text-lg font-semibold text-indigo-100 active:bg-indigo-500/40 disabled:opacity-40"
      >
        {taps.length === 0
          ? "Tap here — first tap starts your clock"
          : `Tap! (${taps.length})`}
      </button>
      <p
        role="status"
        aria-live="polite"
        className="mt-2 text-sm text-white/70"
      >
        {taps.length === 0
          ? "Listen to the rhythm above, then tap it back."
          : taps.length === 1
            ? "Clock started — keep tapping the rhythm."
            : `${taps.length} taps so far. When the rhythm is done, press Done.`}
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={reset}
          disabled={disabled || taps.length === 0}
          className="rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold disabled:opacity-40"
        >
          Start over
        </button>
        <button
          type="button"
          onClick={() => onAttempt(taps)}
          disabled={disabled || taps.length < 2}
          className="flex-1 rounded-xl bg-indigo-500 px-4 py-2 font-semibold text-white disabled:opacity-40"
        >
          Done — check my rhythm
        </button>
      </div>
      <p className="mt-1 text-xs text-white/40">
        Beat: {config.beatMs} ms. Only the shape of your taps is graded —
        starting late is fine.
      </p>
    </div>
  );
}

const SING_HOLD_MS = 350;
/** A note lands when the sung pitch holds within this many cents of target. */
const SING_TOL_CENTS = 50;
/** Onset grace: the first frames of a sung note don't drain the hold. */
const SING_GRACE_MS = 60;

type MicPhase = "idle" | "listening" | "singing" | "done";

export function MicAttempt({
  config,
  disabled,
  onAttempt,
}: {
  config: Extract<AttemptInput, { kind: "mic" }>;
  disabled: boolean;
  onAttempt: (value: number[]) => void;
}) {
  const [micState, setMicState] = useState<MicState>("idle");
  const [phase, setPhase] = useState<MicPhase>("idle");
  const [listenIdx, setListenIdx] = useState(-1);
  const [singIdx, setSingIdx] = useState(0);
  const [holdPct, setHoldPct] = useState(0);
  const [liveName, setLiveName] = useState<string | null>(null);

  const micRef = useRef<MicPitch | null>(null);
  const pitchRef = useRef<TimedPitch | null>(null);
  const holdRef = useRef(0);
  const graceUntilRef = useRef(0);
  const landedRef = useRef<number[]>([]);
  const submittedRef = useRef(false);
  const onAttemptRef = useRef(onAttempt);
  onAttemptRef.current = onAttempt;
  const phraseRef = useRef(config.phrase);
  phraseRef.current = config.phrase;
  const singIdxRef = useRef(singIdx);
  singIdxRef.current = singIdx;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const stopSound = () => stopLane("task-mic");

  const beginGrace = () => {
    graceUntilRef.current = performance.now() + SING_GRACE_MS;
  };

  /** Land the current note and move on; auto-submits when the phrase is done. */
  const advanceNote = (landed: number) => {
    landedRef.current = [...landedRef.current, landed];
    holdRef.current = 0;
    beginGrace();
    const next = singIdxRef.current + 1;
    if (next >= phraseRef.current.length) {
      setPhase("done");
      if (!submittedRef.current) {
        submittedRef.current = true;
        onAttemptRef.current(landedRef.current);
      }
    } else {
      setSingIdx(next);
    }
  };
  const advanceNoteRef = useRef(advanceNote);
  advanceNoteRef.current = advanceNote;

  // Pitch-matching loop: 10 Hz against the current target note.
  useEffect(() => {
    if (micState !== "live" || phaseRef.current !== "singing") return;
    const id = window.setInterval(() => {
      const pitch = pitchRef.current;
      const target = phraseRef.current[singIdxRef.current];
      if (target === undefined) return;
      const midiFloat = pitch ? freqToMidiFloat(pitch.freq) : null;
      const onTarget =
        midiFloat !== null &&
        Math.abs(midiFloat - target) * 100 <= SING_TOL_CENTS;
      const inGrace = performance.now() < graceUntilRef.current;
      holdRef.current = holdTick(holdRef.current, onTarget, inGrace);
      setHoldPct(Math.min(1, holdRef.current / SING_HOLD_MS));
      setLiveName(pitch ? midiToName(pitch.midi) : null);
      if (holdRef.current >= SING_HOLD_MS && midiFloat !== null)
        advanceNoteRef.current(midiFloat);
    }, HOLD_TICK_MS);
    return () => window.clearInterval(id);
  }, [micState, phase]);

  // Full teardown on unmount: mic off, sound stopped.
  useEffect(
    () => () => {
      micRef.current?.dispose();
      micRef.current = null;
      stopSound();
    },
    [],
  );

  const playPhrase = () => {
    stopSound();
    unlockAudio();
    setPhase("listening");
    setListenIdx(-1);
    playSequence(phraseRef.current, {
      lane: "task-mic",
      noteDuration: 0.55,
      gap: 0.15,
      onNoteStart: (i) => setListenIdx(i),
      onDone: (cancelled) => {
        if (!cancelled && phaseRef.current === "listening") {
          setListenIdx(-1);
          setPhase("singing");
          beginGrace();
        }
      },
    });
  };

  const enableMic = async () => {
    if (disabled) return;
    setMicState("requesting");
    const mic = new MicPitch();
    mic.onPitch = (p) => {
      pitchRef.current = p;
    };
    const state = await mic.start();
    if (state === "live") {
      micRef.current = mic;
      setMicState("live");
      playPhrase();
    } else {
      mic.dispose();
      setMicState(state);
    }
  };

  const target = config.phrase[singIdx];
  const landed = landedRef.current.length;

  if (
    micState === "denied" ||
    micState === "unsupported" ||
    micState === "error"
  ) {
    return (
      <div
        className="mt-3 rounded-xl border border-white/10 bg-white/5 p-4"
        role="status"
      >
        <p className="font-semibold">The microphone isn't available here.</p>
        <p className="mt-1 text-sm text-white/70">
          {micState === "denied"
            ? "The browser said no to the microphone — check site permissions and try again."
            : "This device or browser can't open the microphone right now."}{" "}
          You can practice this phrase in the{" "}
          <Link to="/sing" className="underline">
            Singing Studio
          </Link>
          , and nothing here is gated — move on whenever you like.
        </p>
        <button
          type="button"
          onClick={() => void enableMic()}
          className="mt-3 w-full rounded-xl border border-white/20 px-4 py-2 font-semibold"
        >
          Try the microphone again
        </button>
      </div>
    );
  }

  if (micState === "idle" || micState === "requesting") {
    return (
      <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-4 text-center">
        <p className="text-sm text-white/70">
          The microphone only listens for pitch — nothing is recorded, saved, or
          sent anywhere.
        </p>
        <button
          type="button"
          onClick={() => void enableMic()}
          disabled={disabled || micState === "requesting"}
          className="mt-3 w-full rounded-xl bg-indigo-500 px-4 py-3 font-semibold text-white disabled:opacity-40"
        >
          {micState === "requesting"
            ? "Asking for the microphone…"
            : "Turn on the microphone and sing"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3" aria-live="polite">
      {phase === "listening" && (
        <p role="status" className="text-sm text-white/80">
          Listening…{" "}
          {listenIdx >= 0
            ? `note ${listenIdx + 1} of ${config.phrase.length}`
            : "get ready"}
        </p>
      )}
      {phase === "singing" && target !== undefined && (
        <div>
          <p role="status" className="text-sm text-white/80">
            Sing note {singIdx + 1} of {config.phrase.length}:{" "}
            <strong className="text-lg">{midiToName(target)}</strong>
            {liveName && (
              <span className="ml-2 text-white/60">hearing {liveName}</span>
            )}
          </p>
          <div
            className="mt-2 h-3 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-valuenow={Math.round(holdPct * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Hold progress for ${midiToName(target)}`}
          >
            <div
              className="h-full bg-emerald-400 transition-[width]"
              style={{ width: `${holdPct * 100}%` }}
            />
          </div>
          <div
            className="mt-2 flex gap-1"
            aria-label={`${landed} of ${config.phrase.length} notes landed`}
          >
            {config.phrase.map((_, i) => (
              <span
                key={i}
                className={`h-2 w-8 rounded-full ${i < landed ? "bg-emerald-400" : i === singIdx ? "bg-amber-300" : "bg-white/15"}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={playPhrase}
            className="mt-3 w-full rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold"
          >
            Hear the phrase again
          </button>
        </div>
      )}
      {phase === "done" && (
        <p role="status" className="text-sm text-white/70">
          Phrase complete — checking your pitch…
        </p>
      )}
    </div>
  );
}
