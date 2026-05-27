# UX Spec: Core Learning Loop + Home

> **Status**: Revised after design review
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

## Player Fantasy

The player should feel like a young musician-knight returning to a familiar training hall where the next useful practice step is already prepared. Home should feel supportive and purposeful rather than evaluative: the app notices what the player has practiced, celebrates visible mastery progress, and offers one achievable next quest without making the player navigate a syllabus.

Success is not "the player maximizes points." Success is "the player trusts the app to choose a musically appropriate next step, completes a short practice action, and sees proof that their musicianship improved."

---

## Implementation Scope

This spec separates the current shippable slice from future systems so implementation can proceed without over-promising.

| Scope | Included |
|---|---|
| Implemented foundation | Recommended quest card, three daily quests, quest progress persistence, reward claiming, note-reading mastery persistence, Home mastery feedback line. |
| Next shippable slice | First-session daily path reduction, post-session summary chip, explicit accessibility labels, and recommendation copy that explains why a quest is useful. |
| Future systems | Spaced review of weak notes, adaptive quest generation, Broken Blade recovery task, curriculum level advancement, full session summary payloads. |

The Home UI may display data from future systems only after the owning provider/model exists. Placeholder UI text must not imply a system is active before it is implemented.

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
| First session | No completed quest and no mastery attempts | Recommended quest is "Read 5 notes"; daily path shows only the first note-reading task. |
| Daily return | Player active within 48 hours | Show daily path, current quest, and streak continuity. |
| Broken Blade | Last active 48+ hours ago | Replace daily path top row with a 60-second recovery quest. |
| Post-session success | Returning from completed task | Show "You improved X" and next recommended task. |
| Stuck/low accuracy | Recent accuracy below 80% over the last 10 attempts | Keep Practice recommended and display mastery feedback without shame language. |
| High confidence | At least 2 note-reading stars and the Practice daily quest is complete or claimed | Recommend Real-Time as a fluency extension after the current quest model supports adaptive recommendations. |
| Curriculum browsing | Player taps map | Show all levels, but mark exact current topic and prerequisites. |

---

## Detailed Rules

### Recommendation Rules

Home always shows exactly one primary recommended quest. Until adaptive quest generation exists, the static recommended quest is `Read 5 notes` in Practice.

When adaptive recommendation is added, Home must choose the first matching rule:

| Priority | Condition | Recommended Quest | Rationale |
|---|---|---|---|
| 1 | `isStreakLapsed == true` and `inBrokenBladeRecovery == false` | 60-second recovery Practice quest | Repair return friction before adding challenge. |
| 2 | No mastery attempts for `note-reading-c4-b4` | Practice: Read 5 notes | Establish the first note-reading evidence. |
| 3 | Recent accuracy below 80% over last 10 attempts | Practice: Read 5 notes with current scaffolding | Reinforce accuracy before speed. |
| 4 | Note-reading mastery has at least 2 stars and Practice quest is complete or claimed | Real-Time: Hit 6 notes | Move from recognition to fluency only after evidence. |
| 5 | Duel prerequisite topic has at least 2 stars and Real-Time daily quest is complete or claimed | Duel: Win 1 turn | Save counterpoint challenge for prepared players. |
| 6 | No higher-priority rule matches | First incomplete daily quest | Keep the next action clear. |

The recommendation engine must never advance a player to a faster or more abstract task solely from total correct answer count. It must use topic mastery, current quest state, and scaffold confidence.

### First Session Rules

First-session Home is active when all are true:

1. No daily quest has been completed.
2. `note-reading-c4-b4` has zero mastery attempts.
3. The player has not claimed any daily quest reward.

In this state, Home shows one daily task: `Read 5 notes`. The mode cards remain available below the recommended quest.

After the player completes or claims the first quest, Home may show the full three-task daily path on the next Home render.

### Mastery Feedback Rules

The Recommended Quest card shows a compact note-reading line:

| Mastery State | Display Text |
|---|---|
| No record or zero attempts | `Note reading: start your first attempt` |
| One or more attempts | `Note reading: X/3 stars` |

This line is feedback only. It must not change the recommended quest until adaptive recommendation rules are implemented.

### Reward Rules

Quest rewards are granted only through the quest provider claim flow. Home may call the claim action, but it must not directly mark quests complete or mutate mastery.

Rewards are one-time per daily quest instance. Claimed state must persist so reopening the app cannot duplicate Harmony points.

---

## Formulas and Thresholds

| Formula / Threshold | Definition | Notes |
|---|---|---|
| Recent accuracy | `recentCorrectCount / recentAttemptCount` over the latest capped mastery window | Current implementation caps recent attempts at 10. |
| 1 mastery star | `recentAccuracy >= 0.8` | Accurate with current scaffolding. |
| 2 mastery stars | `recentAccuracy >= 0.8 && bestConfidence >= 0.6` | Accurate with partial scaffolding. |
| 3 mastery stars | `recentAccuracy >= 0.8 && bestConfidence >= 0.8` | Accurate with low scaffolding. |
| Average response time | `totalResponseMs / attempts`, rounded | Tracked now; not yet used as a gate. |
| Daily quest progress | `progressCount / targetCount`, clamped to `0.0..1.0` | Avoid overfilled progress bars. |
| First-session daily count | `1` visible task | Reduces cognitive load. |
| Return-session daily count | `3` visible tasks | Supports a short habit loop. |
| Broken Blade lapse | `lastActiveAge >= 48 hours` | Future recovery system threshold. |
| Recovery duration target | `60 seconds` | Future recovery task budget. |
| Recommended quest duration target | `60-180 seconds` | Keeps sessions short. |

