import 'dart:math';

/// The Ghost Tone audio scaffolding engine.
///
/// Ghost Tones are assistive audio cues that help the user find the correct
/// pitch. As confidence increases, the ghost tone fades out:
///
/// - 0% confidence: Loud ghost tone with 200ms pre-roll.
/// - 50% confidence: Volume drops -6dB, no pre-roll.
/// - 100% confidence: Muted (sight-singing / blind-play solo).
///
/// A Low-Pass Filter "thins out" the harmonic richness as confidence grows,
/// making the assistance progressively less hand-hold-y.
class GhostToneEngine {
  /// Whether the engine is initialized and ready to play.
  bool _isInitialized = false;

  /// Initialize the audio engine. Call once at app start.
  Future<void> initialize() async {
    // In production, this initializes flutter_soloud or audioplayers.
    // For now, we track state for the logic layer.
    _isInitialized = true;
  }

  /// Calculate ghost tone volume (linear 0.0 to 1.0) based on confidence.
  double ghostToneVolume(double confidence) {
    if (confidence >= 1.0) return 0.0;
    // Linear fade from 1.0 at 0% confidence to 0.0 at 100%.
    // With a -6dB drop at 50% (half perceived loudness).
    // -6dB ≈ 0.5 linear, so we use an exponential curve.
    return pow(1.0 - confidence, 1.5).toDouble();
  }

  /// Calculate the pre-roll duration in milliseconds based on confidence.
  /// 200ms at 0%, tapering to 0ms by 50%.
  int preRollMs(double confidence) {
    if (confidence >= 0.5) return 0;
    return (200 * (1.0 - confidence * 2)).round();
  }

  /// Calculate Low-Pass Filter cutoff frequency (Hz) based on confidence.
  ///
  /// At 0% confidence: Full spectrum (20kHz) — rich, warm assistance.
  /// At 100%: Heavily filtered (200Hz) — thin, barely audible (muted anyway).
  double lowPassCutoffHz(double confidence) {
    const double maxCutoff = 20000.0;
    const double minCutoff = 200.0;
    // Exponential decay of harmonic richness.
    return maxCutoff * pow(minCutoff / maxCutoff, confidence);
  }

  /// Play a ghost tone for the given MIDI note at the current confidence level.
  ///
  /// Returns the parameters that would be sent to the audio backend.
  GhostToneParams computeParams({
    required int midiNote,
    required double confidence,
  }) {
    return GhostToneParams(
      midiNote: midiNote,
      volume: ghostToneVolume(confidence),
      preRollMs: preRollMs(confidence),
      lowPassCutoffHz: lowPassCutoffHz(confidence),
      isMuted: confidence >= 1.0,
    );
  }

  /// Play the ghost tone. In production, this triggers the audio backend.
  Future<void> playGhostTone({
    required int midiNote,
    required double confidence,
  }) async {
    if (!_isInitialized) return;
    final params = computeParams(midiNote: midiNote, confidence: confidence);
    if (params.isMuted) return;

    // Pre-roll delay.
    if (params.preRollMs > 0) {
      await Future.delayed(Duration(milliseconds: params.preRollMs));
    }

    // TODO: Integrate with flutter_soloud for actual audio playback.
    // SoLoud.instance.play(source, volume: params.volume);
    // SoLoud.instance.setFilterParameter(lowPassCutoff: params.lowPassCutoffHz);
  }

  void dispose() {
    _isInitialized = false;
  }
}

/// Parameters for a ghost tone playback event.
class GhostToneParams {
  final int midiNote;
  final double volume;
  final int preRollMs;
  final double lowPassCutoffHz;
  final bool isMuted;

  const GhostToneParams({
    required this.midiNote,
    required this.volume,
    required this.preRollMs,
    required this.lowPassCutoffHz,
    required this.isMuted,
  });

  @override
  String toString() =>
      'GhostTone(midi=$midiNote, vol=${volume.toStringAsFixed(2)}, '
      'preRoll=${preRollMs}ms, lpf=${lowPassCutoffHz.round()}Hz, '
      'muted=$isMuted)';
}
