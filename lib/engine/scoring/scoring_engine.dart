import 'dart:math' as math;

import '../core/chart_note.dart';
import '../core/hit_result.dart';
import '../core/input_frame.dart';

/// Deterministic scoring engine. Given a note and an input frame,
/// produces a [HitResult] with timing and pitch evaluation.
///
/// No I/O. No async. Pure function of (note, input, time).
class ScoringEngine {
  final HitWindows windows;

  /// Weight (0.0–1.0) given to timing accuracy. Pitch weight is the complement.
  final double timingWeight;

  /// Minimum confidence required to treat a frame as having valid pitch.
  final double minConfidence;

  const ScoringEngine({
    this.windows = const HitWindows(),
    this.timingWeight = 0.5,
    this.minConfidence = 0.5,
  });

  /// Evaluate a note against an input frame at the given audio time.
  ///
  /// Returns null if the input isn't valid (no pitch, too far out of window).
  /// Returns a [HitResult] otherwise — including miss results for notes
  /// that should have been hit by now.
  HitResult? evaluate({
    required ChartNote note,
    required InputFrame input,
    required double time,
  }) {
    // Timing error (ms). Negative = early, positive = late.
    final timingErrorMs = (input.time - note.time) * 1000.0;

    // If we're way outside the miss window, skip — not this note's turn.
    if (timingErrorMs.abs() > windows.missMs) return null;

    // Require pitch above confidence threshold.
    if (!input.hasPitch(minConfidence: minConfidence)) return null;

    final inputFreq = input.frequency!;
    final targetFreq = note.frequencyHz;

    // Pitch error in cents. 1200 * log2(f_in / f_target).
    final pitchErrorCents =
        1200.0 * (math.log(inputFreq / targetFreq) / math.ln2);

    final rating = _classify(timingErrorMs.abs(), pitchErrorCents.abs());
    if (rating == HitRating.miss) return null;

    final score = _computeScore(timingErrorMs.abs(), pitchErrorCents.abs());

    return HitResult(
      note: note,
      timingErrorMs: timingErrorMs,
      pitchErrorCents: pitchErrorCents,
      confidence: input.confidence,
      rating: rating,
      score: score,
      hitTime: input.time,
    );
  }

  /// Classify a hit by its error magnitudes.
  HitRating _classify(double timingMs, double pitchCents) {
    if (timingMs <= windows.perfectMs && pitchCents <= windows.perfectCents) {
      return HitRating.perfect;
    }
    if (timingMs <= windows.greatMs && pitchCents <= windows.greatCents) {
      return HitRating.great;
    }
    if (timingMs <= windows.goodMs && pitchCents <= windows.goodCents) {
      return HitRating.good;
    }
    return HitRating.miss;
  }

  /// Compute composite score (0.0–1.0) from timing + pitch errors.
  double _computeScore(double timingMs, double pitchCents) {
    // Normalize each dimension to [0, 1] where 1 = perfect.
    final timingAccuracy =
        (1.0 - (timingMs / windows.goodMs)).clamp(0.0, 1.0);
    final pitchAccuracy =
        (1.0 - (pitchCents / windows.goodCents)).clamp(0.0, 1.0);

    return (timingWeight * timingAccuracy +
            (1.0 - timingWeight) * pitchAccuracy)
        .clamp(0.0, 1.0);
  }
}

/// Aggregate session statistics, computed live during gameplay.
class ScoringStats {
  int perfects = 0;
  int greats = 0;
  int goods = 0;
  int misses = 0;

  double totalScore = 0.0;
  int totalScoreable = 0;

  int currentStreak = 0;
  int longestStreak = 0;

  /// Sum of absolute timing errors (for mean / drift analysis).
  double _timingErrorSum = 0.0;
  int _timingErrorSamples = 0;

  void record(HitResult result) {
    totalScoreable++;
    switch (result.rating) {
      case HitRating.perfect:
        perfects++;
        currentStreak++;
        break;
      case HitRating.great:
        greats++;
        currentStreak++;
        break;
      case HitRating.good:
        goods++;
        currentStreak++;
        break;
      case HitRating.miss:
        misses++;
        currentStreak = 0;
        break;
    }

    if (currentStreak > longestStreak) longestStreak = currentStreak;
    totalScore += result.score;

    if (!result.isMiss) {
      _timingErrorSum += result.timingErrorMs.abs();
      _timingErrorSamples++;
    }
  }

  double get accuracy =>
      totalScoreable == 0 ? 0.0 : totalScore / totalScoreable;

  double get meanTimingErrorMs => _timingErrorSamples == 0
      ? 0.0
      : _timingErrorSum / _timingErrorSamples;

  int get totalHits => perfects + greats + goods;

  Map<String, dynamic> toJson() => {
        'perfects': perfects,
        'greats': greats,
        'goods': goods,
        'misses': misses,
        'totalScore': totalScore,
        'totalScoreable': totalScoreable,
        'currentStreak': currentStreak,
        'longestStreak': longestStreak,
        'accuracy': accuracy,
        'meanTimingErrorMs': meanTimingErrorMs,
      };

  void reset() {
    perfects = 0;
    greats = 0;
    goods = 0;
    misses = 0;
    totalScore = 0.0;
    totalScoreable = 0;
    currentStreak = 0;
    longestStreak = 0;
    _timingErrorSum = 0.0;
    _timingErrorSamples = 0;
  }
}
