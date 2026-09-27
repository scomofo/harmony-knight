# Changelog

All notable changes to Harmony Knight are documented here.

## [0.2.0] — 2026-09-27

Seven feature batches, merged in order. Save schema is now v7 with a tested
migration chain (v4 → v5 → v6 → v7) that preserves player profiles, adaptive
evidence, and grown-ups settings.

### Sound & Juice ([#4](https://github.com/scomofo/harmony-knight/pull/4))
- Procedural sampled instrument voices: piano, music-box, organ — no runtime
  downloads or assets, PWA-safe.
- Nine effect events with animations and sound cues.
- Lesson-complete celebration.
- Cents/ms-level coaching feedback.

### First Session ([#5](https://github.com/scomofo/harmony-knight/pull/5))
- Four-screen onboarding and player profile flow.
- Eight-question placement diagnostic with a branched starting point.
- Note reading with accidentals.
- Mic ceiling raised 880 → 1175 Hz; two autocorrelation bugs fixed.
- Musical Strike phrases and copy/polish fixes.

### Perform Tasks ([#6](https://github.com/scomofo/harmony-knight/pull/6))
- New production task families: perform-note, rhythm-tap, sing-back, and
  supporting types.
- All 16 self-attempt fallbacks removed — tasks are genuinely playable.
- At least one production task in every chapter.

### Adaptive Phase 1 ([#7](https://github.com/scomofo/harmony-knight/pull/7))
- Explainable difficulty adaptation (gentle / standard / spicy) from last-10
  performance estimates.
- ~80% mastery gating that never blocks progress.
- Confusion-pair spaced repetition.
- Real psychometrics/IRT explicitly deferred to a later phase.

### Create & Compete ([#8](https://github.com/scomofo/harmony-knight/pull/8))
- Theory-mapped creation palettes.
- Can't-fail composition mode.
- Local weekly contests with bot entries and voting.
- Duel anti-farming.

### Reasons to Return ([#9](https://github.com/scomofo/harmony-knight/pull/9))
- Harmony-point shop.
- Per-domain skill ratings.
- Parent dashboard keyed to mastery and struggles.
- Endless seeded practice.
- Ethical streak guardrails: weekly freeze, no shaming copy.

### Household Profiles ([#10](https://github.com/scomofo/harmony-knight/pull/10))
- Multi-profile storage and switcher; per-profile saves.
- Grown-ups PIN (device-level).
- Tested migration for existing saves.
