# Sprint 1 — Core Progression Loop

**Goal:** Wire the core feedback cycle end-to-end so the game can advance grades,
reward duel victories, and handle Broken Blade — the three mechanisms that give
the player a sense of progression.

**Sprint Date:** 2026-05-29  
**Review Mode:** solo  
**Stage:** Production (brownfield)

---

## Must-Have

### S1-M1 — Grade Advancement Thresholds

**Why now:** Grade level exists in `PlayerProgress` but nothing ever changes it.
Without this, the curriculum map is decorative.

**Acceptance criteria:**
- `PlayerProgressNotifier` exposes `void checkAndAdvanceGrade()` that reads current
  session accuracy and advances `gradeLevel` when the threshold is met
- Thresholds (derived from `design/gdd/curriculum-system.md` [GAP] — solo decision):
  - Grade 0 → 1: 80% on ≥10 notes, session accuracy ≥70%
  - Grade 1–4 → next: 85% on ≥20 notes, session accuracy ≥75%
  - Grade 5+ → next: 90% on ≥30 notes, session accuracy ≥80%
- `checkAndAdvanceGrade()` is called at the end of a `PracticeScreen` session (on
  the "Session Summary" dismiss or when the session ends naturally)
- Grade never decreases (only increases via this method)
- Threshold config is a `const Map<int, GradeThreshold>` in a new
  `lib/engine/curriculum/grade_thresholds.dart` — not hardcoded in the notifier
- `PlayerProgress` gets a `void setGradeLevel(int level)` method on the notifier
  (already stubbed — wire it up with persistence call)

**Files touched:**
- `lib/engine/curriculum/grade_thresholds.dart` (new)
- `lib/providers/scaffolding_provider.dart` — `checkAndAdvanceGrade()` + `setGradeLevel()`
- `lib/screens/practice_screen.dart` — call `checkAndAdvanceGrade()` on session end
- `lib/models/player_progress.dart` — add `sessionNoteCount`, `sessionCorrectCount` (ephemeral session stats)

**ADR reference:** ADR-0002 (mutations via notifier methods only)

---

### S1-M2 — Broken Blade Auto-Exit

**Why now:** `PlayerProgress.brokenblade` flag is set on launch when absence ≥48h,
but `PracticeScreen` never reads it. The warm-up mission runs forever.

**Acceptance criteria:**
- When `PlayerProgress.brokenBlade == true`, `PracticeScreen` caps the session at
  5 correct answers (the warm-up mission length per GDD)
- On reaching the cap, screen shows a brief "Blade Restored!" message, then pops
  back to Home
- `PlayerProgressNotifier.clearBrokenBlade()` is called when the cap is reached;
  this sets `brokenBlade = false` and saves to disk
- The cap is a `const int kBrokenBladeMissionLength = 5` in
  `lib/engine/curriculum/grade_thresholds.dart` (same file as S1-M1)
- Regular sessions (non-broken-blade) are not affected

**Files touched:**
- `lib/engine/curriculum/grade_thresholds.dart` — `kBrokenBladeMissionLength`
- `lib/providers/scaffolding_provider.dart` — `clearBrokenBlade()` method
- `lib/screens/practice_screen.dart` — read `brokenBlade`, cap correct-answer counter
- `lib/models/player_progress.dart` — confirm `brokenBlade: bool` field exists (add if missing)

**ADR reference:** ADR-0002, ADR-0003

---

### S1-M3 — Harmony Points Awarded on Duel Completion

**Why now:** `DuelState.harmonyMeter` fills correctly but `PlayerProgress.harmonyPoints`
is never incremented when a duel ends.

**Acceptance criteria:**
- When `DuelNotifier` completes a duel (`isComplete == true`), it calls
  `ref.read(playerProgressProvider.notifier).addHarmonyPoints(points)` where
  `points = (duelState.harmonyMeter * 100).round()`
- Minimum award is 1 point (meter can be near-zero if player used many ghosts)
- `addHarmonyPoints(int delta)` is a new method on `PlayerProgressNotifier` that
  increments `harmonyPoints` and saves
- Points are shown on the duel completion screen (already has a summary widget —
  add a "Harmony Points earned: +42" line)
- Points are NOT awarded if the duel was exited early (back button)

