import 'package:flutter/material.dart';
import 'package:harmony_knight/ui/theme/app_theme.dart';

/// Polished linear harmony bar with rounded corners and smooth animation.
class HarmonyBar extends StatelessWidget {
  final double value;

  const HarmonyBar(this.value, {super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Stability',
          style: TextStyle(
            fontSize: 12,
            color: Colors.white.withAlpha(150),
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: LinearProgressIndicator(
            value: value.clamp(0.0, 1.0),
            minHeight: 14,
            backgroundColor: Colors.grey[800],
            valueColor: AlwaysStoppedAnimation<Color>(
              Color.lerp(AppTheme.error, AppTheme.success, value) ??
                  AppTheme.accent,
            ),
          ),
        ),
      ],
    );
  }
}
