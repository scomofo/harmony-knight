import 'package:flutter_test/flutter_test.dart';
import 'package:harmony_knight/engine/core/practice_question_engine.dart';
import 'package:harmony_knight/engine/spaced_repetition.dart';
import 'package:harmony_knight/models/note.dart';

SRItem _srItem(String id, {int repetitions = 0, DateTime? nextReviewAt}) {
  return SRItem(
    id: id,
    topic: 'Note ID',
    gradeLevel: 0,
    repetitions: repetitions,
    nextReviewAt: nextReviewAt ?? DateTime.now(),
  );
}

/// A single-note pool with its SR queue already built and a question
/// already generated, so [PracticeQuestionEngine.recordAnswer] tests don't
/// have to reason about which note the queue happened to pick.
PracticeQuestionEngine _singleNoteEngine(int midi) {
  final engine = PracticeQuestionEngine()..notePool = [Note(midi: midi)];
  engine.rebuildQueue([_srItem('note_$midi')]);
  engine.generateQuestion();
  return engine;
}

void main() {
  group('PracticeQuestionEngine.buildNotePool', () {
    test('grade 0 is the C-E-G tonic triad', () {
      final pool = PracticeQuestionEngine.buildNotePool(0);
      expect(pool.map((n) => n.midi).toList(), [60, 64, 67]);
    });

    test('grades 1-2 are C major C4-B4', () {
      const expected = [60, 62, 64, 65, 67, 69, 71];
      expect(
          PracticeQuestionEngine.buildNotePool(1).map((n) => n.midi).toList(),
          expected);
      expect(
          PracticeQuestionEngine.buildNotePool(2).map((n) => n.midi).toList(),
          expected);
    });

    test('grades 3-4 add A minor notes', () {
      const expected = [57, 59, 60, 62, 64, 65, 67, 69, 71, 72];
      expect(
          PracticeQuestionEngine.buildNotePool(3).map((n) => n.midi).toList(),
          expected);
      expect(
          PracticeQuestionEngine.buildNotePool(4).map((n) => n.midi).toList(),
          expected);
    });

    test('grade 5+ is the full chromatic C4-C5', () {
      final pool = PracticeQuestionEngine.buildNotePool(5);
      expect(pool.length, 13);
      expect(pool.first.midi, 60);
      expect(pool.last.midi, 72);
    });
  });

  group('generateQuestion', () {
    test('returns false when the note pool is empty', () {
      final engine = PracticeQuestionEngine();
      expect(engine.generateQuestion(), isFalse);
      expect(engine.targetNote, isNull);
    });

    test('returns false when the queue was never built', () {
      final engine = PracticeQuestionEngine()..notePool = [const Note(midi: 60)];
      expect(engine.generateQuestion(), isFalse);
    });

    test('picks the SR-driven target and includes it among the answer options',
        () {
      final pool = PracticeQuestionEngine.buildNotePool(0); // C4, E4, G4
      final engine = PracticeQuestionEngine()..notePool = pool;
      engine.rebuildQueue(pool.map((n) => _srItem('note_${n.midi}')).toList());

      expect(engine.generateQuestion(), isTrue);
      expect(engine.targetNote, isNotNull);
      expect(pool.map((n) => n.midi), contains(engine.targetNote!.midi));
      expect(engine.answerOptions, contains(engine.targetNote));
      // Target + up to 3 distractors, all pool members, no duplicates.
      expect(engine.answerOptions.length, lessThanOrEqualTo(4));
      expect(engine.answerOptions.toSet().length, engine.answerOptions.length);
      for (final option in engine.answerOptions) {
        expect(pool, contains(option));
      }
    });

    test('resets questionHadError even on a fresh question', () {
      final engine = _singleNoteEngine(60);
      engine.questionHadError = true;

      engine.generateQuestion();

      expect(engine.questionHadError, isFalse);
    });
  });

  group('rebuildQueue', () {
    test('falls back to the full pool when nothing is due or new', () {
      // All items already reviewed and not due again for days — the normal
      // scheduling algorithm produces an empty queue from this input, so
      // rebuildQueue's fallback must kick in rather than leaving the engine
      // stuck with an unusable empty queue.
      final future = DateTime.now().add(const Duration(days: 5));
      final items = List.generate(
        4,
        (i) => _srItem('note_${60 + i}', repetitions: 2, nextReviewAt: future),
      );
      final engine = PracticeQuestionEngine()
        ..notePool = List.generate(4, (i) => Note(midi: 60 + i));

      engine.rebuildQueue(items);

      expect(engine.isQueueExhausted, isFalse);
      expect(engine.generateQuestion(), isTrue);
    });
  });

  group('recordAnswer', () {
    test('correct answer is scored "good" and advances the queue', () {
      final engine = _singleNoteEngine(60);

      final result = engine.recordAnswer(const Note(midi: 60));

      expect(result.isCorrect, isTrue);
      expect(result.updatedSRItem, isNotNull);
      expect(result.updatedSRItem!.repetitions, 1);
      expect(result.updatedSRItem!.intervalDays, 1); // first "good" -> 1 day
      expect(engine.isQueueExhausted, isTrue); // only item in a 1-item queue
    });

    test('incorrect answer is scored "again" and does not advance the queue',
        () {
      final engine = _singleNoteEngine(60);

      final result = engine.recordAnswer(const Note(midi: 61));

      expect(result.isCorrect, isFalse);
      expect(result.updatedSRItem!.repetitions, 0);
      expect(result.updatedSRItem!.intervalDays, 0);
      expect(engine.isQueueExhausted, isFalse); // same question comes back
    });

    test('a wrong attempt before a correct one is scored "hard", not "good"',
        () {
      final engineWithRetry = _singleNoteEngine(60);
      engineWithRetry.recordAnswer(const Note(midi: 61)); // wrong first
      final retryResult =
          engineWithRetry.recordAnswer(const Note(midi: 60)); // then right

      final cleanEngine = _singleNoteEngine(60);
      final cleanResult =
          cleanEngine.recordAnswer(const Note(midi: 60)); // right first try

      expect(retryResult.isCorrect, isTrue);
      expect(cleanResult.isCorrect, isTrue);
      // "hard" reduces ease factor relative to a clean "good" response.
      expect(retryResult.updatedSRItem!.easeFactor,
          lessThan(cleanResult.updatedSRItem!.easeFactor));
    });

    test('weak notes require at least 3 attempts and a >50% miss rate', () {
      final engine = _singleNoteEngine(60);

      engine.recordAnswer(const Note(midi: 61)); // wrong (1/1)
      final afterTwo = engine.recordAnswer(const Note(midi: 61)); // wrong (2/2)
      expect(afterTwo.weakNotesMidi, isEmpty,
          reason: 'fewer than 3 attempts should not flag a weak note yet');

      final afterThree =
          engine.recordAnswer(const Note(midi: 61)); // wrong (3/3)
      expect(afterThree.weakNotesMidi, contains(60));
    });

    test('a note stays below the weak threshold once accuracy improves', () {
      final engine = _singleNoteEngine(60);

      engine.recordAnswer(const Note(midi: 61)); // wrong
      engine.recordAnswer(const Note(midi: 60)); // right
      final result = engine.recordAnswer(const Note(midi: 60)); // right (1/3 miss)

      expect(result.weakNotesMidi, isEmpty);
    });

    test('returns no SR item when there is no active question', () {
      final engine = PracticeQuestionEngine()..notePool = [const Note(midi: 60)];

      final result = engine.recordAnswer(const Note(midi: 60));

      expect(result.isCorrect, isFalse);
      expect(result.updatedSRItem, isNull);
    });
  });
}
