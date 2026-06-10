# Quest of the Harmony Knight

Quest of the Harmony Knight is a Flutter music theory learning game for ADHD
learners, covering beginner through Grade 8+ concepts with short sessions,
adaptive practice, audio feedback, and low-friction navigation.

The project is currently a playable Flutter app, not a fresh Flutter scaffold.
The production code lives in `lib/`; the `src/` directory is only part of the
studio scaffold conventions and should not be treated as the app entrypoint.

## Current Playable Surface

- Home quest hub with streaks, harmony points, daily quests, and accessibility
  toggles.
- Note-reading practice with spaced repetition, weak-note focus, session length
  controls, Broken Blade recovery, Fever Mode, and synthesized answer feedback.
- Duel mode against the Discord Sentinel with ghost-tone assistance.
- Rhythm, scale, interval, triad, circle-of-fifths, curriculum, settings, and
  heatmap screens.
- A deterministic real-time training engine path under `lib/engine/core/`.

## Tech Stack

- Flutter 3.41+ and Dart 3.6+
- Riverpod 2.6 for state management
- go_router 14 for navigation
- flutter_soloud and just_audio for audio
- shared_preferences and path_provider for local persistence

## Project Layout

- `lib/` - Flutter app, screens, providers, models, engine code, painters, and
  widgets.
- `test/` - unit and widget tests for engine, providers, and selected screens.
- `design/gdd/` - reverse-documented and draft game design documents.
- `docs/architecture/` - ADRs for engine, Riverpod, persistence, and audio.
- `production/` - sprint status, QA notes, playtest notes, and stage reports.
- `assets/` - declared asset folders. These are still mostly placeholders.

## Common Commands

```powershell
flutter pub get
flutter analyze
flutter test
flutter run -d windows
```

Use `launch.bat` for the repo-local Windows launch workflow when the local
Flutter install is already configured.

## Current Readiness Notes

- The README was updated from the stock Flutter scaffold text, but the game
  still needs a proper player-facing release page and build instructions.
- Production art, audio, and font assets are not yet populated beyond icons and
  placeholder README files.
- Some designed systems are implemented as separate exercise screens. A future
  milestone should tighten them into one coherent core progression loop.
- Build and test health must be verified in the current shell before claiming a
  release candidate. Previous local runs have succeeded historically, but that
  is not current evidence.
