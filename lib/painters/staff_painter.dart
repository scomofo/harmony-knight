import 'dart:ui';
import 'package:flutter/material.dart';

/// Paints a standard 5-line music staff that fades in based on confidence.
///
/// At 0% confidence: Staff is invisible (Figurenotes mode).
/// At 50%: Staff lines begin to appear (light gray).
/// At 100%: Full black staff lines (Maestro mode).
class StaffPainter extends CustomPainter {
  final double confidence;
  final int lineCount;
  final double lineSpacing;

  StaffPainter({
    required this.confidence,
    this.lineCount = 5,
    this.lineSpacing = 12.0,
  });

  @override
  void paint(Canvas canvas, Size size) {
    // Staff only appears from ~30% confidence onward.
    final staffOpacity = ((confidence - 0.3) / 0.7).clamp(0.0, 1.0);
    if (staffOpacity <= 0) return;

    final paint = Paint()
      ..color = Colors.black.withAlpha((staffOpacity * 255).round())
      ..strokeWidth = lerpDouble(0.5, 1.5, confidence)!
      ..style = PaintingStyle.stroke;

    final totalHeight = (lineCount - 1) * lineSpacing;
    final startY = (size.height - totalHeight) / 2;

    for (int i = 0; i < lineCount; i++) {
      final y = startY + (i * lineSpacing);
      canvas.drawLine(
        Offset(0, y),
        Offset(size.width, y),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(StaffPainter old) =>
      old.confidence != confidence ||
      old.lineCount != lineCount ||
      old.lineSpacing != lineSpacing;
}
