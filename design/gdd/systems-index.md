# Systems Index

This index tracks the core learning-loop systems that support Home, mastery, daily quests, and retention. Status here is about design readiness; implementation readiness still requires passing `design-review` for the specific system.

## Design Order

| Order | System | File | Design Status | Implementation Status | Review Status |
|---|---|---|---|---|---|
| 1 | Curriculum Progression | `curriculum-progression.md` | Draft | Partial implementation exists | Needs design-review |
| 2 | Mastery Progression | `mastery-progression.md` | Draft | Partial implementation exists | Needs design-review |
| 3 | Quest Reward Economy | `quest-reward-economy.md` | Draft | Partial implementation exists | Needs design-review |
| 4 | Session Summary | `session-summary.md` | Draft | Not started | Needs design-review |
| 5 | Recovery Loop | `recovery-loop.md` | Draft | Progress flags only | Needs design-review |
| 6 | Spaced Review | `spaced-review.md` | Draft | Not started | Needs design-review |

## Dependency Graph

| System | Requires | Blocks |
|---|---|---|
| Curriculum Progression | Balance check, mastery thresholds, playable exercise coverage | Adaptive recommendations, spaced review, recovery task choice |
| Mastery Progression | Curriculum topics, result recording | Adaptive recommendations, spaced review, session summaries |
| Quest Reward Economy | Mastery signals, player progress rewards | Daily path, reward claiming, session summaries |
| Session Summary | Quest completion, mastery deltas, mode result events | Post-session Home feedback |
| Recovery Loop | Quest rewards, curriculum-safe warmups, player progress flags | Broken Blade return flow |
| Spaced Review | Mastery attempts, curriculum unlocks, item-specific exercise parameters | Weak-item daily quest generation |

## Recommended Implementation Sequence

1. Finish first-session daily path filtering in Quest Reward Economy.
2. Add Session Summary payloads for Practice, then render the Home summary chip.
3. Add explicit Home accessibility labels for quest cards, daily tasks, and mode cards.
4. Implement Recovery Loop once the recovery quest path is concrete.
5. Implement Spaced Review after exercise modes can accept item-specific drill parameters.

## Review Gate

Each GDD should move through:

1. Draft
2. `design-review`
3. Approved
4. Implementation plan
5. Implemented

Do not start broad implementation for a system marked `Needs design-review` unless the change is a narrow bug fix or already covered by an approved adjacent spec.
