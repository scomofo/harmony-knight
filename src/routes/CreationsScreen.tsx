/**
 * Creations: the open creative payoff — one prompt per chapter.
 *
 * Compose step-by-step on a keyboard, hear it back, and keep autosaved
 * named drafts. Creation is play, not assessment: no points, no grade
 * credit, replayable forever.
 *
 * The keyboard, scale, bass, and rhythm grids follow the learner's
 * curriculum progress (see palettes.ts), and the "always sound good"
 * toggle quantizes new notes to the palette and adds an auto-harmonized
 * bassline — Incredibox-style can't-fail.
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { PracticeKeyboard } from "../components/game/PracticeKeyboard.tsx";
import { playSequence, playTone, stopLane } from "../lib/game/audio.ts";
import { downloadBlob, renderCreationWav, shareUrl } from "../lib/game/share.ts";
import { midiToLetter } from "../lib/game/music.ts";
import {
  MAX_CREATION_STEPS,
  creationChapters,
  creationPromptForChapter,
  parseCreationData,
} from "../lib/game/creations.ts";
import {
  gridForPalette,
  paletteProgress,
  type Palette,
  type RhythmGrid,
} from "../lib/game/palettes.ts";
import {
  CANT_FAIL_STEPS_PER_BAR,
  basslineForPalette,
  gridAccents,
  gridDurations,
  quantizeToPcs,
} from "../lib/game/constraints.ts";
import { useStore } from "../lib/game/store.ts";
import type { SavedCreation } from "../lib/game/schema.ts";

function newId(): string {
  return `creation-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

const MELODY_LANE = "creation";
const BASS_LANE = "creation-bass";
const BASE_STEP_DURATION = 0.35;
const STEP_GAP = 0.05;

function stopPlayback() {
  stopLane(MELODY_LANE);
  stopLane(BASS_LANE);
}

export function CreationsScreen() {
  const creations = useStore((s) => s.save.creations);
  const saveCreation = useStore((s) => s.saveCreation);
  const deleteCreation = useStore((s) => s.deleteCreation);
  const updateSettings = useStore((s) => s.updateSettings);
  const cantFailSetting = useStore((s) => s.save.settings.cantFail);
  const lessons = useStore((s) => s.save.lessons);
  const completedLessonIds = useMemo(
    () =>
      Object.entries(lessons)
        .filter(([, p]) => p.completedAt != null)
        .map(([id]) => id),
    [lessons],
  );
  const chapters = useMemo(() => creationChapters(), []);

  const [chapterId, setChapterId] = useState(chapters[0]!.id);
  const [openId, setOpenId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState<number[]>([]);
  const [lastTapped, setLastTapped] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [gridId, setGridId] = useState<string | null>(null);

  useEffect(() => () => stopPlayback(), []);

  const prog = useMemo(() => paletteProgress(completedLessonIds), [completedLessonIds]);
  const palette: Palette = prog.current;
  const grid: RhythmGrid = useMemo(
    () => gridForPalette(palette, gridId ?? ""),
    [palette, gridId],
  );

  const chapterIndex = chapters.findIndex((c) => c.id === chapterId);
  const prompt = creationPromptForChapter(chapterId);

  const addNote = (midi: number) => {
    if (notes.length >= MAX_CREATION_STEPS) return;
    // Can't-fail: snap the tapped note to the palette before it lands,
    // using the bar it will occupy for chord-tone quantization.
    let snapped = midi;
    if (cantFailSetting) {
      const bar = Math.floor(notes.length / CANT_FAIL_STEPS_PER_BAR);
      const chord = palette.chordTones?.[bar % palette.chordTones.length];
      snapped = quantizeToPcs(midi, chord && chord.length > 0 ? chord : palette.scalePcs);
    }
    setLastTapped(snapped);
    setNotes((ns) => [...ns, snapped]);
  };

  const removeStep = (i: number) => setNotes((ns) => ns.filter((_, j) => j !== i));

  const play = () => {
    if (notes.length === 0) return;
    stopPlayback();
    setPlaying(true);
    const durations = gridDurations(notes.length, grid, BASE_STEP_DURATION);
    const gains = gridAccents(notes.length, grid);
    playSequence(notes, {
      lane: MELODY_LANE,
      durations,
      gains,
      gap: STEP_GAP,
      onDone: () => setPlaying(false),
    });
    if (cantFailSetting) {
      // Auto-harmonize: one bass root per bar, ringing the full bar.
      const bass = basslineForPalette(notes.length, palette, CANT_FAIL_STEPS_PER_BAR);
      let onset = 0;
      for (let bar = 0; bar * CANT_FAIL_STEPS_PER_BAR < notes.length; bar++) {
        const start = bar * CANT_FAIL_STEPS_PER_BAR;
        const barLen = durations
          .slice(start, start + CANT_FAIL_STEPS_PER_BAR)
          .reduce((a, d) => a + d + STEP_GAP, 0);
        const root = bass[start]!;
        if (root >= 0) {
          playTone(root, {
            lane: BASS_LANE,
            at: onset,
            duration: Math.max(0.3, barLen),
            gain: 0.32,
            type: "triangle",
          });
        }
        onset += barLen;
      }
    }
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
    stopPlayback();
    setPlaying(false);
    const data = parseCreationData(c.data);
    const ch = chapters[c.chapter] ?? chapters[0]!;
    setChapterId(ch.id);
    setOpenId(c.id);
    setName(c.name);
    setNotes(data.notes);
  };

  const startNew = () => {
    stopPlayback();
    setPlaying(false);
    setOpenId(null);
    setName("");
    setNotes([]);
  };

  const sorted = [...creations].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">Creations</h1>
        <Link to="/contest" className="text-sm text-amber-200 underline">
          🏆 This week's contest →
        </Link>
      </div>
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

        {/* Theory-mapped palette */}
        <div className="mt-3 rounded-lg border border-indigo-300/20 bg-indigo-500/10 p-3">
          <p className="text-sm">
            <span className="font-semibold text-indigo-200">🎹 Palette: {palette.label}</span>
            {prog.unlockedByLesson && (
              <span className="text-white/50"> · unlocked by {prog.unlockedByLesson}</span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-white/60">{palette.blurb}</p>
          {prog.next && (
            <p className="mt-1 text-xs text-white/40">
              Next: <span className="text-white/60">{prog.next.palette.label}</span> — finish “
              {prog.next.lessonTitle}”.
            </p>
          )}
        </div>

        {/* Can't-fail toggle */}
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={cantFailSetting}
            aria-label="Always sound good mode"
            onClick={() => updateSettings({ cantFail: !cantFailSetting })}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              cantFailSetting ? "bg-emerald-500" : "bg-white/20"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                cantFailSetting ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
          <label className="text-sm text-white/80">
            <span className="font-semibold">Always sound good</span>{" "}
            <span className="text-white/50">
              — notes snap to the palette, bass auto-harmonizes
            </span>
          </label>
        </div>

        {/* Rhythm grids */}
        {palette.rhythmGrids.length > 1 && (
          <div className="mt-3">
            <p className="text-xs text-white/50" id="rhythm-grid-label">
              Rhythm grid
            </p>
            <div className="mt-1 flex flex-wrap gap-1.5" role="group" aria-labelledby="rhythm-grid-label">
              {palette.rhythmGrids.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGridId(g.id)}
                  title={g.hint}
                  aria-pressed={grid.id === g.id}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
                    grid.id === g.id
                      ? "border-amber-300/60 bg-amber-300/15 text-amber-200"
                      : "border-white/15 bg-white/5 text-white/60 hover:border-white/30"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-white/40">{grid.hint}</p>
          </div>
        )}

        <div className="mt-3">
          <PracticeKeyboard from={palette.from} to={palette.to} onKey={addNote} lastTapped={lastTapped} />
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
                stopPlayback();
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
          {cantFailSetting && notes.length > 0 && " · snapped to " + palette.label}
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
              <ShareButtons name={c.name} notes={data.notes} />
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

/** Per-draft share actions: copy a listen-anywhere link, or export a WAV. */
function ShareButtons({ name, notes }: { name: string; notes: number[] }) {
  const [copied, setCopied] = useState(false);
  const [rendering, setRendering] = useState(false);

  const share = async () => {
    const url = shareUrl(name, notes);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy this link to share the melody:", url);
    }
  };

  const exportWav = async () => {
    setRendering(true);
    try {
      const blob = await renderCreationWav(notes);
      const safe = name.replace(/[^\w\- ]+/g, "").trim() || "melody";
      downloadBlob(blob, `${safe}.wav`);
    } finally {
      setRendering(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void share()}
        className="rounded-lg border border-white/20 px-3 py-1 text-sm"
      >
        {copied ? "Copied!" : "Share"}
      </button>
      <button
        type="button"
        onClick={() => void exportWav()}
        disabled={rendering || notes.length === 0}
        className="rounded-lg border border-white/20 px-3 py-1 text-sm disabled:opacity-50"
      >
        {rendering ? "…" : "WAV"}
      </button>
    </>
  );
}
