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

class _Interval {
  final String name;
  final int semitones;
  const _Interval(this.name, this.semitones);
}

/// Level 4 Interval Ear Training Screen.
///
/// Plays a root note then an interval note; player identifies the interval
/// from four choices. 8 questions per session. Wait-Mode on wrong answers.
/// Correct answers show a name+semitone reveal for 800ms before advancing.
class IntervalScreen extends ConsumerStatefulWidget {
  const IntervalScreen({super.key});

  @override
  ConsumerState<IntervalScreen> createState() => _IntervalScreenState();
}

class _IntervalScreenState extends ConsumerState<IntervalScreen> {
  static const _intervals = [
    _Interval('Minor 2nd', 1),
    _Interval('Major 2nd', 2),
    _Interval('Minor 3rd', 3),
    _Interval('Major 3rd', 4),
    _Interval('Perfect 4th', 5),
    _Interval('Perfect 5th', 7),
    _Interval('Minor 6th', 8),
    _Interval('Major 6th', 9),
    _Interval('Minor 7th', 10),
    _Interval('Major 7th', 11),
    _Interval('Octave', 12),
  ];

  static const _roots = [60, 62, 64, 65, 67]; // C4 D4 E4 F4 G4
  static const _rootNames = {60: 'C', 62: 'D', 64: 'E', 65: 'F', 67: 'G'};

  final _rng = Random();
  late _Interval _current;
  late int _rootMidi;
  late List<_Interval> _options;

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
  AudioSource? _ivSource;

  @override
  void initState() {
    super.initState();
    _sessionStartTime = DateTime.now();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _confidenceAtStart = ref.read(confidenceProvider);
    });
    _nextQuestion();
    Future.delayed(const Duration(milliseconds: 400), _playInterval);
  }

  @override
  void dispose() {
    _disposeSources();
    super.dispose();
  }

  void _nextQuestion() {
    _current = _intervals[_rng.nextInt(_intervals.length)];
    _rootMidi = _roots[_rng.nextInt(_roots.length)];
    _options = _buildOptions(_current);
    _questionHadError = false;
    _waitMode = false;
    _showReveal = false;
  }

  List<_Interval> _buildOptions(_Interval correct) {
    final others = _intervals.where((i) => i.semitones != correct.semitones).toList()
      ..shuffle(_rng);
    return ([correct, ...others.take(3)])..shuffle(_rng);
  }

  Future<void> _playInterval() async {
    if (!mounted) return;
    final audio = AudioService();
    if (!audio.isInitialized) return;
    try {
      _disposeSources();
      final rootWav = ToneGenerator.samplesToWav(
        ToneGenerator.generateSineTone(midiNote: _rootMidi, durationMs: 500, volume: 0.7),
      );
      _rootSource = await audio.soloud.loadMem('int_r_$_rootMidi.wav', rootWav);
      audio.soloud.play(_rootSource!);

      await Future.delayed(const Duration(milliseconds: 650));
      if (!mounted) return;

      final ivMidi = _rootMidi + _current.semitones;
      final ivWav = ToneGenerator.samplesToWav(
        ToneGenerator.generateSineTone(midiNote: ivMidi, durationMs: 500, volume: 0.7),
      );
      _ivSource = await audio.soloud.loadMem('int_iv_$ivMidi.wav', ivWav);
      audio.soloud.play(_ivSource!);
    } catch (_) {}
  }

  void _disposeSources() {
    final audio = AudioService();
    if (!audio.isInitialized) return;
    try {
      if (_rootSource != null) audio.soloud.disposeSource(_rootSource!);
      if (_ivSource != null) audio.soloud.disposeSource(_ivSource!);
    } catch (_) {}
    _rootSource = null;
    _ivSource = null;
  }

  void _handleAnswer(_Interval chosen) {
    if (_showReveal || _sessionComplete) return;
    if (chosen.semitones == _current.semitones) {
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
          _recordSession();
          _awardPoints();
        } else {
          setState(() {
            _questionsAsked = nextQ;
            _nextQuestion();
          });
          _playInterval();
        }
      });
    } else {
      _questionHadError = true;
      ref.read(soundFeedbackProvider).playWrong();
      setState(() => _waitMode = true);
      Future.delayed(const Duration(milliseconds: 500), _playInterval);
    }
  }

  void _recordSession() {
    final durationSeconds = DateTime.now().difference(_sessionStartTime).inSeconds;
    final grade = ref.read(playerProgressProvider).gradeLevel;
    final confidenceNow = ref.read(confidenceProvider);
    _persistence.recordSession(SessionRecord(
      startedAt: _sessionStartTime,
      durationSeconds: durationSeconds,
      notesPlayed: 8,
      correctNotes: _correctFirstTry,
      gradeLevel: grade,
      exerciseType: 'interval',
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
        title: const Text('Interval Training', style: TextStyle(color: Colors.white)),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Center(
              child: Text(
                _sessionComplete ? 'Done!' : 'Q ${_questionsAsked + 1} / 8',
                style: TextStyle(color: Colors.white.withAlpha(180), fontSize: 13),
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
          'What interval did you hear?',
          style: TextStyle(
              color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        TextButton.icon(
          onPressed: _playInterval,
          icon: const Icon(Icons.replay, color: Color(0xFFFFB300), size: 18),
          label: const Text('Replay',
              style: TextStyle(color: Color(0xFFFFB300), fontSize: 13)),
        ),
        const SizedBox(height: 16),
        AnimatedOpacity(
          opacity: _waitMode ? 1.0 : 0.0,
          duration: const Duration(milliseconds: 200),
          child: Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFFFF5252).withAlpha(40),
              borderRadius: BorderRadius.circular(16),
              border:
                  Border.all(color: const Color(0xFFFF5252).withAlpha(120)),
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
                  const AlwaysStoppedAnimation<Color>(Color(0xFFFFB300)),
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
              color: Color(0xFFFFB300),
              fontSize: 28,
              fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 4),
        Text(
          '${_current.semitones} semitone${_current.semitones == 1 ? '' : 's'}',
          style: TextStyle(color: Colors.white.withAlpha(150), fontSize: 16),
        ),
      ],
    );
  }

  Widget _buildAnswerButtons() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: _options.map((opt) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFFFB300).withAlpha(20),
                  foregroundColor: Colors.white,
                  side: BorderSide(
                      color: const Color(0xFFFFB300).withAlpha(100)),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: () => _handleAnswer(opt),
                child:
                    Text(opt.name, style: const TextStyle(fontSize: 16)),
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
                style:
                    const TextStyle(color: Colors.white, fontSize: 20)),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.star, color: Color(0xFFFFD54F), size: 22),
                const SizedBox(width: 6),
                Text(
                  '+$pts Harmony Points',
                  style: const TextStyle(
                      color: Color(0xFFFFD54F),
                      fontSize: 16,
                      fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 48),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFFFB300),
                padding: const EdgeInsets.symmetric(
                    horizontal: 32, vertical: 14),
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
                Future.delayed(
                    const Duration(milliseconds: 400), _playInterval);
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
