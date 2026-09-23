import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useStore } from "../lib/game/store.ts";
import { exportSave } from "../lib/game/schema.ts";
import { setMotionPolicy } from "../lib/game/effects.ts";
import { setMuted, setVolume } from "../lib/game/audio.ts";

export function SettingsScreen() {
  const save = useStore((s) => s.save);
  const updateSettings = useStore((s) => s.updateSettings);
  const replaceSave = useStore((s) => s.replaceSave);
  const resetSave = useStore((s) => s.resetSave);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const applyMotion = (patch: Partial<typeof save.settings>) => {
    const next = { ...save.settings, ...patch };
    updateSettings(patch);
    setMotionPolicy({
      reducedMotion: next.reducedMotion,
      highContrast: next.highContrast,
      focusMode: next.focusMode,
      muted: next.muted,
    });
  };

  const doExport = () => {
    const blob = new Blob([exportSave(save)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "harmony-knight-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const doImport = async (file: File) => {
    const text = await file.text();
    // Validate first; only with explicit confirmation do we replace.
    const ok = window.confirm(
      "Replace your current progress with this backup? Your current progress will be overwritten.",
    );
    if (!ok) {
      setImportMsg("Import cancelled — your progress is untouched.");
      return;
    }
    const result = replaceSave(text);
    setImportMsg(result.ok ? "Backup imported." : result.reason);
  };

  const s = save.settings;
  return (
    <div className="mx-auto max-w-2xl p-4 pb-16 sm:p-6">
      <nav className="text-sm text-white/50">
        <Link to="/" className="underline">Home</Link>
      </nav>
      <h1 className="mt-2 text-2xl font-bold">Settings</h1>

      <section className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="font-semibold">Comfort & access</h2>
        <Toggle label="Focus mode (collapse game challenges, hide scores)" checked={s.focusMode} onChange={(v) => applyMotion({ focusMode: v })} />
        <Toggle label="High contrast" checked={s.highContrast} onChange={(v) => applyMotion({ highContrast: v })} />
        <Toggle label="Reduced motion" checked={s.reducedMotion} onChange={(v) => applyMotion({ reducedMotion: v })} />
        <label className="flex items-center justify-between gap-4">
          <span>Session length (minutes)</span>
          <input
            type="number"
            min={1}
            max={60}
            value={s.sessionMinutes}
            onChange={(e) => updateSettings({ sessionMinutes: Math.max(1, Math.min(60, Number(e.target.value) || 3)) })}
            className="w-20 rounded-lg border border-white/20 bg-black/40 px-2 py-1 text-right"
          />
        </label>
      </section>

      <section className="mt-4 space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="font-semibold">Audio</h2>
        <Toggle
          label="Mute all sound"
          checked={s.muted}
          onChange={(v) => {
            updateSettings({ muted: v });
            setMuted(v);
            applyMotion({ muted: v });
          }}
        />
        <label className="flex items-center justify-between gap-4">
          <span>Volume</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={s.volume}
            onChange={(e) => {
              const v = Number(e.target.value);
              updateSettings({ volume: v });
              setVolume(v);
            }}
            className="w-40"
          />
        </label>
        <label className="flex items-center justify-between gap-4">
          <span>Teaching playback speed</span>
          <select
            value={s.playbackSpeed}
            onChange={(e) => updateSettings({ playbackSpeed: Number(e.target.value) as 1 | 0.75 | 0.5 })}
            className="rounded-lg border border-white/20 bg-black/40 px-2 py-1"
          >
            <option value={1}>Normal</option>
            <option value={0.75}>Three-quarter</option>
            <option value={0.5}>Half</option>
          </select>
        </label>
      </section>

      <section className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="font-semibold">Progress backup</h2>
        <p className="text-sm text-white/60">
          Progress lives in this browser. Export a backup file and keep it somewhere durable.
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={doExport} className="rounded-lg bg-indigo-500 px-4 py-2 font-semibold">
            Export backup
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} className="rounded-lg border border-white/20 px-4 py-2">
            Import backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void doImport(f);
              e.target.value = "";
            }}
          />
        </div>
        {importMsg && <p className="text-sm text-amber-200">{importMsg}</p>}
      </section>

      <section className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/5 p-4">
        <h2 className="font-semibold text-red-200">Danger zone</h2>
        {!confirmReset ? (
          <button type="button" onClick={() => setConfirmReset(true)} className="mt-2 rounded-lg border border-red-400/40 px-4 py-2 text-red-200">
            Reset all progress
          </button>
        ) : (
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => { resetSave(); setConfirmReset(false); }} className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white">
              Yes, erase everything
            </button>
            <button type="button" onClick={() => setConfirmReset(false)} className="rounded-lg border border-white/20 px-4 py-2">
              Keep my progress
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 rounded-full transition-colors ${checked ? "bg-indigo-500" : "bg-white/20"}`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${checked ? "left-6" : "left-1"}`}
        />
      </button>
    </label>
  );
}
