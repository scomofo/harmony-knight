# Sprint 3 — Feedback Loop Closure

**Goal:** Wire session recording (heatmap data), ghost tone audio (duel scaffolding),
and weak-note focus mode so the player's choices propagate through data and sound.

**Sprint Date:** 2026-05-29
**Review Mode:** solo
**Stage:** Production (brownfield)

---

## Must-Have

### S3-M1 — Session Recording in PracticeScreen

**Why now:** The Heatmap screen is fully built but always empty. `recordSession()`
is never called from `PracticeScreen`, so the parent/teacher dashboard has zero
data after any amount of play.

**Acceptance criteria:**
- `initState` records `_sessionStartTime = DateTime.now()`
- `_onExit()` calls `_persistence.recordSession(SessionRecord(...))` after the
  summary dialog, skipped when `_sessionTotal == 0`
- `exerciseType`: `'practice'` or `'broken_blade'` based on `widget.isBrokenBladeMode`
- `durationSeconds`: `DateTime.now().difference(_sessionStartTime).inSeconds`
- `accuracy`: `_sessionTotal > 0 ? _sessionCorrect / _sessionTotal : 0.0`
- `loadSessionHistory()` returns the new entry on the next Heatmap visit

**Files touched:**
- `lib/screens/practice_screen.dart` — `_sessionStartTime` field; `recordSession()` in `_onExit()`

---

### S3-M2 — Ghost Tone Audio on Duel Ghost Suggestion

**Why now:** The ghost suggestion is visually shown but completely silent. Ghost
tones are the primary audio scaffolding mechanism for ADHD learners in the Duel.
`GhostToneEngine` and `ghostToneProvider` exist and are fully implemented but never called.

**Acceptance criteria:**
- `DuelScreen` uses `ref.listen(duelProvider, (prev, next) { ... })` to detect
  when `ghostSuggestion` changes from null → non-null
- On that transition: calls `ghostToneProvider.playGhostTone(midiNote: next.ghostSuggestion!.midi, confidence: ref.read(confidenceProvider))`
- When `ghostSuggestion` clears (turn advances or new duel started): calls
  `ghostToneProvider.stopCurrentTone()`
- Audio failure does not crash the screen — `GhostToneEngine` already handles
  this gracefully (non-critical degradation)

**Files touched:**
- `lib/screens/duel_screen.dart` — `ref.listen(...)` + ghost tone calls

---

### S3-M3 — Weak-Note Focus Session

**Why now:** The home screen shows a "Focus area" hint listing weak notes, but
tapping it does nothing. `progress.weakNotesMidi` is populated and persisted;
`PracticeScreen` already supports arbitrary note pools — it just needs a route parameter.

**Acceptance criteria:**
- `_buildWeakNotesHint` in `HomeScreen` wraps its `Container` in a `GestureDetector`
  with `onTap: () => context.go('/practice?mode=focus')`
- `PracticeScreen` recognises `mode=focus`: note pool is built from
  `progress.weakNotesMidi` MIDI values
- If `weakNotesMidi` is empty at launch (race condition), silently falls back to
  grade pool
- AppBar title shows "Focus Session" when in focus mode
- Session summary, grade advancement, and SR updates all work normally
- Focus mode and Broken Blade mode are mutually exclusive: Broken Blade takes
  precedence (only route to focus when `!inBrokenBladeRecovery`)

**Files touched:**
- `lib/screens/home_screen.dart` — `_buildWeakNotesHint` gains `GestureDetector`
- `lib/screens/practice_screen.dart` — `mode=focus` pool setup; AppBar title

---

## Should-Have

### S3-S1 — Ghost Tone Toggle Persistence in Settings

**Why:** The "Ghost Tones" toggle in Settings is a stub — always shows `true`
and never saves. Players who disable ghost tones expect the setting to persist.

**Acceptance criteria:**
- `'ghost_tones_enabled'` key stored in `shared_preferences`
- Settings screen toggle reads the saved value on build and writes on change
- `DuelScreen` reads the flag before calling `playGhostTone`; skips when disabled
- Defaults `true` for new users (key absent → treat as enabled)

**Files touched:**
- `lib/providers/scaffolding_provider.dart` (add `ghostTonesEnabled` field + toggle)
  OR new `lib/providers/audio_prefs_provider.dart`
- `lib/screens/settings_screen.dart` — wire toggle
- `lib/screens/duel_screen.dart` — guard call with flag

---

### S3-S2 — Update duel-system.md Follow-Up Work

**Acceptance criteria:**
- Strike completed items: HP on duel completion (Sprint 1), ghost visual treatment
  (Sprint 1), ghost tone audio (Sprint 3)
- Add implementation note to Ghost Resolution section: audio now wired via
  `ghostToneProvider.playGhostTone()` in `DuelScreen`

**Files touched:**
- `design/gdd/duel-system.md`

---

## Nice-to-Have

### S3-N1 — Onboarding for New Users

Verify whether `onboarding_screen.dart` is shown on first launch. If not, wire it:
route to `/onboarding` when `progress.totalNotesPlayed == 0 && progress.gradeLevel == 0`.
An ADHD learner downloading for the first time should not land cold on the Home
screen with no context.

### S3-N2 — Widget Test for Focus Session

Verify `PracticeScreen` with `mode=focus` uses the weak-note pool rather than the
grade pool. Pattern: override `playerProgressProvider` with a `PlayerProgress`
that has non-empty `weakNotesMidi`, confirm question target comes from that list.

---

## Definition of Done

- All Must-Have tasks implemented, no Dart analysis errors
- S3-S1: ghost tone toggle survives app restart
- S3-S2: duel-system.md updated
- Sprint status YAML updated
