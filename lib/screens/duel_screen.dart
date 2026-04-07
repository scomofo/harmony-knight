import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:harmony_knight/models/note.dart';
import 'package:harmony_knight/providers/duel_provider.dart';
import 'package:harmony_knight/providers/scaffolding_provider.dart';
import 'package:harmony_knight/widgets/confidence_slider.dart';
import 'package:harmony_knight/widgets/scaffolded_note.dart';
import 'package:harmony_knight/widgets/harmony_meter.dart';

/// The Collaborative Counterpoint Duel screen.
///
/// The Discord Sentinel (AI) places a Cantus Firmus; the user responds
/// note-by-note. Wait-Mode: never advances until the user provides a valid
/// harmonic response. No timers, no performance anxiety.
class DuelScreen extends ConsumerStatefulWidget {
  const DuelScreen({super.key});

  @override
  ConsumerState<DuelScreen> createState() => _DuelScreenState();
}

class _DuelScreenState extends ConsumerState<DuelScreen> {
  bool _showGhostReason = false;
  String? _ghostReason;

  // Note input palette (C4 to C5 chromatic).
  final _inputNotes = List.generate(13, (i) => Note(midi: 60 + i));

  @override
  void initState() {
    super.initState();
    // Start a duel based on the player's grade level.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final grade = ref.read(playerProgressProvider).gradeLevel;
      ref.read(duelProvider.notifier).startDuel(gradeLevel: grade);
    });
  }

  void _submitNote(Note note) {
    final accepted = ref.read(duelProvider.notifier).submitNote(note);
    if (!accepted) {
      // Show ghost resolution reason.
      setState(() {
        _showGhostReason = true;
        _ghostReason =
            'That creates a forbidden motion. Tap the ghost note to see a better option.';
      });
    } else {
      setState(() {
        _showGhostReason = false;
        _ghostReason = null;
      });
    }
  }

  void _acceptGhost() {
    ref.read(duelProvider.notifier).acceptGhostSuggestion();
    setState(() {
      _showGhostReason = false;
      _ghostReason = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final duel = ref.watch(duelProvider);
    final confidence = ref.watch(confidenceProvider);

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
          'Counterpoint Duel',
          style: TextStyle(color: Colors.white),
        ),
      ),
      body: SafeArea(
        child: duel.cantusFirmus.isEmpty
            ? const Center(child: CircularProgressIndicator())
            : Column(
                children: [
                  const SizedBox(height: 16),

                  // Harmony Meter.
                  HarmonyMeter(
                    fillLevel: duel.harmonyMeter,
                    triggerBigWin: duel.turnHistory.isNotEmpty &&
                        duel.turnHistory.last.grantsBigWinBonus,
                  ),

                  const SizedBox(height: 8),
                  Text(
                    'Turn ${duel.currentTurn + 1} of ${duel.totalTurns}',
                    style: TextStyle(
                      color: Colors.white.withAlpha(150),
                      fontSize: 14,
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Cantus Firmus row.
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Discord Sentinel\'s Cantus Firmus:',
                          style: TextStyle(
                            color: Colors.white.withAlpha(150),
                            fontSize: 12,
                          ),
                        ),
                        const SizedBox(height: 8),
                        SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: ScaffoldedNoteRow(
                            notes: duel.cantusFirmus,
                            highlightIndex: duel.isComplete ? null : duel.currentTurn,
                            noteSize: 36,
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),

                  // User's counterpoint row.
                  if (duel.userCounterpoint.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Your Counterpoint:',
                            style: TextStyle(
                              color: Colors.white.withAlpha(150),
                              fontSize: 12,
                            ),
                          ),
                          const SizedBox(height: 8),
                          SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            child: ScaffoldedNoteRow(
                              notes: duel.userCounterpoint,
                              noteSize: 36,
                            ),
                          ),
                        ],
                      ),
                    ),

                  const SizedBox(height: 16),

                  // Ghost note suggestion.
                  if (duel.ghostSuggestion != null)
                    GestureDetector(
                      onTap: _acceptGhost,
                      child: Container(
                        margin: const EdgeInsets.symmetric(horizontal: 16),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF7C4DFF).withAlpha(30),
                          border: Border.all(
                            color: const Color(0xFF7C4DFF).withAlpha(100),
                          ),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          children: [
                            ScaffoldedNote(
                              note: duel.ghostSuggestion!,
                              size: 36,
                            ),
                            const SizedBox(width: 12),
                            const Expanded(
                              child: Text(
                                'Tap to accept this ghost resolution and learn why it works.',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 13,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                  // Ghost reason feedback.
                  if (_showGhostReason && _ghostReason != null)
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Text(
                        _ghostReason!,
                        style: TextStyle(
                          color: const Color(0xFFFF6F00).withAlpha(200),
                          fontSize: 13,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),

                  const Spacer(),

                  // Duel complete banner.
                  if (duel.isComplete)
                    Container(
                      margin: const EdgeInsets.all(16),
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF1A237E), Color(0xFF7C4DFF)],
                        ),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Column(
                        children: [
                          const Text(
                            'Duel Complete!',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Harmony: ${(duel.harmonyMeter * 100).round()}%',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                            ),
                          ),
                          const SizedBox(height: 16),
                          ElevatedButton(
                            onPressed: () {
                              ref.read(duelProvider.notifier).reset();
                              final grade = ref.read(playerProgressProvider).gradeLevel;
                              ref.read(duelProvider.notifier).startDuel(gradeLevel: grade);
                            },
                            child: const Text('New Duel'),
                          ),
                        ],
                      ),
                    ),

                  // Note input palette (only show if duel is active).
                  if (!duel.isComplete)
                    Container(
                      padding: const EdgeInsets.all(12),
                      color: Colors.grey.shade900.withAlpha(150),
                      child: Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        alignment: WrapAlignment.center,
                        children: _inputNotes.map((note) {
                          return GestureDetector(
                            onTap: () => _submitNote(note),
                            child: Container(
                              width: 48,
                              height: 48,
                              decoration: BoxDecoration(
                                color: confidence < 0.5
                                    ? note.figureNoteColor.withAlpha(40)
                                    : Colors.grey.shade800,
                                border: Border.all(
                                  color: confidence < 0.5
                                      ? note.figureNoteColor.withAlpha(120)
                                      : Colors.grey.shade600,
                                ),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  ScaffoldedNote(note: note, size: 24),
                                  if (confidence < 0.7)
                                    Text(
                                      note.name,
                                      style: TextStyle(
                                        color: Colors.white.withAlpha(150),
                                        fontSize: 9,
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                    ),

                  // Confidence slider.
                  const ConfidenceSlider(),
                ],
              ),
      ),
    );
  }
}
