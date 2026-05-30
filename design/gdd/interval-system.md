# Interval System GDD

**Level:** 4 — Intervals & Triads
**Sprint:** 9
**Status:** designed + implemented

---

## 1. Overview

The Interval System introduces ear training for musical intervals at Level 4.
Players hear a root note followed by a second note and must identify the interval
by name from four multiple-choice options. Sessions are eight questions long, use
a Wait-Mode error system (wrong answers replay audio without advancing), and
reveal the interval name and semitone count after each correct answer to
reinforce the sound-to-label mapping.

---

## 2. Player Fantasy

"I can hear the distance between notes. Each interval has its own personality —
the Perfect 5th sounds open and powerful, the Minor 2nd tense and tight. I'm
starting to hear harmony, not just individual notes."

ADHD hooks:
- Each question resolves in under 10 seconds (audio → answer → reveal).
- Immediate audio feedback on every tap — correct chime or wrong buzz.
- The 800ms reveal window provides a moment of satisfaction before the next challenge.
- Replay button eliminates the panic of missing the audio — no fear of asking "again."

---

## 3. Detailed Rules

### Interval Pool (11 intervals)

| Name | Semitones | Abbreviation |
|------|-----------|-------------|
| Minor 2nd | 1 | m2 |
| Major 2nd | 2 | M2 |
| Minor 3rd | 3 | m3 |
| Major 3rd | 4 | M3 |
| Perfect 4th | 5 | P4 |
| Perfect 5th | 7 | P5 |
| Minor 6th | 8 | m6 |
| Major 6th | 9 | M6 |
| Minor 7th | 10 | m7 |
| Major 7th | 11 | M7 |
| Octave | 12 | P8 |

Unison (0 semitones) is excluded — it is trivially identified and provides no
ear-training value.

### Root Pool

Root notes are drawn randomly from: C4, D4, E4, F4, G4 (MIDI 60, 62, 64, 65, 67).
This keeps both notes within a comfortable listening range (highest note is G5,
MIDI 79, for an Octave on G4).

### Audio Playback Sequence

1. Play root note (500ms sine tone at 0.7 volume).
2. Wait 650ms.
3. Play interval note (500ms sine tone at 0.7 volume).

The root and interval notes use distinct `AudioSource` instances loaded via
`AudioService.soloud.loadMem()`. Sources are disposed and reloaded on each question.

### Answer Selection

- Four choices are shown: the correct interval + 3 distractors drawn at random
  from the remaining 10 intervals in the pool.
- Choices are shuffled before display.
- The same interval can appear as the correct answer on consecutive questions
  (random selection from pool — no deduplication between questions).

### Wait-Mode

When the player taps a wrong answer:
- `SoundFeedbackService.playWrong()` fires.
- A "Wrong — try again" badge fades in.
- After 500ms, the interval audio replays automatically.
- The question does not advance. The player must tap the correct answer.
- A `_questionHadError` flag is set; if the player eventually answers correctly,
  first-try credit is NOT awarded.

### Correct Answer Flow

1. `SoundFeedbackService.playCorrect()` fires.
2. "Wrong — try again" badge clears; answer buttons replaced by the Reveal widget.
3. Reveal shows: interval name (large amber text) + semitone count (subdued text).
4. After 800ms, the next question loads automatically and audio plays.

### Session Completion

- A session is 8 questions.
- First-try correct answers (`correctFirstTry`) are tracked.
- On completion, a summary screen shows the grade label, first-try score, and
  harmony point award. The player can start a new 8-question session or return home.

### Replay Button

A "Replay" `TextButton.icon` is always visible during the question. Tapping it
re-plays the interval audio (root → interval) without affecting question state
or Wait-Mode.

---

## 4. Formulas

### Harmony Points Award

```
pts = 5 + round(correctFirstTry / 8 × 10)
```

| correctFirstTry | pts |
|-----------------|-----|
| 0 | 5 |
| 4 | 10 |
| 8 | 15 |

Range: 5–15 per session.

### Grade Label

| pct (correctFirstTry / 8 × 100) | Label |
|----------------------------------|-------|
| 100% | Perfect! |
| 75–99% | Well done! |
| 50–74% | Keep practising |
| 0–49% | Try again! |

### Session Record Fields

```
exerciseType: 'interval'
notesPlayed: 8
correctNotes: correctFirstTry
durationSeconds: elapsed seconds from initState to _sessionComplete
confidenceAtStart: confidenceProvider value read in postFrameCallback
confidenceAtEnd: confidenceProvider value read at session end
gradeLevel: playerProgressProvider.gradeLevel at time of recording
```

---

## 5. Edge Cases

**Same interval twice in a row:** Allowed — the random pool selection does not
deduplicate between questions. The player must listen each time; the root note
changes to maintain freshness.