**Files touched:**
- `lib/providers/scaffolding_provider.dart` — `addHarmonyPoints(int delta)`
- `lib/providers/duel_provider.dart` — call `addHarmonyPoints` on completion
- `lib/screens/duel_screen.dart` — display earned points in completion summary
- `lib/models/player_progress.dart` — confirm `harmonyPoints: int` field (add if missing)

**ADR reference:** ADR-0002 (cross-notifier calls via `ref.read` are allowed for one-shot mutations)

---

## Should-Have

### S1-S1 — Level-Up Fanfare

**Why:** Grade advancement is silent. ADHD learners need a clear, celebratory
acknowledgment to register progress.

**Acceptance criteria:**
- On grade advance, `PracticeScreen` shows a full-screen overlay for 2.5 seconds:
  "Grade 3 Unlocked!" with the grade colour from the curriculum map
- Overlay uses an `AnimatedOpacity` fade-in / fade-out (no external animation library)
- After the overlay dismisses, normal session flow resumes (or session ends if
  the practice session was already complete)
- No audio required for MVP (hook exists for later)

**Files touched:**
- `lib/screens/practice_screen.dart` — overlay widget + trigger on grade advance

---

### S1-S2 — Ghost Note Visual Treatment

**Why:** Ghost suggestions appear as text only. The GDD specifies ghost notes should
render distinctly in `ScaffoldingNotePainter` (translucent, dashed border).

**Acceptance criteria:**
- `ScaffoldingNotePainter` accepts an optional `bool isGhost = false` parameter
- When `isGhost == true`: note circle is painted at 40% opacity; border is dashed
  (4dp dash, 4dp gap using `PathMetrics`)
- `DuelScreen` passes `isGhost: true` for the ghost suggestion note button
- Visual is consistent across all scaffolding levels (Figurenotes through Maestro)

**Files touched:**
- `lib/widgets/scaffolding_note_painter.dart` — `isGhost` flag + dashed border logic
- `lib/screens/duel_screen.dart` — pass `isGhost: true` to ghost suggestion button

---

### S1-S3 — Document Duel → Grade Advancement Relationship

**Why:** The GDD leaves this open (`[GAP]`). The decision needs to be made and
written before stories are created that depend on it, or future sprints will conflict.

**Acceptance criteria:**
- A decision is recorded as an ADR addendum or GDD update (not a full ADR):
  - Option A: Duels contribute session notes to the grade advancement counter
  - Option B: Duels award Harmony Points only; grade advances via practice only
  - Option C: Duels unlock grade gates independently (separate threshold)
- One option is chosen, rationale written, `design/gdd/curriculum-system.md` updated
  in the [GAP] section with the decision and "Decided: 2026-05-29"

**Files touched:**
- `design/gdd/curriculum-system.md` — resolve [GAP] for duel contribution

---

## Nice-to-Have

### S1-N1 — Widget Tests for PracticeScreen and DuelScreen

**Acceptance criteria:**
- `test/screens/practice_screen_test.dart`: loads grade 0 pool, taps correct answer,
  asserts streak increments; taps wrong answer, asserts no increment
- `test/screens/duel_screen_test.dart`: provider override with a mid-duel `DuelState`,
  asserts ghost suggestion renders when `ghostSuggestion != null`

---

### S1-N2 — Sentinel Narrative Moment on Harmony Meter Fill

**Why:** The GDD describes the Discord Sentinel as a teacher wearing villain clothes.
When the Harmony Meter fills (≥1.0), the Sentinel should acknowledge the player.

**Acceptance criteria:**
- When `DuelState.harmonyMeter >= 1.0`, `DuelScreen` shows a one-line Sentinel quote
  overlay: e.g., "Hmm. Your intervals are… acceptable." (tone: grudging respect)
- 3 rotating quotes, chosen by `harmonyPoints % 3` for determinism
- No external dialog system — simple `AnimatedContainer` toast at top of screen

---

## Definition of Done

- All Must-Have tasks: implemented, manually tested on Windows desktop, no Dart
  analysis errors (`dart analyze`)
- Should-Have S1-S3: written (document only, no code)
- Git: all changes committed to `main` with clear commit messages
- `production/sprint-status.yaml`: all M tasks marked `done`

## Out of Scope for Sprint 1

- Microphone / real-time engine wiring (blocked on `FrameDriver` integration — ADR-0001)
- Cloud sync / teacher dashboard
- Circle of Fifths screen
- Spaced repetition scheduler connection (AdaptiveAnalyzer)
- iOS / Android platform testing (Windows desktop only for Sprint 1)
