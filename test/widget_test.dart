// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:harmony_knight/core/router.dart';
import 'package:harmony_knight/main.dart';
import 'package:harmony_knight/providers/mastery_provider.dart';
import 'package:harmony_knight/providers/quest_provider.dart';
import 'package:harmony_knight/providers/scaffolding_provider.dart';
import 'package:harmony_knight/screens/practice_screen.dart';
import 'package:harmony_knight/widgets/scaffolded_note.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  testWidgets('app smoke test', (WidgetTester tester) async {
    appRouter.go('/');
    await tester.pumpWidget(const ProviderScope(child: HarmonyKnightApp()));
    await tester.pump();

    expect(find.text('Harmony Knight'), findsOneWidget);
  });

  testWidgets('home exposes the real-time gameplay route',
      (WidgetTester tester) async {
    appRouter.go('/');
    await tester.pumpWidget(const ProviderScope(child: HarmonyKnightApp()));
    await tester.pump();

    expect(find.text('Real-Time'), findsOneWidget);

    await tester.ensureVisible(find.text('Real-Time'));
    await tester.pump();
    await tester.tap(find.text('Real-Time'));
    await tester.pumpAndSettle();

    expect(find.text('Real-Time Training'), findsOneWidget);
    expect(find.text('Start Run'), findsOneWidget);
  });

  testWidgets('home shows recommended quest and daily path',
      (WidgetTester tester) async {
    appRouter.go('/');
    await tester.pumpWidget(const ProviderScope(child: HarmonyKnightApp()));
    await tester.pump();

    expect(find.text('Next Quest'), findsOneWidget);
    expect(find.text('Read 5 notes'), findsWidgets);
    expect(find.text('Daily Path'), findsOneWidget);
    expect(find.text('Hit 6 notes in Real-Time'), findsOneWidget);
    expect(find.text('Win 1 Duel turn'), findsOneWidget);
  });

  testWidgets('home prompts new players to start note-reading mastery',
      (WidgetTester tester) async {
    appRouter.go('/');
    await tester.pumpWidget(const ProviderScope(child: HarmonyKnightApp()));
    await tester.pump();

    expect(find.text('Note reading: start your first attempt'), findsOneWidget);
  });

  testWidgets('home shows note-reading mastery stars',
      (WidgetTester tester) async {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    await container.read(masteryProvider.notifier).recordAttempt(
          topicId: 'note-reading-c4-b4',
          correct: true,
          responseMs: 1200,
          confidence: 0.7,
        );

    appRouter.go('/');
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const HarmonyKnightApp(),
      ),
    );
    await tester.pump();

    expect(find.text('Note reading: 2/3 stars'), findsOneWidget);
  });

  testWidgets('home claim button awards Harmony points once',
      (WidgetTester tester) async {
    final prefs = await SharedPreferences.getInstance();
    final completed = QuestNotifier.initialState().copyWith(
      recommendedQuest:
          QuestNotifier.initialState().recommendedQuest.increment(amount: 5),
      dailyQuests: [
        QuestNotifier.initialState().dailyQuests[0].increment(amount: 5),
        QuestNotifier.initialState().dailyQuests[1],
        QuestNotifier.initialState().dailyQuests[2],
      ],
    );
    await prefs.setString(QuestNotifier.storageKey, completed.toJsonString());

    final container = ProviderContainer(
      overrides: [
        questProvider.overrideWith((ref) => QuestNotifier(prefs: prefs)),
      ],
    );
    addTearDown(container.dispose);

    appRouter.go('/');
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const HarmonyKnightApp(),
      ),
    );
    await tester.pump();

    expect(find.text('Claim'), findsOneWidget);

    await tester.tap(find.text('Claim'));
    await tester.pump();

    expect(container.read(playerProgressProvider).harmonyPoints, 20);
    expect(container.read(questProvider).dailyQuests.first.claimed, isTrue);
    expect(find.text('Claim'), findsNothing);
  });

  testWidgets(
      'practice prompt only records one correct answer while feedback is visible',
      (WidgetTester tester) async {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(home: PracticeScreen()),
      ),
    );
    await tester.pump();

    final progressBefore = container.read(playerProgressProvider);
    final target = tester
        .widget<ScaffoldedNote>(
          find.byWidgetPredicate(
            (widget) => widget is ScaffoldedNote && widget.size == 50,
          ),
        )
        .note
        .name;
    final matchingAnswers = find.text(target);

    await tester.tap(matchingAnswers.last);
    await tester.pump(const Duration(milliseconds: 100));
    await tester.tap(matchingAnswers.last);
    await tester.pump(const Duration(milliseconds: 100));

    final progressAfter = container.read(playerProgressProvider);
    expect(
      progressAfter.totalCorrectNotes - progressBefore.totalCorrectNotes,
      1,
    );
    expect(progressAfter.currentStreak - progressBefore.currentStreak, 1);
  });

  testWidgets('practice does not show the literal answer before input',
      (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: PracticeScreen()),
      ),
    );
    await tester.pump();

    final prompt = find.text('What note is this?');
    expect(prompt, findsOneWidget);

    final visibleNoteNameCount = find
        .byWidgetPredicate(
          (widget) =>
              widget is Text &&
              ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'].contains(widget.data),
        )
        .evaluate()
        .length;

    expect(visibleNoteNameCount, lessThanOrEqualTo(4));
  });

  testWidgets('correct practice answer advances daily note quest',
      (WidgetTester tester) async {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(home: PracticeScreen()),
      ),
    );
    await tester.pump();

    final target = tester
        .widget<ScaffoldedNote>(
          find.byWidgetPredicate(
            (widget) => widget is ScaffoldedNote && widget.size == 50,
          ),
        )
        .note
        .name;
    await tester.tap(find.text(target).last);
    await tester.pump(const Duration(milliseconds: 100));

    final questState = container.read(questProvider);
    expect(questState.dailyQuests.first.progressCount, 1);
  });

  testWidgets('correct practice answer records note-reading mastery',
      (WidgetTester tester) async {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(home: PracticeScreen()),
      ),
    );
    await tester.pump();

    final target = tester
        .widget<ScaffoldedNote>(
          find.byWidgetPredicate(
            (widget) => widget is ScaffoldedNote && widget.size == 50,
          ),
        )
        .note
        .name;

    await tester.tap(find.text(target).last);
    await tester.pump(const Duration(milliseconds: 100));

    final mastery = container.read(masteryProvider)['note-reading-c4-b4'];
    expect(mastery, isNotNull);
    expect(mastery!.attempts, 1);
    expect(mastery.correct, 1);
    expect(mastery.totalResponseMs, greaterThanOrEqualTo(0));
  });

  testWidgets('incorrect practice answer records mastery miss',
      (WidgetTester tester) async {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(home: PracticeScreen()),
      ),
    );
    await tester.pump();

    final target = tester
        .widget<ScaffoldedNote>(
          find.byWidgetPredicate(
            (widget) => widget is ScaffoldedNote && widget.size == 50,
          ),
        )
        .note
        .name;
    final answerLabels = find
        .byWidgetPredicate(
          (widget) =>
              widget is Text &&
              ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'].contains(widget.data),
        )
        .evaluate()
        .map((element) => (element.widget as Text).data!)
        .where((label) => label != target)
        .toList();

    expect(answerLabels, isNotEmpty);

    await tester.tap(find.text(answerLabels.first).last);
    await tester.pump(const Duration(milliseconds: 100));

    final mastery = container.read(masteryProvider)['note-reading-c4-b4'];
    expect(mastery, isNotNull);
    expect(mastery!.attempts, 1);
    expect(mastery.correct, 0);
    expect(mastery.recentCorrect, [false]);
  });
}
