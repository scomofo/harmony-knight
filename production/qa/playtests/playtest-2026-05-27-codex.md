# Playtest Report

## Session Info

- **Date**: May 27, 2026
- **Build**: `0e5586c` with local uncommitted changes
- **Duration**: Targeted smoke/playtest pass
- **Tester**: Codex
- **Platform**: Flutter Web, local web-server, mobile-sized in-app browser
- **Input Method**: Pointer/touch simulation
- **Session Type**: Targeted test

## Test Focus

Verify the current Harmony Knight vertical slice after recent fixes:

- Home first impression and route clarity
- Practice prompt loop
- Real-Time Training note highway
- Counterpoint Duel turn flow
- Mobile layout, visible HUD, and browser error state

Screenshots were saved to `.playtest-artifacts/`:

- `harmony-home.png`
- `harmony-practice.png`
- `harmony-realtime-running.png`
- `harmony-duel-after-note.png`

## Verification Baseline

- `flutter analyze` — no issues found
- `flutter test` — 83 tests passed

## First Impressions (First 5 Minutes)

- **Understood the goal?** Partially
- **Understood the controls?** Mostly
- **Emotional response**: Engaged, but QA-alert
- **Notes**: Home has clear action cards. Real-Time Training now reads as a real game mode. Practice currently undermines its own challenge by displaying the answer above the answer choices.

## Gameplay Flow

### What Worked Well

- Home route hierarchy is readable and gives clear entry points into Practice, Real-Time, Duel, and Curriculum.
- Real-Time Training starts cleanly: notes move down the lanes, the strike line is readable, and `Start Run` changes to `Pause Run`.
- Duel note selection advances the turn and updates the harmony meter, confirming that the player action feeds the game state.
- Mobile Duel layout is much improved: the horizontal note tray leaves more room for the playfield and keeps the confidence slider visible.

### Pain Points

- Practice displays the target answer (`D4` in the tested run) before player input, so the exercise becomes recognition of text rather than note identification.
- Real-Time Training lane buttons use icons and color but do not clearly teach lane mapping for a first-time player.
- Repeated CanvasKit shader assertions flood browser logs across routes, making QA noisy and risking hidden runtime failures.

### Confusion Points

- Practice asks "What note is this?" while also showing the note name above the choices.
- Real-Time Training says "Tap the lit lane as notes cross the strike line," but the first-time player may not know which lane corresponds to which incoming note until it is already active.
- Flutter web exposes only sparse semantics in automation until accessibility is enabled, which makes automated and assistive inspection weaker than the visual UI.

### Moments of Delight

- Real-Time Training now has a clear arcade-like note highway shape.
- The Duel harmony meter response after a note selection gives immediate progression feedback.
- Figurenotes color/shape language remains visually distinctive and useful.

## Bugs Encountered

| # | Description | Severity | Reproducible |
|---|-------------|----------|--------------|
| 1 | Practice displays the correct answer before selection. | High | Yes |
| 2 | Browser console repeatedly reports `Assertion failed: org-dartlang-sdk:///lib/_engine/engine/canvaskit/shader.dart:78:14`. | Medium | Yes |
| 3 | Flutter web semantics are sparse; automation sees only "Enable accessibility" instead of normal controls. | Medium | Yes |

## Feature-Specific Feedback

### Home

- **Understood purpose?** Yes
- **Found engaging?** Yes
- **Suggestions**: Keep the four-card structure. Consider whether Real-Time should become the primary "play" action once it matures.

### Practice

- **Understood purpose?** Yes
- **Found engaging?** Not in current state
- **Suggestions**: Hide the note-name answer until feedback time, or replace it with an audio/visual-only prompt depending on confidence mode.

### Real-Time Training

- **Understood purpose?** Mostly
- **Found engaging?** Yes
- **Suggestions**: Add clearer lane onboarding, such as subtle lane numbers or note labels near the hit zone. Keep persistent HUD small to protect the playfield.

### Counterpoint Duel

- **Understood purpose?** Mostly
- **Found engaging?** Yes
- **Suggestions**: Continue improving feedback after invalid notes so the player understands why a ghost suggestion appears.

## Quantitative Data

- **Routes checked**: Home, Practice, Real-Time Training, Duel
- **Automated test count**: 83 passing
- **Analyzer issues**: 0
- **Horizontal overflow**: 0 px in sampled browser checks
- **Console/runtime errors**: Repeated CanvasKit shader assertion across routes

## Overall Assessment

- **Would play again?** Maybe
- **Difficulty**: Too easy in Practice due answer reveal; Real-Time and Duel need more full-session tuning
- **Pacing**: Good on Home and Duel; Real-Time starts quickly
- **Session length preference**: Current slice supports short sessions best

## Action Routing

- **Design changes needed**: Practice scaffolding and answer reveal rules.
- **Balance adjustments**: Real-Time hit windows and Duel harmony progression should be reviewed after the Practice issue is fixed.
- **Bug reports**: CanvasKit shader assertion; sparse web semantics/accessibility surface.
- **Polish items**: Real-Time lane labels/onboarding; Duel explanatory feedback after invalid notes.

## Top 3 Priorities From This Session

1. Fix Practice so the correct answer is not visible before player input.
2. Investigate and eliminate the repeated CanvasKit shader assertion.
3. Run a focused UX review on Real-Time lane readability and Flutter web accessibility/semantics.

## Review Mode

CD-PLAYTEST skipped — Lean mode.
