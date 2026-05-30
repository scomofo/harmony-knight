import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:harmony_knight/engine/persistence.dart';
import 'package:harmony_knight/providers/audio_provider.dart';
import 'package:harmony_knight/providers/scaffolding_provider.dart';

/// Level 3 Scale Spelling Exercise Screen.
///
/// The player is shown a major scale root and must tap the 8 ascending scale
/// degrees in order from the chromatic palette. Wrong taps enter Wait-Mode
/// (same degree replays); correct taps advance to the next degree.
///
/// Available keys: C, G, D, A, F, Bb — all with ≤2 accidentals.
class ScaleScreen extends ConsumerStatefulWidget {
  const ScaleScreen({super.key});

  @override
  ConsumerState<ScaleScreen> createState() => _ScaleScreenState();
}

class _ScaleScreenState extends ConsumerState<ScaleScreen> {
  static const _scaleIntervals = [0, 2, 4, 5, 7, 9, 11, 12];

  static const _roots = [
    _RootKey('C', 60, ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C']),
    _RootKey('G', 55, ['G', 'A', 'B', 'C', 'D', 'E', 'F#', 'G']),
    _RootKey('D', 62, ['D', 'E', 'F#', 'G', 'A', 'B', 'C#', 'D']),
    _RootKey('A', 57, ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#', 'A']),
    _RootKey('F', 65, ['F', 'G', 'A', 'Bb', 'C', 'D', 'E', 'F']),
    _RootKey('Bb', 58, ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A', 'Bb']),
  ];

  late _RootKey _root;
  late List<int> _scaleMidi;
  late List<int> _paletteMidi;

  int _currentDegree = 0;
  int _correctFirstTry = 0;
  bool _questionHadError = false;
  bool _waitMode = false;
  bool _sessionComplete = false;

  late final DateTime _sessionStartTime;
  double _confidenceAtStart = 0.0;
  final PersistenceService _persistence = PersistenceService();

  @override
  void initState() {
    super.initState();
    _sessionStartTime = DateTime.now();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _confidenceAtStart = ref.read(confidenceProvider);
    });
    _pickNewScale();
  }

  void _pickNewScale() {
    final idx = Random().nextInt(_roots.length);
    _root = _roots[idx];
    _scaleMidi = _scaleIntervals.map((i) => _root.rootMidi + i).toList();
    _paletteMidi = List.generate(13, (i) => _root.rootMidi + i);
    _currentDegree = 0;
    _correctFirstTry = 0;
    _questionHadError = false;
    _waitMode = false;
    _sessionComplete = false;
  }

  void _handleTap(int midi) {
    if (_sessionComplete) return;
    final expected = _scaleMidi[_currentDegree];

    if (midi == expected) {
      if (!_questionHadError) _correctFirstTry++;
      ref.read(soundFeedbackProvider).playCorrect();
      setState(() {
        _currentDegree++;
        _questionHadError = false;
        _waitMode = false;
        if (_currentDegree >= 8) {
          _sessionComplete = true;
          _recordSession();
          _awardPoints();
        }
      });
    } else {
      _questionHadError = true;
      ref.read(soundFeedbackProvider).playWrong();
      setState(() => _waitMode = true);
    }
  }

  void _recordSession() {
    final durationSeconds =
        DateTime.now().difference(_sessionStartTime).inSeconds;
    final grade = ref.read(playerProgressProvider).gradeLevel;
    final confidenceNow = ref.read(confidenceProvider);
    _persistence.recordSession(SessionRecord(
      startedAt: _sessionStartTime,
      durationSeconds: durationSeconds,
      notesPlayed: 8,
      correctNotes: _correctFirstTry,
      gradeLevel: grade,
      exerciseType: 'scale',
      confidenceAtStart: _confidenceAtStart,
      confidenceAtEnd: confidenceNow,
    ));
  }

  void _awardPoints() {
    final pts = 5 + (_correctFirstTry / 8 * 10).round();
    ref.read(playerProgressProvider.notifier).addHarmonyPoints(pts);
  }

  /// Returns the display name for a palette note in the context of this scale.
  String _paletteName(int midi) {
    final degreeIndex = _scaleMidi.indexOf(midi);
    if (degreeIndex >= 0) return _root.scaleNames[degreeIndex];
    const chromatic = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    return chromatic[midi % 12];
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
          onPressed: () => context.go('/'),
        ),
        title: const Text(
          'Scale Practice',
          style: TextStyle(color: Colors.white),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Center(
              child: Text(
                _sessionComplete
                    ? 'Done!'
                    : 'Note ${_currentDegree + 1} / 8',
                style: TextStyle(
                  color: Colors.white.withAlpha(180),
                  fontSize: 13,
                ),
              ),
            ),
          ),
        ],
      ),
      body: _sessionComplete ? _buildComplete() : _buildExercise(),
    );
  }

  Widget _buildExercise() {
    return Column(
      children: [
        const SizedBox(height: 24),

        // Root name.
        Text(
          '${_root.displayName} Major',
          style: const TextStyle(
            color: Colors.white,
            fontSize: 28,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Tap each note of the scale in order',
          style: TextStyle(color: Colors.white.withAlpha(140), fontSize: 14),
        ),

        const SizedBox(height: 24),

        // Progress dots — 8 circles.
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(8, (i) {
            final done = i < _currentDegree;
            final current = i == _currentDegree;
            return Container(
              margin: const EdgeInsets.symmetric(horizontal: 4),
              width: current ? 20 : 16,
              height: current ? 20 : 16,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: done
                    ? const Color(0xFF69F0AE)
                    : current
                        ? const Color(0xFF26C6DA)
                        : Colors.white.withAlpha(30),
                border: current
                    ? Border.all(color: const Color(0xFF26C6DA), width: 2)
                    : null,
              ),
              child: done
                  ? const Icon(Icons.check, color: Colors.black, size: 11)
                  : null,
            );
          }),
        ),

        const SizedBox(height: 12),

        // Wait-Mode badge.
        AnimatedOpacity(
          opacity: _waitMode ? 1.0 : 0.0,
          duration: const Duration(milliseconds: 200),
          child: Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            decoration: BoxDecoration(
              color: const Color(0xFFFF5252).withAlpha(40),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                  color: const Color(0xFFFF5252).withAlpha(120)),
            ),
            child: const Text(
              'Wrong — try again',
              style: TextStyle(color: Color(0xFFFF5252), fontSize: 13),
            ),
          ),
        ),

        const SizedBox(height: 32),

        // Current degree prompt.
        Text(
          _currentDegree < 8
              ? 'Find: ${_root.scaleNames[_currentDegree]}'
              : '',
          style: const TextStyle(
            color: Color(0xFF26C6DA),
            fontSize: 22,
            fontWeight: FontWeight.bold,
          ),
        ),

        const SizedBox(height: 32),

        // Note palette — 13 chromatic buttons.
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Wrap(
            spacing: 8,
            runSpacing: 8,
            alignment: WrapAlignment.center,
            children: _paletteMidi.map((midi) {
              final isScaleNote = _scaleMidi.contains(midi);
              final isCompleted =
                  _currentDegree > _scaleMidi.indexOf(midi) &&
                  _scaleMidi.contains(midi) &&
                  _scaleMidi.indexOf(midi) < _currentDegree;

              return GestureDetector(
                onTap: () => _handleTap(midi),
                child: Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    color: isCompleted
                        ? const Color(0xFF69F0AE).withAlpha(40)
                        : isScaleNote
                            ? const Color(0xFF26C6DA).withAlpha(30)
                            : Colors.white.withAlpha(10),
                    border: Border.all(
                      color: isCompleted
                          ? const Color(0xFF69F0AE)
                          : isScaleNote
                              ? const Color(0xFF26C6DA).withAlpha(120)
                              : Colors.white.withAlpha(30),
                      width: isScaleNote ? 1.5 : 1,
                    ),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      if (isCompleted)
                        const Icon(Icons.check,
                            color: Color(0xFF69F0AE), size: 18)
                      else
                        Text(
                          _paletteName(midi),
                          style: TextStyle(
                            color: isScaleNote
                                ? Colors.white
                                : Colors.white.withAlpha(80),
                            fontSize: 14,
                            fontWeight: isScaleNote
                                ? FontWeight.bold
                                : FontWeight.normal,
                          ),
                        ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ),

        const SizedBox(height: 24),

        // Progress bar.
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: _currentDegree / 8,
              minHeight: 6,
              backgroundColor: Colors.white.withAlpha(20),
              valueColor: const AlwaysStoppedAnimation<Color>(
                  Color(0xFF26C6DA)),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildComplete() {
    final pts = 5 + (_correctFirstTry / 8 * 10).round();
    final pct = (_correctFirstTry / 8 * 100).round();

    Color gradeColor;
    String gradeLabel;
    if (pct >= 100) {
      gradeColor = const Color(0xFF69F0AE);
      gradeLabel = 'Perfect!';
    } else if (pct >= 75) {
      gradeColor = const Color(0xFF4FC3F7);
      gradeLabel = 'Well done!';
    } else if (pct >= 50) {
      gradeColor = const Color(0xFFFFD54F);
      gradeLabel = 'Keep practising';
    } else {
      gradeColor = const Color(0xFFFF5252);
      gradeLabel = 'Try again!';
    }

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              gradeLabel,
              style: TextStyle(
                  color: gradeColor,
                  fontSize: 28,
                  fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            Text(
              '${_root.displayName} Major',
              style: const TextStyle(color: Colors.white70, fontSize: 18),
            ),
            const SizedBox(height: 8),
            Text(
              '$_correctFirstTry / 8 first-try correct',
              style: const TextStyle(color: Colors.white, fontSize: 20),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.star, color: Color(0xFFFFD54F), size: 22),
                const SizedBox(width: 6),
                Text(
                  '+$pts Harmony Points',
                  style: const TextStyle(
                    color: Color(0xFFFFD54F),
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 48),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF26C6DA),
                padding: const EdgeInsets.symmetric(
                    horizontal: 32, vertical: 14),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: () => setState(_pickNewScale),
              child: const Text(
                'New Scale',
                style: TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.bold),
              ),
            ),
            const SizedBox(height: 16),
            TextButton(
              onPressed: () => context.go('/'),
              child: Text(
                'Back to Home',
                style: TextStyle(
                    color: Colors.white.withAlpha(150), fontSize: 14),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RootKey {
  final String displayName;
  final int rootMidi;
  final List<String> scaleNames;

  const _RootKey(this.displayName, this.rootMidi, this.scaleNames);
}