Response-time fluency gates are intentionally deferred until playtests produce per-topic timing data. Do not block progression on response time before those thresholds are validated.

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
| Recent accuracy by skill | Mastery system | Mastery feedback and future next-best lesson selection. |
| Weak notes/intervals/rhythms | Future spaced repetition system | Daily quest generation. |
| Daily quest completion | Quest system | Stickiness and session goals. |
| Last session result | Future session summary system | Post-session feedback. |

New systems implied by this UX:

1. `Quest` model for daily/recommended tasks. Exists and needs first-session filtering.
2. `SkillMastery` model for per-topic progress. Exists for note-reading and needs more topic coverage.
3. `SpacedReview` model for weak-item scheduling. Not started.
4. Session summary payload returned by Practice, Real-Time, and Duel. Not started.

---

## Dependencies

| Dependency | Status | Owner / File | Required For |
|---|---|---|---|
| Curriculum model | Exists | `lib/models/curriculum.dart` | Level banner and topic identity. |
| Player progress provider | Exists | `lib/providers/scaffolding_provider.dart` | Streak, Harmony points, grade level, recovery flags. |
| Confidence/scaffolding provider | Exists | `lib/providers/scaffolding_provider.dart` | Global scaffold setting and mastery independence signal. |
| Quest model/provider | Exists | `lib/models/quest.dart`, `lib/providers/quest_provider.dart` | Recommended quest, daily path, claim state, reward flow. |
| Skill mastery model/provider | Exists | `lib/models/skill_mastery.dart`, `lib/providers/mastery_provider.dart` | Note-reading mastery feedback and future adaptive recommendations. |
| Practice screen result recording | Partially exists | `lib/screens/practice_screen.dart` | Quest and mastery progress for note-reading attempts. |
| Real-Time result recording | Partially exists | `lib/screens/gameplay_screen.dart` | Quest progress for fluency task. |
| Duel result recording | Partially exists | `lib/screens/duel_screen.dart` | Quest progress for duel task. |
| Spaced review system | Not started | No GDD or implementation yet | Weak-note scheduling and generated daily quests. |
| Session summary system | Not started | No GDD or implementation yet | Post-session "You improved X" chip. |
| Broken Blade recovery task | Not started | Progress flags exist; no recovery quest flow yet | Shame-free return after absence. |

No matching `design/gdd/` documents exist yet for these systems. Before broad implementation, create GDDs for curriculum progression, quest/reward economy, mastery/progression, and recovery.

---

## Tuning Knobs

| Knob | Initial Value | Why It Exists |
|---|---|---|
| First-session daily quest count | 1 | Prevents new-player overload. |
| Normal daily quest count | 3 | Gives a short, sticky session loop. |
| Note-reading quest target | 5 correct attempts | Short enough for a first quest. |
| Real-Time quest target | 6 hits | Small fluency challenge after recognition. |
| Duel quest target | 1 won turn | Keeps duel as a lightweight capstone. |
| Recommended quest reward | 20 Harmony points | Meaningful without inflating economy. |
| Warmup/recovery reward | 10 Harmony points | Encourages return without overpaying. |
| Hard/low-scaffold reward | 30 Harmony points | Future incentive for harder practice. |
| Mastery accuracy threshold | 80% | Standard enough to indicate reliability without demanding perfection. |
| Mastery recent window | 10 attempts | Smooths luck while staying responsive. |
| 2-star confidence threshold | 0.6 | Indicates partial scaffold independence. |
| 3-star confidence threshold | 0.8 | Indicates low-scaffold confidence. |
| Broken Blade lapse threshold | 48 hours | Treats absence as a recovery moment, not failure. |
| Animation max duration | 150 ms for page entry | Keeps Home responsive. |

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
2. Home shows one daily task during the first-session state.
3. Home shows three daily tasks after the first quest is completed or claimed.
4. Broken Blade recovery appears after a lapse and offers a short repair task.
5. Mode cards remain available below the recommendation for player autonomy.
6. Confidence slider remains reachable on Home and does not overlap content.
7. Recommended quest deep-links to the correct mode.
8. Completing a quest updates daily task progress and harmony points.
9. Home can display a post-session summary after returning from Practice, Real-Time, or Duel.
10. Flutter analyze and widget tests pass after implementation.
11. Browser playtest confirms no horizontal overflow on mobile.
12. Accessibility labels exist for primary quest, daily tasks, mode cards, and confidence slider.
13. The Recommended Quest card shows note-reading mastery feedback in the specified empty and starred states.
14. Adaptive recommendations, once implemented, follow the priority order in Recommendation Rules.

---

## Open Questions

1. Player journey map does not yet exist at `design/player-journey.md`; this spec assumes first session, daily return, and post-session continuation phases.
2. No formal GDD exists yet for curriculum, mastery/progression, quest/reward economy, or recovery. The curriculum should be validated in a separate design pass before advanced levels are expanded.
3. What do Harmony points buy or unlock beyond short-term reward feedback?
4. Should Real-Time Training become required for level advancement, or remain an optional fluency path until stronger timing calibration exists?
5. Should keyboard/gamepad controls be supported beyond basic web accessibility?
