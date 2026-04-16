import 'package:flutter/material.dart';
import 'package:harmony_knight/ui/theme/app_theme.dart';

/// Animated feedback banner showing context-aware musical coaching.
///
/// Displays primary feedback (what happened) and a secondary hint
/// (what to try next). Color-coded by positive/negative result.
class FeedbackBanner extends StatelessWidget {
  final String text;
  final String hint;

  const FeedbackBanner(this.text, {this.hint = '', super.key});

  @override
  Widget build(BuildContext context) {
    if (text.isEmpty) return const SizedBox.shrink();

    final isPositive = !text.contains('doesn\'t') &&
        !text.contains('tense') &&
        !text.contains('tension') &&
        !text.contains('not in the chord') &&
        !text.contains('passing tone');

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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            isPositive ? Icons.check_circle_outline : Icons.info_outline,
            color: isPositive ? AppTheme.success : AppTheme.error,
            size: 20,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  text,
                  style: TextStyle(
                    fontSize: 16,
                    color: isPositive ? AppTheme.success : AppTheme.error,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                if (hint.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(
                    hint,
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.white.withAlpha(150),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
