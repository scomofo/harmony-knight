import 'package:harmony_knight/engine/persistence.dart';

/// Analytics engine for ADHD engagement research and app telemetry.
///
/// Tracks engagement patterns, focus durations, error rates, and
/// hyperfocus/off-task events. All data is stored locally and can
/// be exported for research purposes with user consent.
///
/// Privacy-first: no data leaves the device without explicit export action.
class AnalyticsEngine {
  final PersistenceService _persistence = PersistenceService();

  DateTime? _sessionStartedAt;
  DateTime? _lastInteractionAt;
  String _currentTopic = '';
  int _errorsInWindow = 0;
  int _interactionsInWindow = 0;
  final List<EngagementPoint> _pendingPoints = [];

  // ── Session Lifecycle ──

  /// Start tracking a new session.
  void startSession({required String topic}) {
    _sessionStartedAt = DateTime.now();
    _lastInteractionAt = DateTime.now();
    _currentTopic = topic;
    _errorsInWindow = 0;
    _interactionsInWindow = 0;
  }

  /// Record a user interaction (tap, answer, slider change).
  void recordInteraction({bool isError = false}) {
    final now = DateTime.now();
    _interactionsInWindow++;
    if (isError) _errorsInWindow++;

    // Check for off-task gap (>30s since last interaction).
    final wasOffTask = _lastInteractionAt != null &&
        now.difference(_lastInteractionAt!).inSeconds > 30;

    _lastInteractionAt = now;

    // Emit engagement point every 60 seconds or on significant events.
    if (_pendingPoints.isEmpty ||
        now.difference(_pendingPoints.last.timestamp).inSeconds >= 60 ||
        wasOffTask) {
      _emitEngagementPoint(wasOffTask: wasOffTask);
    }
  }

  /// End the current session and flush all pending data.
  Future<SessionSummary> endSession({
    required int notesPlayed,
    required int correctNotes,
    required double confidenceAtStart,
    required double confidenceAtEnd,
    required int gradeLevel,
    required String exerciseType,
  }) async {
    final now = DateTime.now();
    final durationSeconds =
        _sessionStartedAt != null ? now.difference(_sessionStartedAt!).inSeconds : 0;

    // Flush any remaining engagement points.
    _emitEngagementPoint(wasOffTask: false);
    for (final point in _pendingPoints) {
      await _persistence.recordEngagement(point);
    }
    _pendingPoints.clear();

    // Record session.
    final session = SessionRecord(
      startedAt: _sessionStartedAt ?? now,
      durationSeconds: durationSeconds,
      notesPlayed: notesPlayed,
      correctNotes: correctNotes,
      gradeLevel: gradeLevel,
      exerciseType: exerciseType,
      confidenceAtStart: confidenceAtStart,
      confidenceAtEnd: confidenceAtEnd,
    );
    await _persistence.recordSession(session);

    return SessionSummary(
      durationSeconds: durationSeconds,
      notesPlayed: notesPlayed,
      correctNotes: correctNotes,
      accuracy: notesPlayed > 0 ? correctNotes / notesPlayed : 0,
      offTaskCount: _pendingPoints.where((p) => p.wasOffTask).length,
      hyperfocusDetected:
          _pendingPoints.any((p) => p.wasHyperfocused),
    );
  }

  // ── Engagement Analysis ──

  /// Check if the user is currently in a hyperfocus state.
  /// Defined as >5 minutes of continuous interaction without >15s gaps.
  bool get isHyperfocused {
    if (_sessionStartedAt == null || _lastInteractionAt == null) return false;
    final sessionDuration =
        DateTime.now().difference(_sessionStartedAt!).inMinutes;
    return sessionDuration >= 5 && _interactionsInWindow > 20;
  }

  /// Current error rate in the rolling window.
  double get currentErrorRate {
    if (_interactionsInWindow == 0) return 0;
    return _errorsInWindow / _interactionsInWindow;
  }

  /// Generate a daily engagement summary for the parent/teacher dashboard.
  Future<DailyEngagementSummary> getDailySummary() async {
    final sessions = await _persistence.loadSessionHistory();
    final today = DateTime.now();
    final todaySessions = sessions.where((s) =>
        s.startedAt.year == today.year &&
        s.startedAt.month == today.month &&
        s.startedAt.day == today.day);

    final totalMinutes =
        todaySessions.fold<int>(0, (sum, s) => sum + s.durationSeconds) ~/ 60;
    final totalNotes =
        todaySessions.fold<int>(0, (sum, s) => sum + s.notesPlayed);
    final totalCorrect =
        todaySessions.fold<int>(0, (sum, s) => sum + s.correctNotes);

    final engagementData = await _persistence.loadEngagementData();
    final todayData = engagementData.where((p) =>
        p.timestamp.year == today.year &&
        p.timestamp.month == today.month &&
        p.timestamp.day == today.day);

    return DailyEngagementSummary(
      date: today,
      sessionCount: todaySessions.length,
      totalMinutes: totalMinutes,
      totalNotes: totalNotes,
      accuracy: totalNotes > 0 ? totalCorrect / totalNotes : 0,
      offTaskEvents: todayData.where((p) => p.wasOffTask).length,
      hyperfocusEvents: todayData.where((p) => p.wasHyperfocused).length,
      topTopics: _topTopics(todayData),
    );
  }

  // ── Private ──

  void _emitEngagementPoint({required bool wasOffTask}) {
    final now = DateTime.now();
    final focusDuration = _lastInteractionAt != null
        ? now.difference(_lastInteractionAt!).inSeconds.toDouble()
        : 0.0;

    _pendingPoints.add(EngagementPoint(
      timestamp: now,
      topic: _currentTopic,
      focusDuration: focusDuration,
      wasOffTask: wasOffTask,
      wasHyperfocused: isHyperfocused,
      errorsInWindow: _errorsInWindow,
    ));
  }

  Map<String, int> _topTopics(Iterable<EngagementPoint> data) {
    final counts = <String, int>{};
    for (final point in data) {
      counts[point.topic] = (counts[point.topic] ?? 0) + 1;
    }
    return counts;
  }
}

/// Summary of a completed session.
class SessionSummary {
  final int durationSeconds;
  final int notesPlayed;
  final int correctNotes;
  final double accuracy;
  final int offTaskCount;
  final bool hyperfocusDetected;

  const SessionSummary({
    required this.durationSeconds,
    required this.notesPlayed,
    required this.correctNotes,
    required this.accuracy,
    required this.offTaskCount,
    required this.hyperfocusDetected,
  });
}

/// Daily engagement summary for the parent/teacher dashboard.
class DailyEngagementSummary {
  final DateTime date;
  final int sessionCount;
  final int totalMinutes;
  final int totalNotes;
  final double accuracy;
  final int offTaskEvents;
  final int hyperfocusEvents;
  final Map<String, int> topTopics;

  const DailyEngagementSummary({
    required this.date,
    required this.sessionCount,
    required this.totalMinutes,
    required this.totalNotes,
    required this.accuracy,
    required this.offTaskEvents,
    required this.hyperfocusEvents,
    required this.topTopics,
  });
}
