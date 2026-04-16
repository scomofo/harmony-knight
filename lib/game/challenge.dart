import 'package:harmony_knight/game/question_type.dart';

export 'package:harmony_knight/game/question_type.dart';

/// The musical context the user should understand before answering.
class MusicalContext {
  /// Key name (e.g. "C Major").
  final String key;

  /// Current chord name (e.g. "C major").
  final String chordName;

  /// Notes that count as "correct" for this challenge (pitch classes 0-11).
  final List<int> targetPitchClasses;

  /// The root note of the current chord (pitch class 0-11).
  final int rootPitchClass;

  /// Scale degrees present in this key (for display, e.g. "C D E F G A B").
  final String scaleNotes;

  /// All pitch classes in the scale (for scaleTone validation).
  final List<int> scalePitchClasses;

  const MusicalContext({
    required this.key,
    required this.chordName,
    required this.targetPitchClasses,
    required this.rootPitchClass,
    required this.scaleNotes,
    required this.scalePitchClasses,
  });
}

/// A single theory challenge: context + question + validation.
///
/// The user should:
///   1. Read the context (key, chord)
///   2. Understand the question
///   3. Make a decision
///   4. Learn from the explanation
class Challenge {
  /// The musical context shown before the question.
  final MusicalContext context;

  /// The type of theory question being asked.
  final QuestionType type;

  /// The question the user must answer.
  final String question;

  /// Optional guidance (shown below the question).
  final String hint;

  const Challenge({
    required this.context,
    required this.type,
    required this.question,
    this.hint = '',
  });
}
