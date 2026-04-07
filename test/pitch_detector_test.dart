import 'dart:math';
import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:harmony_knight/engine/pitch_detector.dart';

void main() {
  group('PitchDetector', () {
    final detector = PitchDetector(sampleRate: 44100);

    test('detects A4 (440 Hz) from synthetic sine wave', () {
      final samples = _generateSine(440.0, 44100, 4096);
      final result = detector.detect(samples);
      expect(result, isNotNull);
      expect(result!.midiNote, 69); // A4
      expect(result.frequency, closeTo(440.0, 5.0));
    });

    test('detects C4 (~261.63 Hz) from synthetic sine wave', () {
      final samples = _generateSine(261.63, 44100, 4096);
      final result = detector.detect(samples);
      expect(result, isNotNull);
      expect(result!.midiNote, 60); // C4
    });

    test('returns null for silence', () {
      final samples = Float32List(4096); // All zeros.
      final result = detector.detect(samples);
      expect(result, isNull);
    });

    test('returns null for buffer too short', () {
      final samples = Float32List(100);
      final result = detector.detect(samples);
      expect(result, isNull);
    });

    test('frequencyToMidi: 440 Hz = MIDI 69', () {
      expect(PitchDetector.frequencyToMidi(440.0), closeTo(69.0, 0.01));
    });

    test('frequencyToMidi: 261.63 Hz ≈ MIDI 60', () {
      expect(PitchDetector.frequencyToMidi(261.63), closeTo(60.0, 0.1));
    });

    test('midiToFrequency: MIDI 69 = 440 Hz', () {
      expect(PitchDetector.midiToFrequency(69), closeTo(440.0, 0.01));
    });

    test('midiToNoteName returns correct names', () {
      expect(PitchDetector.midiToNoteName(60), 'C4');
      expect(PitchDetector.midiToNoteName(69), 'A4');
      expect(PitchDetector.midiToNoteName(72), 'C5');
    });
  });

  group('PitchResult', () {
    test('isInTune within tolerance', () {
      const result = PitchResult(
        frequency: 440.0,
        midiNote: 69,
        centsOff: 5,
        confidence: 0.9,
      );
      expect(result.isInTune(toleranceCents: 20), true);
    });

    test('isInTune outside tolerance', () {
      const result = PitchResult(
        frequency: 445.0,
        midiNote: 69,
        centsOff: 35,
        confidence: 0.9,
      );
      expect(result.isInTune(toleranceCents: 20), false);
    });
  });
}

/// Generate a synthetic sine wave for testing.
Float32List _generateSine(double frequency, int sampleRate, int length) {
  final samples = Float32List(length);
  final angularFreq = 2 * pi * frequency / sampleRate;
  for (int i = 0; i < length; i++) {
    samples[i] = sin(angularFreq * i).toDouble();
  }
  return samples;
}
