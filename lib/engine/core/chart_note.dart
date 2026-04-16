/// A single note in a precomputed chart.
///
/// Charts are generated offline (via music21 or similar) and loaded at
/// session start. No chart content is ever computed during the gameplay
/// loop — this keeps the engine deterministic and free of async work.
class ChartNote {
  /// Time the note should be hit, in seconds from track start.
  final double time;

  /// How long the note should be held, in seconds. 0 for tap notes.
  final double duration;

  /// MIDI note number (60 = middle C).
  final int midi;

  /// Lane index for visual rendering (0-based, left to right).
  final int lane;

  /// Optional identifier for tracking purposes.
  final int id;

  const ChartNote({
    required this.time,
    required this.midi,
    this.duration = 0.0,
    this.lane = 0,
    this.id = 0,
  });

  /// Target frequency in Hz for this note.
  double get frequencyHz => 440.0 * _pow2((midi - 69) / 12.0);

  /// Note end time (inclusive).
  double get endTime => time + duration;

  /// Whether a given time is within this note's hold window.
  bool containsTime(double t) => t >= time && t <= endTime;

  ChartNote copyWith({
    double? time,
    double? duration,
    int? midi,
    int? lane,
    int? id,
  }) =>
      ChartNote(
        time: time ?? this.time,
        duration: duration ?? this.duration,
        midi: midi ?? this.midi,
        lane: lane ?? this.lane,
        id: id ?? this.id,
      );

  @override
  String toString() =>
      'ChartNote(t=${time.toStringAsFixed(3)}s, midi=$midi, dur=${duration.toStringAsFixed(3)}s, lane=$lane)';
}

/// Fast power of 2 using a loop (no dart:math dependency in core).
double _pow2(double exponent) {
  // MIDI to Hz only needs fractional powers; use the identity
  //   2^x = e^(x * ln 2)
  // but without dart:math we'd need to import it. For the engine's core
  // we accept the import — keep math ops here as a convenience.
  // ignore: avoid_classes_with_only_static_members
  return _Pow.pow2(exponent);
}

class _Pow {
  static double pow2(double x) {
    // Use standard library math. Kept in a private class so the
    // public ChartNote surface reads cleanly.
    return _exp(x * _ln2);
  }

  static const double _ln2 = 0.6931471805599453;
  static double _exp(double x) {
    // Simple Taylor series fallback (accurate enough for MIDI->Hz).
    // Real implementation should use dart:math.exp — we import it in
    // the audio layer which owns FFT work. Here we keep core dependency-free.
    double sum = 1.0;
    double term = 1.0;
    for (int i = 1; i < 20; i++) {
      term *= x / i;
      sum += term;
    }
    return sum;
  }
}
