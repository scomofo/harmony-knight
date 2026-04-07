import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:harmony_knight/models/note.dart';
import 'package:harmony_knight/painters/scaffolding_note_painter.dart';
import 'package:harmony_knight/providers/scaffolding_provider.dart';

/// A single note rendered with scaffolding based on the confidence slider.
///
/// Automatically morphs from Figurenotes (colors/shapes) to standard notation
/// (black ovals) based on the global confidence provider.
class ScaffoldedNote extends ConsumerWidget {
  final Note note;
  final double size;
  final VoidCallback? onTap;

  const ScaffoldedNote({
    super.key,
    required this.note,
    this.size = 40,
    this.onTap,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final confidence = ref.watch(confidenceProvider);

    return GestureDetector(
      onTap: onTap,
      child: SizedBox(
        width: size,
        height: size,
        child: CustomPaint(
          painter: ScaffoldingNotePainter(
            confidence: confidence,
            figureNoteColor: note.figureNoteColor,
            figureNoteShape: note.figureNoteShape,
            isGhost: note.isGhost,
          ),
        ),
      ),
    );
  }
}

/// A row of scaffolded notes (used for cantus firmus or counterpoint display).
class ScaffoldedNoteRow extends ConsumerWidget {
  final List<Note> notes;
  final int? highlightIndex;
  final double noteSize;
  final void Function(int index, Note note)? onNoteTap;

  const ScaffoldedNoteRow({
    super.key,
    required this.notes,
    this.highlightIndex,
    this.noteSize = 40,
    this.onNoteTap,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(notes.length, (i) {
        final isHighlighted = i == highlightIndex;
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            decoration: isHighlighted
                ? BoxDecoration(
                    border: Border.all(color: Colors.amber, width: 2),
                    borderRadius: BorderRadius.circular(8),
                  )
                : null,
            padding: const EdgeInsets.all(4),
            child: ScaffoldedNote(
              note: notes[i],
              size: noteSize,
              onTap: onNoteTap != null ? () => onNoteTap!(i, notes[i]) : null,
            ),
          ),
        );
      }),
    );
  }
}
