# GDD: Recovery Loop

## Overview

Recovery Loop defines the Broken Blade return experience for players who lapse. It replaces punishment with a short restorative warmup that helps the player resume practice.

## Player Fantasy

The player feels welcomed back, not scolded. Their musical blade may need mending, but the repair is quick, achievable, and hopeful.

## Detailed Rules

1. Recovery appears when the player has been inactive for at least 48 hours and is not already in recovery.
2. Recovery recommendations outrank normal daily and challenge recommendations.
3. The recovery task should take about 60 seconds.
4. Recovery uses familiar prerequisite material, not new curriculum.
5. Recovery completion restores the player to the normal Home loop.

## Formulas

| Formula | Definition |
|---|---|
| Recovery eligible | `lastActiveAge >= 48 hours && inBrokenBladeRecovery == false` |
| Recovery complete | `recoveryQuestComplete == true` |
| Recovery reward | `10 Harmony` |

## Edge Cases

- If last active time is missing, do not show recovery.
- If the player opens a normal mode instead of recovery, allow it.
- If recovery state is corrupt, prefer normal Home over blocking play.
- Recovery copy must avoid shame language.

## Dependencies

### GDD Dependencies

- `quest-reward-economy.md`
- `curriculum-progression.md`

### Implementation Dependencies

- Player progress provider for streak and recovery flags.

## Tuning Knobs

| Knob | Initial Value |
|---|---|
| Lapse threshold | 48 hours |
| Recovery duration target | 60 seconds |
| Recovery reward | 10 Harmony |
| Recovery task difficulty | Current prerequisite topic |

## Acceptance Criteria

1. Given `lastActiveAge >= 48 hours` and `inBrokenBladeRecovery == false`, Home shows the recovery prompt.
2. Given `lastActiveAge < 48 hours`, Home does not show the recovery prompt.
3. Given a generated recovery quest, its target duration is `<= 60 seconds` and its reward is `10 Harmony`.
4. Given a completed recovery quest, Home returns to the normal recommended quest and daily path display.
5. Recovery UI copy does not contain punitive terms: `lost`, `failed`, `punished`, `penalty`, or `bad`.
