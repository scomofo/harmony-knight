import 'dart:math';
import 'dart:typed_data';

/// Procedural waveform generator for ghost tones and practice playback.
///
/// Generates sine waves (and optionally richer waveforms) at MIDI frequencies.
/// This avoids shipping hundreds of audio sample files — we synthesize tones
/// in real-time, which also allows us to apply the scaffolding LPF smoothly.
class ToneGenerator {
  /// Sample rate for generated audio (CD quality).
  static const int sampleRate = 44100;

  /// Convert MIDI note number to frequency in Hz.
  /// A4 (MIDI 69) = 440 Hz, using equal temperament.
  static double midiToFrequency(int midiNote) {
    return 440.0 * pow(2.0, (midiNote - 69) / 12.0);
  }

  /// Generate a pure sine wave tone as PCM float samples.
  ///
  /// [midiNote]: MIDI note number (21-108).
  /// [durationMs]: Duration in milliseconds.
  /// [volume]: Linear volume (0.0 to 1.0).
  static Float32List generateSineTone({
    required int midiNote,
    required int durationMs,
    double volume = 1.0,
  }) {
    final frequency = midiToFrequency(midiNote);
    final sampleCount = (sampleRate * durationMs / 1000).round();
    final samples = Float32List(sampleCount);
    final angularFreq = 2 * pi * frequency / sampleRate;

    for (int i = 0; i < sampleCount; i++) {
      samples[i] = (sin(angularFreq * i) * volume).toDouble();
    }

    // Apply 10ms fade-in and fade-out to prevent clicks.
    _applyEnvelope(samples, fadeMs: 10);
    return samples;
  }

  /// Generate a rich harmonic tone (sine + overtones) for warmer ghost tones.
  ///
  /// At low confidence, we want the ghost tone to sound warm and full.
  /// The harmonic content is later thinned by the LPF as confidence increases.
  static Float32List generateHarmonicTone({
    required int midiNote,
    required int durationMs,
    double volume = 1.0,
    int harmonics = 6,
  }) {
    final frequency = midiToFrequency(midiNote);
    final sampleCount = (sampleRate * durationMs / 1000).round();
    final samples = Float32List(sampleCount);

    for (int h = 1; h <= harmonics; h++) {
      final harmonicFreq = frequency * h;
      // Each harmonic is progressively quieter (1/h amplitude).
      final harmonicAmp = volume / h;
      final angularFreq = 2 * pi * harmonicFreq / sampleRate;

      for (int i = 0; i < sampleCount; i++) {
        samples[i] += (sin(angularFreq * i) * harmonicAmp).toDouble();
      }
    }

    // Normalize to prevent clipping.
    double maxAmp = 0;
    for (final s in samples) {
      if (s.abs() > maxAmp) maxAmp = s.abs();
    }
    if (maxAmp > 0) {
      for (int i = 0; i < samples.length; i++) {
        samples[i] = samples[i] / maxAmp * volume;
      }
    }

    _applyEnvelope(samples, fadeMs: 10);
    return samples;
  }

  /// Apply a simple low-pass filter to PCM samples.
  ///
  /// Uses a first-order IIR filter: y[n] = alpha * x[n] + (1-alpha) * y[n-1]
  /// where alpha = 2π * cutoff / sampleRate (simplified RC filter).
  static Float32List applyLowPassFilter(
    Float32List samples, {
    required double cutoffHz,
  }) {
    if (cutoffHz >= sampleRate / 2) return samples; // No filtering needed.

    final alpha = (2 * pi * cutoffHz / sampleRate)
        .clamp(0.0, 1.0);
    final output = Float32List(samples.length);
    output[0] = samples[0] * alpha;

    for (int i = 1; i < samples.length; i++) {
      output[i] = (alpha * samples[i] + (1.0 - alpha) * output[i - 1])
          .toDouble();
    }
    return output;
  }

  /// Generate a WAV file header + PCM data as bytes.
  ///
  /// SoLoud can load WAV from memory, so we generate the complete WAV
  /// in-memory for each ghost tone request.
  static Uint8List samplesToWav(Float32List samples) {
    // Convert float samples to 16-bit PCM.
    final pcmData = Int16List(samples.length);
    for (int i = 0; i < samples.length; i++) {
      pcmData[i] = (samples[i] * 32767).round().clamp(-32768, 32767);
    }
    final pcmBytes = pcmData.buffer.asUint8List();

    // WAV header (44 bytes) + PCM data.
    final dataSize = pcmBytes.length;
    final fileSize = 36 + dataSize;
    final header = ByteData(44);

    // RIFF header.
    header.setUint8(0, 0x52); // R
    header.setUint8(1, 0x49); // I
    header.setUint8(2, 0x46); // F
    header.setUint8(3, 0x46); // F
    header.setUint32(4, fileSize, Endian.little);
    header.setUint8(8, 0x57);  // W
    header.setUint8(9, 0x41);  // A
    header.setUint8(10, 0x56); // V
    header.setUint8(11, 0x45); // E

    // fmt chunk.
    header.setUint8(12, 0x66); // f
    header.setUint8(13, 0x6D); // m
    header.setUint8(14, 0x74); // t
    header.setUint8(15, 0x20); // (space)
    header.setUint32(16, 16, Endian.little); // Chunk size.
    header.setUint16(20, 1, Endian.little);  // PCM format.
    header.setUint16(22, 1, Endian.little);  // Mono.
    header.setUint32(24, sampleRate, Endian.little);
    header.setUint32(28, sampleRate * 2, Endian.little); // Byte rate.
    header.setUint16(32, 2, Endian.little);  // Block align.
    header.setUint16(34, 16, Endian.little); // Bits per sample.

    // data chunk.
    header.setUint8(36, 0x64); // d
    header.setUint8(37, 0x61); // a
    header.setUint8(38, 0x74); // t
    header.setUint8(39, 0x61); // a
    header.setUint32(40, dataSize, Endian.little);

    // Combine header + PCM data.
    final wav = Uint8List(44 + dataSize);
    wav.setRange(0, 44, header.buffer.asUint8List());
    wav.setRange(44, 44 + dataSize, pcmBytes);
    return wav;
  }

  /// Fade in/out to prevent audio clicks.
  static void _applyEnvelope(Float32List samples, {int fadeMs = 10}) {
    final fadeSamples = (sampleRate * fadeMs / 1000).round();
    final len = samples.length;

    // Fade in.
    for (int i = 0; i < fadeSamples && i < len; i++) {
      samples[i] *= i / fadeSamples;
    }
    // Fade out.
    for (int i = 0; i < fadeSamples && (len - 1 - i) >= 0; i++) {
      samples[len - 1 - i] *= i / fadeSamples;
    }
  }
}
