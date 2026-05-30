import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:harmony_knight/providers/audio_provider.dart';
import 'package:harmony_knight/providers/scaffolding_provider.dart';

/// The Circle of Fifths interactive "World Map" navigation screen.
///
/// **Explore mode** (default): tap a key wedge to see its scale, key
/// signature, and relative minor. Locked keys are visible but dimmed.
///
/// **Quiz mode**: a prompt bar appears with a key-signature question.
/// Tap the correct key wedge for audio feedback and harmony points.
/// No timer — Wait-Mode applies.
class CircleOfFifthsScreen extends ConsumerStatefulWidget {
  const CircleOfFifthsScreen({super.key});

  @override
  ConsumerState<CircleOfFifthsScreen> createState() =>
      _CircleOfFifthsScreenState();
}

class _CircleOfFifthsScreenState extends ConsumerState<CircleOfFifthsScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  String? _selectedKey;

  // Quiz state.
  bool _quizMode = false;
  int _correctQuizAnswers = 0;
  _QuizQuestion? _currentQuestion;
  String? _wrongHighlightKey;
  Timer? _highlightTimer;

  static const _keys = [
    KeyData('C', 'Am', 0, 'No sharps or flats'),
    KeyData('G', 'Em', 1, '1 sharp: F#'),
    KeyData('D', 'Bm', 2, '2 sharps: F#, C#'),
    KeyData('A', 'F#m', 3, '3 sharps: F#, C#, G#'),
    KeyData('E', 'C#m', 4, '4 sharps: F#, C#, G#, D#'),
    KeyData('B', 'G#m', 5, '5 sharps: F#, C#, G#, D#, A#'),
    KeyData('F#/Gb', 'D#m/Ebm', 6, '6 sharps/flats'),
    KeyData('Db', 'Bbm', 5, '5 flats: Bb, Eb, Ab, Db, Gb'),
    KeyData('Ab', 'Fm', 4, '4 flats: Bb, Eb, Ab, Db'),
    KeyData('Eb', 'Cm', 3, '3 flats: Bb, Eb, Ab'),
    KeyData('Bb', 'Gm', 2, '2 flats: Bb, Eb'),
    KeyData('F', 'Dm', 1, '1 flat: Bb'),
  ];

  static const _majorScaleNotes = {
    'C': ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C'],
    'G': ['G', 'A', 'B', 'C', 'D', 'E', 'F#', 'G'],
    'D': ['D', 'E', 'F#', 'G', 'A', 'B', 'C#', 'D'],
    'A': ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#', 'A'],
    'E': ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#', 'E'],
    'B': ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#', 'B'],
    'F#/Gb': ['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#', 'F#'],
    'Db': ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C', 'Db'],
    'Ab': ['Ab', 'Bb', 'C', 'Db', 'Eb', 'F', 'G', 'Ab'],
    'Eb': ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D', 'Eb'],
    'Bb': ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A', 'Bb'],
    'F': ['F', 'G', 'A', 'Bb', 'C', 'D', 'E', 'F'],
  };

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _highlightTimer?.cancel();
    _pulseController.dispose();
    super.dispose();
  }

  int _unlockedKeysForGrade(int grade) {
    if (grade < 3) return 3; // C, G, F
    if (grade < 5) return 6; // + D, Bb, Eb
    if (grade < 7) return 9; // + A, Ab, E
    return 12; // All keys
  }

  // ── Quiz logic ────────────────────────────────────────────────────────────

  void _enterQuizMode(int unlockedCount) {
    setState(() {
      _quizMode = true;
      _correctQuizAnswers = 0;
      _selectedKey = null;
      _wrongHighlightKey = null;
    });
    _generateQuestion(unlockedCount);
  }

  void _exitQuizMode() {
    _highlightTimer?.cancel();
    setState(() {
      _quizMode = false;
      _currentQuestion = null;
      _correctQuizAnswers = 0;
      _wrongHighlightKey = null;
    });
  }

  void _generateQuestion(int unlockedCount) {
    final eligible = _keys.sublist(0, unlockedCount);
    final rng = math.Random();

    // Build available question types.
    final types = <_QuizType>[];
    if (eligible.any((k) => k.description.contains('sharp'))) {
      types.add(_QuizType.sharps);
    }
    if (eligible.any((k) => k.description.contains('flat'))) {
      types.add(_QuizType.flats);
    }
    if (eligible.length > 1) types.add(_QuizType.relativeMinor);
    if (eligible.any((k) => k.accidentalCount == 0)) {
      types.add(_QuizType.zero);
    }

    final type = types[rng.nextInt(types.length)];

    _QuizQuestion question;
    switch (type) {
      case _QuizType.sharps:
        final sharpKeys =
            eligible.where((k) => k.description.contains('sharp')).toList();
        final target = sharpKeys[rng.nextInt(sharpKeys.length)];
        final n = target.accidentalCount;
        question = _QuizQuestion(
          prompt: 'Tap the key with $n sharp${n == 1 ? '' : 's'}',
          correctKey: target.majorKey,
        );
      case _QuizType.flats:
        final flatKeys =
            eligible.where((k) => k.description.contains('flat')).toList();
        final target = flatKeys[rng.nextInt(flatKeys.length)];
        final n = target.accidentalCount;
        question = _QuizQuestion(
          prompt: 'Tap the key with $n flat${n == 1 ? '' : 's'}',
          correctKey: target.majorKey,
        );
      case _QuizType.relativeMinor:
        // "Which key is paired with [relativeMinor]?"
        final source = eligible[rng.nextInt(eligible.length)];
        question = _QuizQuestion(
          prompt: 'Which key is paired with ${source.relativeMinor}?',
          correctKey: source.majorKey,
        );
      case _QuizType.zero:
        question = const _QuizQuestion(
          prompt: 'Tap the key with no accidentals',
          correctKey: 'C',
        );
    }

    setState(() => _currentQuestion = question);
  }

  void _handleQuizTap(String majorKey, int unlockedCount) {
    if (_currentQuestion == null) return;
    _highlightTimer?.cancel();

    if (majorKey == _currentQuestion!.correctKey) {
      ref.read(soundFeedbackProvider).playCorrect();
      ref.read(playerProgressProvider.notifier).addHarmonyPoints(3);
      setState(() {
        _correctQuizAnswers++;
        _wrongHighlightKey = null;
      });
      _generateQuestion(unlockedCount);
    } else {
      ref.read(soundFeedbackProvider).playWrong();
      setState(() => _wrongHighlightKey = _currentQuestion!.correctKey);
      _highlightTimer = Timer(const Duration(milliseconds: 1500), () {
        if (mounted) {
          setState(() => _wrongHighlightKey = null);
          _generateQuestion(unlockedCount);
        }
      });
    }
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final progress = ref.watch(playerProgressProvider);
    final unlockedKeys = _unlockedKeysForGrade(progress.gradeLevel);

    return Scaffold(
      backgroundColor: const Color(0xFF0D1117),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => context.go('/curriculum'),
        ),
        title: const Text(
          'Map of the Musical World',
          style: TextStyle(color: Colors.white),
        ),
        actions: [
          if (_quizMode)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: Center(
                child: Text(
                  'Quiz: $_correctQuizAnswers correct',
                  style: const TextStyle(
                      color: Color(0xFFFFD54F), fontSize: 13),
                ),
              ),
            ),
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: TextButton(
              onPressed: _quizMode
                  ? _exitQuizMode
                  : () => _enterQuizMode(unlockedKeys),
              child: Text(
                _quizMode ? 'Explore' : 'Quiz',
                style: const TextStyle(color: Color(0xFF7C4DFF)),
              ),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // Quiz prompt bar.
          if (_quizMode && _currentQuestion != null)
            Container(
              width: double.infinity,
              padding:
                  const EdgeInsets.symmetric(vertical: 12, horizontal: 20),
              color: const Color(0xFF1A003A),
              child: Text(
                _currentQuestion!.prompt,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),

          const SizedBox(height: 16),

          // The circle.
          Expanded(
            flex: 3,
            child: Center(
              child: AnimatedBuilder(
                animation: _pulseController,
                builder: (context, child) {
                  return CustomPaint(
                    size: const Size(320, 320),
                    painter: _CircleOfFifthsPainter(
                      keys: _keys,
                      unlockedCount: unlockedKeys,
                      selectedKey: _selectedKey,
                      pulseValue: _pulseController.value,
                      wrongHighlightKey: _wrongHighlightKey,
                    ),
                    child: SizedBox(
                      width: 320,
                      height: 320,
                      child: _buildTapTargets(unlockedKeys),
                    ),
                  );
                },
              ),
            ),
          ),

          // Key detail panel (Explore mode only).
          if (!_quizMode && _selectedKey != null) _buildKeyDetail(),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Widget _buildTapTargets(int unlockedKeys) {
    return Stack(
      children: List.generate(_keys.length, (i) {
        final angle = (i * 30 - 90) * math.pi / 180;
        const radius = 130.0;
        final x = 160 + radius * math.cos(angle);
        final y = 160 + radius * math.sin(angle);
        final isUnlocked = i < unlockedKeys;

        return Positioned(
          left: x - 24,
          top: y - 24,
          child: GestureDetector(
            onTap: isUnlocked
                ? () {
                    if (_quizMode) {
                      _handleQuizTap(_keys[i].majorKey, unlockedKeys);
                    } else {
                      setState(() {
                        _selectedKey = _selectedKey == _keys[i].majorKey
                            ? null
                            : _keys[i].majorKey;
                      });
                    }
                  }
                : null,
            child: Container(
              width: 48,
              height: 48,
              alignment: Alignment.center,
              child: Text(
                _keys[i].majorKey,
                style: TextStyle(
                  color:
                      isUnlocked ? Colors.white : Colors.grey.shade600,
                  fontSize: 14,
                  fontWeight: _selectedKey == _keys[i].majorKey
                      ? FontWeight.bold
                      : FontWeight.normal,
                ),
              ),
            ),
          ),
        );
      }),
    );
  }

  Widget _buildKeyDetail() {
    final key = _keys.firstWhere((k) => k.majorKey == _selectedKey);
    final scaleNotes = _majorScaleNotes[key.majorKey] ?? [];

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF161B22),
        borderRadius: BorderRadius.circular(16),
        border:
            Border.all(color: const Color(0xFF7C4DFF).withAlpha(60)),
      ),
      child: Column(
        children: [
          Text(
            '${key.majorKey} Major / ${key.relativeMinor}',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            key.description,
            style: TextStyle(
              color: Colors.white.withAlpha(150),
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '${key.accidentalCount} accidentals',
            style: TextStyle(
              color: const Color(0xFF4FC3F7).withAlpha(200),
              fontSize: 13,
            ),
          ),
          // Scale note row (S8-S2).
          if (scaleNotes.isNotEmpty) ...[
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(scaleNotes.length, (i) {
                final isRootOrOctave = i == 0 || i == 7;
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: Text(
                    scaleNotes[i],
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: isRootOrOctave
                          ? FontWeight.bold
                          : FontWeight.normal,
                    ),
                  ),
                );
              }),
            ),
          ],
        ],
      ),
    );
  }
}

