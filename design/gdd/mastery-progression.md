# GDD: Mastery Progression

## Overview

Mastery Progression records per-topic learning evidence and converts attempts, accuracy, confidence, and later fluency into stars used by Home recommendations and future curriculum advancement.

## Player Fantasy

The player sees proof that practice is turning into musicianship. Stars should feel like earned clarity, not a judgment of talent.

## Detailed Rules

1. Only first attempts count toward mastery accuracy.
2. Each topic has independent mastery state keyed by `topicId`.
3. Recent accuracy uses the latest capped attempt window, not lifetime accuracy.
4. Confidence represents scaffold independence; higher confidence means less assistance.
5. Stars are feedback and recommendation input. Grade advancement requires a separate curriculum rule.

## Formulas

| Formula | Definition |
|---|---|
| Accuracy | `correct / attempts`, or `0` when attempts are `0` |
| Recent accuracy | `recentCorrectCount / recentAttemptCount`, or `0` when no recent attempts exist |
| Average response | `round(totalResponseMs / attempts)`, or `0` when attempts are `0` |
| 1 star | `recentAccuracy >= 0.8` |
| 2 stars | `recentAccuracy >= 0.8 && bestConfidence >= 0.6` |
| 3 stars | `recentAccuracy >= 0.8 && bestConfidence >= 0.8` |

## Edge Cases

- Missing mastery state displays as zero attempts.
- Incorrect first attempts must still be recorded.
- Repeated taps while feedback is visible must not create extra mastery attempts.
- Corrupt saved mastery data resets to an empty mastery map.

## Dependencies

### GDD Dependencies

- `curriculum-progression.md`
- `quest-reward-economy.md`

### Implementation Dependencies

- Practice result recording.
- Real-Time result recording.
- Duel result recording.

## Tuning Knobs

| Knob | Initial Value |
|---|---|
| Recent attempt window | 10 |
| Accuracy threshold | 0.8 |
| 2-star confidence threshold | 0.6 |
| 3-star confidence threshold | 0.8 |
| Fluency timing gate | Deferred until playtest calibration |

## Acceptance Criteria

1. Correct and incorrect first attempts update mastery.
2. Recent attempt history remains capped.
3. Star counts match the formulas.
4. Mastery persists across app restart.
5. Missing or corrupt state fails safely to no mastery.
