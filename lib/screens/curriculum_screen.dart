import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:harmony_knight/models/curriculum.dart';
import 'package:harmony_knight/providers/scaffolding_provider.dart';

/// The Curriculum Map screen — "The Map of the Musical World."
///
/// Displays all curriculum levels organized by phase. The user's current
/// grade level is highlighted. Locked levels are shown dimmed but visible
/// to show the full journey ahead.
class CurriculumScreen extends ConsumerWidget {
  const CurriculumScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final progress = ref.watch(playerProgressProvider);
    final currentGrade = progress.gradeLevel;

    return Scaffold(
      backgroundColor: const Color(0xFF0D1117),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => context.go('/'),
        ),
        title: const Text(
          'The Musical World',
          style: TextStyle(color: Colors.white),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildPhaseHeader('Phase 1: Foundation', 'The Seed Phase',
              const Color(0xFF4FC3F7)),
          ...Curriculum.forPhase(CurriculumPhase.foundation)
              .map((l) => _buildLevelCard(l, currentGrade)),

          const SizedBox(height: 24),
          _buildPhaseHeader('Phase 2: Intermediate', 'The Growth Phase',
              const Color(0xFF7C4DFF)),
          ...Curriculum.forPhase(CurriculumPhase.intermediate)
              .map((l) => _buildLevelCard(l, currentGrade)),

          const SizedBox(height: 24),
          _buildPhaseHeader('Phase 3: Advanced', 'The Fruit Phase',
              const Color(0xFFFFD54F)),
          ...Curriculum.forPhase(CurriculumPhase.advanced)
              .map((l) => _buildLevelCard(l, currentGrade)),
        ],
      ),
    );
  }

  Widget _buildPhaseHeader(String title, String subtitle, Color color) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              color: color,
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          Text(
            subtitle,
            style: TextStyle(
              color: color.withAlpha(150),
              fontSize: 13,
              fontStyle: FontStyle.italic,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLevelCard(CurriculumLevel level, int currentGrade) {
    final isUnlocked = level.level <= currentGrade;
    final isCurrent = level.level == currentGrade;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isCurrent
            ? const Color(0xFF1A237E).withAlpha(100)
            : Colors.grey.shade900.withAlpha(isUnlocked ? 200 : 80),
        border: isCurrent
            ? Border.all(color: const Color(0xFF7C4DFF), width: 2)
            : null,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              // Level indicator.
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: isUnlocked
                      ? const Color(0xFF7C4DFF)
                      : Colors.grey.shade700,
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: isUnlocked
                      ? Text(
                          '${level.level}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        )
                      : const Icon(Icons.lock, color: Colors.grey, size: 16),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      level.title,
                      style: TextStyle(
                        color: isUnlocked ? Colors.white : Colors.grey,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      level.subtitle,
                      style: TextStyle(
                        color: isUnlocked
                            ? Colors.white.withAlpha(150)
                            : Colors.grey.shade600,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              if (isCurrent)
                const Chip(
                  label: Text('Current', style: TextStyle(fontSize: 11)),
                  backgroundColor: Color(0xFF7C4DFF),
                  labelStyle: TextStyle(color: Colors.white),
                ),
            ],
          ),
          if (isUnlocked) ...[
            const SizedBox(height: 12),
            // Narrative theme.
            Text(
              level.narrativeTheme,
              style: TextStyle(
                color: Colors.white.withAlpha(130),
                fontSize: 12,
                fontStyle: FontStyle.italic,
              ),
            ),
            const SizedBox(height: 8),
            // Objectives.
            ...level.objectives.map((obj) => Padding(
                  padding: const EdgeInsets.only(left: 8, bottom: 2),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('• ',
                          style: TextStyle(
                              color: Colors.white.withAlpha(100), fontSize: 12)),
                      Expanded(
                        child: Text(
                          obj,
                          style: TextStyle(
                            color: Colors.white.withAlpha(100),
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ],
                  ),
                )),
            // ADHD triggers.
            const SizedBox(height: 8),
            ...level.adhdTriggers.map((trigger) => Padding(
                  padding: const EdgeInsets.only(left: 8, bottom: 2),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('⚡ ',
                          style: TextStyle(fontSize: 12)),
                      Expanded(
                        child: Text(
                          trigger,
                          style: TextStyle(
                            color: const Color(0xFFFFD54F).withAlpha(180),
                            fontSize: 11,
                          ),
                        ),
                      ),
                    ],
                  ),
                )),
          ],
        ],
      ),
    );
  }
}
