# ADR-0001: Deterministic Game Engine Architecture

## Status
Accepted

## Date
2026-05-29

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | Flutter 3.41+ / Dart 3.6+ |
| **Domain** | Core / Game Loop |
| **Knowledge Risk** | LOW — Flutter 3.41 is within LLM training data |
| **References Consulted** | `lib/engine/core/game_engine.dart`, `lib/engine/core/audio_clock.dart` |
| **Post-Cutoff APIs Used** | None |
| **Verification Required** | Engine must produce identical output for identical (time, input) sequences in headless tests |

## ADR Dependencies

| Field | Value |
|-------|-------|
| **Depends On** | None |
| **Enables** | ADR-0002 (Riverpod state reads from EngineState snapshots), ADR-0003 (session stats written after engine stop) |
| **Blocks** | Real-time practice mode cannot ship until AudioClock is wired to the practice screen |
| **Ordering Note** | This ADR is the root of all gameplay timing decisions |

## Context

### Problem Statement
A music theory game requires tight synchronisation between audio playback, user
input (microphone pitch detection), and visual feedback. A naive implementation
that calls `DateTime.now()` in the game loop, mixes async I/O with timing
decisions, or allows non-deterministic state will produce timing jitter,
untestable behaviour, and divergent replays.

### Constraints
- Flutter's widget rebuild cycle is not frame-locked; the engine must not depend on it
- Microphone capture is async by nature — it must be decoupled from the scoring logic
- ADHD learners are sensitive to audiovisual latency; the system must minimise jitter
- The engine must be testable headlessly (no device, no audio hardware)

### Requirements
- Engine state must be a pure function of `(time: double, input: InputFrame)` per frame
- No I/O, no async, no `DateTime.now()` inside the update loop
- All timing must flow from a single `AudioClock` source
- Charts (note sequences) must be immutable and precomputed
- The engine must be safe to run in unit tests without Flutter bindings

## Decision

The `GameEngine` is a deterministic, pure-function update loop:

```
EngineState = GameEngine.update(time: double, input: InputFrame)
```

**What the engine owns:**
- Note tracking (NoteTracker) — advancing note lifecycle, detecting misses
- Scoring (ScoringEngine) — evaluating pitch accuracy in cents and timing in ms
- Feedback generation (FeedbackQueue) — hit/miss feedback frames for the renderer
- Session statistics (ScoringStats) — running totals, streak, accuracy

**What the engine does NOT own:**
- Audio playback — delegated to `lib/engine/audio/audio_service.dart`
- Microphone capture — delegated to `lib/engine/input/input_system.dart`
- Rendering — the UI layer reads `EngineState` snapshots; it never mutates engine state
- Persistence — `AdaptiveAnalyzer` runs after session end, never during the loop

**Timing model:**
```
AudioClock ──► FrameDriver ──► GameEngine.update(time, input) ──► EngineState
                                       │
                              NoteTracker advances
                              ScoringEngine evaluates
                              FeedbackQueue updates
```

The `AudioClock` is backed by `just_audio`'s playback position — audio is the
clock, not the system clock. This ensures audio and visual feedback stay in sync
regardless of frame rate variance.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                   Flutter UI Layer                   │
│  (reads EngineState — never writes engine state)     │
└──────────────────────┬──────────────────────────────┘
                       │ EngineState (immutable snapshot)
┌──────────────────────▼──────────────────────────────┐
│                    GameEngine                        │
│  update(time, input) → EngineState                   │
│  ┌───────────────┐ ┌──────────────┐ ┌─────────────┐ │
│  │  NoteTracker  │ │ScoringEngine │ │FeedbackQueue│ │
│  └───────────────┘ └──────────────┘ └─────────────┘ │
└──────────────────────┬──────────────────────────────┘
                       │ (time, InputFrame)
┌──────────────────────▼──────────────────────────────┐
│               FrameDriver + AudioClock               │
│  AudioClock backed by just_audio playback position   │
└──────────┬───────────────────────┬──────────────────┘
           │                       │
   ┌───────▼───────┐     ┌────────▼────────┐
   │ Audio Service │     │  Input System   │
   │  (just_audio) │     │ (mic + pitch    │
   │               │     │  detection)     │
   └───────────────┘     └─────────────────┘
```

### Key Interfaces

```dart
// The only entry point into the engine per frame
EngineState GameEngine.update({
  required double time,   // seconds from AudioClock
  required InputFrame input,
})

