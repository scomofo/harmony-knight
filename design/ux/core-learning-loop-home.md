# UX Spec: Core Learning Loop + Home

> **Status**: In Design
> **Author**: Scott + Codex UX Designer
> **Last Updated**: May 27, 2026
> **Journey Phase(s)**: First session, daily return, post-session continuation
> **Template**: UX Spec

---

## Purpose & Player Need

The Home screen is the player's command center and habit anchor. It should answer three questions within five seconds:

1. What should I do next?
2. Why is this the right next step for my musical growth?
3. What reward or progress will I earn if I do it?

The player arrives wanting a low-friction way to continue learning music without deciding from scratch. The design must support neuro-inclusive use: short sessions, clear next action, visible support controls, and recovery from absence without shame.

The core loop this screen supports is:

1. Choose the recommended quest.
2. Complete a short playable lesson or challenge.
3. Receive immediate feedback and mastery progress.
4. Unlock or repair something meaningful.
5. Return to Home with one clear next step.

---

## Player Context on Arrival

Players arrive at Home in four common states:

| Arrival Context | Likely Emotion | Design Need |
|---|---|---|
| First launch | Curious but uncertain | Explain the first action without a tutorial wall. |
| Daily return | Low activation energy | Offer one short recommended quest. |
| After success | Motivated | Show what improved and offer a next step. |
| After absence | Avoidant or guilty | Offer Broken Blade recovery, not punishment. |

Home should assume the player may have limited attention, variable confidence, and an uneven practice schedule. The screen should never make the player inspect the full curriculum just to know what to do next.

---

## Navigation Position

This screen lives at:

`App Root -> Home -> Practice | Real-Time Training | Duel | Curriculum Map | Settings`

Home is a top-level destination and the default return point after most short sessions. It is not a landing page or marketing surface; it is the playable hub.

---

## Entry & Exit Points

### Entries

| Entry Source | Trigger | Player Carries This Context |
|---|---|---|
| App launch | Open app | Saved progress, confidence, streak, grade level, weak skills. |
| Practice complete | Auto-return or back | Latest score, weak note, quest progress. |
| Real-Time complete | Auto-return or back | Hit/miss stats, accuracy, timing weakness. |
| Duel turn/session complete | Auto-return or back | Harmony meter, accepted ghost notes, duel outcome. |
| Broken Blade recovery | Recovery complete | Streak repaired and confidence restored. |

### Exits

| Exit Destination | Trigger | Notes |
|---|---|---|
| Practice | Tap recommended lesson or Practice card | Should pass selected exercise family when available. |
| Real-Time Training | Tap real-time quest or card | Should pass chart/drill difficulty when available. |
| Duel | Tap duel quest or Duel card | Should pass current counterpoint level when available. |
| Curriculum Map | Tap map card or level chip | Read-only browse plus level selection once unlocked. |
| Settings | Tap settings icon | No progress mutation. |

---

## Layout Specification

### Information Hierarchy

1. Current state: streak, harmony points, confidence mode.
2. Recommended next quest: the single best action now.
3. Daily quest checklist: 2-3 tiny tasks with visible progress.
4. Main mode cards: Practice, Real-Time, Duel, Curriculum.
5. Recovery or session summary when relevant.
6. Confidence slider, always reachable.

### Layout Zones

| Zone | Purpose | Content |
|---|---|---|
| Header | Quick identity and status | Streak, Harmony Knight title, harmony points, settings. |
| Quest Focus | Primary next action | Recommended quest card with reward and expected duration. |
| Daily Path | Stickiness loop | Three daily tasks with checkmarks and rewards. |
| Mode Select | Player agency | Compact cards for Practice, Real-Time, Duel, Curriculum. |
| Support Rail | Neuro-inclusive control | Confidence slider and Broken Blade recovery prompt. |

### Component Inventory

| Component | Type | Interactive | Notes |
|---|---|---|---|
| Recommended Quest Card | Primary button/card | Yes | Replaces equal-weight "what should I do?" choice paralysis. |
| Daily Quest Checklist | Progress list | Yes, via task rows | Each row deep-links to the matching mode. |
| Mode Cards | Secondary buttons | Yes | Still available for autonomy. |
| Broken Blade Prompt | Recovery CTA | Yes | Appears after absence; tone must be restorative. |
| Confidence Slider | Persistent control | Yes | Affects hints and scaffolding globally. |
| Session Summary Chip | Post-session feedback | Yes | Shows latest win and next recommendation. |

### ASCII Wireframe

```text
+------------------------------------+
| Streak 4   Harmony Knight  HP 85   |
+------------------------------------+
| Level 1: Color-Coded Staff         |
| First Light - Learn C, D, E         |
+------------------------------------+
| NEXT QUEST                         |
| Read 5 notes on the staff          |
| Reward: +20 Harmony   ~2 min       |
| [ Start Quest ]                    |
+------------------------------------+
| DAILY PATH                         |
| [ ] Read 5 notes                   |
| [ ] Hit 6 notes in Real-Time       |
| [ ] Win 1 Duel turn                |
+------------------------------------+
| Practice     Real-Time             |
| Duel         Curriculum            |
+------------------------------------+
| Figurenotes -- Confidence -- Maestro|
+------------------------------------+
```

---

## States & Variants

| State / Variant | Trigger | What Changes |
|---|---|---|
| First session | No meaningful progress yet | Recommended quest is "Start with C, D, E"; daily path has one task only. |
| Daily return | Player active within 48 hours | Show daily path, current quest, and streak continuity. |
| Broken Blade | Last active 48+ hours ago | Replace daily path top row with a 60-second recovery quest. |
| Post-session success | Returning from completed task | Show "You improved X" and next recommended task. |
| Stuck/low accuracy | Recent accuracy below threshold | Recommend easier drill and lower confidence expectation. |
| High confidence | Strong recent performance | Recommend Real-Time or lower-scaffold version of same skill. |
| Curriculum browsing | Player taps map | Show all levels, but mark exact current topic and prerequisites. |

