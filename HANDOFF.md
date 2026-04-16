# Handoff

## What landed

- Imported the archived real-time gameplay engine from `hk-engine-refactor.tar.gz` into `lib/engine/`.
- Added the archived integration guide as [ENGINE_INTEGRATION.md](ENGINE_INTEGRATION.md).
- Added engine-focused tests under `test/engine/`.
- Updated `pubspec.yaml` with the new audio/input dependencies required by the handoff bundle.
- Rebuilt `lib/engine/core/note_tracker.dart` because the archived file was empty.

## New module layout

- `lib/engine/core/`: deterministic timing, note lifecycle, scoring primitives, frame loop
- `lib/engine/audio/`: `just_audio` clock-backed playback service
- `lib/engine/input/`: microphone capture + pitch detection
- `lib/engine/charting/`: immutable charts and server-backed chart generation
- `lib/engine/feedback/`: player-facing hit feedback
- `lib/engine/rendering/`: note-highway projection helpers
- `lib/engine/debug/`: in-app diagnostics overlay
- `lib/engine/adaptive/`: post-session analysis and difficulty recommendations

## Important caveats

- Flutter is not installed in this workspace, so `flutter pub get` and `flutter test` could not be run here.
- The repo currently does not include `android/` or `ios/` app shells, so the platform permission changes from the integration guide could not be applied yet.
- `pubspec.yaml` still references `assets/audio/`, `assets/images/`, and `assets/fonts/`, but those directories are not present in this checkout.
- The existing app already has `lib/engine/audio_service.dart`; the new real-time engine uses `lib/engine/audio/audio_service.dart`. They coexist, but import paths should stay explicit.

## Next actions

1. Run `flutter pub get` and `flutter test` in a Flutter-enabled environment.
2. Apply the microphone permissions from [ENGINE_INTEGRATION.md](ENGINE_INTEGRATION.md) once the mobile platform folders are present.
3. Decide whether the new real-time engine should replace or live alongside the existing practice/duel flows.
4. Add a gameplay screen and calibration flow if this engine is moving into active product use.
