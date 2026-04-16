import 'package:harmony_knight/models/note.dart';

/// Context for evaluating a player's note against the current challenge.
class ChallengeContext {
  /// Notes that count as "correct" for this challenge (pitch classes).
  final List<int> targetPitchClasses;

  /// The root note of the current chord/key context.
  final int rootPitchClass;

  const ChallengeContext({
    required this.targetPitchClasses,
    required this.rootPitchClass,
  });
}

/// A single challenge presented to the player.
class Challenge {
  /// The text prompt shown to the player.
  final String prompt;

  /// Evaluation context for this challenge.
  final ChallengeContext context;

  const Challenge({
    required this.prompt,
    required this.context,
  });
}
