import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:harmony_knight/providers/scaffolding_provider.dart';

/// Settings screen with accessibility options and session preferences.
///
/// ADHD-optimized: settings are grouped clearly with visual separators,
/// and every toggle provides immediate visual/haptic feedback.
class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final progress = ref.watch(playerProgressProvider);

    return Scaffold(
      backgroundColor: const Color(0xFF0D1117),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => context.go('/'),
        ),
        title: const Text('Settings', style: TextStyle(color: Colors.white)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // ── Session Preferences ──
          _buildSectionHeader('Session Preferences'),
          _buildSliderTile(
            'Session Length',
            'How long each practice session lasts',
            Icons.timer,
            10,
            20,
            12, // Default 12 minutes.
            (val) {},
            suffix: ' min',
          ),
          _buildSliderTile(
            'New Items Per Session',
            'Maximum new concepts introduced',
            Icons.new_releases,
            5,
            30,
            20,
            (val) {},
          ),
          _buildSliderTile(
            'Warm-Up Questions',
            'Easy review items at session start',
            Icons.wb_sunny,
            1,
            10,
            3,
            (val) {},
          ),

          const SizedBox(height: 24),

          // ── Accessibility ──
          _buildSectionHeader('Accessibility'),
          _buildToggleTile(
            'High Contrast Mode',
            'Increases color contrast for all UI elements',
            Icons.contrast,
            false,
            (val) {},
          ),
          _buildToggleTile(
            'Reduce Motion',
            'Disables animations and Fever Mode effects',
            Icons.motion_photos_off,
            false,
            (val) {},
          ),
          _buildToggleTile(
            'Haptic Feedback',
            'Vibration for rhythmic exercises and feedback',
            Icons.vibration,
            true,
            (val) {},
          ),
          _buildToggleTile(
            'Screen Reader Support',
            'Enhanced labels for screen reader accessibility',
            Icons.accessibility,
            false,
            (val) {},
          ),
          _buildSliderTile(
            'Text Size',
            'Adjust text size throughout the app',
            Icons.text_fields,
            0.8,
            1.5,
            1.0,
            (val) {},
            suffix: 'x',
          ),

          const SizedBox(height: 24),

          // ── Audio ──
          _buildSectionHeader('Audio'),
          _buildToggleTile(
            'Ghost Tones',
            'Assistive audio cues for pitch finding',
            Icons.music_note,
            true,
            (val) {},
          ),
          _buildToggleTile(
            'Metronome',
            'Audible metronome during rhythm exercises',
            Icons.timer,
            true,
            (val) {},
          ),
          _buildSliderTile(
            'Master Volume',
            'Overall app audio volume',
            Icons.volume_up,
            0.0,
            1.0,
            0.8,
            (val) {},
            suffix: '',
          ),

          const SizedBox(height: 24),

          // ── Account & Data ──
          _buildSectionHeader('Data'),
          _buildInfoTile(
            'Grade Level',
            'Level ${progress.gradeLevel}',
            Icons.school,
          ),
          _buildInfoTile(
            'Total Notes Played',
            '${progress.totalNotesPlayed}',
            Icons.piano,
          ),
          _buildInfoTile(
            'Best Streak',
            '${progress.bestStreak}',
            Icons.local_fire_department,
          ),
          _buildInfoTile(
            'Duel Wins',
            '${progress.duelWins}',
            Icons.shield,
          ),

          const SizedBox(height: 16),

          // Engagement Heatmap link (for parents/teachers).
          ListTile(
            leading: const Icon(Icons.insights, color: Color(0xFFFFD54F)),
            title: const Text(
              'Engagement Heatmap',
              style: TextStyle(color: Colors.white),
            ),
            subtitle: Text(
              'View focus patterns and session analytics',
              style: TextStyle(color: Colors.white.withAlpha(100), fontSize: 12),
            ),
            trailing: const Icon(Icons.chevron_right, color: Colors.grey),
            onTap: () => context.go('/heatmap'),
          ),

          const SizedBox(height: 32),

          // Reset progress (with confirmation).
          Center(
            child: TextButton(
              onPressed: () => _showResetDialog(context),
              child: Text(
                'Reset All Progress',
                style: TextStyle(color: Colors.red.shade400, fontSize: 13),
              ),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        title,
        style: const TextStyle(
          color: Color(0xFF7C4DFF),
          fontSize: 14,
          fontWeight: FontWeight.bold,
          letterSpacing: 1,
        ),
      ),
    );
  }

  Widget _buildToggleTile(
    String title,
    String subtitle,
    IconData icon,
    bool value,
    ValueChanged<bool> onChanged,
  ) {
    return Container(
      margin: const EdgeInsets.only(bottom: 4),
      child: SwitchListTile(
        secondary: Icon(icon, color: Colors.white.withAlpha(150), size: 22),
        title: Text(title, style: const TextStyle(color: Colors.white, fontSize: 14)),
        subtitle: Text(
          subtitle,
          style: TextStyle(color: Colors.white.withAlpha(80), fontSize: 11),
        ),
        value: value,
        onChanged: onChanged,
        activeColor: const Color(0xFF7C4DFF),
      ),
    );
  }

  Widget _buildSliderTile(
    String title,
    String subtitle,
    IconData icon,
    double min,
    double max,
    double value,
    ValueChanged<double> onChanged, {
    String suffix = '',
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey.shade900.withAlpha(100),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: Colors.white.withAlpha(150), size: 20),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title,
                        style: const TextStyle(color: Colors.white, fontSize: 14)),
                    Text(subtitle,
                        style: TextStyle(
                            color: Colors.white.withAlpha(80), fontSize: 11)),
                  ],
                ),
              ),
              Text(
                '${value is int ? value : (value as double).toStringAsFixed(1)}$suffix',
                style: const TextStyle(color: Color(0xFF4FC3F7), fontSize: 14),
              ),
            ],
          ),
          Slider(
            value: value.toDouble(),
            min: min.toDouble(),
            max: max.toDouble(),
            onChanged: onChanged,
            activeColor: const Color(0xFF7C4DFF),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoTile(String title, String value, IconData icon) {
    return ListTile(
      leading: Icon(icon, color: Colors.white.withAlpha(150), size: 22),
      title: Text(title, style: const TextStyle(color: Colors.white, fontSize: 14)),
      trailing: Text(
        value,
        style: const TextStyle(color: Color(0xFF4FC3F7), fontSize: 16),
      ),
    );
  }

  void _showResetDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF161B22),
        title: const Text('Reset Progress?',
            style: TextStyle(color: Colors.white)),
        content: const Text(
          'This will erase all progress, streaks, and settings. This cannot be undone.',
          style: TextStyle(color: Colors.white70),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              // Reset would go here.
            },
            child: Text('Reset', style: TextStyle(color: Colors.red.shade400)),
          ),
        ],
      ),
    );
  }
}
