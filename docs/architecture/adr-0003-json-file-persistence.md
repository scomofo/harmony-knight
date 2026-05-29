# ADR-0003: JSON File Persistence for Player Progress

## Status
Accepted

## Date
2026-05-29

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | Flutter 3.41+ / Dart 3.6+ |
| **Domain** | Core / Persistence |
| **Knowledge Risk** | LOW |
| **References Consulted** | `lib/engine/persistence.dart`, `pubspec.yaml` |
| **Post-Cutoff APIs Used** | None |
| **Verification Required** | JSON round-trips correctly on Windows, Android, and iOS; corrupt file falls back to defaults without crash |

## ADR Dependencies

| Field | Value |
|-------|-------|
| **Depends On** | ADR-0002 (persistence hooks are called from StateNotifier mutations) |
| **Enables** | None |
| **Blocks** | None |
| **Ordering Note** | If the data model grows significantly (>10k session records), migrate to Isar — see Migration Plan |

## Context

### Problem Statement
Player progress (streak, grade level, harmony points, weak notes), session history
(for the heatmap), and engagement data must survive app restarts. The persistence
layer must be:
- Non-blocking during gameplay
- Resilient to corrupt or missing files (graceful defaults)
- Simple to evolve as the data model grows in early development

### Constraints
- MVP scope: data volume is small (< 500 session records, < 2000 engagement points)
- Must work cross-platform: Windows desktop, Android, iOS
- Dart isolates are available for heavy I/O but add complexity
- No server-side sync in scope

### Requirements
- Read `PlayerProgress` from disk on app start; write after every mutation
- Store up to 500 session records and 2000 engagement data points
- Tolerate missing or malformed files (return defaults, never crash)
- File paths must use `path_provider` (platform-appropriate app documents directory)

## Decision

Use **JSON files via `dart:io`** with `path_provider` for directory resolution.
`SharedPreferences` for the single scalar (confidence slider).

**File layout:**

| File | Contents | Max size |
|------|----------|---------|
| `player_progress.json` | Single `PlayerProgress` object | < 1 KB |
| `session_history.json` | Array of `SessionRecord` (capped at 500) | < 200 KB |
| `engagement_heatmap.json` | Array of `EngagementPoint` (capped at 2000) | < 500 KB |

**SharedPreferences:**

| Key | Type | Contents |
|-----|------|----------|
| `confidence` | double | Scaffolding confidence slider (0.0–1.0) |

**Resilience rules:**
- All reads are wrapped in `try/catch`; any exception returns the default value
- Writes are fire-and-forget (`unawaited`) from the UI thread; failures are silent in production
- File-not-found is treated as "first launch" — returns defaults without logging an error

**Array caps:**
- `session_history`: capped at 500; oldest records removed when exceeded
- `engagement_heatmap`: capped at 2000; oldest points removed when exceeded

### Key Interfaces

```dart
class PersistenceService {
  // PlayerProgress — called after every StateNotifier mutation
  Future<void> saveProgress(PlayerProgress progress);
  Future<PlayerProgress> loadProgress(); // returns default on missing/corrupt

  // Session history — called when a practice session ends
  Future<void> recordSession(SessionRecord session);
  Future<List<SessionRecord>> loadSessionHistory();

  // Engagement heatmap — called periodically during sessions
  Future<void> recordEngagement(EngagementPoint point);
  Future<List<EngagementPoint>> loadEngagementData();
}
```

`PersistenceService` is instantiated directly inside each `StateNotifier`
(not injected via Riverpod) — it is a pure infrastructure class with no state
of its own.

## Alternatives Considered

### Alternative A: Isar (embedded NoSQL database)
- **Description**: Use the Isar database with Flutter-native bindings for typed, indexed, reactive queries
- **Pros**: Fast queries; reactive streams; typed schema; handles large datasets
- **Cons**: Adds a native binary dependency per platform; schema migration required when model changes; setup complexity disproportionate to current data volume
- **Rejection Reason**: Premature for MVP data volumes; revisit when session history exceeds 10k records or query performance becomes measurable

### Alternative B: SharedPreferences for all state
- **Description**: Encode all state as `String`/`int`/`double` preferences
- **Pros**: Dead simple; no file paths; cross-platform
- **Cons**: No support for lists or nested objects without manual JSON encoding; preference keys become a maintenance hazard as the model grows; 500 session records as a single JSON string is unwieldy
- **Rejection Reason**: Does not scale past `PlayerProgress`; session history requires proper array storage

### Alternative C: SQLite via `sqflite`
- **Description**: Relational database with SQL queries
- **Pros**: Mature; cross-platform; handles large datasets; good tooling
- **Cons**: Schema design required upfront; migration scripts needed for model changes; SQL is overkill for key-value progress data
- **Rejection Reason**: Relational model not a good fit for the largely document-shaped data; JSON files are simpler to evolve during rapid iteration

## Consequences

### Positive
- Zero schema migration for adding nullable fields (`_progressFromJson` uses `?? defaultValue` for all fields)
- No native binaries — pure Dart; works in Flutter unit tests without platform channels
- Files are human-readable for debugging during development

### Negative
- No reactive queries — `PersistenceService` is pull-only; callers must explicitly load
- File I/O on the main thread (fire-and-forget) — if the write fails silently, the player loses that mutation on next launch; acceptable at MVP scale
- JSON parsing is O(n) on load — acceptable for current caps; becomes a concern if caps are raised significantly

### Risks
- **Concurrent writes**: two rapid mutations could cause a write race (last write wins) → at current mutation frequency (< 1/second) this is not a practical concern; mitigation is to queue writes if needed
- **Storage quota**: on some Android devices, app documents directory has limits → cap enforcement (500/2000) mitigates this
- **Corrupt file**: handled by `try/catch` returning defaults → user loses progress if file is corrupted, but the app does not crash

## GDD Requirements Addressed

| GDD System | Requirement | How This ADR Addresses It |
|------------|-------------|--------------------------|
| practice-system.md | Streak and grade level survive app restarts | `player_progress.json` persisted after every `PlayerProgressNotifier` mutation |
| practice-system.md | Weak notes persisted across sessions | `weakNotesMidi: List<int>` serialised in `player_progress.json` |
| curriculum-system.md | Grade level persists | `gradeLevel` field in `PlayerProgress` JSON |
| duel-system.md | Duel wins persisted | `duelWins` field in `PlayerProgress` JSON |

## Performance Implications
- **CPU**: JSON encode/decode is < 1ms for current data sizes; negligible
- **Memory**: Files loaded once at startup; no memory pressure
- **Load Time**: `loadProgress()` completes in < 10ms on device storage; async so does not block first frame
- **Network**: None — local storage only

## Migration Plan

When to migrate to Isar:
- Session history exceeds 10,000 records, OR
- Query performance (filtering sessions by grade/date) becomes measurable, OR
- The app adds cloud sync (Isar supports sync extensions)

Migration steps:
1. Add Isar as a dependency alongside `PersistenceService`
2. Implement `IsarPersistenceService` implementing the same interface
3. On first launch after migration: read JSON files, write to Isar, delete JSON files
4. Swap the `PersistenceService` instance in each notifier

The `PersistenceService` interface is deliberately thin — the migration is a one-file swap inside each notifier.

## Validation Criteria
- Cold-start test: write progress, kill app, relaunch, assert all fields match
- Corrupt-file test: write invalid JSON to `player_progress.json`, launch app, assert defaults are returned and app does not crash
- Cap test: insert 600 session records, assert only 500 are kept (oldest removed)
- Cross-platform test: run on Windows, Android, and iOS; assert file paths resolve correctly via `path_provider`
