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

/** Diatonic steps above C0: C=0, D=1, E=2, F=3, G=4, A=5, B=6 per octave. */
function diatonicSteps(midi: number): number {
  const pc = ((midi % 12) + 12) % 12;
  const step = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6][pc]!;
  return Math.floor(midi / 12) * 7 + step;
}

function StaffVisual({ visual }: { visual: Extract<LessonVisual, { kind: "staff" }> }) {
  const bass = visual.clef === "bass";
  // Bottom-line pitch: E4 (treble) or G2 (bass). The staff spans 8 diatonic steps.
  const anchor = bass ? 43 : 64;
  const anchorSteps = diatonicSteps(anchor);
  const lineGap = 16;
  const bottomLineY = 96;
  const stepY = (steps: number) => bottomLineY - (steps - anchorSteps) * (lineGap / 2);
  const yFor = (midi: number) => stepY(diatonicSteps(midi));
  const width = Math.max(220, visual.notes.length * 64 + 60);
  const top = Math.min(...visual.notes.map(yFor), 16) - 24;
  const height = 140 - top;
  const xFor = (i: number) => 70 + i * 64;
  // Ledger lines: every line position outside the staff, up to the note itself.
  const ledgers: { x: number; y: number }[] = [];
  visual.notes.forEach((midi, i) => {
    const s = diatonicSteps(midi);
    for (let l = anchorSteps - 2; l >= s; l -= 2) ledgers.push({ x: xFor(i), y: stepY(l) - top });
    for (let l = anchorSteps + 10; l <= s; l += 2) ledgers.push({ x: xFor(i), y: stepY(l) - top });
  });
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-md" role="img" aria-label="Staff notation">
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={i} x1={8} x2={width - 8} y1={bottomLineY - i * lineGap - top} y2={bottomLineY - i * lineGap - top} stroke="#ccc" strokeWidth={1.5} />
      ))}
      <text x={14} y={bottomLineY - (bass ? 3 : 4) * lineGap + 12 - top} fontSize={30} fill="#ccc">
        {bass ? "𝄢" : "𝄞"}
      </text>
      {ledgers.map((l, i) => (
        <line key={`ledger-${i}`} x1={l.x - 18} x2={l.x + 18} y1={l.y} y2={l.y} stroke="#ccc" strokeWidth={1.5} />
      ))}
      {visual.notes.map((midi, i) => {
        const x = xFor(i);
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
