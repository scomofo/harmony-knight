import 'package:equatable/equatable.dart';
import 'package:harmony_knight/core/constants.dart';
import 'package:harmony_knight/models/note.dart';

/// The state of a Collaborative Counterpoint Duel against the Discord Sentinel.
class DuelState extends Equatable {
  /// The AI's Cantus Firmus melody (fixed melody the user harmonizes against).
  final List<Note> cantusFirmus;

  /// The user's counterpoint response notes placed so far.
  final List<Note> userCounterpoint;

  /// Current turn index (which note in the cantus we're harmonizing).
  final int currentTurn;

  /// The Harmony Meter value (0.0 to 1.0). Fills with consonances.
  final double harmonyMeter;

  /// Whether the duel is complete.
  final bool isComplete;

  /// Ghost note suggestion from the AI (shown when user makes an error).
  final Note? ghostSuggestion;

  /// History of interval qualities for each completed turn.
  final List<TurnResult> turnHistory;

  const DuelState({
    required this.cantusFirmus,
    this.userCounterpoint = const [],
    this.currentTurn = 0,
    this.harmonyMeter = 0.0,
    this.isComplete = false,
    this.ghostSuggestion = null,
    this.turnHistory = const [],
  });

  /// The current cantus firmus note the user must harmonize against.
  Note? get currentCantusFirmusNote =>
      currentTurn < cantusFirmus.length ? cantusFirmus[currentTurn] : null;

  /// Total turns in this duel.
  int get totalTurns => cantusFirmus.length;

  /// Remaining turns.
  int get remainingTurns => totalTurns - currentTurn;

  DuelState copyWith({
    List<Note>? cantusFirmus,
    List<Note>? userCounterpoint,
    int? currentTurn,
    double? harmonyMeter,
    bool? isComplete,
    Note? ghostSuggestion,
    List<TurnResult>? turnHistory,
    bool clearGhost = false,
  }) {
    return DuelState(
      cantusFirmus: cantusFirmus ?? this.cantusFirmus,
      userCounterpoint: userCounterpoint ?? this.userCounterpoint,
      currentTurn: currentTurn ?? this.currentTurn,
      harmonyMeter: harmonyMeter ?? this.harmonyMeter,
      isComplete: isComplete ?? this.isComplete,
      ghostSuggestion: clearGhost ? null : (ghostSuggestion ?? this.ghostSuggestion),
      turnHistory: turnHistory ?? this.turnHistory,
    );
  }

  @override
  List<Object?> get props => [
        cantusFirmus, userCounterpoint, currentTurn,
        harmonyMeter, isComplete, ghostSuggestion, turnHistory,
      ];
}

/// Result of a single turn in the duel.
class TurnResult extends Equatable {
  final Note cantusNote;
  final Note userNote;
  final IntervalQuality quality;
  final bool wasDissonanceResolved;

  const TurnResult({
    required this.cantusNote,
    required this.userNote,
    required this.quality,
    this.wasDissonanceResolved = false,
  });

  /// The "Big Win" bonus applies when a dissonance was properly resolved.
  bool get grantsBigWinBonus => wasDissonanceResolved;

  @override
  List<Object?> get props => [cantusNote, userNote, quality, wasDissonanceResolved];
}
