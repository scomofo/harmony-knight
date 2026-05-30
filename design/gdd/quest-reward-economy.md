# GDD: Quest Reward Economy

## Overview

Quest Reward Economy defines daily quest structure, reward claiming, daily rollover, and the small Harmony point loop that makes short practice sessions feel complete.

## Player Fantasy

The player feels that each small practice action repairs, brightens, or strengthens their musical world. Rewards should encourage return without turning learning into grinding.

## Detailed Rules

1. Home shows exactly one recommended quest.
2. First-session Home shows one daily task; return-session Home shows three.
3. Quest progress increments only from mode-owned result events.
4. Quest rewards are claimable only after completion.
5. Each quest can be claimed once per generated day.
6. Daily quests reset when saved quest state belongs to a previous local day.

## Formulas

| Formula | Definition |
|---|---|
| Progress percent | `clamp(progressCount / targetCount, 0, 1)` |
| Quest complete | `progressCount >= targetCount` |
| Claimable | `isComplete == true && claimed == false` |
| First-session path | `completedDailyQuests == 0 && claimedDailyQuests == 0 && noteReadingAttempts == 0` |

## Edge Cases

- Progress beyond the target is clamped.
- Claiming an incomplete quest returns no reward.
- Claiming an already claimed quest returns no reward.
- Legacy saved quest state without a generated day resets safely.

## Dependencies

### GDD Dependencies

- `mastery-progression.md`
- `curriculum-progression.md`
- `recovery-loop.md`

### Implementation Dependencies

- Player progress provider for Harmony points.

## Tuning Knobs

| Knob | Initial Value |
|---|---|
| First-session quest count | 1 |
| Normal daily quest count | 3 |
| Note-reading target | 5 |
| Real-Time target | 6 |
| Duel target | 1 |
| Recommended quest reward | 20 Harmony |
| Recovery reward | 10 Harmony |
| Hard quest reward | 30 Harmony |

## Acceptance Criteria

1. Quest progress persists across app restart.
2. Same-day quest state restores.
3. Previous-day quest state resets.
4. Completed quests can be claimed once.
5. Harmony points increase only through successful claims.
