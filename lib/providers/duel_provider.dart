import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:harmony_knight/core/constants.dart';
import 'package:harmony_knight/models/note.dart';
import 'package:harmony_knight/models/duel_state.dart';
import 'package:harmony_knight/engine/duel_engine.dart';

/// State notifier for the Collaborative Counterpoint Duel.
///
/// Manages the turn-based duel against the Discord Sentinel AI.
/// The duel uses Wait-Mode: it never advances until the user provides
/// a valid harmonic response. No timers, no performance anxiety.
class DuelNotifier extends StateNotifier<DuelState> {
  final DuelEngine _engine = DuelEngine();

  DuelNotifier() : super(const DuelState(cantusFirmus: []));

  /// Start a new duel at the given grade level.
  void startDuel({int gradeLevel = 0}) {
    final cantus = _engine.generateCantusFirmus(gradeLevel: gradeLevel);
    state = DuelState(cantusFirmus: cantus);
  }

  /// Submit a user's counterpoint note for the current turn.
  ///
  /// Returns true if the move was valid, false if rejected (ghost note shown).
  bool submitNote(Note userNote) {
    final currentCantus = state.currentCantusFirmusNote;
    if (currentCantus == null || state.isComplete) return false;

    // Get previous turn context for parallel motion checks.
    Note? prevCantus;
    Note? prevUser;
    if (state.currentTurn > 0) {
      prevCantus = state.cantusFirmus[state.currentTurn - 1];
      prevUser = state.userCounterpoint[state.currentTurn - 1];
    }

    final result = _engine.validateMove(
      cantusNote: currentCantus,
      userNote: userNote,
      previousCantusNote: prevCantus,
      previousUserNote: prevUser,
    );

    if (!result.isValid) {
      // Invalid move: show a ghost resolution.
      final ghost = _engine.suggestGhostResolution(
        cantusNote: currentCantus,
        previousCantusNote: prevCantus,
        previousUserNote: prevUser,
      );
      state = state.copyWith(
        ghostSuggestion: ghost?.suggestedNote,
      );
      return false;
    }

    // Valid move: advance the duel.
    final meterDelta = _engine.harmonyMeterDelta(result);
    final newMeter = (state.harmonyMeter + meterDelta).clamp(0.0, 1.0);
    final newTurn = state.currentTurn + 1;
    final isComplete = newTurn >= state.totalTurns;

    final turnResult = TurnResult(
      cantusNote: currentCantus,
      userNote: userNote,
      quality: result.quality,
    );

    state = state.copyWith(
      userCounterpoint: [...state.userCounterpoint, userNote],
      currentTurn: newTurn,
      harmonyMeter: newMeter,
      isComplete: isComplete,
      turnHistory: [...state.turnHistory, turnResult],
      clearGhost: true,
    );

    return true;
  }

  /// Accept the ghost note suggestion (tap-to-learn).
  bool acceptGhostSuggestion() {
    if (state.ghostSuggestion == null) return false;
    final ghost = state.ghostSuggestion!;

    // Treat resolved dissonance as a "Big Win."
    final currentCantus = state.currentCantusFirmusNote;
    if (currentCantus == null) return false;

    final quality = currentCantus.intervalQualityTo(ghost);
    final meterDelta = _engine.harmonyMeterDelta(
      DuelMoveResult(quality: quality, violations: [], isValid: true),
      dissonanceResolved: true,
    );

    final newMeter = (state.harmonyMeter + meterDelta).clamp(0.0, 1.0);
    final newTurn = state.currentTurn + 1;
    final isComplete = newTurn >= state.totalTurns;

    final nonGhostNote = ghost.copyWith(isGhost: false);
    final turnResult = TurnResult(
      cantusNote: currentCantus,
      userNote: nonGhostNote,
      quality: quality,
      wasDissonanceResolved: true,
    );

    state = state.copyWith(
      userCounterpoint: [...state.userCounterpoint, nonGhostNote],
      currentTurn: newTurn,
      harmonyMeter: newMeter,
      isComplete: isComplete,
      turnHistory: [...state.turnHistory, turnResult],
      clearGhost: true,
    );

    return true;
  }

  /// Reset the duel state.
  void reset() {
    state = const DuelState(cantusFirmus: []);
  }
}

final duelProvider =
    StateNotifierProvider<DuelNotifier, DuelState>((ref) {
  return DuelNotifier();
});
