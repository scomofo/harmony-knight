import { useEffect, useState } from "react";
import { useStore } from "../../lib/game/store.ts";

/**
 * Gentle break nudge wired to the "session length" setting.
 * Accumulates only while the tab is visible; dismissing restarts the clock.
 * Announced through a polite live region — it never steals focus, pauses a
 * game, or blocks a lesson.
 */
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
        setShow(true);
        window.clearInterval(id);
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
