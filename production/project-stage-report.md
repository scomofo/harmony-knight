# Project Stage Analysis

**Date**: 2026-05-29
**Stage**: Production *(code-first brownfield — predates the studio scaffold)*
**Stage Confidence**: CONCERNS — strong signals in `lib/`, but studio scaffold directories don't yet reflect reality

---

## Completeness Overview

| Domain | Status | Detail |
|---|---|---|
| **Code** | ~80% | 62 Dart files across 16 modules — engine, 8 screens, models, providers, painters |
| **Tests** | ~30% | 9 test files covering engine core, pitch detector, spaced rep, tone gen, exercise gen |
| **Design docs** | 0% | `design/gdd/` doesn't exist — no game concept, pillars, systems index, or GDDs |
| **Architecture** | 0% | No ADRs; registry files are empty templates |
| **Production** | 5% | No sprint plans or milestones — only a session log |
| **Design registry** | 0% | `entities.yaml` and `architecture.yaml` are empty templates |

---

## Gaps Identified

1. **`lib/` vs `src/` mismatch** — Studio scaffold expects code in `src/`; Flutter project uses `lib/`
2. **No GDDs** — Design intent lives only as inline code comments and constants
3. **No ADRs** — Key architectural stances (deterministic engine, Riverpod, JSON persistence) unrecorded
4. **No sprint plan** — No active sprint in `production/`
5. **No screen/provider tests** — Only engine-layer tests exist

---

## Actions Taken / Planned

- [x] Write stage report
- [ ] Fix `lib/` vs `src/` in studio docs
- [ ] Backfill GDDs via `/reverse-document` (Practice, Duel, Curriculum systems)
- [ ] Record architecture ADRs via `/architecture-decision`
- [ ] Create sprint plan via `/sprint-plan`
