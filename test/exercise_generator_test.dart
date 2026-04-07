import 'package:flutter_test/flutter_test.dart';
import 'package:harmony_knight/engine/exercise_generator.dart';

void main() {
  final generator = ExerciseGenerator();

  group('ExerciseGenerator', () {
    test('generates exercises for all 11 levels', () {
      for (int level = 0; level <= 10; level++) {
        final exercise = generator.generate(level: level);
        expect(exercise.level, level);
        expect(exercise.prompt, isNotEmpty);
        expect(exercise.correctAnswer, isNotEmpty);
      }
    });

    test('level 0 generates sensory exercises', () {
      final exercise = generator.generate(level: 0);
      expect(
        [
          ExerciseType.pitchDiscrimination,
          ExerciseType.timbreRecognition,
          ExerciseType.dynamicsAwareness,
        ],
        contains(exercise.type),
      );
    });

    test('level 1 generates note identification', () {
      final exercise = generator.generate(level: 1);
      expect(exercise.type, ExerciseType.noteIdentification);
      expect(exercise.options.length, 4);
      expect(exercise.options, contains(exercise.correctAnswer));
    });

    test('level 2 generates rhythm exercises', () {
      final exercise = generator.generate(level: 2);
      expect(exercise.type, ExerciseType.rhythmIdentification);
    });

    test('level 4 generates interval or triad exercises', () {
      // Run multiple times to hit both paths.
      final types = <ExerciseType>{};
      for (int i = 0; i < 20; i++) {
        final exercise = generator.generate(level: 4);
        types.add(exercise.type);
      }
      expect(types, containsAll([
        ExerciseType.intervalIdentification,
        ExerciseType.triadIdentification,
      ]));
    });

    test('level 5 generates cadence exercises', () {
      final exercise = generator.generate(level: 5);
      expect(exercise.type, ExerciseType.cadenceIdentification);
    });

    test('level 9 redirects to counterpoint duel', () {
      final exercise = generator.generate(level: 9);
      expect(exercise.type, ExerciseType.counterpointDuel);
      expect(exercise.metadata?['redirectToDuel'], true);
    });

    test('correct answer is always in options (when options exist)', () {
      for (int level = 0; level <= 8; level++) {
        for (int i = 0; i < 5; i++) {
          final exercise = generator.generate(level: level);
          if (exercise.options.isNotEmpty) {
            expect(
              exercise.options,
              contains(exercise.correctAnswer),
              reason: 'Level $level exercise missing correct answer in options',
            );
          }
        }
      }
    });
  });
}
