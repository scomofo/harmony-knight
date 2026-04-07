import 'package:flutter/material.dart';
import 'package:harmony_knight/painters/harmony_meter_painter.dart';

/// The circular Harmony Meter widget for Duel mode.
///
/// Fills as the user places consonant intervals. Glows on "Big Win"
/// (dissonance resolution) events with a +15% dopamine hit.
class HarmonyMeter extends StatefulWidget {
  final double fillLevel;
  final bool triggerBigWin;

  const HarmonyMeter({
    super.key,
    required this.fillLevel,
    this.triggerBigWin = false,
  });

  @override
  State<HarmonyMeter> createState() => _HarmonyMeterState();
}

class _HarmonyMeterState extends State<HarmonyMeter>
    with SingleTickerProviderStateMixin {
  late AnimationController _glowController;
  late Animation<double> _glowAnimation;

  @override
  void initState() {
    super.initState();
    _glowController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );
    _glowAnimation = CurvedAnimation(
      parent: _glowController,
      curve: Curves.easeOut,
    );
  }

  @override
  void didUpdateWidget(HarmonyMeter oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.triggerBigWin && !oldWidget.triggerBigWin) {
      _glowController.forward(from: 0.0);
    }
  }

  @override
  void dispose() {
    _glowController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _glowAnimation,
      builder: (context, child) {
        return CustomPaint(
          size: const Size(120, 120),
          painter: HarmonyMeterPainter(
            fillLevel: widget.fillLevel,
            isBigWinActive: _glowController.isAnimating,
            bigWinGlowProgress: _glowAnimation.value,
          ),
        );
      },
    );
  }
}
