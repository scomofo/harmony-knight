import 'package:harmony_knight/models/note.dart';
import 'package:harmony_knight/game/challenge.dart';

/// Result of evaluating a player's note against a challenge.
class EvaluationResult {
  /// Whether the note is harmonically acceptable.
  final bool correct;

  /// Quality score from 0.0 (barely acceptable) to 1.0 (ideal).
  final double quality;

  const EvaluationResult({
    required this.correct,
    required this.quality,
  });
}

/// Evaluates player input against the current challenge context.
class EvaluationEngine {
  /// Evaluate a note against the challenge context.
  ///
  /// A note is "correct" if its pitch class is in the target list.
  /// Quality is higher for the root, lower for other chord tones.
  EvaluationResult evaluate(Note note, ChallengeContext context) {
    final pc = note.midi % 12;
    final isTarget = context.targetPitchClasses.contains(pc);

    if (!isTarget) {
      return const EvaluationResult(correct: false, quality: 0.0);
    }

    // Root = highest quality, other chord tones = good.
    if (pc == context.rootPitchClass) {
      return const EvaluationResult(correct: true, quality: 1.0);
    }

    return const EvaluationResult(correct: true, quality: 0.7);
  }
}
