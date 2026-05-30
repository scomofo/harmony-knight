---
status: designed + implemented
source: lib/screens/circle_of_fifths_screen.dart, lib/core/router.dart
date: 2026-05-29
verified-by: Scott Morley
---

# Circle of Fifths System — Map of the Musical World

---

## 1. Overview

The Circle of Fifths is the Level 3 landmark screen, reframed as the
**"Map of the Musical World."** It serves two purposes simultaneously:

1. **Reference tool (Explore mode):** Players browse all 12 major/minor key
   pairs, seeing their key signatures and accidental counts. Locked keys are
   dimmed but always visible — the full map is never hidden.

2. **Active exercise (Quiz mode):** Short, zero-anxiety key-signature challenges.
   The player taps the correct key wedge in response to a prompt. No timer.
   No lives. Pure recognition practice.

The screen is grade-gated: players cannot enter until grade 3, because the
curriculum sequence (Levels 0–2) has not yet introduced key signatures. Once
unlocked, it remains accessible permanently and grows richer as grade increases —
more key wedges become interactive as the player advances.

---

## 2. Player Fantasy

> *"I am a cartographer of sound, charting the Musical World one key at a time.
> Each new accidental is a new region I've explored."*

The ADHD learner needs a spatial mental model for key signatures — a map, not a
list. The circle is that map. Seeing all 12 keys arranged visually, with nearby
keys sharing accidentals, gives the "aha" that no amount of rote memorisation
provides.

**Intended feelings:**
- **Discovery:** tapping a key and seeing its scale notes appear feels like
  opening a new region on a game map.
- **Mastery through pattern:** Quiz mode makes the accidental pattern feel like
  solving a puzzle rather than reciting a fact.
- **Safe exploration:** locked keys are visible but don't block or punish —
  they invite forward progress rather than creating frustration.

**What to avoid:**
- Flashcard anxiety — quiz prompts have no timer and no lives
- Information overload — the detail panel shows one key at a time only
- Gatekeeping — locked keys are visually present and labelled, never hidden

---

## 3. Detailed Rules

### 3a. Access Control

- Route `/circle-of-fifths` redirects to `/` if `gradeLevel < 3`
- The redirect is performed asynchronously in the router using
  `PersistenceService().loadProgress()` — not a provider watch, to keep the
  router stateless
- At grade ≥ 3, the screen is accessible from the Curriculum Map
  (`/curriculum`) Level 3 card "Explore →" button

### 3b. Key Data

The 12 keys are fixed constants ordered clockwise by fifths:

| Index | Major Key | Relative Minor | Accidentals | Description |
|-------|-----------|----------------|-------------|-------------|
| 0 | C | Am | 0 | No sharps or flats |
| 1 | G | Em | 1 | 1 sharp: F# |
| 2 | D | Bm | 2 | 2 sharps: F#, C# |
| 3 | A | F#m | 3 | 3 sharps: F#, C#, G# |
| 4 | E | C#m | 4 | 4 sharps: F#, C#, G#, D# |
| 5 | B | G#m | 5 | 5 sharps: F#, C#, G#, D#, A# |
| 6 | F#/Gb | D#m/Ebm | 6 | 6 sharps/flats |
| 7 | Db | Bbm | 5 | 5 flats: Bb, Eb, Ab, Db, Gb |
| 8 | Ab | Fm | 4 | 4 flats: Bb, Eb, Ab, Db |
| 9 | Eb | Cm | 3 | 3 flats: Bb, Eb, Ab |
| 10 | Bb | Gm | 2 | 2 flats: Bb, Eb |
| 11 | F | Dm | 1 | 1 flat: Bb |

### 3c. Key Unlocking

Keys unlock progressively as `gradeLevel` increases:

| Grade range | Unlocked keys | Which keys |
|-------------|---------------|------------|
| 3–4 | 3 | C, G, F (0 sharps + 1 sharp + 1 flat) |
| 5–6 | 6 | + D, Bb, Eb (2 sharps + 2 flats + 3 flats) |
| 7–8 | 9 | + A, Ab, E (3 sharps + 4 flats + 4 sharps) |
| 9+ | 12 | All keys including enharmonic F#/Gb |

Unlocked = interactive (tap to select, eligible for quiz). Locked = visible,
dimmed, not interactive and not included in quiz question pool.

### 3d. Explore Mode (default)

