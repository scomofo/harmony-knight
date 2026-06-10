import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_soloud/flutter_soloud.dart';
import 'package:go_router/go_router.dart';
import 'package:harmony_knight/engine/audio_service.dart';
import 'package:harmony_knight/engine/persistence.dart';
import 'package:harmony_knight/engine/tone_generator.dart';
import 'package:harmony_knight/providers/audio_provider.dart';
import 'package:harmony_knight/providers/scaffolding_provider.dart';

class _TriadQuality {
  final String name;
  final List<int> semitones; // offsets from root for [root, 3rd, 5th]
  final String intervalShorthand;
  const _TriadQuality(this.name, this.semitones, this.intervalShorthand);
}

/// Level 4 Triad Ear Training Screen.
///
/// Plays a root-position triad as an ascending arpeggio (root → 3rd → 5th);
/// player identifies the quality (Major/Minor/Augmented/Diminished) from four
/// buttons. 8 questions per session. Wait-Mode on wrong answers; 800ms
/// quality+interval reveal on correct before advancing.
class TriadScreen extends ConsumerStatefulWidget {
  final List<String>? debugQualitySequence;
  final List<int>? debugRootSequence;
  final bool autoPlay;
  final bool recordSessionOnComplete;

  const TriadScreen({
    super.key,
    this.debugQualitySequence,
    this.debugRootSequence,
    this.autoPlay = true,
    this.recordSessionOnComplete = true,
  });

  @override
  ConsumerState<TriadScreen> createState() => _TriadScreenState();
}

class _TriadScreenState extends ConsumerState<TriadScreen> {
  static const _qualities = [
    _TriadQuality('Major', [0, 4, 7], 'Root · M3 · P5'),
    _TriadQuality('Minor', [0, 3, 7], 'Root · m3 · P5'),
    _TriadQuality('Augmented', [0, 4, 8], 'Root · M3 · A5'),
    _TriadQuality('Diminished', [0, 3, 6], 'Root · m3 · d5'),
  ];

  static const _roots = [60, 62, 64, 65, 67]; // C4 D4 E4 F4 G4
  static const _rootNames = {60: 'C', 62: 'D', 64: 'E', 65: 'F', 67: 'G'};

  final _rng = Random();
  late _TriadQuality _current;
  late int _rootMidi;
  int _debugQualityIndex = 0;
  int _debugRootIndex = 0;

  int _questionsAsked = 0;
  int _correctFirstTry = 0;
  bool _questionHadError = false;
  bool _waitMode = false;
  bool _showReveal = false;
  bool _sessionComplete = false;

  late final DateTime _sessionStartTime;
  double _confidenceAtStart = 0.0;
  final _persistence = PersistenceService();

  AudioSource? _rootSource;
  AudioSource? _thirdSource;
  AudioSource? _fifthSource;

