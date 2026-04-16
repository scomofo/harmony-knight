# Engine integration

This directory contains the deterministic real-time gameplay engine for Harmony Knight. Drop it into `lib/engine/` and wire it up as described below.

## Required dependencies

Add these to `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  just_audio: ^0.9.36
  flutter_audio_capture: ^1.1.11
  pitch_detector_dart: ^2.0.0
  shared_preferences: ^2.2.0  # already added for player_progress

dev_dependencies:
  flutter_test:
    sdk: flutter
```

Then:
```bash
flutter pub get
```

## Platform permissions

### iOS — `ios/Runner/Info.plist`

```xml
<key>NSMicrophoneUsageDescription</key>
<string>Harmony Knight listens to your singing to give real-time feedback.</string>
```

### Android — `android/app/src/main/AndroidManifest.xml`

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO"/>
<uses-permission android:name="android.permission.INTERNET"/>
```

## Minimal integration example

Here's how a gameplay screen wires the engine together. Drop this into `lib/screens/gameplay_screen.dart`:

```dart
import 'package:flutter/material.dart';

import '../engine/audio/audio_service.dart';
import '../engine/charting/chart.dart';
import '../engine/charting/chart_generator.dart';
import '../engine/core/frame_driver.dart';
import '../engine/core/game_engine.dart';
import '../engine/debug/debug_overlay.dart';
import '../engine/input/input_system.dart';
import '../engine/rendering/note_highway.dart';

class GameplayScreen extends StatefulWidget {
  final Chart chart;
  const GameplayScreen({super.key, required this.chart});

  @override
  State<GameplayScreen> createState() => _GameplayScreenState();
}

class _GameplayScreenState extends State<GameplayScreen>
    with SingleTickerProviderStateMixin {
  late final AudioService _audio;
  late final InputSystem _input;
  late final GameEngine _engine;
  late final FrameDriver _driver;
  final _highway = const NoteHighwayRenderer();

  EngineState? _state;

  @override
  void initState() {
    super.initState();
    _audio = AudioService(outputLatencySeconds: 0.08); // tune per platform
    _input = InputSystem(clock: _audio);
    _engine = GameEngine(chart: widget.chart);
    _driver = FrameDriver(audio: _audio, input: _input, engine: _engine)
      ..onStateChanged = (s) {
        if (mounted) setState(() => _state = s);
      };

    _boot();
  }

  Future<void> _boot() async {
    if (widget.chart.audioPath != null) {
      await _audio.load(widget.chart.audioPath!, isAsset: true);
    }
    await _input.start();
    await _audio.play();
    _driver.start(this);
  }

  @override
  void dispose() {
    _driver.stop();
    _input.dispose();
    _audio.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = _state;
    if (state == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      body: Stack(
        children: [
          // Note highway — render via your own CustomPainter using state.
          CustomPaint(
            painter: _HighwayPainter(
              notes: _highway.render(state),
            ),
            size: Size.infinite,
          ),

          // Feedback overlay (early/late/sharp/flat).
          if (state.latestFeedback != null)
            Positioned(
              top: 100,
              left: 0,
              right: 0,
              child: Center(
                child: Text(
                  state.latestFeedback!.gentleMessage,
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
              ),
            ),

          // Always-available debug overlay (gate behind flag in prod).
          EngineDebugOverlay(state: state),
        ],
      ),
    );
  }
}

class _HighwayPainter extends CustomPainter {
  final List<RenderNote> notes;
  _HighwayPainter({required this.notes});

  @override
  void paint(Canvas canvas, Size size) {
    final hitLineY = size.height * 0.8;
    final paint = Paint()..color = Colors.blueAccent;
    for (final rn in notes) {
      // yPosition comes from (note.time - audioTime) * scrollSpeed.
      // Subtract from hitLineY so future notes appear above it.
      final y = hitLineY - rn.yPosition;
      final x = (rn.note.lane + 0.5) * (size.width / 4);
      canvas.drawCircle(Offset(x, y), 20, paint);
    }
  }

  @override
  bool shouldRepaint(_HighwayPainter old) => true; // state changes every tick
}
```

## Testing headless

Because everything is driven by `AudioClock` (interface) and `InputSystem` (stubbable), you can run the entire engine in a test without audio hardware:

```dart
final chart = ChartGenerator.buildTestChart(noteCount: 10);
final engine = GameEngine(chart: chart)..start();
final clock = StubAudioClock();
final input = StubInputSystem();

// Enqueue a perfect A4 hit at t=5.0
input.enqueue(const InputFrame(
  time: 5.0, frequency: 440.0, confidence: 0.9, amplitude: 0.3,
));

// Run for 10 simulated seconds at 60fps.
for (int i = 0; i < 600; i++) {
  clock.advance(1.0 / 60.0);
  final frame = input.tick(clock.now());
  engine.update(time: clock.now(), input: frame);
}

print(engine.stats.toJson());
```

## Calibration

The biggest unknown is platform output latency. Run this calibration flow:

1. Play a metronome track via `AudioService`
2. Player taps in sync with the clicks
3. Measure the mean `timingErrorMs` across ~20 taps
4. Update `AudioService.outputLatencySeconds` to compensate

Typical starting values:
- iOS: 0.04 (40ms)
- Android: 0.10 (100ms)
- Web: 0.15 (150ms)

## File layout

```
lib/engine/
├── core/
│   ├── audio_clock.dart         # interface + StubAudioClock
│   ├── chart_note.dart          # single note, MIDI↔Hz
│   ├── input_frame.dart         # time-aligned pitch output
│   ├── hit_result.dart          # HitRating + HitWindows
│   ├── note_tracker.dart        # active/upcoming/resolved
│   ├── scoring_engine.dart      # (lives under scoring/)
│   ├── game_engine.dart         # THE deterministic loop
│   └── frame_driver.dart        # ties audio+input+engine
├── audio/
│   └── audio_service.dart       # just_audio + AudioClock impl
├── input/
│   └── input_system.dart        # mic + pitch_detector
├── scoring/
│   └── scoring_engine.dart      # evaluate(note, input, time)
├── feedback/
│   └── feedback_frame.dart      # early/late/sharp/flat messages
├── rendering/
│   └── note_highway.dart        # y = (note.time - audioTime) * speed
├── debug/
│   └── debug_overlay.dart       # real-time state inspector
├── adaptive/
│   └── adaptive_analyzer.dart   # POST-SESSION only
└── charting/
    ├── chart.dart               # immutable chart container
    └── chart_generator.dart     # music21 bridge, test charts
```

## What's deliberately NOT here

- **System clock timing** — every time source is `AudioClock`
- **Async in the gameplay loop** — `GameEngine.update` is synchronous
- **Chart generation during play** — all charts precomputed
- **Providers in gameplay** — FrameDriver holds refs directly

## What still needs work

1. **Audio latency calibration flow** — user-facing screen to measure platform latency
2. **Lower-latency audio backend** — `AudioClock` interface lets you swap `just_audio` for `flutter_soloud` later
3. **Custom painter for note highway** — the example above is a placeholder
4. **Haptics integration** — hook `engine.onNoteResolved` to trigger haptic feedback
5. **Session end flow** — call `AdaptiveAnalyzer().analyze(...)` and save `SessionInsights`
