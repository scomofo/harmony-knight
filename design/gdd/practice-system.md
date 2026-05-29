---
status: reverse-documented
source: lib/screens/practice_screen.dart, lib/engine/fever_mode_engine.dart, lib/engine/spaced_repetition.dart, lib/providers/scaffolding_provider.dart
date: 2026-05-29
verified-by: Scott Morley
---

# Practice System Design

> **Note**: Reverse-engineered from existing implementation. Captures current
> behaviour and clarified design intent. Sections marked **[GAP]** are designed
> but not yet implemented.

---

## Overview

The Practice screen is the primary daily-driver loop of Harmony Knight. It
presents a note-identification quiz in a low-anxiety, low-friction format
optimised for ADHD learners. The player sees a target note (rendered with
scaffolding appropriate to their confidence level) and picks its name from up
to four options.

**Design pillars:**
- **10-Second Rule**: the objective (identify this note) is clear in ≤ 10 seconds
- **Wait-Mode**: wrong answers are never penalised by time pressure — the correct
  answer is shown and the round waits until the player picks it
- **Scaffolding fade**: colour/shape cues shrink as the player gains confidence,
  driven by a user-controlled slider — never auto-removed
- **Streak momentum**: correct runs build a Fever multiplier; absence is forgiven
  via Broken Blade rather than a hard reset

---

## Note Pool (Grade-Aware)

The pool of notes the player can be tested on expands with grade level. All
pools are drawn from MIDI values; Figurenotes colours and shapes are derived
automatically from pitch class.

| Grade | Pool | Size |
|-------|------|------|
| 0 | C4, E4, G4 (tonic triad landmarks) | 3 |
| 1–2 | C major: C4–B4 | 7 |
| 3–4 | C major + A minor: A3, B3, C4–B4, C5 | 10 |
| 5+ | Full chromatic: C4–C5 | 13 |

Each question picks one target note from the pool, then selects up to 3 distractors
at random (fewer if the pool is smaller than 4). The target is always included in
the answer options; options are shuffled before display.

---

## Scaffolding System

Controlled by a global **Confidence Slider** (0.0 → 1.0) accessible on every
screen. The slider is user-driven and never locked — ADHD learners need freedom
to adjust support as executive function fluctuates throughout a session.

| Confidence | Note rendering | Name label | Answer button border |
|-----------|---------------|------------|---------------------|
| 0.0 | Full Figurenotes colour + shape | Fully visible | Figurenotes colour |
| 0.0–0.5 | Colour fades out | Fades proportionally | Fades to grey |
| 0.5–0.7 | Shape only | Hidden | Grey |
| 0.7–1.0 | Standard black oval | Hidden | Grey |

**Figurenotes mapping** (pitch class → colour):

| Note | Colour | Shape |
|------|--------|-------|
| C | Red | Circle |
| C# | Dark Pink | Circle |
| D | Orange | Square |
| D# | Purple | Square |
| E | Yellow | Triangle |
| F | Green | Diamond |
| F# | Teal | Diamond |
| G | Blue | Circle |
| G# | Indigo | Circle |
| A | Amber | Square |
| A# | Brown | Square |
| B | Blue Grey | Triangle |

---

## Fever Mode

Triggered when the player achieves 10 or more consecutive correct answers within a
session. Provides a score multiplier and a visual flourish (gradient banner).

**Multiplier formula:**
```
feverDepth = currentStreak − 10          // notes beyond threshold
multiplier = clamp(2.0 + (feverDepth / 5) × 0.1, 1.0, 3.0)
```

| Streak | Multiplier |
|--------|-----------|
| < 10 | 1.0× |
| 10 | 2.0× |
| 15 | 2.1× |
| 20 | 2.2× |
| … | … |
| ≥ 60 | 3.0× (cap) |

Any incorrect answer ends Fever Mode and resets the streak to 0.

---

## Broken Blade (Streak Restoration)

When a player has been absent for **≥ 48 hours**, their streak is not reset to
zero. Instead, a short warm-up mission unlocks streak restoration. This prevents
the "Day 0 anxiety" that causes ADHD learners to abandon streaks after a single
missed day.

**Mission length** scales inversely with the lapsed streak (higher past effort =
easier restoration):

| Lapsed streak | Warm-up notes required |
|--------------|----------------------|
| 1–5 | 5 |
| 6–20 | 4 |
| 21+ | 3 |

The warm-up is launched via `/practice?mode=broken_blade` and uses the same note
pool as regular practice at the player's grade level.

---

## Grade Advancement

**Decided: 2026-05-29** (was [GAP])

Grade level advances at the end of a Practice session when both conditions are met:

| Grade | Min session attempts | Min session accuracy |
|-------|---------------------|----------------------|
| 0 → 1 | 10 | 80% |
| 1–4 → next | 20 | 85% |
| 5–7 → next | 30 | 90% |
| 8 | — (ceiling) | — |

`PlayerProgressNotifier.checkAndAdvanceGrade(sessionTotal, sessionCorrect)` is
called when the player taps Back. On advance, a level-up fanfare overlay shows
for 2.5s. Thresholds live in `lib/engine/curriculum/grade_thresholds.dart`.

---

## Spaced Repetition

**Decided: 2026-05-29** — Option A: SR drives note selection within Practice.

`SpacedRepetitionScheduler.buildSessionQueue()` orders which notes are tested
each session. Due reviews appear first (warm-up), then new items. `SRItem`
records are persisted in `sr_items.json` and keyed by `'note_<midi>'`.

Response mapping:
- Correct first try → `SRResponse.good`
- Correct after a wrong attempt → `SRResponse.hard`
- Wrong attempt → `SRResponse.again` (retry same note immediately, no advance)

Distractors (the 3 wrong buttons) are still chosen randomly from the grade pool.
When the queue is exhausted, a new queue is built for the session continuation.

---

## Weak-Note Detection

After each answer, the practice screen updates a per-note accuracy map
(`Map<int midi, List<bool> attempts>`). A note is flagged as "weak" when:

- ≥ 3 attempts recorded for that note
- Miss rate > 50%

Weak notes are stored in `PlayerProgress.weakNotesMidi` (persisted to disk) and
surfaced on the Home screen as a "Focus area" hint. The list is refreshed after
every answer — no session boundary required.

---

## Session State Machine

```
Idle ──[postFrameCallback builds pool]──► Ready
Ready ──[question generated]──► Showing Question
Showing Question ──[correct tap]──► Feedback (correct) ──[600ms]──► Next Question
Showing Question ──[incorrect tap]──► Feedback (incorrect — Wait-Mode)
Feedback (incorrect) ──[correct tap]──► Feedback (correct) ──[600ms]──► Next Question
```

Broken Blade mode follows the same loop but exits automatically after the
mission-length quota of correct answers is reached.

---

## Follow-Up Work

1. ~~**Define grade advancement thresholds**~~ — Done Sprint 1 (S1-M1)
2. ~~**Decide SpacedRepetition integration approach**~~ — Done Sprint 2 (Option A)
3. ~~**Wire `setGradeLevel()`**~~ — Done Sprint 1 (S1-M1)
4. ~~**Add level-advance fanfare**~~ — Done Sprint 1 (S1-S1)
5. ~~**Broken Blade exit condition**~~ — Done Sprint 1 (S1-M2)