---

## Interaction Map

| Component | Player Action | Immediate Feedback | Outcome |
|---|---|---|---|
| Recommended Quest | Tap Start Quest | Button press, short sparkle/audio cue | Navigate to the selected mode with quest context. |
| Daily Task Row | Tap row | Row highlights | Navigate to matching mode. |
| Practice Card | Tap | Card ripple | Navigate to Practice default drill. |
| Real-Time Card | Tap | Card ripple | Navigate to Real-Time Training. |
| Duel Card | Tap | Card ripple | Navigate to Duel. |
| Curriculum Card | Tap | Card ripple | Navigate to Curriculum Map. |
| Confidence Slider | Drag | Slider label and visual scaffolds update | Persist confidence and adjust hint level. |
| Broken Blade CTA | Tap Restore | Warm recovery animation | Navigate to recovery practice. |

Target inputs:

- Touch and pointer are primary.
- Keyboard/tab navigation should work for web accessibility.
- Gamepad is not required for the current Flutter slice, but should not be blocked by design.

---

## Events Fired

| Player Action | Event Fired | Payload / Data |
|---|---|---|
| Start recommended quest | `QuestStarted` | quest id, mode, level, confidence, source: home |
| Complete quest | `QuestCompleted` | quest id, score, accuracy, duration, reward |
| Tap mode card | `ModeSelected` | mode, source: home |
| Adjust confidence | `ConfidenceChanged` | previous value, new value, source screen |
| Start recovery | `BrokenBladeRecoveryStarted` | last active age, current streak |
| Complete recovery | `BrokenBladeRecoveryCompleted` | duration, result, restored streak state |

Persistent state changes must be owned by progress/session providers, not by Home UI widgets.

---

## Transitions & Animations

- Home enters instantly or with a short fade under 150 ms.
- Recommended quest card can pulse once when a new daily quest appears, then remain still.
- Daily task completion should use a checkmark pop and small harmony-points count-up.
- Broken Blade repair should use a calm restorative animation, not an alarm or failure effect.
- Respect reduced-motion settings once available: replace pulses/count-ups with static state changes.

---

## Data Requirements

| Data | Owner | Used For |
|---|---|---|
| Current level/topic | Progress/curriculum system | Quest selection and banner. |
| Current streak | Progress system | Header and Broken Blade state. |
| Harmony points | Progress/economy system | Rewards and unlocks. |
| Confidence value | Scaffolding system | Global hint/scaffold behavior. |
| Recent accuracy by skill | Mastery system to add | Next-best lesson selection. |
| Weak notes/intervals/rhythms | Spaced repetition system to add | Daily quest generation. |
| Daily quest completion | Quest system to add | Stickiness and session goals. |
| Last session result | Session summary system to add | Post-session feedback. |

New systems implied by this UX:

1. `Quest` model for daily/recommended tasks.
2. `SkillMastery` model for per-topic progress.
3. `SpacedReview` model for weak-item scheduling.
4. Session summary payload returned by Practice, Real-Time, and Duel.

---

## Accessibility

- All cards and buttons need semantic labels, not only visual text.
- The confidence slider needs a semantic value such as "Figurenotes, 0 percent confidence" or "Transition, 51 percent confidence."
- Color must not be the only indicator of note identity. Figurenotes shapes and labels remain required.
- Text should remain legible on 390 px mobile width.
- Daily task completion must be readable without animation.
- Any audio or haptic cue must have a visual equivalent.

Known gap: Flutter web currently exposes sparse semantics in browser automation. Add explicit semantic labels during implementation and verify with accessibility enabled.

---

## Localization Considerations

- Keep quest text short and translatable.
- Avoid embedding music symbols inside strings where possible; use structured note/chord data rendered by widgets.
- Avoid idioms that make recovery feel punitive. "Restore your blade" is acceptable if paired with clear literal meaning.
- Level names may remain thematic, but task names should be plain: "Read 5 notes," "Tap 6 notes," "Win 1 Duel turn."

---

## Acceptance Criteria

1. Home shows exactly one primary recommended quest.
2. Home shows 2-3 daily tasks after the first session.
3. New players see a one-task first session path, not the full daily system.
4. Broken Blade recovery appears after a lapse and offers a short repair task.
5. Mode cards remain available below the recommendation for player autonomy.
6. Confidence slider remains reachable on Home and does not overlap content.
7. Recommended quest deep-links to the correct mode.
8. Completing a quest updates daily task progress and harmony points.
9. Home can display a post-session summary after returning from Practice, Real-Time, or Duel.
10. Flutter analyze and widget tests pass after implementation.
11. Browser playtest confirms no horizontal overflow on mobile.
12. Accessibility labels exist for primary quest, daily tasks, mode cards, and confidence slider.

---

## Open Questions

1. Player journey map does not yet exist at `design/player-journey.md`; this spec assumes first session, daily return, and post-session continuation phases.
2. No formal GDD exists yet for curriculum, mastery, or economy. The curriculum should be validated in a separate design pass before advanced levels are expanded.
3. The reward economy needs a tuning pass: how many harmony points should a daily quest award, and what do points buy or unlock?
4. We need to decide whether Real-Time Training is a core required mode or an optional fluency mode for players who are ready.
5. We need to decide whether the app should support keyboard/gamepad controls beyond basic web accessibility.
