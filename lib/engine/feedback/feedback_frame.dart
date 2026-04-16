import '../core/hit_result.dart';

/// Rich feedback derived from a [HitResult]. Used by the UI to show
/// early/late arrows, sharp/flat indicators, and confidence — never
/// binary right/wrong.
class FeedbackFrame {
  final HitRating rating;
  final TimingDirection timingDirection;
  final PitchDirection pitchDirection;

  /// Timing error magnitude in ms (always positive).
  final double timingMagnitudeMs;

  /// Pitch error magnitude in cents (always positive).
  final double pitchMagnitudeCents;

  /// Confidence shown as a percentage (0.0–1.0).
  final double confidence;

  /// Audio time at which the feedback was generated.
  final double time;

  /// How long this feedback should remain visible (seconds).
  final double displayDuration;

  const FeedbackFrame({
    required this.rating,
    required this.timingDirection,
    required this.pitchDirection,
    required this.timingMagnitudeMs,
    required this.pitchMagnitudeCents,
    required this.confidence,
    required this.time,
    this.displayDuration = 0.8,
  });

  factory FeedbackFrame.fromHit(HitResult hit) {
    final TimingDirection td;
    if (hit.timingErrorMs.abs() < 5.0) {
      td = TimingDirection.onTime;
    } else if (hit.timingErrorMs < 0) {
      td = TimingDirection.early;
    } else {
      td = TimingDirection.late;
    }

    final PitchDirection pd;
    if (hit.pitchErrorCents.abs() < 5.0) {
      pd = PitchDirection.inTune;
    } else if (hit.pitchErrorCents < 0) {
      pd = PitchDirection.flat;
    } else {
      pd = PitchDirection.sharp;
    }

    return FeedbackFrame(
      rating: hit.rating,
      timingDirection: td,
      pitchDirection: pd,
      timingMagnitudeMs: hit.timingErrorMs.abs(),
      pitchMagnitudeCents: hit.pitchErrorCents.abs(),
      confidence: hit.confidence,
      time: hit.hitTime,
    );
  }

  /// Miss feedback — no timing/pitch data, just "missed".
  factory FeedbackFrame.miss(double time) => FeedbackFrame(
        rating: HitRating.miss,
        timingDirection: TimingDirection.onTime,
        pitchDirection: PitchDirection.inTune,
        timingMagnitudeMs: 0.0,
        pitchMagnitudeCents: 0.0,
        confidence: 0.0,
        time: time,
      );

  /// Short label for on-screen display.
  String get ratingLabel {
    switch (rating) {
      case HitRating.perfect:
        return 'Perfect';
      case HitRating.great:
        return 'Great';
      case HitRating.good:
        return 'Good';
      case HitRating.miss:
        return 'Miss';
    }
  }

  /// Gentle feedback message combining timing + pitch (ADHD-friendly).
  /// Never purely negative — always offers a constructive hint.
  String get gentleMessage {
    if (rating == HitRating.miss) return 'Let the next one come to you';
    if (rating == HitRating.perfect) return 'Perfect!';

    final parts = <String>[];
    if (timingDirection == TimingDirection.early) parts.add('slightly early');
    if (timingDirection == TimingDirection.late) parts.add('slightly late');
    if (pitchDirection == PitchDirection.flat) parts.add('a touch flat');
    if (pitchDirection == PitchDirection.sharp) parts.add('a touch sharp');

    if (parts.isEmpty) return ratingLabel;
    return '${ratingLabel} — ${parts.join(', ')}';
  }
}

enum TimingDirection { early, onTime, late }
enum PitchDirection { flat, inTune, sharp }

/// A queue of active feedback frames with automatic expiration.
class FeedbackQueue {
  final List<FeedbackFrame> _active = [];

  void push(FeedbackFrame frame) => _active.add(frame);

  /// Call every frame with the current audio time. Removes expired items.
  void update(double currentTime) {
    _active.removeWhere(
      (f) => currentTime - f.time > f.displayDuration,
    );
  }

  List<FeedbackFrame> get active => List.unmodifiable(_active);

  /// Most recent feedback, or null if queue is empty.
  FeedbackFrame? get latest => _active.isEmpty ? null : _active.last;

  void clear() => _active.clear();
}
