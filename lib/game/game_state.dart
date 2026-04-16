import 'package:flutter/foundation.dart';
import 'package:harmony_knight/engine/duel_engine.dart';
import 'package:harmony_knight/game/challenge.dart';
import 'package:harmony_knight/game/evaluation_engine.dart';
import 'package:harmony_knight/game/insight_tracker.dart';
import 'package:harmony_knight/game/player_progress_session.dart';
import 'package:harmony_knight/game/sentinel.dart';
import 'package:harmony_knight/game/session_stats.dart';
import 'package:harmony_knight/models/note.dart';

export 'package:harmony_knight/game/player_progress_session.dart';

/// Central game state: context -> question -> decision -> validation -> explanation.
class GameState extends ChangeNotifier {
  final DuelEngine duel;
  final EvaluationEngine evaluator;
  final Sentinel sentinel;
  final SessionStats stats = SessionStats();
  final InsightTracker insights = InsightTracker();

  late Challenge currentChallenge;
  final PlayerProgress progress = PlayerProgress.initial();

  /// Primary explanation line.
  String lastFeedback = '';

  /// Secondary coaching hint.
  String lastHint = '';

  /// Stability meter (0.0 to 1.0).
  double stabilityValue = 0.0;

  /// The most recent evaluation result.
  EvaluationResult? lastResult;

  /// Think-mode: when true, user has answered and is reading the explanation.
  /// The Next button advances to the next question.
  bool awaitingNext = false;

  GameState({
    required this.duel,
    required this.evaluator,
    required this.sentinel,
  }) {
    currentChallenge = sentinel.next(progress, insights);
  }

  /// The current curriculum concept name.
  String get currentConcept => sentinel.currentNode(progress).concept;

  /// Progress within the current curriculum node (0.0 to 1.0).
  double get nodeProgress {
    final node = sentinel.currentNode(progress);
    return (progress.nodeScore / node.requiredScore).clamp(0.0, 1.0);
  }

  void onPlayerAction(Note note) {
    // Think-mode: ignore input while reading explanation.
    if (awaitingNext) return;

    final result = evaluator.evaluate(note, currentChallenge.context, currentChallenge.type);
    lastResult = result;

    // Update stability meter.
    if (result.correct) {
      stabilityValue = (stabilityValue + result.quality * 0.1).clamp(0.0, 1.0);
    } else {
      stabilityValue = (stabilityValue - 0.05).clamp(0.0, 1.0);
    }

    // Track stats.
    final challengeIdx = progress.currentNodeIndex;
    if (result.correct) {
      progress.recordHit(challengeIdx);
    } else {
      progress.recordMiss(challengeIdx);
    }

    progress.addScore(result.quality);
    stats.record(result.correct);
    insights.record(currentChallenge.type, result.correct);

    // Build explanation.
    final fb = _buildExplanation(result);
    lastFeedback = fb.$1;
    lastHint = fb.$2;

    // Enter think-mode: user reads explanation, then presses Next.
    awaitingNext = true;

    notifyListeners();
  }

  /// Advance to the next question (called from Next button).
  void advanceToNext() {
    if (!awaitingNext) return;

    awaitingNext = false;
    currentChallenge = sentinel.next(progress, insights);
    lastResult = null;

    notifyListeners();
  }

  /// Returns (explanation, hint) using full musical context.
  (String, String) _buildExplanation(EvaluationResult result) {
    if (!result.correct) {
      return _buildMissExplanation(result);
    }

    final type = currentChallenge.type;

    switch (result.role) {
      case NoteRole.root:
        return (
          '${result.playedNoteName} is the root of ${result.chordName}. '
          'The root is the most stable note \u2014 it anchors the chord.',
          _streakHint() ?? 'Roots define what chord you\'re hearing',
        );
      case NoteRole.fifth:
        final typeHint = type == QuestionType.resolution
            ? 'For resolution, the root (${result.rootName}) is even more stable'
            : 'The 5th supports the root without adding color';
        return (
          '${result.playedNoteName} is the 5th of ${result.chordName}. '
          'The perfect 5th is strong and open-sounding.',
          typeHint,
        );
      case NoteRole.third:
        return (
          '${result.playedNoteName} is the 3rd of ${result.chordName}. '
          'The 3rd determines whether the chord sounds major or minor.',
          'Major 3rd = bright, minor 3rd = dark',
        );
      case NoteRole.nonChord:
        return ('That works', '');
    }
  }

  (String, String) _buildMissExplanation(EvaluationResult result) {
    final interval = result.intervalFromRoot;
    final played = result.playedNoteName;
    final chord = result.chordName;
    final root = result.rootName;
    final ctx = currentChallenge.context;

    // Check if the note is in the scale but not in the chord.
    final inScale = ctx.scalePitchClasses.contains(
        result.playedNoteName.length == 1
            ? _nameToPC(result.playedNoteName)
            : _nameToPC(result.playedNoteName));

    if (interval == 1 || interval == 11) {
      return (
        '$played is a half step from $root \u2014 this creates strong tension. '
        'Half steps want to resolve to the nearest chord tone.',
        'Move ${interval == 1 ? "down" : "up"} one step to $root',
      );
    }

    if (interval == 6) {
      return (
        '$played creates a tritone against $root. '
        'The tritone is the most unstable interval in Western music.',
        'It naturally resolves inward or outward to a consonance',
      );
    }

    if (inScale && currentChallenge.type == QuestionType.chordTone) {
      return (
        '$played is in the key of ${ctx.key}, but not in the $chord chord. '
        'Scale tones outside the chord create color and tension.',
        'The chord tones of $chord are ${_chordToneNames()}',
      );
    }

    if (interval == 2 || interval == 10) {
      return (
        '$played is a whole step from $root \u2014 it sounds like a passing tone. '
        'Passing tones connect chord tones but don\'t rest on them.',
        'Resolve to $root for stability',
      );
    }

    return (
      '$played is outside the $chord chord. '
      'The chord tones are ${_chordToneNames()}.',
      'Chord tones sound stable because they belong to the harmony',
    );
  }

  String? _streakHint() {
    if (progress.streak >= 5) {
      return '${progress.streak} correct in a row \u2014 strong understanding';
    }
    if (progress.streak >= 3) {
      return '${progress.streak} in a row \u2014 building confidence';
    }
    return null;
  }

  String _chordToneNames() {
    const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return currentChallenge.context.targetPitchClasses
        .map((pc) => names[pc])
        .join(', ');
  }

  int _nameToPC(String name) {
    const map = {
      'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
      'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11,
    };
    return map[name] ?? 0;
  }
}
