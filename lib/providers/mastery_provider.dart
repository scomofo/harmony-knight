import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:harmony_knight/models/skill_mastery.dart';

class MasteryNotifier extends StateNotifier<Map<String, SkillMastery>> {
  MasteryNotifier() : super(const {});

  void recordAttempt({
    required String topicId,
    required bool correct,
    required int responseMs,
    required double confidence,
  }) {
    final current = state[topicId] ?? SkillMastery(topicId: topicId);
    state = {
      ...state,
      topicId: current.recordAttempt(
        correct: correct,
        responseMs: responseMs,
        confidence: confidence,
      ),
    };
  }

  SkillMastery? masteryFor(String topicId) => state[topicId];
}

final masteryProvider =
    StateNotifierProvider<MasteryNotifier, Map<String, SkillMastery>>(
  (ref) => MasteryNotifier(),
);
