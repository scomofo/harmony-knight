# ADR-0002: Riverpod StateNotifier for Application State

## Status
Accepted

## Date
2026-05-29

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | Flutter 3.41+ / Dart 3.6+ |
| **Domain** | Core / State Management |
| **Knowledge Risk** | LOW |
| **References Consulted** | `lib/providers/scaffolding_provider.dart`, `lib/providers/duel_provider.dart`, `lib/providers/fever_provider.dart` |
| **Post-Cutoff APIs Used** | None |
| **Verification Required** | State survives hot reload; providers do not re-initialise on navigation |

## ADR Dependencies

| Field | Value |
|-------|-------|
| **Depends On** | None |
| **Enables** | ADR-0003 (persistence hooks into StateNotifier mutations) |
| **Blocks** | None |
| **Ordering Note** | All new stateful systems must use the StateNotifier pattern established here |

## Context

### Problem Statement
Harmony Knight has three distinct categories of application state with different
lifecycles and ownership:

1. **Player progress** (cross-session, persisted): streak, grade level, harmony points, weak notes
2. **Session state** (in-session, ephemeral): current duel, fever mode status, active confidence level
3. **Engine state** (per-frame, computed): `EngineState` snapshots from `GameEngine.update()`

A state management solution must handle all three, keep UI rebuilds surgical
(only affected widgets rebuild), and integrate cleanly with async persistence.

### Constraints
- Flutter 3.41+ — `InheritedWidget` and `ChangeNotifier` are available but insufficient for reactive granularity
- The engine produces per-frame state; UI must not rebuild on every frame (only on meaningful state changes)
- Providers must be testable without Flutter bindings
- `PlayerProgress` must survive async disk load without showing stale defaults

### Requirements
- Reactive: UI rebuilds only when observed state changes
- Scoped: `DuelState` rebuilds don't cascade to unrelated widgets
- Async-initialisation safe: `PlayerProgressNotifier` loads from disk; UI must handle the initialisation window
- Testable: providers can be overridden in tests

## Decision

Use **Riverpod 2.6** with the `StateNotifier` pattern for all application state.

**Provider inventory:**

| Provider | State type | Lifecycle | Persisted |
|----------|-----------|-----------|-----------|
| `playerProgressProvider` | `PlayerProgress` | App lifetime | Yes — JSON via `PersistenceService` |
| `confidenceProvider` | `double` (0.0–1.0) | App lifetime | Yes — `SharedPreferences` |
| `duelProvider` | `DuelState` | Session | No |
| `feverProvider` | `FeverModeStatus` | Session | No |

**Pattern rules (enforced for all new providers):**

1. Each provider has exactly one `StateNotifier` subclass that owns mutation
2. Reads from outside the notifier use `ref.watch()` for reactive UI and `ref.read()` for one-shot actions
3. Async initialisation is done in the notifier constructor body (fire-and-forget `Future`) — never block the constructor
4. Save-to-disk is fire-and-forget after each mutation (`_persistence.saveProgress(state)` — no `await` in the hot path)
5. `EngineState` is NOT managed by Riverpod — it is a value read directly from `GameEngine.update()` and passed to the renderer; putting per-frame data in a Riverpod notifier would cause excessive rebuilds

### Key Interfaces

```dart
// Pattern every StateNotifier must follow
class XxxNotifier extends StateNotifier<XxxState> {
  XxxNotifier() : super(XxxState.initial()) {
    _loadFromDisk(); // async init — never await in constructor
  }

  void _save() => _persistence.saveXxx(state); // fire-and-forget

  void doSomething() {
    state = state.copyWith(...); // immutable update
    _save();                     // persist without blocking
  }
}

final xxxProvider = StateNotifierProvider<XxxNotifier, XxxState>(
  (ref) => XxxNotifier(),
);
```

```dart
// In widgets: watch for reactive rebuild, read for one-shot
class MyWidget extends ConsumerWidget {
  Widget build(BuildContext context, WidgetRef ref) {
    final progress = ref.watch(playerProgressProvider); // reactive
    return ElevatedButton(
      onPressed: () => ref.read(playerProgressProvider.notifier).recordCorrectNote(),
    );
  }
}
```

