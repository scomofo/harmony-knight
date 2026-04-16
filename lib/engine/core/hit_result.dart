import 'chart_note.dart';

/// The outcome of evaluating a single note against player input.
class HitResult {
  /// The note that was evaluated.
  final ChartNote note;

  /// How far off the hit was, in milliseconds.
  /// Negative = early, positive = late, 0 = perfect.
  final double timingErrorMs;

  /// Pitch error in cents. Negative = flat, positive = sharp.
  /// 100 cents = 1 semitone.
  final double pitchErrorCents;

  /// Pitch detection confidence that led to this hit (0.0–1.0).
  final double confidence;

  /// The rating bucket this hit fell into.
  final HitRating rating;

  /// Composite score (0.0–1.0) combining timing and pitch.
  final double score;

  /// Audio time at which this hit was registered.
  final double hitTime;

  const HitResult({
    required this.note,
    required this.timingErrorMs,
    required this.pitchErrorCents,
    required this.confidence,
    required this.rating,
    required this.score,
    required this.hitTime,
  });

  /// A missed note (no input within the hit window).
  factory HitResult.miss(ChartNote note, double hitTime) => HitResult(
        note: note,
        timingErrorMs: double.infinity,
        pitchErrorCents: double.infinity,
        confidence: 0.0,
        rating: HitRating.miss,
        score: 0.0,
        hitTime: hitTime,
      );

  bool get isMiss => rating == HitRating.miss;
  bool get isPerfect => rating == HitRating.perfect;
  bool get wasEarly => timingErrorMs < 0;
  bool get wasLate => timingErrorMs > 0;
  bool get wasFlat => pitchErrorCents < 0;
  bool get wasSharp => pitchErrorCents > 0;

  @override
  String toString() =>
      'HitResult(${rating.name}, timing=${timingErrorMs.toStringAsFixed(1)}ms, '
      'pitch=${pitchErrorCents.toStringAsFixed(1)}¢, score=${score.toStringAsFixed(2)})';
}

/// Rating bucket for a hit.
///
/// Thresholds (configurable in [HitWindows] below):
///   perfect:  |timing| ≤ 30ms   AND |pitch| ≤ 20 cents
///   great:    |timing| ≤ 60ms   AND |pitch| ≤ 40 cents
///   good:     |timing| ≤ 100ms  AND |pitch| ≤ 80 cents
///   miss:     outside all windows
enum HitRating { perfect, great, good, miss }

/// Configurable hit window thresholds.
class HitWindows {
  final double perfectMs;
  final double greatMs;
  final double goodMs;
  final double missMs;

  final double perfectCents;
  final double greatCents;
  final double goodCents;

  const HitWindows({
    this.perfectMs = 30.0,
    this.greatMs = 60.0,
    this.goodMs = 100.0,
    this.missMs = 150.0,
    this.perfectCents = 20.0,
    this.greatCents = 40.0,
    this.goodCents = 80.0,
  });

  /// Lenient mode for ADHD Foundation levels (wider windows).
  static const HitWindows lenient = HitWindows(
    perfectMs: 60.0,
    greatMs: 120.0,
    goodMs: 200.0,
    missMs: 300.0,
    perfectCents: 50.0,
    greatCents: 100.0,
    goodCents: 200.0,
  );

  /// Strict mode for Advanced levels.
  static const HitWindows strict = HitWindows(
    perfectMs: 20.0,
    greatMs: 40.0,
    goodMs: 70.0,
    missMs: 100.0,
    perfectCents: 10.0,
    greatCents: 25.0,
    goodCents: 50.0,
  );
}
