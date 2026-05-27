import 'dart:convert';

import 'package:equatable/equatable.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:harmony_knight/models/quest.dart';
import 'package:shared_preferences/shared_preferences.dart';

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

  factory QuestState.fromJson(Map<String, dynamic> json) {
    return QuestState(
      recommendedQuest:
          Quest.fromJson(json['recommendedQuest'] as Map<String, dynamic>),
      dailyQuests: (json['dailyQuests'] as List<dynamic>)
          .map((quest) => Quest.fromJson(quest as Map<String, dynamic>))
          .toList(growable: false),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'recommendedQuest': recommendedQuest.toJson(),
      'dailyQuests': dailyQuests.map((quest) => quest.toJson()).toList(),
    };
  }

  String toJsonString() => jsonEncode(toJson());
}

class QuestNotifier extends StateNotifier<QuestState> {
  static const storageKey = 'quests.state';

  SharedPreferences? _prefs;

  QuestNotifier({SharedPreferences? prefs})
      : _prefs = prefs,
        super(initialState()) {
    if (prefs == null) {
      loadSavedState();
    } else {
      _loadFromPrefs(prefs);
    }
  }

  static QuestState initialState() {
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

  Future<SharedPreferences> get _store async {
    return _prefs ??= await SharedPreferences.getInstance();
  }

  Future<void> loadSavedState() async {
    _loadFromPrefs(await _store);
  }

  void _loadFromPrefs(SharedPreferences prefs) {
    final saved = prefs.getString(storageKey);
    if (saved == null) return;

    try {
      state = QuestState.fromJson(jsonDecode(saved) as Map<String, dynamic>);
    } catch (_) {
      state = initialState();
    }
  }

  Future<void> _persist() async {
    final prefs = await _store;
    await prefs.setString(storageKey, state.toJsonString());
  }

  Future<void> recordProgress(QuestMode mode) async {
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
    await _persist();
  }

  Future<int> claimQuest(String questId) async {
    Quest? quest;
    for (final candidate in state.dailyQuests) {
      if (candidate.id == questId) {
        quest = candidate;
        break;
      }
    }
    if (quest == null || !quest.isComplete || quest.claimed) {
      return 0;
    }

    final updated = [
      for (final dailyQuest in state.dailyQuests)
        if (dailyQuest.id == questId)
          dailyQuest.copyWith(claimed: true)
        else
          dailyQuest,
    ];

    final recommended = state.recommendedQuest.id == questId
        ? state.recommendedQuest.copyWith(claimed: true)
        : state.recommendedQuest;

    state = state.copyWith(
      recommendedQuest: recommended,
      dailyQuests: updated,
    );
    await _persist();
    return quest.rewardHarmonyPoints;
  }
}

final questProvider = StateNotifierProvider<QuestNotifier, QuestState>(
  (ref) => QuestNotifier(),
);
