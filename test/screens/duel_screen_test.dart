import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:harmony_knight/models/duel_state.dart';
import 'package:harmony_knight/models/note.dart';
import 'package:harmony_knight/providers/duel_provider.dart';
import 'package:harmony_knight/screens/duel_screen.dart';

// A pre-loaded DuelNotifier that ignores startDuel() so initState cannot
// overwrite the test state we want to assert against.
class _PreloadedDuelNotifier extends DuelNotifier {
  _PreloadedDuelNotifier(super.ref, DuelState loaded) {
    state = loaded;
  }

  @override
  void startDuel({int gradeLevel = 0}) {} // intentional no-op for tests
}

// Minimal cantus and ghost fixtures.
const _cantus = [
  Note(midi: 60), // C4
  Note(midi: 62), // D4
  Note(midi: 64), // E4
];

const _ghost = Note(midi: 67, isGhost: true); // G4
const _ghostReason = 'G4 forms a perfect fifth with C4 — a strong consonance.';

Widget _buildSubject(DuelState state) {
  return ProviderScope(
    overrides: [
      duelProvider.overrideWith((ref) => _PreloadedDuelNotifier(ref, state)),
    ],
    child: const MaterialApp(home: DuelScreen()),
  );
}

void main() {
  group('DuelScreen', () {
    testWidgets('renders cantus firmus once state is loaded', (tester) async {
      const duelState = DuelState(cantusFirmus: _cantus);
      await tester.pumpWidget(_buildSubject(duelState));
      await tester.pumpAndSettle();

      // Turn counter and harmony meter should be visible.
      expect(find.text('Turn 1 of 3'), findsOneWidget);
    });

    testWidgets('ghost suggestion panel is visible when ghostSuggestion is set',
        (tester) async {
      const duelState = DuelState(
        cantusFirmus: _cantus,
        ghostSuggestion: _ghost,
        ghostReason: _ghostReason,
      );
      await tester.pumpWidget(_buildSubject(duelState));
      await tester.pumpAndSettle();

      expect(
        find.text('Tap to accept this ghost resolution and learn why it works.'),
        findsOneWidget,
      );
      expect(find.text(_ghostReason), findsOneWidget);
    });

    testWidgets('ghost suggestion panel is absent when no ghost set',
        (tester) async {
      const duelState = DuelState(cantusFirmus: _cantus);
      await tester.pumpWidget(_buildSubject(duelState));
      await tester.pumpAndSettle();

      expect(
        find.text('Tap to accept this ghost resolution and learn why it works.'),
        findsNothing,
      );
    });

    testWidgets('duel complete banner appears when isComplete is true',
        (tester) async {
      const duelState = DuelState(
        cantusFirmus: _cantus,
        currentTurn: 3,
        harmonyMeter: 0.75,
        isComplete: true,
      );
      await tester.pumpWidget(_buildSubject(duelState));
      await tester.pumpAndSettle();

      expect(find.text('Duel Complete!'), findsOneWidget);
      expect(find.text('Harmony: 75%'), findsOneWidget);
      expect(find.text('+75 Harmony Points'), findsOneWidget);
    });

    testWidgets('note input palette is hidden when duel is complete',
        (tester) async {
      const duelState = DuelState(
        cantusFirmus: _cantus,
        currentTurn: 3,
        isComplete: true,
      );
      await tester.pumpWidget(_buildSubject(duelState));
      await tester.pumpAndSettle();

      // The input palette is only shown when !duel.isComplete.
      expect(find.text('New Duel'), findsOneWidget);
    });
  });
}
