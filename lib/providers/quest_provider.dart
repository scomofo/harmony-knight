import 'package:equatable/equatable.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:harmony_knight/models/quest.dart';

class QuestState extends Equatable {
  final Quest recommendedQuest;
  final List<Quest> dailyQuests;

  const QuestState({
    required this.recommendedQuest,
    required this.dailyQuests,
  });

  QuestState copyWith({
    Quest? recommendedQuest,
    List<Quest>? dailyQuests,
  }) {
    return QuestState(
      recommendedQuest: recommendedQuest ?? this.recommendedQuest,
      dailyQuests: dailyQuests ?? this.dailyQuests,
    );
  }

  @override
  List<Object?> get props => [recommendedQuest, dailyQuests];
}

class QuestNotifier extends StateNotifier<QuestState> {
  QuestNotifier() : super(_initialState());

  static QuestState _initialState() {
    const readNotes = Quest(
      id: 'daily-read-5',
      title: 'Read 5 notes',
      mode: QuestMode.practice,
      targetCount: 5,
      rewardHarmonyPoints: 20,
    );

    return const QuestState(
      recommendedQuest: readNotes,
      dailyQuests: [
        readNotes,
        Quest(
          id: 'daily-hit-6',
          title: 'Hit 6 notes in Real-Time',
          mode: QuestMode.realtime,
          targetCount: 6,
          rewardHarmonyPoints: 20,
        ),
        Quest(
          id: 'daily-duel-1',
          title: 'Win 1 Duel turn',
          mode: QuestMode.duel,
          targetCount: 1,
          rewardHarmonyPoints: 20,
        ),
      ],
    );
  }

  void recordProgress(QuestMode mode) {
    final updated = [
      for (final quest in state.dailyQuests)
        if (quest.mode == mode && !quest.isComplete)
          quest.increment()
        else
          quest,
    ];

    final recommended = state.recommendedQuest.mode == mode &&
            !state.recommendedQuest.isComplete
        ? state.recommendedQuest.increment()
        : state.recommendedQuest;

    state = state.copyWith(
      recommendedQuest: recommended,
      dailyQuests: updated,
    );
  }
}

final questProvider = StateNotifierProvider<QuestNotifier, QuestState>(
  (ref) => QuestNotifier(),
);
