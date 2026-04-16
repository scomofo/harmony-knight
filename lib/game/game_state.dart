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

  String lastFeedback = '';

  /// The most recent harmony meter value (0.0 to 1.0).
  double harmonyValue = 0.0;

  GameState({
    required this.duel,
    required this.evaluator,
    required this.sentinel,
  }) {
    currentChallenge = sentinel.next(progress);
  }

  void onPlayerAction(Note note) {
    final result = evaluator.evaluate(note, currentChallenge.context);

    // Update harmony meter.
    if (result.correct) {
      harmonyValue = (harmonyValue + result.quality * 0.1).clamp(0.0, 1.0);
    } else {
      harmonyValue = (harmonyValue - 0.05).clamp(0.0, 1.0);
    }

    progress.addScore(result.quality);
    stats.record(result.correct);

    lastFeedback = _buildFeedback(result);

    if (result.quality >= 0.7) {
      currentChallenge = sentinel.next(progress);
    }

    notifyListeners();
  }

  String _buildFeedback(EvaluationResult result) {
    if (!result.correct) {
      return 'That clashes \u2014 try a chord tone';
    }

    if (result.quality >= 1.0) {
      return 'Strong choice \u2014 very stable';
    }

    if (result.quality >= 0.7) {
      return 'Good \u2014 try resolving to the root';
    }

    return "That works, but isn't stable yet";
  }
}
