/// A single frame of player input, time-aligned with the audio clock.
///
/// InputFrames are produced by the input system (pitch detector + mic capture)
/// at the engine's sample rate. They must carry the audio time at which
/// the input was captured — not the system time, not DateTime.now().
///
/// If no pitch was detected this frame, [frequency] is null. The engine
/// treats null as "no input" (player not singing/playing), not as an error.
class InputFrame {
  /// Audio clock time when this frame was captured, in seconds.
  final double time;

  /// Detected fundamental frequency in Hz, or null if no clear pitch.
  final double? frequency;

  /// Pitch detection confidence (0.0–1.0). 0 when [frequency] is null.
  final double confidence;

  /// Input amplitude (0.0–1.0), used to detect silence vs noise.
  final double amplitude;

  const InputFrame({
    required this.time,
    this.frequency,
    this.confidence = 0.0,
    this.amplitude = 0.0,
  });

  /// An empty frame representing silence at the given time.
  const InputFrame.silent(this.time)
      : frequency = null,
        confidence = 0.0,
        amplitude = 0.0;

  /// Whether this frame contains a detected pitch above confidence threshold.
  bool hasPitch({double minConfidence = 0.5}) =>
      frequency != null && confidence >= minConfidence;

  /// Convert the detected frequency to MIDI (continuous, fractional).
  /// Returns null if no pitch detected.
  double? get midiContinuous {
    final f = frequency;
    if (f == null || f <= 0) return null;
    // 69 + 12 * log2(f/440)
    return 69.0 + 12.0 * _log2(f / 440.0);
  }

  /// Nearest integer MIDI note.
  int? get midiNearest {
    final m = midiContinuous;
    if (m == null) return null;
    return m.round();
  }

  @override
  String toString() {
    if (frequency == null) return 'InputFrame(t=${time.toStringAsFixed(3)}s, silent)';
    return 'InputFrame(t=${time.toStringAsFixed(3)}s, '
        '${frequency!.toStringAsFixed(1)}Hz, conf=${confidence.toStringAsFixed(2)})';
  }
}

double _log2(double x) {
  // log2(x) = ln(x) / ln(2). Series-based natural log for small inputs.
  // For pitch ratios typically in [0.5, 2], this converges well.
  if (x <= 0) return double.negativeInfinity;
  // Use ln(x) = 2 * atanh((x-1)/(x+1)) via series, accurate near x=1.
  final y = (x - 1.0) / (x + 1.0);
  double sum = 0.0;
  double term = y;
  final y2 = y * y;
  for (int i = 0; i < 30; i++) {
    sum += term / (2 * i + 1);
    term *= y2;
  }
  final ln = 2.0 * sum;
  const ln2 = 0.6931471805599453;
  return ln / ln2;
}
