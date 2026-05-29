# Sprint 4 — Settings Come Alive

**Goal:** Wire session length, warm-up count, and new-items cap so player
preferences drive Practice behaviour; write the missing Level 2 rhythm GDD.

**Sprint Date:** 2026-05-29
**Review Mode:** solo
**Stage:** Production (brownfield)

---

## Must-Have

### S4-M1 — Session Length Timer in PracticeScreen

**Why now:** The session-length slider in Settings is a stub. Players with ADHD
benefit from predictable session lengths — knowing a session ends at 12 minutes
removes the decision fatigue of "should I keep going?"

**Acceptance criteria:**
- `'session_length'` key in SharedPreferences (default 12, range 10–20 minutes)
- Settings slider reads/writes the live value
- `PracticeScreen` starts an elapsed-time counter on `initState`
- Elapsed `MM:SS` shown in the AppBar (replaces nothing — goes beside the streak)
- When elapsed ≥ session length, `_onExit()` is called automatically
- The auto-exit is skipped in Broken Blade mode (warm-up has no time limit)

**Files touched:**
- `lib/providers/session_prefs_provider.dart` (new) — `SessionPrefsNotifier`,
  three prefs: `session_length`, `warm_up_notes`, `new_items_per_session`
- `lib/screens/settings_screen.dart` — all three sliders wired
- `lib/screens/practice_screen.dart` — elapsed timer, AppBar display, auto-exit

---

### S4-M2 — Warm-Up Count Setting

**Why now:** The "Warm-Up Questions" slider in Settings (default 3, range 1–10)
is a stub. Warm-up means starting a session with easy/familiar notes — ones the
player has seen before and recalls well — before introducing new items.

**Acceptance criteria:**
- `'warm_up_notes'` key in SharedPreferences (default 3, range 1–10)
- Settings slider reads/writes the live value
- At session start, `_rebuildSRQueue()` front-loads up to N SR items where
  `item.interval <= 1` (due or nearly-due reviews) before new items
- If fewer than N due items exist, fills remainder with new items as before
- The setting is read from `SessionPrefsNotifier` in the `postFrameCallback`
  (after providers are ready)

**Files touched:**
- `lib/providers/session_prefs_provider.dart` — `warmUpNotes` getter
- `lib/screens/practice_screen.dart` — `_rebuildSRQueue()` ordering logic

---

### S4-M3 — New Items Per Session Cap

**Why now:** The "New Items Per Session" slider (default 20, range 5–30) is a
stub. Without a cap, a new user sees 13 new notes in one session — overwhelming
for ADHD learners. The cap limits cognitive load per session.

**Acceptance criteria:**
- `'new_items_per_session'` key in SharedPreferences (default 20, range 5–30)
- Settings slider reads/writes the live value
- In `_rebuildSRQueue()`, new items (items the scheduler returns with `interval == 0`
  or no prior history) are counted and capped at the setting value
- Due reviews (interval > 0, past their `nextReviewAt`) are never capped

**Files touched:**
- `lib/providers/session_prefs_provider.dart` — `newItemsPerSession` getter
- `lib/screens/practice_screen.dart` — `_rebuildSRQueue()` cap logic

---

## Should-Have

### S4-S1 — Rhythm System GDD

**Why:** Level 2 ("Rhythm & The Body") is in the curriculum but has no design
document. The metronome toggle exists in Settings but there is nothing to design
against. This GDD creates that anchor.

**Acceptance criteria:**
- `design/gdd/rhythm-system.md` contains all 8 required sections
- Covers: Body Base-10 method, time signatures (4/4, 3/4, 2/4), metronome design
  (BPM range, subdivision), haptic feedback role, and ADHD engagement hooks
- Links Level 2 curriculum objectives to testable acceptance criteria
- `design/gdd/systems-index.md` updated with the new entry (create if not present)

**Files touched:**
- `design/gdd/rhythm-system.md` (new)
- `design/gdd/systems-index.md` (new or updated)

---

### S4-S2 — Metronome and Haptic Feedback Toggle Persistence

**Why:** Both toggles in Settings are stubs. Persisting them now (even without
wiring audio/haptics) means Sprint 5 can flip them on without touching state logic.

**Acceptance criteria:**
- `'metronome_enabled'` and `'haptic_enabled'` keys in SharedPreferences
- Both default `true`
- Settings toggles read/write the live values
- Values survive app restart (verified by reading back after hot restart)
- Actual metronome audio and haptic vibration implementations deferred to Sprint 5

**Files touched:**
- `lib/providers/session_prefs_provider.dart` — `metronomeEnabled`,
  `hapticEnabled` getters + toggle methods
- `lib/screens/settings_screen.dart` — wire both toggles

---

## Nice-to-Have

### S4-N1 — Reduce Motion Persistence and Use

Wire the "Reduce Motion" Settings toggle to SharedPrefs (`'reduce_motion'`,
default `false`). When true: skip the `AnimatedOpacity` level-up fanfare in
`PracticeScreen` (show the "Grade N Unlocked!" card instantly then dismiss after
2.5s); skip the `AnimatedContainer` entrance in `DuelScreen` sentinel toast.

### S4-N2 — Circle of Fifths Grade-Gating

Add a `redirect` in `router.dart` for `/circle-of-fifths` that checks
`playerProgressProvider.gradeLevel < 3` and redirects to `/` with a snackbar
"Unlocks at Grade 3". Add an "Explore →" `TextButton` to the Level 3 card in
`CurriculumScreen` when `currentGrade >= 3`.

---

## Definition of Done

- S4-M1: session auto-exits at configured limit; `MM:SS` visible in AppBar
- S4-M2: warm-up items appear before new items in SR queue
- S4-M3: new-item count per session is capped at the setting value
- S4-S1: rhythm GDD has all 8 sections; systems index updated
- S4-S2: metronome + haptic toggles survive restart
- Sprint status YAML updated
