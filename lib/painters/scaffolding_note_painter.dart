import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:harmony_knight/core/constants.dart';

/// Paints a single note that morphs from Figurenotes (colorful shapes)
/// to standard notation (black ovals) based on the confidence slider.
///
/// At 0% confidence: Full-color circle/shape.
/// At 50%: Desaturating, morphing toward oval.
/// At 100%: Black oval at ~12° rotation (standard notehead).
///
/// When [isGhost] is true the note is rendered at 40% opacity with a
/// dashed border — used for ghost/suggestion notes in the Duel screen.
class ScaffoldingNotePainter extends CustomPainter {
  final double confidence;
  final Color figureNoteColor;
  final FigureNoteShape figureNoteShape;
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
    final baseColor = Color.lerp(figureNoteColor, Colors.black, confidence)!;

    canvas.save();
    canvas.translate(center.dx, center.dy);
    canvas.rotate(lerpDouble(0, -0.2, confidence)!);

    final w = size.width * 0.8;
    final h = lerpDouble(w, w * 0.75, confidence)!;
    final shapePath = _shapePath(w, h);

    // Fill — ghost notes at 40% opacity.
    canvas.drawPath(
      shapePath,
      Paint()
        ..color = isGhost ? baseColor.withAlpha(100) : baseColor
        ..style = PaintingStyle.fill,
    );

    // Ghost border — dashed, using the same shape path.
    if (isGhost) {
      _drawDashedPath(
        canvas,
        shapePath,
        Paint()
          ..color = figureNoteColor.withAlpha(200)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2.0,
      );
    }

    canvas.restore();
  }

  /// Returns the outline path for the note at the current confidence level.
  Path _shapePath(double w, double h) {
    final rect = Rect.fromCenter(center: Offset.zero, width: w, height: h);

    if (confidence < 0.3) {
      switch (figureNoteShape) {
        case FigureNoteShape.circle:
          return Path()..addOval(rect);
        case FigureNoteShape.square:
          return Path()..addRect(rect);
        case FigureNoteShape.triangle:
          return Path()
            ..moveTo(0, -h / 2)
            ..lineTo(w / 2, h / 2)
            ..lineTo(-w / 2, h / 2)
            ..close();
        case FigureNoteShape.diamond:
          return Path()
            ..moveTo(0, -h / 2)
            ..lineTo(w / 2, 0)
            ..lineTo(0, h / 2)
            ..lineTo(-w / 2, 0)
            ..close();
      }
    } else if (confidence < 0.7) {
      final morphProgress = (confidence - 0.3) / 0.4;
      final cornerRadius = lerpDouble(_shapeCornerRadius(w), w, morphProgress)!;
      return Path()
        ..addRRect(RRect.fromRectAndRadius(rect, Radius.circular(cornerRadius)));
    } else {
      return Path()..addOval(rect);
    }
  }

  /// Draws [path] as a dashed stroke with 4dp dashes and 4dp gaps.
  void _drawDashedPath(Canvas canvas, Path path, Paint paint,
      {double dashLength = 4, double gapLength = 4}) {
    for (final metric in path.computeMetrics()) {
      double distance = 0;
      bool drawing = true;
      while (distance < metric.length) {
        final segLen = drawing ? dashLength : gapLength;
        if (drawing) {
          canvas.drawPath(
            metric.extractPath(
              distance,
              (distance + segLen).clamp(0, metric.length),
            ),
            paint,
          );
        }
        distance += segLen;
        drawing = !drawing;
      }
    }
  }

  double _shapeCornerRadius(double w) {
    switch (figureNoteShape) {
      case FigureNoteShape.circle:
        return w;
      case FigureNoteShape.square:
        return 0;
      case FigureNoteShape.triangle:
      case FigureNoteShape.diamond:
        return w * 0.1;
    }
  }

  @override
  bool shouldRepaint(ScaffoldingNotePainter old) =>
      old.confidence != confidence ||
      old.figureNoteColor != figureNoteColor ||
      old.figureNoteShape != figureNoteShape ||
      old.isGhost != isGhost;
}
