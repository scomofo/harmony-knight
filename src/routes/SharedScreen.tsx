import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useStore } from "../lib/game/store.ts";
import { playSequence, stopLane } from "../lib/game/audio.ts";
import { decodeShare } from "../lib/game/share.ts";

/**
 * A shared melody landing page: anyone opening the link can listen, and —
 * if they have the app — save a copy to their own creations. The payload
 * is fully self-contained in the URL, so there is no account or server.
 */
export function SharedScreen() {
  const { payload } = useParams({ strict: false }) as { payload: string };
  const shared = decodeShare(payload ?? "");
  const saveCreation = useStore((s) => s.saveCreation);
  const [playing, setPlaying] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!shared) {
    return (
      <div className="mx-auto max-w-md p-4 sm:p-6">
        <h1 className="mt-10 text-2xl font-bold">Hmm, that link…</h1>
        <p className="mt-2 text-white/60">
          This doesn&apos;t look like a shared melody. Links can break if a character goes
          missing — ask the sender to copy it again.
        </p>
        <Link to="/" className="mt-6 inline-block text-sm text-white/60 underline">
          ← Home
        </Link>
      </div>
    );
  }

  const play = () => {
    setPlaying(true);
    playSequence(shared.notes, {
      lane: "shared",
      onDone: () => setPlaying(false),
    });
  };

  const saveCopy = () => {
    saveCreation({
      id: `shared-${Date.now()}`,
      chapter: 0,
      name: shared.name,
      data: { notes: shared.notes },
    });
    setSaved(true);
  };

  return (
    <div className="mx-auto max-w-md p-4 sm:p-6">
      <p className="mt-10 text-xs font-semibold uppercase tracking-wide text-indigo-300">
        Someone shared a melody with you
      </p>
      <h1 className="mt-1 text-2xl font-bold">{shared.name}</h1>
      <p className="mt-1 text-sm text-white/60">{shared.notes.length} notes · made in Harmony Knight</p>

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={play}
          disabled={playing}
          className="flex-1 rounded-xl bg-indigo-500 px-4 py-3 font-semibold disabled:opacity-50"
        >
          {playing ? "Playing…" : "▶ Play it"}
        </button>
        {playing && (
          <button
            type="button"
            onClick={() => {
              stopLane("shared");
              setPlaying(false);
            }}
            className="rounded-xl border border-white/20 px-4 py-3"
          >
            Stop
          </button>
        )}
      </div>

      {saved ? (
        <p className="mt-4 text-sm text-emerald-300">Saved to your creations ✓</p>
      ) : (
        <button
          type="button"
          onClick={saveCopy}
          className="mt-4 w-full rounded-xl border border-white/20 px-4 py-3"
        >
          Save a copy to my creations
        </button>
      )}

      <Link to="/" className="mt-6 inline-block text-sm text-white/60 underline">
        ← Home
      </Link>
    </div>
  );
}
