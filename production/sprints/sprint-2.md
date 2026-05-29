# Sprint 2 — Adaptive Practice Loop

**Goal:** Wire the SpacedRepetitionScheduler into Practice so notes are chosen
by history rather than at random, add a session summary at exit, and fix Broken
Blade so it auto-activates on launch after 48h absence.

**Sprint Date:** 2026-05-29  
**Review Mode:** solo  
**Stage:** Production (brownfield)

---

## Must-Have

### S2-M1 — SR Item Persistence

**Why now:** The scheduler is useless without per-item history that survives
app restarts.

**Acceptance criteria:**
- `PersistenceService` gains `saveSRItems(List<SRItem>)` and `loadSRItems()`
  backed by `sr_items.json` (same resilience pattern as `player_progress.json`)
- `SRItemsNotifier` (new `StateNotifierProvider<SRItemsNotifier, Map<String, SRItem>>`)
  loads on construction, exposes `updateItem(SRItem)` which persists fire-and-forget
- Item IDs use the convention `'note_<midi>'` (e.g. `'note_60'` for C4)
- File is capped at 200 items (one per semitone across several octaves is well
  below this; cap prevents unbounded growth if IDs ever change)

**Files touched:**
- `lib/engine/persistence.dart` — `saveSRItems`, `loadSRItems`, JSON helpers
- `lib/providers/sr_provider.dart` (new) — `SRItemsNotifier`, `srItemsProvider`

---

### S2-M2 — SR-Driven Note Selection in PracticeScreen

**Why now:** Random selection doesn't respond to what the player struggles with.
SR fixes this at zero UX cost — the screen works the same, notes just appear
more intelligently.

**Acceptance criteria:**
- At session start, `PracticeScreen` loads SR items for the current grade's
  note pool and calls `SpacedRepetitionScheduler.buildSessionQueue()`
- Notes are presented in SR-priority order (due reviews first, then new items)
- Correct answer (first attempt) → `SRResponse.good`; correct after error →
  `SRResponse.hard`; wrong → `SRResponse.again` (retry same note, no advance)
- After each answer, `srItemsProvider.notifier.updateItem()` is called
- When the queue is exhausted, a new queue is built from the full pool
- Distractors (the 3 wrong buttons) are still chosen randomly from the grade pool

**Files touched:**
- `lib/screens/practice_screen.dart` — SR queue logic in place of random draw
- `lib/providers/sr_provider.dart` — `itemsForPool(gradeLevel, notePool)`

---

### S2-M3 — Session Summary Dialog on Exit

**Why now:** The player has no feedback on how a session went. Accuracy and
note count are computed but thrown away.

**Acceptance criteria:**
- Tapping Back shows a brief dialog (not a full screen): accuracy %, notes
  reviewed, and a grade-progress line ("Grade N — keep going!" or "Need X%
  accuracy over Y notes to advance")
- Dialog has a single "Done" button; level-up overlay still shows after dismiss
  if grade advanced
- If `_sessionTotal == 0` (player tapped back immediately), skip the dialog
- Dialog does NOT show in Broken Blade mode (the "Blade Restored!" dialog
  already serves this role)

**Files touched:**
- `lib/screens/practice_screen.dart` — `_onExit()` async, summary dialog widget

---

## Should-Have

### S2-S1 — Broken Blade Auto-Detection on Launch

**Why:** `enterBrokenBladeRecovery()` is never called. The Practice button
ignores recovery state — players can bypass the warm-up.

**Acceptance criteria:**
- After disk load in `PlayerProgressNotifier._loadFromDisk()`, if
  `state.isStreakLapsed && !state.inBrokenBladeRecovery`, automatically call
  `enterBrokenBladeRecovery()` (sets flag, saves to disk)
- `HomeScreen` Practice card changes title/color when `inBrokenBladeRecovery`:
  title "Restore Your Blade", orange color, routes to `/practice?mode=broken_blade`
- The separate `_buildBrokenBladePrompt` widget is removed (Practice card
  now handles it — no redundant UI)

**Files touched:**
- `lib/providers/scaffolding_provider.dart` — auto-detect in `_loadFromDisk`
- `lib/screens/home_screen.dart` — Practice card adapts to recovery state

---

### S2-S2 — Update practice-system.md

**Acceptance criteria:**
- `[TBD]` Spaced Repetition section resolved: Option A chosen (SR drives note
  selection in Practice), implementation details documented
- `[GAP]` Grade Advancement section updated to match Sprint 1 implementation
- Follow-Up Work list updated (strike items now done)

**Files touched:**
- `design/gdd/practice-system.md`

---

### S2-S3 — Document Audio Architecture (ADR-0004)

**Why:** ADR-0001 notes "two audio services coexist — must be consolidated."
They actually serve different roles: SoLoud for UI/ambient, just_audio for the
game clock. The ADR note is wrong. Document this before it causes unnecessary
consolidation work.

**Acceptance criteria:**
- `docs/architecture/adr-0004-audio-architecture.md` (Status: Accepted)
  documents both services, their distinct roles, and explicitly records that
  NO consolidation is needed
- `docs/registry/architecture.yaml` updated with the two API decisions

**Files touched:**
- `docs/architecture/adr-0004-audio-architecture.md` (new)
- `docs/registry/architecture.yaml`

---

## Nice-to-Have

### S2-N1 — Grade Progress Bar on Home Screen

Show a thin progress bar under the quest banner indicating how far the current
session accuracy (derived from `PlayerProgress.totalCorrectNotes /
totalNotesPlayed` for the current grade window) is toward the advancement threshold.

### S2-N2 — SR Reset Button in Settings

In `SettingsScreen`, a "Reset Practice History" button that clears `sr_items.json`
so the player can start fresh without re-installing.

---

## Definition of Done

- All Must-Have tasks: implemented, no Dart analysis errors
- S2-S1 and S2-S2: done
- S2-S3: ADR written
- Sprint status updated
