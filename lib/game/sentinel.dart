import 'package:harmony_knight/game/challenge.dart';
import 'package:harmony_knight/game/player_progress_session.dart';

/// The Discord Sentinel — selects the next challenge based on player progress.
///
/// Currently cycles through a fixed set of foundational challenges.
/// Future: adaptive progression based on PlayerProgress patterns.
class Sentinel {
  static const _challenges = [
    Challenge(
      prompt: 'Play a note from the C major chord (C, E, or G)',
      context: ChallengeContext(
        targetPitchClasses: [0, 4, 7], // C, E, G
        rootPitchClass: 0,
      ),
    ),
    Challenge(
      prompt: 'Play a note from the G major chord (G, B, or D)',
      context: ChallengeContext(
        targetPitchClasses: [7, 11, 2], // G, B, D
        rootPitchClass: 7,
      ),
    ),
    Challenge(
      prompt: 'Play a note from the F major chord (F, A, or C)',
      context: ChallengeContext(
        targetPitchClasses: [5, 9, 0], // F, A, C
        rootPitchClass: 5,
      ),
    ),
    Challenge(
      prompt: 'Play a note from the A minor chord (A, C, or E)',
      context: ChallengeContext(
        targetPitchClasses: [9, 0, 4], // A, C, E
        rootPitchClass: 9,
      ),
    ),
    Challenge(
      prompt: 'Play a note from the D minor chord (D, F, or A)',
      context: ChallengeContext(
        targetPitchClasses: [2, 5, 9], // D, F, A
        rootPitchClass: 2,
      ),
    ),
  ];

  int _index = 0;

  /// Select the next challenge based on progress.
  Challenge next(PlayerProgress progress) {
    final challenge = _challenges[_index % _challenges.length];
    _index++;
    return challenge;
  }
}
