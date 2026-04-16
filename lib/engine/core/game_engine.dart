import 'audio_clock.dart';
import 'chart_note.dart';
import 'hit_result.dart';
import 'input_frame.dart';
import 'note_tracker.dart';
import '../charting/chart.dart';
import '../feedback/feedback_frame.dart';
import '../scoring/scoring_engine.dart';

/// The deterministic gameplay engine.
///
/// Contract:
///   - Every [update] call is pure: given (time, input), it mutates
///     internal state and produces an [EngineState] snapshot.
///   - No I/O, no async, no DateTime.now(), no Stopwatch.
///   - All timing flows from [AudioClock].
///   - Charts are immutable and precomputed.
///   - Safe to run headless (tests, replays, regression suites).
///
/// The engine does NOT own:
///   - Audio playback (that's the audio service)
///   - Microphone capture (that's the input system)
///   - Rendering (that's the renderer reading [state])
///
/// The engine DOES own:
///   - Note tracking
///   - Scoring
///   - Feedback generation
///   - Session statistics
class GameEngine {
  final Chart chart;
  final ScoringEngine scoring;
  final NoteTracker _tracker;
  final FeedbackQueue _feedback;
  final ScoringStats _stats;

  /// All hit results produced this session, in order.
  final List<HitResult> _history = [];

  /// Called whenever a note is resolved (hit or missed). Useful for
  /// analytics, haptics, and adaptive difficulty — but NEVER for
  /// gameplay timing decisions.
  void Function(HitResult)? onNoteResolved;

  bool _running = false;
  double _lastUpdateTime = -1.0;

  GameEngine({
    required this.chart,
    ScoringEngine? scoring,
    NoteTracker? tracker,
    FeedbackQueue? feedback,
    ScoringStats? stats,
  })  : scoring = scoring ?? const ScoringEngine(),
        _tracker = tracker ?? NoteTracker(chart),
        _feedback = feedback ?? FeedbackQueue(),
        _stats = stats ?? ScoringStats();

  bool get isRunning => _running;
  double get lastUpdateTime => _lastUpdateTime;
  ScoringStats get stats => _stats;
  NoteTracker get tracker => _tracker;
  List<HitResult> get history => List.unmodifiable(_history);

  void start() {
    _running = true;
    _lastUpdateTime = -1.0;
  }

  void stop() {
    _running = false;
  }

  void reset() {
    _running = false;
    _lastUpdateTime = -1.0;
    _tracker.reset();
    _stats.reset();
    _feedback.clear();
    _history.clear();
  }

  /// Advance the engine by one frame.
  ///
  /// Must be called once per render frame with:
  ///   - [time]: current audio clock position (seconds)
  ///   - [input]: the input frame captured for this time (may be silent)
  ///
  /// Returns a snapshot of the engine state for rendering.
  EngineState update({
    required double time,
    required InputFrame input,
  }) {
    if (!_running) {
      return EngineState(
        time: time,
        activeNotes: const [],
        upcomingNotes: const [],
        latestFeedback: _feedback.latest,
        stats: _stats,
        progress: _tracker.progress(),
        running: false,
      );
    }

    // Monotonic check — if the clock went backwards, we have a bug upstream.
    // Tolerate tiny jitter (< 1ms) but log larger regressions.
    assert(
      _lastUpdateTime < 0 || time >= _lastUpdateTime - 0.001,
      'AudioClock went backwards: $_lastUpdateTime -> $time',
    );
    _lastUpdateTime = time;

    // Step 1: Advance tracker. Any notes that expired this frame are
    // auto-missed.
    final justMissed = _tracker.update(time);
    for (final missed in justMissed) {
      final miss = HitResult.miss(missed, time);
      _stats.record(miss);
      _history.add(miss);
      _feedback.push(FeedbackFrame.miss(time));
      onNoteResolved?.call(miss);
    }

    // Step 2: If the input has a valid pitch, try to score it against
    // the nearest active note.
    if (input.hasPitch()) {
      final target = _tracker.nearestActiveNote(time);
      if (target != null) {
        final result = scoring.evaluate(
          note: target,
          input: input,
          time: time,
        );
        if (result != null) {
          _tracker.markHit(target.id);
          _stats.record(result);
          _history.add(result);
          _feedback.push(FeedbackFrame.fromHit(result));
          onNoteResolved?.call(result);
        }
      }
    }

    // Step 3: Expire old feedback.
    _feedback.update(time);

    return EngineState(
      time: time,
      activeNotes: _tracker.activeNotes.toList(growable: false),
      upcomingNotes:
          _tracker.upcomingNotes(time).toList(growable: false),
      latestFeedback: _feedback.latest,
      allFeedback: _feedback.active,
      stats: _stats,
      progress: _tracker.progress(),
      running: _running,
      lastInput: input,
    );
  }
}

/// Immutable snapshot of engine state for a single frame. Rendered by
/// the UI layer, never mutated.
class EngineState {
  final double time;
  final List<ChartNote> activeNotes;
  final List<ChartNote> upcomingNotes;
  final FeedbackFrame? latestFeedback;
  final List<FeedbackFrame> allFeedback;
  final ScoringStats stats;
  final double progress;
  final bool running;
  final InputFrame? lastInput;

  const EngineState({
    required this.time,
    required this.activeNotes,
    required this.upcomingNotes,
    this.latestFeedback,
    this.allFeedback = const [],
    required this.stats,
    required this.progress,
    required this.running,
    this.lastInput,
  });
}
