import 'package:equatable/equatable.dart';
import 'package:harmony_knight/core/constants.dart';
import 'package:flutter/material.dart';

/// Represents a musical note with pitch, duration, and scaffolding metadata.
class Note extends Equatable {
  /// MIDI note number (21 = A0, 60 = C4, 108 = C8).
  final int midi;

  /// Duration in beats (1.0 = quarter note, 0.5 = eighth, etc.).
  final double durationBeats;

  /// Optional: is this a "ghost note" suggestion from the AI?
  final bool isGhost;

  const Note({
    required this.midi,
    this.durationBeats = 1.0,
    this.isGhost = false,
  });

  /// Pitch class (0-11, C=0).
  int get pitchClass => midi % 12;

  /// Octave number (C4 = octave 4).
  int get octave => (midi ~/ 12) - 1;

  /// Figurenotes color for this note.
  Color get figureNoteColor => FigureNoteColors.forMidi(midi);

  /// Figurenotes shape for this note.
  FigureNoteShape get figureNoteShape => FigureNoteShapes.forPitchClass(pitchClass);

  /// Standard note name (e.g., "C4", "F#5").
  String get name {
    const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return '${names[pitchClass]}$octave';
  }

  /// Interval in semitones from this note to another.
  int intervalTo(Note other) => other.midi - midi;

  /// Classify the harmonic interval to another note.
  IntervalQuality intervalQualityTo(Note other) {
    return IntervalClassification.classify(intervalTo(other));
  }

  Note copyWith({int? midi, double? durationBeats, bool? isGhost}) {
    return Note(
      midi: midi ?? this.midi,
      durationBeats: durationBeats ?? this.durationBeats,
      isGhost: isGhost ?? this.isGhost,
    );
  }

  @override
  List<Object?> get props => [midi, durationBeats, isGhost];

  @override
  String toString() => 'Note($name, ${durationBeats}b${isGhost ? ", ghost" : ""})';
}
