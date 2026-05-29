---
status: reverse-documented
source: lib/models/curriculum.dart, lib/screens/curriculum_screen.dart, lib/models/player_progress.dart
date: 2026-05-29
verified-by: Scott Morley
---

# Curriculum System Design

> **Note**: Reverse-engineered from existing implementation. Captures current
> behaviour and clarified design intent. Sections marked **[GAP]** are designed
> but not yet implemented.

---

## Overview

The Curriculum is the progression spine of Harmony Knight. It organises music
theory content into 11 levels across three phases, mapping ABRSM-adjacent grades
(Prep through Grade 8+) onto a game-world journey framed as the "Musical World."

The Curriculum Map screen shows the full journey at all times — locked levels are
dimmed but visible. Players always know where they're going. No content is hidden
behind a paywall or discovery gate.

**Design pillars:**
- **Transparent progression**: the full map is always visible — no "fog of war"
- **ADHD triggers per level**: each level documents specific engagement hooks
- **Narrative theming**: each level has a world-building theme, even if story
  content doesn't exist yet
- **Accuracy-driven advancement**: players move up when their accuracy demonstrates
  mastery — not on time spent or manual self-report

---

## Three Phases

| Phase | Levels | Theme | Colour |
|-------|--------|-------|--------|
| Foundation | 0–4 | "The Seed Phase" | Cyan (#4FC3F7) |
| Intermediate | 5–8 | "The Growth Phase" | Purple (#7C4DFF) |
| Advanced | 9–10 | "The Fruit Phase" | Amber (#FFD54F) |

---

## Level Reference

### Phase 1 — Foundation

**Level 0: The Sensory Entry Point** — *Sound Before Sight*
- Narrative: "Awakening — The Composer-Knight discovers sound."
- Objectives: timbre recognition, high/low pitch, loud/soft, beat-finding with haptics, emotional identification
- ADHD triggers: immediate audio feedback, no reading required, sessions capped at 3 min
- Note pool: C4, E4, G4

**Level 1: The Color-Coded Staff** — *Figurenotes & Landmark Notes*
- Narrative: "First Light — Learning the language of colour and sound."
- Objectives: Figurenotes colour/shape mapping, virtual keyboard, landmark notes (Middle C, Treble G, Bass F), simple melodies, 5-line staff intro
- ADHD triggers: Figurenotes removes decoding bottleneck, Staff Fading begins, streak system activates
- Note pool: C major C4–B4

**Level 2: Rhythm & The Body** — *Body Base-10 Method*
- Narrative: "The Pulse — Feeling the heartbeat of music."
- Objectives: whole/half/quarter/eighth durations, Body Base-10 kinesthetic method, time signatures (4/4 3/4 2/4), rests, dot notation
- ADHD triggers: kinesthetic rhythm games, haptic metronome, 30-second micro-challenges

**Level 3: Scales & Key Signatures** — *The Map of the Musical World*
- Narrative: "The Map — Exploring the Plains of C Major to distant keys."
- Objectives: major scale construction, natural minor scale, key signatures to 4 sharps/flats, Circle of Fifths, compound time (6/8 9/8)
- ADHD triggers: Circle of Fifths as game map, each key = new level, Quick Win 5-second key-name challenges
- Note pool: C major + A minor

**Level 4: Intervals & Triads** — *The Gliph System*
- Narrative: "The Forge — Crafting harmonic building blocks."
- Objectives: all intervals unison–octave, Gliph visual system, major/minor/aug/dim triads, alto clef, transposition basics
- ADHD triggers: Gliphs as visual anchors, instant ear-training comparison, triad puzzle assembly

---

### Phase 2 — Intermediate

**Level 5: Harmony Foundations** — *Cadences as Musical Punctuation*
- Narrative: "The Grammar — Learning to speak in harmonic sentences."
- Objectives: Roman numeral analysis (I IV V vi), perfect/imperfect/plagal/deceptive cadences, cadence-as-punctuation framing, chord inversions, figured bass basics
- ADHD triggers: cadence completion game, colour-coded Roman numerals, distinct haptic per cadence type
- Note pool: full chromatic

**Level 6: Part-Writing & Score Analysis** — *The Four Voices*
- Narrative: "The Council — Four voices learning to speak as one."
- Objectives: SATB voice leading, parallel 5ths/8ths detection, hidden 5ths/8ths, voice overlap/crossing, secondary dominants (V/V), secondary diminished
- ADHD triggers: real-time voice-leading warnings with haptics, partial credit for identifying WHY, AI ghost notes suggest fixes

**Level 7: Modulation & Pivot Chords** — *The Gateway*
- Narrative: "The Gateway — Traveling between tonal worlds."
- Objectives: pivot chord modulation with dual Roman numeral display, direct modulation, sequential modulation, closely-related keys, small forms (Binary/Ternary/Rondo)
- ADHD triggers: transparent layering showing both keys, modulation as "portal" mechanic, form as colour-coded map

**Level 8: Advanced Harmony & Orchestration** — *The Full Score*
- Narrative: "The Orchestra — Commanding the full harmonic army."
- Objectives: Neapolitan 6th, Augmented 6th chords, distant key modulation, full orchestral score reading, Sonata-Allegro form, odd meters (5/8 7/8), polyrhythms
- ADHD triggers: orchestral score as layered view, odd meters as Simple+Compound blocks, polyrhythm split-screen tapping

---

### Phase 3 — Advanced

**Level 9: Advanced Counterpoint** — *Species Counterpoint Skill Tree*
- Narrative: "The Duel — Sparring with the Discord Sentinel."
- Objectives: First–Fifth Species counterpoint
- ADHD triggers: Duel mode with Discord Sentinel, Wait-Mode (no timers), Ghost Resolutions, Harmony Meter
- Note pool: full chromatic; Duel system is the primary delivery mechanism

**Level 10: Fugue, Analysis & Modernism** — *The Masterwork*
- Narrative: "The Masterwork — Composing your own harmonic legacy."
- Objectives: fugue subject/answer/countersubject, Bach inventory/WTC analysis, post-tonal set theory basics, 20th-century techniques, full analytical essay
- ADHD triggers: fugue as detective work, colour-coded voice tracking, set theory as pattern puzzles

---

## Grade Advancement

**Decided: 2026-05-29** (was [GAP])

**Mechanism (implemented in Sprint 1):**
1. At the end of each Practice session (when the player taps Back), the session's
   total attempts and correct answers are passed to `checkAndAdvanceGrade()`
2. If the session meets the threshold for the current grade, `gradeLevel` increments
   by 1 and a level-up fanfare overlay shows
3. Grade never decreases

**Implemented thresholds** (`lib/engine/curriculum/grade_thresholds.dart`):

| Grade range | Min attempts this session | Min accuracy | Notes |
|------------|--------------------------|--------------|-------|
| 0 → 1 | 10 | 80% | Tonic triad pool (3 notes) |
| 1 → 2 | 20 | 85% | C major pool |
| 2 → 3 | 20 | 85% | C major pool |
| 3 → 4 | 20 | 85% | C + A minor pool |
| 4 → 5 | 20 | 85% | C + A minor pool |
| 5 → 6 | 30 | 90% | Chromatic pool |
| 6 → 7 | 30 | 90% | Chromatic pool |
| 7 → 8 | 30 | 90% | Chromatic pool |
| 8+ | — | — | Ceiling; no further advancement |

**Duel contribution: Practice only (decided 2026-05-29)**

Duels do NOT contribute to grade advancement. Rationale:
- Practice mode has a controlled note pool per grade; duels use a free chromatic
  palette regardless of grade — accuracy is not comparable across the two modes
- This keeps the advancement signal clean: Practice accuracy reflects grade-level
  mastery, while Duel performance is a separate creative/theory skill
- Duels award Harmony Points instead (see `design/gdd/duel-system.md`), giving
  them their own progression axis

If playtesting shows players stall in Practice, the first mitigation is to lower
the `minSessionAttempts` cap — not to add duel contribution, which would conflate
two different skill signals.

---

## Curriculum Map Screen

The map is a scrollable list grouped by phase. Every level is always visible.

| State | Visual treatment |
|-------|----------------|
| Locked (`level > gradeLevel`) | Dimmed card, lock icon instead of level number |
| Unlocked (`level < gradeLevel`) | Full opacity, level number shown |
| Current (`level == gradeLevel`) | Full opacity + purple border + "Current" chip |

Unlocked level cards expand to show:
- Narrative theme (italic)
- Objectives list (bullet points, low opacity)
- ADHD triggers list (⚡ icon, amber colour)

Locked level cards show only the title and subtitle — enough to see the journey
ahead without overwhelming.

---

## Narrative Themes

As of 2026-05-29, narrative themes are **labels only** — they appear as italic
subtitles on level cards. No story content, cutscenes, dialogue, or world-map
travel assets exist yet.

The themes are designed to make each level feel like a distinct chapter of the
Harmony Knight's journey rather than an arbitrary grade number.

**When narrative content is created**, it should be:
- Non-blocking: story beats should never gate gameplay
- Skippable: ADHD learners should always be able to skip cutscenes
- Reward-framed: story moments should feel like celebration, not exposition

---

## ADHD Design Principles Applied

1. **Always show the full map**: uncertainty about "how much is left" is a
   demotivator for ADHD learners. The full 11-level journey is always visible.
2. **Micro-goals per level**: each level's ADHD triggers include explicit
   micro-goal framing (e.g., "30-second challenge", "5-second Quick Win")
3. **Level as identity**: each level has a distinct narrative name — players can
   say "I'm at The Forge" rather than "I'm at grade 4"
4. **Engagement triggers documented**: each level lists its specific ADHD
   engagement mechanisms so future content creators know what to design toward

---

## Follow-Up Work

1. ~~**Implement grade advancement logic**~~ — Done in Sprint 1 (S1-M1)
2. ~~**Level-up fanfare**~~ — Done in Sprint 1 (S1-S1); audio hook remains for later
3. **Rhythm and Body Base-10 exercises** — Level 2 is described but has no dedicated screen/mechanic yet
4. **Circle of Fifths game-map integration** — Level 3 describes it as a navigable world; `/circle-of-fifths` screen exists but is not integrated with grade gating
5. **Narrative content pipeline** — when story assets are created, decide on format (Flutter animations, static images, text) and skippability mechanism
6. **ABRSM alignment audit** — verify objectives match ABRSM grade descriptors before publishing
