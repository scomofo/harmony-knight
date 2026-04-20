/// Tracks per-session accuracy statistics.
class SessionStats {
  int total = 0;
  int correct = 0;

  void record(bool isCorrect) {
    total++;
    if (isCorrect) correct++;
  }

  double accuracy() => total == 0 ? 0 : correct / total;
}
