# Core Learning Loop Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first implementation slice of the improved Harmony Knight Home loop: honest Practice prompts, daily/recommended quests, mastery-aware progress, and a clearer sticky return path.

**Architecture:** Add small model/provider units for skill mastery and quests, keep learning-loop state in Riverpod not widgets, and let Home render a recommended quest plus daily path from provider state. Keep Practice, Real-Time, and Duel as existing mode screens; pass quest context through route query parameters only after the provider layer is stable.

**Tech Stack:** Flutter, Dart, Riverpod, GoRouter, flutter_test.

---

## Scope

This plan covers the first testable retention slice:

- Fix Practice answer reveal.
- Add mastery and quest models.
- Track daily quest and mastery progress in provider state.
- Redesign Home around recommended quest and daily path.
- Add widget/unit tests and run browser playtest.

This plan does not implement the full revised curriculum, all advanced exercise generators, or a complete reward shop. Those should follow after the mastery/quest foundation is in place.

## File Structure

- `lib/models/skill_mastery.dart`: pure value model for per-topic mastery.
- `lib/models/quest.dart`: pure value model for recommended/daily quests.
- `lib/providers/mastery_provider.dart`: mastery state and update methods.
- `lib/providers/quest_provider.dart`: daily quest selection and completion state.
- `lib/providers/providers.dart`: barrel exports for new providers.
- `lib/screens/home_screen.dart`: render recommended quest, daily path, mode cards, and recovery prompt.
- `lib/screens/practice_screen.dart`: hide literal answer before input and record mastery/quest progress.
- `lib/screens/gameplay_screen.dart`: record basic quest completion for Real-Time run completion.
- `lib/screens/duel_screen.dart`: record basic quest completion when a turn advances.
- `test/mastery_provider_test.dart`: model/provider coverage for mastery stars.
- `test/quest_provider_test.dart`: quest generation/completion coverage.
- `test/widget_test.dart`: Home and Practice regression coverage.

---

### Task 1: Fix Practice Answer Reveal

**Files:**
- Modify: `lib/screens/practice_screen.dart`
- Test: `test/widget_test.dart`

- [ ] **Step 1: Add a failing widget test for hidden literal answer**

Add this test to `test/widget_test.dart`:

```dart
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

  final visibleNoteNames = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4']
      .where((name) => find.text(name).evaluate().isNotEmpty)
      .toList();

  // Four answer buttons may show note labels in low-confidence mode. The target
  // prompt must not add a fifth separate literal answer label above them.
  expect(visibleNoteNames.length, lessThanOrEqualTo(4));
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
flutter test test/widget_test.dart --plain-name "practice does not show the literal answer before input"
```

Expected before the fix: FAIL because the target note name appears in addition to the answer labels.

- [ ] **Step 3: Remove the pre-answer literal hint**

In `lib/screens/practice_screen.dart`, replace this block:

```dart
// Note name hint (fades with confidence).
if (confidence < 0.5)
  Padding(
    padding: const EdgeInsets.only(top: 8),
    child: Text(
      _targetNote.name,
      style: TextStyle(
        color: Colors.white.withAlpha(
          (255 * (1.0 - confidence * 2)).round().clamp(0, 255),
        ),
        fontSize: 24,
        fontWeight: FontWeight.bold,
      ),
    ),
  ),
```

with:

```dart
const SizedBox(height: 8),
```

The answer labels on buttons can remain for now because they are the multiple-choice options, not a separate prompt reveal.

- [ ] **Step 4: Verify the Practice test passes**

Run:

```bash
flutter test test/widget_test.dart --plain-name "practice does not show the literal answer before input"
```

Expected: PASS.

- [ ] **Step 5: Run the widget suite**

Run:

```bash
flutter test test/widget_test.dart
```

