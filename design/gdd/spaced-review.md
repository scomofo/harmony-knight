# GDD: Spaced Review

## Overview

Spaced Review schedules weak notes, rhythms, intervals, and other topic items so daily quests reinforce the player's nearest useful gap instead of repeating only static tasks.

## Player Fantasy

The player feels that the app remembers what they are working on and gently brings it back at the right time. Review should feel like a helpful teacher placing the next card on the stand, not like a punishment for mistakes.

## Detailed Rules

1. Review items are keyed by topic and item id, such as `note-reading-c4-b4:C4`.
2. Incorrect first attempts increase an item's review priority.
3. Correct first attempts reduce priority but do not immediately remove the item from future review.
4. Home may use review items to choose daily quest content only after the owning exercise mode can accept item-specific drill parameters.
5. Review must stay inside the player's curriculum prerequisites; weak advanced topics are ignored until unlocked.

## Formulas

| Formula | Definition |
|---|---|
| Review priority | `mistakeWeight + overdueWeight - successWeight` |
| Mistake weight | `recentMisses * 2` |
| Success weight | `recentCorrect * 1` |
| Overdue weight | `min(daysSinceLastSeen, 7)` |
| Eligible item | `topicUnlocked == true && playableExerciseExists == true` |

The exact scoring constants are initial design values. They should be tuned after playtests show whether review feels repetitive or too sparse.

## Edge Cases

- If no review items are eligible, Home falls back to the current recommended quest.
- If an item has corrupt or missing timestamps, treat it as not overdue.
- If a topic is no longer in the current curriculum band, keep the data but do not auto-recommend it.
- If several items tie, prefer the one with fewer total attempts to broaden exposure.

## Dependencies

### GDD Dependencies

- `curriculum-progression.md`
- `mastery-progression.md`
- `quest-reward-economy.md`

### Implementation Dependencies

- Exercise modes that can accept item-specific drill parameters.

## Tuning Knobs

| Knob | Initial Value |
|---|---|
| Recent review window | 10 attempts |
| Mistake weight | 2 |
| Success weight | 1 |
| Maximum overdue days counted | 7 |
| Maximum review items per daily quest | 3 |

## Acceptance Criteria

1. Given one additional incorrect attempt for an item, its computed review priority increases by `2`.
2. Given one additional correct attempt for an item, its computed review priority decreases by `1` and the item remains in review state.
3. Given `topicUnlocked == false` or `playableExerciseExists == false`, the item is excluded from review recommendations.
4. Given no eligible review items, recommendation falls back to the current normal quest recommendation.
5. Given identical saved review state, review selection returns the same ordered item list.
