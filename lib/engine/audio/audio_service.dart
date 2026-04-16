import 'dart:async';

import 'package:just_audio/just_audio.dart';

import '../core/audio_clock.dart';

/// Audio playback service backed by [just_audio].
///
/// This is the single source of truth for gameplay time. Other systems
/// (renderer, scoring, input timestamping) all read from this clock.
///
/// Known limitations of just_audio's timing:
///   - [AudioPlayer.position] is updated by the platform and polled
///     via a stream. Between poll events we extrapolate using a
///     [Stopwatch] anchored at the last known position+timestamp.
///   - Latency varies by platform; tune [outputLatencySeconds] per platform
///     if you observe consistent drift during calibration.
class AudioService implements AudioClock {
  final AudioPlayer _player = AudioPlayer();

  /// Platform output latency (seconds). Subtracted from the playhead
  /// so gameplay time matches what the player actually hears.
  /// Typical values: iOS ~40ms, Android ~100ms, web ~150ms.
  double outputLatencySeconds;

  /// Last known platform-reported position, in seconds.
  double _lastKnownPosition = 0.0;

  /// High-resolution stopwatch anchored at the moment we learned
  /// [_lastKnownPosition]. Used for sub-poll-interval extrapolation.
  final Stopwatch _stopwatch = Stopwatch();

  StreamSubscription<Duration>? _positionSub;
  StreamSubscription<PlayerState>? _stateSub;

  bool _playing = false;
  double _duration = 0.0;

  AudioService({this.outputLatencySeconds = 0.0}) {
    _positionSub = _player.positionStream.listen(_onPosition);
    _stateSub = _player.playerStateStream.listen(_onStateChanged);
  }

  void _onPosition(Duration d) {
    _lastKnownPosition = d.inMicroseconds / 1e6;
    _stopwatch
      ..reset()
      ..start();
  }

  void _onStateChanged(PlayerState state) {
    _playing = state.playing;
    if (!_playing) {
      // Freeze the extrapolation when paused.
      _stopwatch.stop();
    } else if (!_stopwatch.isRunning) {
      _stopwatch.start();
    }
  }

  /// Load an audio file from the given URL or asset.
  Future<void> load(String path, {bool isAsset = false}) async {
    if (isAsset) {
      await _player.setAsset(path);
    } else {
      await _player.setUrl(path);
    }
    final d = _player.duration;
    _duration = d == null ? 0.0 : d.inMicroseconds / 1e6;
  }

  Future<void> play() async {
    _stopwatch.start();
    await _player.play();
  }

  Future<void> pause() async {
    await _player.pause();
    _stopwatch.stop();
  }

  Future<void> stop() async {
    await _player.stop();
    _stopwatch
      ..stop()
      ..reset();
    _lastKnownPosition = 0.0;
  }

  Future<void> seek(double seconds) async {
    await _player.seek(Duration(microseconds: (seconds * 1e6).round()));
    _lastKnownPosition = seconds;
    _stopwatch
      ..reset()
      ..start();
  }

  @override
  double now() {
    // Base position comes from the platform; stopwatch fills in the
    // gap between position stream events for sub-frame accuracy.
    final extrapolated =
        _playing ? _stopwatch.elapsedMicroseconds / 1e6 : 0.0;
    final raw = _lastKnownPosition + extrapolated;
    // Shift by output latency: what the player hears *now* was scheduled
    // [latency] seconds ago. Clamp to zero to avoid negative times near start.
    final corrected = (raw - outputLatencySeconds).clamp(0.0, double.infinity);
    return corrected;
  }

  @override
  bool get isPlaying => _playing;

  @override
  double get duration => _duration;

  /// Exposes the raw just_audio position stream for UI components that
  /// want to react to playback changes (e.g., loading indicators).
  Stream<Duration> get positionStream => _player.positionStream;

  Future<void> dispose() async {
    await _positionSub?.cancel();
    await _stateSub?.cancel();
    await _player.dispose();
  }
}
