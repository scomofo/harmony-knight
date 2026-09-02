import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:harmony_knight/engine/spaced_repetition.dart';
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
  static const String _srItemsFile = 'sr_items.json';
  static const int _srItemsCap = 200;

  String? _basePath;

  Future<String> get _path async {
    if (_basePath != null) return _basePath!;
    final dir = await getApplicationDocumentsDirectory();
    _basePath = dir.path;
    return _basePath!;
  }

  // Serializes writes per destination path so overlapping saves (e.g. the
  // fire-and-forget calls from SRItemsNotifier.updateItem and the session
  // recorders) can't race: without this, two writers could both open the
  // same temp path, and whichever renamed first would remove the temp file
  // out from under the other before it could rename its own write. Shared
  // across every PersistenceService instance — since separate instances
  // are created throughout the app (e.g. one per StateNotifier), the file
  // on disk, not the instance, is the resource that actually needs
  // serializing.
  static final Map<String, Future<void>> _writeQueues = {};
  static int _tempFileSeq = 0;

  /// Writes [contents] to [file] atomically: the full contents are written
  /// to a sibling temp file first, then renamed over the destination. This
  /// means a crash or kill mid-write can never leave a half-written (and
  /// therefore unparseable) JSON file on disk — the reader always sees
  /// either the old contents or the fully-written new contents.
  Future<void> _writeAtomic(File file, String contents) async {
    final path = file.path;
    final previous = _writeQueues[path];
    final done = Completer<void>();
    _writeQueues[path] = done.future;

    if (previous != null) {
      try {
        await previous;
      } catch (_) {
        // A prior write's failure must not block this one.
      }
    }

    try {
      // A unique-per-write temp filename means even a bug elsewhere that
      // bypasses this queue can't collide with the file currently in use.
      final tempFile = File('$path.${_tempFileSeq++}.tmp');
      await tempFile.writeAsString(contents, flush: true);
      await tempFile.rename(path);
    } finally {
      done.complete();
    }
  }

  // ── PlayerProgress Persistence ──

  /// Save player progress to disk.
  Future<void> saveProgress(PlayerProgress progress) async {
    final path = await _path;
    final file = File('$path/$_progressFile');
    final json = _progressToJson(progress);
    await _writeAtomic(file, jsonEncode(json));
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
    await _writeAtomic(
      file,
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
    await _writeAtomic(
      file,
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

  // ── Spaced Repetition Items ──

  Future<void> saveSRItems(List<SRItem> items) async {
    final capped = items.length > _srItemsCap
        ? items.sublist(items.length - _srItemsCap)
        : items;
    final path = await _path;
    final file = File('$path/$_srItemsFile');
    await _writeAtomic(file, jsonEncode(capped.map(_srItemToJson).toList()));
  }

  Future<List<SRItem>> loadSRItems() async {
    try {
      final path = await _path;
      final file = File('$path/$_srItemsFile');
      if (!await file.exists()) return [];
      final contents = await file.readAsString();
      final list = jsonDecode(contents) as List;
      return list
          .map((j) => _srItemFromJson(Map<String, dynamic>.from(j as Map)))
          .toList();
    } catch (_) {
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
        'weakNotesMidi': p.weakNotesMidi,
      };

  Map<String, dynamic> _srItemToJson(SRItem item) => {
        'id': item.id,
        'topic': item.topic,
        'gradeLevel': item.gradeLevel,
        'easeFactor': item.easeFactor,
        'intervalDays': item.intervalDays,
        'repetitions': item.repetitions,
        'nextReviewAt': item.nextReviewAt.toIso8601String(),
        'lastReviewedAt': item.lastReviewedAt?.toIso8601String(),
      };

  SRItem _srItemFromJson(Map<String, dynamic> j) => SRItem(
        id: j['id'] as String,
        topic: j['topic'] as String,
        gradeLevel: j['gradeLevel'] as int? ?? 0,
        easeFactor: (j['easeFactor'] as num?)?.toDouble() ?? 2.5,
        intervalDays: j['intervalDays'] as int? ?? 0,
        repetitions: j['repetitions'] as int? ?? 0,
        nextReviewAt:
            DateTime.tryParse(j['nextReviewAt'] as String? ?? '') ??
                DateTime.now(),
        lastReviewedAt: j['lastReviewedAt'] == null
            ? null
            : DateTime.tryParse(j['lastReviewedAt'] as String),
      );

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
        weakNotesMidi: (j['weakNotesMidi'] as List<dynamic>?)
                ?.map((e) => e as int)
                .toList() ??
            [],
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
