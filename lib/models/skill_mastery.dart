import 'package:equatable/equatable.dart';

class SkillMastery extends Equatable {
  final String topicId;
  final int attempts;
  final int correct;
  final int totalResponseMs;
  final double bestConfidence;
  final List<bool> recentCorrect;

  const SkillMastery({
    required this.topicId,
    this.attempts = 0,
    this.correct = 0,
    this.totalResponseMs = 0,
    this.bestConfidence = 0,
    this.recentCorrect = const [],
  });

  factory SkillMastery.fromJson(Map<String, dynamic> json) {
    return SkillMastery(
      topicId: json['topicId'] as String,
      attempts: json['attempts'] as int? ?? 0,
      correct: json['correct'] as int? ?? 0,
      totalResponseMs: json['totalResponseMs'] as int? ?? 0,
      bestConfidence: (json['bestConfidence'] as num?)?.toDouble() ?? 0,
      recentCorrect: (json['recentCorrect'] as List<dynamic>? ?? const [])
          .map((value) => value as bool)
          .toList(growable: false),
    );
  }

  double get accuracy => attempts == 0 ? 0 : correct / attempts;

  double get recentAccuracy {
    if (recentCorrect.isEmpty) return 0;
    final count = recentCorrect.where((value) => value).length;
    return count / recentCorrect.length;
  }

  int get averageResponseMs =>
      attempts == 0 ? 0 : (totalResponseMs / attempts).round();

  int get stars {
    if (recentAccuracy >= 0.8 && bestConfidence >= 0.8) return 3;
    if (recentAccuracy >= 0.8 && bestConfidence >= 0.6) return 2;
    if (recentAccuracy >= 0.8) return 1;
    return 0;
  }

  SkillMastery recordAttempt({
    required bool correct,
    required int responseMs,
    required double confidence,
  }) {
    final nextRecent = [...recentCorrect, correct];
    final cappedRecent = nextRecent.length > 10
        ? nextRecent.sublist(nextRecent.length - 10)
        : nextRecent;

    return copyWith(
      attempts: attempts + 1,
      correct: this.correct + (correct ? 1 : 0),
      totalResponseMs: totalResponseMs + responseMs,
      bestConfidence: confidence > bestConfidence ? confidence : bestConfidence,
      recentCorrect: cappedRecent,
    );
  }

  SkillMastery copyWith({
    int? attempts,
    int? correct,
    int? totalResponseMs,
    double? bestConfidence,
    List<bool>? recentCorrect,
  }) {
    return SkillMastery(
      topicId: topicId,
      attempts: attempts ?? this.attempts,
      correct: correct ?? this.correct,
      totalResponseMs: totalResponseMs ?? this.totalResponseMs,
      bestConfidence: bestConfidence ?? this.bestConfidence,
      recentCorrect: recentCorrect ?? this.recentCorrect,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'topicId': topicId,
      'attempts': attempts,
      'correct': correct,
      'totalResponseMs': totalResponseMs,
      'bestConfidence': bestConfidence,
      'recentCorrect': recentCorrect,
    };
  }

  @override
  List<Object?> get props => [
        topicId,
        attempts,
        correct,
        totalResponseMs,
        bestConfidence,
        recentCorrect,
      ];
}
