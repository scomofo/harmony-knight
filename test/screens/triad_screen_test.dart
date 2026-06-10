import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:harmony_knight/providers/scaffolding_provider.dart';
import 'package:harmony_knight/screens/triad_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

Widget _buildSubject({
  List<String> qualities = const ['Major'],
  List<int> roots = const [60],
}) {
  return ProviderScope(
    child: MaterialApp(
      home: TriadScreen(
        debugQualitySequence: qualities,
        debugRootSequence: roots,
        autoPlay: false,
        recordSessionOnComplete: false,
      ),
    ),
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  group('TriadScreen', () {
    testWidgets('shows Triad Training app bar title', (tester) async {
      await tester.pumpWidget(_buildSubject());
      await tester.pump();

      expect(find.text('Triad Training'), findsOneWidget);
      expect(find.text('Q 1 / 8'), findsOneWidget);
    });

    testWidgets('correct tap shows quality reveal', (tester) async {
      await tester.pumpWidget(_buildSubject());
      await tester.pump();

      await tester.tap(find.text('Major'));
      await tester.pump();

      expect(find.byIcon(Icons.check_circle), findsOneWidget);
      expect(find.text('Root · M3 · P5'), findsOneWidget);

      await tester.pump(const Duration(milliseconds: 801));
    });

    testWidgets('wrong tap shows Wait-Mode feedback', (tester) async {
      await tester.pumpWidget(_buildSubject());
      await tester.pump();

      await tester.tap(find.text('Minor'));
      await tester.pump();

      expect(find.textContaining('Wrong'), findsOneWidget);
      expect(find.text('Q 1 / 8'), findsOneWidget);
    });

    testWidgets('eight correct answers completes session and awards points',
        (tester) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const MaterialApp(
            home: TriadScreen(
              debugQualitySequence: ['Major'],
              debugRootSequence: [60],
              autoPlay: false,
              recordSessionOnComplete: false,
            ),
          ),
        ),
      );
      await tester.pump();

      for (var i = 0; i < 8; i++) {
        await tester.tap(find.text('Major'));
        await tester.pump(const Duration(milliseconds: 801));
      }

      expect(find.text('Perfect!'), findsOneWidget);
      expect(find.text('8 / 8 first-try correct'), findsOneWidget);
      expect(find.text('+15 Harmony Points'), findsOneWidget);
      expect(container.read(playerProgressProvider).harmonyPoints, 15);
    });
  });
}
