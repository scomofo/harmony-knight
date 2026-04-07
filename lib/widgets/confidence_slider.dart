import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:harmony_knight/providers/scaffolding_provider.dart';

/// The persistent Confidence Slider — the core scaffolding UI control.
///
/// This slider is ALWAYS unlocked to accommodate fluctuating executive function.
/// It controls visual morphing (Figurenotes → standard notation), auditory
/// scaffolding (ghost tones), and hint density simultaneously.
///
/// At 100% confidence, the handle "breathes" (pulses) as a silent invitation
/// to turn help back on if the user is stalling (Passive Scaffolding).
class ConfidenceSlider extends ConsumerStatefulWidget {
  const ConfidenceSlider({super.key});

  @override
  ConsumerState<ConfidenceSlider> createState() => _ConfidenceSliderState();
}

class _ConfidenceSliderState extends ConsumerState<ConfidenceSlider>
    with SingleTickerProviderStateMixin {
  late AnimationController _breatheController;
  late Animation<double> _breatheAnimation;

  @override
  void initState() {
    super.initState();
    // "Breathing" pulse animation for passive scaffolding at 100%.
    _breatheController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    )..repeat(reverse: true);
    _breatheAnimation = Tween<double>(begin: 1.0, end: 1.15).animate(
      CurvedAnimation(parent: _breatheController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _breatheController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final confidence = ref.watch(confidenceProvider);
    final shouldBreathe = confidence >= 0.95;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.grey.shade900.withAlpha(200),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Label row.
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _buildLabel('Figurenotes', confidence < 0.33),
              _buildLabel('Transition', confidence >= 0.33 && confidence < 0.66),
              _buildLabel('Maestro', confidence >= 0.66),
            ],
          ),
          const SizedBox(height: 4),
          // Slider with optional breathing thumb.
          AnimatedBuilder(
            animation: _breatheAnimation,
            builder: (context, child) {
              return SliderTheme(
                data: SliderTheme.of(context).copyWith(
                  thumbShape: _BreathingThumbShape(
                    scale: shouldBreathe ? _breatheAnimation.value : 1.0,
                  ),
                  activeTrackColor: Color.lerp(
                    const Color(0xFF4FC3F7),
                    const Color(0xFFFFD54F),
                    confidence,
                  ),
                  inactiveTrackColor: Colors.grey.shade700,
                  thumbColor: Colors.white,
                  overlayColor: Colors.white.withAlpha(30),
                ),
                child: Slider(
                  value: confidence,
                  min: 0.0,
                  max: 1.0,
                  divisions: 100,
                  onChanged: (value) {
                    ref.read(confidenceProvider.notifier).setConfidence(value);
                  },
                ),
              );
            },
          ),
          // Confidence percentage.
          Text(
            '${(confidence * 100).round()}% Confidence',
            style: TextStyle(
              color: Colors.white.withAlpha(180),
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLabel(String text, bool isActive) {
    return Text(
      text,
      style: TextStyle(
        color: isActive ? Colors.white : Colors.white.withAlpha(80),
        fontSize: 11,
        fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
      ),
    );
  }
}

/// Animated "breathing" wrapper — uses AnimatedBuilder pattern.
class AnimatedBuilder extends StatelessWidget {
  final Animation<double> animation;
  final Widget Function(BuildContext, Widget?) builder;
  final Widget? child;

  const AnimatedBuilder({
    super.key,
    required this.animation,
    required this.builder,
    this.child,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder_(
      animation: animation,
      builder: builder,
      child: child,
    );
  }
}

class AnimatedBuilder_ extends AnimatedWidget {
  final Widget Function(BuildContext, Widget?) builder;
  final Widget? child;

  const AnimatedBuilder_({
    super.key,
    required super.listenable,
    required this.builder,
    this.child,
  }) : super();

  Animation<double> get animation => listenable as Animation<double>;

  @override
  Widget build(BuildContext context) => builder(context, child);
}

/// Custom thumb shape that scales for the "breathing" effect.
class _BreathingThumbShape extends SliderComponentShape {
  final double scale;

  const _BreathingThumbShape({this.scale = 1.0});

  @override
  Size getPreferredSize(bool isEnabled, bool isDiscrete) =>
      Size(24 * scale, 24 * scale);

  @override
  void paint(
    PaintingContext context,
    Offset center, {
    required Animation<double> activationAnimation,
    required Animation<double> enableAnimation,
    required bool isDiscrete,
    required TextPainter labelPainter,
    required RenderBox parentBox,
    required SliderThemeData sliderTheme,
    required TextDirection textDirection,
    required double value,
    required double textScaleFactor,
    required Size sizeWithOverflow,
  }) {
    final canvas = context.canvas;
    final radius = 12.0 * scale;

    // Glow when breathing.
    if (scale > 1.0) {
      final glowPaint = Paint()
        ..color = Colors.white.withAlpha(40)
        ..maskFilter = MaskFilter.blur(BlurStyle.normal, radius * 0.5);
      canvas.drawCircle(center, radius * 1.3, glowPaint);
    }

    // Main thumb.
    final paint = Paint()
      ..color = sliderTheme.thumbColor ?? Colors.white
      ..style = PaintingStyle.fill;
    canvas.drawCircle(center, radius, paint);

    // Shield icon hint at center.
    final iconPaint = Paint()
      ..color = Colors.grey.shade800
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;
    // Small shield/chevron shape.
    final path = Path()
      ..moveTo(center.dx, center.dy - 4 * scale)
      ..lineTo(center.dx + 4 * scale, center.dy)
      ..lineTo(center.dx, center.dy + 4 * scale)
      ..lineTo(center.dx - 4 * scale, center.dy)
      ..close();
    canvas.drawPath(path, iconPaint);
  }
}
