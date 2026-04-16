import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:harmony_knight/engine/charting/chart.dart';
import 'package:harmony_knight/engine/charting/chart_generator.dart';
import 'package:harmony_knight/engine/core/chart_note.dart';

void main() {
  group('Chart binary search', () {
    test('firstNoteIndexAtOrAfter finds correct index', () {
      final chart = Chart(
        title: 'test',
        bpm: 120,
        durationSeconds: 10,
        notes: const [
          ChartNote(time: 1.0, midi: 60, id: 0),
          ChartNote(time: 2.0, midi: 60, id: 1),
          ChartNote(time: 3.0, midi: 60, id: 2),
          ChartNote(time: 4.0, midi: 60, id: 3),
        ],
      );

      expect(chart.firstNoteIndexAtOrAfter(0.0), equals(0));
      expect(chart.firstNoteIndexAtOrAfter(1.0), equals(0));
      expect(chart.firstNoteIndexAtOrAfter(1.5), equals(1));
      expect(chart.firstNoteIndexAtOrAfter(4.0), equals(3));
      expect(chart.firstNoteIndexAtOrAfter(5.0), equals(4));
    });

    test('notesInWindow returns correct range', () {
      final chart = ChartGenerator.buildTestChart(
        noteCount: 10,
        spacing: 1.0,
      );

      final inWindow = chart.notesInWindow(4.0, 6.0).toList();
      // Notes start at t=2.0 with 1s spacing: 2,3,4,5,6,7...
      // Window [4,6] should include notes at 4, 5, 6.
      expect(inWindow.length, equals(3));
      expect(inWindow.first.time, equals(4.0));
      expect(inWindow.last.time, equals(6.0));
    });
  });

  group('Chart serialization', () {
    test('JSON roundtrip preserves all note data', () {
      final original = Chart(
        title: 'Roundtrip Test',
        bpm: 140.0,
        durationSeconds: 45.5,
        audioPath: 'assets/test.mp3',
        notes: const [
          ChartNote(time: 1.5, duration: 0.25, midi: 60, lane: 0, id: 1),
          ChartNote(time: 2.0, duration: 0.0, midi: 64, lane: 2, id: 2),
        ],
      );

      final json = original.toJson();
      final serialized = jsonEncode(json);
      final decoded = jsonDecode(serialized) as Map<String, dynamic>;
      final restored = Chart.fromJson(decoded);

      expect(restored.title, equals(original.title));
      expect(restored.bpm, equals(original.bpm));
      expect(restored.durationSeconds, equals(original.durationSeconds));
      expect(restored.audioPath, equals(original.audioPath));
      expect(restored.notes.length, equals(original.notes.length));
      expect(restored.notes[0].time, equals(1.5));
      expect(restored.notes[0].midi, equals(60));
      expect(restored.notes[1].lane, equals(2));
    });
  });

  group('ChartNote', () {
    test('frequency calculation matches MIDI standard', () {
      // A4 (MIDI 69) = 440Hz.
      const a4 = ChartNote(time: 0, midi: 69);
      expect(a4.frequencyHz, closeTo(440.0, 0.01));

      // A5 (MIDI 81) = 880Hz.
      const a5 = ChartNote(time: 0, midi: 81);
      expect(a5.frequencyHz, closeTo(880.0, 0.1));

      // Middle C (MIDI 60) ≈ 261.63Hz.
      const c4 = ChartNote(time: 0, midi: 60);
      expect(c4.frequencyHz, closeTo(261.63, 0.1));
    });

    test('containsTime respects duration', () {
      const note = ChartNote(time: 5.0, duration: 2.0, midi: 60);
      expect(note.containsTime(4.5), isFalse);
      expect(note.containsTime(5.0), isTrue);
      expect(note.containsTime(6.5), isTrue);
      expect(note.containsTime(7.0), isTrue);
      expect(note.containsTime(7.5), isFalse);
    });
  });
}
