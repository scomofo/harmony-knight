/// Grade advancement thresholds and Broken Blade constants.
///
/// Solo decision (2026-05-29): thresholds are accuracy-based per session,
/// requiring a minimum number of attempts to prevent trivial advancement.
library;

const int kBrokenBladeMissionLength = 5;

class GradeThreshold {
  /// Minimum notes attempted this session before advancement is evaluated.
  final int minSessionAttempts;

  /// Minimum session accuracy (correct / total) to advance.
  final double minSessionAccuracy;

  const GradeThreshold({
    required this.minSessionAttempts,
    required this.minSessionAccuracy,
  });
}

/// Advancement thresholds keyed by current grade level.
/// Grade 8 has no threshold — it is the ceiling.
const Map<int, GradeThreshold> kGradeThresholds = {
  0: GradeThreshold(minSessionAttempts: 10, minSessionAccuracy: 0.80),
  1: GradeThreshold(minSessionAttempts: 20, minSessionAccuracy: 0.85),
  2: GradeThreshold(minSessionAttempts: 20, minSessionAccuracy: 0.85),
  3: GradeThreshold(minSessionAttempts: 20, minSessionAccuracy: 0.85),
  4: GradeThreshold(minSessionAttempts: 20, minSessionAccuracy: 0.85),
  5: GradeThreshold(minSessionAttempts: 30, minSessionAccuracy: 0.90),
  6: GradeThreshold(minSessionAttempts: 30, minSessionAccuracy: 0.90),
  7: GradeThreshold(minSessionAttempts: 30, minSessionAccuracy: 0.90),
};
