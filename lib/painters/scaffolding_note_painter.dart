import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:harmony_knight/core/constants.dart';

/// Paints a single note that morphs from Figurenotes (colorful shapes)
/// to standard notation (black ovals) based on the confidence slider.
///
/// At 0% confidence: Full-color circle/shape.
/// At 50%: Desaturating, morphing toward oval.
/// At 100%: Black oval at ~12° rotation (standard notehead).
class ScaffoldingNotePainter extends CustomPainter {
  /// Confidence value from the scaffolding slider (0.0 to 1.0).
  final double confidence;

  /// The Figurenotes color for this specific pitch.
  final Color figureNoteColor;

  /// The Figurenotes shape for this specific pitch (used at low confidence).
  final FigureNoteShape figureNoteShape;

  /// Whether this note is a "ghost" suggestion (rendered semi-transparent).
  final bool isGhost;

  ScaffoldingNotePainter({
    required this.confidence,
    required this.figureNoteColor,
    this.figureNoteShape = FigureNoteShape.circle,
    this.isGhost = false,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);

    // Color morphing: Figurenotes color → black as confidence increases.
    final baseColor = Color.lerp(figureNoteColor, Colors.black, confidence)!;
    final paint = Paint()
      ..color = isGhost ? baseColor.withAlpha(100) : baseColor
      ..style = PaintingStyle.fill;

    canvas.save();
    canvas.translate(center.dx, center.dy);

    // Rotation: 0° at figurenotes → ~-12° (−0.2 rad) at standard notation.
    canvas.rotate(lerpDouble(0, -0.2, confidence)!);

    // Size parameters.
    final w = size.width * 0.8;
    // Height morphs from equal to width (circle) to 75% of width (oval notehead).
    final h = lerpDouble(w, w * 0.75, confidence)!;

    if (confidence < 0.3) {
      // Low confidence: draw the Figurenotes shape.
      _drawFigureNoteShape(canvas, w, h, paint);
    } else if (confidence < 0.7) {
      // Transition zone: blend from shape toward oval.
      // Interpolate corner radius from shape corners to full oval.
      final morphProgress = (confidence - 0.3) / 0.4; // 0.0 to 1.0 within this band
      final cornerRadius = lerpDouble(_shapeCornerRadius(w), w, morphProgress)!;
      final rect = RRect.fromRectAndRadius(
        Rect.fromCenter(center: Offset.zero, width: w, height: h),
        Radius.circular(cornerRadius),
      );
      canvas.drawRRect(rect, paint);
    } else {
      // High confidence: standard oval notehead.
      final rect = Rect.fromCenter(center: Offset.zero, width: w, height: h);
      canvas.drawOval(rect, paint);
    }

    // Ghost note: add a dashed outline.
    if (isGhost) {
      final ghostOutline = Paint()
        ..color = figureNoteColor.withAlpha(180)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.0;
      final rect = Rect.fromCenter(center: Offset.zero, width: w, height: h);
      canvas.drawOval(rect, ghostOutline);
    }

    canvas.restore();
  }

  /// Draw the Figurenotes-specific shape (circle, square, triangle, diamond).
  void _drawFigureNoteShape(Canvas canvas, double w, double h, Paint paint) {
    switch (figureNoteShape) {
      case FigureNoteShape.circle:
        canvas.drawOval(
          Rect.fromCenter(center: Offset.zero, width: w, height: h),
          paint,
        );
        break;
      case FigureNoteShape.square:
        canvas.drawRect(
          Rect.fromCenter(center: Offset.zero, width: w, height: h),
          paint,
        );
        break;
      case FigureNoteShape.triangle:
        final path = Path()
          ..moveTo(0, -h / 2)
          ..lineTo(w / 2, h / 2)
          ..lineTo(-w / 2, h / 2)
          ..close();
        canvas.drawPath(path, paint);
        break;
      case FigureNoteShape.diamond:
        final path = Path()
          ..moveTo(0, -h / 2)
          ..lineTo(w / 2, 0)
          ..lineTo(0, h / 2)
          ..lineTo(-w / 2, 0)
          ..close();
        canvas.drawPath(path, paint);
        break;
    }
  }

  /// Corner radius for shape-to-oval morphing in the transition zone.
  double _shapeCornerRadius(double w) {
    switch (figureNoteShape) {
      case FigureNoteShape.circle:
        return w; // Already rounded.
      case FigureNoteShape.square:
        return 0; // Sharp corners.
      case FigureNoteShape.triangle:
      case FigureNoteShape.diamond:
        return w * 0.1; // Slight rounding.
    }
  }

  @override
  bool shouldRepaint(ScaffoldingNotePainter old) =>
      old.confidence != confidence ||
      old.figureNoteColor != figureNoteColor ||
      old.figureNoteShape != figureNoteShape ||
      old.isGhost != isGhost;
}
