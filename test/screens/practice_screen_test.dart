import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:harmony_knight/screens/practice_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

// Grade 0 pool is always C4 (60), E4 (64), G4 (67).
// Note.name returns the full octave name, e.g. "C4".
const _grade0Names = ['C4', 'E4', 'G4'];

// Wrap in a minimal ProviderScope + MaterialApp.
// No router needed: none of these tests trigger navigation.
Widget _buildSubject({
  bool isBrokenBladeMode = false,
  bool isFocusMode = false,
}) =>
    ProviderScope(
      child: MaterialApp(
        home: PracticeScreen(
          isBrokenBladeMode: isBrokenBladeMode,
          isFocusMode: isFocusMode,
        ),
      ),
    );

Future<void> _pumpSubject(
  WidgetTester tester, {
  bool isBrokenBladeMode = false,
  bool isFocusMode = false,
}) async {
  await tester.pumpWidget(_buildSubject(
    isBrokenBladeMode: isBrokenBladeMode,
    isFocusMode: isFocusMode,
  ));
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 100));
}

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
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  group('PracticeScreen', () {
    testWidgets('renders note prompt once pool builds', (tester) async {
      await _pumpSubject(tester);

      expect(find.text('What note is this?'), findsOneWidget);
    });

    testWidgets('all three grade-0 note buttons are present', (tester) async {
      await _pumpSubject(tester);

      for (final name in _grade0Names) {
        expect(find.text(name), findsWidgets,
            reason: '$name button should be visible in grade-0 pool');
      }
    });

    testWidgets('tapping correct answer shows Perfect! feedback',
        (tester) async {
      await _pumpSubject(tester);

      final target = _targetName(tester);
      expect(target, isNotNull);

      // Hint is first in the tree; button is last — tap the button.
      await tester.tap(find.text(target!).last);
      await tester.pump();

      expect(find.text('Perfect!'), findsOneWidget);
    });

    testWidgets('correct answer increments streak counter', (tester) async {
      await _pumpSubject(tester);

      expect(find.text('0'), findsOneWidget);

      final target = _targetName(tester);
      expect(target, isNotNull);

      await tester.tap(find.text(target!).last);
      await tester.pump();

      expect(find.text('1'), findsOneWidget);
    });

    testWidgets('tapping wrong answer shows Try feedback', (tester) async {
      await _pumpSubject(tester);

      final target = _targetName(tester);
      expect(target, isNotNull);
      final wrong = _wrongName(tester, target!);
      expect(wrong, isNotNull);

      await tester.tap(find.text(wrong!).first);
      await tester.pump();

      expect(find.textContaining('Try'), findsOneWidget);
    });

    testWidgets('wrong answer does not increment streak', (tester) async {
      await _pumpSubject(tester);

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

  group('PracticeScreen — Focus Session mode', () {
    testWidgets('AppBar shows Focus Session title', (tester) async {
      await _pumpSubject(tester, isFocusMode: true);

      expect(find.text('Focus Session'), findsOneWidget);
    });

    testWidgets('normal mode AppBar shows Practice title', (tester) async {
      await _pumpSubject(tester);

      expect(find.text('Practice'), findsOneWidget);
    });

    testWidgets('focus mode with no weak notes falls back to grade pool',
        (tester) async {
      // Default PlayerProgress has weakNotesMidi=[] — fallback to grade 0 pool.
      await _pumpSubject(tester, isFocusMode: true);

      // Grade-0 notes should appear (fallback is active).
      var found = false;
      for (final name in _grade0Names) {
        if (tester.widgetList(find.text(name)).isNotEmpty) {
          found = true;
          break;
        }
      }
      expect(found, isTrue,
          reason:
              'Focus mode with empty weak notes must fall back to grade pool');
    });

    testWidgets('focus mode still shows note prompt', (tester) async {
      await _pumpSubject(tester, isFocusMode: true);

      expect(find.text('What note is this?'), findsOneWidget);
    });
  });

  group('PracticeScreen — accessibility', () {
    testWidgets('answer buttons expose their note name to a screen reader',
        (tester) async {
      final handle = tester.ensureSemantics();
      await _pumpSubject(tester);

      for (final name in _grade0Names) {
        expect(find.bySemanticsLabel(name), findsOneWidget,
            reason: '$name button should carry a semantics label so a '
                'screen reader or switch-access user can select it');
      }

      handle.dispose();
    });

    testWidgets(
        'target note announces its name once the visual hint is showing',
        (tester) async {
      final handle = tester.ensureSemantics();
      await _pumpSubject(tester);

      // Default confidence is 0 (< 0.5), matching the visual name hint that
      // is also showing at this point — the semantics label should match.
      final target = _targetName(tester);
      expect(target, isNotNull);
      expect(find.bySemanticsLabel('Target note: $target'), findsOneWidget);

      handle.dispose();
    });
  });
}
