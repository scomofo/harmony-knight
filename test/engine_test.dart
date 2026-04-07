import 'package:flutter_test/flutter_test.dart';
import 'package:harmony_knight/core/constants.dart';
import 'package:harmony_knight/models/note.dart';
import 'package:harmony_knight/engine/ghost_tone_engine.dart';
import 'package:harmony_knight/engine/duel_engine.dart';
import 'package:harmony_knight/engine/fever_mode_engine.dart';

void main() {
  group('Note model', () {
    test('pitch class and octave', () {
      const note = Note(midi: 60); // C4
      expect(note.pitchClass, 0);
      expect(note.octave, 4);
      expect(note.name, 'C4');
    });

    test('interval calculation', () {
      const c4 = Note(midi: 60);
      const e4 = Note(midi: 64);
      expect(c4.intervalTo(e4), 4); // Major 3rd
      expect(c4.intervalQualityTo(e4), IntervalQuality.imperfectConsonance);
    });

    test('perfect fifth is perfect consonance', () {
      const c4 = Note(midi: 60);
      const g4 = Note(midi: 67);
      expect(c4.intervalQualityTo(g4), IntervalQuality.perfectConsonance);
    });

    test('minor second is dissonance', () {
      const c4 = Note(midi: 60);
      const cSharp4 = Note(midi: 61);
      expect(c4.intervalQualityTo(cSharp4), IntervalQuality.dissonance);
    });
  });

  group('GhostToneEngine', () {
    final engine = GhostToneEngine();

    test('volume at 0% confidence is maximum', () {
      expect(engine.ghostToneVolume(0.0), 1.0);
    });

    test('volume at 100% confidence is muted', () {
      expect(engine.ghostToneVolume(1.0), 0.0);
    });

    test('pre-roll at 0% confidence is 200ms', () {
      expect(engine.preRollMs(0.0), 200);
    });

    test('pre-roll at 50%+ confidence is 0ms', () {
      expect(engine.preRollMs(0.5), 0);
      expect(engine.preRollMs(1.0), 0);
    });

    test('low-pass cutoff decreases with confidence', () {
      final cutoff0 = engine.lowPassCutoffHz(0.0);
      final cutoff50 = engine.lowPassCutoffHz(0.5);
      final cutoff100 = engine.lowPassCutoffHz(1.0);
      expect(cutoff0, greaterThan(cutoff50));
      expect(cutoff50, greaterThan(cutoff100));
    });

    test('compute params at full confidence is muted', () {
      final params = engine.computeParams(midiNote: 60, confidence: 1.0);
      expect(params.isMuted, true);
      expect(params.volume, 0.0);
    });
  });

  group('DuelEngine', () {
    final engine = DuelEngine();

    test('generates cantus firmus of correct length for grade 0', () {
      final cantus = engine.generateCantusFirmus(gradeLevel: 0);
      expect(cantus.length, greaterThanOrEqualTo(4));
      expect(cantus.length, lessThanOrEqualTo(6));
    });

    test('cantus firmus starts and ends on tonic', () {
      final cantus = engine.generateCantusFirmus(gradeLevel: 0);
      expect(cantus.first.midi, 60); // C4 (tonic of C major)
      expect(cantus.last.midi, 60);
    });

    test('validates consonant interval as valid', () {
      const cantus = Note(midi: 60); // C4
      const user = Note(midi: 64); // E4 (major 3rd)
      final result = engine.validateMove(cantusNote: cantus, userNote: user);
      expect(result.isValid, true);
      expect(result.quality, IntervalQuality.imperfectConsonance);
    });

    test('validates dissonant interval as invalid', () {
      const cantus = Note(midi: 60); // C4
      const user = Note(midi: 61); // C#4 (minor 2nd)
      final result = engine.validateMove(cantusNote: cantus, userNote: user);
      expect(result.isValid, false);
      expect(result.quality, IntervalQuality.dissonance);
    });

    test('detects parallel fifths', () {
      const prevCantus = Note(midi: 60); // C4
      const prevUser = Note(midi: 67); // G4 (P5)
      const cantus = Note(midi: 62); // D4
      const user = Note(midi: 69); // A4 (P5)
      final result = engine.validateMove(
        cantusNote: cantus,
        userNote: user,
        previousCantusNote: prevCantus,
        previousUserNote: prevUser,
      );
      expect(result.violations, contains(CounterpointViolation.parallelFifths));
    });

    test('suggests ghost resolution', () {
      const cantus = Note(midi: 60);
      final ghost = engine.suggestGhostResolution(cantusNote: cantus);
      expect(ghost, isNotNull);
      expect(ghost!.suggestedNote.isGhost, true);
      expect(ghost.reason, isNotEmpty);
    });

    test('harmony meter delta rewards imperfect consonance most', () {
      final perfectResult = DuelMoveResult(
        quality: IntervalQuality.perfectConsonance,
        violations: [],
        isValid: true,
      );
      final imperfectResult = DuelMoveResult(
        quality: IntervalQuality.imperfectConsonance,
        violations: [],
        isValid: true,
      );
      expect(
        engine.harmonyMeterDelta(imperfectResult),
        greaterThan(engine.harmonyMeterDelta(perfectResult)),
      );
    });

    test('dissonance resolution grants 15% Big Win bonus', () {
      final result = DuelMoveResult(
        quality: IntervalQuality.imperfectConsonance,
        violations: [],
        isValid: true,
      );
      expect(
        engine.harmonyMeterDelta(result, dissonanceResolved: true),
        0.15,
      );
    });
  });

  group('FeverModeEngine', () {
    test('activates fever mode at 10+ streak', () {
      final engine = FeverModeEngine();
      final status = engine.evaluate(
        currentStreak: 10,
        lastActiveAt: DateTime.now(),
      );
      expect(status.isFeverActive, true);
      expect(status.streakMultiplier, greaterThanOrEqualTo(2.0));
    });

    test('does not activate fever mode below threshold', () {
      final engine = FeverModeEngine();
      final status = engine.evaluate(
        currentStreak: 5,
        lastActiveAt: DateTime.now(),
      );
      expect(status.isFeverActive, false);
      expect(status.streakMultiplier, 1.0);
    });

    test('requires broken blade recovery after 48+ hours', () {
      final engine = FeverModeEngine();
      final status = engine.evaluate(
        currentStreak: 15,
        lastActiveAt: DateTime.now().subtract(const Duration(hours: 49)),
      );
      expect(status.requiresBrokenBladeRecovery, true);
      expect(status.isFeverActive, false);
    });

    test('broken blade mission is shorter for higher streaks', () {
      final engine = FeverModeEngine();
      final lowStreak = engine.evaluate(
        currentStreak: 3,
        lastActiveAt: DateTime.now().subtract(const Duration(hours: 49)),
      );
      final highStreak = engine.evaluate(
        currentStreak: 25,
        lastActiveAt: DateTime.now().subtract(const Duration(hours: 49)),
      );
      expect(highStreak.brokenBladeMissionLength,
          lessThan(lowStreak.brokenBladeMissionLength));
    });
  });

  group('IntervalClassification', () {
    test('unison is perfect consonance', () {
      expect(IntervalClassification.classify(0),
          IntervalQuality.perfectConsonance);
    });

    test('tritone is dissonance', () {
      expect(IntervalClassification.classify(6), IntervalQuality.dissonance);
    });

    test('major 3rd is imperfect consonance', () {
      expect(IntervalClassification.classify(4),
          IntervalQuality.imperfectConsonance);
    });
  });
}
