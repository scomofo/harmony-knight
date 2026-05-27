# GDD: Curriculum Progression

## Overview

Curriculum Progression defines the order in which music-learning topics unlock, how Home chooses pedagogically appropriate next steps, and how the app avoids presenting advanced theory before playable foundations exist.

## Player Fantasy

The player feels guided through a musical kingdom one reliable skill at a time. Each new quest should feel like the next reachable doorway, not a surprise exam or a disconnected trivia prompt.

## Detailed Rules

1. A curriculum topic may be recommended only when its prerequisite topic has at least 2 mastery stars or the player explicitly chooses the mode manually.
2. Real-Time Training is a fluency extension of note-reading, not the first exposure to a topic.
3. Duel/counterpoint tasks require evidence from note-reading or interval topics before they are recommended.
4. Text-only theory prompts may reinforce a concept but must not be the first playable task for a new concept.
5. Advanced harmony, fugue, post-tonal theory, and analysis remain optional branches until playable exercise coverage exists.

### Initial Topic Order

| Band | Role | Example Topics |
|---|---|---|
| Seed | Listening and sensory basics | High/low, same/different, steady beat. |
| Figurenotes | First note mapping | C-D-E, C major pentachord. |
| Staff Landmarks | Staff literacy | Middle C, treble G, bass F, steps/skips. |
| Rhythm Basics | Simple pulse literacy | Note/rest values, 2/4, 3/4, 4/4. |
| Keys and Scales | Early tonal maps | C/G/F major, A minor, up to two sharps/flats. |
| Intervals and Triads | Structure recognition | 2nds, 3rds, 5ths, octaves, major/minor triads. |
| Harmony Basics | Function | I/IV/V/vi, simple cadences. |
| Counterpoint Intro | Motion and independence | Contrary/parallel motion, first species. |
| Intermediate Expansion | Broader grammar | Inversions, close-key modulation, forms. |
| Advanced Branches | Capstone theory | Chromatic harmony, fugue, post-tonal analysis. |

## Formulas

| Formula | Definition |
|---|---|
| Topic ready | `prerequisiteStars >= 2` |
| Fluency-ready | `topicStars >= 2 && practiceQuestComplete == true` |
| Advancement-ready | `topicStars == 3 && confidenceEvidence >= 0.8` |

## Edge Cases

- If a topic has no implemented exercise generator, it cannot be auto-recommended.
- If mastery data is missing, recommend the nearest prerequisite Practice task.
- If the player manually enters a harder mode, allow play but do not treat it as curriculum advancement unless mastery gates are met.

## Dependencies

- `mastery-progression.md`
- `quest-reward-economy.md`
- `design/balance/balance-check-curriculum-2026-05-27.md`

## Tuning Knobs

| Knob | Initial Value |
|---|---|
| Minimum recommendation stars | 2 |
| Advancement stars | 3 |
| Confidence evidence for advancement | 0.8 |
| Maximum new concepts per recommended quest | 1 |

## Acceptance Criteria

1. Recommendation logic never selects a topic with unmet prerequisites.
2. Real-Time is recommended only after note-reading readiness.
3. Duel is recommended only after prerequisite mastery exists.
4. Topics without playable exercise coverage are not auto-recommended.
5. Curriculum progression can be tested from topic state alone.
