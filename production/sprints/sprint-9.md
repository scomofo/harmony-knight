# Sprint 9 — Level 4 Foundation: Interval Ear Training

**Goal:** Bring Level 4 content to life — an interval ear training screen, the GDD
that formalises interval identification rules, and a home card that unlocks at grade 3.

**Sprint Date:** 2026-05-29
**Review Mode:** solo
**Stage:** Production (brownfield)

---

## Must-Have

### S9-M1 — Interval System GDD

**Why now:** The systems-index lists Level 4 as undocumented. Writing the GDD first
surfaces the question pool rules, scoring, and edge cases before building the screen.

**Acceptance criteria:**
- `design/gdd/interval-system.md` created with all 8 required sections
- Covers all intervals P1–P8, quality types (Perfect / Major / minor), semitone counts
- Quiz rules: 11 interval pool; 4 choices per question; Wait-Mode on wrong; 8 Qs/session
- Formulas: harmony points, accuracy %, session record fields
- Edge cases: unison, octave, enharmonic equivalents, root range (C4–G4)

**Files touched:**
- `design/gdd/interval-system.md` — new file

---

### S9-M2 — Interval Ear Training Screen

**Why now:** Grade 3 players completing scale and CoF exercises have no Level 4
content to progress into. The interval screen is the next natural step.

**Acceptance criteria:**
- New screen `lib/screens/interval_screen.dart`, route `/interval`
- AppBar title: `'Interval Training'`; back button → `context.go('/')`
- Flow per question:
  1. Show root note name (e.g. `'Root: C'`)
  2. Play root note, then after 600 ms play the interval note
  3. Show 4 answer buttons with interval names; one is correct
  4. Correct tap: `playCorrect()`, advance — Wrong tap: `playWrong()`, Wait-Mode (same question replays audio)
  5. After 8 correct first-try answers: session complete screen
- Interval pool (11): Unison, m2, M2, m3, M3, P4, P5, m6, M6, m7, M7, Octave
  (drop Unison and Octave from wrong-answer distractors to avoid trivial choices)
- Root pool: C4, D4, E4, F4, G4 (MIDI 60, 62, 64, 65, 67) — chosen randomly each question
- 4 answer options: correct + 3 distractors chosen from pool (no duplicates, adjacent excluded)
- Harmony points: `5 + (correctFirstTry / 8 * 10).round()` — same formula as scale screen
- Session recording: `_recordSession()` on completion; `exerciseType: 'interval'`;
  `notesPlayed: 8`; `correctNotes: correctFirstTry`
- `soundFeedbackProvider.playCorrect()` / `playWrong()` on each answer tap

**Files touched:**
- `lib/screens/interval_screen.dart` — new file
- `lib/core/router.dart` — add `/interval` route

---

### S9-M3 — Interval Practice Home Card

**Why:** Players at grade ≥ 3 need a visible entry point to the new exercise type,
matching the Rhythm (grade ≥ 1) and Scale (grade ≥ 2) card pattern.

**Acceptance criteria:**
- `_buildActionCard(...)` for Interval Training: `icon: Icons.music_note`,
  `title: 'Interval Training'`, `subtitle: 'Identify the distance between notes'`,
  `color: const Color(0xFFFFB300)` (amber)
- Rendered only when `progress.gradeLevel >= 3`
- Positioned below Scale Practice card
- `onTap: () => context.go('/interval')`

**Files touched:**
- `lib/screens/home_screen.dart` — Interval Training card

---

## Should-Have

### S9-S1 — Interval Name Reveal on Correct Answer

**Why:** "Correct" feedback alone doesn't teach. Showing "Perfect 5th — 7 semitones"
for 800 ms before the next question reinforces the mapping between sound and label.

**Acceptance criteria:**
- After a correct tap: replace the 4 answer buttons with a single `Text` widget showing
  `'${correctName} — ${semitones} semitones'` in the correct color (amber)
- After 800 ms delay, automatically advance to the next question
- Wait-Mode: no reveal — just shows "Wrong — try again" badge and replays audio

**Files touched:**
- `lib/screens/interval_screen.dart` — reveal state + delayed advance

---

### S9-S2 — Update Systems Index

**Acceptance criteria:**
- `design/gdd/systems-index.md` updated: add Interval System row → `designed + implemented`

**Files touched:**
- `design/gdd/systems-index.md`

---

## Nice-to-Have

### S9-N1 — Replay Button

An `IconButton(Icons.replay)` in the question area re-plays the interval audio
(root → interval note) without resetting Wait-Mode or advancing the question.

### S9-N2 — Widget Tests for Interval Screen

4 tests: AppBar title `'Interval Training'`; correct answer advances question counter;
wrong answer shows `'Wrong — try again'`; session complete shows harmony point award.

---

## Definition of Done

- S9-M1: `interval-system.md` has all 8 sections; all interval types defined
- S9-M2: `/interval` route live; 8-question session completable; audio plays; points awarded; session recorded
- S9-M3: Interval Training card visible at grade ≥ 3 on HomeScreen
- S9-S1: Correct answer shows name+semitones reveal for 800ms before advancing
- S9-S2: systems-index updated with Interval System row
- Sprint status YAML updated; changes committed
