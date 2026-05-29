import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:harmony_knight/screens/practice_screen.dart';

// Grade 0 pool is always C4 (60), E4 (64), G4 (67).
// Note.name returns the full octave name, e.g. "C4".
const _grade0Names = ['C4', 'E4', 'G4'];

// Wrap in a minimal ProviderScope + MaterialApp.
// No router needed: none of these tests trigger navigation.
Widget _buildSubject({bool isBrokenBladeMode = false}) => ProviderScope(
      child: MaterialApp(
        home: PracticeScreen(isBrokenBladeMode: isBrokenBladeMode),
      ),
    );

// At confidence=0 (default), PracticeScreen shows the target note name as both
// a large hint text AND a button label. Non-target notes appear only in buttons.
// Returns null if the target can't be detected (shouldn't happen for grade 0).
String? _targetName(WidgetTester tester) {
  for (final name in _grade0Names) {
    if (tester.widgetList(find.text(name)).length >= 2) return name;
  }
  return null;
}

String? _wrongName(WidgetTester tester, String target) {
  for (final name in _grade0Names) {
    if (name != target && tester.widgetList(find.text(name)).isNotEmpty) {
      return name;
    }
  }
  return null;
}

void main() {
  group('PracticeScreen', () {
    testWidgets('renders note prompt once pool builds', (tester) async {
      await tester.pumpWidget(_buildSubject());
      await tester.pumpAndSettle();

      expect(find.text('What note is this?'), findsOneWidget);
    });

    testWidgets('all three grade-0 note buttons are present', (tester) async {
      await tester.pumpWidget(_buildSubject());
      await tester.pumpAndSettle();

      for (final name in _grade0Names) {
        expect(find.text(name), findsWidgets,
            reason: '$name button should be visible in grade-0 pool');
      }
    });

    testWidgets('tapping correct answer shows Perfect! feedback', (tester) async {
      await tester.pumpWidget(_buildSubject());
      await tester.pumpAndSettle();

      final target = _targetName(tester);
      expect(target, isNotNull);

      // Hint is first in the tree; button is last — tap the button.
      await tester.tap(find.text(target!).last);
      await tester.pump();

      expect(find.text('Perfect!'), findsOneWidget);
    });

    testWidgets('correct answer increments streak counter', (tester) async {
      await tester.pumpWidget(_buildSubject());
      await tester.pumpAndSettle();

      expect(find.text('0'), findsOneWidget);

      final target = _targetName(tester);
      expect(target, isNotNull);

      await tester.tap(find.text(target!).last);
      await tester.pump();

      expect(find.text('1'), findsOneWidget);
    });

    testWidgets('tapping wrong answer shows Try feedback', (tester) async {
      await tester.pumpWidget(_buildSubject());
      await tester.pumpAndSettle();

      final target = _targetName(tester);
      expect(target, isNotNull);
      final wrong = _wrongName(tester, target!);
      expect(wrong, isNotNull);

      await tester.tap(find.text(wrong!).first);
      await tester.pump();

      expect(find.textContaining('Try'), findsOneWidget);
    });

    testWidgets('wrong answer does not increment streak', (tester) async {
      await tester.pumpWidget(_buildSubject());
      await tester.pumpAndSettle();

      expect(find.text('0'), findsOneWidget);

      final target = _targetName(tester);
      expect(target, isNotNull);
      final wrong = _wrongName(tester, target!);
      expect(wrong, isNotNull);

      await tester.tap(find.text(wrong!).first);
      await tester.pump();

      expect(find.text('0'), findsOneWidget);
    });
  });
}
