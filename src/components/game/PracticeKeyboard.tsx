import { midiToLetter, midiToName } from "../../lib/game/music.ts";

/**
 * Interactive piano keyboard for practice drills.
 * Real buttons (keyboard + touch friendly), aria-labeled with note names.
 * Each white key is a relative wrapper so its black key overlays the boundary.
 */
export function PracticeKeyboard({
  from = 60,
  to = 72,
  onKey,
  disabled = false,
  lastTapped = null,
}: {
  from?: number;
  to?: number;
  onKey: (midi: number) => void;
  disabled?: boolean;
  /** Highlight the most recently tapped key. */
  lastTapped?: number | null;
}) {
  const whites: number[] = [];
  for (let m = from; m <= to; m++) {
    const pc = ((m % 12) + 12) % 12;
    if (![1, 3, 6, 8, 10].includes(pc)) whites.push(m);
  }
  return (
    <div className="flex select-none" role="group" aria-label="Piano keyboard, one octave">
      {whites.map((m) => {
        const pc = ((m % 12) + 12) % 12;
        const hasBlackAfter = [0, 2, 5, 7, 9].includes(pc) && m + 1 <= to;
        const lit = lastTapped === m;
        return (
          <div key={m} className="relative min-w-0 flex-1">
            <button
              type="button"
              disabled={disabled}
              aria-label={midiToName(m)}
              onClick={() => onKey(m)}
              className={`h-32 w-full rounded-b-lg border border-neutral-400 text-sm font-semibold sm:h-36 ${
                lit ? "bg-amber-300 text-neutral-900" : "bg-neutral-100 text-neutral-600"
              } disabled:opacity-60`}
            >
              <span className="align-bottom">{midiToLetter(m)}</span>
            </button>
            {hasBlackAfter && (
              <button
                type="button"
                disabled={disabled}
                aria-label={midiToName(m + 1)}
                onClick={() => onKey(m + 1)}
                className={`absolute -right-3.5 top-0 z-10 h-20 w-7 rounded-b-md border border-black sm:h-24 ${
                  lastTapped === m + 1 ? "bg-amber-400" : "bg-neutral-900"
                } disabled:opacity-60`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
