import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:harmony_knight/models/quest.dart';
import 'package:harmony_knight/providers/quest_provider.dart';

void main() {
  test('Quest tracks completion progress', () {
    const quest = Quest(
      id: 'daily-read-5',
      title: 'Read 5 notes',
      mode: QuestMode.practice,
      targetCount: 5,
      rewardHarmonyPoints: 20,
    );

    final updated = quest.increment();

    expect(updated.progressCount, 1);
    expect(updated.isComplete, isFalse);
  });

  test('Quest completion clamps at target count', () {
    const quest = Quest(
      id: 'daily-duel-1',
      title: 'Win 1 Duel turn',
      mode: QuestMode.duel,
      targetCount: 1,
      progressCount: 1,
      rewardHarmonyPoints: 20,
    );

    final updated = quest.increment();

    expect(updated.progressCount, 1);
    expect(updated.isComplete, isTrue);
  });

  test('QuestNotifier exposes a recommended quest and daily quests', () {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    final state = container.read(questProvider);

    expect(state.recommendedQuest.title, 'Read 5 notes');
    expect(state.dailyQuests.length, 3);
  });

  test('QuestNotifier increments matching quest mode', () {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    container.read(questProvider.notifier).recordProgress(QuestMode.practice);

    final state = container.read(questProvider);
    expect(state.dailyQuests.first.progressCount, 1);
  });
}
