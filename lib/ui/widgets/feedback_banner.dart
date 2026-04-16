import 'package:flutter/material.dart';
import 'package:harmony_knight/ui/theme/app_theme.dart';

/// Animated feedback banner that highlights positive vs. negative results.
///
/// Uses subtle color shifts and smooth animation to make feedback
/// noticeable without being jarring.
class FeedbackBanner extends StatelessWidget {
  final String text;

  const FeedbackBanner(this.text, {super.key});

  @override
  Widget build(BuildContext context) {
    if (text.isEmpty) return const SizedBox.shrink();

    final isPositive = text.contains('Strong') || text.contains('Good');

    return AnimatedContainer(
      duration: const Duration(milliseconds: 150),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isPositive
            ? AppTheme.success.withAlpha(25)
            : AppTheme.error.withAlpha(25),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isPositive
              ? AppTheme.success.withAlpha(80)
              : AppTheme.error.withAlpha(80),
        ),
      ),
      child: Row(
        children: [
          Icon(
            isPositive ? Icons.check_circle_outline : Icons.info_outline,
            color: isPositive ? AppTheme.success : AppTheme.error,
            size: 20,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                fontSize: 16,
                color: isPositive ? AppTheme.success : AppTheme.error,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
