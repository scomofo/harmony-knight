# ADR-0004: Dual Audio Architecture — SoLoud (UI) + just_audio (Game Clock)

## Status
Accepted

## Date
2026-05-29

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | Flutter 3.41+ / Dart 3.6+ |
| **Domain** | Core / Audio |
| **Knowledge Risk** | LOW |
| **References Consulted** | `lib/engine/audio_service.dart`, `lib/engine/audio/audio_service.dart` |
| **Post-Cutoff APIs Used** | None |
| **Verification Required** | Both services initialize without conflict on Windows, Android, iOS |

## ADR Dependencies

| Field | Value |
|-------|-------|
| **Depends On** | ADR-0001 (AudioClock interface used by game engine) |
| **Enables** | None |
| **Blocks** | None |
| **Ordering Note** | ADR-0001 mentions "two audio services coexist — must be consolidated." This ADR supersedes that note: they serve different roles and must NOT be merged. |

## Context

### Problem Statement

ADR-0001 flagged that two `AudioService` classes coexist and called for
consolidation. On closer inspection, the two services have different
responsibilities, different dependencies, and different lifetimes:

| Service | File | Dependency | Role |
|---------|------|------------|------|
| `AudioService` (SoLoud) | `lib/engine/audio_service.dart` | `flutter_soloud` | UI sounds, ghost tones, ambient audio |
| `AudioService` (just_audio) | `lib/engine/audio/audio_service.dart` | `just_audio` | Gameplay chart playback and `AudioClock` implementation |

Merging them into one class would couple the `AudioClock` interface (which the
game engine depends on) to SoLoud's initialization state, creating a hidden
dependency between two independent systems.

### Constraints
- The game engine depends on `AudioClock` (interface) — not on any specific audio library
- SoLoud is used for short-fire sounds; just_audio is used for long-form playback
- Flutter does not natively multiplex audio across different libraries; both can
  coexist as long as they don't claim the same OS audio session exclusively
- `AudioClock` must be backed by `just_audio`'s `AudioPlayer.position` stream
  (per ADR-0001) for deterministic gameplay timing

## Decision

**Keep both audio services as separate classes with distinct responsibilities.**
Do not merge them.

**`lib/engine/audio_service.dart` (SoLoud)**
- Singleton, initialized once at app startup via `AudioService().initialize()`
- Manages short-fire sounds: ghost tone previews, UI feedback SFX
- Does NOT implement `AudioClock`
- Can be used from anywhere without going through the game engine

**`lib/engine/audio/audio_service.dart` (just_audio)**
- Implements `AudioClock` (the timing contract for the game engine)
- Manages gameplay chart playback: load, play, seek, position polling
- Instantiated by `FrameDriver` when a practice session starts
- Its `position` stream drives `AudioClock.now()` for `GameEngine.update()`

### Naming Resolution

To prevent confusion:
- `lib/engine/audio_service.dart` → class name stays `AudioService` (UI audio)
- `lib/engine/audio/audio_service.dart` → class name stays `AudioService` BUT
  it implements `AudioClock`; callers should always reference it as `AudioClock`
  (the interface), not as `AudioService`, to avoid import ambiguity

If import ambiguity arises: use `import '...' as GameAudio;` at the call site.

## Alternatives Considered

### Alternative: Merge into one omnibus AudioService
- **Pros**: Single import, no naming confusion
- **Cons**: Couples `AudioClock` to SoLoud init; breaks the clean interface the
  engine depends on; makes unit-testing the engine harder (mock one, get both)
- **Rejection Reason**: Violates the interface segregation that makes the engine
  deterministically testable

### Alternative: Rename one service
- **Pros**: Eliminates naming confusion without merging
- **Cons**: Churn for no functional gain; Dart's `as` import alias is sufficient
- **Rejection Reason**: Premature; rename only if ambiguity causes real problems

## Consequences

### Positive
- `AudioClock` remains a clean testable interface independent of SoLoud
- UI audio and gameplay audio can evolve independently
- No changes required to any existing code

### Negative
- Two classes named `AudioService` exist — developers must know which to import
- SoLoud and just_audio must not conflict on the OS audio session (verify on Android)

### Risks
- **Android audio focus conflict**: SoLoud and just_audio may compete for audio
  focus → mitigation: test on a physical Android device before shipping; if
  conflict occurs, route all sound through just_audio using SoLoud only for samples

## GDD Requirements Addressed

| GDD System | Requirement | How This ADR Addresses It |
|------------|-------------|--------------------------|
| practice-system.md | Gameplay timing from AudioClock | just_audio service implements AudioClock |
| duel-system.md | Ghost tone preview on suggestion | SoLoud service plays short audio samples |

## Performance Implications
- **CPU**: Two audio libraries add ~2MB to binary; negligible
- **Memory**: just_audio holds the chart buffer; SoLoud holds sample cache
- **Load Time**: SoLoud initializes at app start; just_audio initializes per session

## Migration Plan
No migration needed. If audio focus conflicts arise on Android, route short SFX
through just_audio's `setAudioSource(ClippingAudioSource(...))` and remove SoLoud.
