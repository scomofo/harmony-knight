import 'dart:math';
import 'package:harmony_knight/game/challenge.dart';
import 'package:harmony_knight/game/player_progress_session.dart';

/// The Discord Sentinel — adaptive challenge selection.
///
/// Selection strategy:
///   1. If the player is on a miss streak (3+), repeat last failed challenge.
///   2. If on a hot streak (5+), introduce the least-attempted challenge.
///   3. Otherwise, pick the challenge with the lowest accuracy,
///      weighted toward ones with fewer attempts (explore vs. exploit).
///   4. Never repeat the same challenge twice in a row (unless forced by rule 1).
class Sentinel {
  static const challenges = [
    Challenge(
      prompt: 'Play a note from the C major chord (C, E, or G)',
      context: ChallengeContext(
        targetPitchClasses: [0, 4, 7], // C, E, G
        rootPitchClass: 0,
        chordName: 'C major',
      ),
    ),
    Challenge(
      prompt: 'Play a note from the G major chord (G, B, or D)',
      context: ChallengeContext(
        targetPitchClasses: [7, 11, 2], // G, B, D
        rootPitchClass: 7,
        chordName: 'G major',
      ),
    ),
    Challenge(
      prompt: 'Play a note from the F major chord (F, A, or C)',
      context: ChallengeContext(
        targetPitchClasses: [5, 9, 0], // F, A, C
        rootPitchClass: 5,
        chordName: 'F major',
      ),
    ),
    Challenge(
      prompt: 'Play a note from the A minor chord (A, C, or E)',
      context: ChallengeContext(
        targetPitchClasses: [9, 0, 4], // A, C, E
        rootPitchClass: 9,
        chordName: 'A minor',
      ),
    ),
    Challenge(
      prompt: 'Play a note from the D minor chord (D, F, or A)',
      context: ChallengeContext(
        targetPitchClasses: [2, 5, 9], // D, F, A
        rootPitchClass: 2,
        chordName: 'D minor',
      ),
    ),
    Challenge(
      prompt: 'Play a note from the E minor chord (E, G, or B)',
      context: ChallengeContext(
        targetPitchClasses: [4, 7, 11], // E, G, B
        rootPitchClass: 4,
        chordName: 'E minor',
      ),
    ),
  ];

  final Random _rng = Random();
  int? _lastIndex;

  /// Select the next challenge based on player patterns.
  Challenge next(PlayerProgress progress) {
    final picked = _select(progress);
    _lastIndex = picked;
    return challenges[picked];
  }

  /// Returns the index of the challenge that was just served.
  int? get lastChallengeIndex => _lastIndex;

  int _select(PlayerProgress progress) {
    // Rule 1: struggling — repeat what they failed (unless it's the same).
    if (progress.missStreak >= 3 && _lastIndex != null) {
      return _lastIndex!;
    }

    // Rule 2: hot streak — introduce something unexplored.
    if (progress.streak >= 5) {
      return _leastAttempted(progress);
    }

    // Rule 3: pick weakest challenge, weighted by exposure.
    return _weakest(progress);
  }

  /// Challenge with fewest total attempts (excluding last to avoid repeats).
  int _leastAttempted(PlayerProgress progress) {
    int bestIdx = 0;
    int bestAttempts = 999999;

    for (int i = 0; i < challenges.length; i++) {
      if (i == _lastIndex) continue;
      final attempts = progress.attemptsFor(i);
      if (attempts < bestAttempts) {
        bestAttempts = attempts;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  /// Challenge with lowest accuracy. Ties broken by fewer attempts.
  /// Unattempted challenges get a synthetic low accuracy to encourage exploration.
  int _weakest(PlayerProgress progress) {
    int bestIdx = -1;
    double bestScore = double.infinity;

    for (int i = 0; i < challenges.length; i++) {
      if (i == _lastIndex) continue;

      final acc = progress.accuracyFor(i);
      final attempts = progress.attemptsFor(i);

      // Unattempted = accuracy 0.0, attempted = real accuracy.
      // Subtract a small exploration bonus for low-attempt challenges.
      final score = (acc ?? 0.0) - (0.1 / (attempts + 1));

      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    // Fallback if everything was skipped (only one challenge).
    if (bestIdx < 0) bestIdx = _rng.nextInt(challenges.length);

    return bestIdx;
  }
}
