import { useEffect, useState } from "react";
import { useStore } from "../../lib/game/store.ts";

/**
 * Gentle break nudge wired to the "session length" setting.
 * Accumulates only while the tab is visible; dismissing restarts the clock.
 * Capped at a few nudges per day so it never nags. Announced through a
 * polite live region — it never steals focus, pauses a game, or blocks a
 * lesson.
 */
export const MAX_BREAK_REMINDERS_PER_DAY = 3;
const BREAK_COUNT_KEY = "harmony-knight-break-count-v1";

function todayKey(): string {
  // Device-local calendar day (not UTC): the cap is about the player's day.
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** How many break reminders have been shown today (device-local day). */
export function breaksShownToday(): number {
  try {
    const raw = localStorage.getItem(BREAK_COUNT_KEY);
    if (!raw) return 0;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return 0;
    const { date, count } = parsed as { date?: unknown; count?: unknown };
    if (date !== todayKey() || typeof count !== "number" || count < 0) return 0;
    return Math.floor(count);
  } catch {
    return 0;
  }
}

function recordBreakShown(): void {
  try {
    localStorage.setItem(
      BREAK_COUNT_KEY,
      JSON.stringify({ date: todayKey(), count: breaksShownToday() + 1 }),
    );
  } catch {
    /* break bookkeeping is best-effort; the reminder still works */
  }
}

export function BreakReminder() {
  const sessionMinutes = useStore((s) => s.save.settings.sessionMinutes);
  const onboarded = useStore((s) => s.save.onboarded);
  const [cycle, setCycle] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(false);
    if (!onboarded) return;
    let elapsed = 0;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      elapsed += 10;
      if (elapsed >= sessionMinutes * 60) {
        window.clearInterval(id);
        // Daily cap: once we've nudged enough today, stay quiet.
        if (breaksShownToday() >= MAX_BREAK_REMINDERS_PER_DAY) return;
        recordBreakShown();
        setShow(true);
      }
    }, 10_000);
    return () => window.clearInterval(id);
  }, [sessionMinutes, cycle, onboarded]);

  if (!show) return null;
  return (
    <div role="status" className="mx-auto mt-2 max-w-2xl px-4">
      <div className="flex items-center gap-3 rounded-xl border border-amber-300/40 bg-amber-400/10 p-3 text-sm">
        <p className="flex-1 text-amber-100">
          You&apos;ve been playing for {sessionMinutes} minute{sessionMinutes === 1 ? "" : "s"} —
          stretch, shake it out, and come back fresh.
        </p>
        <button
          type="button"
          onClick={() => {
            setShow(false);
            setCycle((c) => c + 1);
          }}
          className="shrink-0 rounded-lg bg-amber-400/25 px-3 py-1.5 font-semibold text-amber-100"
        >
          Keep playing
        </button>
      </div>
    </div>
  );
}
