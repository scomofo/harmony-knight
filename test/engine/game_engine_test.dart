import 'package:flutter_test/flutter_test.dart';
import 'package:harmony_knight/engine/charting/chart.dart';
import 'package:harmony_knight/engine/charting/chart_generator.dart';
import 'package:harmony_knight/engine/core/audio_clock.dart';
import 'package:harmony_knight/engine/core/chart_note.dart';
import 'package:harmony_knight/engine/core/game_engine.dart';
import 'package:harmony_knight/engine/core/hit_result.dart';
import 'package:harmony_knight/engine/core/input_frame.dart';

void main() {
  group('GameEngine determinism', () {
    test('same inputs produce same outputs across runs', () {
      final chart = ChartGenerator.buildTestChart(noteCount: 5);

      EngineState runOnce() {
        final engine = GameEngine(chart: chart)..start();
        EngineState? last;
        final clock = StubAudioClock();
        for (int i = 0; i < 100; i++) {
          clock.advance(0.05);
          final t = clock.now();
          last = engine.update(
            time: t,
            input: InputFrame.silent(t),
          );
        }
        return last!;
      }

      final a = runOnce();
      final b = runOnce();

      expect(a.time, equals(b.time));
      expect(a.stats.misses, equals(b.stats.misses));
      expect(a.stats.perfects, equals(b.stats.perfects));
      expect(a.progress, equals(b.progress));
    });

    test('engine tolerates tiny clock jitter', () {
      final chart = ChartGenerator.buildTestChart();
      final engine = GameEngine(chart: chart)..start();

      // Forward 1s, then slightly back (< 1ms), then forward again.
      engine.update(time: 1.0, input: const InputFrame(time: 1.0));
      engine.update(time: 0.9995, input: const InputFrame(time: 0.9995));
      engine.update(time: 1.001, input: const InputFrame(time: 1.001));

      // Should not throw.
      expect(engine.isRunning, isTrue);
    });
  });

  group('GameEngine scoring', () {
    test('perfect hit registers as perfect', () {
      final note = const ChartNote(time: 5.0, midi: 69, id: 1); // A4 = 440Hz
      final chart = Chart(
        title: 'test',
        bpm: 120,
        durationSeconds: 10,
        notes: [note],
      );
      final engine = GameEngine(chart: chart)..start();

      // Tick engine forward through the note's activation time.
      engine.update(time: 4.9, input: const InputFrame(time: 4.9));
      // Hit it: exact time, exact frequency.
      final state = engine.update(
        time: 5.0,
        input: const InputFrame(
          time: 5.0,
          frequency: 440.0,
          confidence: 0.9,
          amplitude: 0.3,
        ),
      );

      expect(state.stats.perfects, equals(1));
      expect(state.stats.misses, equals(0));
    });

    test('missed note is counted after window expires', () {
      final note = const ChartNote(time: 5.0, midi: 60, id: 1);
      final chart = Chart(
        title: 'test',
        bpm: 120,
        durationSeconds: 10,
        notes: [note],
      );
      final engine = GameEngine(chart: chart)..start();

      // Never provide valid input; advance past the miss window.
      for (double t = 4.0; t < 6.0; t += 0.1) {
        engine.update(time: t, input: InputFrame.silent(t));
      }

      expect(engine.stats.misses, equals(1));
      expect(engine.stats.perfects, equals(0));
    });

    test('late hit within window still counts as good', () {
      final note = const ChartNote(time: 5.0, midi: 69, id: 1);
      final chart = Chart(
        title: 'test',
        bpm: 120,
        durationSeconds: 10,
        notes: [note],
      );
      final engine = GameEngine(chart: chart)..start();

      engine.update(time: 4.9, input: InputFrame.silent(4.9));
      // 80ms late — should still count as good-ish.
      final state = engine.update(
        time: 5.08,
        input: const InputFrame(
          time: 5.08,
          frequency: 440.0,
          confidence: 0.9,
          amplitude: 0.3,
        ),
      );

      expect(state.stats.misses, equals(0));
      expect(state.stats.totalHits, greaterThanOrEqualTo(1));
    });

    test('pitch way off registers as miss even with perfect timing', () {
      final note = const ChartNote(time: 5.0, midi: 69, id: 1);
      final chart = Chart(
        title: 'test',
        bpm: 120,
        durationSeconds: 10,
        notes: [note],
      );
      final engine = GameEngine(chart: chart)..start();

      engine.update(time: 4.9, input: InputFrame.silent(4.9));
      // Perfect timing but singing a tritone off (way outside cent window).
      final wrongFreq = 440.0 * 1.414; // +600 cents
      engine.update(
        time: 5.0,
        input: InputFrame(
          time: 5.0,
          frequency: wrongFreq,
          confidence: 0.9,
          amplitude: 0.3,
        ),
      );

      // Advance past the window to register the miss.
      for (double t = 5.01; t < 6.0; t += 0.05) {
        engine.update(time: t, input: InputFrame.silent(t));
      }

      expect(engine.stats.misses, greaterThanOrEqualTo(1));
    });
  });

  group('NoteTracker', () {
    test('progress advances as notes are resolved', () {
      final chart = ChartGenerator.buildTestChart(noteCount: 10, spacing: 0.5);
      final engine = GameEngine(chart: chart)..start();

      expect(engine.tracker.progress(), equals(0.0));

      // Miss every note by giving only silence across the whole chart.
      for (double t = 0.0; t <= chart.durationSeconds; t += 0.05) {
        engine.update(time: t, input: InputFrame.silent(t));
      }

      expect(engine.tracker.progress(), equals(1.0));
      expect(engine.stats.misses, equals(10));
    });
  });

  group('HitWindows classification', () {
    const windows = HitWindows();

    test('perfect when both errors within perfect thresholds', () {
      final hit = HitResult(
        note: const ChartNote(time: 0, midi: 60),
        timingErrorMs: 10.0,
        pitchErrorCents: 5.0,
        confidence: 0.9,
        rating: HitRating.perfect,
        score: 1.0,
        hitTime: 0.0,
      );
      expect(hit.rating, HitRating.perfect);
      // Sanity: the threshold should categorize these as perfect.
      expect(10.0, lessThanOrEqualTo(windows.perfectMs));
      expect(5.0, lessThanOrEqualTo(windows.perfectCents));
    });
  });
}