**Distractor collision:** The `_buildOptions` method picks 3 distractors from
the 10 remaining intervals (all intervals minus the correct one). Because the
pool has 10 remaining items, there is always sufficient distractor supply.

**Root + interval exceeds MIDI 127:** The highest possible note is G4 (MIDI 67)
+ Octave (12 semitones) = MIDI 79 (G5). All roots and intervals in the pool
produce notes within MIDI 60–79, safely within range.

**Audio not initialized:** `AudioService.isInitialized` is checked before
`_playInterval`. If audio is unavailable, the visual question flow continues
without sound. The replay button is still shown but silently no-ops.

**Rapid replay taps:** Each `_playInterval` call begins by disposing existing
sources, which cancels any in-progress tone. Rapid taps produce a restart
rather than overlapping audio.

**Screen disposed mid-delay:** All `Future.delayed` callbacks check `mounted`
before calling `setState`. Audio disposal is also guarded in `dispose()`.

---

## 6. Dependencies

| System | Direction | Notes |
|--------|-----------|-------|
| `SoundFeedbackService` | uses | `playCorrect()` / `playWrong()` for answer feedback |
| `ToneGenerator` | uses | Generates PCM sine tones for root and interval playback |
| `AudioService` | uses | SoLoud wrapper; `loadMem()` + `play()` + `disposeSource()` |
| `playerProgressProvider` | reads + writes | `gradeLevel` for session record; `addHarmonyPoints()` for award |
| `confidenceProvider` | reads | Confidence at start and end for session record |
| `PersistenceService.recordSession()` | writes | Session telemetry after completion |
| Practice System | sibling | Same session-recording pattern as scale and rhythm screens |
| Curriculum System | dependency | Grade 3 required to see home card; Level 4 objectives |

The Curriculum GDD (`curriculum-system.md`) mentions Level 4 interval objectives
and should be updated when new interval types are added beyond the current 11.

---

## 7. Tuning Knobs

| Knob | Current Value | Safe Range | Effect |
|------|---------------|------------|--------|
| Interval pool size | 11 | 5–16 | Smaller = more repetition; larger = more variety but harder |
| Root pool size | 5 (C4–G4) | 3–8 | Wider range = more variety but higher notes may be harder to hear |
| Questions per session | 8 | 5–12 | Fewer = snappier session; more = fatigue for ADHD learners |
| Root tone duration | 500ms | 300–800ms | Shorter = more challenging; longer = more scaffolding |
| Delay between root and interval | 650ms | 400–1000ms | Shorter = harder; longer = more time to process root pitch |
| Reveal display duration | 800ms | 500–1200ms | Shorter = faster session; longer = more label-to-sound reinforcement |
| Wrong-answer audio replay delay | 500ms | 200–800ms | Immediate replay can feel punishing; slight delay gives breathing room |
| Tone volume | 0.7 | 0.4–1.0 | Lower avoids fatigue; higher improves audibility on low-quality speakers |
| Points per perfect session | 15 (5 base + 10 bonus) | 10–25 | Adjust relative to scale (15) and rhythm (≥3/beat) rewards |

---

## 8. Acceptance Criteria

| # | Criterion | Pass condition |
|---|-----------|----------------|
| AC1 | `/interval` route exists | `GoRouter` navigates to `IntervalScreen` |
| AC2 | AppBar shows `'Interval Training'` | Text widget in AppBar title |
| AC3 | Back button returns to home | `context.go('/')` on leading tap |
| AC4 | Root note label displays | `'Root: [note name]'` text visible |
| AC5 | Audio plays on question load | Root tone then interval tone plays sequentially |
| AC6 | Replay button re-plays audio | Tapping "Replay" replays root+interval without state change |
| AC7 | 4 answer options shown | Exactly 4 buttons, one correct, three distractors |
| AC8 | Correct tap fires correct sound | `playCorrect()` called; reveal widget replaces buttons |
| AC9 | Reveal shows name + semitones | `'${name} — N semitone(s)'` displayed for 800ms |
| AC10 | Wrong tap fires wrong sound | `playWrong()` called; Wait-Mode badge appears |
| AC11 | Wait-Mode replays audio | After 500ms, interval audio replays automatically |
| AC12 | Question advances after 800ms reveal | Next question loads; audio plays |
| AC13 | Session is exactly 8 questions | `Q 1/8` through `Q 8/8`; complete screen after 8 |
| AC14 | First-try tracking accurate | `correctFirstTry` only increments on first correct tap |
| AC15 | Harmony points awarded correctly | `pts = 5 + round(correctFirstTry/8 × 10)` |
| AC16 | Session recorded on completion | `PersistenceService.recordSession()` called once |
| AC17 | Home card visible at grade ≥ 3 | Interval Training card appears in HomeScreen |
| AC18 | Home card hidden below grade 3 | Card not rendered when `gradeLevel < 3` |
