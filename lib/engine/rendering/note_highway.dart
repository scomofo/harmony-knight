import '../core/chart_note.dart';
import '../core/game_engine.dart';

/// A renderable note with its computed screen position.
class RenderNote {
  final ChartNote note;

  /// Y position on screen (0 = hit line, positive = above, approaching).
  /// Depending on coordinate system you may invert this in the painter.
  final double yPosition;

  /// Seconds until the note hits the line. Negative = already passed.
  final double timeUntilHit;

  /// Whether this note is currently within its hit window.
  final bool isActive;

  const RenderNote({
    required this.note,
    required this.yPosition,
    required this.timeUntilHit,
    required this.isActive,
  });
}

/// Computes render positions for notes on the note highway.
///
/// Pure function of (engine state, scroll speed). No state of its own —
/// called every frame by the UI layer to get a fresh render list.
class NoteHighwayRenderer {
  /// Pixels per second the notes travel down the highway.
  final double scrollSpeedPxPerSec;

  /// How far above the hit line (in seconds) notes become visible.
  final double lookAheadSeconds;

  /// How far below the hit line (in seconds) notes remain visible
  /// before being culled (for "just missed" animations).
  final double lookBehindSeconds;

  const NoteHighwayRenderer({
    this.scrollSpeedPxPerSec = 500.0,
    this.lookAheadSeconds = 3.0,
    this.lookBehindSeconds = 0.3,
  });

  /// Compute render positions for all visible notes given engine state.
  List<RenderNote> render(EngineState state) {
    final result = <RenderNote>[];
    final currentTime = state.time;

    // Render upcoming notes (above the hit line).
    for (final n in state.upcomingNotes) {
      final timeUntil = n.time - currentTime;
      if (timeUntil > lookAheadSeconds) break;
      if (timeUntil < -lookBehindSeconds) continue;
      result.add(RenderNote(
        note: n,
        yPosition: timeUntil * scrollSpeedPxPerSec,
        timeUntilHit: timeUntil,
        isActive: false,
      ));
    }

    // Render active notes (currently in hit window).
    for (final n in state.activeNotes) {
      final timeUntil = n.time - currentTime;
      if (timeUntil < -lookBehindSeconds) continue;
      result.add(RenderNote(
        note: n,
        yPosition: timeUntil * scrollSpeedPxPerSec,
        timeUntilHit: timeUntil,
        isActive: true,
      ));
    }

    return result;
  }
}
