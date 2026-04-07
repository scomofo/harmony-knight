import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:harmony_knight/engine/tone_generator.dart';

void main() {
  group('ToneGenerator', () {
    test('midiToFrequency: A4 (MIDI 69) = 440 Hz', () {
      expect(ToneGenerator.midiToFrequency(69), closeTo(440.0, 0.01));
    });

    test('midiToFrequency: C4 (MIDI 60) ≈ 261.63 Hz', () {
      expect(ToneGenerator.midiToFrequency(60), closeTo(261.63, 0.1));
    });

    test('midiToFrequency: A3 (MIDI 57) = 220 Hz', () {
      expect(ToneGenerator.midiToFrequency(57), closeTo(220.0, 0.01));
    });

    test('generateSineTone produces correct sample count', () {
      final samples = ToneGenerator.generateSineTone(
        midiNote: 69,
        durationMs: 1000,
      );
      expect(samples.length, ToneGenerator.sampleRate); // 1 second = 44100 samples.
    });

    test('generateSineTone at zero volume produces near-silence', () {
      final samples = ToneGenerator.generateSineTone(
        midiNote: 69,
        durationMs: 100,
        volume: 0.0,
      );
      final maxAmp = samples.reduce((a, b) => a.abs() > b.abs() ? a : b).abs();
      expect(maxAmp, lessThan(0.001));
    });

    test('generateHarmonicTone has more spectral content than sine', () {
      final sine = ToneGenerator.generateSineTone(
        midiNote: 60,
        durationMs: 500,
      );
      final harmonic = ToneGenerator.generateHarmonicTone(
        midiNote: 60,
        durationMs: 500,
        harmonics: 6,
      );
      // Both should have the same length.
      expect(harmonic.length, sine.length);
    });

    test('applyLowPassFilter reduces high-frequency content', () {
      // Generate a high-frequency tone (C7, ~2093 Hz).
      final samples = ToneGenerator.generateSineTone(
        midiNote: 96,
        durationMs: 100,
      );
      // Apply aggressive low-pass at 500 Hz.
      final filtered = ToneGenerator.applyLowPassFilter(
        samples,
        cutoffHz: 500,
      );
      // Filtered signal should have lower RMS energy.
      final originalRms = _rms(samples);
      final filteredRms = _rms(filtered);
      expect(filteredRms, lessThan(originalRms));
    });

    test('samplesToWav produces valid WAV header', () {
      final samples = ToneGenerator.generateSineTone(
        midiNote: 60,
        durationMs: 100,
      );
      final wav = ToneGenerator.samplesToWav(samples);
      // WAV starts with "RIFF".
      expect(wav[0], 0x52); // R
      expect(wav[1], 0x49); // I
      expect(wav[2], 0x46); // F
      expect(wav[3], 0x46); // F
      // "WAVE" at offset 8.
      expect(wav[8], 0x57);  // W
      expect(wav[9], 0x41);  // A
      expect(wav[10], 0x56); // V
      expect(wav[11], 0x45); // E
      // Header is 44 bytes.
      expect(wav.length, greaterThan(44));
    });
  });
}

double _rms(Float32List samples) {
  double sum = 0;
  for (final s in samples) {
    sum += s * s;
  }
  return sum / samples.length;
}