enum _QuizType { sharps, flats, relativeMinor, zero }

class _QuizQuestion {
  final String prompt;
  final String correctKey;
  const _QuizQuestion({required this.prompt, required this.correctKey});
}

class KeyData {
  final String majorKey;
  final String relativeMinor;
  final int accidentalCount;
  final String description;

  const KeyData(
      this.majorKey, this.relativeMinor, this.accidentalCount, this.description);
}

class _CircleOfFifthsPainter extends CustomPainter {
  final List<KeyData> keys;
  final int unlockedCount;
  final String? selectedKey;
  final double pulseValue;
  final String? wrongHighlightKey;

  _CircleOfFifthsPainter({
    required this.keys,
    required this.unlockedCount,
    this.selectedKey,
    required this.pulseValue,
    this.wrongHighlightKey,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 30;

    // Outer ring.
    final ringPaint = Paint()
      ..color = const Color(0xFF1A237E).withAlpha(60)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 40;
    canvas.drawCircle(center, radius, ringPaint);

    for (int i = 0; i < keys.length; i++) {
      final isUnlocked = i < unlockedCount;
      final isSelected = keys[i].majorKey == selectedKey;
      final isWrongHighlight = keys[i].majorKey == wrongHighlightKey;
      final angle = (i * 30 - 90) * math.pi / 180;

      final nodeCenter = Offset(
        center.dx + radius * math.cos(angle),
        center.dy + radius * math.sin(angle),
      );

      final nodeRadius = isSelected ? 22.0 + pulseValue * 4 : 18.0;

      if (isSelected) {
        final glowPaint = Paint()
          ..color = const Color(0xFF7C4DFF).withAlpha(60)
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 8);
        canvas.drawCircle(nodeCenter, nodeRadius + 6, glowPaint);
      }

      if (isWrongHighlight) {
        // Amber highlight ring for wrong-answer reveal.
        final highlightPaint = Paint()
          ..color = const Color(0xFFFFD54F).withAlpha(180)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 3;
        canvas.drawCircle(nodeCenter, 22, highlightPaint);
      }

      Color nodeColor;
      if (!isUnlocked) {
        nodeColor = Colors.grey.shade800;
      } else if (isSelected) {
        nodeColor = const Color(0xFF7C4DFF);
      } else if (isWrongHighlight) {
        nodeColor = const Color(0xFFFFD54F).withAlpha(200);
      } else {
        nodeColor = const Color(0xFF4FC3F7).withAlpha(180);
      }

      final nodePaint = Paint()
        ..color = nodeColor
        ..style = PaintingStyle.fill;
      canvas.drawCircle(nodeCenter, nodeRadius, nodePaint);

      // Connection line to next key.
      final nextAngle = ((i + 1) % 12 * 30 - 90) * math.pi / 180;
      final nextCenter = Offset(
        center.dx + radius * math.cos(nextAngle),
        center.dy + radius * math.sin(nextAngle),
      );
      final linePaint = Paint()
        ..color =
            (isUnlocked ? const Color(0xFF4FC3F7) : Colors.grey.shade700)
                .withAlpha(40)
        ..strokeWidth = 1.5;
      canvas.drawLine(nodeCenter, nextCenter, linePaint);
    }

    // Center label.
    final textPainter = TextPainter(
      text: const TextSpan(
        text: 'Circle\nof\nFifths',
        style: TextStyle(
          color: Colors.white24,
          fontSize: 14,
          height: 1.3,
        ),
      ),
      textAlign: TextAlign.center,
      textDirection: TextDirection.ltr,
    )..layout();
    textPainter.paint(
      canvas,
      center - Offset(textPainter.width / 2, textPainter.height / 2),
    );
  }

  @override
  bool shouldRepaint(_CircleOfFifthsPainter old) =>
      old.unlockedCount != unlockedCount ||
      old.selectedKey != selectedKey ||
      old.pulseValue != pulseValue ||
      old.wrongHighlightKey != wrongHighlightKey;
}
