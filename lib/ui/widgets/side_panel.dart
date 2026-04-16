import 'package:flutter/material.dart';
import 'package:harmony_knight/game/game_state.dart';

/// Side panel showing progress, current challenge, and feedback.
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Progress',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 16,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Score: ${game.progress.score}',
            style: TextStyle(
              fontSize: 14,
              color: Colors.white.withAlpha(200),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Accuracy: ${(game.stats.accuracy() * 100).round()}%',
            style: TextStyle(
              fontSize: 14,
              color: Colors.white.withAlpha(200),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Notes played: ${game.stats.total}',
            style: TextStyle(
              fontSize: 14,
              color: Colors.white.withAlpha(200),
            ),
          ),

          const SizedBox(height: 24),

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
        ],
      ),
    );
  }
}