Expected: all widget tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/screens/practice_screen.dart test/widget_test.dart
git commit -m "fix: hide practice answer before input"
```

---

### Task 2: Add Skill Mastery Model

**Files:**
- Create: `lib/models/skill_mastery.dart`
- Modify: `lib/models/models.dart`
- Test: `test/mastery_provider_test.dart`

- [ ] **Step 1: Write model tests**

Create `test/mastery_provider_test.dart` with:

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:harmony_knight/models/skill_mastery.dart';

void main() {
  test('SkillMastery records accuracy and awards scaffolded stars', () {
    const mastery = SkillMastery(topicId: 'note-cde');

    final updated = mastery.recordAttempt(
      correct: true,
      responseMs: 1200,
      confidence: 0.7,
    );

    expect(updated.attempts, 1);
    expect(updated.correct, 1);
    expect(updated.accuracy, 1.0);
    expect(updated.bestConfidence, 0.7);
    expect(updated.stars, 2);
  });

  test('SkillMastery keeps recent attempt window capped', () {
    var mastery = const SkillMastery(topicId: 'note-cde');
    for (int i = 0; i < 12; i++) {
      mastery = mastery.recordAttempt(
        correct: i.isEven,
        responseMs: 1000,
        confidence: 0.5,
      );
    }

    expect(mastery.recentCorrect.length, 10);
    expect(mastery.attempts, 12);
  });
}
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
flutter test test/mastery_provider_test.dart
```

Expected: FAIL because `SkillMastery` does not exist.

- [ ] **Step 3: Implement `SkillMastery`**

Create `lib/models/skill_mastery.dart`:

```dart
import 'package:equatable/equatable.dart';

class SkillMastery extends Equatable {
  final String topicId;
  final int attempts;
  final int correct;
  final int totalResponseMs;
  final double bestConfidence;
  final List<bool> recentCorrect;

  const SkillMastery({
    required this.topicId,
    this.attempts = 0,
    this.correct = 0,
    this.totalResponseMs = 0,
    this.bestConfidence = 0,
    this.recentCorrect = const [],
  });

  double get accuracy => attempts == 0 ? 0 : correct / attempts;

  double get recentAccuracy {
    if (recentCorrect.isEmpty) return 0;
    final count = recentCorrect.where((value) => value).length;
    return count / recentCorrect.length;
  }

  int get averageResponseMs =>
      attempts == 0 ? 0 : (totalResponseMs / attempts).round();

  int get stars {
    if (recentAccuracy >= 0.8 && bestConfidence >= 0.8) return 3;
    if (recentAccuracy >= 0.8 && bestConfidence >= 0.6) return 2;
    if (recentAccuracy >= 0.8) return 1;
    return 0;
  }

  SkillMastery recordAttempt({
    required bool correct,
    required int responseMs,
    required double confidence,
  }) {
    final nextRecent = [...recentCorrect, correct];
    final cappedRecent = nextRecent.length > 10
        ? nextRecent.sublist(nextRecent.length - 10)
        : nextRecent;

    return copyWith(
      attempts: attempts + 1,
      correct: this.correct + (correct ? 1 : 0),
      totalResponseMs: totalResponseMs + responseMs,
      bestConfidence:
          confidence > bestConfidence ? confidence : bestConfidence,
      recentCorrect: cappedRecent,
    );
  }

  SkillMastery copyWith({
    int? attempts,
    int? correct,
    int? totalResponseMs,
    double? bestConfidence,
    List<bool>? recentCorrect,
  }) {
    return SkillMastery(
      topicId: topicId,
      attempts: attempts ?? this.attempts,
      correct: correct ?? this.correct,
      totalResponseMs: totalResponseMs ?? this.totalResponseMs,
      bestConfidence: bestConfidence ?? this.bestConfidence,
      recentCorrect: recentCorrect ?? this.recentCorrect,
    );
  }

  Map<String, dynamic> toJson() => {
        'topicId': topicId,
        'attempts': attempts,
        'correct': correct,
        'totalResponseMs': totalResponseMs,
        'bestConfidence': bestConfidence,
        'recentCorrect': recentCorrect,
      };

  factory SkillMastery.fromJson(Map<String, dynamic> json) => SkillMastery(
        topicId: json['topicId'] as String,
        attempts: json['attempts'] as int? ?? 0,
        correct: json['correct'] as int? ?? 0,
        totalResponseMs: json['totalResponseMs'] as int? ?? 0,
        bestConfidence: (json['bestConfidence'] as num?)?.toDouble() ?? 0,
        recentCorrect: (json['recentCorrect'] as List<dynamic>? ?? [])
            .map((value) => value as bool)
            .toList(),
      );

  @override
  List<Object?> get props => [
        topicId,
        attempts,
        correct,
        totalResponseMs,
        bestConfidence,
        recentCorrect,
      ];
}
```

