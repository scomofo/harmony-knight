import 'dart:math';
import 'package:harmony_knight/core/constants.dart';
import 'package:harmony_knight/models/note.dart';
import 'package:harmony_knight/models/duel_state.dart';

/// The Collaborative Counterpoint Duel engine.
///
/// Implements the "Discord Sentinel" AI sparring partner for Species
/// Counterpoint exercises. The duel is turn-based, wait-mode (no timers),
/// and designed to teach through guided failure rather than punishment.
class DuelEngine {
  final Random _rng = Random();

  /// Generate a Cantus Firmus (fixed melody) for a duel.
  ///
  /// The difficulty scales with the player's grade level.
  /// Grade 0-2: Simple stepwise motion in C major, 4-6 notes.
  /// Grade 3-5: Wider intervals, more notes, minor keys.
  /// Grade 6-8+: Chromatic elements, longer phrases.
  List<Note> generateCantusFirmus({int gradeLevel = 0}) {
    final length = _cantusLength(gradeLevel);
    final scale = _scaleForGrade(gradeLevel);
    final notes = <Note>[];

    // Start on tonic.
    int currentScaleIndex = 0;
    notes.add(Note(midi: scale[currentScaleIndex]));

    for (int i = 1; i < length - 1; i++) {
      // Stepwise motion with occasional thirds.
      final maxStep = gradeLevel < 3 ? 2 : 3;
      final step = _rng.nextInt(maxStep * 2 + 1) - maxStep;
      currentScaleIndex = (currentScaleIndex + step)
          .clamp(0, scale.length - 1);
      notes.add(Note(midi: scale[currentScaleIndex]));
    }

    // End on tonic.
    notes.add(Note(midi: scale[0]));
    return notes;
  }

  /// Validate a user's counterpoint note against the current cantus firmus note.
  ///
  /// Returns a [DuelMoveResult] with the interval quality and any violations.
  DuelMoveResult validateMove({
    required Note cantusNote,
    required Note userNote,
    Note? previousCantusNote,
    Note? previousUserNote,
  }) {
    final quality = cantusNote.intervalQualityTo(userNote);
    final violations = <CounterpointViolation>[];

    // Check for parallel fifths/octaves.
    if (previousCantusNote != null && previousUserNote != null) {
      final prevInterval = previousCantusNote.intervalTo(previousUserNote).abs() % 12;
      final currInterval = cantusNote.intervalTo(userNote).abs() % 12;

      // Parallel perfect consonances are forbidden.
      if ((prevInterval == 7 && currInterval == 7) ||
          (prevInterval == 0 && currInterval == 0)) {
        final type = currInterval == 7
            ? CounterpointViolation.parallelFifths
            : CounterpointViolation.parallelOctaves;
        violations.add(type);
      }

      // Direct/hidden fifths/octaves (both voices moving in same direction to P5/P8).
      final cantusDirection = cantusNote.midi - previousCantusNote.midi;
      final userDirection = userNote.midi - previousUserNote.midi;
      if (cantusDirection.sign == userDirection.sign &&
          (currInterval == 7 || currInterval == 0) &&
          prevInterval != currInterval) {
        violations.add(CounterpointViolation.hiddenFifthsOrOctaves);
      }
    }

    // Voice crossing check.
    if (userNote.midi < cantusNote.midi - 24) {
      violations.add(CounterpointViolation.voiceCrossing);
    }

    return DuelMoveResult(
      quality: quality,
      violations: violations,
      isValid: violations.isEmpty && quality != IntervalQuality.dissonance,
    );
  }