// InputFrame: captured once per frame, passed in
class InputFrame {
  final double time;          // when this input was captured
  final double? frequency;    // null if no pitch detected
  final double confidence;    // 0.0–1.0
  bool hasPitch({double minConfidence = 0.5});
}

// EngineState: immutable snapshot for the renderer
class EngineState {
  final List<ChartNote> activeNotes;
  final List<ChartNote> upcomingNotes;
  final FeedbackFrame? latestFeedback;
  final ScoringStats stats;
  final double progress;   // 0.0–1.0 through the chart
  final bool running;
}
```

## Alternatives Considered

### Alternative A: Stateful widget-driven loop
- **Description**: Drive the game loop from Flutter's `Ticker` / `AnimationController`, read `DateTime.now()` for timing, handle audio events reactively
- **Pros**: Simpler integration with Flutter widget tree; no separate engine abstraction
- **Cons**: Non-deterministic (DateTime jitter), untestable headlessly, audio/visual sync impossible, rebuild-coupled
- **Rejection Reason**: Untestable and timing-unreliable for a rhythm-sensitive game

### Alternative B: Isolate-based engine
- **Description**: Run the engine in a separate Dart isolate with message passing to the UI
- **Pros**: True concurrency; UI never blocks the engine
- **Cons**: Message passing overhead; complex synchronisation; Flutter's isolate model complicates widget interaction; premature optimisation for current scope
- **Rejection Reason**: Complexity not justified at current scale; revisit if CPU profiling shows bottleneck

### Alternative C: Existing Flutter game engine (Flame)
- **Description**: Use Flame's `FlameGame` and `Component` system
- **Pros**: Mature ecosystem, built-in game loop, sprite support
- **Cons**: Harmony Knight is a music theory app with custom UI, not a sprite-based game; Flame's model would be fighting the Flutter widget tree rather than working with it
- **Rejection Reason**: Wrong tool for this domain; the app is fundamentally a Flutter UI with a scoring engine, not a sprite game

## Consequences

### Positive
- Fully headless-testable: pass any `(time, input)` sequence, assert on `EngineState`
- Replay support: record `(time, input)` pairs, replay deterministically
- Clear separation: audio/input/rendering teams can work independently
- Latency controlled: AudioClock ensures audio and scoring share the same timeline

### Negative
- `GameEngine` is not yet wired to `PracticeScreen` or `DuelScreen` — current screens use simpler quiz loops
- Requires `FrameDriver` integration work before the real-time engine goes live
- Two audio services currently coexist (`audio_service.dart` and `audio/audio_service.dart`) — must be consolidated before shipping

### Risks
- **AudioClock drift**: if `just_audio` position reporting is inconsistent on some devices, the clock will drift → mitigation: add clock-drift detection in `AudioClock`
- **Input latency**: microphone buffer sizes vary by device → mitigation: expose `InputFrame.latency` for calibration
- **Frame skips**: if Flutter drops frames, the engine receives irregular `time` deltas → the engine already asserts monotonicity; add graceful handling for large deltas

## GDD Requirements Addressed

| GDD System | Requirement | How This ADR Addresses It |
|------------|-------------|--------------------------|
| practice-system.md | Fever Mode requires accurate streak counting | Deterministic ScoringStats tracks streak without timestamp ambiguity |
| duel-system.md | Wait-Mode: duel never advances on a timer | Engine is timer-free; DuelEngine is a separate turn-based system outside this loop |
| practice-system.md | Weak-note detection requires per-note history | `onNoteResolved` callback provides HitResult to external analytics without coupling to engine |

## Performance Implications
- **CPU**: `update()` is synchronous and runs once per frame; target < 1ms per call
- **Memory**: `EngineState` is a value snapshot; old states are GC'd immediately
- **Load Time**: charts are precomputed; no runtime generation in the hot path
- **Network**: None

## Migration Plan
Current state: `GameEngine` exists but `PracticeScreen` and `DuelScreen` use simple quiz loops.

Migration path:
1. Wire `FrameDriver` to Flutter's `Ticker` (one-time setup)
2. Wire `AudioClock` to `just_audio` playback position
3. Replace the quiz loop in `PracticeScreen` with `GameEngine.update()` calls
4. `DuelEngine` remains a separate turn-based system (not driven by this loop)

## Validation Criteria
- Unit tests: given identical `(time, input)` sequences, `EngineState` output is bit-identical
- Integration test: 10-note chart plays to completion; `ScoringStats.totalScoreable == 10`
- Clock test: `AudioClock` position matches `just_audio` position within ±2ms over a 60-second chart
