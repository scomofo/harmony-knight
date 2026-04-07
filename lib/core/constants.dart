import 'package:flutter/material.dart';

/// Figurenotes color mapping: each pitch class maps to a high-contrast color.
class FigureNoteColors {
  FigureNoteColors._();

  static const Color c = Color(0xFFE53935); // Red
  static const Color cSharp = Color(0xFFAD1457); // Dark Pink
  static const Color d = Color(0xFFFF6F00); // Orange
  static const Color dSharp = Color(0xFF6A1B9A); // Purple
  static const Color e = Color(0xFFFFEB3B); // Yellow
  static const Color f = Color(0xFF2E7D32); // Green
  static const Color fSharp = Color(0xFF00695C); // Teal
  static const Color g = Color(0xFF1565C0); // Blue
  static const Color gSharp = Color(0xFF283593); // Indigo
  static const Color a = Color(0xFFFF8F00); // Amber
  static const Color aSharp = Color(0xFF4E342E); // Brown
  static const Color b = Color(0xFF37474F); // Blue Grey

  static const List<Color> all = [
    c, cSharp, d, dSharp, e, f, fSharp, g, gSharp, a, aSharp, b,
  ];

  /// Get color for a MIDI note number (0-127).
  static Color forMidi(int midiNote) => all[midiNote % 12];

  /// Get color for a pitch class index (0-11, C=0).
  static Color forPitchClass(int pc) => all[pc % 12];
}

/// Figurenotes shape mapping for pitch classes.
enum FigureNoteShape { circle, square, triangle, diamond }

class FigureNoteShapes {
  FigureNoteShapes._();

  static const List<FigureNoteShape> _map = [
    FigureNoteShape.circle,   // C
    FigureNoteShape.circle,   // C#
    FigureNoteShape.square,   // D
    FigureNoteShape.square,   // D#
    FigureNoteShape.triangle, // E
    FigureNoteShape.diamond,  // F
    FigureNoteShape.diamond,  // F#
    FigureNoteShape.circle,   // G
    FigureNoteShape.circle,   // G#
    FigureNoteShape.square,   // A
    FigureNoteShape.square,   // A#
    FigureNoteShape.triangle, // B
  ];

  static FigureNoteShape forPitchClass(int pc) => _map[pc % 12];
}

/// ADHD-optimized timing constants.
class TimingConstants {
  TimingConstants._();

  /// The "10-Second Rule": max time before primary objective is clear.
  static const Duration screenOrientationMax = Duration(seconds: 10);

  /// Ghost tone pre-roll duration at 0% confidence.
  static const Duration ghostTonePreRoll = Duration(milliseconds: 200);

  /// Streak absence threshold before "Broken Blade" mission triggers.
  static const Duration streakAbsenceThreshold = Duration(hours: 48);

  /// Fever mode trigger: consecutive perfect notes needed.
  static const int feverModeThreshold = 10;

  /// Bonus percentage for resolving a dissonance in Duel mode.
  static const double dissonanceResolveBonus = 0.15;
}

/// Scaffolding confidence thresholds.
class ScaffoldingThresholds {
  ScaffoldingThresholds._();

  static const double figurenotes = 0.0;
  static const double transition = 0.5;
  static const double maestro = 1.0;

  /// Ghost tone volume reduction at 50% confidence (in dB).
  static const double ghostToneReductionDb = -6.0;
}

/// Counterpoint interval classifications for the Duel engine.
enum IntervalQuality { perfectConsonance, imperfectConsonance, dissonance }

class IntervalClassification {
  IntervalClassification._();

  /// Classify an interval (in semitones, mod 12) for Species Counterpoint.
  static IntervalQuality classify(int semitones) {
    final interval = semitones.abs() % 12;
    switch (interval) {
      case 0: // Unison
      case 5: // Perfect 4th
      case 7: // Perfect 5th
        return IntervalQuality.perfectConsonance;
      case 3: // Minor 3rd
      case 4: // Major 3rd
      case 8: // Minor 6th
      case 9: // Major 6th
        return IntervalQuality.imperfectConsonance;
      default:
        return IntervalQuality.dissonance;
    }
  }
}
