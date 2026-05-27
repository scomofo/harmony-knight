import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:harmony_knight/models/quest.dart';
import 'package:harmony_knight/providers/quest_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

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

  test('Quest serializes progress and claimed state', () {
    const quest = Quest(
      id: 'daily-read-5',
      title: 'Read 5 notes',
      mode: QuestMode.practice,
      targetCount: 5,
      progressCount: 3,
      rewardHarmonyPoints: 20,
      claimed: true,
    );

    final restored = Quest.fromJson(quest.toJson());

    expect(restored, quest);
  });

  test('QuestNotifier exposes a recommended quest and daily quests', () {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    final state = container.read(questProvider);

    expect(state.recommendedQuest.title, 'Read 5 notes');
    expect(state.dailyQuests.length, 3);
  });

  test('QuestNotifier increments matching quest mode', () async {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    await container
        .read(questProvider.notifier)
        .recordProgress(QuestMode.practice);

    final state = container.read(questProvider);
    expect(state.dailyQuests.first.progressCount, 1);
  });

  test('QuestNotifier restores saved quest progress', () async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();

    final saved = QuestNotifier.initialState().copyWith(
      recommendedQuest:
          QuestNotifier.initialState().recommendedQuest.increment(amount: 2),
      dailyQuests: [
        QuestNotifier.initialState().dailyQuests[0].increment(amount: 2),
        QuestNotifier.initialState().dailyQuests[1],
        QuestNotifier.initialState().dailyQuests[2],
      ],
    );
    await prefs.setString(QuestNotifier.storageKey, saved.toJsonString());

    final notifier = QuestNotifier(prefs: prefs);

    expect(notifier.state.recommendedQuest.progressCount, 2);
    expect(notifier.state.dailyQuests.first.progressCount, 2);
  });

  test('QuestNotifier persists progress updates', () async {
    final prefs = await SharedPreferences.getInstance();
    final notifier = QuestNotifier(prefs: prefs);

    await notifier.recordProgress(QuestMode.practice);

    final restored = QuestNotifier(prefs: prefs);
    expect(restored.state.dailyQuests.first.progressCount, 1);
  });
}
