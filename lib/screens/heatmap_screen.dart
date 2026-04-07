import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:harmony_knight/engine/persistence.dart';

/// Parent/Teacher Engagement Heatmap Dashboard.
///
/// Displays visual heatmaps of the learner's engagement patterns:
/// - Which topics cause the most "off-task" time
/// - Which topics trigger "hyperfocus"
/// - Error density by topic and time of day
/// - Session duration trends
///
/// This allows teachers to adapt the curriculum to the learner's
/// daily attentional fluctuations.
class HeatmapScreen extends ConsumerStatefulWidget {
  const HeatmapScreen({super.key});

  @override
  ConsumerState<HeatmapScreen> createState() => _HeatmapScreenState();
}

class _HeatmapScreenState extends ConsumerState<HeatmapScreen> {
  final PersistenceService _persistence = PersistenceService();
  List<EngagementPoint> _data = [];
  List<SessionRecord> _sessions = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final data = await _persistence.loadEngagementData();
    final sessions = await _persistence.loadSessionHistory();
    setState(() {
      _data = data;
      _sessions = sessions;
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
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
          'Engagement Heatmap',
          style: TextStyle(color: Colors.white),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _data.isEmpty && _sessions.isEmpty
              ? _buildEmpty()
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    _buildSummaryCards(),
                    const SizedBox(height: 24),
                    _buildTopicHeatmap(),
                    const SizedBox(height: 24),
                    _buildSessionHistory(),
                    const SizedBox(height: 24),
                    _buildFocusPatterns(),
                  ],
                ),
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.insights, color: Colors.white.withAlpha(60), size: 64),
          const SizedBox(height: 16),
          Text(
            'No engagement data yet.',
            style: TextStyle(color: Colors.white.withAlpha(120), fontSize: 16),
          ),
          const SizedBox(height: 8),
          Text(
            'Complete a few practice sessions to see patterns.',
            style: TextStyle(color: Colors.white.withAlpha(80), fontSize: 13),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryCards() {
    final totalSessions = _sessions.length;
    final totalMinutes =
        _sessions.fold<int>(0, (sum, s) => sum + s.durationSeconds) ~/ 60;
    final avgAccuracy = _sessions.isEmpty
        ? 0.0
        : _sessions.fold<double>(0, (sum, s) => sum + s.accuracy) /
            _sessions.length;
    final hyperfocusCount = _data.where((p) => p.wasHyperfocused).length;

    return Row(
      children: [
        _buildStatCard('Sessions', '$totalSessions', const Color(0xFF4FC3F7)),
        const SizedBox(width: 8),
        _buildStatCard('Minutes', '$totalMinutes', const Color(0xFF7C4DFF)),
        const SizedBox(width: 8),
        _buildStatCard(
            'Accuracy', '${(avgAccuracy * 100).round()}%', const Color(0xFF2E7D32)),
        const SizedBox(width: 8),
        _buildStatCard(
            'Hyperfocus', '$hyperfocusCount', const Color(0xFFFFD54F)),
      ],
    );
  }

  Widget _buildStatCard(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: color.withAlpha(20),
          border: Border.all(color: color.withAlpha(60)),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Text(
              value,
              style: TextStyle(
                color: color,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(
              label,
              style: TextStyle(
                color: Colors.white.withAlpha(120),
                fontSize: 11,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTopicHeatmap() {
    // Group engagement points by topic.
    final topicMap = <String, List<EngagementPoint>>{};
    for (final point in _data) {
      topicMap.putIfAbsent(point.topic, () => []).add(point);
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Topic Engagement',
          style: TextStyle(
            color: Colors.white,
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 12),
        ...topicMap.entries.map((entry) {
          final topic = entry.key;
          final points = entry.value;
          final avgFocus =
              points.fold<double>(0, (s, p) => s + p.focusDuration) /
                  points.length;
          final offTaskRate =
              points.where((p) => p.wasOffTask).length / points.length;

          // Color: green = high focus, red = high off-task.
          final heatColor = Color.lerp(
            const Color(0xFF2E7D32),
            const Color(0xFFC62828),
            offTaskRate,
          )!;

          return Container(
            margin: const EdgeInsets.only(bottom: 6),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: heatColor.withAlpha(25),
              border: Border.all(color: heatColor.withAlpha(60)),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                Expanded(
                  flex: 2,
                  child: Text(
                    topic,
                    style: const TextStyle(color: Colors.white, fontSize: 13),
                  ),
                ),
                Expanded(
                  child: Text(
                    '${avgFocus.round()}s avg',
                    style: TextStyle(
                      color: Colors.white.withAlpha(120),
                      fontSize: 12,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
                Expanded(
                  child: Text(
                    '${(offTaskRate * 100).round()}% off-task',
                    style: TextStyle(
                      color: heatColor,
                      fontSize: 12,
                    ),
                    textAlign: TextAlign.right,
                  ),
                ),
              ],
            ),
          );
        }),
      ],
    );
  }

  Widget _buildSessionHistory() {
    final recentSessions = _sessions.reversed.take(10).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Recent Sessions',
          style: TextStyle(
            color: Colors.white,
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 12),
        ...recentSessions.map((session) {
          return Container(
            margin: const EdgeInsets.only(bottom: 6),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.grey.shade900.withAlpha(150),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                Expanded(
                  flex: 2,
                  child: Text(
                    session.exerciseType,
                    style: const TextStyle(color: Colors.white, fontSize: 13),
                  ),
                ),
                Text(
                  '${session.durationSeconds ~/ 60}m',
                  style: TextStyle(
                    color: Colors.white.withAlpha(120),
                    fontSize: 12,
                  ),
                ),
                const SizedBox(width: 16),
                Text(
                  '${(session.accuracy * 100).round()}%',
                  style: TextStyle(
                    color: session.accuracy > 0.8
                        ? const Color(0xFF2E7D32)
                        : const Color(0xFFFF8F00),
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          );
        }),
      ],
    );
  }

  Widget _buildFocusPatterns() {
    final hyperfocusTopics = <String, int>{};
    final offTaskTopics = <String, int>{};

    for (final point in _data) {
      if (point.wasHyperfocused) {
        hyperfocusTopics[point.topic] =
            (hyperfocusTopics[point.topic] ?? 0) + 1;
      }
      if (point.wasOffTask) {
        offTaskTopics[point.topic] = (offTaskTopics[point.topic] ?? 0) + 1;
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Focus Patterns',
          style: TextStyle(
            color: Colors.white,
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 12),
        if (hyperfocusTopics.isNotEmpty) ...[
          Text(
            'Hyperfocus triggers:',
            style: TextStyle(
              color: const Color(0xFFFFD54F).withAlpha(200),
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 4),
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: hyperfocusTopics.entries.map((e) {
              return Chip(
                label: Text('${e.key} (${e.value}x)',
                    style: const TextStyle(fontSize: 11)),
                backgroundColor: const Color(0xFFFFD54F).withAlpha(30),
              );
            }).toList(),
          ),
          const SizedBox(height: 12),
        ],
        if (offTaskTopics.isNotEmpty) ...[
          Text(
            'Off-task triggers:',
            style: TextStyle(
              color: const Color(0xFFC62828).withAlpha(200),
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 4),
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: offTaskTopics.entries.map((e) {
              return Chip(
                label: Text('${e.key} (${e.value}x)',
                    style: const TextStyle(fontSize: 11)),
                backgroundColor: const Color(0xFFC62828).withAlpha(30),
              );
            }).toList(),
          ),
        ],
      ],
    );
  }
}
