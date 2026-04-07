import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:harmony_knight/engine/fever_mode_engine.dart';
import 'package:harmony_knight/providers/scaffolding_provider.dart';

/// Provider for Fever Mode and Broken Blade streak recovery state.
class FeverNotifier extends StateNotifier<FeverModeStatus> {
  final FeverModeEngine _engine = FeverModeEngine();

  FeverNotifier()
      : super(const FeverModeStatus(
          isFeverActive: false,
          streakMultiplier: 1.0,
          requiresBrokenBladeRecovery: false,
          brokenBladeMissionLength: 0,
        ));

  /// Re-evaluate Fever Mode based on current player progress.
  void evaluate({required int currentStreak, required DateTime lastActiveAt}) {
    state = _engine.evaluate(
      currentStreak: currentStreak,
      lastActiveAt: lastActiveAt,
    );
  }
}

final feverProvider =
    StateNotifierProvider<FeverNotifier, FeverModeStatus>((ref) {
  return FeverNotifier();
});
