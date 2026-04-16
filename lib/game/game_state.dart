import 'package:flutter/foundation.dart';
import 'package:harmony_knight/engine/duel_engine.dart';
import 'package:harmony_knight/game/challenge.dart';
import 'package:harmony_knight/game/evaluation_engine.dart';
import 'package:harmony_knight/game/player_progress_session.dart';
import 'package:harmony_knight/game/sentinel.dart';
import 'package:harmony_knight/game/session_stats.dart';
import 'package:harmony_knight/models/note.dart';

export 'package:harmony_knight/game/player_progress_session.dart';

/// Central game state that wires input -> evaluation -> feedback -> progression.
class GameState extends ChangeNotifier {
  final DuelEngine duel;
  final EvaluationEngine evaluator;
  final Sentinel sentinel;
  final SessionStats stats = SessionStats();

  late Challenge currentChallenge;
  final PlayerProgress progress = PlayerProgress.initial();

  /// Primary feedback line (context-aware musical coaching).
  String lastFeedback = '';

  /// Secondary coaching hint (what to try next).
  String lastHint = '';

  /// The most recent harmony meter value (0.0 to 1.0).
  double harmonyValue = 0.0;

  /// The most recent evaluation result (for UI rendering).
  EvaluationResult? lastResult;

  GameState({
    required this.duel,
    required this.evaluator,
    required this.sentinel,
  }) {
    currentChallenge = sentinel.next(progress);
  }

  void onPlayerAction(Note note) {
    final result = evaluator.evaluate(note, currentChallenge.context);
    lastResult = result;

    // Update harmony meter.
    if (result.correct) {
      harmonyValue = (harmonyValue + result.quality * 0.1).clamp(0.0, 1.0);
    } else {
      harmonyValue = (harmonyValue - 0.05).clamp(0.0, 1.0);
    }

    // Track per-challenge accuracy for adaptive selection.
    final challengeIdx = sentinel.lastChallengeIndex ?? 0;
    if (result.correct) {
      progress.recordHit(challengeIdx);
    } else {
      progress.recordMiss(challengeIdx);
    }

    progress.addScore(result.quality);
    stats.record(result.correct);

    // Build context-aware feedback.
    final fb = _buildFeedback(result);
    lastFeedback = fb.$1;
    lastHint = fb.$2;

    if (result.quality >= 0.7) {
      currentChallenge = sentinel.next(progress);
    }

    notifyListeners();
  }

  /// Returns (feedback, hint) using musical context from the evaluation.
  (String, String) _buildFeedback(EvaluationResult result) {
    if (!result.correct) {
      return _buildMissFeedback(result);
    }

    switch (result.role) {
      case NoteRole.root:
        return (
          '${result.playedNoteName} is the root of ${result.chordName} \u2014 very stable',
          progress.streak >= 3
              ? 'You\'re on a roll \u2014 ${progress.streak} in a row'
              : 'Roots anchor the harmony',
        );
      case NoteRole.fifth:
        return (
          '${result.playedNoteName} is the 5th of ${result.chordName} \u2014 strong',
          'Try the root (${result.rootName}) for maximum stability',
        );
      case NoteRole.third:
        return (
          '${result.playedNoteName} is the 3rd of ${result.chordName} \u2014 good color',
          'The 3rd defines major vs. minor character',
        );
      case NoteRole.nonChord:
        // Shouldn't reach here if correct, but handle gracefully.
        return ('That works', '');
    }
  }

  (String, String) _buildMissFeedback(EvaluationResult result) {
    final interval = result.intervalFromRoot;
    final played = result.playedNoteName;
    final chord = result.chordName;
    final root = result.rootName;

    // Contextual coaching based on what they actually played.
    if (interval == 1 || interval == 11) {
      // Half step away from root — very close.
      return (
        '$played is a half step from $root \u2014 close but tense',
        'Slide ${interval == 1 ? "down" : "up"} one key to $root',
      );
    }

    if (interval == 6) {
      // Tritone — maximum tension.
      return (
        '$played creates a tritone against $root \u2014 maximum tension',
        'Try a chord tone from $chord instead',
      );
    }

    if (interval == 2 || interval == 10) {
      // Whole step — passing tone territory.
      return (
        '$played is a step away \u2014 sounds like a passing tone',
        'Move to $root to resolve the tension',
      );
    }

    if (interval == 5) {
      // Perfect 4th — ambiguous, not dissonant but not in chord.
      return (
        '$played is a 4th above $root \u2014 not wrong, but not in the chord',
        'The chord tones of $chord will sound more grounded',
      );
    }

    // General miss.
    return (
      '$played doesn\'t belong to $chord',
      'The chord tones are ${_chordToneNames(result)}',
    );
  }

  String _chordToneNames(EvaluationResult result) {
    const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    // Get the target pitch classes from the current challenge.
    return currentChallenge.context.targetPitchClasses
        .map((pc) => names[pc])
        .join(', ');
  }
}