  /// Generate a "Ghost Resolution" — an AI-suggested fix for an invalid move.
  ///
  /// The ghost note shows the user what a valid counterpoint note would be,
  /// along with the reasoning.
  GhostResolution? suggestGhostResolution({
    required Note cantusNote,
    Note? previousCantusNote,
    Note? previousUserNote,
  }) {
    // Try imperfect consonances first (3rds and 6ths are preferred).
    final preferredIntervals = [3, 4, 8, 9]; // m3, M3, m6, M6 in semitones.
    for (final interval in preferredIntervals) {
      final candidateMidi = cantusNote.midi + interval;
      final candidate = Note(midi: candidateMidi, isGhost: true);

      // Validate this candidate doesn't create parallel motion issues.
      final result = validateMove(
        cantusNote: cantusNote,
        userNote: candidate,
        previousCantusNote: previousCantusNote,
        previousUserNote: previousUserNote,
      );

      if (result.isValid) {
        final intervalName = _intervalName(interval);
        return GhostResolution(
          suggestedNote: candidate,
          reason: 'A $intervalName above the cantus creates a pleasing '
              'imperfect consonance, which is ideal in counterpoint.',
        );
      }
    }

    // Fallback to perfect consonances.
    for (final interval in [7, 12]) {
      final candidate = Note(midi: cantusNote.midi + interval, isGhost: true);
      final result = validateMove(
        cantusNote: cantusNote,
        userNote: candidate,
        previousCantusNote: previousCantusNote,
        previousUserNote: previousUserNote,
      );
      if (result.isValid) {
        return GhostResolution(
          suggestedNote: candidate,
          reason: 'A ${_intervalName(interval)} above provides a stable consonance.',
        );
      }
    }

    return null;
  }

  /// Calculate harmony meter delta for a turn result.
  double harmonyMeterDelta(DuelMoveResult result, {bool dissonanceResolved = false}) {
    if (dissonanceResolved) {
      return TimingConstants.dissonanceResolveBonus; // +15% Big Win
    }
    switch (result.quality) {
      case IntervalQuality.perfectConsonance:
        return 0.08;
      case IntervalQuality.imperfectConsonance:
        return 0.10; // Imperfect consonances are actually preferred!
      case IntervalQuality.dissonance:
        return -0.05;
    }
  }

  int _cantusLength(int gradeLevel) {
    if (gradeLevel <= 2) return 4 + _rng.nextInt(3); // 4-6 notes
    if (gradeLevel <= 5) return 6 + _rng.nextInt(3); // 6-8 notes
    return 8 + _rng.nextInt(5); // 8-12 notes
  }

  List<int> _scaleForGrade(int gradeLevel) {
    // C major scale starting from C4 (MIDI 60).
    const cMajor = [60, 62, 64, 65, 67, 69, 71, 72];
    // A minor scale starting from A3 (MIDI 57).
    const aMinor = [57, 59, 60, 62, 64, 65, 67, 69];

    if (gradeLevel <= 2) return cMajor;
    if (gradeLevel <= 5) return _rng.nextBool() ? cMajor : aMinor;
    // Higher grades: chromatic additions.
    return [...cMajor, 61, 63, 66, 68, 70]..sort();
  }

  String _intervalName(int semitones) {
    const names = {
      0: 'unison', 1: 'minor 2nd', 2: 'major 2nd', 3: 'minor 3rd',
      4: 'major 3rd', 5: 'perfect 4th', 6: 'tritone', 7: 'perfect 5th',
      8: 'minor 6th', 9: 'major 6th', 10: 'minor 7th', 11: 'major 7th',
      12: 'octave',
    };
    return names[semitones.abs() % 13] ?? 'interval';
  }
}

/// Result of validating a user's counterpoint move.
class DuelMoveResult {
  final IntervalQuality quality;
  final List<CounterpointViolation> violations;
  final bool isValid;

  const DuelMoveResult({
    required this.quality,
    required this.violations,
    required this.isValid,
  });
}

/// Types of counterpoint rule violations.
enum CounterpointViolation {
  parallelFifths,
  parallelOctaves,
  hiddenFifthsOrOctaves,
  voiceCrossing,
}

/// A ghost resolution suggested by the AI when the user makes an invalid move.
class GhostResolution {
  final Note suggestedNote;
  final String reason;

  const GhostResolution({
    required this.suggestedNote,
    required this.reason,
  });
}
