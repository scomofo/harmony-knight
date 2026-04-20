import 'package:flutter/material.dart';
import 'package:harmony_knight/game/game_state.dart';
import 'package:harmony_knight/game/question_type.dart';
import 'package:harmony_knight/ui/theme/app_theme.dart';

/// Side panel showing curriculum progress, question, and insight.
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
            // --- Concept Progress ---
            const Text(
              'Concept',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              game.currentConcept,
              style: TextStyle(
                fontSize: 14,
                color: AppTheme.accent,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 8),
            // Node progress bar.
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: LinearProgressIndicator(
                value: game.nodeProgress,
                minHeight: 8,
                backgroundColor: Colors.grey[800],
                valueColor: const AlwaysStoppedAnimation(AppTheme.accent),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              '${(game.nodeProgress * 100).round()}% to next concept',
              style: TextStyle(fontSize: 12, color: Colors.white.withAlpha(120)),
            ),

            const SizedBox(height: 20),

            // --- Stats ---
            const Text(
              'Session',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 8),
            _statRow('Score', '${game.progress.score}'),
            _statRow('Accuracy', '${(game.stats.accuracy() * 100).round()}%'),
            _statRow('Questions', '${game.stats.total}'),

            // Streak.
            if (game.progress.streak > 0) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: AppTheme.success.withAlpha(20),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  '${game.progress.streak} correct in a row',
                  style: const TextStyle(
                    color: AppTheme.success,
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],

            const SizedBox(height: 20),

            // --- Per-Type Accuracy ---
            const Text(
              'By Question Type',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 8),
            ...QuestionType.values.map((type) {
              final acc = game.insights.accuracyFor(type);
              final attempts = game.insights.attemptsFor(type);
              if (attempts == 0) return const SizedBox.shrink();
              return _typeRow(_typeName(type), acc, attempts);
            }),

            // --- Insight ---
            if (game.insights.buildInsight().isNotEmpty) ...[
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.accent.withAlpha(15),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppTheme.accent.withAlpha(40)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.lightbulb_outline, color: AppTheme.accent, size: 16),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        game.insights.buildInsight(),
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.white.withAlpha(180),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 20),

            // --- Current Question ---
            const Text(
              'Current Question',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              game.currentChallenge.question,
              style: TextStyle(
                fontSize: 14,
                color: Colors.white.withAlpha(200),
              ),
            ),

            // --- Last Explanation ---
            if (game.lastFeedback.isNotEmpty) ...[
              const SizedBox(height: 16),
              const Text(
                'Last Explanation',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                game.lastFeedback,
                style: TextStyle(
                  fontSize: 13,
                  color: Colors.white.withAlpha(180),
                ),
              ),
              if (game.lastHint.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  game.lastHint,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.white.withAlpha(120),
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ],
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
          Text(label, style: TextStyle(fontSize: 14, color: Colors.white.withAlpha(150))),
          Text(value, style: const TextStyle(fontSize: 14, color: Colors.white, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }

  Widget _typeRow(String typeName, double? accuracy, int attempts) {
    final accPct = accuracy != null ? '${(accuracy * 100).round()}%' : '\u2014';
    final color = accuracy == null
        ? Colors.grey
        : accuracy >= 0.8 ? AppTheme.success
        : accuracy >= 0.5 ? AppTheme.accent
        : AppTheme.error;

    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          Container(
            width: 8, height: 8,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(typeName, style: TextStyle(fontSize: 13, color: Colors.white.withAlpha(200))),
          ),
          Text('$accPct ($attempts)', style: TextStyle(fontSize: 13, color: Colors.white.withAlpha(150))),
        ],
      ),
    );
  }

  String _typeName(QuestionType type) {
    switch (type) {
      case QuestionType.chordTone: return 'Chord Tones';
      case QuestionType.scaleTone: return 'Scale Awareness';
      case QuestionType.resolution: return 'Resolution';
      case QuestionType.interval: return 'Intervals';
    }
  }
}