- **Tap a key wedge** → selects it; detail panel appears at the bottom
- **Detail panel** shows:
  - Major key name / relative minor (e.g. "D Major / Bm")
  - Key signature description (e.g. "2 sharps: F#, C#")
  - Accidental count label (e.g. "2 accidentals")
  - The 8 ascending major scale note names (e.g. D E F# G A B C# D) —
    root and octave bold, inner degrees normal weight
- **Tap the same key again** → deselects it (panel hides)
- **Tap a different key** → switches selection; panel updates
- Selected key pulses visually (glow + size oscillation via `AnimationController`)

### 3e. Quiz Mode

- **Enter**: tap the "Quiz" button in AppBar → `_quizMode = true`
- **Exit**: tap the "Explore" button → `_quizMode = false`; score resets
- **Prompt bar**: fixed height container at screen top showing the current question
- **Question types** (chosen randomly from the unlocked key pool):
  1. **Sharps count**: `"Tap the key with [N] sharp(s)"` — matches keys with
     `accidentalCount == N` where the description contains "sharp"
  2. **Flats count**: `"Tap the key with [N] flat(s)"` — matches keys with
     `accidentalCount == N` where the description contains "flat"
  3. **Relative minor**: `"Tap the relative minor key of [Key]"` — player taps
     the key whose `majorKey` is the relative minor of the displayed key
     (e.g. prompt "Relative minor of C?" → answer Am — shown as the Am key;
     since each `KeyData` stores its own relative minor, this resolves to
     finding the key whose `relativeMinor` matches)
  4. **Zero accidentals**: `"Tap the key with no sharps or flats"` — always C
- **Correct tap**: `playCorrect()` + `addHarmonyPoints(3)` + increment
  `_correctQuizAnswers` + generate next question immediately
- **Wrong tap**: `playWrong()` + highlight the correct answer key in amber
  for 1.5 s + generate next question (no points deducted, no penalty)
- **Score**: displayed in AppBar as `"Quiz: N correct"` — resets on mode toggle
- **No timer**: Wait-Mode applies — questions persist until the player taps

### 3f. Visual Layout

- Circle: 320 × 320 dp `CustomPaint`; keys arranged at radius 130 dp; 30°
  between each key; starts at 12 o'clock (−90° offset)
- Selected key: purple node (`Color(0xFF7C4DFF)`) with animated glow and pulse
- Unlocked unselected key: cyan node (`Color(0xFF4FC3F7)` at alpha 180)
- Locked key: grey node (`Colors.grey.shade800`); text grey
- Correct-answer highlight in quiz: amber border on the key node for 1.5 s
- Connection lines between adjacent keys: low-opacity strokes; unlocked = cyan,
  locked = grey

---

## 4. Formulas

### Quiz question pool generation

```
eligibleKeys = keys where index < unlockedCount

// Sharps questions: keys with ≥1 sharp
sharpsPool = eligibleKeys where description contains "sharp"

// Flats questions: keys with ≥1 flat
flatsPool = eligibleKeys where description contains "flat"

// Relative minor questions: all eligible keys (any can be a "relative minor of X" target)
relativeMinorPool = eligibleKeys

// Zero accidentals: always C (index 0) — only generated if unlocked
zeroPool = [C] if 0 < unlockedCount
```

A question is chosen by picking a random type from `[sharps, flats, relative_minor,
zero]`, filtered to types with non-empty pools. If relative_minor is chosen, a random
key is drawn as the "root" and the player must identify that root's relative minor key.

### Harmony point award (quiz)

```
pointsPerCorrect = 3          // fixed; no multiplier
totalPoints = correctAnswers × 3
```

### Key detail display: scale note names

The 8 ascending major scale note names for key X are pre-computed as constants
(no runtime formula). They follow the pattern: whole-whole-half-whole-whole-whole-half
steps starting from the root.

Example for D major: D → E (W) → F# (W) → G (H) → A (W) → B (W) → C# (W) → D (H)

---

## 5. Edge Cases

### Enharmonic key (F#/Gb, index 6)

- `accidentalCount = 6` — matches both "6 sharps" and "6 flats" descriptions
- Display name is `"F#/Gb"` and relative minor is `"D#m/Ebm"`
- In quiz, the sharps question `"Tap the key with 6 sharps"` and the flats question
  `"Tap the key with 6 flats"` both resolve to index 6 — the same tap target
- The scale note display for F#/Gb shows the sharp spelling:
  F# G# A# B C# D# E# F# (7 sharps)
- This key is only unlocked at grade ≥ 9; it does not appear in early quiz pools

### Grade < 3 access attempt

- Router redirect fires before the screen builds; user is sent to `/` silently
- No error state, no dialog — the redirect is invisible to the user
- The Curriculum Map Level 3 card shows a locked label below grade 3 (no "Explore" button)

### Grade exactly 3 — only 3 keys unlocked

- C, G, F are the only interactive keys
- Quiz pool is limited to these three keys; relative minor questions only reference
  Am, Em, Dm (the relative minors of the three unlocked keys)
- The "0 sharps/flats" question (C) is always valid

### Deselecting a key in Explore mode

- Tapping the currently-selected key deselects it (`_selectedKey = null`)
- The detail panel dismisses; no animation needed
- In quiz mode, tapping a key always registers as an answer attempt — the
  deselect behaviour does not apply in quiz mode

### Quiz mode with only 1 eligible key type

- If only zero-accidental keys are unlocked (impossible at grade 3+ since C, G, F
  are all unlocked), fall back gracefully by only generating the "no accidentals"
  question type — this state cannot occur in practice

### Back navigation

- Back button navigates to `/curriculum`, not `/` — the CoF is a sub-screen of
  the Curriculum Map in the information hierarchy

---

## 6. Dependencies

| Dependency | Direction | Notes |
|-----------|-----------|-------|
| `playerProgressProvider` | CoF reads | `gradeLevel` drives `_unlockedKeysForGrade()` and router redirect |
| `soundFeedbackProvider` | CoF reads | `playCorrect()` / `playWrong()` in quiz mode |
| `playerProgressProvider.notifier.addHarmonyPoints()` | CoF writes | 3 pts per correct quiz answer |
| `router.dart` | uses CoF | Redirect guard reads grade via `PersistenceService().loadProgress()` |
| `curriculum_screen.dart` | links to CoF | Level 3 card "Explore →" button navigates here at grade ≥ 3 |
| Practice System | sibling | Both use `gradeLevel` progression; CoF does not influence grade advancement |
| Duel System | sibling | CoF is a reference tool for the key context the Duel operates in; no code coupling |

---

## 7. Tuning Knobs

| Knob | Current value | Safe range | Effect |
|------|--------------|------------|--------|
| `pointsPerCorrect` | 3 | 1–10 | Harmony points earned per quiz correct answer |
| `wrongAnswerHighlightMs` | 1500 ms | 800–3000 ms | How long the correct key is amber-highlighted after a wrong tap |
| Unlock thresholds | grades 3/5/7 | grades 2–8 | When new key groups become interactive |
| Circle radius | 130 dp | 100–150 dp | Distance of key nodes from circle centre |
| Node radius | 18 dp (unselected), 22+pulse dp (selected) | 14–28 dp | Tap target size |
| Pulse animation duration | 2 s repeat | 1–4 s | Speed of the selected-key glow oscillation |

---

## 8. Acceptance Criteria

### Access control
- [ ] Navigating to `/circle-of-fifths` with grade < 3 redirects to `/` without showing the screen
- [ ] Navigating to `/circle-of-fifths` with grade ≥ 3 shows the screen normally
- [ ] Level 3 Curriculum card shows "Explore →" at grade ≥ 3 and a locked label below

### Explore mode
- [ ] At grade 3, only 3 key nodes (C, G, F) are interactive; remaining 9 are visually dimmed
- [ ] Tapping an unlocked key shows the detail panel with major/minor name, key signature text, accidental count, and 8 scale note names
- [ ] Tapping the same key again hides the panel
- [ ] Tapping a locked key does nothing (no selection, no panel)
- [ ] Selected key pulses visually (node enlarges and glows)

### Quiz mode
- [ ] Tapping "Quiz" in AppBar shows the prompt bar and score counter; hides the detail panel
- [ ] All three question types appear: sharps count, flats count, relative minor
- [ ] Correct tap: `playCorrect()` fires, score increments by 1, new question appears immediately
- [ ] Wrong tap: `playWrong()` fires, correct key highlights amber for ~1.5 s, new question appears, score unchanged
- [ ] Score label reads `"Quiz: N correct"` and starts at 0 on each mode entry
- [ ] Tapping "Explore" exits quiz mode; score resets; explore behaviour resumes
- [ ] Locked keys cannot be tapped as quiz answers

### Scale note display (S8-S2)
- [ ] Detail panel shows 8 note names in a horizontal row when a key is selected
- [ ] Root and octave notes are bold; inner degrees (2–7) are normal weight
- [ ] D major shows: D E F# G A B C# D
- [ ] F major shows: F G A Bb C D E F
