# Triad System GDD

**Level:** 4 — Intervals & Triads
**Sprint:** 10
**Status:** designed + implemented

---

## 1. Overview

The Triad System introduces chord quality ear training at Level 4, building directly
on the Interval System. Players hear a triad played as an ascending arpeggio (root →
3rd → 5th) and must identify its quality from four choices: Major, Minor, Augmented,
or Diminished. Sessions are eight questions long, use the same Wait-Mode error system
as the Interval System, and reveal the quality name and interval structure on each
correct answer to anchor the sound to its theoretical identity.

---

## 2. Player Fantasy

"I can hear the mood of a chord. Major sounds bright and resolved. Minor sounds
shadowed and inward. Augmented has that unresolved tension. Diminished feels like
something is about to fall. I'm not just hearing notes — I'm hearing harmony."

ADHD hooks:
- The arpeggio spans ~1 second: short enough to hold attention, long enough to hear all three notes.
- Four simple quality labels eliminate reading load — the player hears and picks, no spelling required.
- The 800ms reveal teaches without lecturing: quality name + interval shorthand flash and disappear.
- Replay button prevents "I missed it" panic and resets the audio loop immediately.

---

## 3. Detailed Rules

### Triad Quality Pool

| Quality | Intervals (semitones from root) | Feel |
|---------|--------------------------------|------|
| Major | 0, 4, 7 (root, M3, P5) | Bright, stable, resolved |
| Minor | 0, 3, 7 (root, m3, P5) | Dark, inward, melancholic |
| Augmented | 0, 4, 8 (root, M3, A5) | Tense, rising, unresolved |
| Diminished | 0, 3, 6 (root, m3, d5) | Unstable, anxious, closing |

### Root Pool

