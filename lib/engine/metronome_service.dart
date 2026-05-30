import 'dart:async';

import 'package:flutter_soloud/flutter_soloud.dart';
import 'package:harmony_knight/engine/audio_service.dart';
import 'package:harmony_knight/engine/haptic_engine.dart';
import 'package:harmony_knight/engine/tone_generator.dart';

/// Metronome audio and haptic engine for rhythm exercises.
///
/// Generates a click track at a configurable BPM using SoLoud, with a louder
/// accent on beat 1 of each measure. Fires haptic feedback in sync with each
/// beat when enabled.
///
/// Usage:
///   final m = MetronomeService();
///   await m.initialize();
///   m.start(bpm: 60, beatsPerMeasure: 4, metronomeEnabled: true, hapticEnabled: true);
///   // ... access m.lastBeatTimestamp for tap-offset scoring
///   m.stop();
///   m.dispose();
class MetronomeService {
  final AudioService _audio = AudioService();

  AudioSource? _normalSource;
  AudioSource? _accentSource;
  SoundHandle? _currentHandle;

  Timer? _timer;
  int _currentBeat = 0;
  int _beatsPerMeasure = 4;

  bool _metronomeEnabled = true;
  bool _hapticEnabled = true;

  /// Millisecond timestamp of the most recent beat. Used by RhythmScreen to
  /// compute tap offset for timing-window scoring.
  int lastBeatTimestamp = 0;

  bool get isRunning => _timer != null;

  /// Pre-generate click WAV sources. Call once after AudioService.initialize().
  Future<void> initialize() async {
    if (!_audio.isInitialized) return;
    _normalSource = await _loadClick(0.6);
    _accentSource = await _loadClick(1.0);
  }

  Future<AudioSource?> _loadClick(double volume) async {
    try {
      final samples = ToneGenerator.generateSineTone(
        midiNote: 76, // E5 — GDD spec
        durationMs: 80,
        volume: volume,
      );
      final wav = ToneGenerator.samplesToWav(samples);
      return await _audio.soloud.loadMem('metronome_click_${(volume * 10).round()}.wav', wav);
    } catch (_) {
      return null;
    }
  }

  /// Start the metronome.
  ///
  /// [bpm]: Beats per minute (40–120).
  /// [beatsPerMeasure]: Beats in each measure for accent placement.
  /// [metronomeEnabled]: Whether to play audio clicks.
  /// [hapticEnabled]: Whether to fire haptic feedback.
  void start({
    required int bpm,
    int beatsPerMeasure = 4,
    bool metronomeEnabled = true,
    bool hapticEnabled = true,
  }) {
    stop();
    _beatsPerMeasure = beatsPerMeasure;
    _metronomeEnabled = metronomeEnabled;
    _hapticEnabled = hapticEnabled;
    _currentBeat = 0;

    final periodMs = (60000 / bpm.clamp(40, 120)).round();
    _timer = Timer.periodic(Duration(milliseconds: periodMs), (_) => _onBeat());

    // Fire the first beat immediately.
    _onBeat();
  }

  void _onBeat() {
    lastBeatTimestamp = DateTime.now().millisecondsSinceEpoch;
    final isAccent = _currentBeat % _beatsPerMeasure == 0;

    if (_metronomeEnabled) _playClick(isAccent);
    if (_hapticEnabled) _fireHaptic(isAccent);

    _currentBeat++;
  }

  void _playClick(bool accent) {
    if (!_audio.isInitialized) return;
    final source = accent ? _accentSource : _normalSource;
    if (source == null) return;
    try {
      // Stop previous click before playing the next to avoid overlap.
      if (_currentHandle != null) {
        _audio.soloud.stop(_currentHandle!);
      }
      _audio.soloud.play(source).then((handle) => _currentHandle = handle);
    } catch (_) {
      // Audio is non-critical.
    }
  }

  void _fireHaptic(bool accent) {
    if (accent) {
      HapticEngine.correctAnswer();
    } else {
      HapticEngine.lightTap();
    }
  }

  /// Stop the metronome and silence any playing click.
  void stop() {
    _timer?.cancel();
    _timer = null;
    if (_currentHandle != null && _audio.isInitialized) {
      try {
        _audio.soloud.stop(_currentHandle!);
      } catch (_) {}
      _currentHandle = null;
    }
    _currentBeat = 0;
  }

  /// Update metronome/haptic enabled flags without restarting the timer.
  void updateFlags({bool? metronomeEnabled, bool? hapticEnabled}) {
    if (metronomeEnabled != null) _metronomeEnabled = metronomeEnabled;
    if (hapticEnabled != null) _hapticEnabled = hapticEnabled;
  }

  /// Free SoLoud audio sources.
  void dispose() {
    stop();
    if (_audio.isInitialized) {
      try {
        if (_normalSource != null) _audio.soloud.disposeSource(_normalSource!);
        if (_accentSource != null) _audio.soloud.disposeSource(_accentSource!);
      } catch (_) {}
    }
    _normalSource = null;
    _accentSource = null;
  }
}
