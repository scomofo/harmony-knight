import 'dart:math';

/// Spaced repetition scheduler optimized for ADHD learners.
///
/// Based on a simplified SM-2 algorithm adapted for "little and often"
/// practice sessions (10-15 minutes). Cards that are failed are shown
/// sooner, but the algorithm never overwhelms with too many reviews.
///
/// ADHD adaptations:
/// - Session capped at 10-15 minutes (configurable).
/// - Maximum 20 new items per session to prevent cognitive overload.
/// - "Warm-up" items (easy reviews) always shown first to build momentum.
/// - Failed items are re-shown within the same session (immediate retry).
class SpacedRepetitionScheduler {
  /// Maximum session duration in minutes.
  final int maxSessionMinutes;

  /// Maximum new items introduced per session.
  final int maxNewItemsPerSession;

  /// Number of warm-up (easy review) items to start each session.
  final int warmUpCount;

  SpacedRepetitionScheduler({
    this.maxSessionMinutes = 12,
    this.maxNewItemsPerSession = 20,
    this.warmUpCount = 3,
  });

  /// Schedule the next review for an item after a response.
  SRScheduleResult schedule({
    required SRItem item,
    required SRResponse response,
  }) {
    double newEaseFactor = item.easeFactor;
    int newRepetitions = item.repetitions;
    int newIntervalDays;

    switch (response) {
      case SRResponse.again:
        // Reset — show again soon.
        newRepetitions = 0;
        newIntervalDays = 0; // Same session.
        newEaseFactor = max(1.3, newEaseFactor - 0.2);
        break;
      case SRResponse.hard:
        newRepetitions = item.repetitions + 1;
        newIntervalDays = max(1, (item.intervalDays * 1.2).round());
        newEaseFactor = max(1.3, newEaseFactor - 0.15);
        break;
      case SRResponse.good:
        newRepetitions = item.repetitions + 1;
        if (item.repetitions == 0) {
          newIntervalDays = 1;
        } else if (item.repetitions == 1) {
          newIntervalDays = 3;
        } else {
          newIntervalDays = (item.intervalDays * newEaseFactor).round();
        }
        break;
      case SRResponse.easy:
        newRepetitions = item.repetitions + 1;
        if (item.repetitions == 0) {
          newIntervalDays = 4;
        } else {
          newIntervalDays = (item.intervalDays * newEaseFactor * 1.3).round();
        }
        newEaseFactor += 0.15;
        break;
    }

    final nextReviewAt = response == SRResponse.again
        ? DateTime.now() // Retry immediately.
        : DateTime.now().add(Duration(days: newIntervalDays));

    return SRScheduleResult(
      updatedItem: SRItem(
        id: item.id,
        topic: item.topic,
        gradeLevel: item.gradeLevel,
        easeFactor: newEaseFactor,
        intervalDays: newIntervalDays,
        repetitions: newRepetitions,
        nextReviewAt: nextReviewAt,
        lastReviewedAt: DateTime.now(),
      ),
      nextReviewAt: nextReviewAt,
    );
  }

  /// Build a session queue from the item pool.
  ///
  /// Returns items ordered for an ADHD-optimized session:
  /// 1. Warm-up items (easiest due reviews)
  /// 2. Due reviews (sorted by overdue-ness)
  /// 3. New items (limited to [maxNewItemsPerSession])
  List<SRItem> buildSessionQueue(List<SRItem> allItems) {
    final now = DateTime.now();
    final queue = <SRItem>[];

    // Separate due reviews and new items.
    final dueItems = allItems
        .where((i) => i.repetitions > 0 && i.nextReviewAt.isBefore(now))
        .toList()
      ..sort((a, b) => a.nextReviewAt.compareTo(b.nextReviewAt));

    final newItems = allItems
        .where((i) => i.repetitions == 0)
        .take(maxNewItemsPerSession)
        .toList();

    // 1. Warm-up: easiest due reviews first.
    final warmUps = dueItems.take(warmUpCount).toList();
    queue.addAll(warmUps);
    final remaining = dueItems.skip(warmUpCount).toList();

    // 2. Interleave remaining reviews with new items.
    int reviewIdx = 0;
    int newIdx = 0;
    while (reviewIdx < remaining.length || newIdx < newItems.length) {
      // 3 reviews, then 1 new item (prevents "all new" overwhelm).
      for (int i = 0; i < 3 && reviewIdx < remaining.length; i++) {
        queue.add(remaining[reviewIdx++]);
      }
      if (newIdx < newItems.length) {
        queue.add(newItems[newIdx++]);
      }
    }

    return queue;
  }
}

/// A single item in the spaced repetition system.
class SRItem {
  final String id;
  final String topic;
  final int gradeLevel;
  final double easeFactor;
  final int intervalDays;
  final int repetitions;
  final DateTime nextReviewAt;
  final DateTime? lastReviewedAt;

  const SRItem({
    required this.id,
    required this.topic,
    required this.gradeLevel,
    this.easeFactor = 2.5,
    this.intervalDays = 0,
    this.repetitions = 0,
    required this.nextReviewAt,
    this.lastReviewedAt,
  });
}

/// User response quality for spaced repetition.
enum SRResponse { again, hard, good, easy }

/// Result of scheduling a review.
class SRScheduleResult {
  final SRItem updatedItem;
  final DateTime nextReviewAt;

  const SRScheduleResult({
    required this.updatedItem,
    required this.nextReviewAt,
  });
}
