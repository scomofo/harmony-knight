/**
 * Lesson-complete celebration: a real arrival moment, not a toast.
 *
 * Animated rays + confetti + headline + stats. Reduced-motion users get
 * the same information statically (confetti hidden, pop becomes instant).
 */

const CONFETTI_COLORS = ["#fbbf24", "#34d399", "#a78bfa", "#f472b6", "#60a5fa", "#f97316"];
const CONFETTI_COUNT = 24;

function confettiStyle(i: number): React.CSSProperties {
  // Deterministic pseudo-random from the index — stable across renders.
  const r = (s: number) => {
    const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  return {
    left: `${r(1) * 100}%`,
    width: `${6 + r(2) * 6}px`,
    height: `${8 + r(3) * 8}px`,
    backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    animationDelay: `${r(4) * 0.9}s`,
    animationDuration: `${1.8 + r(5) * 1.2}s`,
    borderRadius: r(6) > 0.5 ? "50%" : "2px",
  };
}

export function LessonCelebration({
  lessonTitle,
  firstTry,
  total,
  earned,
}: {
  lessonTitle: string;
  firstTry: number;
  total: number;
  earned: number | null;
}) {
  const rate = total > 0 ? firstTry / total : 0;
  const headline =
    rate >= 1 ? "Flawless! 🌟" : rate >= 0.5 ? "Beautiful work! 🎉" : "You did it! 🎶";
  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-400/30 bg-gradient-to-b from-amber-500/15 to-transparent p-6">
      {/* Rotating rays behind the headline (decorative). */}
      <div
        aria-hidden
        className="hk-rays pointer-events-none absolute left-1/2 top-1/2 -z-0 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 opacity-20"
        style={{
          background:
            "repeating-conic-gradient(from 0deg, rgba(251,191,36,0.5) 0deg 6deg, transparent 6deg 18deg)",
          borderRadius: "50%",
          maskImage: "radial-gradient(circle, black 30%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(circle, black 30%, transparent 70%)",
        }}
      />
      {/* Confetti (hidden for reduced motion via CSS). */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: CONFETTI_COUNT }, (_, i) => (
          <span key={i} className="hk-confetti-piece" style={confettiStyle(i)} />
        ))}
      </div>
      <div className="hk-celebrate-pop relative">
        <div className="text-5xl" aria-hidden>
          🎼
        </div>
        <h2 className="mt-2 text-2xl font-bold">{headline}</h2>
        <p className="mt-1 text-white/70">{lessonTitle} — complete.</p>
        <div className="mt-4 flex justify-center gap-2 text-sm" role="status">
          <span className="rounded-full bg-emerald-500/20 px-3 py-1 font-semibold text-emerald-200">
            ✓ {firstTry}/{total} first try
          </span>
          {earned !== null && earned > 0 && (
            <span className="rounded-full bg-amber-500/20 px-3 py-1 font-semibold text-amber-300">
              +{earned} harmony points
            </span>
          )}
        </div>
        {earned === 0 && (
          <p className="mt-2 text-sm text-white/60">
            Revisits don&apos;t award points again — the knowledge is the reward.
          </p>
        )}
      </div>
    </div>
  );
}
