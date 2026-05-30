import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:harmony_knight/engine/charting/chart.dart';
import 'package:harmony_knight/engine/charting/chart_generator.dart';
import 'package:harmony_knight/engine/core/chart_note.dart';
import 'package:harmony_knight/engine/core/game_engine.dart';
import 'package:harmony_knight/engine/core/input_frame.dart';
import 'package:harmony_knight/engine/rendering/note_highway.dart';
import 'package:harmony_knight/models/quest.dart';
import 'package:harmony_knight/providers/quest_provider.dart';

class GameplayScreen extends ConsumerStatefulWidget {
  const GameplayScreen({super.key});

  @override
  ConsumerState<GameplayScreen> createState() => _GameplayScreenState();
}

class _GameplayScreenState extends ConsumerState<GameplayScreen>
    with SingleTickerProviderStateMixin {
  static const _laneColors = [
    Color(0xFF4FC3F7),
    Color(0xFFFFD54F),
    Color(0xFFFF6F00),
    Color(0xFF7C4DFF),
  ];

  late final Chart _chart;
  late final GameEngine _engine;
  late final Ticker _ticker;
  late EngineState _state;

  Duration? _lastElapsed;
  double _time = 0;
  String _status = 'Tap the lit lane as notes cross the strike line.';

  @override
  void initState() {
    super.initState();
    _chart = ChartGenerator.buildTestChart(
      title: 'Real-Time Training',
      noteCount: 12,
      spacing: 0.85,
      startMidi: 60,
    );
    _engine = GameEngine(chart: _chart);
    _state = EngineState(
      time: 0,
      activeNotes: const [],
      upcomingNotes: _chart.notes.take(8).toList(growable: false),
      stats: _engine.stats,
      progress: 0,
      running: false,
    );
    _ticker = createTicker(_tick);
  }

  @override
  void dispose() {
    _ticker.dispose();
    super.dispose();
  }

  void _startRun() {
    _engine.reset();
    _engine.start();
    _time = 0;
    _lastElapsed = null;
    _status = 'Run started. Watch the strike line.';
    _updateEngine(const InputFrame.silent(0));
    _ticker.start();
  }

  void _stopRun() {
    _ticker.stop();
    _engine.stop();
    setState(() {
      _state = _engine.update(
        time: _time,
        input: InputFrame.silent(_time),
      );
      _status = _state.progress >= 1 ? 'Run complete.' : 'Run paused.';
    });
  }

  void _tick(Duration elapsed) {
    if (!_engine.isRunning) return;
    final delta =
        _lastElapsed == null ? Duration.zero : elapsed - _lastElapsed!;
    _lastElapsed = elapsed;
    _time += delta.inMicroseconds / Duration.microsecondsPerSecond;

    _updateEngine(InputFrame.silent(_time));

    if (_state.progress >= 1 || _time > _chart.durationSeconds + 0.3) {
      _stopRun();
    }
  }

  void _tapLane(int lane) {
    if (!_engine.isRunning) {
      _status = 'Start the run first.';
      setState(() {});
      return;
    }

    ChartNote? target;
    for (final note in _state.activeNotes) {
      if (note.lane == lane) {
        target = note;
        break;
      }
    }

    if (target == null) {
      _status = 'Not yet. Wait for the note window.';
      setState(() {});
      return;
    }

    _updateEngine(InputFrame(
      time: _time,
      frequency: target.frequencyHz,
      confidence: 1,
      amplitude: 0.8,
    ));
    ref.read(questProvider.notifier).recordProgress(QuestMode.realtime);
    final rating = _state.latestFeedback?.rating.name.toUpperCase() ?? 'HIT';
    _status = '$rating on ${_noteName(target.midi)}';
  }

  void _updateEngine(InputFrame input) {
    setState(() {
      _state = _engine.update(time: _time, input: input);
    });
  }

  @override
  Widget build(BuildContext context) {
    final stats = _state.stats;
    final accuracy = (stats.accuracy * 100).round();

    return Scaffold(
      backgroundColor: const Color(0xFF0D1117),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => context.go('/'),
        ),
        title: const Text(
          'Real-Time Training',
          style: TextStyle(color: Colors.white),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  _StatPill(label: 'Hits', value: '${stats.totalHits}'),
                  const SizedBox(width: 8),
                  _StatPill(label: 'Misses', value: '${stats.misses}'),
                  const SizedBox(width: 8),
                  _StatPill(label: 'Accuracy', value: '$accuracy%'),
                ],
              ),
              const SizedBox(height: 12),
              Expanded(
                child: CustomPaint(
                  painter: _HighwayPainter(state: _state, colors: _laneColors),
                  child: const SizedBox.expand(),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                _status,
                textAlign: TextAlign.center,
                style:
                    TextStyle(color: Colors.white.withAlpha(190), fontSize: 13),
              ),
              const SizedBox(height: 12),
              Row(
                children: List.generate(4, (lane) {
                  final isActive =
                      _state.activeNotes.any((note) => note.lane == lane);
                  return Expanded(
                    child: Padding(
                      padding: EdgeInsets.only(left: lane == 0 ? 0 : 8),
                      child: _LaneButton(
                        color: _laneColors[lane],
                        label: 'Lane ${lane + 1}',
                        active: isActive,
                        onTap: () => _tapLane(lane),
                      ),
                    ),
                  );
                }),
              ),
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: _engine.isRunning ? _stopRun : _startRun,
                icon: Icon(_engine.isRunning ? Icons.pause : Icons.play_arrow),
                label: Text(_engine.isRunning ? 'Pause Run' : 'Start Run'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatPill extends StatelessWidget {
  final String label;
  final String value;

  const _StatPill({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: const Color(0xFF161B22),
          border: Border.all(color: Colors.white.withAlpha(24)),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          children: [
            Text(
              value,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(
              label,
              style:
                  TextStyle(color: Colors.white.withAlpha(130), fontSize: 11),
            ),
          ],
        ),
      ),
    );
  }
}

class _LaneButton extends StatelessWidget {
  final Color color;
  final String label;
  final bool active;
  final VoidCallback onTap;

  const _LaneButton({
    required this.color,
    required this.label,
    required this.active,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: active ? color.withAlpha(80) : const Color(0xFF161B22),
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          height: 52,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            border: Border.all(color: active ? color : color.withAlpha(80)),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(Icons.music_note, color: color),
        ),
      ),
    );
  }
}