- [ ] **Step 4: Export the model**

Add to `lib/models/models.dart`:

```dart
export 'skill_mastery.dart';
```

- [ ] **Step 5: Verify tests pass**

Run:

```bash
flutter test test/mastery_provider_test.dart
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/models/skill_mastery.dart lib/models/models.dart test/mastery_provider_test.dart
git commit -m "feat: add skill mastery model"
```

---

### Task 3: Add Quest Model

**Files:**
- Create: `lib/models/quest.dart`
- Modify: `lib/models/models.dart`
- Test: `test/quest_provider_test.dart`

- [ ] **Step 1: Write quest model tests**

Create `test/quest_provider_test.dart` with:

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:harmony_knight/models/quest.dart';

void main() {
  test('Quest progresses and completes at target count', () {
    const quest = Quest(
      id: 'daily-read-5',
      title: 'Read 5 notes',
      mode: QuestMode.practice,
      targetCount: 5,
      rewardHarmonyPoints: 20,
    );

    final updated = quest.increment().increment().increment().increment().increment();

    expect(updated.progressCount, 5);
    expect(updated.isComplete, isTrue);
  });
}
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
flutter test test/quest_provider_test.dart
```

Expected: FAIL because `Quest` does not exist.

- [ ] **Step 3: Implement `Quest`**

Create `lib/models/quest.dart`:

```dart
import 'package:equatable/equatable.dart';

enum QuestMode { practice, realtime, duel, recovery }

class Quest extends Equatable {
  final String id;
  final String title;
  final QuestMode mode;
  final int targetCount;
  final int progressCount;
  final int rewardHarmonyPoints;
  final bool claimed;

  const Quest({
    required this.id,
    required this.title,
    required this.mode,
    required this.targetCount,
    this.progressCount = 0,
    this.rewardHarmonyPoints = 0,
    this.claimed = false,
  });

  bool get isComplete => progressCount >= targetCount;

  Quest increment({int amount = 1}) => copyWith(
        progressCount: (progressCount + amount).clamp(0, targetCount),
      );

  Quest markClaimed() => copyWith(claimed: true);

