import { useEffect, useRef, useState } from "react";
import { playSequence, stopLane, unlockAudio } from "../../lib/game/audio.ts";
import { emitEffect } from "../../lib/game/effects.ts";
import { useStore } from "../../lib/game/store.ts";

/**
 * Playback control with synchronized note highlighting.
 * One lane per player instance; unmount/navigation stops the lane.
 * Speed comes from settings; stopping is always explicit and immediate.
 */
export function TeachingPlayer({
  midis,
  caption,
  lane,
  noteDuration = 0.5,
}: {
  midis: number[];
  caption: string;
  lane: string;
  noteDuration?: number;
}) {
  const speed = useStore((s) => s.save.settings.playbackSpeed);
  const muted = useStore((s) => s.save.settings.muted);
  const [playing, setPlaying] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  const stop = () => {
    cancelRef.current?.();
    cancelRef.current = null;
    stopLane(lane);
    setPlaying(false);
    setActiveIndex(null);
  };

  useEffect(() => stop, [lane]);

  const play = () => {
    stop();
    unlockAudio();
    setPlaying(true);
    const scaled = noteDuration / speed;
    cancelRef.current = playSequence(midis, {
      lane,
      noteDuration: scaled,
      gain: 0.5,
      onNoteStart: (i) => setActiveIndex(i),
      onDone: (cancelled) => {
        setPlaying(false);
        setActiveIndex(null);
        if (!cancelled) emitEffect({ event: "select", anchor: lane, cancelKey: lane });
      },
    });
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
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
        <div className="flex gap-1" aria-hidden={!playing}>
          {midis.map((_, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full transition-colors ${
                activeIndex === i ? "bg-amber-300" : "bg-white/20"
              }`}
            />
          ))}
        </div>
        <span className="ml-auto text-xs text-white/50">
          {speed === 1 ? "Normal speed" : speed === 0.75 ? "¾ speed" : "½ speed"}
        </span>
      </div>
    </div>
  );
}
