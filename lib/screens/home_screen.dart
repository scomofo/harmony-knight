import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:harmony_knight/models/curriculum.dart';
import 'package:harmony_knight/models/quest.dart';
import 'package:harmony_knight/providers/quest_provider.dart';
import 'package:harmony_knight/providers/scaffolding_provider.dart';
import 'package:harmony_knight/widgets/confidence_slider.dart';

/// The home screen — designed for the 10-Second Rule.
///
/// Primary objective (start practicing) is clear within 10 seconds.
/// Shows current level, streak, and the main action paths.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final progress = ref.watch(playerProgressProvider);
    final currentLevel = Curriculum.forLevel(progress.gradeLevel);
    final quests = ref.watch(questProvider);

    return Scaffold(
      backgroundColor: const Color(0xFF0D1117),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header with streak, points, and settings.
              _buildHeader(
                  context, progress.currentStreak, progress.harmonyPoints),
              const SizedBox(height: 16),

              // Current quest banner.
              _buildQuestBanner(currentLevel),
              const SizedBox(height: 24),

              // Quick-action cards (the 10-Second Rule: pick an action fast).
              Expanded(
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    return SingleChildScrollView(
                      child: ConstrainedBox(
                        constraints: BoxConstraints(
                          minHeight: constraints.maxHeight,
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            _buildRecommendedQuest(
                              context,
                              quests.recommendedQuest,
                            ),
                            const SizedBox(height: 16),
                            _buildDailyPath(context, quests.dailyQuests),
                            const SizedBox(height: 16),
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
                              icon: Icons.speed,
                              title: 'Real-Time',
                              subtitle: 'Play the note highway',
                              color: const Color(0xFF26A69A),
                              onTap: () => context.go('/gameplay'),
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
                    );
                  },
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
            const Icon(Icons.local_fire_department,
                color: Color(0xFFFF6F00), size: 24),
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
              child: Icon(Icons.settings,
                  color: Colors.white.withAlpha(120), size: 22),
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
        color: const Color(0xFF241A65),
        border: Border.all(color: const Color(0xFF7C4DFF).withAlpha(120)),
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

  Widget _buildRecommendedQuest(BuildContext context, Quest quest) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF12322F),
        border: Border.all(color: const Color(0xFF26A69A).withAlpha(110)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Next Quest',
            style: TextStyle(
              color: Colors.white.withAlpha(150),
              fontSize: 12,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            quest.title,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '+${quest.rewardHarmonyPoints} Harmony - about 2 min',
            style: TextStyle(color: Colors.white.withAlpha(150), fontSize: 13),
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: () => _goToQuest(context, quest),
            icon: const Icon(Icons.play_arrow),
            label: const Text('Start Quest'),
          ),
        ],
      ),
    );
  }

  Widget _buildDailyPath(BuildContext context, List<Quest> quests) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Daily Path',
          style: TextStyle(
            color: Colors.white,
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        ...quests.map(
          (quest) => ListTile(
            dense: true,
            contentPadding: EdgeInsets.zero,
            leading: Icon(
              quest.isComplete ? Icons.check_circle : Icons.circle_outlined,
              color: quest.isComplete
                  ? const Color(0xFF26A69A)
                  : Colors.white.withAlpha(120),
            ),
            title: Text(
              quest.title,
              style: const TextStyle(color: Colors.white, fontSize: 13),
            ),
            subtitle: LinearProgressIndicator(
              value: quest.targetCount == 0
                  ? 0
                  : quest.progressCount / quest.targetCount,
              minHeight: 3,
            ),
            trailing: quest.isComplete && !quest.claimed
                ? FilledButton(
                    onPressed: () => _claimQuest(context, quest),
                    child: const Text('Claim'),
                  )
                : quest.claimed
                    ? const Icon(
                        Icons.verified,
                        color: Color(0xFFFFD54F),
                      )
                    : null,
            onTap: () => _goToQuest(context, quest),
          ),
        ),
      ],
    );
  }

  Future<void> _claimQuest(BuildContext context, Quest quest) async {
    final container = ProviderScope.containerOf(context, listen: false);
    final reward =
        await container.read(questProvider.notifier).claimQuest(quest.id);
    if (reward > 0) {
      container.read(playerProgressProvider.notifier).addHarmonyPoints(reward);
    }
  }

  void _goToQuest(BuildContext context, Quest quest) {
    switch (quest.mode) {
      case QuestMode.practice:
        context.go('/practice');
        break;
      case QuestMode.realtime:
        context.go('/gameplay');
        break;
      case QuestMode.duel:
        context.go('/duel');
        break;
      case QuestMode.recovery:
        context.go('/practice?mode=broken_blade');
        break;
    }
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
            child: const Text('Restore',
                style: TextStyle(color: Color(0xFFFF6F00))),
          ),
        ],
      ),
    );
  }
}
