import 'package:flutter_test/flutter_test.dart';
import 'package:harmony_knight/engine/core/input_frame.dart';

void main() {
  group('InputFrame pitch conversion', () {
    test('440Hz maps to MIDI 69 (A4)', () {
      const frame = InputFrame(
        time: 0.0,
        frequency: 440.0,
        confidence: 0.9,
      );
      expect(frame.midiNearest, equals(69));
      expect(frame.midiContinuous, closeTo(69.0, 0.01));
    });

    test('880Hz maps to MIDI 81 (A5)', () {
      const frame = InputFrame(
        time: 0.0,
        frequency: 880.0,
        confidence: 0.9,
      );
      expect(frame.midiNearest, equals(81));
    });

    test('261.63Hz maps to MIDI 60 (middle C)', () {
      const frame = InputFrame(
        time: 0.0,
        frequency: 261.63,
        confidence: 0.9,
      );
      expect(frame.midiNearest, equals(60));
    });

    test('silent frame returns null MIDI', () {
      const frame = InputFrame.silent(1.0);
      expect(frame.frequency, isNull);
      expect(frame.midiContinuous, isNull);
      expect(frame.midiNearest, isNull);
    });
  });

  group('InputFrame confidence', () {
    test('hasPitch requires frequency AND confidence', () {
      const highConf = InputFrame(
        time: 0,
        frequency: 440.0,
        confidence: 0.8,
      );
      expect(highConf.hasPitch(), isTrue);

      const lowConf = InputFrame(
        time: 0,
        frequency: 440.0,
        confidence: 0.2,
      );
      expect(lowConf.hasPitch(), isFalse);

      const noFreq = InputFrame(
        time: 0,
        frequency: null,
        confidence: 0.9,
      );
      expect(noFreq.hasPitch(), isFalse);
    });

    test('hasPitch respects custom threshold', () {
      const frame = InputFrame(
        time: 0,
        frequency: 440.0,
        confidence: 0.6,
      );
      expect(frame.hasPitch(minConfidence: 0.5), isTrue);
      expect(frame.hasPitch(minConfidence: 0.7), isFalse);
    });
  });
}
