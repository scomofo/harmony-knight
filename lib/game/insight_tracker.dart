import 'package:harmony_knight/game/question_type.dart';

/// Tracks per-question-type accuracy and identifies weak areas.
///
/// The insight layer: tells the user (and the Sentinel) what they
/// struggle with, so practice can be targeted.
class InsightTracker {
  final Map<QuestionType, int> _correct = {};
  final Map<QuestionType, int> _incorrect = {};

  /// Record a result for a question type.
  void record(QuestionType type, bool isCorrect) {
    if (isCorrect) {
      _correct[type] = (_correct[type] ?? 0) + 1;
    } else {
      _incorrect[type] = (_incorrect[type] ?? 0) + 1;
    }
  }

  /// Accuracy for a specific question type (0.0-1.0), or null if < 3 attempts.
  double? accuracyFor(QuestionType type) {
    final c = _correct[type] ?? 0;
    final i = _incorrect[type] ?? 0;
    final total = c + i;
    if (total < 3) return null;
    return c / total;
  }

  /// Total attempts for a question type.
  int attemptsFor(QuestionType type) {
    return (_correct[type] ?? 0) + (_incorrect[type] ?? 0);
  }

  /// Find the weakest question type (lowest accuracy, min 5 attempts).
  /// Returns null if not enough data yet.
  QuestionType? weakestType() {
    double worst = 1.0;
    QuestionType? weakest;

    for (final type in QuestionType.values) {
      final c = _correct[type] ?? 0;
      final i = _incorrect[type] ?? 0;
      final total = c + i;
      if (total < 5) continue;

      final acc = c / total;
      if (acc < worst) {
        worst = acc;
        weakest = type;
      }
    }

    return weakest;
  }

  /// Generate a human-readable insight about the user's weakest area.
  /// Returns empty string if not enough data.
  String buildInsight() {
    final weak = weakestType();
    if (weak == null) return '';

    final acc = accuracyFor(weak);
    final pct = acc != null ? '${(acc * 100).round()}%' : '';

    switch (weak) {
      case QuestionType.chordTone:
        return 'Chord tones need work ($pct) \u2014 focus on root, 3rd, and 5th';
      case QuestionType.scaleTone:
        return 'Scale awareness is developing ($pct) \u2014 stay inside the key';
      case QuestionType.resolution:
        return 'Resolution needs practice ($pct) \u2014 find where tension wants to go';
      case QuestionType.interval:
        return 'Intervals are tricky ($pct) \u2014 count semitones from the root';
    }
  }
}
