import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:harmony_knight/engine/audio_service.dart';
import 'package:harmony_knight/engine/ghost_tone_engine.dart';
import 'package:harmony_knight/engine/pitch_detector.dart';

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

/// Provider for the pitch detector.
final pitchDetectorProvider = Provider<PitchDetector>((ref) {
  return PitchDetector();
});

/// Audio initialization state — tracks whether the engine is ready.
class AudioInitNotifier extends StateNotifier<AsyncValue<void>> {
  final AudioService _audioService;
  final GhostToneEngine _ghostToneEngine;

  AudioInitNotifier(this._audioService, this._ghostToneEngine)
      : super(const AsyncValue.loading());

  Future<void> initialize() async {
    state = const AsyncValue.loading();
    try {
      await _audioService.initialize();
      await _ghostToneEngine.initialize();
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
  return AudioInitNotifier(audioService, ghostTone);
});