class _HighwayPainter extends CustomPainter {
  final EngineState state;
  final List<Color> colors;
  final NoteHighwayRenderer renderer;

  const _HighwayPainter({
    required this.state,
    required this.colors,
  }) : renderer = const NoteHighwayRenderer(
          scrollSpeedPxPerSec: 120,
          lookAheadSeconds: 3.5,
          lookBehindSeconds: 0.4,
        );

  @override
  void paint(Canvas canvas, Size size) {
    final laneWidth = size.width / colors.length;
    final hitLineY = size.height - 84;
    final lanePaint = Paint()..color = Colors.white.withAlpha(14);
    final linePaint = Paint()
      ..color = Colors.white.withAlpha(170)
      ..strokeWidth = 2;

    for (int lane = 0; lane < colors.length; lane++) {
      final left = lane * laneWidth;
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(left + 3, 0, laneWidth - 6, size.height),
          const Radius.circular(8),
        ),
        lanePaint,
      );
      final divider = Paint()..color = colors[lane].withAlpha(80);
      canvas.drawLine(Offset(left + laneWidth / 2, 0),
          Offset(left + laneWidth / 2, size.height), divider);
    }

    canvas.drawLine(
        Offset(0, hitLineY), Offset(size.width, hitLineY), linePaint);

    for (final renderNote in renderer.render(state)) {
      final note = renderNote.note;
      final x = note.lane * laneWidth + laneWidth / 2;
      final y = hitLineY - renderNote.yPosition;
      if (y < -30 || y > size.height + 30) continue;

      final color = colors[note.lane % colors.length];
      final notePaint = Paint()
        ..color = renderNote.isActive ? color : color.withAlpha(160);
      canvas.drawCircle(Offset(x, y), renderNote.isActive ? 20 : 16, notePaint);
      if (renderNote.isActive) {
        canvas.drawCircle(
          Offset(x, y),
          25,
          Paint()
            ..style = PaintingStyle.stroke
            ..strokeWidth = 3
            ..color = color.withAlpha(180),
        );
      }

      final textPainter = TextPainter(
        text: TextSpan(
          text: _noteName(note.midi),
          style: const TextStyle(
            color: Color(0xFF0D1117),
            fontSize: 11,
            fontWeight: FontWeight.bold,
          ),
        ),
        textDirection: TextDirection.ltr,
      )..layout();
      textPainter.paint(
        canvas,
        Offset(x - textPainter.width / 2, y - textPainter.height / 2),
      );
    }
  }

  @override
  bool shouldRepaint(covariant _HighwayPainter oldDelegate) =>
      oldDelegate.state != state;
}

String _noteName(int midi) {
  const names = [
    'C',
    'C#',
    'D',
    'D#',
    'E',
    'F',
    'F#',
    'G',
    'G#',
    'A',
    'A#',
    'B'
  ];
  return '${names[midi % 12]}${(midi ~/ 12) - 1}';
}
