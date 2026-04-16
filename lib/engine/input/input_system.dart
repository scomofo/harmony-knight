import 'dart:async';

import 'package:flutter_audio_capture/flutter_audio_capture.dart';
import 'package:pitch_detector_dart/pitch_detector.dart';

import '../core/audio_clock.dart';
import '../core/input_frame.dart';

/// The input system — captures microphone audio, runs pitch detection,
/// and produces time-aligned [InputFrame] objects.
///
/// Critical rules:
///   - Every emitted frame MUST carry an audio-clock timestamp, not wall time.
///   - Frames are produced at a fixed rate (sampleRate / bufferSize Hz).
///   - Silence produces [InputFrame.silent], not null — the engine always
///     gets a frame per tick.
class InputSystem {
  final AudioClock clock;
  final int sampleRate;
  final int bufferSize;

  final _audioCapture = FlutterAudioCapture();
  late final PitchDetector _detector;

  final StreamController<InputFrame> _frameCtrl =
      StreamController<InputFrame>.broadcast();

  /// Most recent frame. Engine reads this each update() — it does NOT
  /// subscribe to the stream, because stream delivery is async and we
  /// want deterministic per-frame reads.
  InputFrame _latest = const InputFrame(time: 0.0);

  bool _running = false;

  InputSystem({
    required this.clock,
    this.sampleRate = 44100,
    this.bufferSize = 2048,
  }) {
    _detector = PitchDetector(
      audioSampleRate: sampleRate.toDouble(),
      bufferSize: bufferSize,
    );
  }

  /// The latest frame captured. Engine reads this each update.
  InputFrame get latestFrame => _latest;

  /// Stream of all frames (for debug overlays and analytics).
  Stream<InputFrame> get frames => _frameCtrl.stream;

  bool get isRunning => _running;

  Future<void> start() async {
    if (_running) return;
    await _audioCapture.start(
      _onAudio,
      _onError,
      sampleRate: sampleRate,
      bufferSize: bufferSize,
    );
    _running = true;
  }

  Future<void> stop() async {
    if (!_running) return;
    await _audioCapture.stop();
    _running = false;
  }

  Future<void> dispose() async {
    await stop();
    await _frameCtrl.close();
  }

  void _onAudio(dynamic buffer) {
    // [buffer] is a list of Float32 samples (or List<double>).
    final List<double> samples = _toDoubleList(buffer);
    if (samples.isEmpty) return;

    // Snapshot the audio clock AT the moment of capture — this is our
    // time alignment point.
    final t = clock.now();

    // Compute amplitude (RMS, for silence detection).
    final amp = _rms(samples);

    // Run pitch detection. Returns (pitch, probability) or similar.
    // Package API: getPitch(List<double>) -> PitchDetectorResult
    final result = _detector.getPitch(samples);
    final frequency = result.pitched ? result.pitch : null;
    final confidence = result.pitched ? result.probability : 0.0;

    final frame = InputFrame(
      time: t,
      frequency: frequency,
      confidence: confidence,
      amplitude: amp,
    );

    _latest = frame;
    if (!_frameCtrl.isClosed) _frameCtrl.add(frame);
  }

  void _onError(Object e) {
    // Non-fatal — push a silent frame so the engine keeps ticking.
    _latest = InputFrame.silent(clock.now());
  }

  List<double> _toDoubleList(dynamic buffer) {
    if (buffer is List<double>) return buffer;
    if (buffer is List) return buffer.map((e) => (e as num).toDouble()).toList();
    return const [];
  }

  double _rms(List<double> samples) {
    if (samples.isEmpty) return 0.0;
    double sumSq = 0.0;
    for (final s in samples) {
      sumSq += s * s;
    }
    final mean = sumSq / samples.length;
    // sqrt without dart:math dep — use fast approximation.
    return _fastSqrt(mean);
  }

  double _fastSqrt(double x) {
    if (x <= 0) return 0.0;
    double r = x;
    for (int i = 0; i < 8; i++) {
      r = 0.5 * (r + x / r);
    }
    return r;
  }
}

/// A stub input system for tests. Emits the frames you hand it, in order.
class StubInputSystem {
  final List<InputFrame> _queue = [];

  InputFrame _latest = const InputFrame(time: 0.0);
  InputFrame get latestFrame => _latest;

  void enqueue(InputFrame frame) => _queue.add(frame);

  /// Call once per tick. Dequeues the next frame if one is ready for
  /// [currentTime], otherwise returns a silent frame at [currentTime].
  InputFrame tick(double currentTime) {
    if (_queue.isNotEmpty && _queue.first.time <= currentTime) {
      _latest = _queue.removeAt(0);
    } else {
      _latest = InputFrame.silent(currentTime);
    }
    return _latest;
  }

  void clear() => _queue.clear();
}
