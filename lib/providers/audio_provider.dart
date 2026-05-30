import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:harmony_knight/engine/audio_service.dart';
import 'package:harmony_knight/engine/ghost_tone_engine.dart';
import 'package:harmony_knight/engine/pitch_detector.dart';
import 'package:harmony_knight/engine/sound_feedback_service.dart';

/// Provider for the audio service singleton.
final audioServiceProvider = Provider<AudioService>((ref) {
  final service = AudioService();
  ref.onDispose(() => service.dispose());
  return service;
});

/// Provider for the ghost tone engine.
final ghostToneProvider = Provider<GhostToneEngine>((ref) {
  final engine = GhostToneEngine();
  ref.onDispose(() => engine.dispose());
  return engine;
});

/// Provider for answer feedback tones (correct/wrong).
final soundFeedbackProvider = Provider<SoundFeedbackService>((ref) {
  final service = SoundFeedbackService();
  ref.onDispose(() => service.dispose());
  return service;
});

/// Provider for the pitch detector.
final pitchDetectorProvider = Provider<PitchDetector>((ref) {
  return PitchDetector();
});

/// Audio initialization state — tracks whether the engine is ready.
class AudioInitNotifier extends StateNotifier<AsyncValue<void>> {
  final AudioService _audioService;
  final GhostToneEngine _ghostToneEngine;
  final SoundFeedbackService _soundFeedback;

  AudioInitNotifier(this._audioService, this._ghostToneEngine, this._soundFeedback)
      : super(const AsyncValue.loading());

  Future<void> initialize() async {
    state = const AsyncValue.loading();
    try {
      await _audioService.initialize();
      await _ghostToneEngine.initialize();
      await _soundFeedback.initialize();
      state = const AsyncValue.data(null);
    } catch (e, st) {
      // Audio failure is non-critical — app works without sound.
      state = AsyncValue.error(e, st);
    }
  }
}

final audioInitProvider =
    StateNotifierProvider<AudioInitNotifier, AsyncValue<void>>((ref) {
  final audioService = ref.read(audioServiceProvider);
  final ghostTone = ref.read(ghostToneProvider);
  final soundFeedback = ref.read(soundFeedbackProvider);
  return AudioInitNotifier(audioService, ghostTone, soundFeedback);
});
