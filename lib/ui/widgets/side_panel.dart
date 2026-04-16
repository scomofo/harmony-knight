import 'package:flutter/material.dart';
import 'package:harmony_knight/game/game_state.dart';
import 'package:harmony_knight/game/sentinel.dart';
import 'package:harmony_knight/ui/theme/app_theme.dart';

/// Side panel showing progress, streak, challenge mastery, and feedback.
///
/// Designed for web/desktop where horizontal space is available.
class SidePanel extends StatelessWidget {
  final GameState game;

  const SidePanel(this.game, {super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF161B22),
        borderRadius: BorderRadius.circular(12),
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // --- Progress ---
            const Text(
              'Progress',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 8),
            _statRow('Score', '${game.progress.score}'),
            _statRow('Accuracy', '${(game.stats.accuracy() * 100).round()}%'),
            _statRow('Notes played', '${game.stats.total}'),

            // --- Streak ---
            if (game.progress.streak > 0) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: AppTheme.success.withAlpha(20),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppTheme.success.withAlpha(60)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.local_fire_department, color: AppTheme.success, size: 18),
                    const SizedBox(width: 8),
                    Text(
                      '${game.progress.streak} in a row',
                      style: const TextStyle(
                        color: AppTheme.success,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 24),

            // --- Current Challenge ---
            const Text(
              'Current Challenge',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              game.currentChallenge.prompt,
              style: TextStyle(
                fontSize: 14,
                color: Colors.white.withAlpha(200),
              ),
            ),

            const SizedBox(height: 24),

            // --- Challenge Mastery ---
            const Text(
              'Challenge Mastery',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 8),
            ...List.generate(Sentinel.challenges.length, (i) {
              final challenge = Sentinel.challenges[i];
              final acc = game.progress.accuracyFor(i);
              final attempts = game.progress.attemptsFor(i);
              return _masteryRow(
                challenge.context.chordName,
                acc,
                attempts,
              );
            }),

            const SizedBox(height: 24),

            // --- Feedback ---
            const Text(
              'Feedback',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              game.lastFeedback.isEmpty ? 'Play a note to begin' : game.lastFeedback,
              style: TextStyle(
                fontSize: 14,
                color: Colors.white.withAlpha(200),
              ),
            ),
            if (game.lastHint.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                game.lastHint,
                style: TextStyle(
                  fontSize: 13,
                  color: Colors.white.withAlpha(120),
                  fontStyle: FontStyle.italic,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _statRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(fontSize: 14, color: Colors.white.withAlpha(150)),
          ),
          Text(
            value,
            style: const TextStyle(
              fontSize: 14,
              color: Colors.white,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _masteryRow(String chordName, double? accuracy, int attempts) {
    final accPct = accuracy != null ? '${(accuracy * 100).round()}%' : '\u2014';
    final color = accuracy == null
        ? Colors.grey
        : accuracy >= 0.8
            ? AppTheme.success
            : accuracy >= 0.5
                ? AppTheme.accent
                : AppTheme.error;

    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              chordName,
              style: TextStyle(fontSize: 13, color: Colors.white.withAlpha(200)),
            ),
          ),
          Text(
            '$accPct ($attempts)',
            style: TextStyle(fontSize: 13, color: Colors.white.withAlpha(150)),
          ),
        ],
      ),
    );
  }
}
