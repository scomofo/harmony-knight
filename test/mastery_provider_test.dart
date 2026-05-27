import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:harmony_knight/models/skill_mastery.dart';
import 'package:harmony_knight/providers/mastery_provider.dart';

void main() {
  test('SkillMastery records accuracy and awards scaffolded stars', () {
    const mastery = SkillMastery(topicId: 'note-cde');

    final updated = mastery.recordAttempt(
      correct: true,
      responseMs: 1200,
      confidence: 0.7,
    );

    expect(updated.attempts, 1);
    expect(updated.correct, 1);
    expect(updated.accuracy, 1.0);
    expect(updated.bestConfidence, 0.7);
    expect(updated.stars, 2);
  });

  test('SkillMastery keeps recent attempt window capped', () {
    var mastery = const SkillMastery(topicId: 'note-cde');
    for (int i = 0; i < 12; i++) {
      mastery = mastery.recordAttempt(
        correct: i.isEven,
        responseMs: 1000,
        confidence: 0.5,
      );
    }

    expect(mastery.recentCorrect.length, 10);
    expect(mastery.attempts, 12);
  });

  test('MasteryNotifier records attempts by topic', () {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    container.read(masteryProvider.notifier).recordAttempt(
          topicId: 'note-cde',
          correct: true,
          responseMs: 900,
          confidence: 0.6,
        );

    final mastery = container.read(masteryProvider)['note-cde'];
    expect(mastery, isNotNull);
    expect(mastery!.attempts, 1);
  });
}
