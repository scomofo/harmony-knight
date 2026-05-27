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
              return _ConfidenceTrack(
                value: confidence,
                thumbScale: shouldBreathe ? _breatheAnimation.value : 1.0,
                onChanged: (value) {
                  ref.read(confidenceProvider.notifier).setConfidence(value);
                },
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

class _ConfidenceTrack extends StatelessWidget {
  final double value;
  final double thumbScale;
  final ValueChanged<double> onChanged;

  const _ConfidenceTrack({
    required this.value,
    required this.thumbScale,
    required this.onChanged,
  });

  void _updateFromLocalPosition(double dx, double width) {
    if (width <= 0) return;
    onChanged((dx / width).clamp(0.0, 1.0));
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        final thumbSize = 24.0 * thumbScale;
        final thumbLeft = (width - thumbSize) * value;

        return GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTapDown: (details) {
            _updateFromLocalPosition(details.localPosition.dx, width);
          },
          onHorizontalDragUpdate: (details) {
            _updateFromLocalPosition(details.localPosition.dx, width);
          },
          child: SizedBox(
            height: 40,
            child: Stack(
              alignment: Alignment.centerLeft,
              children: [
                Container(
                  height: 4,
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade700,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                FractionallySizedBox(
                  widthFactor: value,
                  child: Container(
                    height: 4,
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    decoration: BoxDecoration(
                      color: Color.lerp(
                        const Color(0xFF4FC3F7),
                        const Color(0xFFFFD54F),
                        value,
                      ),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                Positioned(
                  left: thumbLeft,
                  child: Container(
                    width: thumbSize,
                    height: thumbSize,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                      boxShadow: thumbScale > 1.0
                          ? [
                              BoxShadow(
                                color: Colors.white.withAlpha(40),
                                blurRadius: 10,
                                spreadRadius: 3,
                              ),
                            ]
                          : null,
                    ),
                    child: Center(
                      child: Icon(
                        Icons.shield_outlined,
                        size: 12 * thumbScale,
                        color: Colors.grey.shade800,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