  Quest copyWith({
    int? progressCount,
    int? rewardHarmonyPoints,
    bool? claimed,
  }) {
    return Quest(
      id: id,
      title: title,
      mode: mode,
      targetCount: targetCount,
      progressCount: progressCount ?? this.progressCount,
      rewardHarmonyPoints: rewardHarmonyPoints ?? this.rewardHarmonyPoints,
      claimed: claimed ?? this.claimed,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'mode': mode.name,
        'targetCount': targetCount,
        'progressCount': progressCount,
        'rewardHarmonyPoints': rewardHarmonyPoints,
        'claimed': claimed,
      };

  factory Quest.fromJson(Map<String, dynamic> json) => Quest(
        id: json['id'] as String,
        title: json['title'] as String,
        mode: QuestMode.values.byName(json['mode'] as String),
        targetCount: json['targetCount'] as int,
        progressCount: json['progressCount'] as int? ?? 0,
        rewardHarmonyPoints: json['rewardHarmonyPoints'] as int? ?? 0,
        claimed: json['claimed'] as bool? ?? false,
      );

  @override
  List<Object?> get props => [
        id,
        title,
        mode,
        targetCount,
        progressCount,
        rewardHarmonyPoints,
        claimed,
      ];
}
```

- [ ] **Step 4: Export the model**

Add to `lib/models/models.dart`:

```dart
export 'quest.dart';
```

- [ ] **Step 5: Verify tests pass**

Run:

```bash
flutter test test/quest_provider_test.dart
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/models/quest.dart lib/models/models.dart test/quest_provider_test.dart
git commit -m "feat: add quest model"
```

---

### Task 4: Add Mastery Provider

**Files:**
- Create: `lib/providers/mastery_provider.dart`
- Modify: `lib/providers/providers.dart`
- Test: `test/mastery_provider_test.dart`

- [ ] **Step 1: Add provider tests**

Append to `test/mastery_provider_test.dart`:

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:harmony_knight/providers/mastery_provider.dart';

test('MasteryNotifier records attempts by topic', () {
  final container = ProviderContainer();
  addTearDown(container.dispose);

  container.read(masteryProvider.notifier).recordAttempt(
        topicId: 'note-cde',
        correct: true,
        responseMs: 900,
        confidence: 0.6,
      );

  final mastery = container.read(masteryProvider)['note-cde'];
  expect(mastery, isNotNull);
  expect(mastery!.attempts, 1);
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
flutter test test/mastery_provider_test.dart
```

Expected: FAIL because `mastery_provider.dart` does not exist.

- [ ] **Step 3: Implement provider**

Create `lib/providers/mastery_provider.dart`:

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:harmony_knight/models/skill_mastery.dart';

class MasteryNotifier extends StateNotifier<Map<String, SkillMastery>> {
  MasteryNotifier() : super(const {});

  void recordAttempt({
    required String topicId,
    required bool correct,
    required int responseMs,
    required double confidence,
  }) {
    final current = state[topicId] ?? SkillMastery(topicId: topicId);
    state = {
      ...state,
      topicId: current.recordAttempt(
        correct: correct,
        responseMs: responseMs,
        confidence: confidence,
      ),
    };
  }

