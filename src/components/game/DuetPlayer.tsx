import { useEffect, useRef, useState } from "react";
import { playSequence, stopLane, unlockAudio } from "../../lib/game/audio.ts";
import { emitEffect } from "../../lib/game/effects.ts";
import { useStore } from "../../lib/game/store.ts";

/**
 * Plays two or more voices simultaneously: one playSequence per voice on the
 * same lane, so they start together and one stop cancels everything.
 * Unmount/navigation stops the lane. Mirrors TeachingPlayer's speed, mute,
 * and effect handling.
 */
export function DuetPlayer({
  voices,
  caption,
  lane,
}: {
  voices: { label: string; notes: number[]; durations?: number[] }[];
  caption: string;
  lane: string;
}) {
  const speed = useStore((s) => s.save.settings.playbackSpeed);
  const muted = useStore((s) => s.save.settings.muted);
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState<Array<number | null>>(() => voices.map(() => null));
  const cancelsRef = useRef<Array<() => void>>([]);

  const stop = () => {
    cancelsRef.current.forEach((c) => c());
    cancelsRef.current = [];
    stopLane(lane);
    setPlaying(false);
    setActive(voices.map(() => null));
  };

  // Stop the shared lane when this player unmounts or the lane changes.
  useEffect(() => stop, [lane]);

  const play = () => {
    stop();
    unlockAudio();
    setPlaying(true);
    let remaining = voices.length;
    const onVoiceDone = (cancelled: boolean) => {
      // A manual stop() already reset state; only track natural finishes.
      if (cancelled) return;
      remaining -= 1;
      if (remaining === 0) {
        setPlaying(false);
        setActive(voices.map(() => null));
        emitEffect({ event: "select", anchor: lane, cancelKey: lane });
      }
    };
    voices.forEach((voice, vi) => {
      const cancel = playSequence(voice.notes, {
        lane,
        noteDuration: 0.5 / speed,
        durations: voice.durations?.map((d) => d / speed),
        gain: 0.45,
        onNoteStart: (i) =>
          setActive((prev) => {
            const next = [...prev];
            next[vi] = i;
            return next;
          }),
        onDone: onVoiceDone,
      });
      cancelsRef.current.push(cancel);
    });
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3" data-testid="duet-player">
      <p className="text-sm text-white/80">{caption}</p>
      <div className="mt-2 flex items-center gap-2">
        {playing ? (
          <button
            type="button"
            onClick={stop}
            className="rounded-lg bg-red-500/80 px-4 py-2 text-sm font-semibold text-white"
          >
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={play}
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white"
          >
            {muted ? "Play (muted)" : "Play"}
          </button>
        )}
        <span className="text-xs text-white/50">
          {speed === 1 ? "Normal speed" : speed === 0.75 ? "¾ speed" : "½ speed"}
        </span>
      </div>
      {voices.map((voice, vi) => (
        <div key={voice.label} className="mt-2 flex items-center gap-2">
          <span className="w-40 shrink-0 truncate text-xs text-white/60">{voice.label}</span>
          <div className="flex flex-wrap gap-1" aria-hidden={!playing}>
            {voice.notes.map((_, i) => (
              <span
                key={i}
                className={`h-2 w-2 rounded-full transition-colors ${
                  active[vi] === i ? "bg-amber-300" : "bg-white/20"
                }`}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
