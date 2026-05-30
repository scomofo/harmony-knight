import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:harmony_knight/engine/curriculum/grade_thresholds.dart';
import 'package:harmony_knight/models/curriculum.dart';
import 'package:harmony_knight/models/player_progress.dart';
import 'package:harmony_knight/models/quest.dart';
import 'package:harmony_knight/models/skill_mastery.dart';
import 'package:harmony_knight/providers/mastery_provider.dart';
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
    final highContrast = ref.watch(highContrastProvider);
    final quests = ref.watch(questProvider);
    final noteReadingMastery = ref.watch(
      masteryProvider.select((mastery) => mastery['note-reading-c4-b4']),
    );

    return Scaffold(
      backgroundColor: highContrast ? Colors.black : const Color(0xFF0D1117),
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
              _buildQuestBanner(currentLevel, highContrast: highContrast),
              const SizedBox(height: 8),

              // Grade progress bar.
              _buildGradeProgressBar(progress),
              const SizedBox(height: 16),

              // Quick-action cards (the 10-Second Rule: pick an action fast).
              Expanded(
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    return SingleChildScrollView(
                      child: ConstrainedBox(
                        constraints: BoxConstraints(minHeight: constraints.maxHeight),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            _buildRecommendedQuest(
                              context,
                              quests.recommendedQuest,
                              noteReadingMastery,
                            ),
                            const SizedBox(height: 16),
                            _buildDailyPath(context, quests.dailyQuests),
                            const SizedBox(height: 16),
                            _buildActionCard(
                              context,
                              icon: progress.inBrokenBladeRecovery
                                  ? Icons.build
                                  : Icons.music_note,
                              title: progress.inBrokenBladeRecovery
                                  ? 'Restore Your Blade'
                                  : 'Practice',
                              subtitle: progress.inBrokenBladeRecovery
                                  ? 'Complete a warm-up to restore your streak'
                                  : 'Train your ear and notation skills',
                              color: progress.inBrokenBladeRecovery
                                  ? const Color(0xFFFF6F00)
                                  : const Color(0xFF4FC3F7),
                              onTap: () => context.go(progress.inBrokenBladeRecovery
                                  ? '/practice?mode=broken_blade'
                                  : '/practice'),
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
                            if (progress.gradeLevel >= 1) ...[
                              const SizedBox(height: 16),
                              _buildActionCard(
                                context,
                                icon: Icons.audiotrack,
                                title: 'Rhythm Practice',
                                subtitle: 'Feel the pulse — Body Base-10',
                                color: const Color(0xFF69F0AE),
                                onTap: () => context.go('/rhythm'),
                              ),
                            ],
                            if (progress.gradeLevel >= 2) ...[
                              const SizedBox(height: 16),
                              _buildActionCard(
                                context,
                                icon: Icons.piano_outlined,
                                title: 'Scale Practice',
                                subtitle: 'Build major scales key by key',
                                color: const Color(0xFF26C6DA),
                                onTap: () => context.go('/scale'),
                              ),
                            ],
                            if (progress.gradeLevel >= 3) ...[
                              const SizedBox(height: 16),
                              _buildActionCard(
                                context,
                                icon: Icons.music_note,
                                title: 'Interval Training',
                                subtitle: 'Identify the distance between notes',
                                color: const Color(0xFFFFB300),
                                onTap: () => context.go('/interval'),
                              ),
                            ],
                            if (progress.gradeLevel >= 4) ...[
                              const SizedBox(height: 16),
                              _buildActionCard(
                                context,
                                icon: Icons.piano,
                                title: 'Triad Training',
                                subtitle: 'Identify major, minor, and more',
                                color: const Color(0xFFFF7043),
                                onTap: () => context.go('/triad'),
                              ),
                            ],
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),

              // Weak notes hint (shown when the player has identified weak notes).
              if (progress.weakNotesMidi.isNotEmpty)
                _buildWeakNotesHint(progress.weakNotesMidi, context),

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

  Widget _buildQuestBanner(CurriculumLevel? level, {bool highContrast = false}) {
    if (level == null) return const SizedBox.shrink();
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: highContrast
            ? null
            : const LinearGradient(
                colors: [Color(0xFF1A237E), Color(0xFF4A148C)],
              ),
        color: highContrast ? const Color(0xFF1A0050) : null,
        border: highContrast
            ? Border.all(color: const Color(0xFF7C4DFF).withAlpha(120))
            : null,
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

  Widget _buildGradeProgressBar(PlayerProgress progress) {
    const maxGrade = 8;
    final grade = progress.gradeLevel;
    final threshold = kGradeThresholds[grade];
    final fraction = (grade / maxGrade).clamp(0.0, 1.0);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Grade $grade',
              style: TextStyle(color: Colors.white.withAlpha(150), fontSize: 11),
            ),
            if (threshold != null)
              Text(
                'Next: ${threshold.minSessionAttempts} notes at '
                '${(threshold.minSessionAccuracy * 100).round()}% accuracy',
                style: TextStyle(color: Colors.white.withAlpha(100), fontSize: 11),
              )
            else
              Text(
                'Max Grade!',
                style: TextStyle(color: const Color(0xFFFFD54F).withAlpha(200), fontSize: 11),
              ),
          ],
        ),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: fraction,
            minHeight: 5,
            backgroundColor: Colors.white.withAlpha(20),
            valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF7C4DFF)),
          ),
        ),
      ],
    );
  }

  Widget _buildRecommendedQuest(
    BuildContext context,
    Quest quest,
    SkillMastery? mastery,
  ) {
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
          const SizedBox(height: 6),
          Text(
            _noteReadingMasteryLabel(mastery),
            style: const TextStyle(
              color: Color(0xFF80CBC4),
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
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

  String _noteReadingMasteryLabel(SkillMastery? mastery) {
    if (mastery == null || mastery.attempts == 0) {
      return 'Note reading: start your first attempt';
    }
    return 'Note reading: ${mastery.stars}/3 stars';
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
                    ? const Icon(Icons.verified, color: Color(0xFFFFD54F))
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

  Widget _buildWeakNotesHint(List<int> midiNotes, BuildContext context) {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    final names = midiNotes.map((m) => noteNames[m % 12]).toSet().join(', ');
    return GestureDetector(
      onTap: () => context.go('/practice?mode=focus'),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFF4FC3F7).withAlpha(20),
          border: Border.all(color: const Color(0xFF4FC3F7).withAlpha(80)),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            const Icon(Icons.lightbulb_outline, color: Color(0xFF4FC3F7), size: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Focus area: $names — tap to drill these notes!',
                style: const TextStyle(color: Colors.white, fontSize: 13),
              ),
            ),
            Icon(Icons.chevron_right, color: const Color(0xFF4FC3F7).withAlpha(150), size: 18),
          ],
        ),
      ),
    );
  }

}
