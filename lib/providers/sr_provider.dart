import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:harmony_knight/engine/persistence.dart';
import 'package:harmony_knight/engine/spaced_repetition.dart';
import 'package:harmony_knight/models/note.dart';

/// Manages SR item state keyed by item ID (e.g. 'note_60').
class SRItemsNotifier extends StateNotifier<Map<String, SRItem>> {
  final PersistenceService _persistence = PersistenceService();

  SRItemsNotifier() : super({}) {
    _loadFromDisk();
  }

  Future<void> _loadFromDisk() async {
    final items = await _persistence.loadSRItems();
    if (mounted) {
      state = Map.fromEntries(items.map((i) => MapEntry(i.id, i)));
    }
  }

  /// Update one item and fire-and-forget save.
  void updateItem(SRItem item) {
    state = {...state, item.id: item};
    _persistence.saveSRItems(state.values.toList());
  }

  /// Clear all SR history (settings reset).
  void clearAll() {
    state = {};
    _persistence.saveSRItems([]);
  }

  /// Return SR items for [notePool], creating default items for unseen notes.
  List<SRItem> itemsForPool(int gradeLevel, List<Note> notePool) {
    return notePool.map((note) {
      final id = 'note_${note.midi}';
      return state[id] ??
          SRItem(
            id: id,
            topic: note.name,
            gradeLevel: gradeLevel,
            nextReviewAt: DateTime.now(),
          );
    }).toList();
  }
}

final srItemsProvider =
    StateNotifierProvider<SRItemsNotifier, Map<String, SRItem>>((ref) {
  return SRItemsNotifier();
});
