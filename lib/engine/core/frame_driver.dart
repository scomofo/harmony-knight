import 'package:flutter/scheduler.dart';

import '../audio/audio_service.dart';
import '../core/game_engine.dart';
import '../core/input_frame.dart';
import '../input/input_system.dart';

/// Drives the deterministic game loop from Flutter's render ticker.
///
/// Each frame:
///   1. Read the audio clock → get [time]
///   2. Read the latest input frame (already timestamped by input system)
///   3. Call engine.update(time, input)
///   4. Notify listeners with the new EngineState
///
/// UI layers subscribe to [state] to rebuild on each frame. This is the
/// ONLY layer that combines audio, input, and engine. Everywhere else,
/// they stay decoupled.
class FrameDriver {
  final AudioService audio;
  final InputSystem input;
  final GameEngine engine;

  Ticker? _ticker;

  /// Latest engine state. UI reads this via [onStateChanged] or by polling.
  EngineState? _latestState;
  EngineState? get latestState => _latestState;

  /// Called after every engine tick with the latest state.
  void Function(EngineState)? onStateChanged;

  FrameDriver({
    required this.audio,
    required this.input,
    required this.engine,
  });

  /// Start the game loop. Caller must ensure:
  ///   - [audio] has loaded a track
  ///   - [input] has started microphone capture
  ///   - [engine] has been initialized with a chart
  void start(TickerProvider vsync) {
    engine.start();
    _ticker = vsync.createTicker(_onTick)..start();
  }

  /// Stop the loop.
  void stop() {
    _ticker?.stop();
    _ticker?.dispose();
    _ticker = null;
    engine.stop();
  }

  void _onTick(Duration _) {
    if (!engine.isRunning) return;

    final time = audio.now();

    // Grab the latest input frame. If the input system hasn't produced
    // a frame yet (e.g., during startup), synthesize a silent one at
    // the current time.
    InputFrame frame = input.latestFrame;
    if (frame.time == 0.0 && time > 0.0) {
      frame = InputFrame.silent(time);
    }

    final state = engine.update(time: time, input: frame);
    _latestState = state;
    onStateChanged?.call(state);
  }
}
