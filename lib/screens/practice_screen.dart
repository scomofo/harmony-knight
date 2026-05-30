import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:harmony_knight/engine/curriculum/grade_thresholds.dart';
import 'package:harmony_knight/engine/persistence.dart';
import 'package:harmony_knight/engine/spaced_repetition.dart';
import 'package:harmony_knight/models/note.dart';
import 'package:harmony_knight/models/quest.dart';
import 'package:harmony_knight/engine/fever_mode_engine.dart';
import 'package:harmony_knight/engine/haptic_engine.dart';
import 'package:harmony_knight/providers/audio_provider.dart';
import 'package:harmony_knight/providers/scaffolding_provider.dart';
import 'package:harmony_knight/providers/fever_provider.dart';
import 'package:harmony_knight/providers/mastery_provider.dart';
import 'package:harmony_knight/providers/quest_provider.dart';
import 'package:harmony_knight/providers/session_prefs_provider.dart';
import 'package:harmony_knight/providers/sr_provider.dart';
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
  final bool isFocusMode;

  const PracticeScreen({
    super.key,
    this.isBrokenBladeMode = false,
    this.isFocusMode = false,
  });

  @override
  ConsumerState<PracticeScreen> createState() => _PracticeScreenState();
}

class _PracticeScreenState extends ConsumerState<PracticeScreen>
    with TickerProviderStateMixin {
  static const _noteReadingTopicId = 'note-reading-c4-b4';

  Note? _targetNote;
  List<Note> _answerOptions = [];
  String? _feedback;
  bool _showFeedback = false;
  late DateTime _questionStartedAt;
  late AnimationController _feedbackController;
  late AnimationController _feverController;

  List<Note> _notePool = [];

  // Tracks correctness per MIDI note for weak-note detection.
  // midi -> [wasCorrect, wasCorrect, ...]
  final Map<int, List<bool>> _noteHistory = {};

  // Session-level counters for grade advancement evaluation.
  int _sessionTotal = 0;
  int _sessionCorrect = 0;

  // Level-up fanfare overlay state.
  bool _showLevelUp = false;
  int _newGradeLevel = 0;

  // Session timing for heatmap recording and session-length auto-exit.
  late final DateTime _sessionStartTime;
  double _confidenceAtStart = 0.0;
  int _sessionLengthMinutes = 12; // overwritten from prefs in postFrameCallback
  Timer? _sessionTimer;
  Duration _elapsed = Duration.zero;

  // Session score counter shown in AppBar (S7-S1).
  int _sessionPoints = 0;

  final PersistenceService _persistence = PersistenceService();

  // Spaced-repetition state.
  SpacedRepetitionScheduler _srScheduler = SpacedRepetitionScheduler();
  List<SRItem> _srQueue = [];
  int _srQueueIndex = 0;
  bool _questionHadError = false; // tracks if current question had a wrong attempt

  @override
  void initState() {
    super.initState();
    _sessionStartTime = DateTime.now();
    _feedbackController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );
    _feverController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    // Build the pool and SR queue after the first frame so providers are ready.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _confidenceAtStart = ref.read(confidenceProvider);

      // Read session preferences and configure SR scheduler.
      final prefs = ref.read(sessionPrefsProvider);
      _sessionLengthMinutes = prefs.sessionLengthMinutes;
      _srScheduler = SpacedRepetitionScheduler(
        maxNewItemsPerSession: prefs.newItemsPerSession,
        warmUpCount: prefs.warmUpNotes,
      );

      // Start the per-second tick (skip in Broken Blade — no time limit).
      if (!widget.isBrokenBladeMode) {
        _sessionTimer = Timer.periodic(const Duration(seconds: 1), (_) {
          if (!mounted) return;
          setState(() {
            _elapsed = DateTime.now().difference(_sessionStartTime);
          });
          if (_elapsed.inMinutes >= _sessionLengthMinutes) {
            _sessionTimer?.cancel();
            _onExit();
          }
        });
      }

      final progress = ref.read(playerProgressProvider);
      final grade = progress.gradeLevel;
      if (widget.isFocusMode && progress.weakNotesMidi.isNotEmpty) {
        _notePool = progress.weakNotesMidi.map((m) => Note(midi: m)).toList();
      } else {
        _notePool = _buildNotePool(grade);
      }
      _rebuildSRQueue();
      _generateQuestion();
    });
  }

  /// Returns a grade-appropriate note pool.
  ///
  /// Grade 0 : C, E, G (landmark tonic triad — just 3 choices)
  /// Grade 1–2: C major (C4–B4)
  /// Grade 3–4: C major + A minor (adds A3, B3, C5)
  /// Grade 5+  : Full chromatic C4–C5 (all 13 notes)
  static List<Note> _buildNotePool(int gradeLevel) {
    if (gradeLevel == 0) {
      return const [Note(midi: 60), Note(midi: 64), Note(midi: 67)]; // C4, E4, G4
    }
    if (gradeLevel <= 2) {
      return const [
        Note(midi: 60), Note(midi: 62), Note(midi: 64),
        Note(midi: 65), Note(midi: 67), Note(midi: 69), Note(midi: 71),
      ];
    }
    if (gradeLevel <= 4) {
      // C major + A minor: adds A3(57), B3(59), C5(72).
      return const [
        Note(midi: 57), Note(midi: 59),
        Note(midi: 60), Note(midi: 62), Note(midi: 64),
        Note(midi: 65), Note(midi: 67), Note(midi: 69), Note(midi: 71),
        Note(midi: 72),
      ];
    }
    return List.generate(13, (i) => Note(midi: 60 + i));
  }

  @override
  void dispose() {
    _sessionTimer?.cancel();
    _feedbackController.dispose();
    _feverController.dispose();
    super.dispose();
  }

  void _rebuildSRQueue() {
    if (_notePool.isEmpty) return;
    final grade = ref.read(playerProgressProvider).gradeLevel;
    final items = ref.read(srItemsProvider.notifier).itemsForPool(grade, _notePool);
    _srQueue = _srScheduler.buildSessionQueue(items);
    // Fallback: if SR queue is empty (all items new with no repetitions),
    // treat every item as due by using the full pool in shuffled order.
    if (_srQueue.isEmpty) {
      _srQueue = List<SRItem>.from(items)..shuffle();
    }
    _srQueueIndex = 0;
  }

  void _generateQuestion() {
    if (_notePool.isEmpty) return;

    // Rebuild queue when exhausted.
    if (_srQueueIndex >= _srQueue.length) _rebuildSRQueue();

    _questionHadError = false;

    if (_srQueue.isEmpty) return;

    // Target note is SR-driven.
    final srItem = _srQueue[_srQueueIndex];
    final targetMidi = int.tryParse(srItem.id.replaceFirst('note_', '')) ?? -1;
    _targetNote = _notePool.firstWhere(
      (n) => n.midi == targetMidi,
      orElse: () => _notePool.first,
    );

    // Distractors: up to 3 random non-target notes from the pool.
    final distractors = (List<Note>.from(_notePool)
          ..removeWhere((n) => n.midi == _targetNote!.midi)
          ..shuffle())
        .take(3)
        .toList();

    _answerOptions = ([_targetNote!, ...distractors]..shuffle()).toList();
    _questionStartedAt = DateTime.now();
    _showFeedback = false;
    _feedback = null;
  }

  void _handleAnswer(Note selected) {
    if (_targetNote == null) return;
    final isCorrect = selected.midi == _targetNote!.midi;
    final responseMs = DateTime.now().difference(_questionStartedAt).inMilliseconds;
    final confidence = ref.read(confidenceProvider);

    // Record per-note accuracy for weak-note analysis.
    _noteHistory.putIfAbsent(_targetNote!.midi, () => []).add(isCorrect);
    _updateWeakNotes();

    _sessionTotal++;
    if (isCorrect) _sessionCorrect++;

    // SR update.
    if (_srQueue.isNotEmpty && _srQueueIndex < _srQueue.length) {
      final currentItem = _srQueue[_srQueueIndex];
      final response = isCorrect
          ? (_questionHadError ? SRResponse.hard : SRResponse.good)
          : SRResponse.again;
      final result = _srScheduler.schedule(item: currentItem, response: response);
      ref.read(srItemsProvider.notifier).updateItem(result.updatedItem);
      if (isCorrect) _srQueueIndex++;
    }
    if (!isCorrect) _questionHadError = true;

    setState(() {
      _showFeedback = true;
      _feedback = isCorrect ? 'Perfect!' : 'Try ${_targetNote!.name}';
    });

    ref.read(masteryProvider.notifier).recordAttempt(
      topicId: _noteReadingTopicId,
      correct: isCorrect,
      responseMs: responseMs,
      confidence: confidence,
    );

    // Update Fever Mode before awarding points so multiplier is current.
    final progressBeforeUpdate = ref.read(playerProgressProvider);
    ref.read(feverProvider.notifier).evaluate(
      currentStreak: progressBeforeUpdate.currentStreak,
      lastActiveAt: progressBeforeUpdate.lastActiveAt,
    );

    if (isCorrect) {
      ref.read(playerProgressProvider.notifier).recordCorrectNote();
      ref.read(questProvider.notifier).recordProgress(QuestMode.practice);

      // Streak milestone toasts (5 / 10 / 25 / 50).
      final newStreak = ref.read(playerProgressProvider).currentStreak;
      const milestoneMessages = {
        5: '5 in a row!',
        10: 'Streak of 10 — Fever incoming!',
        25: "25! You're on fire.",
        50: '50 streak. Legendary.',
      };
      final milestoneMsg = milestoneMessages[newStreak];
      if (milestoneMsg != null && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(milestoneMsg),
          duration: const Duration(seconds: 2),
          backgroundColor: const Color(0xFF1A237E),
        ));
      }

      // Award harmony points (1 × fever multiplier).
      final fever = ref.read(feverProvider);
      final pts = (fever.streakMultiplier).round().clamp(1, 10);
      ref.read(playerProgressProvider.notifier).addHarmonyPoints(pts);
      setState(() => _sessionPoints += pts);

      // Audio reward tone.
      ref.read(soundFeedbackProvider).playCorrect();

      // Broken Blade: end session after mission length correct answers.
      if (widget.isBrokenBladeMode &&
          _sessionCorrect >= kBrokenBladeMissionLength) {
        ref.read(playerProgressProvider.notifier).completeBrokenBladeRecovery();
        _feedbackController.forward(from: 0.0).then((_) {
          if (mounted) _showBladeRestoredAndPop();
        });
        return;
      }

      _feedbackController.forward(from: 0.0).then((_) {
        if (mounted) {
          setState(() => _generateQuestion());
        }
      });
    } else {
      ref.read(playerProgressProvider.notifier).recordIncorrectNote();
      // Audio error signal.
      ref.read(soundFeedbackProvider).playWrong();
      // Wait-Mode: show the correct answer for 1.2 s, then re-enable buttons.
      _feedbackController.forward(from: 0.0).then((_) {
        if (mounted) {
          setState(() {
            _showFeedback = false;
            _feedback = null;
          });
        }
      });
    }
  }

  void _showBladeRestoredAndPop() {
    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (_) => AlertDialog(
        backgroundColor: const Color(0xFF1A237E),
        title: const Text(
          'Blade Restored!',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
          textAlign: TextAlign.center,
        ),
        content: const Text(
          'Your warm-up is complete. The streak lives on.',
          style: TextStyle(color: Colors.white70),
          textAlign: TextAlign.center,
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              context.go('/');
            },
            child: const Text('Continue', style: TextStyle(color: Color(0xFFFFD54F))),
          ),
        ],
      ),
    );
  }

  /// Called when leaving the screen — shows summary, then checks grade advancement.
  Future<void> _onExit() async {
    _sessionTimer?.cancel();
    // Show session summary only if notes were played and not in Broken Blade
    // (Broken Blade has its own "Blade Restored!" dialog).
    if (_sessionTotal > 0 && !widget.isBrokenBladeMode && mounted) {
      await showDialog<void>(
        context: context,
        builder: (_) => _buildSummaryDialog(),
      );
    }
    if (!mounted) return;

    // Record session for the parent/teacher heatmap.
    if (_sessionTotal > 0) {
      final confidence = ref.read(confidenceProvider);
      await _persistence.recordSession(SessionRecord(
        startedAt: _sessionStartTime,
        durationSeconds:
            DateTime.now().difference(_sessionStartTime).inSeconds,
        notesPlayed: _sessionTotal,
        correctNotes: _sessionCorrect,
        gradeLevel: ref.read(playerProgressProvider).gradeLevel,
        exerciseType:
            widget.isBrokenBladeMode ? 'broken_blade' : 'practice',
        confidenceAtStart: _confidenceAtStart,
        confidenceAtEnd: confidence,
      ));

      final accuracy = _sessionCorrect / _sessionTotal;
      await _persistence.recordEngagement(EngagementPoint(
        timestamp: _sessionStartTime,
        topic: widget.isFocusMode ? 'focus' : 'note_id',
        focusDuration: _elapsed.inSeconds.toDouble(),
        wasHyperfocused: accuracy >= 0.95 && _elapsed.inMinutes >= 10,
        wasOffTask: accuracy < 0.40,
        errorsInWindow: _sessionTotal - _sessionCorrect,
      ));
    }
    if (!mounted) return;

    final advanced = ref
        .read(playerProgressProvider.notifier)
        .checkAndAdvanceGrade(
          sessionTotal: _sessionTotal,
          sessionCorrect: _sessionCorrect,
        );
    if (advanced && mounted) {
      final newGrade = ref.read(playerProgressProvider).gradeLevel;
      setState(() {
        _showLevelUp = true;
        _newGradeLevel = newGrade;
      });
      Future.delayed(const Duration(milliseconds: 2500), () {
        if (mounted) {
          setState(() => _showLevelUp = false);
          context.go('/');
        }
      });
    } else {
      if (mounted) context.go('/');
    }
  }

  Widget _buildSummaryDialog() {
    final accuracy = _sessionTotal > 0
        ? (_sessionCorrect / _sessionTotal * 100).round()
        : 0;
    final grade = ref.read(playerProgressProvider).gradeLevel;
    final threshold = kGradeThresholds[grade];
    final String gradeHint;
    if (threshold == null) {
      gradeHint = 'Grade $grade — max level reached!';
    } else if (_sessionTotal >= threshold.minSessionAttempts &&
        accuracy >= (threshold.minSessionAccuracy * 100).round()) {
      gradeHint = 'Grade $grade — ready to advance!';
    } else {
      gradeHint =
          'Grade $grade — need ${(threshold.minSessionAccuracy * 100).round()}%'
          ' over ${threshold.minSessionAttempts} notes';
    }

    return AlertDialog(
      backgroundColor: const Color(0xFF1A237E),
      title: const Text(
        'Practice Complete',
        style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        textAlign: TextAlign.center,
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            'Accuracy: $accuracy%',
            style: const TextStyle(
              color: Color(0xFFFFD54F),
              fontSize: 22,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Notes reviewed: $_sessionTotal',
            style: const TextStyle(color: Colors.white70, fontSize: 14),
          ),
          const SizedBox(height: 12),
          Text(
            gradeHint,
            style: const TextStyle(color: Colors.white60, fontSize: 13),
            textAlign: TextAlign.center,
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Done', style: TextStyle(color: Color(0xFF4FC3F7))),
        ),
      ],
    );
  }

  /// Recompute and persist weak notes after each answer.
  /// A note is "weak" if it has ≥3 attempts and >50% miss rate.
  void _updateWeakNotes() {
    final weak = <int>[];
    for (final entry in _noteHistory.entries) {
      if (entry.value.length >= 3) {
        final missRate =
            entry.value.where((b) => !b).length / entry.value.length;
        if (missRate > 0.5) weak.add(entry.key);
      }
    }
    ref.read(playerProgressProvider.notifier).updateWeakNotes(weak);
  }

  @override
  Widget build(BuildContext context) {
    final confidence = ref.watch(confidenceProvider);
    final progress = ref.watch(playerProgressProvider);
    final fever = ref.watch(feverProvider);
    final highContrast = ref.watch(highContrastProvider);

    // Fire haptic once when Fever Mode activates (false → true transition).
    ref.listen<FeverModeStatus>(feverProvider, (prev, next) {
      if (prev != null && !prev.isFeverActive && next.isFeverActive) {
        HapticEngine.feverModeActivation();
      }
    });

    return Stack(
      children: [
        Scaffold(
      backgroundColor: highContrast ? Colors.black : const Color(0xFF0D1117),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: _onExit,
        ),
        title: Text(
          widget.isBrokenBladeMode
              ? 'Blade Restoration'
              : widget.isFocusMode
                  ? 'Focus Session'
                  : 'Practice',
          style: const TextStyle(color: Colors.white),
        ),
        actions: [
          // Elapsed timer (not shown in Broken Blade mode).
          if (!widget.isBrokenBladeMode)
            Padding(
              padding: const EdgeInsets.only(right: 4),
              child: Center(
                child: Text(
                  _formatElapsed(_elapsed),
                  style: TextStyle(
                    color: _elapsed.inMinutes >= _sessionLengthMinutes - 2
                        ? const Color(0xFFFF6F00)
                        : Colors.white.withAlpha(150),
                    fontSize: 13,
                  ),
                ),
              ),
            ),
          // Session score HUD.
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: Row(
              children: [
                const Icon(Icons.star, color: Color(0xFFFFD54F), size: 18),
                const SizedBox(width: 4),
                Text(
                  '+$_sessionPoints',
                  style: const TextStyle(color: Color(0xFFFFD54F), fontSize: 14),
                ),
              ],
            ),
          ),
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
        child: _targetNote == null
            ? const Center(child: CircularProgressIndicator())
            : Column(
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

            // Grade progress bar — shows how far through this session's threshold.
            _buildSessionProgress(),

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
                  ScaffoldedNote(note: _targetNote!, size: 50),
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
                  _targetNote!.name,
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
        ), // closes Scaffold
        // Level-up fanfare overlay.
        if (_showLevelUp)
          AnimatedOpacity(
            opacity: _showLevelUp ? 1.0 : 0.0,
            duration: ref.read(sessionPrefsProvider).reduceMotion
                ? Duration.zero
                : const Duration(milliseconds: 400),
            child: Container(
              color: const Color(0xCC1A237E),
              alignment: Alignment.center,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.star, color: Color(0xFFFFD54F), size: 64),
                  const SizedBox(height: 16),
                  Text(
                    'Grade $_newGradeLevel Unlocked!',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ),
      ], // closes Stack children
    ); // closes Stack
  }

  Widget _buildSessionProgress() {
    final grade = ref.read(playerProgressProvider).gradeLevel;
    final threshold = kGradeThresholds[grade];
    if (threshold == null) return const SizedBox.shrink(); // max grade

    final attempted = _sessionTotal;
    final needed = threshold.minSessionAttempts;
    final accuracy = attempted > 0 ? _sessionCorrect / attempted : 0.0;
    final accuracyNeeded = threshold.minSessionAccuracy;

    // Progress toward minimum attempts (the gating requirement).
    final attemptsProgress = (attempted / needed).clamp(0.0, 1.0);
    final onTrack = accuracy >= accuracyNeeded || attempted == 0;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Grade $grade → ${grade + 1}',
                style: TextStyle(
                  color: Colors.white.withAlpha(120),
                  fontSize: 11,
                ),
              ),
              Text(
                attempted == 0
                    ? 'Need $needed notes at ${(accuracyNeeded * 100).round()}%'
                    : '$attempted/$needed  •  ${(accuracy * 100).round()}% acc',
                style: TextStyle(
                  color: onTrack
                      ? Colors.white.withAlpha(120)
                      : const Color(0xFFFF6F00).withAlpha(200),
                  fontSize: 11,
                ),
              ),
            ],
          ),
          const SizedBox(height: 3),
          ClipRRect(
            borderRadius: BorderRadius.circular(2),
            child: LinearProgressIndicator(
              value: attemptsProgress,
              minHeight: 3,
              backgroundColor: Colors.white.withAlpha(25),
              valueColor: AlwaysStoppedAnimation<Color>(
                onTrack ? const Color(0xFF4FC3F7) : const Color(0xFFFF6F00),
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatElapsed(Duration d) {
    final m = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final s = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  Widget _buildAnswerButton(Note note, double confidence) {
    final isCorrect = note.midi == _targetNote?.midi;
    final showResult = _showFeedback;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: _showFeedback ? null : () => _handleAnswer(note),
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
