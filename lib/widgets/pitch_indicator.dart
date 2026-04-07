import 'package:flutter/material.dart';
import 'package:harmony_knight/engine/pitch_detector.dart';

/// Visual pitch indicator showing detected pitch, tuning accuracy, and cents offset.
///
/// Used in ear training and sight-singing exercises. Displays:
/// - The detected note name
/// - A tuning meter (-50¢ to +50¢)
/// - Color feedback (green = in tune, yellow = close, red = off)
class PitchIndicator extends StatelessWidget {
  final PitchResult? pitchResult;
  final int? targetMidi;
  final int toleranceCents;

  const PitchIndicator({
    super.key,
    this.pitchResult,
    this.targetMidi,
    this.toleranceCents = 20,
  });

  @override
  Widget build(BuildContext context) {
    if (pitchResult == null) {
      return _buildEmpty();
    }

    final result = pitchResult!;
    final isTargetMatch =
        targetMidi != null && result.midiNote == targetMidi;
    final isInTune = result.isInTune(toleranceCents: toleranceCents);

    Color statusColor;
    if (isTargetMatch && isInTune) {
      statusColor = const Color(0xFF2E7D32); // Green — perfect.
    } else if (isTargetMatch) {
      statusColor = const Color(0xFFFF8F00); // Amber — right note, needs tuning.
    } else {
      statusColor = const Color(0xFFC62828); // Red — wrong note.
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: statusColor.withAlpha(30),
        border: Border.all(color: statusColor.withAlpha(100)),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Detected note name.
          Text(
            result.noteName,
            style: TextStyle(
              color: statusColor,
              fontSize: 32,
              fontWeight: FontWeight.bold,
            ),
          ),

          const SizedBox(height: 8),

          // Frequency display.
          Text(
            '${result.frequency.toStringAsFixed(1)} Hz',
            style: TextStyle(
              color: Colors.white.withAlpha(120),
              fontSize: 12,
            ),
          ),

          const SizedBox(height: 12),

          // Tuning meter.
          _buildTuningMeter(result.centsOff, statusColor),

          const SizedBox(height: 4),

          // Cents offset.
          Text(
            result.centsOff >= 0
                ? '+${result.centsOff}¢'
                : '${result.centsOff}¢',
            style: TextStyle(
              color: Colors.white.withAlpha(150),
              fontSize: 14,
            ),
          ),

          // Target match indicator.
          if (targetMidi != null) ...[
            const SizedBox(height: 8),
            Text(
              isTargetMatch && isInTune
                  ? 'Perfect!'
                  : isTargetMatch
                      ? 'Adjust tuning'
                      : 'Sing ${PitchDetector.midiToNoteName(targetMidi!)}',
              style: TextStyle(
                color: statusColor,
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildEmpty() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey.shade900.withAlpha(100),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.mic, color: Colors.white.withAlpha(60), size: 32),
          const SizedBox(height: 8),
          Text(
            'Listening...',
            style: TextStyle(
              color: Colors.white.withAlpha(100),
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTuningMeter(int centsOff, Color activeColor) {
    // Normalize cents to -50..+50 range, map to 0..1.
    final position = ((centsOff + 50) / 100).clamp(0.0, 1.0);

    return SizedBox(
      width: 200,
      height: 20,
      child: CustomPaint(
        painter: _TuningMeterPainter(
          position: position,
          activeColor: activeColor,
        ),
      ),
    );
  }
}

class _TuningMeterPainter extends CustomPainter {
  final double position;
  final Color activeColor;

  _TuningMeterPainter({required this.position, required this.activeColor});

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.width / 2;
    final indicatorX = size.width * position;

    // Background track.
    final bgPaint = Paint()
      ..color = Colors.grey.shade800
      ..style = PaintingStyle.fill;
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(0, size.height / 2 - 3, size.width, 6),
        const Radius.circular(3),
      ),
      bgPaint,
    );

    // Center tick (perfect tuning).
    final tickPaint = Paint()
      ..color = Colors.white.withAlpha(100)
      ..strokeWidth = 2;
    canvas.drawLine(
      Offset(center, 0),
      Offset(center, size.height),
      tickPaint,
    );

    // Active indicator.
    final indicatorPaint = Paint()
      ..color = activeColor
      ..style = PaintingStyle.fill;
    canvas.drawCircle(
      Offset(indicatorX, size.height / 2),
      6,
      indicatorPaint,
    );
  }

  @override
  bool shouldRepaint(_TuningMeterPainter old) =>
      old.position != position || old.activeColor != activeColor;
}
