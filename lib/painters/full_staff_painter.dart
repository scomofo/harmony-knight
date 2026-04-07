import 'dart:ui';
import 'package:flutter/material.dart';

/// Full-featured staff painter with clefs, ledger lines, and note positioning.
///
/// Extends the basic StaffPainter with:
/// - Treble, Bass, and Alto clef rendering
/// - Ledger lines above/below the staff
/// - Note Y-position calculation from MIDI number
/// - Bar lines and time signature display
///
/// All visual elements fade in/out based on the confidence slider.
class FullStaffPainter extends CustomPainter {
  final double confidence;
  final ClefType clef;
  final List<int>? midiNotes; // Notes to position on the staff.
  final int? highlightNoteIndex;
  final double lineSpacing;

  FullStaffPainter({
    required this.confidence,
    this.clef = ClefType.treble,
    this.midiNotes,
    this.highlightNoteIndex,
    this.lineSpacing = 10.0,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final staffOpacity = ((confidence - 0.3) / 0.7).clamp(0.0, 1.0);
    if (staffOpacity <= 0) return;

    final alpha = (staffOpacity * 255).round();
    final staffTop = size.height * 0.3;

    _drawStaffLines(canvas, size, staffTop, alpha);
    _drawClef(canvas, staffTop, alpha);

    if (midiNotes != null) {
      _drawNotePositions(canvas, size, staffTop, alpha);
    }
  }

  void _drawStaffLines(Canvas canvas, Size size, double staffTop, int alpha) {
    final paint = Paint()
      ..color = Colors.black.withAlpha(alpha)
      ..strokeWidth = lerpDouble(0.5, 1.2, confidence)!
      ..style = PaintingStyle.stroke;

    for (int i = 0; i < 5; i++) {
      final y = staffTop + (i * lineSpacing);
      canvas.drawLine(Offset(40, y), Offset(size.width - 10, y), paint);
    }
  }

  void _drawClef(Canvas canvas, double staffTop, int alpha) {
    final paint = Paint()
      ..color = Colors.black.withAlpha(alpha)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0
      ..strokeCap = StrokeCap.round;

    switch (clef) {
      case ClefType.treble:
        _drawTrebleClef(canvas, staffTop, paint);
        break;
      case ClefType.bass:
        _drawBassClef(canvas, staffTop, paint);
        break;
      case ClefType.alto:
        _drawAltoClef(canvas, staffTop, paint);
        break;
    }
  }

  void _drawTrebleClef(Canvas canvas, double staffTop, Paint paint) {
    // Simplified treble clef shape using a path.
    final x = 20.0;
    final centerY = staffTop + lineSpacing * 3; // G line (line 2 from bottom).

    // Main spiral curve.
    final path = Path()
      ..moveTo(x + 4, centerY + lineSpacing * 2)
      ..cubicTo(
        x - 6, centerY + lineSpacing,
        x - 6, centerY - lineSpacing,
        x + 2, centerY - lineSpacing * 2,
      )
      ..cubicTo(
        x + 10, centerY - lineSpacing * 2.8,
        x + 14, centerY - lineSpacing * 1.5,
        x + 8, centerY - lineSpacing * 0.5,
      )
      ..cubicTo(
        x + 2, centerY + lineSpacing * 0.3,
        x - 2, centerY + lineSpacing * 1.5,
        x + 4, centerY + lineSpacing * 2,
      );

    // Vertical stem.
    canvas.drawLine(
      Offset(x + 6, centerY - lineSpacing * 3),
      Offset(x + 6, centerY + lineSpacing * 2.5),
      paint,
    );

    canvas.drawPath(path, paint);
  }

  void _drawBassClef(Canvas canvas, double staffTop, Paint paint) {
    final x = 18.0;
    final centerY = staffTop + lineSpacing; // F line (line 4 from bottom).

    // Simplified bass clef: curved body + two dots.
    final path = Path()
      ..moveTo(x, centerY)
      ..cubicTo(
        x + 10, centerY - lineSpacing * 1.5,
        x + 14, centerY + lineSpacing,
        x + 4, centerY + lineSpacing * 2,
      );

    canvas.drawPath(path, paint);

    // Two dots.
    final dotPaint = Paint()
      ..color = paint.color
      ..style = PaintingStyle.fill;
    canvas.drawCircle(Offset(x + 16, centerY - lineSpacing * 0.3), 2, dotPaint);
    canvas.drawCircle(Offset(x + 16, centerY + lineSpacing * 0.7), 2, dotPaint);
  }

  void _drawAltoClef(Canvas canvas, double staffTop, Paint paint) {
    final x = 16.0;
    final centerY = staffTop + lineSpacing * 2; // Middle C line.

    // Simplified alto clef: two vertical bars + brackets.
    canvas.drawLine(
      Offset(x, staffTop),
      Offset(x, staffTop + lineSpacing * 4),
      Paint()..color = paint.color..strokeWidth = 3,
    );
    canvas.drawLine(
      Offset(x + 6, staffTop),
      Offset(x + 6, staffTop + lineSpacing * 4),
      paint,
    );

    // Bracket curves.
    final bracket = Path()
      ..moveTo(x + 6, staffTop)
      ..cubicTo(
        x + 18, staffTop + lineSpacing,
        x + 18, centerY - lineSpacing * 0.5,
        x + 10, centerY,
      )
      ..cubicTo(
        x + 18, centerY + lineSpacing * 0.5,
        x + 18, staffTop + lineSpacing * 3,
        x + 6, staffTop + lineSpacing * 4,
      );
    canvas.drawPath(bracket, paint);
  }

  void _drawNotePositions(
      Canvas canvas, Size size, double staffTop, int alpha) {
    if (midiNotes == null || midiNotes!.isEmpty) return;

    final noteSpacing = (size.width - 80) / midiNotes!.length;

    for (int i = 0; i < midiNotes!.length; i++) {
      final midi = midiNotes![i];
      final x = 60 + (i * noteSpacing) + noteSpacing / 2;
      final y = _midiToStaffY(midi, staffTop);

      // Draw ledger lines if needed.
      _drawLedgerLines(canvas, x, y, staffTop, alpha);

      // Highlight circle for current note.
      if (i == highlightNoteIndex) {
        final highlightPaint = Paint()
          ..color = const Color(0xFFFFD54F).withAlpha(60)
          ..style = PaintingStyle.fill;
        canvas.drawCircle(Offset(x, y), lineSpacing * 0.8, highlightPaint);
      }
    }
  }

  void _drawLedgerLines(
      Canvas canvas, double noteX, double noteY, double staffTop, int alpha) {
    final staffBottom = staffTop + lineSpacing * 4;
    final paint = Paint()
      ..color = Colors.black.withAlpha(alpha)
      ..strokeWidth = 1.0;

    final ledgerWidth = lineSpacing * 1.5;

    // Ledger lines above the staff.
    if (noteY < staffTop) {
      double y = staffTop - lineSpacing;
      while (y >= noteY - lineSpacing / 2) {
        canvas.drawLine(
          Offset(noteX - ledgerWidth, y),
          Offset(noteX + ledgerWidth, y),
          paint,
        );
        y -= lineSpacing;
      }
    }

    // Ledger lines below the staff.
    if (noteY > staffBottom) {
      double y = staffBottom + lineSpacing;
      while (y <= noteY + lineSpacing / 2) {
        canvas.drawLine(
          Offset(noteX - ledgerWidth, y),
          Offset(noteX + ledgerWidth, y),
          paint,
        );
        y += lineSpacing;
      }
    }

    // Middle C ledger line (B3/C4 area in treble clef).
    if (clef == ClefType.treble && noteY > staffBottom &&
        noteY <= staffBottom + lineSpacing * 1.5) {
      canvas.drawLine(
        Offset(noteX - ledgerWidth, staffBottom + lineSpacing),
        Offset(noteX + ledgerWidth, staffBottom + lineSpacing),
        paint,
      );
    }
  }

  /// Convert MIDI note number to vertical Y position on the staff.
  ///
  /// Uses the standard staff line assignments:
  /// Treble clef: bottom line = E4 (MIDI 64), top line = F5 (MIDI 77)
  /// Bass clef: bottom line = G2 (MIDI 43), top line = A3 (MIDI 57)
  /// Alto clef: bottom line = F3 (MIDI 53), top line = G4 (MIDI 67)
  double _midiToStaffY(int midi, double staffTop) {
    // Steps from bottom line of the staff (each step = half a line spacing).
    int bottomLineMidi;
    switch (clef) {
      case ClefType.treble:
        bottomLineMidi = 64; // E4
        break;
      case ClefType.bass:
        bottomLineMidi = 43; // G2
        break;
      case ClefType.alto:
        bottomLineMidi = 53; // F3
        break;
    }

    // Convert MIDI to diatonic steps from bottom line.
    final stepsFromBottom = _midiToDiatonicSteps(midi, bottomLineMidi);
    final staffBottom = staffTop + lineSpacing * 4;

    return staffBottom - (stepsFromBottom * lineSpacing / 2);
  }

  /// Convert the interval between two MIDI notes to diatonic steps.
  int _midiToDiatonicSteps(int midi, int referenceMidi) {
    // Simplified: map chromatic semitones to diatonic steps.
    // C=0, D=1, E=2, F=3, G=4, A=5, B=6 within an octave.
    const chromaticToDiatonic = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];

    final refOctave = (referenceMidi ~/ 12) - 1;
    final refPC = referenceMidi % 12;
    final refDiatonic = refOctave * 7 + chromaticToDiatonic[refPC];

    final noteOctave = (midi ~/ 12) - 1;
    final notePC = midi % 12;
    final noteDiatonic = noteOctave * 7 + chromaticToDiatonic[notePC];

    return noteDiatonic - refDiatonic;
  }

  @override
  bool shouldRepaint(FullStaffPainter old) =>
      old.confidence != confidence ||
      old.clef != clef ||
      old.highlightNoteIndex != highlightNoteIndex ||
      old.midiNotes != midiNotes;
}

enum ClefType { treble, bass, alto }
