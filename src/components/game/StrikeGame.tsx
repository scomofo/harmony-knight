/**
 * StrikeGame: the rhythm-striking game.
 *
 * Four lanes (C-D-E-G); notes fall toward the hit line on the chart's
 * schedule while the melody plays through the shared audio engine.
 * Strike a lane with D/F/J/K or by tapping. Pure chart/judgment/scoring
 * logic lives in lib/game/strike.ts; this component owns rendering,
 * input, the clock, pause, and cleanup.
 *
 * Pause freezes input and presentation together; navigating away or
 * hiding the tab pauses; unmount cancels all scheduled audio.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GOOD_WINDOW_MS,
  STRIKE_LANE_KEYS,
  buildStrikeChart,
  judgeStrikeHit,
  scoreStrike,
  type StrikeChart,
  type StrikeJudgment,
  type StrikeScore,
} from "../../lib/game/strike.ts";
import { playTone, stopLane } from "../../lib/game/audio.ts";
import { emitEffect } from "../../lib/game/effects.ts";
import { useStore } from "../../lib/game/store.ts";
import { FEVER_THRESHOLD } from "../../lib/game/curriculum.ts";

const LANE_COLORS = ["#fbbf24", "#34d399", "#38bdf8", "#fb7185"];
const LANE_NAMES = ["C", "D", "E", "G"];
const TRAVEL_MS = 2200; // how long a note is visible before the hit line

export function StrikeGame({
  seed,
  noteCount = 24,
  compact = false,
  onFinish,
}: {
  seed?: number;
  noteCount?: number;
  compact?: boolean;
  onFinish?: (score: StrikeScore) => void;
}) {
  const reducedMotion = useStore((s) => s.save.settings.reducedMotion);
  const chartSeed = useMemo(
    () => seed ?? Math.floor(Math.random() * 1_000_000_000),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const chart: StrikeChart = useMemo(
    () => buildStrikeChart(chartSeed, noteCount),
    [chartSeed, noteCount],
  );

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<"ready" | "playing" | "paused" | "done">("ready");
  const [hud, setHud] = useState({ score: 0, combo: 0, fever: false, judged: 0 });
  const [result, setResult] = useState<StrikeScore | null>(null);

  const t0Ref = useRef(0); // performance.now() at chart time 0
  const elapsedRef = useRef(0); // chart ms elapsed when paused
  const judgedRef = useRef(new Map<number, StrikeJudgment>());
  const flashesRef = useRef<{ text: string; color: string; at: number }[]>([]);
  const rafRef = useRef(0);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const finishedRef = useRef(false);

  const H = compact ? 300 : 420;
  const HIT_Y_RATIO = 0.86;

  /* ---------------- audio scheduling ---------------- */

  const scheduleFrom = useCallback(
    (fromMs: number) => {
      stopLane("strike");
      for (const [i, n] of chart.notes.entries()) {
        if (judgedRef.current.has(i)) continue;
        if (n.atMs < fromMs - 50) continue;
        playTone(n.midi, {
          lane: "strike",
          at: Math.max(0, (n.atMs - fromMs) / 1000),
          duration: 0.4,
        });
      }
    },
    [chart],
  );

  /* ---------------- judging ---------------- */

  const applyJudgment = useCallback(
    (index: number, judgment: StrikeJudgment) => {
      judgedRef.current.set(index, judgment);
      // Live score from judged notes in chart order (unjugded future notes
      // are not misses yet); the final tally uses the full chart.
      const judgedSoFar: StrikeJudgment[] = [];
      chart.notes.forEach((_, i) => {
        const j = judgedRef.current.get(i);
        if (j) judgedSoFar.push(j);
      });
      const s = scoreStrike(judgedSoFar);
      let combo = 0;
      for (let k = judgedSoFar.length - 1; k >= 0 && judgedSoFar[k] !== "miss"; k--) {
        combo++;
      }
      const fever = combo >= FEVER_THRESHOLD;
      setHud({ score: s.score, combo, fever, judged: judgedRef.current.size });
      if (judgment !== "miss" && combo === FEVER_THRESHOLD) {
        emitEffect({ event: "fever", cancelKey: "strike" });
      }
      flashesRef.current.push({
        text: judgment === "perfect" ? "PERFECT" : judgment === "good" ? "Good" : "Miss",
        color: judgment === "perfect" ? "#fbbf24" : judgment === "good" ? "#34d399" : "#71717a",
        at: performance.now(),
      });
    },
    [chart],
  );

  const strikeLane = useCallback(
    (lane: number) => {
      if (phaseRef.current !== "playing") return;
      const now = performance.now() - t0Ref.current;
      let best = -1;
      let bestDelta = Infinity;
      chart.notes.forEach((n, i) => {
        if (n.lane !== lane || judgedRef.current.has(i)) return;
        const d = Math.abs(now - n.atMs);
        if (d < bestDelta) {
          bestDelta = d;
          best = i;
        }
      });
      if (best >= 0 && bestDelta <= GOOD_WINDOW_MS) {
        const j = judgeStrikeHit(now - chart.notes[best]!.atMs);
        applyJudgment(best, j);
        playTone(660 + lane * 110, { lane: "strike-sfx", duration: 0.07, gain: 0.25 });
      }
      // Whiffs (no note near) are ignored: no penalty, no reward.
    },
    [chart, applyJudgment],
  );

  /* ---------------- clock / loop ---------------- */

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    cancelAnimationFrame(rafRef.current);
    stopLane("strike");
    const ordered: StrikeJudgment[] = chart.notes.map(
      (_, i) => judgedRef.current.get(i) ?? "miss",
    );
    const s = scoreStrike(ordered);
    setResult(s);
    setPhase("done");
    emitEffect({ event: "phrase-win", cancelKey: "strike" });
    onFinish?.(s);
  }, [chart, onFinish]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const Hpx = canvas.height;
    const hitY = Hpx * HIT_Y_RATIO;
    const laneW = W / 4;
    const now = performance.now() - t0Ref.current;

    ctx.clearRect(0, 0, W, Hpx);
    // Lanes
    for (let l = 0; l < 4; l++) {
      ctx.fillStyle = l % 2 === 0 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.06)";
      ctx.fillRect(l * laneW, 0, laneW, Hpx);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = `${14 * (W / 400)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(
        `${LANE_NAMES[l]} · ${STRIKE_LANE_KEYS[l]!.toUpperCase()}`,
        l * laneW + laneW / 2,
        Hpx - 8,
      );
    }
    // Hit line
    ctx.fillStyle = "rgba(251,191,36,0.8)";
    ctx.fillRect(0, hitY - 2, W, 4);

    // Notes
    for (const [i, n] of chart.notes.entries()) {
      if (judgedRef.current.has(i)) continue;
      const dt = n.atMs - now;
      if (dt > TRAVEL_MS || dt < -GOOD_WINDOW_MS) continue;
      const y = hitY - (dt / TRAVEL_MS) * (hitY + 20);
      const x = n.lane * laneW + laneW / 2;
      ctx.beginPath();
      ctx.arc(x, y, laneW * 0.16, 0, Math.PI * 2);
      ctx.fillStyle = LANE_COLORS[n.lane]!;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      ctx.stroke();
    }

    // Hit flashes (skip travel animation under reduced motion, keep text)
    const fresh = performance.now();
    flashesRef.current = flashesRef.current.filter((f) => fresh - f.at < 700);
    ctx.textAlign = "center";
    ctx.font = `bold ${20 * (W / 400)}px sans-serif`;
    flashesRef.current.forEach((f, k) => {
      const age = (fresh - f.at) / 700;
      ctx.globalAlpha = 1 - age;
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, W / 2, hitY - 40 - k * 4 - (reducedMotion ? 0 : age * 24));
    });
    ctx.globalAlpha = 1;
  }, [chart, reducedMotion, H, HIT_Y_RATIO]);

  const loop = useCallback(() => {
    const now = performance.now() - t0Ref.current;
    // Auto-miss notes that sailed past the window.
    chart.notes.forEach((n, i) => {
      if (!judgedRef.current.has(i) && now - n.atMs > GOOD_WINDOW_MS) {
        applyJudgment(i, "miss");
      }
    });
    draw();
    if (now > chart.durationMs + 600) {
      finish();
      return;
    }
    rafRef.current = requestAnimationFrame(loop);
  }, [chart, draw, finish, applyJudgment]);

  const start = useCallback(() => {
    judgedRef.current.clear();
    flashesRef.current = [];
    finishedRef.current = false;
    setResult(null);
    setHud({ score: 0, combo: 0, fever: false, judged: 0 });
    elapsedRef.current = 0;
    t0Ref.current = performance.now();
    scheduleFrom(0);
    setPhase("playing");
    rafRef.current = requestAnimationFrame(loop);
  }, [loop, scheduleFrom]);

  const pause = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    elapsedRef.current = performance.now() - t0Ref.current;
    if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(rafRef.current);
    stopLane("strike");
    setPhase("paused");
  }, []);

  const resume = useCallback(() => {
    if (phaseRef.current !== "paused") return;
    t0Ref.current = performance.now() - elapsedRef.current;
    scheduleFrom(elapsedRef.current);
    setPhase("playing");
    rafRef.current = requestAnimationFrame(loop);
  }, [loop, scheduleFrom]);

  /* ---------------- lifecycle ---------------- */

  // Canvas sizing (DPR-aware).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.round(H * dpr);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [H]);

  // Keyboard input.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const idx = STRIKE_LANE_KEYS.indexOf(e.key.toLowerCase() as (typeof STRIKE_LANE_KEYS)[number]);
      if (idx >= 0) {
        e.preventDefault();
        strikeLane(idx);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [strikeLane]);

  // Tab hide pauses; unmount cancels everything.
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) pause();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(rafRef.current);
      stopLane("strike");
      stopLane("strike-sfx");
    };
  }, [pause]);

  /* ---------------- render ---------------- */

  return (
    <div data-testid="strike-game">
      <div className="relative">
        <canvas
          ref={canvasRef}
          style={{ height: H }}
          className="w-full rounded-xl border border-white/10 bg-neutral-950"
          aria-label="Strike highway: four lanes, notes fall toward the hit line"
        />
        <div className="pointer-events-none absolute left-2 top-2 flex gap-2 text-sm">
          <span className="rounded bg-black/60 px-2 py-1 font-semibold text-amber-200">
            {hud.score}
          </span>
          {hud.combo > 1 && (
            <span className="rounded bg-black/60 px-2 py-1 text-white/80">
              {hud.combo} combo
            </span>
          )}
          {hud.fever && (
            <span className="rounded bg-amber-400 px-2 py-1 font-bold text-neutral-900">
              FEVER ×2
            </span>
          )}
        </div>
      </div>

      {phase === "playing" && (
        <div className="mt-2 grid grid-cols-4 gap-2" role="group" aria-label="Strike lanes">
          {LANE_NAMES.map((name, i) => (
            <button
              key={name}
              type="button"
              onPointerDown={() => strikeLane(i)}
              className="rounded-xl border border-white/20 bg-white/5 py-3 text-lg font-bold"
              style={{ borderColor: `${LANE_COLORS[i]}66` }}
              aria-label={`Strike lane ${name}`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {phase === "ready" && (
          <button
            type="button"
            onClick={start}
            className="rounded-xl bg-amber-400 px-5 py-2 font-bold text-neutral-900"
          >
            ▶ Start striking
          </button>
        )}
        {phase === "playing" && (
          <button
            type="button"
            onClick={pause}
            className="rounded-xl border border-white/20 px-4 py-2"
          >
            Pause
          </button>
        )}
        {phase === "paused" && (
          <>
            <button
              type="button"
              onClick={resume}
              className="rounded-xl bg-amber-400 px-5 py-2 font-bold text-neutral-900"
            >
              Resume
            </button>
            <button
              type="button"
              onClick={start}
              className="rounded-xl border border-white/20 px-4 py-2"
            >
              Restart
            </button>
          </>
        )}
        {phase === "done" && result && (
          <button
            type="button"
            onClick={start}
            className="rounded-xl bg-amber-400 px-5 py-2 font-bold text-neutral-900"
          >
            Play again
          </button>
        )}
        {!compact && (
          <p className="text-xs text-white/40">
            Keys D F J K or tap the lanes · ±90ms perfect, ±180ms good · {FEVER_THRESHOLD}-combo
            fever doubles points
          </p>
        )}
      </div>

      {phase === "done" && result && (
        <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-4" role="status">
          <p className="text-lg font-bold">
            Score {result.score}{" "}
            {result.feverReached && <span className="text-amber-300">· fever reached!</span>}
          </p>
          <p className="mt-1 text-sm text-white/70">
            {result.perfect} perfect · {result.good} good · {result.miss} missed · best combo{" "}
            {result.maxCombo} · {Math.round(result.accuracy * 100)}% accuracy
          </p>
        </div>
      )}
    </div>
  );
}
