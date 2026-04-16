import 'dart:convert';
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:harmony_knight/models/player_progress.dart';

/// Persistence layer for PlayerProgress and session data.
///
/// Uses JSON file storage as a lightweight alternative to Isar for the MVP.
/// Can be swapped to Isar/ObjectBox later for performance at scale.
/// All reads/writes are async and non-blocking during gameplay.
class PersistenceService {
  static const String _progressFile = 'player_progress.json';
  static const String _sessionHistoryFile = 'session_history.json';
  static const String _heatmapFile = 'engagement_heatmap.json';

  String? _basePath;

  Future<String> get _path async {
    if (_basePath != null) return _basePath!;
    final dir = await getApplicationDocumentsDirectory();
    _basePath = dir.path;
    return _basePath!;
  }

  // ── PlayerProgress Persistence ──

  /// Save player progress to disk.
  Future<void> saveProgress(PlayerProgress progress) async {
    final path = await _path;
    final file = File('$path/$_progressFile');
    final json = _progressToJson(progress);
    await file.writeAsString(jsonEncode(json));
  }

  /// Load player progress from disk. Returns default if none exists.
  Future<PlayerProgress> loadProgress() async {
    try {
      final path = await _path;
      final file = File('$path/$_progressFile');
      if (!await file.exists()) {
        return PlayerProgress(lastActiveAt: DateTime.now());
      }
      final contents = await file.readAsString();
      final json = jsonDecode(contents) as Map<String, dynamic>;
      return _progressFromJson(json);
    } catch (e) {
      return PlayerProgress(lastActiveAt: DateTime.now());
    }
  }

  // ── Session History ──

  /// Record a completed practice session.
  Future<void> recordSession(SessionRecord session) async {
    final history = await loadSessionHistory();
    history.add(session);
    // Keep last 500 sessions.
    if (history.length > 500) {
      history.removeRange(0, history.length - 500);
    }
    final path = await _path;
    final file = File('$path/$_sessionHistoryFile');
    await file.writeAsString(
      jsonEncode(history.map((s) => s.toJson()).toList()),
    );
  }

  /// Load all session history.
  Future<List<SessionRecord>> loadSessionHistory() async {
    try {
      final path = await _path;
      final file = File('$path/$_sessionHistoryFile');
      if (!await file.exists()) return [];
      final contents = await file.readAsString();
      final list = jsonDecode(contents) as List;
      return list
          .map((j) => SessionRecord.fromJson(Map<String, dynamic>.from(j as Map)))
          .toList();
    } catch (e) {
      return [];
    }
  }

  // ── Engagement Heatmap ──

  /// Record an engagement data point for the heatmap.
  Future<void> recordEngagement(EngagementPoint point) async {
    final data = await loadEngagementData();
    data.add(point);
    // Keep last 2000 data points.
    if (data.length > 2000) {
      data.removeRange(0, data.length - 2000);
    }
    final path = await _path;
    final file = File('$path/$_heatmapFile');
    await file.writeAsString(
      jsonEncode(data.map((p) => p.toJson()).toList()),
    );
  }

  /// Load engagement heatmap data.
  Future<List<EngagementPoint>> loadEngagementData() async {
    try {
      final path = await _path;
      final file = File('$path/$_heatmapFile');
      if (!await file.exists()) return [];
      final contents = await file.readAsString();
      final list = jsonDecode(contents) as List;
      return list
          .map((j) => EngagementPoint.fromJson(Map<String, dynamic>.from(j as Map)))
          .toList();
    } catch (e) {
      return [];
    }
  }

  // ── JSON Serialization ──

  Map<String, dynamic> _progressToJson(PlayerProgress p) => {
        'confidence': p.confidence,
        'currentStreak': p.currentStreak,
        'bestStreak': p.bestStreak,
        'totalNotesPlayed': p.totalNotesPlayed,
        'totalCorrectNotes': p.totalCorrectNotes,
        'lastActiveAt': p.lastActiveAt.toIso8601String(),
        'inBrokenBladeRecovery': p.inBrokenBladeRecovery,
        'gradeLevel': p.gradeLevel,
        'duelWins': p.duelWins,
        'harmonyPoints': p.harmonyPoints,
      };

