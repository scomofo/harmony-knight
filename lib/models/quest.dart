import 'package:equatable/equatable.dart';

enum QuestMode { practice, realtime, duel, recovery }

class Quest extends Equatable {
  final String id;
  final String title;
  final QuestMode mode;
  final int targetCount;
  final int progressCount;
  final int rewardHarmonyPoints;
  final bool claimed;

  const Quest({
    required this.id,
    required this.title,
    required this.mode,
    required this.targetCount,
    this.progressCount = 0,
    required this.rewardHarmonyPoints,
    this.claimed = false,
  });

  factory Quest.fromJson(Map<String, dynamic> json) {
    return Quest(
      id: json['id'] as String,
      title: json['title'] as String,
      mode: QuestMode.values.byName(json['mode'] as String),
      targetCount: json['targetCount'] as int,
      progressCount: json['progressCount'] as int? ?? 0,
      rewardHarmonyPoints: json['rewardHarmonyPoints'] as int,
      claimed: json['claimed'] as bool? ?? false,
    );
  }

  bool get isComplete => progressCount >= targetCount;

  Quest increment({int amount = 1}) {
    return copyWith(
      progressCount: (progressCount + amount).clamp(0, targetCount),
    );
  }

  Quest copyWith({
    int? progressCount,
    bool? claimed,
  }) {
    return Quest(
      id: id,
      title: title,
      mode: mode,
      targetCount: targetCount,
      progressCount: progressCount ?? this.progressCount,
      rewardHarmonyPoints: rewardHarmonyPoints,
      claimed: claimed ?? this.claimed,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'mode': mode.name,
      'targetCount': targetCount,
      'progressCount': progressCount,
      'rewardHarmonyPoints': rewardHarmonyPoints,
      'claimed': claimed,
    };
  }

  @override
  List<Object?> get props => [
        id,
        title,
        mode,
        targetCount,
        progressCount,
        rewardHarmonyPoints,
        claimed,
      ];
}
