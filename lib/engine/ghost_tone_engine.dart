import 'dart:math';
import 'dart:typed_data';
import 'package:flutter_soloud/flutter_soloud.dart';
import 'package:harmony_knight/engine/audio_service.dart';
import 'package:harmony_knight/engine/tone_generator.dart';

/// The Ghost Tone audio scaffolding engine.
///
/// Ghost Tones are assistive audio cues that help the user find the correct
/// pitch. As confidence increases, the ghost tone fades out:
///
/// - 0% confidence: Loud ghost tone with 200ms pre-roll, full harmonic spectrum.
/// - 50% confidence: Volume drops -6dB, no pre-roll, LPF thins harmonics.
/// - 100% confidence: Muted (sight-singing / blind-play solo).
///
/// Uses SoLoud for real-time audio playback with procedurally generated
/// waveforms (no sample files needed).
class GhostToneEngine {
  final AudioService _audioService = AudioService();

  /// Cache of generated audio sources keyed by MIDI note.
  final Map<int, AudioSource> _sourceCache = {};

  /// Currently playing sound handle (for stopping/volume control).
  SoundHandle? _currentHandle;

  /// Initialize the audio engine. Call once at app start.
  Future<void> initialize() async {
    await _audioService.initialize();
  }

  /// Calculate ghost tone volume (linear 0.0 to 1.0) based on confidence.
  double ghostToneVolume(double confidence) {
    if (confidence >= 1.0) return 0.0;
    // Exponential curve: -6dB at 50% confidence.
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
    return maxCutoff * pow(minCutoff / maxCutoff, confidence);
  }

  /// Compute ghost tone parameters without playing.
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

  /// Play a ghost tone for the given MIDI note at the current confidence level.
  Future<void> playGhostTone({
    required int midiNote,
    required double confidence,
  }) async {
    if (!_audioService.isInitialized) return;
    final params = computeParams(midiNote: midiNote, confidence: confidence);
    if (params.isMuted) return;

    // Stop any currently playing ghost tone.
    await stopCurrentTone();

    // Pre-roll delay (helps ADHD learners find the pitch before it plays).
    if (params.preRollMs > 0) {
      await Future.delayed(Duration(milliseconds: params.preRollMs));
    }

    try {
      // Generate or retrieve cached audio source.
      final source = await _getOrCreateSource(midiNote, params.lowPassCutoffHz);

      // Play with the computed volume.
      _currentHandle = await _audioService.soloud.play(
        source,
        volume: params.volume,
      );
    } catch (e) {
      // Audio playback is non-critical; silently degrade.
    }
  }

  /// Play a simple reference tone (used for interval comparisons, feedback).
  Future<void> playReferenceTone({
    required int midiNote,
    double volume = 0.8,
    int durationMs = 500,
  }) async {
    if (!_audioService.isInitialized) return;

    try {
      final source = await _getOrCreateSource(midiNote, 20000);
      _currentHandle = await _audioService.soloud.play(
        source,
        volume: volume,
      );
      // Auto-stop after duration.
      Future.delayed(Duration(milliseconds: durationMs), () {
        stopCurrentTone();
      });
    } catch (e) {
      // Non-critical.
    }
  }

  /// Stop the currently playing ghost tone.
  Future<void> stopCurrentTone() async {
    if (_currentHandle != null && _audioService.isInitialized) {
      try {
        _audioService.soloud.stop(_currentHandle!);
      } catch (e) {
        // Already stopped or invalid handle.
      }
      _currentHandle = null;
    }
  }

  /// Get or create a cached audio source for a MIDI note.
  Future<AudioSource> _getOrCreateSource(int midiNote, double lpfCutoff) async {
    // Generate harmonic tone with LPF applied.
    final samples = ToneGenerator.generateHarmonicTone(
      midiNote: midiNote,
      durationMs: 1500,
      volume: 0.9,
      harmonics: 6,
    );

    // Apply the confidence-based low-pass filter.
    final filtered = ToneGenerator.applyLowPassFilter(
      samples,
      cutoffHz: lpfCutoff,
    );

    // Convert to WAV bytes for SoLoud.
    final wavBytes = ToneGenerator.samplesToWav(filtered);

    // Load into SoLoud from memory.
    final source = await _audioService.soloud.loadMem(
      'ghost_tone_$midiNote.wav',
      wavBytes,
    );

    return source;
  }

  void dispose() {
    stopCurrentTone();
    // Dispose cached sources.
    for (final source in _sourceCache.values) {
      _audioService.soloud.disposeSource(source);
    }
    _sourceCache.clear();
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