  PlayerProgress _progressFromJson(Map<String, dynamic> j) => PlayerProgress(
        confidence: (j['confidence'] as num?)?.toDouble() ?? 0.0,
        currentStreak: j['currentStreak'] as int? ?? 0,
        bestStreak: j['bestStreak'] as int? ?? 0,
        totalNotesPlayed: j['totalNotesPlayed'] as int? ?? 0,
        totalCorrectNotes: j['totalCorrectNotes'] as int? ?? 0,
        lastActiveAt: DateTime.tryParse(j['lastActiveAt'] as String? ?? '') ??
            DateTime.now(),
        inBrokenBladeRecovery: j['inBrokenBladeRecovery'] as bool? ?? false,
        gradeLevel: j['gradeLevel'] as int? ?? 0,
        duelWins: j['duelWins'] as int? ?? 0,
        harmonyPoints: j['harmonyPoints'] as int? ?? 0,
      );
}

/// A single practice session record.
class SessionRecord {
  final DateTime startedAt;
  final int durationSeconds;
  final int notesPlayed;
  final int correctNotes;
  final int gradeLevel;
  final String exerciseType;
  final double confidenceAtStart;
  final double confidenceAtEnd;

  const SessionRecord({
    required this.startedAt,
    required this.durationSeconds,
    required this.notesPlayed,
    required this.correctNotes,
    required this.gradeLevel,
    required this.exerciseType,
    required this.confidenceAtStart,
    required this.confidenceAtEnd,
  });

  double get accuracy =>
      notesPlayed > 0 ? correctNotes / notesPlayed : 0.0;

  Map<String, dynamic> toJson() => {
        'startedAt': startedAt.toIso8601String(),
        'durationSeconds': durationSeconds,
        'notesPlayed': notesPlayed,
        'correctNotes': correctNotes,
        'gradeLevel': gradeLevel,
        'exerciseType': exerciseType,
        'confidenceAtStart': confidenceAtStart,
        'confidenceAtEnd': confidenceAtEnd,
      };

  factory SessionRecord.fromJson(Map<String, dynamic> j) => SessionRecord(
        startedAt: DateTime.parse(j['startedAt'] as String),
        durationSeconds: j['durationSeconds'] as int,
        notesPlayed: j['notesPlayed'] as int,
        correctNotes: j['correctNotes'] as int,
        gradeLevel: j['gradeLevel'] as int,
        exerciseType: j['exerciseType'] as String,
        confidenceAtStart: (j['confidenceAtStart'] as num).toDouble(),
        confidenceAtEnd: (j['confidenceAtEnd'] as num).toDouble(),
      );
}

/// A single engagement data point for the parent/teacher heatmap.
class EngagementPoint {
  final DateTime timestamp;
  final String topic;
  final double focusDuration; // Seconds of continuous engagement.
  final bool wasOffTask; // True if user went idle for >30s.
  final bool wasHyperfocused; // True if >5 min continuous without break.
  final int errorsInWindow; // Errors in a rolling 2-minute window.

  const EngagementPoint({
    required this.timestamp,
    required this.topic,
    required this.focusDuration,
    this.wasOffTask = false,
    this.wasHyperfocused = false,
    this.errorsInWindow = 0,
  });

  Map<String, dynamic> toJson() => {
        'timestamp': timestamp.toIso8601String(),
        'topic': topic,
        'focusDuration': focusDuration,
        'wasOffTask': wasOffTask,
        'wasHyperfocused': wasHyperfocused,
        'errorsInWindow': errorsInWindow,
      };

  factory EngagementPoint.fromJson(Map<String, dynamic> j) => EngagementPoint(
        timestamp: DateTime.parse(j['timestamp'] as String),
        topic: j['topic'] as String,
        focusDuration: (j['focusDuration'] as num).toDouble(),
        wasOffTask: j['wasOffTask'] as bool? ?? false,
        wasHyperfocused: j['wasHyperfocused'] as bool? ?? false,
        errorsInWindow: j['errorsInWindow'] as int? ?? 0,
      );
}
