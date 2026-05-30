# Sprint 8 — Level 3 Content: Scales & Circle of Fifths

**Goal:** Bring Level 3 content to life — a scale spelling exercise screen, interactive
key quiz mode on the Circle of Fifths, and the GDD that formalises how both systems work.

**Sprint Date:** 2026-05-29
**Review Mode:** solo
**Stage:** Production (brownfield)

---

## Must-Have

### S8-M1 — Scale Spelling Exercise Screen

**Why now:** Level 3 curriculum ("Scales & Key Signatures") has zero exercises beyond
note ID. Players who reach grade 2 have no way to practice scale construction — the
natural next step after landmark notes.

**Acceptance criteria:**
- New screen `lib/screens/scale_screen.dart`, route `/scale`
- AppBar title: `'Scale Practice'`; back button → `context.go('/')`
- Flow:
  1. Show a randomly chosen root note (C, G, D, A, F, Bb — major keys with ≤2 sharps/flats)
  2. Player taps the 8 notes of the major scale in ascending order (root → octave)
  3. Note palette: chromatic C4–C5 (13 buttons); each tap either advances (correct)
     or shows "Wrong — try again" (Wait-Mode, same degree replays)
  4. Completed note stays highlighted in green; palette auto-advances to next degree
  5. On completion (all 8 notes correct): show score summary with accuracy % and
     +N Harmony Points; `ElevatedButton('New Scale')` re-randomises
- Harmony points: `5 + (correctFirstTry / 8 * 10).round()` — ranges 5–15 per scale
- Session recording: `_recordSession()` on completion; `exerciseType: 'scale'`;
  `notesPlayed: 8`; `correctNotes: correctFirstTry`
- `soundFeedbackProvider.playCorrect()` / `playWrong()` on each tap

**Files touched:**
- `lib/screens/scale_screen.dart` — new file
- `lib/core/router.dart` — add `/scale` route

---

### S8-M2 — Circle of Fifths Key Quiz Mode

**Why now:** The CoF screen is a beautiful map but entirely passive. The curriculum spec
calls for "Quick Win 5-second key-name challenges." This is 2× more engaging than the
current read-only view.

**Acceptance criteria:**
- On the existing `CircleOfFifthsScreen`, add a `bool _quizMode = false` flag
- AppBar actions: `TextButton('Quiz')` / `TextButton('Explore')` toggle between modes
- **Quiz mode**: a prompt bar appears at the top with one of these question types (random):
  - `"Tap the key with [N] sharps"` — player taps the matching key wedge
  - `"Tap the key with [N] flats"` — same
  - `"Tap the relative minor of [Key]"` — matches `relativeMinor` field
- Correct tap: `soundFeedbackProvider.playCorrect()` + `addHarmonyPoints(3)` + new question
- Wrong tap: `soundFeedbackProvider.playWrong()` + highlight correct key for 1.5s + new question
- Question counter in AppBar: `'Quiz: $_correctQuizAnswers correct'`
- Explore mode: original behaviour unchanged

**Files touched:**
- `lib/screens/circle_of_fifths_screen.dart` — quiz mode toggle + prompt bar + tap scoring

---

### S8-M3 — Circle of Fifths GDD

**Why now:** The systems-index lists CoF as "no GDD." Writing it first surfaces edge
cases (enharmonic keys, quiz generation rules) that affect S8-M2 implementation.

**Acceptance criteria:**
- `design/gdd/circle-of-fifths-system.md` created with all 8 required sections:
  1. Overview — CoF as "Map of the Musical World"
  2. Player Fantasy — exploring key signatures as travel between regions
  3. Detailed Rules — explore mode, quiz mode, key data structure, unlock gating
  4. Formulas — quiz question pool generation, scoring (3 pts/correct, 0 on wrong)
  5. Edge Cases — enharmonic equivalents (F#/Gb), minor key display, grade < 3 redirect
  6. Dependencies — `playerProgressProvider`, `soundFeedbackProvider`
  7. Tuning Knobs — quiz question types, points per correct, highlight duration
  8. Acceptance Criteria — testable pass/fail for explore and quiz modes
- `design/gdd/systems-index.md` updated: CoF row status → `designed + implemented`

**Files touched:**
- `design/gdd/circle-of-fifths-system.md` — new file
- `design/gdd/systems-index.md` — update CoF row

---

## Should-Have

### S8-S1 — Scale Practice Home Card

**Why:** Players reaching grade 2 have no signal that a new exercise type is available.
The Rhythm card pattern (appears at grade ≥ 1) works — apply the same to Scale Practice.

**Acceptance criteria:**
- `_buildActionCard(...)` for Scale Practice: `icon: Icons.piano_rounded`,
  `title: 'Scale Practice'`, `subtitle: 'Build major scales key by key'`,
  `color: const Color(0xFF26C6DA)` (teal)
- Rendered only when `progress.gradeLevel >= 2`
- Positioned below Rhythm card
- `onTap: () => context.go('/scale')`

**Files touched:**
- `lib/screens/home_screen.dart` — Scale Practice card

---

### S8-S2 — Major Scale Notes in Circle of Fifths Detail Panel

**Why:** When a player taps a key in Explore mode the panel shows key signature text
but no visual scale. Adding the 8 note names grounds the CoF in actual pitches.

**Acceptance criteria:**
- `Map<String, List<String>> _majorScaleNotes` const in state — 12 entries,
  each a list of 8 note name strings (e.g. `'D': ['D','E','F#','G','A','B','C#','D']`)
- When `_selectedKey != null` in Explore mode: detail panel includes a horizontal
  `Row` of the 8 scale degree `Text` widgets below the key signature text
- Root and octave bold; degrees 2–7 normal weight; all white, 13sp

**Files touched:**
- `lib/screens/circle_of_fifths_screen.dart` — scale note data + detail panel row

---

## Nice-to-Have

### S8-N1 — Natural Minor Scale Mode for Scale Screen

After completing a major scale, offer `TextButton('Switch to Minor')` that challenges
with the relative minor root. Same 13-note palette — no new engine needed.

### S8-N2 — Widget Tests for Scale Screen

4 tests: AppBar title `'Scale Practice'`; correct tap advances degree; wrong tap shows
`'Wrong — try again'` without advancing; completion screen shows harmony point award.

---

## Definition of Done

- S8-M1: `/scale` route live; full major scale completable; harmony points awarded; session recorded
- S8-M2: Quiz mode toggle on CoF; all prompt types generate; correct/wrong audio fires; points awarded
- S8-M3: `circle-of-fifths-system.md` has all 8 sections; systems-index updated
- S8-S1: Scale Practice card visible at grade ≥ 2 on HomeScreen
- S8-S2: Selected-key panel shows 8 scale notes as a horizontal row
- Sprint status YAML updated; changes committed
