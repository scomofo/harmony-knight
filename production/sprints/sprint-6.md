# Sprint 6 — Reward Loop Closure

**Goal:** Wire the reward feedback that's been silent — answer audio tones, harmony
points earned during practice, Fever Mode multiplier applied to point awards, and
BPM control for rhythm exercises.

**Sprint Date:** 2026-05-29
**Review Mode:** solo
**Stage:** Production (brownfield)

---

## Must-Have

### S6-M1 — Answer Audio Feedback

**Why now:** When a player answers correctly or incorrectly in PracticeScreen,
nothing sounds. Ghost tones scaffold pitch-finding before the question, but
there is no reward tone and no error signal after the answer. Audio reinforcement
is essential for musical learning — silence on a correct answer breaks the
feedback loop.

**Acceptance criteria:**
- `lib/engine/sound_feedback_service.dart` (new) — `SoundFeedbackService` class
- At `initialize()`: generates two WAV clips via `ToneGenerator` + `samplesToWav`
  + `loadMem` (same pattern as MetronomeService):
  - Correct: MIDI 64 (E4), 300ms sine tone, vol 0.65
  - Wrong: MIDI 41 (F2), 150ms sine tone, vol 0.5
- `playCorrect()` — plays the correct clip; no-op if not initialized
- `playWrong()` — plays the wrong clip; no-op if not initialized
- `soundFeedbackProvider` added to `lib/providers/audio_provider.dart`
- `AudioInitNotifier.initialize()` also calls `soundFeedback.initialize()`
- `PracticeScreen._processAnswer()`: correct path → `playCorrect()`;
  wrong path → `playWrong()`

**Files touched:**
- `lib/engine/sound_feedback_service.dart` (new)
- `lib/providers/audio_provider.dart` — add `soundFeedbackProvider`, init
- `lib/screens/practice_screen.dart` — wire both calls in `_processAnswer()`

---

### S6-M2 — Rhythm BPM Chooser

**Why now:** `RhythmScreen` is hardcoded at 60 BPM. The GDD specifies 40–120 BPM.
Beginners need 40–60; advancing players want 80+. Without control, the screen is
a one-difficulty exercise.

**Acceptance criteria:**
- On first entry to `RhythmScreen`, show a BPM picker overlay before the metronome
  starts; the exercise does not begin until the player confirms
- 5 BPM presets displayed as large tappable chips: 40 / 60 / 80 / 100 / 120
- Default selected: 60; currently selected chip is highlighted in purple
- A "Start" button confirms selection and dismisses the overlay
- Selected BPM is stored in `_selectedBpm` state (no SharedPrefs persistence)
- `MetronomeService.start()` is called with `_selectedBpm` instead of the
  hardcoded constant; `_bpm` field removed from constants
- Overlay respects `reduceMotion` (no animated entrance if true)

**Files touched:**
- `lib/screens/rhythm_screen.dart` — `_selectedBpm` state, BPM picker overlay,
  `_bpmChosen` flag; `start()` called after confirmation

---

### S6-M3 — Practice Harmony Point Awards

**Why now:** Practice never awards harmony points. The star counter on HomeScreen
only goes up after winning a duel. Players who focus on Practice see no star
progression, breaking the reward loop.

**Acceptance criteria:**
- Each correct answer in `PracticeScreen` awards 1 harmony point base
- During Fever Mode, base is multiplied by `fever.streakMultiplier` (rounded to
  nearest int, minimum 1)
- Wrong answers award 0 points (no penalty)
- Call `ref.read(playerProgressProvider.notifier).addHarmonyPoints(pts)` in
  `_processAnswer()` on the correct branch, after updating the SR response
- `PlayerProgressNotifier` already has `addHarmonyPoints()` — no model changes
- Points accumulate per session; total visible on HomeScreen star counter

**Files touched:**
- `lib/screens/practice_screen.dart` — `addHarmonyPoints(pts)` call in correct
  branch of `_processAnswer()`

---

## Should-Have

### S6-S1 — Fever Mode Haptic + Duel Multiplier

**Why:** `streakMultiplier` is displayed in the banner but never applied to any
point award. And there is no haptic signal when Fever Mode first activates — ADHD
players benefit from the multi-modal cue (audio, visual, haptic together).

**Acceptance criteria:**
- `PracticeScreen`: `ref.listen(feverProvider, ...)` detects the transition
  `prev.isFeverActive == false → next.isFeverActive == true`; calls
  `HapticEngine.feverModeActivation()` on that transition only
- `duel_provider._awardDuelRewards()`: reads `feverProvider` state; multiplies
  `points` by `fever.streakMultiplier.round()` before awarding
- Both changes are gated behind existing null-safety and mounted checks

**Files touched:**
- `lib/screens/practice_screen.dart` — `ref.listen` for fever activation haptic
- `lib/providers/duel_provider.dart` — multiply points by fever multiplier

---

### S6-S2 — Rhythm Session Recording

**Why:** Rhythm sessions produce no data for the heatmap or session history.
PersistenceService.recordSession() already handles any exerciseType string.

**Acceptance criteria:**
- When `_beatsDone >= _totalBeats` in `RhythmScreen`, call
  `PersistenceService().recordSession(SessionRecord(...))` with:
  - `exerciseType: 'rhythm'`
  - `durationSeconds`: seconds elapsed since `_sessionStartTime`
  - `accuracy`: `_totalPoints / _maxPoints` (0.0 if `_maxPoints == 0`)
  - `gradeLevel`: `ref.read(playerProgressProvider).gradeLevel`
  - `confidenceAtStart` / `confidenceAtEnd`: `ref.read(confidenceProvider)` at
    init and at completion
- `_sessionStartTime` recorded in `initState`

**Files touched:**
- `lib/screens/rhythm_screen.dart` — `_sessionStartTime`, `_confidenceAtStart`,
  persistence call on session complete

---

## Nice-to-Have

### S6-N1 — High Contrast Mode

Wire Settings "High Contrast Mode" toggle to `'high_contrast_enabled'` SharedPrefs
(default `false`). Add `HighContrastNotifier extends StateNotifier<bool>` to
`scaffolding_provider.dart`. In `HomeScreen` and `PracticeScreen`, watch the
provider: when true, swap `Color(0xFF0D1117)` → `Colors.black` and dim-white
text → `Colors.white` for maximum contrast.

### S6-N2 — Duel Answer Audio Feedback

Wire `SoundFeedbackService` into `DuelScreen`. Use `ref.listen(duelProvider, ...)`
to detect when `turnHistory` gains a new entry; read the last entry's `wasCorrect`
flag and call `playCorrect()` or `playWrong()` accordingly.

---

## Definition of Done

- S6-M1: audible tone on correct answer; different tone on wrong; no tone if audio
  not initialized
- S6-M2: BPM picker appears before exercise; selected BPM drives the metronome;
  "60" pre-selected
- S6-M3: harmony point star counter increments during practice; faster during Fever
- S6-S1: haptic fires exactly once when fever activates; duel rewards multiplied
- S6-S2: rhythm sessions appear in HeatmapScreen session history
- Sprint status YAML updated
