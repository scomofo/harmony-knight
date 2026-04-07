import 'package:harmony_knight/core/constants.dart';

/// Manages the Fever Mode state and Streak Restore ("Broken Blade") system.
///
/// Fever Mode: Triggered by 10+ consecutive perfect notes. Features visual
/// flourishes (fragment shaders, glowing staff, ripple effects).
///
/// Broken Blade Recovery: When absent >48 hours, the streak isn't reset to 0.
/// Instead, a short warm-up mission lets the user restore it. No "Day 0" anxiety.
class FeverModeEngine {
  /// Whether Fever Mode is currently active.
  bool isFeverActive = false;

  /// Current streak multiplier (increases during Fever Mode).
  double streakMultiplier = 1.0;

  /// Check if Fever Mode should activate based on current streak.
  FeverModeStatus evaluate({
    required int currentStreak,
    required DateTime lastActiveAt,
  }) {
    final timeSinceActive = DateTime.now().difference(lastActiveAt);

    // Check for streak lapse (Broken Blade condition).
    if (timeSinceActive >= TimingConstants.streakAbsenceThreshold) {
      return FeverModeStatus(
        isFeverActive: false,
        streakMultiplier: 1.0,
        requiresBrokenBladeRecovery: true,
        brokenBladeMissionLength: _brokenBladeMissionLength(currentStreak),
      );
    }

    // Check for Fever Mode activation.
    final shouldFever = currentStreak >= TimingConstants.feverModeThreshold;
    if (shouldFever && !isFeverActive) {
      isFeverActive = true;
      streakMultiplier = 2.0;
    } else if (!shouldFever) {
      isFeverActive = false;
      streakMultiplier = 1.0;
    }

    // Escalating multiplier during Fever Mode.
    if (isFeverActive) {
      final feverDepth = currentStreak - TimingConstants.feverModeThreshold;
      // Multiplier increases by 0.1 for every 5 notes beyond threshold, max 3x.
      streakMultiplier = (2.0 + (feverDepth / 5) * 0.1).clamp(1.0, 3.0);
    }

    return FeverModeStatus(
      isFeverActive: isFeverActive,
      streakMultiplier: streakMultiplier,
      requiresBrokenBladeRecovery: false,
      brokenBladeMissionLength: 0,
    );
  }

  /// Determine the Broken Blade mission length based on the streak that lapsed.
  /// Higher streaks get a proportionally easier warm-up (reward past effort).
  int _brokenBladeMissionLength(int lapsedStreak) {
    if (lapsedStreak <= 5) return 5;   // 5 warm-up notes.
    if (lapsedStreak <= 20) return 4;  // Easier for higher streaks.
    return 3;                           // Veterans get the shortest mission.
  }
}

/// Snapshot of the Fever Mode / Broken Blade system state.
class FeverModeStatus {
  final bool isFeverActive;
  final double streakMultiplier;
  final bool requiresBrokenBladeRecovery;
  final int brokenBladeMissionLength;

  const FeverModeStatus({
    required this.isFeverActive,
    required this.streakMultiplier,
    required this.requiresBrokenBladeRecovery,
    required this.brokenBladeMissionLength,
  });
}
