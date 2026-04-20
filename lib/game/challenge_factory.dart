import 'package:harmony_knight/game/challenge.dart';
import 'package:harmony_knight/game/question_type.dart';

/// Generates theory challenges from a musical context and question type.
class ChallengeFactory {
  static Challenge chordTone(MusicalContext ctx) {
    return Challenge(
      context: ctx,
      type: QuestionType.chordTone,
      question: 'Which note is stable over the ${ctx.chordName} chord?',
      hint: 'Try the root, 3rd, or 5th',
    );
  }

  static Challenge scaleTone(MusicalContext ctx) {
    return Challenge(
      context: ctx,
      type: QuestionType.scaleTone,
      question: 'Which note belongs to the key of ${ctx.key}?',
      hint: 'Stay inside the scale: ${ctx.scaleNotes}',
    );
  }

  static Challenge resolution(MusicalContext ctx) {
    const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    final rootName = names[ctx.rootPitchClass];
    return Challenge(
      context: ctx,
      type: QuestionType.resolution,
      question: 'Which note resolves the tension over ${ctx.chordName}?',
      hint: 'Tension wants to resolve to $rootName',
    );
  }

  static Challenge interval(MusicalContext ctx) {
    return Challenge(
      context: ctx,
      type: QuestionType.interval,
      question: 'Choose the 5th of the ${ctx.chordName} chord',
      hint: 'Count 7 semitones up from the root',
    );
  }

  /// Build a challenge for the given type and context.
  static Challenge build(QuestionType type, MusicalContext ctx) {
    switch (type) {
      case QuestionType.chordTone:
        return chordTone(ctx);
      case QuestionType.scaleTone:
        return scaleTone(ctx);
      case QuestionType.resolution:
        return resolution(ctx);
      case QuestionType.interval:
        return interval(ctx);
    }
  }
}
