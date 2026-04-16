import 'package:flutter/services.dart';
import 'package:harmony_knight/models/note.dart';

/// Callback type for keyboard-triggered notes.
typedef KeyNoteCallback = void Function(Note note);

/// Maps physical keyboard keys to musical notes.
///
/// Guards against key-repeat by only processing [KeyDownEvent].
/// Maps the home row (A-J) to the C major scale (C4-B4).
class KeyboardInputHandler {
  KeyNoteCallback? onNote;

  /// Key-to-note-name mapping (home row -> C major scale).
  static const _keyMap = {
    'a': 'C',
    's': 'D',
    'd': 'E',
    'f': 'F',
    'g': 'G',
    'h': 'A',
    'j': 'B',
  };

  /// Note-name-to-MIDI mapping (octave 4).
  static const _noteToMidi = {
    'C': 60,
    'D': 62,
    'E': 64,
    'F': 65,
    'G': 67,
    'A': 69,
    'B': 71,
  };

  /// Handle a raw key event from Flutter's keyboard system.
  ///
  /// Only processes [KeyDownEvent] to prevent duplicate triggers from
  /// key-repeat. Maps home-row keys to C major scale notes.
  void handleKeyEvent(KeyEvent event) {
    if (event is! KeyDownEvent) return;

    final key = event.character?.toLowerCase();
    if (key == null) return;

    final noteName = _keyMap[key];
    if (noteName == null) return;

    final midi = _noteToMidi[noteName];
    if (midi == null) return;

    onNote?.call(Note(midi: midi));
  }
}
