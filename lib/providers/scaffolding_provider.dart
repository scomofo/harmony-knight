import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:harmony_knight/models/player_progress.dart';

/// Notifier for the confidence scaffolding slider.
///
/// This is the central piece of the scaffolding system: a single persistent
/// slider that the user controls at all times. It is NEVER locked — ADHD users
/// need the freedom to adjust help level as executive function fluctuates.
class ScaffoldingNotifier extends StateNotifier<double> {
  ScaffoldingNotifier() : super(0.0);

  /// Set confidence directly (from slider drag).
  void setConfidence(double value) {
    state = value.clamp(0.0, 1.0);
  }

  /// Nudge confidence up (e.g., after sustained success).
  void nudgeUp({double amount = 0.05}) {
    state = (state + amount).clamp(0.0, 1.0);
  }

  /// Nudge confidence down (e.g., passive scaffolding re-engagement).
  void nudgeDown({double amount = 0.05}) {
    state = (state - amount).clamp(0.0, 1.0);
  }
}

/// The global confidence slider provider.
final confidenceProvider =
    StateNotifierProvider<ScaffoldingNotifier, double>((ref) {
  return ScaffoldingNotifier();
});

/// Player progress provider.
class PlayerProgressNotifier extends StateNotifier<PlayerProgress> {
  PlayerProgressNotifier()
      : super(PlayerProgress(lastActiveAt: DateTime.now()));

  void recordCorrectNote() {
    state = state.copyWith(
      currentStreak: state.currentStreak + 1,
      bestStreak: state.currentStreak + 1 > state.bestStreak
          ? state.currentStreak + 1
          : state.bestStreak,
      totalNotesPlayed: state.totalNotesPlayed + 1,
      totalCorrectNotes: state.totalCorrectNotes + 1,
      lastActiveAt: DateTime.now(),
    );
  }

  void recordIncorrectNote() {
    state = state.copyWith(
      currentStreak: 0,
      totalNotesPlayed: state.totalNotesPlayed + 1,
      lastActiveAt: DateTime.now(),
    );
  }

  void setConfidence(double confidence) {
    state = state.copyWith(confidence: confidence);
  }

  void enterBrokenBladeRecovery() {
    state = state.copyWith(inBrokenBladeRecovery: true);
  }

  void completeBrokenBladeRecovery() {
    state = state.copyWith(
      inBrokenBladeRecovery: false,
      lastActiveAt: DateTime.now(),
    );
  }

  void addHarmonyPoints(int points) {
    state = state.copyWith(harmonyPoints: state.harmonyPoints + points);
  }

  void recordDuelWin() {
    state = state.copyWith(duelWins: state.duelWins + 1);
  }

  void setGradeLevel(int level) {
    state = state.copyWith(gradeLevel: level);
  }
}

final playerProgressProvider =
    StateNotifierProvider<PlayerProgressNotifier, PlayerProgress>((ref) {
  return PlayerProgressNotifier();
});
