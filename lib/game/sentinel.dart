import 'dart:math';
import 'package:harmony_knight/game/challenge.dart';
import 'package:harmony_knight/game/challenge_factory.dart';
import 'package:harmony_knight/game/curriculum_node.dart';
import 'package:harmony_knight/game/insight_tracker.dart';
import 'package:harmony_knight/game/player_progress_session.dart';

/// The Discord Sentinel — curriculum-driven adaptive challenge selection.
///
/// Walks through the theory curriculum, generating questions appropriate
/// to the current node. Advances when the player meets the score threshold.
class Sentinel {
  final List<CurriculumNode> curriculum;
  final Random _rng = Random();

  Sentinel([List<CurriculumNode>? curriculum])
      : curriculum = curriculum ?? theoryCurriculum;

  /// Select the next challenge based on curriculum position, progress,
  /// and insight into the player's weak areas.
  Challenge next(PlayerProgress progress, [InsightTracker? insights]) {
    // Check if we should advance.
    final node = currentNode(progress);
    if (progress.nodeScore >= node.requiredScore) {
      progress.advanceNode(curriculum);
    }

    final current = currentNode(progress);

    // Prefer the weakest question type if it's in this node's types.
    QuestionType type;
    final weak = insights?.weakestType();
    if (weak != null && current.types.contains(weak)) {
      type = weak;
    } else {
      type = current.types[_rng.nextInt(current.types.length)];
    }

    // Pick a random key from this node's keys.
    final keyName = current.keys[_rng.nextInt(current.keys.length)];

    final context = _buildContext(keyName);
    return ChallengeFactory.build(type, context);
  }

  /// The current curriculum node the player is on.
  CurriculumNode currentNode(PlayerProgress progress) {
    final idx = progress.currentNodeIndex.clamp(0, curriculum.length - 1);
    return curriculum[idx];
  }

  /// Build a MusicalContext from a key name (e.g. "C", "G", "Am").
  MusicalContext _buildContext(String keyName) {
    final data = _keyData[keyName];
    if (data != null) return data;

    // Fallback to C major.
    return _keyData['C']!;
  }

  /// Pre-built musical contexts for each supported key.
  static final _keyData = {
    'C': const MusicalContext(
      key: 'C Major',
      chordName: 'C major',
      targetPitchClasses: [0, 4, 7],     // C, E, G
      rootPitchClass: 0,
      scaleNotes: 'C D E F G A B',
      scalePitchClasses: [0, 2, 4, 5, 7, 9, 11],
    ),
    'G': const MusicalContext(
      key: 'G Major',
      chordName: 'G major',
      targetPitchClasses: [7, 11, 2],    // G, B, D
      rootPitchClass: 7,
      scaleNotes: 'G A B C D E F#',
      scalePitchClasses: [7, 9, 11, 0, 2, 4, 6],
    ),
    'F': const MusicalContext(
      key: 'F Major',
      chordName: 'F major',
      targetPitchClasses: [5, 9, 0],     // F, A, C
      rootPitchClass: 5,
      scaleNotes: 'F G A Bb C D E',
      scalePitchClasses: [5, 7, 9, 10, 0, 2, 4],
    ),
    'Am': const MusicalContext(
      key: 'A Minor',
      chordName: 'A minor',
      targetPitchClasses: [9, 0, 4],     // A, C, E
      rootPitchClass: 9,
      scaleNotes: 'A B C D E F G',
      scalePitchClasses: [9, 11, 0, 2, 4, 5, 7],
    ),
    'Dm': const MusicalContext(
      key: 'D Minor',
      chordName: 'D minor',
      targetPitchClasses: [2, 5, 9],     // D, F, A
      rootPitchClass: 2,
      scaleNotes: 'D E F G A Bb C',
      scalePitchClasses: [2, 4, 5, 7, 9, 10, 0],
    ),
    'Em': const MusicalContext(
      key: 'E Minor',
      chordName: 'E minor',
      targetPitchClasses: [4, 7, 11],    // E, G, B
      rootPitchClass: 4,
      scaleNotes: 'E F# G A B C D',
      scalePitchClasses: [4, 6, 7, 9, 11, 0, 2],
    ),
  };
}
