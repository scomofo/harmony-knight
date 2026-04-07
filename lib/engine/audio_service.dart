import 'package:flutter_soloud/flutter_soloud.dart';

/// Singleton audio service wrapping SoLoud for the entire app.
///
/// Manages initialization, shutdown, and provides access to the
/// shared SoLoud instance for Ghost Tones, UI sounds, and playback.
class AudioService {
  static final AudioService _instance = AudioService._internal();
  factory AudioService() => _instance;
  AudioService._internal();

  SoLoud get soloud => SoLoud.instance;
  bool _isInitialized = false;

  bool get isInitialized => _isInitialized;

  /// Initialize the SoLoud audio engine. Call once at app startup.
  Future<void> initialize() async {
    if (_isInitialized) return;
    await soloud.init();
    _isInitialized = true;
  }

  /// Shut down the audio engine. Call on app dispose.
  Future<void> dispose() async {
    if (!_isInitialized) return;
    soloud.deinit();
    _isInitialized = false;
  }
}
