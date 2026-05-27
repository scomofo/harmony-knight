# GDD: Session Summary

## Overview

Session Summary defines the small post-session feedback payload that Home can display after Practice, Real-Time, Duel, or Recovery. It turns completed play into visible progress and a clear next step.

## Player Fantasy

The player returns to Home feeling noticed: the app can name what improved, what reward is ready, and what to try next. The summary should be brief, warm, and useful enough to invite one more short session.

## Detailed Rules

1. A session summary is created by the mode that owns the completed play session.
2. Home displays at most one latest summary chip.
3. Summary copy must describe concrete progress, such as stars gained, quest completed, or a specific topic practiced.
4. If no meaningful progress occurred, Home should show no summary chip rather than filler praise.
5. A displayed summary may point to a claimable quest or recommended next quest, but it must not directly grant rewards.

## Formulas

| Formula | Definition |
|---|---|
| Mastery star delta | `masteryAfterStars - masteryBeforeStars` |
| Summary eligible | `questCompletedIds.isNotEmpty || masteryStarDelta > 0 || sessionAttempts > 0` |
| Claim prompt eligible | `questCompletedIds` contains at least one complete unclaimed quest |

## Edge Cases

- If the player exits a mode without an attempt, do not create a summary.
- If the app is reopened later, expired summaries should not block the current daily path.
- If several quests complete in one session, summarize the highest-priority quest and keep all claim ids in the payload.
- If mastery data is missing, summarize quest progress only.

## Dependencies

### GDD Dependencies

- `quest-reward-economy.md`
- `mastery-progression.md`
- `curriculum-progression.md`

### Implementation Dependencies

- Practice result recording.
- Real-Time result recording.
- Duel result recording.
- Recovery result recording.

## Tuning Knobs

| Knob | Initial Value |
|---|---|
| Maximum visible summaries | 1 |
| Summary expiry | Next app launch or next completed session |
| Headline max length | 48 characters |
| Detail max length | 90 characters |

## Acceptance Criteria

1. Completing a meaningful session creates a summary payload.
2. Exiting without an attempt creates no summary.
3. Home displays at most one summary.
4. Summary payload can identify claimable quests without granting rewards.
5. Summary copy uses concrete progress language.
