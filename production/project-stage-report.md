# Project Stage Analysis

**Date**: 2026-06-10
**Stage**: Production *(playable code-first Flutter game)*
**Stage Confidence**: CONCERNS - the app is playable and documented, but not yet release-ready

---

## Completeness Overview

| Domain | Status | Detail |
|---|---|---|
| **Code** | ~80% | 76 Dart files across app screens, providers, models, custom painters, and engine modules |
| **Tests** | ~40% | 13 Dart test files; prior playtest notes reported passing tests, but current `flutter analyze` / `flutter test` were not revalidated in this shell |
| **Design docs** | ~65% | 14 files in `design/gdd/`, including `systems-index.md`; core systems are reverse-documented, while learning-loop docs still need formal design review |
| **Architecture** | ~70% | 4 ADRs plus `tr-registry.yaml`; deterministic engine, Riverpod, JSON persistence, and audio architecture are documented |
| **Production** | ~55% | 10 sprint files and `production/sprint-status.yaml`; release readiness, milestone gates, and launch checklists still need tightening |
| **Assets** | ~10% | App icons exist; production audio, illustration, UI art, and font assets are still mostly placeholders |

---

## Current Strengths

1. **Playable vertical slice exists** - Home, Practice, Duel, Curriculum, Rhythm, Scale, Interval, Triad, Circle of Fifths, Settings, Heatmap, and Real-Time Training surfaces are present.
2. **Strong engine direction** - `lib/engine/core/game_engine.dart` follows the deterministic timing architecture described in ADR-0001.
3. **Learning loop is taking shape** - spaced repetition, weak-note focus, Broken Blade recovery, Fever Mode, harmony points, and session preferences are represented in code.
4. **Documentation is no longer empty** - GDDs, ADRs, sprint tracking, and playtest reports now provide a usable project history.
5. **ADHD-oriented UX choices are visible** - short sessions, reduced motion, high contrast mode, scaffolded confidence, and clear route cards are built into the product direction.

---

## Gaps Identified

1. **Release validation is currently unproven** - `flutter analyze`, `flutter test`, and a fresh local run need successful current-run evidence before any release-candidate claim.
2. **Asset pipeline is still placeholder-heavy** - audio, image, and font directories mostly document future needs rather than containing production-ready game assets.
3. **The core game loop is fragmented** - several systems are playable as separate exercise screens, but the "Quest of the Harmony Knight" fantasy needs a more cohesive progression wrapper.
4. **Some design docs still need review** - `systems-index.md` marks curriculum progression, mastery progression, quest rewards, session summary, recovery loop, and spaced review as draft / needing design review.
5. **Real-time mode needs product hardening** - the deterministic engine exists, but the production learning flow still leans on quiz screens and isolated training modes.
6. **QA evidence is dated** - playtest reports from 2026-05-27 are useful, but they should be refreshed after the recent cleanup and any future gameplay changes.
7. **Repo hygiene still has local setup noise** - `.agents/`, `.codex/`, and `AGENTS.md` are untracked in this checkout and should be intentionally tracked or ignored by project decision.

---

## Recommended Next Steps

1. **Revalidate the build locally** - capture current `flutter analyze`, `flutter test`, and `flutter run -d windows` or `launch.bat` evidence.
2. **Create a release-readiness checklist** - include platform builds, audio behavior, accessibility, save/reset flows, asset completeness, and smoke-test routes.
3. **Run design review on draft learning-loop GDDs** - start with `curriculum-progression.md`, `mastery-progression.md`, and `quest-reward-economy.md`.
4. **Define the cohesive core loop milestone** - specify how Practice, Duel, Real-Time Training, and Curriculum Map should feed one player-facing quest arc.
5. **Start the production asset plan** - prioritize character/world art, reward stingers, metronome or feedback sounds, and any custom font decisions.
6. **Refresh playtest evidence** - repeat Home -> Practice -> Real-Time -> Duel -> Curriculum checks after validation is working.

---

## Stage Verdict

Harmony Knight is in **Production**, not Concept or Technical Setup. The project has enough implemented gameplay, docs, and sprint history to treat it as an active playable app. The next stage gate is not "write first docs" anymore; it is **prove build health, tighten the cohesive game loop, and replace placeholder production assets**.
