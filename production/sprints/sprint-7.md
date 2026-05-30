# Sprint 7 — Polish Pass

**Goal:** Close the deferred items that have accumulated — fix the dead Reset button,
complete duel audio feedback, wire High Contrast Mode (deferred 3×), and add a
session score HUD so players see harmony points accumulate in real time.

**Sprint Date:** 2026-05-29
**Review Mode:** solo
**Stage:** Production (brownfield)

---

## Must-Have

### S7-M1 — Reset All Progress

**Why now:** The "Reset All Progress" button in Settings opens a confirmation dialog
but the confirm action does nothing. This is a visible bug — pressing "Reset" leaves
all data intact. For ADHD learners sharing a device, a working reset is essential.

**Acceptance criteria:**
- `_showResetDialog` confirm action calls, in order:
  1. `await PersistenceService().saveProgress(PlayerProgress(lastActiveAt: DateTime.now()))`
     — resets grade, streak, harmony points, weak notes to defaults
  2. `ref.read(srItemsProvider.notifier).clearAll()` — wipes SR schedule
  3. `SharedPreferences.getInstance()` then `.clear()` — removes all keys
     (confidence, session prefs, ghost tones, onboarding_done, reduce_motion, etc.)
- After reset: `context.go('/onboarding')` so the player sees the fresh-start flow
- `SettingsScreen` must be a `ConsumerWidget` (or `ConsumerStatefulWidget`) to
  access `ref` — currently it is; confirm before editing
- Dialog copy: "This will erase ALL progress, grades, streaks, and settings.
  This cannot be undone."

**Files touched:**
- `lib/screens/settings_screen.dart` — implement `_showResetDialog` confirm action

---

### S7-M2 — Duel Answer Audio Feedback (deferred S6-N2)

**Why now:** Practice and Rhythm both play feedback tones. Duel is silent on
correct/wrong note selection. The service (`SoundFeedbackService`) and provider
(`soundFeedbackProvider`) are fully built — this is pure wiring, ~10 lines.

**Acceptance criteria:**
- In `DuelScreen.build()`, add `ref.listen(duelProvider, (prev, next) { ... })`
  that fires when `next.turnHistory.length > (prev?.turnHistory.length ?? 0)`
- Read the last `TurnResult` in `next.turnHistory`; if it represents a valid
  note placement → `soundFeedbackProvider.playCorrect()`; invalid attempt →
  `soundFeedbackProvider.playWrong()`
- Guard: only fire if `prev != null` (skip the first build)
- Import `audio_provider.dart` into `duel_screen.dart`

**Files touched:**
- `lib/screens/duel_screen.dart` — `ref.listen` for turn result audio

---

### S7-M3 — High Contrast Mode (deferred S5-N1, S6-N1)

**Why now:** The Settings toggle has been a stub through three sprints. High Contrast
is an accessibility baseline for the ADHD target audience — some users genuinely
need it.

**Acceptance criteria:**
- `HighContrastNotifier extends StateNotifier<bool>` added to
  `scaffolding_provider.dart`; SharedPrefs key `'high_contrast_enabled'`,
  default `false`
- `highContrastProvider` added as a `StateNotifierProvider<HighContrastNotifier, bool>`
- Settings "High Contrast Mode" toggle (currently `(val) {}`) wired to
  `ref.read(highContrastProvider.notifier).toggle(val)`
- `HomeScreen`: watches `highContrastProvider`; when true:
  - `Scaffold.backgroundColor` → `Colors.black`
  - Quest banner gradient → solid `Color(0xFF1A0050)` (still dark, higher contrast)
  - Header text → `Colors.white` (already white, no change needed)
- `PracticeScreen`: watches `highContrastProvider`; when true:
  - `Scaffold.backgroundColor` → `Colors.black`
  - Feedback label colors unchanged (already bright)
- Value persists across restarts (verified by toggle + hot restart)

**Files touched:**
- `lib/providers/scaffolding_provider.dart` — `HighContrastNotifier`,
  `highContrastProvider`
- `lib/screens/settings_screen.dart` — wire High Contrast toggle
- `lib/screens/home_screen.dart` — conditional background + banner
- `lib/screens/practice_screen.dart` — conditional background

---

## Should-Have

### S7-S1 — Session Score HUD in PracticeScreen

**Why:** Players earn harmony points during practice but see no in-session feedback.
The star counter on HomeScreen updates only after the session ends. A running
counter reinforces the reward loop in real time — important for ADHD engagement.

**Acceptance criteria:**
- `int _sessionPoints = 0` field added to `_PracticeScreenState`
- On each correct answer in `_handleAnswer()`, `_sessionPoints += pts` alongside
  the existing `addHarmonyPoints(pts)` call
- AppBar actions: add a `Row` showing `Icon(Icons.star, color: Color(0xFFFFD54F))`
  + `Text('+$_sessionPoints')` in gold, left of the existing streak display
- Shows `+0` at session start; increments live with each correct answer
- Resets on dispose (session-scoped only — not persisted)

**Files touched:**
- `lib/screens/practice_screen.dart` — `_sessionPoints` field, AppBar display,
  increment in `_handleAnswer()`

---

### S7-S2 — Engagement Data Recording

**Why:** The HeatmapScreen loads `EngagementPoint` data but none is ever written.
Every practice session ends with no heatmap contribution — the screen always shows
empty for its most interesting sections (hyperfocus triggers, off-task topics).

**Acceptance criteria:**
- In `PracticeScreen._onExit()`, after `recordSession()`, also call
  `_persistence.recordEngagement(EngagementPoint(...))` with:
  - `topic`: `'focus'` if `isFocusMode`, else `'note_id'`
  - `timestamp`: `_sessionStartTime`
  - `focusDuration`: `_elapsed.inSeconds.toDouble()`
  - `wasHyperfocused`: accuracy ≥ 0.95 AND `_elapsed.inMinutes >= 10`
  - `wasOffTask`: accuracy < 0.40
- `PersistenceService.recordEngagement()` (new method) appends to
  `engagement_heatmap.json` (same pattern as `recordSession`)
- `loadEngagementData()` already exists — no changes needed there

**Files touched:**
- `lib/engine/persistence.dart` — `recordEngagement(EngagementPoint)` method
- `lib/screens/practice_screen.dart` — call `recordEngagement()` in `_onExit()`

---

## Nice-to-Have

### S7-N1 — Streak Milestone Toasts

Show a `ScaffoldMessenger.showSnackBar` when `progress.currentStreak` crosses
5, 10, 25, or 50. Detect in `PracticeScreen._handleAnswer()` after
`recordCorrectNote()` — compare the new streak value to the milestone list.
Messages: streak 5 → "5 in a row!", streak 10 → "Streak of 10 — Fever incoming!",
streak 25 → "25! You're on fire.", streak 50 → "50 streak. Legendary.".
No persistence — detected live from provider value.

### S7-N2 — Widget Tests

4 tests: Reset dialog displays confirmation text; High Contrast toggle changes
`Scaffold.backgroundColor` to `Colors.black`; session score HUD shows `+0` on
init; duel audio `ref.listen` fires on `turnHistory` length change.

---

## Definition of Done

- S7-M1: "Reset All Progress" confirm wipes all data and lands on onboarding
- S7-M2: correct/wrong tones play on duel turn resolution
- S7-M3: High Contrast toggle persists; HomeScreen + PracticeScreen backgrounds
  switch to `Colors.black`
- S7-S1: `⭐ +N` counter visible in PracticeScreen AppBar; increments on correct
- S7-S2: practice sessions write `EngagementPoint`; HeatmapScreen shows topic data
- Sprint status YAML updated
