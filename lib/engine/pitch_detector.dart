import 'dart:math';
import 'dart:typed_data';

/// Real-time pitch detection engine using autocorrelation.
///
/// Detects the fundamental frequency (F0) from microphone PCM input
/// and converts it to the nearest MIDI note. Used for:
/// - Ear training: "sing this note" exercises
/// - Sight-singing at 100% confidence (Maestro mode)
/// - Real-time intonation feedback
///
/// Uses the YIN-inspired autocorrelation algorithm for robustness
/// with vocal input and monophonic instruments.
class PitchDetector {
  /// Minimum detectable frequency (Hz) — roughly C2 (65 Hz).
  static const double minFrequency = 60.0;

  /// Maximum detectable frequency (Hz) — roughly C7 (2093 Hz).
  static const double maxFrequency = 2100.0;

  /// Sample rate expected from microphone input.
  final int sampleRate;

  /// Confidence threshold below which we consider "no pitch detected."
  final double confidenceThreshold;

  PitchDetector({
    this.sampleRate = 44100,
    this.confidenceThreshold = 0.7,
  });

  /// Detect the pitch in a buffer of PCM float samples.
  ///
  /// Returns a [PitchResult] with the detected frequency, MIDI note,
  /// and confidence. Returns null if no clear pitch is detected.
  PitchResult? detect(Float32List samples) {
    if (samples.length < sampleRate ~/ minFrequency.round()) {
      return null; // Buffer too short for lowest frequency.
    }

    // Autocorrelation-based pitch detection.
    final minLag = (sampleRate / maxFrequency).round();
    final maxLag = (sampleRate / minFrequency).round();
    final bufferSize = samples.length;

    if (maxLag >= bufferSize) return null;

    // Compute the normalized autocorrelation (NSDF).
    final correlations = <double>[];

    for (int lag = minLag; lag <= maxLag && lag < bufferSize ~/ 2; lag++) {
      double correlation = 0;
      double energy1 = 0;
      double energy2 = 0;

      final compareLength = bufferSize - lag;
      for (int i = 0; i < compareLength; i++) {
        correlation += samples[i] * samples[i + lag];
        energy1 += samples[i] * samples[i];
        energy2 += samples[i + lag] * samples[i + lag];
      }

      final energy = sqrt(energy1 * energy2);
      if (energy > 0) {
        correlations.add(correlation / energy);
      } else {
        correlations.add(0);
      }
    }

    double bestCorrelation = 0;
    int bestLag = 0;

    // Prefer the first strong local maximum to avoid locking onto octave-down
    // harmonics later in the autocorrelation curve.
    for (int i = 1; i < correlations.length - 1; i++) {
      final current = correlations[i];
      if (current < confidenceThreshold) continue;

      final isLocalMaximum =
          current >= correlations[i - 1] && current >= correlations[i + 1];
      if (isLocalMaximum) {
        bestCorrelation = current;
        bestLag = minLag + i;
        break;
      }
    }

    // Fall back to the global maximum when no clear local peak exists.
    if (bestLag == 0) {
      for (int i = 0; i < correlations.length; i++) {
        final current = correlations[i];
        if (current > bestCorrelation) {
          bestCorrelation = current;
          bestLag = minLag + i;
        }
      }
    }

    // Check if the correlation is strong enough.
    if (bestCorrelation < confidenceThreshold || bestLag == 0) {
      return null;
    }

    // Parabolic interpolation for sub-sample accuracy.
    final frequency = _parabolicInterpolation(samples, bestLag);
    if (frequency < minFrequency || frequency > maxFrequency) {
      return null;
    }

    final midiNote = frequencyToMidi(frequency);
    final nearestMidi = midiNote.round();
    final centsOff = ((midiNote - nearestMidi) * 100).round();

    return PitchResult(
      frequency: frequency,
      midiNote: nearestMidi,
      centsOff: centsOff,
      confidence: bestCorrelation,
    );
  }

  /// Parabolic interpolation around the best lag for sub-sample accuracy.
  double _parabolicInterpolation(Float32List samples, int bestLag) {
    if (bestLag <= 0 || bestLag >= samples.length - 1) {
      return sampleRate / bestLag;
    }

    // Autocorrelation at lag-1, lag, lag+1.
    final alpha = _autocorrelationAt(samples, bestLag - 1);
    final beta = _autocorrelationAt(samples, bestLag);
    final gamma = _autocorrelationAt(samples, bestLag + 1);

    final denominator = 2 * (2 * beta - alpha - gamma);
    if (denominator.abs() < 1e-10) return sampleRate / bestLag;

    final peak = bestLag + (alpha - gamma) / denominator;
    return sampleRate / peak;
  }

  double _autocorrelationAt(Float32List samples, int lag) {
    double sum = 0;
    final length = samples.length - lag;
    for (int i = 0; i < length; i++) {
      sum += samples[i] * samples[i + lag];
    }
    return sum;
  }

  /// Convert frequency (Hz) to MIDI note number (fractional for cents).
  static double frequencyToMidi(double frequency) {
    return 69 + 12 * (log(frequency / 440.0) / log(2));
  }

  /// Convert MIDI note number to frequency (Hz).
  static double midiToFrequency(int midiNote) {
    return 440.0 * pow(2.0, (midiNote - 69) / 12.0);
  }

  /// Get the note name for a MIDI number.
  static String midiToNoteName(int midi) {
    const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    final pitchClass = midi % 12;
    final octave = (midi ~/ 12) - 1;
    return '${names[pitchClass]}$octave';
  }
}

/// Result of a pitch detection analysis.
class PitchResult {
  /// Detected fundamental frequency in Hz.
  final double frequency;

  /// Nearest MIDI note number.
  final int midiNote;

  /// Deviation from nearest MIDI note in cents (-50 to +50).
  /// Negative = flat, Positive = sharp.
  final int centsOff;

  /// Detection confidence (0.0 to 1.0).
  final double confidence;

  const PitchResult({
    required this.frequency,
    required this.midiNote,
    required this.centsOff,
    required this.confidence,
  });

  /// Whether the detected pitch is within acceptable tuning tolerance.
  bool isInTune({int toleranceCents = 20}) => centsOff.abs() <= toleranceCents;

  /// Note name of the detected pitch.
  String get noteName => PitchDetector.midiToNoteName(midiNote);

  @override
  String toString() =>
      'Pitch($noteName, ${frequency.toStringAsFixed(1)}Hz, '
      '${centsOff >= 0 ? "+$centsOff" : "$centsOff"}¢, '
      'conf=${confidence.toStringAsFixed(2)})';
}
