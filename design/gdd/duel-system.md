---
status: reverse-documented
source: lib/engine/duel_engine.dart, lib/models/duel_state.dart, lib/providers/duel_provider.dart, lib/screens/duel_screen.dart
date: 2026-05-29
verified-by: Scott Morley
---

# Duel System — Collaborative Counterpoint Design

> **Note**: Reverse-engineered from existing implementation. Captures current
> behaviour and clarified design intent. Sections marked **[GAP]** are designed
> but not yet implemented.

---

## Overview

The Duel is a turn-based Species Counterpoint exercise framed as a sparring match
against the **Discord Sentinel** — an AI antagonist who is, in truth, a teacher
wearing villain clothes. Every "attack" the Sentinel makes is an invitation to
respond with good voice-leading. Every ghost suggestion is the Sentinel revealing
its teaching intent. The player cannot lose; they can only learn.

**Design pillars:**
- **Wait-Mode**: no timer, no anxiety — the duel freezes until the player places a
  valid note. Thinking time is infinite and respected.
- **Guided failure**: wrong moves are never punished with a game-over; they trigger
  a ghost suggestion that explains *why* a better option works.
- **Harmony as victory**: the Harmony Meter (not a health bar) is the win condition.
  Filling it means the player is writing good counterpoint.
- **Collaborative framing**: the Sentinel is antagonist-shaped but teacher-hearted.

---

## Roles

| Role | Description |
|------|-------------|
| **Discord Sentinel** | AI. Generates and "plays" the Cantus Firmus (fixed lower voice). Named antagonist; pedagogically always acts as a teacher. |
| **Player (Harmony Knight)** | Writes the upper counterpoint voice, note by note. |

---

## Cantus Firmus Generation

The Sentinel generates a fixed melody before the duel begins. The player's task is
to harmonise against it.

**Algorithm:**
1. Choose length based on grade level (see table)
2. Choose scale based on grade level
3. Start on tonic; walk the scale with constrained steps; end on tonic

**Length:**

| Grade | Cantus notes |
|-------|-------------|
| 0–2 | 4–6 |
| 3–5 | 6–8 |
| 6+ | 8–12 |

**Scale:**

| Grade | Scale |
|-------|-------|
| 0–2 | C major (C4–C5) |
| 3–5 | C major or A minor (random each duel) |
| 6+ | Full chromatic C4–C5 (13 notes) |

**Step constraint:** maximum melodic leap = 2 scale steps (Grade 0–2) or 3 steps
(Grade 3+), randomly signed. Consecutive steps may repeat direction but the voice
never leaves the scale's range. First and last note are always the tonic.

---

## Turn Structure

Each turn corresponds to one Cantus Firmus note. The player must place one note in
the upper voice that is harmonically valid against the current cantus note.

```
Duel Start
  └─ Sentinel plays full Cantus Firmus (displayed as note row)
       └─ Turn N:
            ├─ Player taps a note from the chromatic palette (C4–C5)
            ├─ Engine validates the move
            │    ├─ VALID → advance turn, update Harmony Meter
            │    └─ INVALID → show ghost suggestion + reason, stay on turn N
            └─ Repeat until all turns complete
                 └─ Duel Complete → show Harmony % + New Duel option
```

---

## Counterpoint Validation Rules (First Species)

A move is **valid** when all of the following are true:

1. **No dissonance**: the harmonic interval between user note and cantus note is a
   consonance (see Interval Classification below)
2. **No parallel perfect consonances**: if both voices move in the same direction to
   a perfect 5th or octave, the move is rejected
3. **No hidden 5ths/octaves**: both voices moving in the same direction to a P5 or
   P8 from a different interval is also rejected
4. **No voice crossing**: user note must be at or above the cantus note (MIDI ≥ cantus MIDI)

**Interval Classification:**

| Semitones (mod 12) | Classification | Valid? |
|--------------------|---------------|--------|
| 0 (Unison) | Perfect consonance | ✓ |
| 3 (m3), 4 (M3) | Imperfect consonance | ✓ *(preferred)* |
| 5 (P4) | Perfect consonance | ✓ |
| 7 (P5) | Perfect consonance | ✓ |
| 8 (m6), 9 (M6) | Imperfect consonance | ✓ *(preferred)* |
| 1, 2, 6, 10, 11 | Dissonance | ✗ |

Imperfect consonances (thirds and sixths) are the preferred outcome — they score
more Harmony Meter than perfect consonances.

---

## Ghost Resolution

When the player places an invalid note, the Sentinel reveals its teacher nature:
it suggests a better option rather than simply saying "wrong."

**Suggestion algorithm:**
1. Try each imperfect consonance above the cantus (m3, M3, m6, M6 in order)
2. Validate each candidate against all counterpoint rules for this turn
3. Return the first valid candidate with its human-readable interval name
4. Fallback: try perfect consonances (P5, Octave)
5. If no suggestion found: return null (extremely rare — chromatic edge case)

