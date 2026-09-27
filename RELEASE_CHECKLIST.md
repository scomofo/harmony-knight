# Release Checklist — v0.2.0

Staging branch: `scout/release-0.2.0` (from main @ `88a631b4`)
Date: 2026-09-27

- [x] **Merge staged** — all seven feature batches (#4 Sound & Juice, #5 First
  Session, #6 Perform Tasks, #7 Adaptive Phase 1, #8 Create & Compete,
  #9 Reasons to Return, #10 Household Profiles) are in main @ `88a631b4`;
  the staging branch is cut from that tip. No new merges or features added.
- [x] **Version bump** — `package.json` 0.1.0 → 0.2.0.
- [x] **Changelog** — `CHANGELOG.md` written, one section per batch, non-empty.
- [x] **Full test suite** — `npm test`: 37 files, 599/599 tests passed.
- [x] **Production build** — `npm run build` (tsc --noEmit + vite build + PWA
  service worker): green.
- [x] **Main untouched** — no commits to `main`; staging work lives only on
  `scout/release-0.2.0`.

Ready for review. Ship word required before any PR or merge.