  SkillMastery? masteryFor(String topicId) => state[topicId];
}

final masteryProvider =
    StateNotifierProvider<MasteryNotifier, Map<String, SkillMastery>>(
  (ref) => MasteryNotifier(),
);
```

Keep persistence out of this first provider commit. Add SharedPreferences persistence only after behavior is tested.

- [ ] **Step 4: Export provider**

Add to `lib/providers/providers.dart`:

```dart
export 'mastery_provider.dart';
```

- [ ] **Step 5: Verify provider tests pass**

Run:

```bash
flutter test test/mastery_provider_test.dart
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/providers/mastery_provider.dart lib/providers/providers.dart test/mastery_provider_test.dart
git commit -m "feat: track skill mastery attempts"
```

---

### Task 5: Add Quest Provider and Defaults

**Files:**
- Create: `lib/providers/quest_provider.dart`
- Modify: `lib/providers/providers.dart`
- Test: `test/quest_provider_test.dart`

- [ ] **Step 1: Add provider tests**

Append to `test/quest_provider_test.dart`:

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:harmony_knight/models/quest.dart';
import 'package:harmony_knight/providers/quest_provider.dart';

test('QuestNotifier exposes a recommended quest and daily quests', () {
  final container = ProviderContainer();
  addTearDown(container.dispose);

  final state = container.read(questProvider);

  expect(state.recommendedQuest.title, 'Read 5 notes');
  expect(state.dailyQuests.length, 3);
});

test('QuestNotifier increments matching quest mode', () {
  final container = ProviderContainer();
  addTearDown(container.dispose);

  container.read(questProvider.notifier).recordProgress(QuestMode.practice);

  final state = container.read(questProvider);
  expect(state.dailyQuests.first.progressCount, 1);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
flutter test test/quest_provider_test.dart
```

Expected: FAIL because `questProvider` does not exist.

- [ ] **Step 3: Implement provider**

Create `lib/providers/quest_provider.dart`:

```dart
import 'package:equatable/equatable.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:harmony_knight/models/quest.dart';

class QuestState extends Equatable {
  final Quest recommendedQuest;
  final List<Quest> dailyQuests;

  const QuestState({
    required this.recommendedQuest,
    required this.dailyQuests,
  });

  QuestState copyWith({
    Quest? recommendedQuest,
    List<Quest>? dailyQuests,
  }) {
    return QuestState(
      recommendedQuest: recommendedQuest ?? this.recommendedQuest,
      dailyQuests: dailyQuests ?? this.dailyQuests,
    );
  }

  @override
  List<Object?> get props => [recommendedQuest, dailyQuests];
}

class QuestNotifier extends StateNotifier<QuestState> {
  QuestNotifier() : super(_initialState());

  static QuestState _initialState() {
    const readNotes = Quest(
      id: 'daily-read-5',
      title: 'Read 5 notes',
      mode: QuestMode.practice,
      targetCount: 5,
      rewardHarmonyPoints: 20,
    );
    return const QuestState(
      recommendedQuest: readNotes,
      dailyQuests: [
        readNotes,
        Quest(
          id: 'daily-hit-6',
          title: 'Hit 6 notes in Real-Time',
          mode: QuestMode.realtime,
          targetCount: 6,
          rewardHarmonyPoints: 20,
        ),
        Quest(
          id: 'daily-duel-1',
          title: 'Win 1 Duel turn',
          mode: QuestMode.duel,
          targetCount: 1,
          rewardHarmonyPoints: 20,
        ),
      ],
    );
  }

  void recordProgress(QuestMode mode) {
    final updated = [
      for (final quest in state.dailyQuests)
        if (quest.mode == mode && !quest.isComplete) quest.increment() else quest,
    ];
    state = state.copyWith(dailyQuests: updated);
  }
}

final questProvider = StateNotifierProvider<QuestNotifier, QuestState>(
  (ref) => QuestNotifier(),
);
```

- [ ] **Step 4: Export provider**

Add to `lib/providers/providers.dart`:

```dart
export 'quest_provider.dart';
```

- [ ] **Step 5: Verify tests pass**

Run:

```bash
flutter test test/quest_provider_test.dart
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/providers/quest_provider.dart lib/providers/providers.dart test/quest_provider_test.dart
git commit -m "feat: add daily quest provider"
```

---

### Task 6: Redesign Home Around Recommended Quest

**Files:**
- Modify: `lib/screens/home_screen.dart`
- Test: `test/widget_test.dart`

- [ ] **Step 1: Add Home UX widget test**

Append to `test/widget_test.dart`:

```dart
testWidgets('home shows recommended quest and daily path',
    (WidgetTester tester) async {
  await tester.pumpWidget(const ProviderScope(child: HarmonyKnightApp()));
  await tester.pump();

  expect(find.text('Next Quest'), findsOneWidget);
  expect(find.text('Read 5 notes'), findsWidgets);
  expect(find.text('Daily Path'), findsOneWidget);
  expect(find.text('Hit 6 notes in Real-Time'), findsOneWidget);
  expect(find.text('Win 1 Duel turn'), findsOneWidget);
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
flutter test test/widget_test.dart --plain-name "home shows recommended quest and daily path"
```

Expected: FAIL because Home does not render quest UI yet.

- [ ] **Step 3: Import quest provider**

In `lib/screens/home_screen.dart`, add:

```dart
import 'package:harmony_knight/models/quest.dart';
import 'package:harmony_knight/providers/quest_provider.dart';
```

- [ ] **Step 4: Read quest state in `build`**

Inside `build`, below progress/currentLevel:

```dart
final quests = ref.watch(questProvider);
```

- [ ] **Step 5: Add quest UI methods**

Add these methods to `HomeScreen`:

```dart
Widget _buildRecommendedQuest(BuildContext context, Quest quest) {
  return Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: const Color(0xFF12322F),
      border: Border.all(color: const Color(0xFF26A69A).withAlpha(110)),
      borderRadius: BorderRadius.circular(12),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Next Quest',
          style: TextStyle(
            color: Colors.white.withAlpha(150),
            fontSize: 12,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          quest.title,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          '+${quest.rewardHarmonyPoints} Harmony - about 2 min',
          style: TextStyle(color: Colors.white.withAlpha(150), fontSize: 13),
        ),
        const SizedBox(height: 12),
        FilledButton.icon(
          onPressed: () => _goToQuest(context, quest),
          icon: const Icon(Icons.play_arrow),
          label: const Text('Start Quest'),
        ),
      ],
    ),
  );
}

Widget _buildDailyPath(BuildContext context, List<Quest> quests) {
  return Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      const Text(
        'Daily Path',
        style: TextStyle(
          color: Colors.white,
          fontSize: 16,
          fontWeight: FontWeight.bold,
        ),
      ),
      const SizedBox(height: 8),
      ...quests.map((quest) => ListTile(
            dense: true,
            contentPadding: EdgeInsets.zero,
            leading: Icon(
              quest.isComplete ? Icons.check_circle : Icons.circle_outlined,
              color: quest.isComplete
                  ? const Color(0xFF26A69A)
                  : Colors.white.withAlpha(120),
            ),
            title: Text(
              quest.title,
              style: const TextStyle(color: Colors.white, fontSize: 13),
            ),
            subtitle: LinearProgressIndicator(
              value: quest.targetCount == 0
                  ? 0
                  : quest.progressCount / quest.targetCount,
              minHeight: 3,
            ),
            onTap: () => _goToQuest(context, quest),
          )),
    ],
  );
}

void _goToQuest(BuildContext context, Quest quest) {
  switch (quest.mode) {
    case QuestMode.practice:
      context.go('/practice');
      break;
    case QuestMode.realtime:
      context.go('/gameplay');
      break;
    case QuestMode.duel:
      context.go('/duel');
      break;
    case QuestMode.recovery:
      context.go('/practice?mode=broken_blade');
      break;
  }
}
```

- [ ] **Step 6: Place quest sections above mode cards**

In Home's body column, after `_buildQuestBanner(currentLevel)`, insert:

```dart
const SizedBox(height: 16),
_buildRecommendedQuest(context, quests.recommendedQuest),
const SizedBox(height: 16),
_buildDailyPath(context, quests.dailyQuests),
const SizedBox(height: 16),
```

Reduce mode card spacing if needed to prevent mobile overflow.

- [ ] **Step 7: Verify Home test passes**

Run:

```bash
flutter test test/widget_test.dart --plain-name "home shows recommended quest and daily path"
```

Expected: PASS.

- [ ] **Step 8: Run all widget tests**

Run:

```bash
flutter test test/widget_test.dart
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add lib/screens/home_screen.dart test/widget_test.dart
git commit -m "feat: show recommended quest on home"
```

---

### Task 7: Record Quest Progress From Modes

**Files:**
- Modify: `lib/screens/practice_screen.dart`
- Modify: `lib/screens/gameplay_screen.dart`
- Modify: `lib/screens/duel_screen.dart`
- Test: `test/widget_test.dart`

- [ ] **Step 1: Add integration-style widget assertion for Practice quest progress**

Append to `test/widget_test.dart`:

```dart
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
      .widget<Text>(find.textContaining(RegExp(r'^[A-G]#?4$')).first)
      .data!;
  await tester.tap(find.text(target).last);
  await tester.pump(const Duration(milliseconds: 100));

  final questState = container.read(questProvider);
  expect(questState.dailyQuests.first.progressCount, 1);
});
```

Also add this import:

```dart
import 'package:harmony_knight/providers/quest_provider.dart';
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
flutter test test/widget_test.dart --plain-name "correct practice answer advances daily note quest"
```

Expected: FAIL because Practice does not record quest progress.

- [ ] **Step 3: Update Practice on correct answer**

In `lib/screens/practice_screen.dart`, import:

```dart
import 'package:harmony_knight/models/quest.dart';
import 'package:harmony_knight/providers/quest_provider.dart';
```

Inside `_handleAnswer`, in the `if (isCorrect)` branch after `recordCorrectNote()`:

```dart
ref.read(questProvider.notifier).recordProgress(QuestMode.practice);
```

- [ ] **Step 4: Update Real-Time when notes are hit**

In `lib/screens/gameplay_screen.dart`, import:

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:harmony_knight/models/quest.dart';
import 'package:harmony_knight/providers/quest_provider.dart';
```

Convert `GameplayScreen` to `ConsumerStatefulWidget` and `_GameplayScreenState` to `ConsumerState<GameplayScreen>`.

Inside `_tapLane`, after a successful hit where `_updateEngine(...)` has been called:

```dart
ref.read(questProvider.notifier).recordProgress(QuestMode.realtime);
```

- [ ] **Step 5: Update Duel when accepted note advances**

In `lib/screens/duel_screen.dart`, import:

```dart
import 'package:harmony_knight/models/quest.dart';
import 'package:harmony_knight/providers/quest_provider.dart';
```

Inside `_submitNote`, in the `else` branch where `accepted` is true:

```dart
ref.read(questProvider.notifier).recordProgress(QuestMode.duel);
```

- [ ] **Step 6: Verify Practice quest test passes**

Run:

```bash
flutter test test/widget_test.dart --plain-name "correct practice answer advances daily note quest"
```

Expected: PASS.

- [ ] **Step 7: Run full tests**

Run:

```bash
flutter test
flutter analyze
```

Expected: all tests pass; no analyzer issues.

- [ ] **Step 8: Commit**

```bash
git add lib/screens/practice_screen.dart lib/screens/gameplay_screen.dart lib/screens/duel_screen.dart test/widget_test.dart
git commit -m "feat: record quest progress from play modes"
```

---

### Task 8: Browser Playtest and Accessibility Smoke

**Files:**
- No required source edits unless failures are found.
- Artifacts: `.playtest-artifacts/`

- [ ] **Step 1: Start Flutter web server**

Run:

```bash
flutter run -d web-server --web-hostname 127.0.0.1 --web-port 54329
```

Expected: app served at `http://127.0.0.1:54329`.

- [ ] **Step 2: Check Home visually**

Open `http://127.0.0.1:54329/` in the in-app browser or Playwright.

Expected visible elements:

- `Next Quest`
- `Read 5 notes`
- `Daily Path`
- `Practice`
- `Real-Time`
- `Duel`
- `Curriculum Map`
- Confidence slider visible without overlap.

- [ ] **Step 3: Check mobile overflow**

In browser automation, evaluate:

```js
document.documentElement.scrollWidth - document.documentElement.clientWidth
```

Expected: `0` or no more than `2`.

- [ ] **Step 4: Exercise quest progression**

Manual/browser flow:

1. Start Home.
2. Tap `Start Quest`.
3. Answer one Practice prompt correctly.
4. Return Home.

Expected: `Read 5 notes` progress indicator advances.

- [ ] **Step 5: Capture screenshots**

Save:

- `.playtest-artifacts/home-quest-loop.png`
- `.playtest-artifacts/practice-no-answer-reveal.png`
- `.playtest-artifacts/home-progress-after-practice.png`

- [ ] **Step 6: Stop web server**

Run:

```bash
lsof -ti tcp:54329 | xargs -r kill
```

- [ ] **Step 7: Commit if fixes were required**

If browser playtest required source fixes:

```bash
git add <changed-files>
git commit -m "fix: polish home quest loop"
```

---

## Self-Review Checklist

- UX spec coverage: Tasks 1, 5, 6, 7, and 8 cover the recommended quest, daily path, mode entry, post-action progress, accessibility-adjacent labels, and browser playtest. Full session summaries and spaced repetition are deferred to a later plan.
- Balance report coverage: Tasks 1-4 cover the P0/P1 foundation: answer reveal, mastery model, quest model, and provider layer. Full curriculum rewrite and advanced exercises are deferred to a separate curriculum GDD and implementation plan.
- Placeholder scan: no placeholder tasks are intentionally left for implementers.
- Type consistency: `QuestMode`, `Quest`, `QuestState`, `SkillMastery`, `masteryProvider`, and `questProvider` are defined before use.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-27-core-learning-loop-home.md`.

Two execution options:

1. **Subagent-Driven (recommended)** - Dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.