**Ghost note display:**
- Rendered with `isGhost: true` → dashed border via `PathMetrics` in `ScaffoldingNotePainter`
- Shows the interval explanation: *"A major 3rd above the cantus creates a pleasing
  imperfect consonance, which is ideal in counterpoint."*
- Tapping the ghost accepts it and advances the turn (Big Win bonus applied)

**Ghost tone audio (wired Sprint 3):**
- When a ghost suggestion appears, `DuelScreen` plays the suggested MIDI note via
  `ghostToneProvider.playGhostTone(midiNote, confidence)` — volume and low-pass
  filter are confidence-scaled (louder / richer at low confidence)
- Tone stops automatically when the turn advances or a new duel starts
- Respects the "Ghost Tones" toggle in Settings (`ghostTonesEnabledProvider`)

The player is never forced to accept the ghost. They may keep trying other notes.

---

## Harmony Meter

A 0.0–1.0 fill gauge that represents the quality of the player's counterpoint so far.
Filling it to 1.0 is the win condition.

**Deltas per turn:**

| Event | Meter delta |
|-------|------------|
| Imperfect consonance (player's own choice) | +10% |
| Perfect consonance (player's own choice) | +8% |
| Ghost suggestion accepted (dissonance resolved) | +15% |

The meter never decreases below 0 and is clamped at 1.0.

**Rationale for imperfect > perfect:** imperfect consonances (3rds and 6ths) are
the backbone of First Species counterpoint — the system rewards stylistically
correct choices over mechanically "safe" ones (unisons, 5ths, octaves).

---

## Difficulty Scaling

| Grade | Cantus complexity | Rules enforced |
|-------|-----------------|---------------|
| 0–2 | Short (4–6 notes), stepwise C major | Dissonance, voice crossing |
| 3–5 | Medium (6–8 notes), C major or A minor | + Parallel P5/P8 |
| 6+ | Long (8–12 notes), chromatic | + Hidden 5ths/octaves |

*Implementation note*: parallel/hidden checks require a previous turn to exist
(`currentTurn > 0`), so the first note of every duel is validated against
dissonance and voice crossing only. This is correct First Species behaviour.

---

## Discord Sentinel — Design Intent

The Sentinel is framed as an adversary but always acts as a teacher:

| Apparent behaviour | Actual purpose |
|-------------------|---------------|
| "Places" a challenging cantus | Presents a structured counterpoint exercise |
| "Attacks" with dissonance | Creates teachable moments via ghost suggestions |
| Fills a Harmony Meter against you | Motivates the player to *resolve* tension |
| "Defeated" when meter fills | Rewards the player completing the exercise |

The Sentinel should never feel punishing. Ghost suggestions are its primary
voice — they should be written/framed warmly, not adversarially.

**Planned narrative beat** (not yet implemented): when the meter fills, the Sentinel
acknowledges the player's skill — a brief in-world moment that reinforces the
teacher framing without breaking the fantasy.

---

## Input Palette

The player picks from a chromatic keyboard spanning C4–C5 (13 notes), always
visible at the bottom of the screen. The palette respects the confidence slider:

- Confidence < 0.5: Figurenotes colours on each key + note name label
- Confidence 0.5–0.7: Figurenotes colours only
- Confidence ≥ 0.7: Plain grey keys

---

## Duel Completion

When `currentTurn == totalTurns`:

- `DuelState.isComplete` is set to true
- Input palette hides
- Completion banner shows: **"Duel Complete!"** + Harmony % achieved
- Option to start a new duel at the same grade (reshuffles cantus, resets meter)
- Duel wins are recorded in `PlayerProgress.duelWins`

**[GAP]** No current mechanism for awarding Harmony Points or advancing grade on duel
completion. Design decision needed: should duel wins contribute to grade advancement,
or is grade advancement Practice-only?

---

## Follow-Up Work

1. ~~**Award Harmony Points on duel completion**~~ — Done Sprint 1 (S1-M3); `round(harmonyMeter × 100)` points via `_awardDuelRewards()`
2. ~~**Duel contribution to grade advancement**~~ — Decided Sprint 1 (S1-S3); Practice-only signal; documented in curriculum-system.md
3. ~~**Sentinel narrative moment**~~ — Done Sprint 1 (S1-N2); 3 rotating grudging-respect quotes shown when `harmonyMeter >= 1.0`
4. **Second and Third Species** — future duel modes (2:1, 4:1 note ratios); out of scope until Grade 5+ content is needed
5. ~~**Ghost note visual treatment**~~ — Done Sprint 1 (S1-S2); dashed border via `PathMetrics` in `ScaffoldingNotePainter`
6. ~~**Ghost tone audio**~~ — Done Sprint 3 (S3-M2, S3-S1); wired via `ghostToneProvider`; respects Settings toggle
