import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:harmony_knight/models/player_progress.dart';
import 'package:shared_preferences/shared_preferences.dart';

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
      : super(PlayerProgress(lastActiveAt: DateTime.now())) {
    loadSavedProgress();
  }

  static const _confidenceKey = 'progress.confidence';
  static const _currentStreakKey = 'progress.currentStreak';
  static const _bestStreakKey = 'progress.bestStreak';
  static const _totalNotesPlayedKey = 'progress.totalNotesPlayed';
  static const _totalCorrectNotesKey = 'progress.totalCorrectNotes';
  static const _lastActiveAtKey = 'progress.lastActiveAt';
  static const _inBrokenBladeRecoveryKey = 'progress.inBrokenBladeRecovery';
  static const _gradeLevelKey = 'progress.gradeLevel';
  static const _duelWinsKey = 'progress.duelWins';
  static const _harmonyPointsKey = 'progress.harmonyPoints';

  Future<void> loadSavedProgress() async {
    final prefs = await SharedPreferences.getInstance();
    final lastActiveAt = DateTime.tryParse(
      prefs.getString(_lastActiveAtKey) ?? '',
    );

    state = PlayerProgress(
      confidence: prefs.getDouble(_confidenceKey) ?? state.confidence,
      currentStreak: prefs.getInt(_currentStreakKey) ?? state.currentStreak,
      bestStreak: prefs.getInt(_bestStreakKey) ?? state.bestStreak,
      totalNotesPlayed:
          prefs.getInt(_totalNotesPlayedKey) ?? state.totalNotesPlayed,
      totalCorrectNotes:
          prefs.getInt(_totalCorrectNotesKey) ?? state.totalCorrectNotes,
      lastActiveAt: lastActiveAt ?? state.lastActiveAt,
      inBrokenBladeRecovery: prefs.getBool(_inBrokenBladeRecoveryKey) ??
          state.inBrokenBladeRecovery,
      gradeLevel: prefs.getInt(_gradeLevelKey) ?? state.gradeLevel,
      duelWins: prefs.getInt(_duelWinsKey) ?? state.duelWins,
      harmonyPoints: prefs.getInt(_harmonyPointsKey) ?? state.harmonyPoints,
    );
  }

  Future<void> saveProgress() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setDouble(_confidenceKey, state.confidence);
    await prefs.setInt(_currentStreakKey, state.currentStreak);
    await prefs.setInt(_bestStreakKey, state.bestStreak);
    await prefs.setInt(_totalNotesPlayedKey, state.totalNotesPlayed);
    await prefs.setInt(_totalCorrectNotesKey, state.totalCorrectNotes);
    await prefs.setString(_lastActiveAtKey, state.lastActiveAt.toIso8601String());
    await prefs.setBool(
      _inBrokenBladeRecoveryKey,
      state.inBrokenBladeRecovery,
    );
    await prefs.setInt(_gradeLevelKey, state.gradeLevel);
    await prefs.setInt(_duelWinsKey, state.duelWins);
    await prefs.setInt(_harmonyPointsKey, state.harmonyPoints);
  }

  void _persist() {
    saveProgress();
  }

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
    _persist();
  }

  void recordIncorrectNote() {
    state = state.copyWith(
      currentStreak: 0,
      totalNotesPlayed: state.totalNotesPlayed + 1,
      lastActiveAt: DateTime.now(),
    );
    _persist();
  }

  void setConfidence(double confidence) {
    state = state.copyWith(confidence: confidence);
    _persist();
  }

  void enterBrokenBladeRecovery() {
    state = state.copyWith(inBrokenBladeRecovery: true);
    _persist();
  }

  void completeBrokenBladeRecovery() {
    state = state.copyWith(
      inBrokenBladeRecovery: false,
      lastActiveAt: DateTime.now(),
    );
    _persist();
  }

  void addHarmonyPoints(int points) {
    state = state.copyWith(harmonyPoints: state.harmonyPoints + points);
    _persist();
  }

  void recordDuelWin() {
    state = state.copyWith(duelWins: state.duelWins + 1);
    _persist();
  }

  void setGradeLevel(int level) {
    state = state.copyWith(gradeLevel: level);
    _persist();
  }
}

final playerProgressProvider =
    StateNotifierProvider<PlayerProgressNotifier, PlayerProgress>((ref) {
  return PlayerProgressNotifier();
});
