import 'package:flutter_test/flutter_test.dart';
import 'package:harmony_knight/engine/spaced_repetition.dart';

void main() {
  group('SpacedRepetitionScheduler', () {
    final scheduler = SpacedRepetitionScheduler();

    test('first "good" response sets interval to 1 day', () {
      final item = SRItem(
        id: 'test1',
        topic: 'Note ID',
        gradeLevel: 1,
        nextReviewAt: DateTime.now(),
      );
      final result = scheduler.schedule(item: item, response: SRResponse.good);
      expect(result.updatedItem.intervalDays, 1);
      expect(result.updatedItem.repetitions, 1);
    });

    test('second "good" response sets interval to 3 days', () {
      final item = SRItem(
        id: 'test2',
        topic: 'Note ID',
        gradeLevel: 1,
        repetitions: 1,
        intervalDays: 1,
        nextReviewAt: DateTime.now(),
      );
      final result = scheduler.schedule(item: item, response: SRResponse.good);
      expect(result.updatedItem.intervalDays, 3);
    });

    test('"again" resets to 0 days (retry immediately)', () {
      final item = SRItem(
        id: 'test3',
        topic: 'Intervals',
        gradeLevel: 4,
        repetitions: 3,
        intervalDays: 10,
        nextReviewAt: DateTime.now(),
      );
      final result = scheduler.schedule(item: item, response: SRResponse.again);
      expect(result.updatedItem.repetitions, 0);
      expect(result.updatedItem.intervalDays, 0);
    });

    test('"easy" response gives longer interval than "good"', () {
      final item = SRItem(
        id: 'test4',
        topic: 'Scales',
        gradeLevel: 3,
        nextReviewAt: DateTime.now(),
      );
      final goodResult =
          scheduler.schedule(item: item, response: SRResponse.good);
      final easyResult =
          scheduler.schedule(item: item, response: SRResponse.easy);
      expect(easyResult.updatedItem.intervalDays,
          greaterThan(goodResult.updatedItem.intervalDays));
    });

    test('ease factor decreases on "hard" responses', () {
      final item = SRItem(
        id: 'test5',
        topic: 'Cadences',
        gradeLevel: 5,
        easeFactor: 2.5,
        nextReviewAt: DateTime.now(),
      );
      final result = scheduler.schedule(item: item, response: SRResponse.hard);
      expect(result.updatedItem.easeFactor, lessThan(2.5));
    });

    test('ease factor never drops below 1.3', () {
      var item = SRItem(
        id: 'test6',
        topic: 'Counterpoint',
        gradeLevel: 9,
        easeFactor: 1.3,
        nextReviewAt: DateTime.now(),
      );
      for (int i = 0; i < 10; i++) {
        final result =
            scheduler.schedule(item: item, response: SRResponse.again);
        item = result.updatedItem;
      }
      expect(item.easeFactor, greaterThanOrEqualTo(1.3));
    });
  });

  group('buildSessionQueue', () {
    test('warm-up items come first', () {
      final scheduler = SpacedRepetitionScheduler(warmUpCount: 2);
      final items = List.generate(
        10,
        (i) => SRItem(
          id: 'item_$i',
          topic: 'Topic $i',
          gradeLevel: 1,
          repetitions: i + 1,
          intervalDays: 1,
          nextReviewAt: DateTime.now().subtract(const Duration(days: 1)),
        ),
      );
      final queue = scheduler.buildSessionQueue(items);
      expect(queue.length, greaterThanOrEqualTo(2));
      // First items should be the ones with earliest nextReviewAt (most overdue).
      expect(queue[0].id, 'item_0');
    });

    test('new items are limited by maxNewItemsPerSession', () {
      final scheduler =
          SpacedRepetitionScheduler(maxNewItemsPerSession: 3);
      final newItems = List.generate(
        20,
        (i) => SRItem(
          id: 'new_$i',
          topic: 'New Topic $i',
          gradeLevel: 1,
          nextReviewAt: DateTime.now(),
        ),
      );
      final queue = scheduler.buildSessionQueue(newItems);
      expect(queue.length, lessThanOrEqualTo(3));
    });
  });
}
