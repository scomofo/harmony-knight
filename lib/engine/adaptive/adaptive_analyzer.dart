import '../core/chart_note.dart';
import '../core/hit_result.dart';
import '../scoring/scoring_engine.dart';

/// Post-session analysis and adaptive difficulty.
///
/// CRITICAL: This layer only runs AFTER a session ends. It NEVER reads
/// engine state or runs logic during the gameplay loop. Gameplay stays
/// deterministic; adaptation is a separate offline computation.
class AdaptiveAnalyzer {
  const AdaptiveAnalyzer();

  /// Analyze a completed session and produce insights + difficulty
  /// recommendations.
  SessionInsights analyze({
    required List<HitResult> history,
    required ScoringStats stats,
  }) {
    final weakNotes = _detectWeakNotes(history);
    final drift = _detectTimingDrift(history);
    final pitchBias = _detectPitchBias(history);
    final recommendation = _recommendDifficulty(stats, drift);

    return SessionInsights(
      weakNotes: weakNotes,
      timingDrift: drift,
      pitchBias: pitchBias,
      recommendation: recommendation,
      overallAccuracy: stats.accuracy,
    );
  }

  /// Find notes the player consistently struggled with.
  /// A note is "weak" if accuracy on it is in the bottom 25%.
  List<WeakNote> _detectWeakNotes(List<HitResult> history) {
    final byMidi = <int, List<HitResult>>{};
    for (final h in history) {
      byMidi.putIfAbsent(h.note.midi, () => []).add(h);
    }

    final scored = byMidi.entries.map((e) {
      final hits = e.value;
      final misses = hits.where((h) => h.isMiss).length;
      final avgScore = hits.isEmpty
          ? 0.0
          : hits.map((h) => h.score).reduce((a, b) => a + b) / hits.length;
      return WeakNote(
        midi: e.key,
        attempts: hits.length,
        misses: misses,
        averageScore: avgScore,
      );
    }).toList();

    // Bottom 25% by average score, minimum 3 attempts.
    scored.sort((a, b) => a.averageScore.compareTo(b.averageScore));
    return scored
        .where((w) => w.attempts >= 3)
        .take((scored.length * 0.25).ceil())
        .toList();
  }

  /// Detect whether the player consistently hits early or late.
  /// Returns the mean signed error in ms.
  TimingDrift _detectTimingDrift(List<HitResult> history) {
    final nonMisses = history.where((h) => !h.isMiss).toList();
    if (nonMisses.length < 10) {
      return const TimingDrift(meanErrorMs: 0.0, direction: DriftDirection.none);
    }

    final sum = nonMisses
        .map((h) => h.timingErrorMs)
        .reduce((a, b) => a + b);
    final mean = sum / nonMisses.length;

    DriftDirection dir;
    if (mean.abs() < 15) {
      dir = DriftDirection.none;
    } else if (mean < 0) {
      dir = DriftDirection.early;
    } else {
      dir = DriftDirection.late;
    }

    return TimingDrift(meanErrorMs: mean, direction: dir);
  }

  /// Detect whether the player consistently sings flat or sharp.
  PitchBias _detectPitchBias(List<HitResult> history) {
    final nonMisses = history.where((h) => !h.isMiss).toList();
    if (nonMisses.length < 10) {
      return const PitchBias(
        meanErrorCents: 0.0,
        direction: PitchBiasDirection.none,
      );
    }

    final sum = nonMisses
        .map((h) => h.pitchErrorCents)
        .reduce((a, b) => a + b);
    final mean = sum / nonMisses.length;

    PitchBiasDirection dir;
    if (mean.abs() < 10) {
      dir = PitchBiasDirection.none;
    } else if (mean < 0) {
      dir = PitchBiasDirection.flat;
    } else {
      dir = PitchBiasDirection.sharp;
    }

    return PitchBias(meanErrorCents: mean, direction: dir);
  }

  /// Recommend next-session difficulty based on performance.
  DifficultyRecommendation _recommendDifficulty(
    ScoringStats stats,
    TimingDrift drift,
  ) {
    if (stats.accuracy > 0.9) return DifficultyRecommendation.increase;
    if (stats.accuracy < 0.5) return DifficultyRecommendation.decrease;
    return DifficultyRecommendation.maintain;
  }
}

class SessionInsights {
  final List<WeakNote> weakNotes;
  final TimingDrift timingDrift;
  final PitchBias pitchBias;
  final DifficultyRecommendation recommendation;
  final double overallAccuracy;

  const SessionInsights({
    required this.weakNotes,
    required this.timingDrift,
    required this.pitchBias,
    required this.recommendation,
    required this.overallAccuracy,
  });

  /// Generate a short, constructive summary for the player.
  String get summary {
    final parts = <String>[];
    parts.add('Accuracy: ${(overallAccuracy * 100).toStringAsFixed(0)}%');
    if (timingDrift.direction != DriftDirection.none) {
      parts.add(
        'Tends to hit ${timingDrift.direction.name} '
        '(${timingDrift.meanErrorMs.toStringAsFixed(0)}ms avg)',
      );
    }
    if (pitchBias.direction != PitchBiasDirection.none) {
      parts.add(
        'Tends to sing ${pitchBias.direction.name} '
        '(${pitchBias.meanErrorCents.toStringAsFixed(0)}¢ avg)',
      );
    }
    return parts.join(' · ');
  }
}

class WeakNote {
  final int midi;
  final int attempts;
  final int misses;
  final double averageScore;

  const WeakNote({
    required this.midi,
    required this.attempts,
    required this.misses,
    required this.averageScore,
  });

  double get missRate => attempts == 0 ? 0.0 : misses / attempts;
}

class TimingDrift {
  final double meanErrorMs;
  final DriftDirection direction;
  const TimingDrift({required this.meanErrorMs, required this.direction});
}

enum DriftDirection { early, late, none }

class PitchBias {
  final double meanErrorCents;
  final PitchBiasDirection direction;
  const PitchBias({
    required this.meanErrorCents,
    required this.direction,
  });
}

enum PitchBiasDirection { flat, sharp, none }

enum DifficultyRecommendation { increase, maintain, decrease }
