import 'package:flutter/material.dart';

import '../core/game_engine.dart';
import '../core/input_frame.dart';

/// Real-time debug overlay for the engine.
///
/// Shows:
///   - Audio clock time
///   - Target note (nearest active)
///   - Detected pitch + confidence
///   - Timing offset (ms)
///   - Stats: hits/misses, streak, accuracy
///   - Drift indicator (mean timing error)
///
/// Toggle visible via the `visible` flag. In production, gate behind
/// a debug-only build flag. Always available in dev builds.
class EngineDebugOverlay extends StatelessWidget {
  final EngineState state;
  final bool visible;

  const EngineDebugOverlay({
    super.key,
    required this.state,
    this.visible = true,
  });

  @override
  Widget build(BuildContext context) {
    if (!visible) return const SizedBox.shrink();

    final target =
        state.activeNotes.isNotEmpty ? state.activeNotes.first : null;
    final input = state.lastInput;

    return Positioned(
      top: 8,
      right: 8,
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: Colors.black.withValues(alpha: 0.75),
          borderRadius: BorderRadius.circular(4),
        ),
        child: DefaultTextStyle(
          style: const TextStyle(
            color: Colors.white,
            fontFamily: 'monospace',
            fontSize: 11,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              _row('Time', '${state.time.toStringAsFixed(3)}s'),
              _row(
                'Target',
                target == null
                    ? '—'
                    : 'MIDI ${target.midi} @ ${target.time.toStringAsFixed(3)}s',
              ),
              _row('Pitch', _formatPitch(input)),
              _row('Conf', input == null
                  ? '—'
                  : '${(input.confidence * 100).toStringAsFixed(0)}%'),
              _row('Amp', input == null
                  ? '—'
                  : '${(input.amplitude * 100).toStringAsFixed(0)}%'),
              _row('Offset', _formatOffset(state, input)),
              const Divider(color: Colors.white24, height: 8),
              _row('P/G/G/M',
                  '${state.stats.perfects}/${state.stats.greats}/${state.stats.goods}/${state.stats.misses}'),
              _row('Streak',
                  '${state.stats.currentStreak} (max ${state.stats.longestStreak})'),
              _row('Acc',
                  '${(state.stats.accuracy * 100).toStringAsFixed(1)}%'),
              _row('Drift',
                  '${state.stats.meanTimingErrorMs.toStringAsFixed(1)}ms'),
              _row('Progress',
                  '${(state.progress * 100).toStringAsFixed(1)}%'),
            ],
          ),
        ),
      ),
    );
  }

  Widget _row(String label, String value) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 1),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 56,
              child: Text(
                label,
                style: const TextStyle(color: Colors.white70),
              ),
            ),
            Text(value),
          ],
        ),
      );

  String _formatPitch(InputFrame? input) {
    if (input == null) return '—';
    if (input.frequency == null) return 'silent';
    final midi = input.midiContinuous;
    if (midi == null) return '${input.frequency!.toStringAsFixed(1)}Hz';
    return '${input.frequency!.toStringAsFixed(1)}Hz '
        '(MIDI ${midi.toStringAsFixed(2)})';
  }

  String _formatOffset(EngineState state, InputFrame? input) {
    if (input == null || state.activeNotes.isEmpty) return '—';
    final target = state.activeNotes.first;
    final timingMs = (input.time - target.time) * 1000.0;
    final sign = timingMs >= 0 ? '+' : '';
    return '$sign${timingMs.toStringAsFixed(1)}ms';
  }
}
