import 'dart:math' as math;
import 'package:flutter/material.dart';

/// Paints the circular Harmony Meter used in Duel mode.
///
/// Fills clockwise as the user places consonant intervals.
/// Glows on "Big Win" (dissonance resolution) events.
class HarmonyMeterPainter extends CustomPainter {
  /// Meter fill level (0.0 to 1.0).
  final double fillLevel;

  /// Whether a "Big Win" glow animation is active.
  final bool isBigWinActive;

  /// Animation progress for the Big Win glow (0.0 to 1.0).
  final double bigWinGlowProgress;

  HarmonyMeterPainter({
    required this.fillLevel,
    this.isBigWinActive = false,
    this.bigWinGlowProgress = 0.0,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = math.min(size.width, size.height) / 2 - 8;

    // Background ring.
    final bgPaint = Paint()
      ..color = const Color(0xFF2A2A3E)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 10
      ..strokeCap = StrokeCap.round;
    canvas.drawCircle(center, radius, bgPaint);

    final sweepAngle = 2 * math.pi * fillLevel;
    if (sweepAngle > 0) {
      _drawSegmentedFill(canvas, center, radius, sweepAngle);
    }

    // Big Win glow effect.
    if (isBigWinActive && bigWinGlowProgress > 0) {
      final glowPaint = Paint()
        ..color = const Color(0xFFFFD54F).withAlpha(
          (150 * (1.0 - bigWinGlowProgress)).round(),
        )
        ..style = PaintingStyle.stroke
        ..strokeWidth = 10 + 20 * bigWinGlowProgress
        ..maskFilter =
            MaskFilter.blur(BlurStyle.normal, 10 * bigWinGlowProgress);
      canvas.drawCircle(center, radius, glowPaint);
    }

    // Center percentage text.
    final textPainter = TextPainter(
      text: TextSpan(
        text: '${(fillLevel * 100).round()}%',
        style: TextStyle(
          color: Colors.white,
          fontSize: radius * 0.4,
          fontWeight: FontWeight.bold,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    textPainter.paint(
      canvas,
      center - Offset(textPainter.width / 2, textPainter.height / 2),
    );
  }

  @override
  bool shouldRepaint(HarmonyMeterPainter old) =>
      old.fillLevel != fillLevel ||
      old.isBigWinActive != isBigWinActive ||
      old.bigWinGlowProgress != bigWinGlowProgress;

  void _drawSegmentedFill(
    Canvas canvas,
    Offset center,
    double radius,
    double sweepAngle,
  ) {
    const colors = [
      Color(0xFF4FC3F7),
      Color(0xFF7C4DFF),
      Color(0xFFFFD54F),
    ];
    final rect = Rect.fromCircle(center: center, radius: radius);
    final segments = math.max(1, (sweepAngle / 0.08).ceil());
    final segmentSweep = sweepAngle / segments;

    for (int i = 0; i < segments; i++) {
      final t = segments == 1 ? 0.0 : i / (segments - 1);
      final color = t < 0.5
          ? Color.lerp(colors[0], colors[1], t / 0.5)!
          : Color.lerp(colors[1], colors[2], (t - 0.5) / 0.5)!;
      final fillPaint = Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 10
        ..strokeCap =
            i == 0 || i == segments - 1 ? StrokeCap.round : StrokeCap.butt
        ..color = color;

      canvas.drawArc(
        rect,
        -math.pi / 2 + i * segmentSweep,
        segmentSweep + 0.002,
        false,
        fillPaint,
      );
    }
  }
}
