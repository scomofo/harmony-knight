# Sprint 5 — Rhythm Comes Alive

**Goal:** Implement the metronome audio engine, haptic beat feedback, and the Level 2
Rhythm Exercise screen (GDD is written — now we build it); clear the deferred
accessibility toggles from Sprint 4.

**Sprint Date:** 2026-05-29
**Review Mode:** solo
**Stage:** Production (brownfield)

---

## Must-Have

### S5-M1 — Metronome Audio Engine

**Why now:** `metronomeEnabled` persists from S4-S2 but the toggle does nothing.
The rhythm GDD (S4-S1) specifies the click sound, BPM range, and accent beat
behaviour. All audio infrastructure (SoLoud, ToneGenerator) is in place. This
is the unlock for everything rhythmic.

**Acceptance criteria:**
- `lib/engine/metronome_service.dart` (new) — `MetronomeService` class
- Generates two WAV sources at init: normal click (MIDI 76, 80ms, vol 0.6) and
  accent (MIDI 76, 80ms, vol 1.0) via `ToneGenerator.generateSineTone` + `samplesToWav`
- `start(int bpm, int beatsPerMeasure)` starts `Timer.periodic(60000 ~/ bpm ms)`
- `_onBeat()` plays accent source on beat 1, normal source on all others
- `lastBeatTimestamp` (millisecondsSinceEpoch at last beat) exposed for tap-offset calculation
- `stop()` cancels the timer; `dispose()` frees SoLoud sources
- Only plays when `metronomeEnabled` is true (read from `SessionPrefsNotifier`)
- No crash on Windows (SoLoud is already initialised by `GhostToneEngine` at app start)

**Files touched:**
- `lib/engine/metronome_service.dart` (new)

---

### S5-M2 — Haptic Beat Feedback

**Why now:** `hapticEnabled` persists but triggers nothing. `HapticEngine` already
implements `lightTap()` and `correctAnswer()`. One `_onBeat()` callback extension
completes the rhythm scaffolding loop.

**Acceptance criteria:**
- Beat 1 of each measure → `HapticEngine.correctAnswer()` (medium impact)
- All other beats → `HapticEngine.lightTap()` (light impact)
- Both calls guarded behind `hapticEnabled` from `SessionPrefsNotifier`
- Desktop (Windows): `HapticFeedback` is a no-op — no crash, no warning
- Haptic fires synchronously with audio on each beat

**Files touched:**
- `lib/engine/metronome_service.dart` (S5-M1 file — adds haptic calls to `_onBeat`)

---

### S5-M3 — Level 2 Rhythm Exercise Screen

**Why now:** The rhythm GDD (S4-S1) is fully specified. No screen exists.
Metronome audio (S5-M1) and haptic (S5-M2) provide the scaffolding outputs.
This is the first complete Level 2 exercise.

**Acceptance criteria:**
- `lib/screens/rhythm_screen.dart` (new), route `/rhythm`
- AppBar: "Rhythm Practice" with current beat count (e.g. "Beat 3 / 16")
- Beat indicator circle flashes on each metronome beat (skip flash when `reduceMotion`)
- 4 body-action buttons displayed: Sway / Nod / Tap / Snap (Body Base-10 labels from GDD)
- On button press: `offsetMs = now - lastBeatTimestamp`; score per timing windows:
  - ≤ 80ms → Perfect (3 pts)
  - 81–160ms → Good (2 pts)
  - 161–300ms → Late (1 pt)
  - > 300ms → Miss (0 pts)
- Wait-Mode on Miss: beat counter does not advance; exercise replays same beat
- Session ends after 16 beats; shows accuracy banner then `context.go('/')`
- `/rhythm` route added to `router.dart`
- `HomeScreen`: "Rhythm" card visible when `gradeLevel >= 1` (Level 2 unlocked)
- `MetronomeService` started in `initState`, stopped in `dispose`

**Files touched:**
- `lib/screens/rhythm_screen.dart` (new)
- `lib/core/router.dart` — `/rhythm` route
- `lib/screens/home_screen.dart` — Rhythm card (grade-gated)

---

## Should-Have

### S5-S1 — Reduce Motion Persistence and Use (deferred from S4-N1)

**Why now:** The Settings toggle exists but is a stub. `reduceMotion` is referenced
in the rhythm GDD (beat indicator flash) and by existing animations in Practice
and Duel screens. Wiring it now lets S5-M3 conditionally skip the flash without
a TODO.

**Acceptance criteria:**
- `'reduce_motion'` key added to `SessionPrefsNotifier` (default `false`)
- Settings "Reduce Motion" toggle reads/writes the live value and survives restart
- `PracticeScreen` level-up fanfare: when `reduceMotion` is true, skip
  `AnimatedOpacity` — show the grade card instantly, dismiss after 2.5s
- `DuelScreen` sentinel toast: skip `AnimatedContainer` entrance when `reduceMotion`
- `RhythmScreen` beat-indicator flash: skipped when `reduceMotion` (static colour change only)

**Files touched:**
- `lib/providers/session_prefs_provider.dart` — `reduceMotion` getter + setter
- `lib/screens/settings_screen.dart` — wire the Reduce Motion toggle
- `lib/screens/practice_screen.dart` — conditional fanfare animation
- `lib/screens/duel_screen.dart` — conditional sentinel toast animation

---

### S5-S2 — Circle of Fifths Grade-Gating (deferred from S4-N2)

**Why now:** The Circle of Fifths screen is reachable by any player. The curriculum
GDD specifies it unlocks at Level 3 (grade ≥ 3).

**Acceptance criteria:**
- `router.dart` redirect for `/circle-of-fifths`: if `gradeLevel < 3`, redirect to `/`
- The redirect reads progress directly from SharedPreferences (same pattern as
  the onboarding redirect — no provider access in router context)
- `CurriculumScreen` Level 3 card: shows "Explore →" `TextButton` only when `gradeLevel >= 3`
- When `gradeLevel < 3`: Level 3 card shows "Unlocks at Grade 3" label (grey, non-tappable)

**Files touched:**
- `lib/core/router.dart` — redirect for `/circle-of-fifths`
- `lib/screens/curriculum_screen.dart` — conditional Explore button

---

## Nice-to-Have

### S5-N1 — High Contrast Mode

Wire the "High Contrast Mode" Settings toggle (currently a stub) to SharedPreferences
(`'high_contrast_enabled'`, default `false`). Add `HighContrastNotifier extends
StateNotifier<bool>` to `scaffolding_provider.dart`. In `HomeScreen` and
`PracticeScreen`: when `highContrast` is true, swap `Color(0xFF0D1117)` → `Colors.black`
and dim text colours → `Colors.white`.

### S5-N2 — Widget Tests for Rhythm Screen

4 tests in `test/screens/rhythm_screen_test.dart`:
1. AppBar title shows "Rhythm Practice"
2. Tap within 80ms of a simulated beat → "Perfect" label
3. Tap within 160ms → "Good" label
4. Miss (> 300ms) → beat counter does not advance (Wait-Mode)

---

## Definition of Done

- S5-M1: metronome click audible at configured BPM; accent beat louder on beat 1
- S5-M2: haptic fires on each beat (verified on device); no crash on Windows
- S5-M3: Rhythm screen playable; Wait-Mode active on misses; accuracy shown at end
- S5-S1: Reduce Motion toggle survives restart; fanfare + sentinel toast skip animation
- S5-S2: `/circle-of-fifths` redirects to `/` when grade < 3; Curriculum Level 3 card gate works
- Sprint status YAML updated to `current_sprint: 5`
