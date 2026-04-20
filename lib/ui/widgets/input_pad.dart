import 'package:flutter/material.dart';
import 'package:harmony_knight/models/note.dart';
import 'package:harmony_knight/ui/theme/app_theme.dart';

/// Interactive note input pad for the game screen.
///
/// Renders the C major scale as tappable buttons with subtle press feedback.
class InputPad extends StatelessWidget {
  final void Function(Note note) onNote;

  const InputPad({super.key, required this.onNote});

  static const _noteNames = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  static const _noteMidi = [60, 62, 64, 65, 67, 69, 71];

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      alignment: WrapAlignment.center,
      children: List.generate(_noteNames.length, (i) {
        return _NoteButton(
          label: _noteNames[i],
          onPressed: () => onNote(Note(midi: _noteMidi[i])),
        );
      }),
    );
  }
}

class _NoteButton extends StatelessWidget {
  final String label;
  final VoidCallback onPressed;

  const _NoteButton({required this.label, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: AppTheme.darkSurface,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
          side: BorderSide(color: AppTheme.accent.withAlpha(80)),
        ),
        elevation: 0,
      ),
      child: Text(
        label,
        style: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
