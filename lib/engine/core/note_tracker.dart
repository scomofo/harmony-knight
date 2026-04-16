import '../charting/chart.dart';
import 'chart_note.dart';

/// Tracks which chart notes are upcoming, active, or resolved.
///
/// This class owns note lifecycle only. It does not score hits or talk to
/// audio/input systems. The game engine advances it once per frame.
class NoteTracker {
  final Chart chart;

  /// Notes enter the hittable window this many milliseconds before their
  /// target time.
  final double lookAheadMs;

  /// Unresolved notes are auto-missed this many milliseconds after their
  /// target time.
  final double missThresholdMs;

  int _nextIndex = 0;
  final Map<int, ChartNote> _active = <int, ChartNote>{};
  final Set<int> _resolved = <int>{};

  NoteTracker(
    this.chart, {
    this.lookAheadMs = 150.0,
    this.missThresholdMs = 150.0,
  });

  /// Notes currently inside their hittable window, sorted by time.
  Iterable<ChartNote> get activeNotes {
    final notes = _active.values.toList()..sort((a, b) => a.time.compareTo(b.time));
    return notes;
  }

  /// Notes that have not entered the hit window yet but are approaching.
  Iterable<ChartNote> upcomingNotes(
    double currentTime, {
    double lookAheadSeconds = 3.0,
  }) sync* {
    final end = currentTime + lookAheadSeconds;
    for (int i = _nextIndex; i < chart.notes.length; i++) {
      final note = chart.notes[i];
      if (note.time > end) {
        break;
      }
      if (!_resolved.contains(note.id) && !_active.containsKey(note.id)) {
        yield note;
      }
    }
  }

  /// Advance lifecycle state and return notes that just became misses.
  List<ChartNote> update(double currentTime) {
    final lookAheadSeconds = lookAheadMs / 1000.0;
    final missThresholdSeconds = missThresholdMs / 1000.0;
    final justMissed = <ChartNote>[];

    while (_nextIndex < chart.notes.length) {
      final note = chart.notes[_nextIndex];
      if (note.time - lookAheadSeconds > currentTime) {
        break;
      }
      if (!_resolved.contains(note.id)) {
        _active[note.id] = note;
      }
      _nextIndex++;
    }

    final toRemove = <int>[];
    _active.forEach((id, note) {
      if (currentTime > note.time + missThresholdSeconds) {
        justMissed.add(note);
        toRemove.add(id);
      }
    });

    for (final id in toRemove) {
      _active.remove(id);
      _resolved.add(id);
    }

    return justMissed;
  }

  /// Return the currently active note closest to [currentTime].
  ChartNote? nearestActiveNote(double currentTime) {
    if (_active.isEmpty) {
      return null;
    }

    ChartNote? best;
    var bestDelta = double.infinity;
    for (final note in _active.values) {
      final delta = (note.time - currentTime).abs();
      if (delta < bestDelta) {
        best = note;
        bestDelta = delta;
      }
    }
    return best;
  }

  /// Mark a note as successfully resolved by player input.
  void markHit(int noteId) {
    _active.remove(noteId);
    _resolved.add(noteId);
  }

  /// Reset lifecycle state for a new run.
  void reset() {
    _nextIndex = 0;
    _active.clear();
    _resolved.clear();
  }

  /// Normalized session progress from 0.0 to 1.0.
  double progress() {
    if (chart.notes.isEmpty) {
      return 1.0;
    }
    return (_resolved.length / chart.notes.length).clamp(0.0, 1.0);
  }
}
