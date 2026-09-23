import type { LessonVisual } from "../../lib/game/course.ts";
import { figurenoteColor, midiToName } from "../../lib/game/music.ts";

/** Typed SVG renderers for lesson visuals. Restrained by design: no decor. */
export function LessonVisualView({ visual }: { visual: LessonVisual }) {
  if (visual.kind === "keyboard") return <KeyboardVisual visual={visual} />;
  return <StaffVisual visual={visual} />;
}

function KeyboardVisual({ visual }: { visual: Extract<LessonVisual, { kind: "keyboard" }> }) {
  const keys: { midi: number; black: boolean }[] = [];
  for (let m = visual.from; m <= visual.to; m++) {
    const pc = ((m % 12) + 12) % 12;
    keys.push({ midi: m, black: [1, 3, 6, 8, 10].includes(pc) });
  }
  const whiteKeys = keys.filter((k) => !k.black);
  const w = 28;
  const width = whiteKeys.length * w;
  let wi = 0;
  return (
    <svg viewBox={`0 0 ${width} 110`} className="w-full max-w-md" role="img" aria-label="Piano keyboard">
      {keys.map((k) => {
        const lit = visual.highlight.includes(k.midi);
        if (!k.black) {
          const x = wi++ * w;
          return (
            <g key={k.midi}>
              <rect x={x} y={0} width={w - 2} height={110} rx={4} fill={lit ? figurenoteColor(k.midi) : "#f5f5f5"} stroke="#333" />
              <text x={x + w / 2 - 1} y={100} fontSize={10} textAnchor="middle" fill={lit ? "#fff" : "#666"}>
                {midiToName(k.midi).replace(/\d/, "")}
              </text>
            </g>
          );
        }
        const x = wi * w - 9;
        return <rect key={k.midi} x={x} y={0} width={18} height={66} rx={3} fill={lit ? figurenoteColor(k.midi) : "#222"} stroke="#000" />;
      })}
    </svg>
  );
}

function StaffVisual({ visual }: { visual: Extract<LessonVisual, { kind: "staff" }> }) {
  // Simple treble-staff plot: each semitone = 4px, E4 (64) sits on the bottom line.
  const lineGap = 16;
  const bottomLineY = 96;
  const yFor = (midi: number) => bottomLineY - (midi - 64) * (lineGap / 2);
  const width = Math.max(220, visual.notes.length * 64 + 60);
  const top = Math.min(...visual.notes.map(yFor), 16) - 24;
  const height = 140 - top;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-md" role="img" aria-label="Staff notation">
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={i} x1={8} x2={width - 8} y1={bottomLineY - i * lineGap - top} y2={bottomLineY - i * lineGap - top} stroke="#ccc" strokeWidth={1.5} />
      ))}
      <text x={14} y={bottomLineY - 4 * lineGap + 12 - top} fontSize={30} fill="#ccc">
        𝄞
      </text>
      {visual.notes.map((midi, i) => {
        const x = 70 + i * 64;
        const y = yFor(midi) - top;
        return (
          <g key={i}>
            <ellipse cx={x} cy={y} rx={11} ry={8} fill={figurenoteColor(midi)} stroke="#111" strokeWidth={1} transform={`rotate(-18 ${x} ${y})`} />
            <text x={x} y={y + 26} fontSize={11} textAnchor="middle" fill="#fff">
              {visual.labels?.[i] ?? midiToName(midi).replace(/\d/, "")}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
