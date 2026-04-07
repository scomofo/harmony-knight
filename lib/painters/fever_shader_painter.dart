import 'dart:math' as math;
import 'package:flutter/material.dart';

/// Fragment shader-style effects for Fever Mode.
///
/// Renders glowing staff lines, "Perfect Hit" ripple effects,
/// and pulsing energy patterns when the player achieves 10+ streaks.
///
/// Uses CustomPainter with layered effects to simulate fragment shader
/// visuals without requiring actual GLSL shaders (cross-platform compatible).
class FeverShaderPainter extends CustomPainter {
  /// Animation progress (0.0 to 1.0, looping).
  final double animationProgress;

  /// Current streak count (affects intensity).
  final int streakCount;

  /// Whether a "Perfect Hit" ripple is active.
  final bool perfectHitActive;

  /// Center point of the most recent perfect hit (for ripple origin).
  final Offset? perfectHitCenter;

  /// Ripple expansion progress (0.0 to 1.0).
  final double rippleProgress;

  FeverShaderPainter({
    required this.animationProgress,
    required this.streakCount,
    this.perfectHitActive = false,
    this.perfectHitCenter,
    this.rippleProgress = 0.0,
  });

  @override
  void paint(Canvas canvas, Size size) {
    // Intensity scales with streak depth beyond threshold.
    final intensity = ((streakCount - 10) / 20).clamp(0.0, 1.0);

    _drawGlowingStaffLines(canvas, size, intensity);
    _drawEnergyField(canvas, size, intensity);

    if (perfectHitActive && perfectHitCenter != null) {
      _drawPerfectHitRipple(canvas, size);
    }
  }

  /// Glowing staff lines that pulse with energy during Fever Mode.
  void _drawGlowingStaffLines(Canvas canvas, Size size, double intensity) {
    const lineCount = 5;
    const lineSpacing = 12.0;
    final totalHeight = (lineCount - 1) * lineSpacing;
    final startY = (size.height - totalHeight) / 2;

    for (int i = 0; i < lineCount; i++) {
      final y = startY + (i * lineSpacing);

      // Pulsing glow width based on animation.
      final pulsePhase = animationProgress * 2 * math.pi + (i * 0.5);
      final glowWidth = 2.0 + math.sin(pulsePhase) * intensity * 3;

      // Outer glow.
      final glowPaint = Paint()
        ..color = _feverColor(intensity).withAlpha((80 * intensity).round())
        ..strokeWidth = glowWidth + 6
        ..style = PaintingStyle.stroke
        ..maskFilter = MaskFilter.blur(BlurStyle.normal, 4 + intensity * 4);
      canvas.drawLine(Offset(0, y), Offset(size.width, y), glowPaint);

      // Core line.
      final corePaint = Paint()
        ..color = _feverColor(intensity).withAlpha((200 * intensity).round())
        ..strokeWidth = glowWidth
        ..style = PaintingStyle.stroke;
      canvas.drawLine(Offset(0, y), Offset(size.width, y), corePaint);
    }
  }

  /// Ambient energy particles/waves across the background.
  void _drawEnergyField(Canvas canvas, Size size, double intensity) {
    if (intensity < 0.1) return;

    final particleCount = (10 * intensity).round();
    final rng = math.Random(42); // Deterministic for consistent pattern.

    for (int i = 0; i < particleCount; i++) {
      final baseX = rng.nextDouble() * size.width;
      final baseY = rng.nextDouble() * size.height;

      // Particles drift upward and to the right.
      final phase = (animationProgress + i * 0.1) % 1.0;
      final x = baseX + math.sin(phase * 2 * math.pi) * 20;
      final y = baseY - phase * size.height * 0.3;

      final particlePaint = Paint()
        ..color = _feverColor(intensity).withAlpha((100 * (1.0 - phase)).round())
        ..style = PaintingStyle.fill;

      canvas.drawCircle(Offset(x, y % size.height), 2 + intensity * 2, particlePaint);
    }
  }

  /// "Perfect Hit" ripple expanding from the hit location.
  void _drawPerfectHitRipple(Canvas canvas, Size size) {
    if (perfectHitCenter == null) return;

    final maxRadius = size.width * 0.6;
    final radius = maxRadius * rippleProgress;
    final opacity = (1.0 - rippleProgress).clamp(0.0, 1.0);

    // Outer ring.
    final ringPaint = Paint()
      ..color = const Color(0xFFFFD54F).withAlpha((180 * opacity).round())
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3 * (1.0 - rippleProgress)
      ..maskFilter = MaskFilter.blur(BlurStyle.normal, 3);
    canvas.drawCircle(perfectHitCenter!, radius, ringPaint);

    // Inner fill.
    final fillPaint = Paint()
      ..color = const Color(0xFFFFD54F).withAlpha((40 * opacity).round())
      ..style = PaintingStyle.fill;
    canvas.drawCircle(perfectHitCenter!, radius * 0.8, fillPaint);
  }

  /// Fever Mode color gradient (blue → purple → gold as intensity increases).
  Color _feverColor(double intensity) {
    if (intensity < 0.5) {
      return Color.lerp(
        const Color(0xFF4FC3F7),
        const Color(0xFF7C4DFF),
        intensity * 2,
      )!;
    }
    return Color.lerp(
      const Color(0xFF7C4DFF),
      const Color(0xFFFFD54F),
      (intensity - 0.5) * 2,
    )!;
  }

  @override
  bool shouldRepaint(FeverShaderPainter old) =>
      old.animationProgress != animationProgress ||
      old.streakCount != streakCount ||
      old.perfectHitActive != perfectHitActive ||
      old.rippleProgress != rippleProgress;
}
