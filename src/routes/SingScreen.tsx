import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useStore } from "../lib/game/store.ts";
import { midiToName } from "../lib/game/music.ts";
import { playSequence, playTone, stopLane } from "../lib/game/audio.ts";
import { emitEffect } from "../lib/game/effects.ts";
import { MicPitch, singPhrase, type MicState, type PitchResult } from "../lib/game/pitch.ts";

/**
 * Singing studio: call-and-response pitch matching with the microphone.
 *
 * Listen to a short phrase, then sing it back note by note. A note lands
 * when the detected pitch sits within ±45 cents of the target for a short
 * hold. Nothing is recorded or uploaded — pitch analysis runs on-device.
 *
 * This is play, not assessment: no points, no grades. Finishing a round
 * stamps a learning day like other game activity.
 */

const HOLD_MS = 350;
const CENT_TOLERANCE = 45;
const TICK_MS = 100;

type PitchDisplay = { name: string; cents: number; holdPct: number } | null;

export function SingScreen() {
  const touchLearningDay = useStore((s) => s.touchLearningDay);
  const [micState, setMicState] = useState<MicState>("idle");
  const [round, setRound] = useState(0);
  const [phrase, setPhrase] = useState<number[]>([]);
  const [phase, setPhase] = useState<"listen" | "sing">("listen");
  const [listenIdx, setListenIdx] = useState(-1);
  const [singIdx, setSingIdx] = useState(0);
  const [roundsDone, setRoundsDone] = useState(0);
  const [streak, setStreak] = useState(0);
  const [display, setDisplay] = useState<PitchDisplay>(null);

  const micRef = useRef<MicPitch | null>(null);
  const pitchRef = useRef<PitchResult | null>(null);
  const holdRef = useRef(0);
  // Ref mirrors so the frame loop and timers never read stale state.
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const phraseRef = useRef(phrase);
  phraseRef.current = phrase;
  const singIdxRef = useRef(singIdx);
  singIdxRef.current = singIdx;
  const roundRef = useRef(round);
  roundRef.current = round;

  const stopSound = useCallback(() => {
    stopLane("sing");
    stopLane("sing-confirm");
  }, []);

  const startRound = useCallback(
    (n: number) => {
      stopSound();
      const p = singPhrase((Date.now() % 100000) + n * 7919);
      setPhrase(p);
      setRound(n);
      setSingIdx(0);
      setPhase("listen");
      setListenIdx(-1);
      setDisplay(null);
      holdRef.current = 0;
      playSequence(p, {
        lane: "sing",
        noteDuration: 0.6,
        gap: 0.15,
        onNoteStart: (i) => setListenIdx(i),
        onDone: (cancelled) => {
          if (!cancelled) {
            setListenIdx(-1);
            setPhase("sing");
          }
        },
      });
    },
    [stopSound],
  );

  const finishRound = useCallback(() => {
    setRoundsDone((d) => d + 1);
    setStreak((s) => s + 1);
    touchLearningDay();
    emitEffect({ event: "mastery" });
    playSequence([72, 76, 79], { lane: "sing-confirm", noteDuration: 0.25, gap: 0.05 });
    window.setTimeout(() => startRound(roundRef.current + 1), 1400);
  }, [startRound, touchLearningDay]);

  const advanceNote = useCallback(
    (celebrate: boolean) => {
      const idx = singIdxRef.current;
      const p = phraseRef.current;
      if (celebrate) {
        playTone(p[idx], { lane: "sing-confirm", duration: 0.4 });
        emitEffect({ event: "correct" });
      }
      holdRef.current = 0;
      if (idx + 1 >= p.length) finishRound();
      else setSingIdx(idx + 1);
    },
    [finishRound],
  );

  // Pitch matching loop: 10 Hz is plenty for a 350 ms hold, and it keeps
  // React renders cheap while the mic streams at 60 fps into a ref.
  useEffect(() => {
    if (micState !== "live" || phase !== "sing") return;
    const id = window.setInterval(() => {
      const pitch = pitchRef.current;
      const target = phraseRef.current[singIdxRef.current];
      if (target === undefined) return;
      const holdPct = Math.min(1, holdRef.current / HOLD_MS);
      setDisplay(
        pitch
          ? { name: midiToName(pitch.midi), cents: pitch.cents, holdPct }
          : { name: "—", cents: 0, holdPct },
      );
      if (pitch && pitch.midi === target && Math.abs(pitch.cents) <= CENT_TOLERANCE) {
        holdRef.current += TICK_MS;
        if (holdRef.current >= HOLD_MS) advanceNote(true);
      } else {
        holdRef.current = Math.max(0, holdRef.current - TICK_MS * 1.5);
      }
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [micState, phase, advanceNote]);

  // Full teardown on unmount / route change: mic off, sound stopped.
  useEffect(
    () => () => {
      micRef.current?.dispose();
      micRef.current = null;
      stopSound();
    },
    [stopSound],
  );

  const enableMic = async () => {
    setMicState("requesting");
    const mic = new MicPitch();
    mic.onPitch = (p) => {
      pitchRef.current = p;
    };
    const state = await mic.start();
    if (state === "live") {
      micRef.current = mic;
      setMicState("live");
      startRound(1);
    } else {
      mic.dispose();
      setMicState(state);
    }
  };

  const takeBreak = () => {
    micRef.current?.dispose();
    micRef.current = null;
    stopSound();
    setMicState("idle");
    setRound(0);
    setStreak(0);
    setDisplay(null);
  };

  const target = phrase[singIdx];

  return (
    <div className="mx-auto max-w-md p-4 sm:p-6">
      <h1 className="mt-6 text-2xl font-bold">🎤 Singing Studio</h1>
      <p className="mt-1 text-sm text-white/60">
        Call and response — listen to the melody, then sing it back, note by note.
      </p>

      {micState === "idle" && (
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
          <p className="text-sm text-white/70">
            The microphone only listens for pitch — nothing is recorded, saved, or sent
            anywhere. It never leaves this device.
          </p>
          <button
            type="button"
            onClick={() => void enableMic()}
            className="mt-4 w-full rounded-xl bg-indigo-500 px-4 py-3 font-semibold"
          >
            Turn on the microphone
          </button>
        </div>
      )}

      {micState === "requesting" && (
        <p className="mt-8 text-center text-white/60">Asking for the microphone…</p>
      )}

      {micState === "denied" && (
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
          <p className="font-semibold">The browser said no to the microphone.</p>
          <p className="mt-2 text-sm text-white/60">
            Check the microphone permission in your browser&apos;s site settings, then try again.
          </p>
          <button
            type="button"
            onClick={() => void enableMic()}
            className="mt-4 w-full rounded-xl border border-white/20 px-4 py-3"
          >
            Try again
          </button>
        </div>
      )}

      {micState === "unsupported" && (
        <p className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/70">
          This browser or device doesn&apos;t support microphone input, so the singing
          studio can&apos;t run here.
        </p>
      )}

      {micState === "error" && (
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
          <p className="font-semibold">Something went wrong starting the microphone.</p>
          <button
            type="button"
            onClick={() => void enableMic()}
            className="mt-4 w-full rounded-xl border border-white/20 px-4 py-3"
          >
            Try again
          </button>
        </div>
      )}

      {micState === "live" && round > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between text-sm text-white/60">
            <span>Round {round}</span>
            <span>
              {roundsDone} sung{streak > 1 ? ` · 🔥 ${streak}` : ""}
            </span>
          </div>

          {phase === "listen" ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
              <p className="text-sm font-semibold uppercase tracking-wide text-indigo-300">
                Listen…
              </p>
              <div className="mt-3 flex justify-center gap-2">
                {phrase.map((m, i) => (
                  <span
                    key={i}
                    className={`rounded-lg px-3 py-2 text-lg font-bold ${
                      i === listenIdx
                        ? "bg-indigo-500 text-white"
                        : "bg-white/10 text-white/50"
                    }`}
                  >
                    {midiToName(m)}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-300">
                Your turn — sing
              </p>
              <p className="mt-2 text-5xl font-bold">{target !== undefined ? midiToName(target) : ""}</p>
              <p className="mt-1 text-xs text-white/50">
                note {singIdx + 1} of {phrase.length} · hold the pitch steady
              </p>

              <div className="mt-5">
                <div className="relative mx-auto h-2 max-w-[240px] rounded-full bg-white/10">
                  <div className="absolute left-1/2 top-0 h-full w-px bg-white/40" />
                  {display && (
                    <div
                      className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300"
                      style={{ left: `${50 + Math.max(-50, Math.min(50, display.cents))}%` }}
                    />
                  )}
                </div>
                <div className="mt-1 flex justify-between text-[11px] text-white/40">
                  <span>flat</span>
                  <span className="text-sm text-white/80">
                    {display ? `${display.name} ${display.cents >= 0 ? "+" : ""}${display.cents}¢` : "sing…"}
                  </span>
                  <span>sharp</span>
                </div>
                <div className="mx-auto mt-3 h-1.5 max-w-[240px] overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-all"
                    style={{ width: `${(display?.holdPct ?? 0) * 100}%` }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => advanceNote(false)}
                className="mt-5 rounded-lg border border-white/20 px-4 py-2 text-sm"
              >
                Skip this note
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={takeBreak}
            className="mt-6 w-full rounded-xl border border-white/20 px-4 py-3 text-sm text-white/70"
          >
            Take a break (mic off)
          </button>
        </div>
      )}

      <Link to="/games" className="mt-6 inline-block text-sm text-white/60 underline">
        ← Back to games
      </Link>
    </div>
  );
}
