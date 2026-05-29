# Directory Structure

```text
/
├── CLAUDE.md                    # Master configuration
├── .claude/                     # Agent definitions, skills, hooks, rules, docs
├── lib/                         # Flutter/Dart source code (replaces src/ for this project)
│   ├── core/                    # Router, constants (Figurenotes, timing thresholds)
│   ├── engine/                  # GameEngine, DuelEngine, FeverMode, scoring, audio, input
│   │   ├── adaptive/            # Post-session analysis (AdaptiveAnalyzer)
│   │   ├── audio/               # Real-time audio service (just_audio)
│   │   ├── charting/            # Immutable charts and note sequences
│   │   ├── core/                # Deterministic update loop, NoteTracker, ScoringEngine
│   │   ├── feedback/            # Hit feedback frames
│   │   ├── input/               # Microphone capture + pitch detection
│   │   ├── rendering/           # Note-highway projection helpers
│   │   └── scoring/             # Hit windows (perfect/great/good/miss)
│   ├── models/                  # Note, PlayerProgress, DuelState, Curriculum
│   ├── painters/                # CustomPainters: staff, harmony meter, fever shader
│   ├── providers/               # Riverpod StateNotifiers: progress, duel, fever, scaffolding
│   ├── screens/                 # 8 screens: Home, Practice, Duel, Curriculum, etc.
│   └── widgets/                 # ScaffoldedNote, HarmonyMeter, ConfidenceSlider
├── src/                         # Studio scaffold placeholder (not used — code lives in lib/)
├── assets/                      # Game assets (audio/, images/, fonts/ — currently placeholders)
├── design/                      # Game design documents (gdd/, narrative/, levels/, balance/)
├── docs/                        # Technical documentation (architecture/, engine-reference/)
├── test/                        # Test suites (engine/, widget, integration)
└── production/                  # Production management (sprints, milestones, releases)
    ├── session-state/           # Ephemeral session state (active.md — gitignored)
    └── session-logs/            # Session audit trail (gitignored)
```

> **Flutter project note**: All agents should read/write Dart code under `lib/`, not `src/`.
> Tests live in `test/` (Flutter convention), not `tests/`.
