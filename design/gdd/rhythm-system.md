---
status: designed
source: design/gdd/curriculum-system.md (Level 2), lib/engine/haptic_engine.dart
date: 2026-05-29
verified-by: Scott Morley
---

# Rhythm System Design

---

## Overview

The Rhythm System is the primary mechanic for Curriculum Level 2 ("Rhythm & The
Body"). It teaches note durations, time signatures, and metric feel through
kinaesthetic and auditory engagement rather than abstract notation. The Body
Base-10 method is the pedagogical backbone: subdivisions are represented as
body actions (tap, clap, nod) to anchor abstract durations in physical memory —
an evidence-based technique for learners with executive-function differences.

The metronome and haptic pulse are the system's two scaffolding outputs.
Both are user-controlled via Settings and fade out as confidence grows.

---

## Player Fantasy

The player feels the *pulse* of music in their body before they read it on a
page. Tapping along to a metronome, they realise that "a quarter note = one tap"
is not a rule to memorise but a sensation they already know. By the end of
Level 2 they can clap a rhythm in 3/4 from sight — without counting aloud.

---

## Detailed Rules

### Body Base-10 Method

Each subdivision level maps to one body action:

| Subdivision | Action | Counts aloud |
|-------------|--------|-------------|
| Whole note | Full-body sway | "1 — 2 — 3 — 4 —" |
| Half note | Head nod | "1 — 2 —" |
| Quarter note | Foot tap | "1 2 3 4" |
| Eighth note | Finger snap (alternating hands) | "1 and 2 and" |
| Sixteenth note | Tongue click | "1 e and a" |

The player is given a rhythm card (a sequence of note-value symbols) and must
tap along with the metronome, pressing one of four action buttons at the right
moment. Timing is graded in three windows:

| Window | Result | Points |
|--------|--------|--------|
| ≤ 80ms from beat | Perfect | 3 |
| 81–160ms from beat | Good | 2 |
| 161–300ms from beat | Late/Early | 1 |
| > 300ms | Miss | 0 |

Wait-Mode applies: a missed beat is replayed at the same tempo; the exercise
does not end on a miss.

### Time Signatures

| Signature | Beat grouping | Feel | Introduced at |
|-----------|-------------|------|---------------|
| 4/4 | 4 quarter-note beats | March, pop | Level 2 start |
| 3/4 | 3 quarter-note beats | Waltz | Level 2 mid |
| 2/4 | 2 quarter-note beats | March (strong) | Level 2 end |
| 6/8 | 6 eighth-note beats (2 groups of 3) | Compound feel | Level 3 |

Each time signature is introduced with a listen-only "feel demo" before the
player is asked to tap along.

### Metronome

The metronome is a configurable click track delivered via SoLoud (same
`AudioService` singleton as ghost tones). Properties:

- **BPM range**: 40–120 (default 60 for Level 2 introduction)
- **Default BPM by exercise**: slow exercises at 60, advanced at 80+
- **Click sound**: generated square-wave tick (via `ToneGenerator`) at MIDI 76
  (E5), 80ms duration, volume 0.6
- **Accent beat**: beat 1 of each measure plays at volume 1.0; other beats at 0.6
- **Visual pulse**: the AppBar background flashes on beat 1 with a brief orange
  overlay (100ms) when Reduce Motion is off

The metronome runs on a `Timer.periodic(Duration(milliseconds: 60000 ~/ bpm), ...)`
within the rhythm exercise screen, independent of the practice SR queue.

Enabled/disabled via `metronomeEnabled` in `SessionPrefsNotifier`.

### Haptic Feedback

When `hapticEnabled` is true, each metronome beat triggers `HapticFeedback.selectionClick()`
(light vibration on supported devices). Beat 1 of each measure uses
`HapticFeedback.mediumImpact()` for accent differentiation.

The haptic engine in `lib/engine/haptic_engine.dart` wraps Flutter's
`HapticFeedback` API. It is initialized once and re-used per beat.

---

## Formulas

### Timing Window Score

```
score(offsetMs) =
  3   if offsetMs ≤ 80
  2   if 80 < offsetMs ≤ 160
  1   if 160 < offsetMs ≤ 300
  0   if offsetMs > 300
```

### Session Accuracy

```
accuracy = totalPointsEarned / (totalBeats × 3)
```

Example: 12 beats, all Perfect → accuracy = 36/36 = 100%

### BPM to Timer Period

```
periodMs = 60000 / bpm
```

Example: 60 BPM → 1000ms period; 80 BPM → 750ms period

---

## Edge Cases

- **Tap before metronome starts**: offset measured from beat 1 of the first bar;
  early taps > 300ms before beat 1 are scored as Miss, not Perfect
- **Device with no haptic motor**: `HapticFeedback` calls are no-ops on desktop
  (Windows); no crash, no warning needed
- **Metronome disabled mid-exercise**: the timer is not restarted; if the user
  disables the metronome in Settings during an exercise, the current exercise
  finishes with no click but the timing windows remain active
- **6/8 ambiguity**: 6/8 is treated as 2 groups of 3 eighth notes; the accent
  beat is beat 1 and beat 4 (not beat 1 and beat 2 as in 2/4)
- **Empty rhythm card**: if the exercise generator produces zero beats, show the
  "Feel Demo" listen-only screen instead of the tapping exercise

---

## Dependencies

| System | Dependency | Direction |
|--------|-----------|-----------|
| `AudioService` (SoLoud) | Plays metronome click | Rhythm → Audio |
| `HapticEngine` | Pulses on each beat | Rhythm → Haptic |
| `SessionPrefsNotifier` | `metronomeEnabled`, `hapticEnabled`, BPM preference | Rhythm reads |
| `PlayerProgressNotifier` | Records session accuracy; gates Level 2 unlock | Rhythm → Progress |
| Curriculum System | Level 2 content list; grade gating | Curriculum → Rhythm |
| Practice System | Rhythm exercises surface in the Practice queue at Level 2+ | Practice → Rhythm |

---

## Tuning Knobs

| Knob | Default | Safe range | Effect |
|------|---------|-----------|--------|
| Default intro BPM | 60 | 40–80 | Lower = more accessible; higher = faster pacing |
| Perfect window | 80ms | 50–120ms | Wider = more forgiving; narrower = more demanding |
| Good window | 160ms | 100–250ms | Affects ratio of Good to Miss scores |
| Accent volume ratio | 1.0 / 0.6 | 0.7–1.0 / 0.4–0.7 | Higher contrast = clearer downbeat |
| Exercises per session | 4 | 2–8 | More = deeper practice; fewer = faster sessions |

---

## Acceptance Criteria

| # | Criterion | How to verify |
|---|-----------|--------------|
| 1 | Metronome click plays at configured BPM | Start a rhythm exercise at 60 BPM; count 10 clicks; elapsed ≈ 10s |
| 2 | Beat 1 accent is louder than other beats | Listen with headphones; first beat of each bar is audibly louder |
| 3 | Haptic fires on each beat (mobile) | Run on Android device with haptics on; feel vibration per beat |
| 4 | Perfect/Good/Miss scored correctly | Tap 80ms late → Good (2 pts); 200ms late → Late (1 pt) |
| 5 | Wait-Mode active | Miss a beat; exercise replays the beat, does not advance |
| 6 | Metronome off = no click | Disable Metronome in Settings; start exercise; silence on beats |
| 7 | Haptic off = no vibration | Disable Haptic in Settings; no phone vibration during exercise |
| 8 | 4/4, 3/4, 2/4 all generate correct bar groupings | Inspect beat count per measure in each signature |
