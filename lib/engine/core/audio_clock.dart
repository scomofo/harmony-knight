/// The single source of truth for timing in Harmony Knight.
///
/// CRITICAL: Every timing decision in the game must flow through an
/// AudioClock. System clocks, DateTime.now(), Stopwatch — all forbidden
/// in gameplay code. The audio backend defines "now" because audio is
/// what the player hears, and synchronization to audio is the entire game.
///
/// Implementations wrap the underlying audio engine (just_audio, soloud, etc.)
/// and expose a single monotonic time value in seconds since track start.
abstract class AudioClock {
  /// Current audio playback position, in seconds since track start.
  ///
  /// Must be monotonically non-decreasing during normal playback.
  /// Must return the same value if called twice within a single frame
  /// (deterministic within a frame).
  double now();

  /// Whether audio is currently playing (not paused, not stopped).
  bool get isPlaying;

  /// Track duration in seconds. Returns 0.0 if unknown.
  double get duration;
}

/// A stub clock for testing and headless simulation.
/// Advances only when [advance] is called explicitly.
class StubAudioClock implements AudioClock {
  double _time = 0.0;
  bool _playing = true;
  double _duration = 0.0;

  @override
  double now() => _time;

  @override
  bool get isPlaying => _playing;

  @override
  double get duration => _duration;

  void advance(double deltaSeconds) {
    _time += deltaSeconds;
  }

  void seek(double seconds) {
    _time = seconds;
  }

  void setDuration(double seconds) {
    _duration = seconds;
  }

  void pause() => _playing = false;
  void play() => _playing = true;
}
