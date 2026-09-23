/**
 * Creations: the open creative payoff — one prompt per chapter.
 *
 * Compose step-by-step on a keyboard, hear it back, and keep autosaved
 * named drafts. Creation is play, not assessment: no points, no grade
 * credit, replayable forever.
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { PracticeKeyboard } from "../components/game/PracticeKeyboard.tsx";
import { playSequence, stopLane } from "../lib/game/audio.ts";
import { midiToLetter } from "../lib/game/music.ts";
import {
  MAX_CREATION_STEPS,
  creationChapters,
  creationPromptForChapter,
  parseCreationData,
} from "../lib/game/creations.ts";
import { useStore } from "../lib/game/store.ts";
import type { SavedCreation } from "../lib/game/schema.ts";

function newId(): string {
  return `creation-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function CreationsScreen() {
  const creations = useStore((s) => s.save.creations);
  const saveCreation = useStore((s) => s.saveCreation);
  const deleteCreation = useStore((s) => s.deleteCreation);
  const chapters = useMemo(() => creationChapters(), []);

  const [chapterId, setChapterId] = useState(chapters[0]!.id);
  const [openId, setOpenId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState<number[]>([]);
  const [lastTapped, setLastTapped] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => () => stopLane("creation"), []);

  const chapterIndex = chapters.findIndex((c) => c.id === chapterId);
  const prompt = creationPromptForChapter(chapterId);

  const addNote = (midi: number) => {
    if (notes.length >= MAX_CREATION_STEPS) return;
    setLastTapped(midi);
    setNotes((ns) => [...ns, midi]);
  };

  const removeStep = (i: number) => setNotes((ns) => ns.filter((_, j) => j !== i));

  const play = () => {
    if (notes.length === 0) return;
    stopLane("creation");
    setPlaying(true);
    playSequence(notes, {
      lane: "creation",
      noteDuration: 0.35,
      gap: 0.05,
      onDone: () => setPlaying(false),
    });
  };

  const persist = (nextNotes: number[], nextName: string, id: string | null): string => {
    const finalId = id ?? newId();
    const finalName = nextName.trim() || "Untitled creation";
    saveCreation({
      id: finalId,
      chapter: Math.max(0, chapterIndex),
      name: finalName,
      data: { notes: nextNotes },
    });
    return finalId;
  };

  const save = () => {
    const id = persist(notes, name, openId);
    setOpenId(id);
    if (!name.trim()) setName("Untitled creation");
  };

  // Autosave edits to the open draft.
  useEffect(() => {
    if (!openId) return;
    const t = window.setTimeout(() => {
      persist(notes, name, openId);
    }, 800);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, name, openId]);

  const load = (c: SavedCreation) => {
    stopLane("creation");
    setPlaying(false);
    const data = parseCreationData(c.data);
    const ch = chapters[c.chapter] ?? chapters[0]!;
    setChapterId(ch.id);
    setOpenId(c.id);
    setName(c.name);
    setNotes(data.notes);
  };

  const startNew = () => {
    stopLane("creation");
    setPlaying(false);
    setOpenId(null);
    setName("");
    setNotes([]);
  };

  const sorted = [...creations].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="text-2xl font-bold">Creations</h1>
      <p className="mt-1 text-white/70">
        One creative payoff per chapter. Compose, hear it back, keep the draft —
        this is play, not a test.
      </p>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="creation-chapter" className="text-sm text-white/60">
            Chapter
          </label>
          <select
            id="creation-chapter"
            value={chapterId}
            onChange={(e) => setChapterId(e.target.value)}
            className="rounded-lg border border-white/15 bg-neutral-900 px-2 py-1 text-sm"
          >
            {chapters.map((c, i) => (
              <option key={c.id} value={c.id}>
                {i + 1}. {c.title}
              </option>
            ))}
          </select>
          {openId && (
            <span className="text-xs text-emerald-300">Draft autosaves ✓</span>
          )}
        </div>
        <p className="mt-2 text-sm text-amber-200/90">Prompt: {prompt}</p>

        <div className="mt-3">
          <PracticeKeyboard from={60} to={72} onKey={addNote} lastTapped={lastTapped} />
        </div>

        <div className="mt-3 flex min-h-12 flex-wrap gap-1" aria-label="Your melody steps">
          {notes.length === 0 && (
            <p className="text-sm text-white/40">Tap the keyboard to add notes…</p>
          )}
          {notes.map((m, i) => (
            <button
              key={`${i}-${m}`}
              type="button"
              onClick={() => removeStep(i)}
              title={`${midiToLetter(m)} — tap to remove`}
              className="flex h-12 w-10 flex-col items-center justify-center rounded-lg border border-white/15 bg-white/5 text-sm font-semibold hover:border-red-300/50"
            >
              <span>{midiToLetter(m)}</span>
              <span className="text-[10px] text-white/40">{i + 1}</span>
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={play}
            disabled={notes.length === 0 || playing}
            className="rounded-xl bg-indigo-500 px-4 py-2 font-semibold disabled:opacity-40"
          >
            {playing ? "Playing…" : "▶ Play"}
          </button>
          {playing && (
            <button
              type="button"
              onClick={() => {
                stopLane("creation");
                setPlaying(false);
              }}
              className="rounded-xl border border-white/20 px-4 py-2"
            >
              Stop
            </button>
          )}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name your creation…"
            aria-label="Creation name"
            className="min-w-0 flex-1 rounded-lg border border-white/15 bg-neutral-900 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={save}
            disabled={notes.length === 0}
            className="rounded-xl border border-amber-300/40 px-4 py-2 font-semibold text-amber-200 disabled:opacity-40"
          >
            Save
          </button>
          <button
            type="button"
            onClick={startNew}
            className="rounded-xl border border-white/20 px-4 py-2 text-white/70"
          >
            New
          </button>
        </div>
        <p className="mt-1 text-xs text-white/40">
          {notes.length}/{MAX_CREATION_STEPS} steps · tap a step to remove it
        </p>
      </div>

      <h2 className="mt-6 text-lg font-semibold">Your creations ({sorted.length})</h2>
      {sorted.length === 0 && (
        <p className="mt-2 text-sm text-white/50">
          Nothing saved yet — your first masterpiece is one keyboard tap away.
        </p>
      )}
      <ul className="mt-2 space-y-2">
        {sorted.map((c) => {
          const data = parseCreationData(c.data);
          const ch = chapters[c.chapter];
          return (
            <li
              key={c.id}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{c.name}</p>
                <p className="text-xs text-white/50">
                  Ch. {(c.chapter ?? 0) + 1} · {ch?.title ?? ""} · {data.notes.length} notes
                </p>
              </div>
              <button
                type="button"
                onClick={() => load(c)}
                className="rounded-lg border border-white/20 px-3 py-1 text-sm"
              >
                Open
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Delete "${c.name}"?`)) {
                    if (openId === c.id) startNew();
                    deleteCreation(c.id);
                  }
                }}
                className="rounded-lg border border-red-300/30 px-3 py-1 text-sm text-red-300"
              >
                Delete
              </button>
            </li>
          );
        })}
      </ul>

      <Link to="/games" className="mt-6 inline-block text-sm text-white/60 underline">
        ← Back to games
      </Link>
    </div>
  );
}