Root notes: C4, D4, E4, F4, G4 (MIDI 60, 62, 64, 65, 67).
The highest note in any triad is G4 + A5 (8 semitones) = MIDI 75 (Eb5/D#5).
All notes remain within a comfortable one-octave listening range.

### Arpeggio Playback Sequence

1. Play root note (400ms sine tone at 0.7 volume).
2. Wait 450ms (50ms gap after 400ms tone = slight separation).
3. Play 3rd (400ms sine tone at 0.7 volume).
4. Wait 450ms.
5. Play 5th (400ms sine tone at 0.7 volume).

Total playback duration: ~1.75 seconds. The listener hears the root establish
pitch, then the characteristic interval (m3 vs M3) that distinguishes minor from
major, then the top note that distinguishes P5 (stable) from A5 (augmented) or
d5 (diminished).

### Answer Selection

Four buttons are always shown: `Major`, `Minor`, `Augmented`, `Diminished`.
The correct quality is one of these four. No shuffling is needed because all
four choices are always shown — the layout is fixed.

### Wait-Mode

Identical to the Interval System:
- Wrong tap → `playWrong()` + "Wrong — try again" badge fades in
- After 500ms, arpeggio replays automatically
- Question does not advance; `_questionHadError` flag set
- Eventually correct → first-try credit NOT awarded

### Correct Answer Flow

1. `playCorrect()` fires.
2. Badge clears; buttons replaced by Reveal widget.
3. Reveal shows: quality name (large) + interval shorthand (e.g. `'Root · M3 · P5'`).
4. After 800ms, next question loads and arpeggio plays.

### Session Completion

Eight questions per session. Same first-try tracking, summary screen, and
New Session / Back to Home flow as Interval and Scale screens.

### Replay Button

`TextButton.icon(Icons.replay)` visible during the question. Re-plays the
full arpeggio (root → 3rd → 5th) from the beginning. Disposes existing
sources before reloading.

---

## 4. Formulas

### Harmony Points

```
pts = 5 + round(correctFirstTry / 8 × 10)
```

Range: 5–15 per session (identical to Interval and Scale screens for consistent reward density).

### Grade Label

| correctFirstTry / 8 | Label |
|---------------------|-------|
| 100% | Perfect! |
| 75–99% | Well done! |
| 50–74% | Keep practising |
| 0–49% | Try again! |

### Session Record

```
exerciseType: 'triad'
notesPlayed: 8
correctNotes: correctFirstTry
durationSeconds: elapsed from initState to _sessionComplete
```

### Interval Shorthand in Reveal

| Quality | Shorthand |
|---------|-----------|
| Major | Root · M3 · P5 |
| Minor | Root · m3 · P5 |
| Augmented | Root · M3 · A5 |
| Diminished | Root · m3 · d5 |

---

## 5. Edge Cases

**Same quality twice in a row:** Allowed — root changes each time (random from pool)
so the player must listen afresh even if the quality repeats.

**Augmented note range:** G4 + A5 = MIDI 75 (D#5/Eb5), safely in range. ✓

**Diminished 5th on G4:** G4 + d5 (6 semitones) = C#5/Db5, MIDI 73. In range. ✓

**Audio not initialized:** `AudioService.isInitialized` checked before each play call.
Visual flow continues; replay button silently no-ops.

**Rapid replay taps:** Each `_playArpeggio` call disposes existing sources before
loading. Rapid taps restart the arpeggio cleanly.

**Screen disposed mid-arpeggio:** All `Future.delayed` callbacks check `mounted`
before proceeding. `dispose()` calls `_disposeSources()`.

**Four fixed choices (no shuffle):** Because all four qualities are always visible,
there is no distractor selection logic needed. The player must identify the quality,
not eliminate distractors.

---

## 6. Dependencies

| System | Direction | Notes |
|--------|-----------|-------|
| Interval System | prerequisite | Triads are built from intervals; players should understand m3/M3/P5 first |
| `ToneGenerator` | uses | Generates 400ms sine tones for each note of the arpeggio |
| `AudioService` | uses | `loadMem()` + `play()` + `disposeSource()` |
| `SoundFeedbackService` | uses | `playCorrect()` / `playWrong()` |
| `playerProgressProvider` | reads + writes | `gradeLevel`, `addHarmonyPoints()` |
| `confidenceProvider` | reads | Start and end confidence for session record |
| `PersistenceService.recordSession()` | writes | Session telemetry on completion |
| Curriculum System | dependency | Grade 4 unlock; Level 4 triad objectives |

---

## 7. Tuning Knobs

| Knob | Current Value | Safe Range | Effect |
|------|---------------|------------|--------|
| Note duration | 400ms | 250–600ms | Shorter = harder (less time to internalize each note) |
| Gap between notes | 50ms | 0–150ms | Longer = more separation; 0 = staccato arpeggio |
| Wait between notes (total) | 450ms | 300–700ms | Determines arpeggio tempo |
| Wrong-answer replay delay | 500ms | 200–800ms | Breathing room before next attempt |
| Reveal duration | 800ms | 500–1200ms | Learning reinforcement window |
| Questions per session | 8 | 5–12 | |
| Tone volume | 0.7 | 0.4–1.0 | |
| Points per perfect | 15 | 10–25 | Consistent with Interval (15) and Scale (15) screens |

---

## 8. Acceptance Criteria

| # | Criterion | Pass condition |
|---|-----------|----------------|
| AC1 | `/triad` route exists | GoRouter navigates to TriadScreen |
| AC2 | AppBar title `'Triad Training'` | Text widget in AppBar |
| AC3 | Back button → home | `context.go('/')` on leading tap |
| AC4 | Root note label shows | `'Root: [name]'` visible during question |
| AC5 | Arpeggio plays on question load | Three sequential tones: root, 3rd, 5th |
| AC6 | Replay button re-plays arpeggio | Full arpeggio replays without state change |
| AC7 | All four quality buttons shown | Major / Minor / Augmented / Diminished always visible |
| AC8 | Correct tap fires correct sound | `playCorrect()` called; reveal replaces buttons |
| AC9 | Reveal shows quality + intervals | Quality name (large) + shorthand (subdued) for 800ms |
| AC10 | Wrong tap fires wrong sound | `playWrong()` called; Wait-Mode badge appears |
| AC11 | Wait-Mode replays arpeggio | After 500ms, full arpeggio replays |
| AC12 | Question advances after 800ms | Next question loads; arpeggio plays |
| AC13 | Session is 8 questions | Counter shows Q 1/8 through Q 8/8 |
| AC14 | First-try tracking accurate | Only first correct tap earns credit |
| AC15 | Harmony points correct | `5 + round(correctFirstTry/8 × 10)` |
| AC16 | Session recorded on completion | `recordSession()` called once per session |
| AC17 | Home card at grade ≥ 4 | Triad Training card visible |
| AC18 | Home card hidden below grade 4 | Card not rendered when `gradeLevel < 4` |
