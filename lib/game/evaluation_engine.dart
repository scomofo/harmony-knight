import 'package:harmony_knight/models/note.dart';
import 'package:harmony_knight/game/challenge.dart';

/// Musical role of a note relative to the chord.
enum NoteRole {
  root,       // The root of the chord
  third,      // Major or minor 3rd
  fifth,      // Perfect 5th
  nonChord,   // Not in the chord
}

/// Result of evaluating a player's note against a challenge.
class EvaluationResult {
  /// Whether the note is harmonically acceptable.
  final bool correct;

  /// Quality score from 0.0 (barely acceptable) to 1.0 (ideal).
  final double quality;

  /// The note name the player actually played (e.g. "E").
  final String playedNoteName;

  /// The role this note plays relative to the chord.
  final NoteRole role;

  /// The chord name from the challenge (e.g. "C major").
  final String chordName;

  /// The root note name of the chord (e.g. "C").
  final String rootName;

  /// The interval in semitones from the root to the played note (mod 12).
  final int intervalFromRoot;

  const EvaluationResult({
    required this.correct,
    required this.quality,
    required this.playedNoteName,
    required this.role,
    required this.chordName,
    required this.rootName,
    required this.intervalFromRoot,
  });
}

/// Evaluates player input against the current challenge context.
class EvaluationEngine {
  static const _noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  /// Evaluate a note against the challenge context.
  EvaluationResult evaluate(Note note, ChallengeContext context) {
    final pc = note.midi % 12;
    final isTarget = context.targetPitchClasses.contains(pc);
    final intervalFromRoot = (pc - context.rootPitchClass + 12) % 12;
    final role = _classifyRole(pc, context);

    if (!isTarget) {
      return EvaluationResult(
        correct: false,
        quality: 0.0,
        playedNoteName: _noteNames[pc],
        role: role,
        chordName: context.chordName,
        rootName: _noteNames[context.rootPitchClass],
        intervalFromRoot: intervalFromRoot,
      );
    }

    final quality = role == NoteRole.root ? 1.0 : 0.7;

    return EvaluationResult(
      correct: true,
      quality: quality,
      playedNoteName: _noteNames[pc],
      role: role,
      chordName: context.chordName,
      rootName: _noteNames[context.rootPitchClass],
      intervalFromRoot: intervalFromRoot,
    );
  }

  /// Determine the musical role of a pitch class relative to the chord.
  NoteRole _classifyRole(int pc, ChallengeContext context) {
    if (pc == context.rootPitchClass) return NoteRole.root;

    if (!context.targetPitchClasses.contains(pc)) return NoteRole.nonChord;

    final interval = (pc - context.rootPitchClass + 12) % 12;

    // 3 or 4 semitones = minor or major 3rd
    if (interval == 3 || interval == 4) return NoteRole.third;

    // 7 semitones = perfect 5th
    if (interval == 7) return NoteRole.fifth;

    // Other chord tone (e.g. in extended chords)
    return NoteRole.third; // default to "third" for other chord members
  }
}
