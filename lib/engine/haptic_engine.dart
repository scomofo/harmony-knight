import 'package:flutter/services.dart';

/// Haptic feedback engine for rhythm and interaction feedback.
///
/// Provides rhythmic haptic pulses for the "Body Base-10" method,
/// confirmation buzzes for correct answers, and error vibrations.
///
/// ADHD-specific: Haptic feedback provides grounded physical reinforcement
/// for abstract temporal concepts (Tactile modality in VAKT framework).
class HapticEngine {
  /// Light tap — for UI interactions (button press, slider change).
  static Future<void> lightTap() async {
    await HapticFeedback.lightImpact();
  }

  /// Medium tap — for correct note identification.
  static Future<void> correctAnswer() async {
    await HapticFeedback.mediumImpact();
  }

  /// Heavy tap — for "Big Win" events (dissonance resolution, Fever Mode activation).
  static Future<void> bigWin() async {
    await HapticFeedback.heavyImpact();
  }

  /// Error vibration — for wrong answers (gentle, not punitive).
  static Future<void> errorBuzz() async {
    await HapticFeedback.vibrate();
  }

  /// Rhythmic pulse sequence for Body Base-10 rhythm exercises.
  ///
  /// [pattern]: List of beat durations in milliseconds.
  ///   e.g. Quarter notes at 120 BPM = [500, 500, 500, 500]
  ///   e.g. Dotted rhythm = [750, 250, 750, 250]
  ///
  /// [subdivisions]: If true, includes lighter taps for subdivisions.
  static Future<void> rhythmicPulse({
    required List<int> pattern,
    bool subdivisions = false,
  }) async {
    for (int i = 0; i < pattern.length; i++) {
      final beatMs = pattern[i];

      // Strong beat: heavy impact.
      if (i % 4 == 0) {
        await HapticFeedback.heavyImpact();
      }
      // Moderate beat.
      else if (i % 2 == 0) {
        await HapticFeedback.mediumImpact();
      }
      // Weak beat / subdivision.
      else {
        await HapticFeedback.lightImpact();
      }

      // Wait for the beat duration before next pulse.
      await Future.delayed(Duration(milliseconds: beatMs));
    }
  }

  /// Generate a metronome-style pulse pattern for a given BPM and time signature.
  ///
  /// Returns a list of beat durations in milliseconds suitable for [rhythmicPulse].
  static List<int> metronomPattern({
    required int bpm,
    required int beatsPerMeasure,
    int measures = 1,
  }) {
    final beatMs = (60000 / bpm).round();
    return List.filled(beatsPerMeasure * measures, beatMs);
  }

  /// Haptic confirmation for Fever Mode activation: three rapid heavy impacts.
  static Future<void> feverModeActivation() async {
    for (int i = 0; i < 3; i++) {
      await HapticFeedback.heavyImpact();
      await Future.delayed(const Duration(milliseconds: 100));
    }
  }

  /// Gentle "breathing" pulse for passive scaffolding invitation.
  /// Two soft taps with a pause — like a heartbeat.
  static Future<void> passiveScaffoldingPulse() async {
    await HapticFeedback.lightImpact();
    await Future.delayed(const Duration(milliseconds: 150));
    await HapticFeedback.lightImpact();
  }
}