## Alternatives Considered

### Alternative A: `ChangeNotifier` + `Provider` package
- **Description**: Flutter's built-in `ChangeNotifier` with the `provider` package
- **Pros**: Less boilerplate; widely known
- **Cons**: `notifyListeners()` rebuilds all listeners regardless of which field changed; no compile-time type safety on provider access; harder to test (requires `BuildContext`)
- **Rejection Reason**: Insufficient rebuild granularity; Riverpod's `ref.watch()` subscriptions are field-level

### Alternative B: BLoC / Cubit (flutter_bloc)
- **Description**: Event-driven state with BLoC streams or Cubit mutations
- **Pros**: Mature, strongly opinionated, excellent tooling
- **Cons**: More verbose for simple state (DuelState is 8 fields); stream overhead for synchronous state updates; the ADHD-focused UX doesn't require event sourcing
- **Rejection Reason**: Overkill for this domain; StateNotifier is simpler and sufficient

### Alternative C: Riverpod `AsyncNotifier` for all providers
- **Description**: Use `AsyncNotifier<T>` instead of `StateNotifier<T>` to handle async loading natively
- **Pros**: First-class async state; loading/error states built in
- **Cons**: All consumers must handle `AsyncValue` unwrapping; UI must show loading states for every provider including ones that rarely fail (`confidenceProvider` is just a double)
- **Rejection Reason**: Most state is synchronous or tolerates a brief default-then-update window; `AsyncNotifier` adds complexity not warranted here

## Consequences

### Positive
- Surgical rebuilds: `DuelScreen` rebuilds on `duelProvider` changes only
- Override-friendly: tests can override any provider with `ProviderContainer(overrides: [...])`
- Confidence slider is globally reactive: any widget can `ref.watch(confidenceProvider)` and respond to user changes

### Negative
- `EngineState` not in Riverpod — screens that use the real-time engine must manage their own `setState` cadence carefully
- Async initialisation creates a brief window where `PlayerProgress` shows its constructor defaults (streak=0, grade=0) before disk load completes — current screens handle this gracefully since the data appears within one frame, but a loading shimmer would be more correct

### Risks
- **Double-initialisation**: if a provider is watched before disk load completes and the user triggers a mutation, the loaded state will overwrite the mutation → mitigation: check `mounted` in `_loadFromDisk()` (already implemented)
- **Provider leak**: `StateNotifier` instances created in `StateNotifierProvider` are never disposed unless `autoDispose` is used → for app-lifetime providers (progress, confidence) this is intentional; for session providers (duel, fever) consider adding `.autoDispose` in future

## GDD Requirements Addressed

| GDD System | Requirement | How This ADR Addresses It |
|------------|-------------|--------------------------|
| practice-system.md | Confidence slider accessible on every screen, never locked | `confidenceProvider` is a global `StateNotifierProvider`; any screen can `watch` it |
| practice-system.md | Weak notes persisted across sessions | `playerProgressProvider` persists `weakNotesMidi` after every `updateWeakNotes()` call |
| duel-system.md | Duel state isolated from practice state | Separate `duelProvider`; `DuelScreen` rebuilds never affect `PracticeScreen` |
| curriculum-system.md | Grade level persisted and read by all screens | `playerProgressProvider.gradeLevel` is watched by home, practice, duel, curriculum screens |

## Performance Implications
- **CPU**: `copyWith()` creates a new `PlayerProgress` instance on each mutation; at < 1 mutation/second this is negligible
- **Memory**: All providers are app-lifetime; state objects are small (< 1KB each)
- **Load Time**: Disk load is async and non-blocking; app renders immediately with defaults
- **Network**: None

## Migration Plan
N/A — Riverpod was the original choice; no migration needed.

## Validation Criteria
- Provider override test: `playerProgressProvider` overridden with a pre-loaded state; widget reads correct grade level immediately
- Persistence round-trip test: mutate `PlayerProgress`, restart the app (or re-init the provider), assert state is restored
- Rebuild scope test: `DuelState` change does not trigger rebuild of widgets watching only `playerProgressProvider`
