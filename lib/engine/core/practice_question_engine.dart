import 'package:harmony_knight/engine/spaced_repetition.dart';
import 'package:harmony_knight/models/note.dart';

/// Owns note-pool selection, spaced-repetition queueing, question
/// generation, and per-note accuracy tracking for the practice loop.
///
/// Deliberately framework-agnostic (no Flutter/Riverpod dependency) so it
/// can be unit-tested without pumping a widget tree. `PracticeScreen` owns
/// an instance and applies the Riverpod side effects — [recordAnswer]
/// reports what changed rather than persisting it directly.
class PracticeQuestionEngine {
  PracticeQuestionEngine({SpacedRepetitionScheduler? scheduler})
      : scheduler = scheduler ?? SpacedRepetitionScheduler();

  SpacedRepetitionScheduler scheduler;
  List<Note> notePool = [];
  bool questionHadError = false;

  Note? targetNote;
  List<Note> answerOptions = const [];

  List<SRItem> _srQueue = const [];
  int _srQueueIndex = 0;

  // Tracks correctness per MIDI note for weak-note detection.
  // midi -> [wasCorrect, wasCorrect, ...]
  final Map<int, List<bool>> _noteHistory = {};

  /// True once the current position has run past the end of the SR queue
  /// (or the queue was never built) — callers should rebuild via
  /// [rebuildQueue] before calling [generateQuestion].
  bool get isQueueExhausted => _srQueueIndex >= _srQueue.length;

  /// Returns a grade-appropriate note pool.
  ///
  /// Grade 0 : C, E, G (landmark tonic triad — just 3 choices)
  /// Grade 1–2: C major (C4–B4)
  /// Grade 3–4: C major + A minor (adds A3, B3, C5)
  /// Grade 5+  : Full chromatic C4–C5 (all 13 notes)
  static List<Note> buildNotePool(int gradeLevel) {
    if (gradeLevel == 0) {
      return const [Note(midi: 60), Note(midi: 64), Note(midi: 67)]; // C4, E4, G4
    }
    if (gradeLevel <= 2) {
      return const [
        Note(midi: 60), Note(midi: 62), Note(midi: 64),
        Note(midi: 65), Note(midi: 67), Note(midi: 69), Note(midi: 71),
      ];
    }
    if (gradeLevel <= 4) {
      // C major + A minor: adds A3(57), B3(59), C5(72).
      return const [
        Note(midi: 57), Note(midi: 59),
        Note(midi: 60), Note(midi: 62), Note(midi: 64),
        Note(midi: 65), Note(midi: 67), Note(midi: 69), Note(midi: 71),
        Note(midi: 72),
      ];
    }
    return List.generate(13, (i) => Note(midi: 60 + i));
  }

  /// Reconfigures the SR scheduler (e.g. from session preferences).
  void configureScheduler({
    required int maxNewItemsPerSession,
    required int warmUpCount,
  }) {
    scheduler = SpacedRepetitionScheduler(
      maxNewItemsPerSession: maxNewItemsPerSession,
      warmUpCount: warmUpCount,
    );
  }

  /// Rebuilds the SR session queue from the caller-supplied items for the
  /// current pool (fetched from the SR provider, which stays Riverpod-owned
  /// since it's the source of truth for persisted review state).
  void rebuildQueue(List<SRItem> itemsForPool) {
    _srQueue = scheduler.buildSessionQueue(itemsForPool);
    // Fallback: if SR queue is empty (all items new with no repetitions),
    // treat every item as due by using the full pool in shuffled order.
    if (_srQueue.isEmpty) {
      _srQueue = List<SRItem>.from(itemsForPool)..shuffle();
    }
    _srQueueIndex = 0;
  }

  /// Resets question-level error tracking and computes the next
  /// [targetNote]/[answerOptions] from the current SR queue position.
  ///
  /// Returns false (leaving the previous question in place) if the pool or
  /// queue is empty — this is a defensive fallback that should not happen
  /// in practice since [rebuildQueue] always populates a non-empty queue
  /// whenever it's given non-empty items.
  bool generateQuestion() {
    questionHadError = false;
    if (notePool.isEmpty || _srQueue.isEmpty) return false;

    // Target note is SR-driven.
    final srItem = _srQueue[_srQueueIndex];
    final targetMidi = int.tryParse(srItem.id.replaceFirst('note_', '')) ?? -1;
    targetNote = notePool.firstWhere(
      (n) => n.midi == targetMidi,
      orElse: () => notePool.first,
    );

    // Distractors: up to 3 random non-target notes from the pool.
    final distractors = (List<Note>.from(notePool)
          ..removeWhere((n) => n.midi == targetNote!.midi)
          ..shuffle())
        .take(3)
        .toList();

    answerOptions = ([targetNote!, ...distractors]..shuffle()).toList();
    return true;
  }

  /// Records the player's answer against [targetNote], updating weak-note
  /// history and SR scheduling. Returns the SR item to persist (if any)
  /// and the current weak-note set — the caller applies both via Riverpod.
  PracticeAnswerResult recordAnswer(Note selected) {
    final target = targetNote;
    final isCorrect = target != null && selected.midi == target.midi;

    if (target != null) {
      _noteHistory.putIfAbsent(target.midi, () => []).add(isCorrect);
    }

    SRItem? updatedItem;
    if (_srQueue.isNotEmpty && _srQueueIndex < _srQueue.length) {
      final currentItem = _srQueue[_srQueueIndex];
      final response = isCorrect
          ? (questionHadError ? SRResponse.hard : SRResponse.good)
          : SRResponse.again;
      final result = scheduler.schedule(item: currentItem, response: response);
      updatedItem = result.updatedItem;
      if (isCorrect) _srQueueIndex++;
    }
    if (!isCorrect) questionHadError = true;

    return PracticeAnswerResult(
      isCorrect: isCorrect,
      updatedSRItem: updatedItem,
      weakNotesMidi: _computeWeakNotes(),
    );
  }

  /// A note is "weak" if it has ≥3 attempts and >50% miss rate.
  List<int> _computeWeakNotes() {
    final weak = <int>[];
    for (final entry in _noteHistory.entries) {
      if (entry.value.length >= 3) {
        final missRate =
            entry.value.where((b) => !b).length / entry.value.length;
        if (missRate > 0.5) weak.add(entry.key);
      }
    }
    return weak;
  }
}

/// Outcome of [PracticeQuestionEngine.recordAnswer].
class PracticeAnswerResult {
  final bool isCorrect;
  final SRItem? updatedSRItem;
  final List<int> weakNotesMidi;

  const PracticeAnswerResult({
    required this.isCorrect,
    required this.updatedSRItem,
    required this.weakNotesMidi,
  });
}
