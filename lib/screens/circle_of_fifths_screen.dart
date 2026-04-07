import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:harmony_knight/providers/scaffolding_provider.dart';

/// The Circle of Fifths interactive "World Map" navigation screen.
///
/// Rebranded as "The Map of the Musical World" — users travel from
/// the "Plains of C Major" to distant keys. Each key is a level to unlock.
///
/// Tapping a key shows its scale, key signature, and relative minor/major.
/// Unlocked keys glow; locked keys are dimmed but visible.
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
    _pulseController.dispose();
    super.dispose();
  }

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
      ),
      body: Column(
        children: [
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
          // Key detail panel.
          if (_selectedKey != null) _buildKeyDetail(),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Widget _buildTapTargets(int unlockedKeys) {
    return Stack(
      children: List.generate(_keys.length, (i) {
        final angle = (i * 30 - 90) * math.pi / 180;
        final radius = 130.0;
        final x = 160 + radius * math.cos(angle);
        final y = 160 + radius * math.sin(angle);

        return Positioned(
          left: x - 24,
          top: y - 24,
          child: GestureDetector(
            onTap: () {
              setState(() => _selectedKey = _keys[i].majorKey);
            },
            child: Container(
              width: 48,
              height: 48,
              alignment: Alignment.center,
              child: Text(
                _keys[i].majorKey,
                style: TextStyle(
                  color: i < unlockedKeys ? Colors.white : Colors.grey.shade600,
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
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF161B22),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF7C4DFF).withAlpha(60)),
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
        ],
      ),
    );
  }

  int _unlockedKeysForGrade(int grade) {
    // Gradually unlock keys as grade increases.
    if (grade < 3) return 3; // C, G, F
    if (grade < 5) return 6; // + D, Bb, Eb
    if (grade < 7) return 9; // + A, Ab, E
    return 12; // All keys
  }
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

  _CircleOfFifthsPainter({
    required this.keys,
    required this.unlockedCount,
    this.selectedKey,
    required this.pulseValue,
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

    // Key segments.
    for (int i = 0; i < keys.length; i++) {
      final isUnlocked = i < unlockedCount;
      final isSelected = keys[i].majorKey == selectedKey;
      final angle = (i * 30 - 90) * math.pi / 180;

      // Node circle.
      final nodeCenter = Offset(
        center.dx + radius * math.cos(angle),
        center.dy + radius * math.sin(angle),
      );

      final nodeRadius = isSelected ? 22.0 + pulseValue * 4 : 18.0;

      if (isSelected) {
        // Glow for selected key.
        final glowPaint = Paint()
          ..color = const Color(0xFF7C4DFF).withAlpha(60)
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 8);
        canvas.drawCircle(nodeCenter, nodeRadius + 6, glowPaint);
      }

      final nodePaint = Paint()
        ..color = isUnlocked
            ? (isSelected
                ? const Color(0xFF7C4DFF)
                : const Color(0xFF4FC3F7).withAlpha(180))
            : Colors.grey.shade800
        ..style = PaintingStyle.fill;
      canvas.drawCircle(nodeCenter, nodeRadius, nodePaint);

      // Connection line to next key.
      final nextAngle = ((i + 1) % 12 * 30 - 90) * math.pi / 180;
      final nextCenter = Offset(
        center.dx + radius * math.cos(nextAngle),
        center.dy + radius * math.sin(nextAngle),
      );
      final linePaint = Paint()
        ..color = (isUnlocked ? const Color(0xFF4FC3F7) : Colors.grey.shade700)
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
      old.pulseValue != pulseValue;
}
