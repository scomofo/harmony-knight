import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:harmony_knight/models/note.dart';
import 'package:harmony_knight/providers/scaffolding_provider.dart';
import 'package:harmony_knight/providers/fever_provider.dart';
import 'package:harmony_knight/painters/staff_painter.dart';
import 'package:harmony_knight/widgets/confidence_slider.dart';
import 'package:harmony_knight/widgets/scaffolded_note.dart';

/// The main practice screen — note identification, ear training, and rhythm.
///
/// Designed with the 10-Second Rule: the target note and input options
/// are immediately visible. No clutter, no preamble.
///
/// Supports "Broken Blade" recovery mode (shortened warm-up sessions)
/// and triggers Fever Mode on 10+ streaks.
class PracticeScreen extends ConsumerStatefulWidget {
  final bool isBrokenBladeMode;

  const PracticeScreen({
    super.key,
    this.isBrokenBladeMode = false,
  });

  @override
  ConsumerState<PracticeScreen> createState() => _PracticeScreenState();
}

class _PracticeScreenState extends ConsumerState<PracticeScreen>
    with TickerProviderStateMixin {
  late Note _targetNote;
  late List<Note> _answerOptions;
  String? _feedback;
  bool _showFeedback = false;
  late AnimationController _feedbackController;
  late AnimationController _feverController;

  // Simple note pool for practice (C4 to B4 in C major).
  final _notePool = [
    const Note(midi: 60), // C4
    const Note(midi: 62), // D4
    const Note(midi: 64), // E4
    const Note(midi: 65), // F4
    const Note(midi: 67), // G4
    const Note(midi: 69), // A4
    const Note(midi: 71), // B4
  ];

  @override
  void initState() {
    super.initState();
    _feedbackController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );
    _feverController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    _generateQuestion();
  }

  @override
  void dispose() {
    _feedbackController.dispose();
    _feverController.dispose();
    super.dispose();
  }

  void _generateQuestion() {
    final shuffled = List<Note>.from(_notePool)..shuffle();
    _targetNote = shuffled.first;
    // 4 answer options including the correct one.
    _answerOptions = (shuffled.take(4).toList()..shuffle()).toList();
    _showFeedback = false;
    _feedback = null;
  }

  void _handleAnswer(Note selected) {
    final isCorrect = selected.midi == _targetNote.midi;

    setState(() {
      _showFeedback = true;
      _feedback = isCorrect ? 'Perfect!' : 'Try ${_targetNote.name}';
    });

    if (isCorrect) {
      ref.read(playerProgressProvider.notifier).recordCorrectNote();
      _feedbackController.forward(from: 0.0).then((_) {
        if (mounted) {
          setState(() => _generateQuestion());
        }
      });
    } else {
      ref.read(playerProgressProvider.notifier).recordIncorrectNote();
      // Wait-Mode: don't advance — let user see the correct answer.
      _feedbackController.forward(from: 0.0);
    }

    // Update Fever Mode.
    final progress = ref.read(playerProgressProvider);
    ref.read(feverProvider.notifier).evaluate(
      currentStreak: progress.currentStreak,
      lastActiveAt: progress.lastActiveAt,
    );
  }

  @override
  Widget build(BuildContext context) {
    final confidence = ref.watch(confidenceProvider);
    final progress = ref.watch(playerProgressProvider);
    final fever = ref.watch(feverProvider);

    return Scaffold(
      backgroundColor: const Color(0xFF0D1117),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => context.go('/'),
        ),
        title: Text(
          widget.isBrokenBladeMode ? 'Blade Restoration' : 'Practice',
          style: const TextStyle(color: Colors.white),
        ),
        actions: [
          // Streak display.
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Row(
              children: [
                Icon(
                  Icons.local_fire_department,
                  color: fever.isFeverActive
                      ? const Color(0xFFFF6F00)
                      : Colors.grey,
                  size: 20,
                ),
                const SizedBox(width: 4),
                Text(
                  '${progress.currentStreak}',
                  style: const TextStyle(color: Colors.white, fontSize: 16),
                ),
              ],
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Fever Mode indicator.
            if (fever.isFeverActive)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 8),
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFFFF6F00), Color(0xFFFFD54F)],
                  ),
                ),
                child: Text(
                  'FEVER MODE! x${fever.streakMultiplier.toStringAsFixed(1)}',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Colors.black,
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
              ),

            const SizedBox(height: 24),

            // Staff with target note.
            SizedBox(
              height: 100,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  // Staff lines (fade in with confidence).
                  CustomPaint(
                    size: const Size(300, 100),
                    painter: StaffPainter(confidence: confidence),
                  ),
                  // Target note.
                  ScaffoldedNote(note: _targetNote, size: 50),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Prompt.
            Text(
              'What note is this?',
              style: TextStyle(
                color: Colors.white.withAlpha(200),
                fontSize: 18,
              ),
            ),

            // Note name hint (fades with confidence).
            if (confidence < 0.5)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  _targetNote.name,
                  style: TextStyle(
                    color: Colors.white.withAlpha(
                      (255 * (1.0 - confidence * 2)).round().clamp(0, 255),
                    ),
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),

            const SizedBox(height: 32),

            // Answer options.
            Wrap(
              spacing: 16,
              runSpacing: 16,
              alignment: WrapAlignment.center,
              children: _answerOptions.map((note) {
                return _buildAnswerButton(note, confidence);
              }).toList(),
            ),

            const Spacer(),

            // Feedback.
            if (_showFeedback)
              AnimatedOpacity(
                opacity: _showFeedback ? 1.0 : 0.0,
                duration: const Duration(milliseconds: 300),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 12,
                  ),
                  decoration: BoxDecoration(
                    color: _feedback == 'Perfect!'
                        ? const Color(0xFF2E7D32).withAlpha(200)
                        : const Color(0xFFC62828).withAlpha(200),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    _feedback ?? '',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),

            const SizedBox(height: 16),

            // Confidence slider — always accessible.
            const ConfidenceSlider(),
          ],
        ),
      ),
    );
  }

  Widget _buildAnswerButton(Note note, double confidence) {
    final isCorrect = note.midi == _targetNote.midi;
    final showResult = _showFeedback;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: _showFeedback && !isCorrect ? null : () => _handleAnswer(note),
        borderRadius: BorderRadius.circular(16),
        child: Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            color: showResult && isCorrect
                ? const Color(0xFF2E7D32).withAlpha(100)
                : Colors.grey.shade900,
            border: Border.all(
              color: confidence < 0.5
                  ? note.figureNoteColor.withAlpha(150)
                  : Colors.grey.shade700,
              width: 2,
            ),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              ScaffoldedNote(note: note, size: 36),
              const SizedBox(height: 4),
              if (confidence < 0.7)
                Text(
                  note.name,
                  style: TextStyle(
                    color: Colors.white.withAlpha(
                      (255 * (1.0 - confidence)).round().clamp(80, 255),
                    ),
                    fontSize: 12,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
