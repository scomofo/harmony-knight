import 'package:harmony_knight/game/curriculum_node.dart';

/// Lightweight in-session progress tracker for the game loop.
///
/// Tracks score, streaks, per-challenge accuracy, and curriculum position.
class PlayerProgress {
  int _score = 0;
  int _nodeScore = 0;
  int _consecutiveCorrect = 0;
  int _consecutiveWrong = 0;
  int _currentNodeIndex = 0;

  /// Per-challenge accuracy: maps challenge index -> (correct, total).
  final Map<int, _Tally> _challengeHistory = {};

  int get score => _score;
  int get nodeScore => _nodeScore;
  int get streak => _consecutiveCorrect;
  int get missStreak => _consecutiveWrong;
  int get currentNodeIndex => _currentNodeIndex;

  void addScore(double quality) {
    final points = (quality * 10).round();
    _score += points;
    _nodeScore += points;
  }

  void recordHit(int challengeIndex) {
    _consecutiveCorrect++;
    _consecutiveWrong = 0;
    _challengeHistory.putIfAbsent(challengeIndex, () => _Tally()).hit();
  }

  void recordMiss(int challengeIndex) {
    _consecutiveWrong++;
    _consecutiveCorrect = 0;
    _challengeHistory.putIfAbsent(challengeIndex, () => _Tally()).miss();
  }

  /// Advance to the next curriculum node. Resets node score.
  void advanceNode(List<CurriculumNode> curriculum) {
    if (_currentNodeIndex < curriculum.length - 1) {
      _currentNodeIndex++;
      _nodeScore = 0;
    }
  }

  /// Accuracy for a specific challenge (0.0-1.0), or null if never attempted.
  double? accuracyFor(int challengeIndex) {
    final t = _challengeHistory[challengeIndex];
    if (t == null || t.total == 0) return null;
    return t.correct / t.total;
  }

  /// Number of times a challenge has been attempted.
  int attemptsFor(int challengeIndex) {
    return _challengeHistory[challengeIndex]?.total ?? 0;
  }

  factory PlayerProgress.initial() => PlayerProgress();
}

class _Tally {
  int correct = 0;
  int total = 0;

  void hit() { correct++; total++; }
  void miss() { total++; }
}
