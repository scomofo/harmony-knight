/// Lightweight in-session progress tracker for the game loop.
///
/// Separate from the persistent [PlayerProgress] model in models/.
/// This tracks the in-session score for challenge advancement.
class PlayerProgress {
  int _score = 0;

  int get score => _score;

  void addScore(double quality) {
    _score += (quality * 10).round();
  }

  factory PlayerProgress.initial() => PlayerProgress();
}
