# Sprint 10 — Level 4 Triads: Chord Quality Ear Training

**Goal:** Bring Level 4 triad content to life — a chord quality ear training screen,
the GDD that formalises the four triad types, and a home card that unlocks at grade 4.

**Sprint Date:** 2026-05-29
**Review Mode:** solo
**Stage:** Production (brownfield)

---

## Must-Have

### S10-M1 — Triad System GDD

**Why now:** The systems-index lists the Triad System as undocumented. Writing the
GDD first defines arpeggio playback order, quality rules, and edge cases before
coding the screen.

**Acceptance criteria:**
- `design/gdd/triad-system.md` created with all 8 required sections
- Covers all four qualities: Major [0,4,7], Minor [0,3,7], Augmented [0,4,8],
  Diminished [0,3,6]
- Arpeggio playback: root → 3rd → 5th, 400ms per note, 50ms gap
- Quiz rules: 4 qualities; 4 choices; Wait-Mode on wrong; 8 Qs/session
- Root pool: C4, D4, E4, F4, G4 (MIDI 60–67)

**Files touched:**
- `design/gdd/triad-system.md` — new file

---

### S10-M2 — Triad Ear Training Screen

**Why now:** Grade 4 players completing interval training need triad content — the
natural next step after learning how intervals sound is combining them into chords.

**Acceptance criteria:**
- New screen `lib/screens/triad_screen.dart`, route `/triad`
- AppBar title: `'Triad Training'`; back button → `context.go('/')`
- Flow per question:
  1. Show root note name (e.g. `'Root: E'`)
  2. Play arpeggio: root, then after 450ms play 3rd, then after 450ms play 5th
  3. Show 4 answer buttons: `Major`, `Minor`, `Augmented`, `Diminished`
  4. Correct tap: `playCorrect()`, show 800ms reveal, then next question
  5. Wrong tap: `playWrong()`, Wait-Mode, auto-replay after 500ms
  6. After 8 correct questions: session complete screen
- Harmony points: `5 + (correctFirstTry / 8 * 10).round()` — same formula
- Session recording: `exerciseType: 'triad'`; `notesPlayed: 8`

**Files touched:**
- `lib/screens/triad_screen.dart` — new file
- `lib/core/router.dart` — add `/triad` route

---

### S10-M3 — Triad Practice Home Card

**Why:** Players at grade ≥ 4 need a visible entry point, matching the Interval
(grade ≥ 3), Scale (grade ≥ 2), and Rhythm (grade ≥ 1) card patterns.

**Acceptance criteria:**
- `_buildActionCard(...)`: `icon: Icons.piano`, `title: 'Triad Training'`,
  `subtitle: 'Identify major, minor, and more'`,
  `color: const Color(0xFFFF7043)` (deep orange)
- Rendered only when `progress.gradeLevel >= 4`
- Positioned below Interval Training card

**Files touched:**
- `lib/screens/home_screen.dart` — Triad Training card

---

## Should-Have

### S10-S1 — Triad Name Reveal on Correct Answer

**Acceptance criteria:**
- Correct tap: replace buttons with reveal widget showing quality name (large text)
  and interval description (e.g. `'Root · Major 3rd · Perfect 5th'`)
- Same 800ms auto-advance as interval screen

**Files touched:**
- `lib/screens/triad_screen.dart` — reveal widget

---

### S10-S2 — Update Systems Index

**Acceptance criteria:**
- `design/gdd/systems-index.md`: Triad System row → `designed + implemented`

**Files touched:**
- `design/gdd/systems-index.md`

---

## Nice-to-Have

### S10-N1 — Replay Button

`TextButton.icon(Icons.replay)` re-plays the full arpeggio without advancing.

### S10-N2 — Widget Tests for Triad Screen

4 tests: AppBar `'Triad Training'`; correct tap advances; wrong tap shows
`'Wrong — try again'`; complete screen shows points.

---

## Definition of Done

- S10-M1: `triad-system.md` has all 8 sections; all four triad types defined
- S10-M2: `/triad` route live; arpeggio plays; 8-question session completable; points awarded; session recorded
- S10-M3: Triad Training card visible at grade ≥ 4 on HomeScreen
- S10-S1: Correct answer shows quality name + interval description for 800ms
- S10-S2: systems-index updated with Triad System row
- Sprint status YAML updated; changes committed
