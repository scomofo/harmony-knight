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

    // Fill arc.
    final fillPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 10
      ..strokeCap = StrokeCap.round
      ..shader = SweepGradient(
        startAngle: -math.pi / 2,
        endAngle: -math.pi / 2 + 2 * math.pi * fillLevel,
        colors: const [Color(0xFF4FC3F7), Color(0xFF7C4DFF), Color(0xFFFFD54F)],
        stops: const [0.0, 0.5, 1.0],
      ).createShader(Rect.fromCircle(center: center, radius: radius));

    final sweepAngle = 2 * math.pi * fillLevel;
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -math.pi / 2, // Start from top.
      sweepAngle,
      false,
      fillPaint,
    );

    // Big Win glow effect.
    if (isBigWinActive && bigWinGlowProgress > 0) {
      final glowPaint = Paint()
        ..color = const Color(0xFFFFD54F).withAlpha(
          (150 * (1.0 - bigWinGlowProgress)).round(),
        )
        ..style = PaintingStyle.stroke
        ..strokeWidth = 10 + 20 * bigWinGlowProgress
        ..maskFilter = MaskFilter.blur(BlurStyle.normal, 10 * bigWinGlowProgress);
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
}
