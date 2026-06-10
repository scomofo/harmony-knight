import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:harmony_knight/engine/metronome_service.dart';
import 'package:harmony_knight/engine/persistence.dart';
import 'package:harmony_knight/providers/scaffolding_provider.dart';
import 'package:harmony_knight/providers/session_prefs_provider.dart';

/// Level 2 Rhythm Exercise Screen.
///
/// The player taps one of four Body Base-10 action buttons (Sway, Nod, Tap,
/// Snap) in time with the metronome click. Each tap is scored against the
/// timing window from the last beat:
///   ≤ 80ms  → Perfect (3 pts)
///   81–160ms → Good   (2 pts)
///   161–300ms → Late  (1 pt)
///   > 300ms  → Miss   (0 pts)
///
/// Wait-Mode: a Miss replays the same beat — the beat counter does not advance.
/// Session ends after [_totalBeats] successful beats.
class RhythmScreen extends ConsumerStatefulWidget {
  const RhythmScreen({super.key});

  @override
  ConsumerState<RhythmScreen> createState() => _RhythmScreenState();
}

class _RhythmScreenState extends ConsumerState<RhythmScreen>
    with SingleTickerProviderStateMixin {
  static const int _totalBeats = 16;
  static const int _beatsPerMeasure = 4;
  static const List<int> _bpmPresets = [40, 60, 80, 100, 120];

  final MetronomeService _metronome = MetronomeService();
  final PersistenceService _persistence = PersistenceService();

  int _selectedBpm = 60;
  bool _bpmChosen = false;

  int _beatsDone = 0;
  int _totalPoints = 0;
  int _maxPoints = 0;

  // Null = waiting for tap; set after each tap.
  String? _lastResult;
  Color _lastResultColor = Colors.white;

  // Beat indicator pulse animation.
  late final AnimationController _pulseController;
  late final Animation<double> _pulseAnimation;

  bool _sessionComplete = false;
  bool _waitMode = false; // True after a Miss — beat counter frozen.

  // Session recording fields (S6-S2).
  late final DateTime _sessionStartTime;
  double _confidenceAtStart = 0.0;

  @override
  void initState() {
    super.initState();
    _sessionStartTime = DateTime.now();

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 120),
    );
    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.3).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeOut),
    );

    WidgetsBinding.instance.addPostFrameCallback((_) async {
      _confidenceAtStart = ref.read(confidenceProvider);
      await _metronome.initialize();
      // Metronome starts only after the player picks a BPM — see _startExercise().
    });
  }

  void _startExercise() {
    final prefs = ref.read(sessionPrefsProvider);
    _metronome.start(
      bpm: _selectedBpm,
      beatsPerMeasure: _beatsPerMeasure,
      metronomeEnabled: prefs.metronomeEnabled,
      hapticEnabled: prefs.hapticEnabled,
    );
    _startBeatPulse();
    setState(() => _bpmChosen = true);
  }

  // Poll the metronome's lastBeatTimestamp to drive the visual pulse.
  int _lastPulsed = 0;
  Timer? _pulsePoller;

  void _startBeatPulse() {
    _pulsePoller = Timer.periodic(const Duration(milliseconds: 20), (_) {
      final ts = _metronome.lastBeatTimestamp;
      if (ts != _lastPulsed && ts > 0) {
        _lastPulsed = ts;
        if (mounted) _pulseController.forward(from: 0);
      }
    });
  }

  void _recordSession() {
    final durationSeconds =
        DateTime.now().difference(_sessionStartTime).inSeconds;
    final grade = ref.read(playerProgressProvider).gradeLevel;
    final confidenceNow = ref.read(confidenceProvider);
    // correctNotes approximated as totalPoints / 3 (Perfect = 3pts per beat).
    final correctNotes = (_totalPoints / 3).round().clamp(0, _totalBeats);
    _persistence.recordSession(SessionRecord(
      startedAt: _sessionStartTime,
      durationSeconds: durationSeconds,
      notesPlayed: _totalBeats,
      correctNotes: correctNotes,
      gradeLevel: grade,
      exerciseType: 'rhythm',
      confidenceAtStart: _confidenceAtStart,
      confidenceAtEnd: confidenceNow,
    ));
  }

  @override
  void dispose() {
    _pulsePoller?.cancel();
    _pulseController.dispose();
    _metronome.dispose();
    super.dispose();
  }

  void _onActionTap() {
    if (_sessionComplete) return;

    final now = DateTime.now().millisecondsSinceEpoch;
    final beatTs = _metronome.lastBeatTimestamp;
    if (beatTs == 0) return; // Metronome hasn't started yet.

    final offsetMs = (now - beatTs).abs();
    _maxPoints += 3;

    String result;
    Color color;
    int points;

    if (offsetMs <= 80) {
      result = 'Perfect';
      color = const Color(0xFF69F0AE);
      points = 3;
    } else if (offsetMs <= 160) {
      result = 'Good';
      color = const Color(0xFF4FC3F7);
      points = 2;
    } else if (offsetMs <= 300) {
      result = 'Late';
      color = const Color(0xFFFFD54F);
      points = 1;
    } else {
      result = 'Miss';
      color = const Color(0xFFFF5252);
      points = 0;
    }

    _totalPoints += points;

    if (points == 0) {
      // Wait-Mode: freeze beat counter, replay same beat.
      setState(() {
        _lastResult = result;
        _lastResultColor = color;
        _waitMode = true;
      });
    } else {
      _beatsDone++;
      _waitMode = false;
      setState(() {
        _lastResult = result;
        _lastResultColor = color;
      });

      if (_beatsDone >= _totalBeats) {
        _metronome.stop();
        _recordSession();
        setState(() => _sessionComplete = true);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0D1117),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () {
            _metronome.stop();
            context.go('/');
          },
        ),
        title: const Text(
          'Rhythm Practice',
          style: TextStyle(color: Colors.white),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Center(
              child: Text(
                !_bpmChosen
                    ? 'Pick a tempo'
                    : _sessionComplete
                        ? 'Done!'
                        : 'Beat ${_beatsDone + 1} / $_totalBeats',
                style: TextStyle(
                  color: Colors.white.withAlpha(180),
                  fontSize: 13,
                ),
              ),
            ),
          ),
        ],
      ),
      body: !_bpmChosen
          ? _buildBpmPicker()
          : _sessionComplete
              ? _buildComplete()
              : _buildExercise(),
    );
  }

  Widget _buildBpmPicker() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.speed, color: Color(0xFF7C4DFF), size: 48),
            const SizedBox(height: 16),
            const Text(
              'Choose your tempo',
              style: TextStyle(
                color: Colors.white,
                fontSize: 22,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Start slow — you can always go faster',
              style:
                  TextStyle(color: Colors.white.withAlpha(140), fontSize: 13),
            ),
            const SizedBox(height: 40),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              alignment: WrapAlignment.center,
              children: _bpmPresets.map((bpm) {
                final selected = bpm == _selectedBpm;
                return GestureDetector(
                  onTap: () => setState(() => _selectedBpm = bpm),
                  child: Container(
                    width: 80,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    decoration: BoxDecoration(
                      color: selected
                          ? const Color(0xFF7C4DFF)
                          : const Color(0xFF7C4DFF).withAlpha(30),
                      border: Border.all(
                        color: const Color(0xFF7C4DFF),
                        width: selected ? 2 : 1,
                      ),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      children: [
                        Text(
                          '$bpm',
                          style: TextStyle(
                            color: selected
                                ? Colors.white
                                : const Color(0xFF7C4DFF),
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          'BPM',
                          style: TextStyle(
                            color: selected
                                ? Colors.white.withAlpha(200)
                                : const Color(0xFF7C4DFF).withAlpha(180),
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 48),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF7C4DFF),
                minimumSize: const Size(200, 52),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: _startExercise,
              child: const Text(
                'Start',
                style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildExercise() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        // Beat indicator circle.
        _buildBeatIndicator(),
        const SizedBox(height: 8),

        // Wait-Mode badge.
        AnimatedOpacity(
          opacity: _waitMode ? 1.0 : 0.0,
          duration: const Duration(milliseconds: 200),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            decoration: BoxDecoration(
              color: const Color(0xFFFF5252).withAlpha(40),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFFF5252).withAlpha(120)),
            ),
            child: const Text(
              'Miss — try again',
              style: TextStyle(color: Color(0xFFFF5252), fontSize: 13),
            ),
          ),
        ),
        const SizedBox(height: 48),

        // Result label.
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 200),
          child: _lastResult == null
              ? const Text(
                  'Tap any button on the beat',
                  key: ValueKey('prompt'),
                  style: TextStyle(color: Colors.white54, fontSize: 16),
                )
              : Text(
                  _lastResult!,
                  key: ValueKey(_lastResult),
                  style: TextStyle(
                    color: _lastResultColor,
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                  ),
                ),
        ),

        const SizedBox(height: 48),

        // 4 Body Base-10 action buttons.
        _buildActionGrid(),

        const SizedBox(height: 32),

        // Progress bar.
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: _beatsDone / _totalBeats,
              minHeight: 6,
              backgroundColor: Colors.white.withAlpha(20),
              valueColor:
                  const AlwaysStoppedAnimation<Color>(Color(0xFF7C4DFF)),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildBeatIndicator() {
    final reduceMotion = ref.watch(sessionPrefsProvider).reduceMotion;
    final circle = Container(
      width: 80,
      height: 80,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: const Color(0xFF7C4DFF).withAlpha(40),
        border: Border.all(color: const Color(0xFF7C4DFF), width: 3),
      ),
      child: const Icon(Icons.music_note, color: Color(0xFF7C4DFF), size: 36),
    );
    if (reduceMotion) return circle;
    return ScaleTransition(scale: _pulseAnimation, child: circle);
  }

  Widget _buildActionGrid() {
    const actions = [
      _ActionDef(label: 'Sway', icon: Icons.waves, subtitle: 'Whole note'),
      _ActionDef(
          label: 'Nod', icon: Icons.arrow_downward, subtitle: 'Half note'),
      _ActionDef(label: 'Tap', icon: Icons.touch_app, subtitle: 'Quarter note'),
      _ActionDef(label: 'Snap', icon: Icons.flash_on, subtitle: 'Eighth note'),
    ];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: GridView.count(
        crossAxisCount: 2,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 2.4,
        children: actions.map((a) => _buildActionButton(a)).toList(),
      ),
    );
  }

  Widget _buildActionButton(_ActionDef action) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: _onActionTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          decoration: BoxDecoration(
            color: const Color(0xFF7C4DFF).withAlpha(30),
            border: Border.all(color: const Color(0xFF7C4DFF).withAlpha(100)),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(action.icon, color: const Color(0xFF7C4DFF), size: 22),
              const SizedBox(height: 2),
              Text(
                action.label,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                action.subtitle,
                style: TextStyle(
                  color: Colors.white.withAlpha(100),
                  fontSize: 10,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildComplete() {
    final accuracy = _maxPoints > 0 ? (_totalPoints / _maxPoints) : 0.0;
    final pct = (accuracy * 100).round();

    Color grade;
    String label;
    if (pct >= 90) {
      grade = const Color(0xFF69F0AE);
      label = 'Excellent!';
    } else if (pct >= 70) {
      grade = const Color(0xFF4FC3F7);
      label = 'Good work!';
    } else if (pct >= 50) {
      grade = const Color(0xFFFFD54F);
      label = 'Keep practising';
    } else {
      grade = const Color(0xFFFF5252);
      label = 'Try again!';
    }

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(label,
                style: TextStyle(
                    color: grade, fontSize: 28, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            Text(
              'Accuracy: $pct%',
              style: const TextStyle(color: Colors.white, fontSize: 20),
            ),
            const SizedBox(height: 8),
            Text(
              '$_totalPoints / $_maxPoints points',
              style:
                  TextStyle(color: Colors.white.withAlpha(150), fontSize: 14),
            ),
            const SizedBox(height: 48),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF7C4DFF),
                padding:
                    const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: () => context.go('/'),
              child: const Text('Back to Home',
                  style: TextStyle(color: Colors.white, fontSize: 16)),
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionDef {
  final String label;
  final IconData icon;
  final String subtitle;
  const _ActionDef(
      {required this.label, required this.icon, required this.subtitle});
}
