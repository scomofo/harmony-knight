import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:harmony_knight/engine/curriculum/grade_thresholds.dart';
import 'package:harmony_knight/models/player_progress.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Notifier for the confidence scaffolding slider.
///
/// This is the central piece of the scaffolding system: a single persistent
/// slider that the user controls at all times. It is NEVER locked — ADHD users
/// need the freedom to adjust help level as executive function fluctuates.
class ScaffoldingNotifier extends StateNotifier<double> {
  static const _prefKey = 'confidence';

  ScaffoldingNotifier() : super(0.0) {
    _loadFromPrefs();
  }

  Future<void> _loadFromPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    if (mounted) state = prefs.getDouble(_prefKey) ?? 0.0;
  }

  void _save(double value) {
    SharedPreferences.getInstance().then((p) => p.setDouble(_prefKey, value));
  }

  /// Set confidence directly (from slider drag).
  void setConfidence(double value) {
    state = value.clamp(0.0, 1.0);
    _save(state);
  }

  /// Nudge confidence up (e.g., after sustained success).
  void nudgeUp({double amount = 0.05}) {
    state = (state + amount).clamp(0.0, 1.0);
    _save(state);
  }

  /// Nudge confidence down (e.g., passive scaffolding re-engagement).
  void nudgeDown({double amount = 0.05}) {
    state = (state - amount).clamp(0.0, 1.0);
    _save(state);
  }
}

/// The global confidence slider provider.
final confidenceProvider =
    StateNotifierProvider<ScaffoldingNotifier, double>((ref) {
  return ScaffoldingNotifier();
});

/// Player progress provider — persists to disk on every mutation.
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
  static const _weakNotesMidiKey = 'progress.weakNotesMidi';

  Future<void> loadSavedProgress() async {
    final prefs = await SharedPreferences.getInstance();
    final lastActiveAt = DateTime.tryParse(
      prefs.getString(_lastActiveAtKey) ?? '',
    );
    final weakRaw = prefs.getStringList(_weakNotesMidiKey) ?? [];
    final weakNotes = weakRaw.map(int.parse).toList();

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
      weakNotesMidi: weakNotes,
    );

    // Auto-detect Broken Blade: 48h absence triggers recovery mode.
    if (mounted && state.isStreakLapsed && !state.inBrokenBladeRecovery) {
      state = state.copyWith(inBrokenBladeRecovery: true);
      _persist();
    }
  }

  Future<void> saveProgress() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setDouble(_confidenceKey, state.confidence);
    await prefs.setInt(_currentStreakKey, state.currentStreak);
    await prefs.setInt(_bestStreakKey, state.bestStreak);
    await prefs.setInt(_totalNotesPlayedKey, state.totalNotesPlayed);
    await prefs.setInt(_totalCorrectNotesKey, state.totalCorrectNotes);
    await prefs.setString(_lastActiveAtKey, state.lastActiveAt.toIso8601String());
    await prefs.setBool(_inBrokenBladeRecoveryKey, state.inBrokenBladeRecovery);
    await prefs.setInt(_gradeLevelKey, state.gradeLevel);
    await prefs.setInt(_duelWinsKey, state.duelWins);
    await prefs.setInt(_harmonyPointsKey, state.harmonyPoints);
    await prefs.setStringList(
      _weakNotesMidiKey,
      state.weakNotesMidi.map((n) => n.toString()).toList(),
    );
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

  void updateWeakNotes(List<int> midiNotes) {
    state = state.copyWith(weakNotesMidi: midiNotes);
    _persist();
  }

  bool checkAndAdvanceGrade({
    required int sessionTotal,
    required int sessionCorrect,
  }) {
    final currentGrade = state.gradeLevel;
    final threshold = kGradeThresholds[currentGrade];
    if (threshold == null) return false;
    if (sessionTotal < threshold.minSessionAttempts) return false;
    final accuracy = sessionTotal > 0 ? sessionCorrect / sessionTotal : 0.0;
    if (accuracy < threshold.minSessionAccuracy) return false;
    state = state.copyWith(gradeLevel: currentGrade + 1);
    _persist();
    return true;
  }
}

final playerProgressProvider =
    StateNotifierProvider<PlayerProgressNotifier, PlayerProgress>((ref) {
  return PlayerProgressNotifier();
});

/// Notifier for the ghost-tones audio preference.
///
/// Ghost tones are assistive audio cues that help learners find the correct
/// pitch. Users can disable them once they no longer need the audio scaffold.
/// Persists across sessions in shared_preferences (key: 'ghost_tones_enabled').
class GhostTonesNotifier extends StateNotifier<bool> {
  static const _prefKey = 'ghost_tones_enabled';

  GhostTonesNotifier() : super(true) {
    _loadFromPrefs();
  }

  Future<void> _loadFromPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    if (mounted) state = prefs.getBool(_prefKey) ?? true;
  }

  void toggle(bool enabled) {
    state = enabled;
    SharedPreferences.getInstance().then((p) => p.setBool(_prefKey, enabled));
  }
}

final ghostTonesEnabledProvider =
    StateNotifierProvider<GhostTonesNotifier, bool>((ref) {
  return GhostTonesNotifier();
});

/// Notifier for the high-contrast accessibility mode.
///
/// Switches backgrounds to pure black and removes gradients for users who
/// need maximum contrast. Persists across sessions (key: 'high_contrast_enabled').
class HighContrastNotifier extends StateNotifier<bool> {
  static const _prefKey = 'high_contrast_enabled';

  HighContrastNotifier() : super(false) {
    _loadFromPrefs();
  }

  Future<void> _loadFromPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    if (mounted) state = prefs.getBool(_prefKey) ?? false;
  }

  void toggle(bool enabled) {
    state = enabled;
    SharedPreferences.getInstance().then((p) => p.setBool(_prefKey, enabled));
  }
}

final highContrastProvider =
    StateNotifierProvider<HighContrastNotifier, bool>((ref) {
  return HighContrastNotifier();
});
