import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:harmony_knight/engine/persistence.dart';
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
  final PersistenceService _persistence = PersistenceService();

  PlayerProgressNotifier()
      : super(PlayerProgress(lastActiveAt: DateTime.now())) {
    _loadFromDisk();
  }

  Future<void> _loadFromDisk() async {
    final saved = await _persistence.loadProgress();
    if (mounted) state = saved;
  }

  void _save() => _persistence.saveProgress(state);

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
    _save();
  }

  void recordIncorrectNote() {
    state = state.copyWith(
      currentStreak: 0,
      totalNotesPlayed: state.totalNotesPlayed + 1,
      lastActiveAt: DateTime.now(),
    );
    _save();
  }

  void setConfidence(double confidence) {
    state = state.copyWith(confidence: confidence);
    _save();
  }

  void enterBrokenBladeRecovery() {
    state = state.copyWith(inBrokenBladeRecovery: true);
    _save();
  }

  void completeBrokenBladeRecovery() {
    state = state.copyWith(
      inBrokenBladeRecovery: false,
      lastActiveAt: DateTime.now(),
    );
    _save();
  }

  void addHarmonyPoints(int points) {
    state = state.copyWith(harmonyPoints: state.harmonyPoints + points);
    _save();
  }

  void recordDuelWin() {
    state = state.copyWith(duelWins: state.duelWins + 1);
    _save();
  }

  void setGradeLevel(int level) {
    state = state.copyWith(gradeLevel: level);
    _save();
  }

  /// Replace the list of notes the player consistently struggles with.
  void updateWeakNotes(List<int> midiNotes) {
    state = state.copyWith(weakNotesMidi: midiNotes);
    _save();
  }
}

final playerProgressProvider =
    StateNotifierProvider<PlayerProgressNotifier, PlayerProgress>((ref) {
  return PlayerProgressNotifier();
});
