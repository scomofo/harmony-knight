import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:harmony_knight/models/curriculum.dart';
import 'package:harmony_knight/providers/scaffolding_provider.dart';
import 'package:harmony_knight/widgets/confidence_slider.dart';

/// The home screen — designed for the 10-Second Rule.
///
/// Primary objective (start practicing) is clear within 10 seconds.
/// Shows current level, streak, and the three main action paths:
/// Practice, Duel, and Curriculum Map.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final progress = ref.watch(playerProgressProvider);
    final currentLevel = Curriculum.forLevel(progress.gradeLevel);

    return Scaffold(
      backgroundColor: const Color(0xFF0D1117),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header with streak, points, and settings.
              _buildHeader(context, progress.currentStreak, progress.harmonyPoints),
              const SizedBox(height: 16),

              // Current quest banner.
              _buildQuestBanner(currentLevel),
              const SizedBox(height: 24),

              // Quick-action cards (the 10-Second Rule: pick an action fast).
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _buildActionCard(
                      context,
                      icon: Icons.music_note,
                      title: 'Practice',
                      subtitle: 'Train your ear and notation skills',
                      color: const Color(0xFF4FC3F7),
                      onTap: () => context.go('/practice'),
                    ),
                    const SizedBox(height: 16),
                    _buildActionCard(
                      context,
                      icon: Icons.shield,
                      title: 'Duel',
                      subtitle: 'Challenge the Discord Sentinel',
                      color: const Color(0xFF7C4DFF),
                      onTap: () => context.go('/duel'),
                    ),
                    const SizedBox(height: 16),
                    _buildActionCard(
                      context,
                      icon: Icons.map,
                      title: 'Curriculum Map',
                      subtitle: 'Explore the Musical World',
                      color: const Color(0xFFFFD54F),
                      onTap: () => context.go('/curriculum'),
                    ),
                  ],
                ),
              ),

              // Broken Blade recovery prompt.
              if (progress.isStreakLapsed && !progress.inBrokenBladeRecovery)
                _buildBrokenBladePrompt(context),

              // Confidence slider — always accessible.
              const ConfidenceSlider(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context, int streak, int points) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        // Streak.
        Row(
          children: [
            const Icon(Icons.local_fire_department, color: Color(0xFFFF6F00), size: 24),
            const SizedBox(width: 4),
            Text(
              '$streak',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        // Title.
        const Text(
          'Harmony Knight',
          style: TextStyle(
            color: Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.w600,
            letterSpacing: 1.2,
          ),
        ),
        // Harmony points + settings.
        Row(
          children: [
            const Icon(Icons.star, color: Color(0xFFFFD54F), size: 24),
            const SizedBox(width: 4),
            Text(
              '$points',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(width: 12),
            GestureDetector(
              onTap: () => context.go('/settings'),
              child: Icon(Icons.settings, color: Colors.white.withAlpha(120), size: 22),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildQuestBanner(CurriculumLevel? level) {
    if (level == null) return const SizedBox.shrink();
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF1A237E), Color(0xFF4A148C)],
        ),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Level ${level.level}: ${level.title}',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            level.narrativeTheme,
            style: TextStyle(
              color: Colors.white.withAlpha(180),
              fontSize: 13,
              fontStyle: FontStyle.italic,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionCard(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          decoration: BoxDecoration(
            color: color.withAlpha(25),
            border: Border.all(color: color.withAlpha(80)),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            children: [
              Icon(icon, color: color, size: 36),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        color: color,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      subtitle,
                      style: TextStyle(
                        color: Colors.white.withAlpha(150),
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right, color: color.withAlpha(150)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBrokenBladePrompt(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFF6F00).withAlpha(30),
        border: Border.all(color: const Color(0xFFFF6F00).withAlpha(100)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          const Icon(Icons.broken_image, color: Color(0xFFFF6F00)),
          const SizedBox(width: 12),
          const Expanded(
            child: Text(
              'Your blade needs mending! Complete a quick warm-up to restore your streak.',
              style: TextStyle(color: Colors.white, fontSize: 13),
            ),
          ),
          TextButton(
            onPressed: () => context.go('/practice?mode=broken_blade'),
            child: const Text('Restore', style: TextStyle(color: Color(0xFFFF6F00))),
          ),
        ],
      ),
    );
  }
}
