import 'chart_note.dart';

/// A complete precomputed chart for a song/exercise.
///
/// Charts are immutable after loading. Generated offline via music21
/// or hand-authored. The engine NEVER generates chart content at runtime
/// during the gameplay loop.
class Chart {
  /// Chart title (for display).
  final String title;

  /// BPM, used for visual sync and optional metronome.
  final double bpm;

  /// Track duration in seconds.
  final double durationSeconds;

  /// All notes, sorted by [ChartNote.time] ascending.
  final List<ChartNote> notes;

  /// Optional audio file path for the backing track.
  final String? audioPath;

  Chart({
    required this.title,
    required this.bpm,
    required this.durationSeconds,
    required List<ChartNote> notes,
    this.audioPath,
  }) : notes = List.unmodifiable(_sortedCopy(notes));

  static List<ChartNote> _sortedCopy(List<ChartNote> input) {
    final copy = List<ChartNote>.from(input);
    copy.sort((a, b) => a.time.compareTo(b.time));
    return copy;
  }

  /// Find the index of the first note with time ≥ [time].
  /// Returns [notes.length] if no such note exists. Binary search — O(log n).
  int firstNoteIndexAtOrAfter(double time) {
    int lo = 0, hi = notes.length;
    while (lo < hi) {
      final mid = (lo + hi) >> 1;
      if (notes[mid].time < time) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    return lo;
  }

  /// Get all notes within a time window [start, end].
  Iterable<ChartNote> notesInWindow(double start, double end) sync* {
    final startIdx = firstNoteIndexAtOrAfter(start);
    for (int i = startIdx; i < notes.length; i++) {
      if (notes[i].time > end) break;
      yield notes[i];
    }
  }

  /// Serialize to JSON (for persistence/debugging).
  Map<String, dynamic> toJson() => {
        'title': title,
        'bpm': bpm,
        'durationSeconds': durationSeconds,
        'audioPath': audioPath,
        'notes': notes
            .map((n) => {
                  'time': n.time,
                  'duration': n.duration,
                  'midi': n.midi,
                  'lane': n.lane,
                  'id': n.id,
                })
            .toList(),
      };

  factory Chart.fromJson(Map<String, dynamic> json) {
    final rawNotes = json['notes'] as List<dynamic>? ?? [];
    final notes = rawNotes
        .map((n) {
          final m = n as Map<String, dynamic>;
          return ChartNote(
            time: (m['time'] as num).toDouble(),
            duration: (m['duration'] as num?)?.toDouble() ?? 0.0,
            midi: m['midi'] as int,
            lane: m['lane'] as int? ?? 0,
            id: m['id'] as int? ?? 0,
          );
        })
        .toList();

    return Chart(
      title: json['title'] as String? ?? 'Untitled',
      bpm: (json['bpm'] as num?)?.toDouble() ?? 120.0,
      durationSeconds: (json['durationSeconds'] as num?)?.toDouble() ?? 0.0,
      notes: notes,
      audioPath: json['audioPath'] as String?,
    );
  }
}
