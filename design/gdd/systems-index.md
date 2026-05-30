# GDD Systems Index

All game design documents in `design/gdd/`, grouped by curriculum phase.

## Core Systems (all levels)

| System | File | Status | Notes |
|--------|------|--------|-------|
| Practice System | `practice-system.md` | reverse-documented | SR-driven, session summary, Broken Blade, focus mode |
| Duel System | `duel-system.md` | reverse-documented | First Species counterpoint vs Discord Sentinel |
| Curriculum System | `curriculum-system.md` | reverse-documented | 11 levels, 3 phases, grade advancement |

## Level-Specific Systems

| Level | System | File | Status |
|-------|--------|------|--------|
| Level 2 | Rhythm System | `rhythm-system.md` | designed + implemented |
| Level 3 | Circle of Fifths | `circle-of-fifths-system.md` | designed + implemented |
| Level 4 | Interval System | `interval-system.md` | designed + implemented |
| Level 4 | Triad System | `triad-system.md` | designed + implemented |

## Planned (not yet documented)

| Level | System | Notes |
|-------|--------|-------|
| Level 4 | Gliph System (visual shapes) | Mentioned in curriculum GDD; no GDD |
| Level 5+ | Harmony / Roman numeral system | No GDD |
| Level 9 | Second & Third Species Counterpoint | Extension of Duel System; no GDD |

---

## Learning-Loop Systems Design Status

Tracks core learning-loop systems (Home, mastery, daily quests, retention). Status is design readiness; implementation requires `design-review` gate.

### Design Order

| Order | System | File | Design Status | Implementation Status | Review Status |
|---|---|---|---|---|---|
| 1 | Curriculum Progression | `curriculum-progression.md` | Draft | Partial implementation exists | Needs design-review |
| 2 | Mastery Progression | `mastery-progression.md` | Draft | Partial implementation exists | Needs design-review |
| 3 | Quest Reward Economy | `quest-reward-economy.md` | Draft | Partial implementation exists | Needs design-review |
| 4 | Session Summary | `session-summary.md` | Draft | Not started | Needs design-review |
| 5 | Recovery Loop | `recovery-loop.md` | Draft | Progress flags only | Needs design-review |
| 6 | Spaced Review | `spaced-review.md` | Draft | Not started | Needs design-review |

### Dependency Graph

| System | Requires | Blocks |
|---|---|---|
| Curriculum Progression | Balance check, mastery thresholds, playable exercise coverage | Adaptive recommendations, spaced review, recovery task choice |
| Mastery Progression | Curriculum topics, result recording | Adaptive recommendations, spaced review, session summaries |
| Quest Reward Economy | Mastery signals, player progress rewards | Daily path, reward claiming, session summaries |
| Session Summary | Quest completion, mastery deltas, mode result events | Post-session Home feedback |
| Recovery Loop | Quest rewards, curriculum-safe warmups, player progress flags | Broken Blade return flow |
| Spaced Review | Mastery attempts, curriculum unlocks, item-specific exercise parameters | Weak-item daily quest generation |
