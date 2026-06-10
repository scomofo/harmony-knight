# Release Readiness Checklist

**Date**: 2026-06-10
**Project**: Quest of the Harmony Knight
**Engine**: Flutter 3.44.0 / Dart 3.12.0 verified locally
**Scope**: Flutter Windows desktop build, automated validation, smoke routes, accessibility, save/reset flows, and production asset readiness.

---

## Current Validation Evidence

| Check | Status | Evidence |
|---|---|---|
| Flutter toolchain | PASS | `flutter --version` reported Flutter 3.44.0 and Dart 3.12.0 |
| Static analysis | PASS | `flutter analyze` completed with no issues |
| Full test suite, serial | PASS | `flutter test --concurrency=1` completed with 128 passing tests |
| Full test suite, default concurrency | PASS | `flutter test --timeout 2m` completed with 128 passing tests; timeout is captured in `dart_test.yaml` |
| Windows release build | PASS | `flutter build windows` produced `build/windows/x64/runner/Release/harmony_knight.exe` |
| Windows executable launch | PASS | Release executable remained alive after 8 seconds, then was closed manually by the validation script |

---

## Release Gate Checklist

### Build And Toolchain

- [x] Confirm Flutter is available from the repo launcher path.
- [x] Confirm Flutter version meets the project requirement.
- [x] Run `flutter analyze`.
- [x] Run `flutter test --concurrency=1`.
- [x] Run default-concurrency `flutter test` with the repo test timeout configured.
- [x] Run `flutter build windows`.
- [ ] Run `flutter build apk` on an Android-capable environment.
- [ ] Run iOS build validation on a macOS environment if iOS remains in release scope.

### Smoke Routes

- [ ] Home loads without crash.
- [ ] Onboarding can be completed and skipped.
- [ ] Practice screen accepts correct and incorrect note answers.
- [ ] Broken Blade recovery exits after the required warm-up count.
- [ ] Duel starts, accepts a valid note, shows ghost guidance for invalid input, and completes.
- [ ] Rhythm exercise starts after BPM selection and records scoring feedback.
- [ ] Scale screen completes a session and awards points.
- [ ] Interval screen plays/replays intervals and advances after correct answers.
- [ ] Triad screen plays/replays arpeggios and completes after 8 answers.
- [ ] Circle of Fifths route remains grade-gated below Grade 3 and accessible at Grade 3+.
- [ ] Settings toggles persist after app restart.

### Audio And Input

- [ ] Correct-answer feedback tone is audible where supported.
- [ ] Wrong-answer feedback tone is audible where supported.
- [ ] Ghost tone playback respects the Settings toggle.
- [ ] Metronome audio starts only after BPM selection.
- [ ] Audio failure degrades without blocking gameplay.
- [ ] Real-time training pitch input behavior is manually verified on a microphone-enabled device.

### Accessibility And ADHD UX

- [ ] Reduced Motion disables or shortens nonessential animation.
- [ ] High Contrast mode produces readable Home and Practice surfaces.
- [ ] Session length, warm-up count, and new-items cap settings persist.
- [ ] Wait-Mode gives clear correction feedback without rushing the player.
- [ ] Core screens remain readable at common Windows scaling settings.
- [ ] Keyboard/mouse interaction is usable for desktop release.

### Persistence And Recovery

- [ ] Player progress persists across app restart.
- [ ] Spaced repetition data persists across app restart.
- [ ] Quest progress persists and resets only by intended daily logic.
- [ ] Session and engagement records are written successfully.
- [ ] Reset All Progress clears player data and returns to onboarding.
- [ ] Save files remain valid after upgrading from the previous build.

### Assets And Presentation

- [ ] Replace placeholder audio README entries with production feedback, metronome, reward, and ambience assets or explicitly mark them deferred.
- [ ] Replace placeholder image README entries with production art or explicitly mark them deferred.
- [ ] Decide whether custom fonts are required for v1; add licensed fonts or keep system fonts intentionally.
- [ ] Confirm app icon appears correctly on Windows and web targets.
- [ ] Confirm production asset licenses and attribution requirements are recorded.

### Documentation And QA Evidence

- [ ] Refresh playtest evidence after the current validation pass.
- [ ] Record manual smoke evidence for all release-scope routes.
- [ ] Run design review on draft learning-loop GDDs before release-candidate tagging.
- [ ] Document the cohesive player-facing quest loop milestone.
- [ ] Archive or replace the Godot-flavored smoke report currently under `production/qa/` so QA evidence matches this Flutter project.

---

## Release Verdict

**Status**: NOT READY FOR RELEASE CANDIDATE

The Flutter build is healthy enough to continue release preparation: analysis passes, the full test suite passes with the repo timeout configuration, the Windows release build succeeds, and the executable launches. The main blockers are missing manual smoke evidence, placeholder production assets, and incomplete release documentation.

## Recommended Next Action

Refresh manual playtest evidence across the smoke routes above, then replace or explicitly defer placeholder production assets.
