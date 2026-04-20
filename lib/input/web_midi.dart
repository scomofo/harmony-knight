import 'package:harmony_knight/models/note.dart';

/// Callback type for when a MIDI note is received.
typedef NoteCallback = void Function(Note note);

/// Handles Web MIDI input, filtering duplicates and note-off noise.
///
/// Fixes:
///   - duplicate triggers (only note-on with velocity > 0)
///   - note-off noise (status != 144 or velocity == 0 ignored)
///   - phantom inputs (velocity gate)
class WebMidiHandler {
  NoteCallback? onNote;

  /// Convert a raw MIDI note number to a [Note].
  Note _convert(int midiNote) {
    return Note(midi: midiNote);
  }

  /// Handle raw MIDI data from the Web MIDI API.
  ///
  /// Expected format: [status, note, velocity].
  void handle(List<int> data) {
    if (data.length < 3) return;

    final status = data[0];
    final note = data[1];
    final velocity = data[2];

    // Only process note-on messages (status 144) with non-zero velocity.
    // Status 144 = note-on on channel 1. Velocity 0 = note-off equivalent.
    if (status != 144 || velocity == 0) return;

    onNote?.call(_convert(note));
  }
}
