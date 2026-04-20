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
  final bool correct;
  final double quality;
  final String playedNoteName;
  final NoteRole role;
  final String chordName;
  final String rootName;
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

/// Evaluates player input against the current challenge's musical context.
///
/// Evaluation is type-aware:
///   - chordTone: chord tones are correct
///   - scaleTone: any scale note is correct, chord tones score higher
///   - resolution: only the root is fully correct
///   - interval: the 5th is the target (for "choose the 5th" questions)
class EvaluationEngine {
  static const _noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  /// Evaluate a note against the musical context and question type.
  EvaluationResult evaluate(Note note, MusicalContext context, [QuestionType? type]) {
    final pc = note.midi % 12;
    final intervalFromRoot = (pc - context.rootPitchClass + 12) % 12;
    final role = _classifyRole(pc, context);
    final noteName = _noteNames[pc];
    final rootName = _noteNames[context.rootPitchClass];

    switch (type ?? QuestionType.chordTone) {
      case QuestionType.scaleTone:
        return _evaluateScaleTone(pc, role, noteName, context, rootName, intervalFromRoot);
      case QuestionType.resolution:
        return _evaluateResolution(pc, role, noteName, context, rootName, intervalFromRoot);
      case QuestionType.interval:
        return _evaluateInterval(pc, role, noteName, context, rootName, intervalFromRoot);
      case QuestionType.chordTone:
        return _evaluateChordTone(pc, role, noteName, context, rootName, intervalFromRoot);
    }
  }

  /// Chord tone: only chord tones are correct.
  EvaluationResult _evaluateChordTone(
      int pc, NoteRole role, String noteName,
      MusicalContext ctx, String rootName, int interval) {
    final isTarget = ctx.targetPitchClasses.contains(pc);
    if (!isTarget) {
      return EvaluationResult(
        correct: false, quality: 0.0, playedNoteName: noteName,
        role: role, chordName: ctx.chordName, rootName: rootName,
        intervalFromRoot: interval,
      );
    }
    return EvaluationResult(
      correct: true, quality: role == NoteRole.root ? 1.0 : 0.7,
      playedNoteName: noteName, role: role, chordName: ctx.chordName,
      rootName: rootName, intervalFromRoot: interval,
    );
  }

  /// Scale tone: any diatonic note is correct, chord tones score higher.
  EvaluationResult _evaluateScaleTone(
      int pc, NoteRole role, String noteName,
      MusicalContext ctx, String rootName, int interval) {
    final inScale = ctx.scalePitchClasses.contains(pc);
    if (!inScale) {
      return EvaluationResult(
        correct: false, quality: 0.0, playedNoteName: noteName,
        role: role, chordName: ctx.chordName, rootName: rootName,
        intervalFromRoot: interval,
      );
    }
    // Chord tones score higher than non-chord scale tones.
    final inChord = ctx.targetPitchClasses.contains(pc);
    final quality = inChord ? 1.0 : 0.7;
    return EvaluationResult(
      correct: true, quality: quality, playedNoteName: noteName,
      role: role, chordName: ctx.chordName, rootName: rootName,
      intervalFromRoot: interval,
    );
  }

  /// Resolution: only the root is fully correct. Other chord tones partially.
  EvaluationResult _evaluateResolution(
      int pc, NoteRole role, String noteName,
      MusicalContext ctx, String rootName, int interval) {
    if (pc == ctx.rootPitchClass) {
      return EvaluationResult(
        correct: true, quality: 1.0, playedNoteName: noteName,
        role: NoteRole.root, chordName: ctx.chordName, rootName: rootName,
        intervalFromRoot: interval,
      );
    }
    // Other chord tones are acceptable but not ideal.
    if (ctx.targetPitchClasses.contains(pc)) {
      return EvaluationResult(
        correct: true, quality: 0.5, playedNoteName: noteName,
        role: role, chordName: ctx.chordName, rootName: rootName,
        intervalFromRoot: interval,
      );
    }
    return EvaluationResult(
      correct: false, quality: 0.0, playedNoteName: noteName,
      role: role, chordName: ctx.chordName, rootName: rootName,
      intervalFromRoot: interval,
    );
  }

  /// Interval: for "choose the 5th" — the 5th is correct, root is partial.
  EvaluationResult _evaluateInterval(
      int pc, NoteRole role, String noteName,
      MusicalContext ctx, String rootName, int interval) {
    if (interval == 7) {
      // Perfect 5th — correct answer.
      return EvaluationResult(
        correct: true, quality: 1.0, playedNoteName: noteName,
        role: NoteRole.fifth, chordName: ctx.chordName, rootName: rootName,
        intervalFromRoot: interval,
      );
    }
    if (ctx.targetPitchClasses.contains(pc)) {
      // Other chord tone — partial credit.
      return EvaluationResult(
        correct: false, quality: 0.3, playedNoteName: noteName,
        role: role, chordName: ctx.chordName, rootName: rootName,
        intervalFromRoot: interval,
      );
    }
    return EvaluationResult(
      correct: false, quality: 0.0, playedNoteName: noteName,
      role: role, chordName: ctx.chordName, rootName: rootName,
      intervalFromRoot: interval,
    );
  }

  NoteRole _classifyRole(int pc, MusicalContext context) {
    if (pc == context.rootPitchClass) return NoteRole.root;
    if (!context.targetPitchClasses.contains(pc)) return NoteRole.nonChord;

    final interval = (pc - context.rootPitchClass + 12) % 12;
    if (interval == 3 || interval == 4) return NoteRole.third;
    if (interval == 7) return NoteRole.fifth;
    return NoteRole.third;
  }
}
