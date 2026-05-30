import 'package:flutter_soloud/flutter_soloud.dart';
import 'package:harmony_knight/engine/audio_service.dart';
import 'package:harmony_knight/engine/tone_generator.dart';

/// Short audio reward/error tones for answer feedback in practice and duel.
///
/// Correct: bright E4 tone (300ms) — pleasant, musical reinforcement.
/// Wrong:   low F2 tone  (150ms) — soft, non-punitive error signal.
///
/// Both clips are pre-generated at init so playback is instant with no
/// allocation on the answer path.
class SoundFeedbackService {
  final AudioService _audio = AudioService();

  AudioSource? _correctSource;
  AudioSource? _wrongSource;

  Future<void> initialize() async {
    if (!_audio.isInitialized) return;
    _correctSource = await _loadTone(midiNote: 64, durationMs: 300, volume: 0.65);
    _wrongSource   = await _loadTone(midiNote: 41, durationMs: 150, volume: 0.5);
  }

  Future<AudioSource?> _loadTone({
    required int midiNote,
    required int durationMs,
    required double volume,
  }) async {
    try {
      final samples = ToneGenerator.generateSineTone(
        midiNote: midiNote,
        durationMs: durationMs,
        volume: volume,
      );
      final wav = ToneGenerator.samplesToWav(samples);
      return await _audio.soloud.loadMem(
        'sfx_${midiNote}_${durationMs}ms.wav',
        wav,
      );
    } catch (_) {
      return null;
    }
  }

  void playCorrect() => _play(_correctSource);
  void playWrong()   => _play(_wrongSource);

  void _play(AudioSource? source) {
    if (source == null || !_audio.isInitialized) return;
    try {
      _audio.soloud.play(source);
    } catch (_) {}
  }

  void dispose() {
    if (!_audio.isInitialized) return;
    try {
      if (_correctSource != null) _audio.soloud.disposeSource(_correctSource!);
      if (_wrongSource   != null) _audio.soloud.disposeSource(_wrongSource!);
    } catch (_) {}
    _correctSource = null;
    _wrongSource   = null;
  }
}
