import 'package:equatable/equatable.dart';

/// Tracks the player's overall progress, streaks, and scaffolding preference.
class PlayerProgress extends Equatable {
  /// Current confidence slider value (0.0 = Figurenotes, 1.0 = Maestro).
  final double confidence;

  /// Current consecutive perfect-note streak.
  final int currentStreak;

  /// Longest streak ever achieved.
  final int bestStreak;

  /// Total notes played across all sessions.
  final int totalNotesPlayed;

  /// Total correct notes.
  final int totalCorrectNotes;

  /// Last active session timestamp (for streak-absence detection).
  final DateTime lastActiveAt;

  /// Whether the player is currently in "Broken Blade" recovery mode.
  final bool inBrokenBladeRecovery;

  /// Current grade level (0-8+, mapped to curriculum phases).
  final int gradeLevel;

  /// Duel wins (Collaborative Counterpoint).
  final int duelWins;

  /// XP / Harmony Points accumulated.
  final int harmonyPoints;

  const PlayerProgress({
    this.confidence = 0.0,
    this.currentStreak = 0,
    this.bestStreak = 0,
    this.totalNotesPlayed = 0,
    this.totalCorrectNotes = 0,
    required this.lastActiveAt,
    this.inBrokenBladeRecovery = false,
    this.gradeLevel = 0,
    this.duelWins = 0,
    this.harmonyPoints = 0,
  });

  /// Accuracy percentage.
  double get accuracy =>
      totalNotesPlayed > 0 ? totalCorrectNotes / totalNotesPlayed : 0.0;

  /// Whether Fever Mode should be active (10+ perfect streak).
  bool get isFeverModeActive => currentStreak >= 10;

  /// Whether the streak has lapsed (absent >48 hours).
  bool get isStreakLapsed =>
      DateTime.now().difference(lastActiveAt).inHours >= 48;

  PlayerProgress copyWith({
    double? confidence,
    int? currentStreak,
    int? bestStreak,
    int? totalNotesPlayed,
    int? totalCorrectNotes,
    DateTime? lastActiveAt,
    bool? inBrokenBladeRecovery,
    int? gradeLevel,
    int? duelWins,
    int? harmonyPoints,
  }) {
    return PlayerProgress(
      confidence: confidence ?? this.confidence,
      currentStreak: currentStreak ?? this.currentStreak,
      bestStreak: bestStreak ?? this.bestStreak,
      totalNotesPlayed: totalNotesPlayed ?? this.totalNotesPlayed,
      totalCorrectNotes: totalCorrectNotes ?? this.totalCorrectNotes,
      lastActiveAt: lastActiveAt ?? this.lastActiveAt,
      inBrokenBladeRecovery: inBrokenBladeRecovery ?? this.inBrokenBladeRecovery,
      gradeLevel: gradeLevel ?? this.gradeLevel,
      duelWins: duelWins ?? this.duelWins,
      harmonyPoints: harmonyPoints ?? this.harmonyPoints,
    );
  }

  @override
  List<Object?> get props => [
        confidence, currentStreak, bestStreak, totalNotesPlayed,
        totalCorrectNotes, lastActiveAt, inBrokenBladeRecovery,
        gradeLevel, duelWins, harmonyPoints,
      ];
}