  @override
  void initState() {
    super.initState();
    _sessionStartTime = DateTime.now();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _confidenceAtStart = ref.read(confidenceProvider);
    });
    _nextQuestion();
    if (widget.autoPlay) {
      Future.delayed(const Duration(milliseconds: 400), _playArpeggio);
    }
  }

  @override
  void dispose() {
    _disposeSources();
    super.dispose();
  }

  void _nextQuestion() {
    _current = _nextQuality();
    _rootMidi = _nextRoot();
    _questionHadError = false;
    _waitMode = false;
    _showReveal = false;
  }

  _TriadQuality _nextQuality() {
    final sequence = widget.debugQualitySequence;
    if (sequence == null || sequence.isEmpty) {
      return _qualities[_rng.nextInt(_qualities.length)];
    }

    final name = sequence[_debugQualityIndex % sequence.length];
    _debugQualityIndex++;
    return _qualities.firstWhere(
      (quality) => quality.name == name,
      orElse: () => _qualities[_rng.nextInt(_qualities.length)],
    );
  }

  int _nextRoot() {
    final sequence = widget.debugRootSequence;
    if (sequence == null || sequence.isEmpty) {
      return _roots[_rng.nextInt(_roots.length)];
    }

    final root = sequence[_debugRootIndex % sequence.length];
    _debugRootIndex++;
    return _roots.contains(root) ? root : _roots[_rng.nextInt(_roots.length)];
  }

  Future<void> _playArpeggio() async {
    if (!mounted) return;
    final audio = AudioService();
    if (!audio.isInitialized) return;
    try {
      _disposeSources();

      final root = _rootMidi;
      final third = root + _current.semitones[1];
      final fifth = root + _current.semitones[2];

      _rootSource = await audio.soloud.loadMem(
        'triad_r_$root.wav',
        ToneGenerator.samplesToWav(
          ToneGenerator.generateSineTone(
              midiNote: root, durationMs: 400, volume: 0.7),
        ),
      );
      audio.soloud.play(_rootSource!);

      await Future<void>.delayed(const Duration(milliseconds: 450));
      if (!mounted) return;

      _thirdSource = await audio.soloud.loadMem(
        'triad_t_$third.wav',
        ToneGenerator.samplesToWav(
          ToneGenerator.generateSineTone(
              midiNote: third, durationMs: 400, volume: 0.7),
        ),
      );
      audio.soloud.play(_thirdSource!);

      await Future<void>.delayed(const Duration(milliseconds: 450));
      if (!mounted) return;

      _fifthSource = await audio.soloud.loadMem(
        'triad_f_$fifth.wav',
        ToneGenerator.samplesToWav(
          ToneGenerator.generateSineTone(
              midiNote: fifth, durationMs: 400, volume: 0.7),
        ),
      );
      audio.soloud.play(_fifthSource!);
    } catch (_) {}
  }

  void _disposeSources() {
    final audio = AudioService();
    if (!audio.isInitialized) return;
    try {
      if (_rootSource != null) audio.soloud.disposeSource(_rootSource!);
      if (_thirdSource != null) audio.soloud.disposeSource(_thirdSource!);
      if (_fifthSource != null) audio.soloud.disposeSource(_fifthSource!);
    } catch (_) {}
    _rootSource = _thirdSource = _fifthSource = null;
  }

  void _handleAnswer(_TriadQuality chosen) {
    if (_showReveal || _sessionComplete) return;
    if (chosen.name == _current.name) {
      if (!_questionHadError) _correctFirstTry++;
      ref.read(soundFeedbackProvider).playCorrect();
      setState(() {
        _waitMode = false;
        _showReveal = true;
      });
      final nextQ = _questionsAsked + 1;
      Future.delayed(const Duration(milliseconds: 800), () {
        if (!mounted) return;
        if (nextQ >= 8) {
          setState(() {
            _questionsAsked = nextQ;
            _sessionComplete = true;
          });
          if (widget.recordSessionOnComplete) _recordSession();
          _awardPoints();
        } else {
          setState(() {
            _questionsAsked = nextQ;
            _nextQuestion();
          });
          if (widget.autoPlay) _playArpeggio();
        }
      });
    } else {
      _questionHadError = true;
      ref.read(soundFeedbackProvider).playWrong();
      setState(() => _waitMode = true);
      if (widget.autoPlay) {
        Future.delayed(const Duration(milliseconds: 500), _playArpeggio);
      }
    }
  }

  void _recordSession() {
    final durationSeconds =
        DateTime.now().difference(_sessionStartTime).inSeconds;
    final grade = ref.read(playerProgressProvider).gradeLevel;
    final confidenceNow = ref.read(confidenceProvider);
    _persistence.recordSession(SessionRecord(
      startedAt: _sessionStartTime,
      durationSeconds: durationSeconds,
      notesPlayed: 8,
      correctNotes: _correctFirstTry,
      gradeLevel: grade,
      exerciseType: 'triad',
      confidenceAtStart: _confidenceAtStart,
      confidenceAtEnd: confidenceNow,
    ));
  }

  void _awardPoints() {
    final pts = 5 + (_correctFirstTry / 8 * 10).round();
    ref.read(playerProgressProvider.notifier).addHarmonyPoints(pts);
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
        title:
            const Text('Triad Training', style: TextStyle(color: Colors.white)),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Center(
              child: Text(
                _sessionComplete ? 'Done!' : 'Q ${_questionsAsked + 1} / 8',
                style:
                    TextStyle(color: Colors.white.withAlpha(180), fontSize: 13),
              ),
            ),
          ),
        ],
      ),
      body: _sessionComplete ? _buildComplete() : _buildQuestion(),
    );
  }

  Widget _buildQuestion() {
    final rootName = _rootNames[_rootMidi] ?? 'C';
    return Column(
      children: [
        const SizedBox(height: 32),
        Text('Root: $rootName',
            style: const TextStyle(color: Colors.white54, fontSize: 16)),
        const SizedBox(height: 8),
        const Text(
          'What triad quality did you hear?',
          style: TextStyle(
              color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 8),
        TextButton.icon(
          onPressed: _playArpeggio,
          icon: const Icon(Icons.replay, color: Color(0xFFFF7043), size: 18),
          label: const Text('Replay',
              style: TextStyle(color: Color(0xFFFF7043), fontSize: 13)),
        ),
        const SizedBox(height: 16),
        AnimatedOpacity(
          opacity: _waitMode ? 1.0 : 0.0,
          duration: const Duration(milliseconds: 200),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFFFF5252).withAlpha(40),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFFF5252).withAlpha(120)),
            ),
            child: const Text('Wrong — try again',
                style: TextStyle(color: Color(0xFFFF5252), fontSize: 13)),
          ),
        ),
        const Spacer(),
        if (_showReveal) _buildReveal() else _buildAnswerButtons(),
        const Spacer(),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: _questionsAsked / 8,
              minHeight: 6,
              backgroundColor: Colors.white.withAlpha(20),
              valueColor:
                  const AlwaysStoppedAnimation<Color>(Color(0xFFFF7043)),
            ),
          ),
        ),
        const SizedBox(height: 32),
      ],
    );
  }

  Widget _buildReveal() {
    return Column(
      children: [
        const Icon(Icons.check_circle, color: Color(0xFF69F0AE), size: 48),
        const SizedBox(height: 12),
        Text(
          _current.name,
          style: const TextStyle(
              color: Color(0xFFFF7043),
              fontSize: 28,
              fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 4),
        Text(
          _current.intervalShorthand,
          style: TextStyle(color: Colors.white.withAlpha(150), fontSize: 16),
        ),
      ],
    );
  }

  Widget _buildAnswerButtons() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: _qualities.map((q) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFFF7043).withAlpha(20),
                  foregroundColor: Colors.white,
                  side:
                      BorderSide(color: const Color(0xFFFF7043).withAlpha(100)),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: () => _handleAnswer(q),
                child: Text(q.name, style: const TextStyle(fontSize: 16)),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildComplete() {
    final pts = 5 + (_correctFirstTry / 8 * 10).round();
    final pct = (_correctFirstTry / 8 * 100).round();

    Color gradeColor;
    String gradeLabel;
    if (pct >= 100) {
      gradeColor = const Color(0xFF69F0AE);
      gradeLabel = 'Perfect!';
    } else if (pct >= 75) {
      gradeColor = const Color(0xFF4FC3F7);
      gradeLabel = 'Well done!';
    } else if (pct >= 50) {
      gradeColor = const Color(0xFFFFD54F);
      gradeLabel = 'Keep practising';
    } else {
      gradeColor = const Color(0xFFFF5252);
      gradeLabel = 'Try again!';
    }

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(gradeLabel,
                style: TextStyle(
                    color: gradeColor,
                    fontSize: 28,
                    fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            Text('$_correctFirstTry / 8 first-try correct',
                style: const TextStyle(color: Colors.white, fontSize: 20)),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.star, color: Color(0xFFFFD54F), size: 22),
                const SizedBox(width: 6),
                Text('+$pts Harmony Points',
                    style: const TextStyle(
                        color: Color(0xFFFFD54F),
                        fontSize: 16,
                        fontWeight: FontWeight.bold)),
              ],
            ),
            const SizedBox(height: 48),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFFF7043),
                padding:
                    const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: () {
                setState(() {
                  _questionsAsked = 0;
                  _correctFirstTry = 0;
                  _sessionComplete = false;
                  _nextQuestion();
                });
                if (widget.autoPlay) {
                  Future.delayed(
                      const Duration(milliseconds: 400), _playArpeggio);
                }
              },
              child: const Text('New Session',
                  style: TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.bold)),
            ),
            const SizedBox(height: 16),
            TextButton(
              onPressed: () => context.go('/'),
              child: Text('Back to Home',
                  style: TextStyle(
                      color: Colors.white.withAlpha(150), fontSize: 14)),
            ),
          ],
        ),
      ),
    );
  }
}
