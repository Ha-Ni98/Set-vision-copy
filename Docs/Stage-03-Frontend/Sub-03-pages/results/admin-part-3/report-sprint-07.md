---
sprint: 7
title: Unit Tests — all five pages (+ heatmap name-map)
status: ✅ Done
commit: 17b73e6
---

# Sprint 7 Report — Unit Tests (final sprint of Admin Part 3)

## Work done

Six new test files, 37 new tests, following Part-1/2's established page-test conventions exactly (`mockTranslation`, `renderWithRoutes`, hook-level `vi.mock`, no MSW/network):

| File | Tests | Covers |
|---|---|---|
| `tests/unit/pages/activations/ActivationsPage.test.tsx` | 7 | stat/donut skeletons, empty/no-match, retry, Resolve/Set-Price gating (3 separate cases), URL filter seeding |
| `tests/unit/pages/activation-detail/ActivationDetailPage.test.tsx` | 6 | invalid-id NotFoundState, activator Link vs distributor text (§E-2), null-activator empty state, all 3 timeline variants, Set-Price gating |
| `tests/unit/pages/statistics/StatisticsPage.test.tsx` | 5 | shared-query empty/error across all 6 charts, period change, color-mode switch, wilaya-click→drilldown |
| `tests/unit/pages/settings/SettingsPage.test.tsx` | 10 | 4-tab bar, Add-Admin one-time reveal, self/last-admin Delete disabled (×2 cases), reset-password one-time reveal, Commission cell edit+revert, Add-Plan enum submit, company add+toggle |
| `tests/unit/pages/logs/LogsPage.test.tsx` | 6 | skeleton, empty/no-match+Clear, retry, LogActionBadge+relative-time render, user/action-type filter changes |
| `tests/unit/pages/statistics/wilaya-name-map.test.ts` | 3 | all 58 lib names round-trip with no drops, realistic diacritic/apostrophe/case variants, unmatched-name case |

**Path note**: the dedicated name-map test lives at `tests/unit/pages/statistics/wilaya-name-map.test.ts`, not `tests/unit/lib/` as the sprint plan's task literally named it — the source file (`wilaya-name-map.ts`) was placed under `pages/admin/statistics/components/` back in Sprint 2, not `src/lib/`, so the test mirrors the real source location like every other page test.

Final: 54/54 test files, 393/393 tests (356 existing + 37 new).

## Two real bugs found while writing these tests

Both are genuine production bugs the tests exposed — not test-only workarounds — and both required a source fix, done in this sprint alongside the tests.

**1. `AlertDialogAction` always closes the dialog — confirmed by reading Radix's source directly.** `node_modules/@radix-ui/react-alert-dialog/dist/index.mjs` shows `AlertDialogAction` is implemented as literally `DialogPrimitive.Close` with no opt-out. `AdminAccountsTab`'s reset-password flow (built in Sprint 5) used `AlertDialogAction` for the "confirm reset" step, intending to swap the same dialog into a one-time password reveal afterward. Since `AlertDialogAction` closes unconditionally on click, the dialog would vanish the instant the admin confirmed — **the reveal step was unreachable in the real app**, not just in the test. Root-caused by testing a definite hypothesis against the actual Radix source rather than guessing. Fixed by using a plain `Button` for that one "confirm" step (keeping `AlertDialogCancel` as-is, since Cancel closing immediately is correct there).

**2. `CommissionCell`'s revert-on-error depended on an `isSaving` true→false transition that a fast/synchronous failure never produces.** The original implementation watched for `isSaving` going from `true` to `false` via a `useEffect` + ref, to know when to exit edit mode. Under a real (async) mutation this transition always happens across at least two renders. But it's not guaranteed — and a test with a synchronous mocked `onError` callback proved it: React 18 batches the `setSavingCellKey(key)` → immediate synchronous failure → `setSavingCellKey(null)` sequence into a single render, so `isSaving` is `false` on every render the component ever sees, and the "was it ever `true`?" check never fires. The cell would get stuck in edit mode forever on a sufficiently fast failure — a real (if narrow) race condition. Fixed by exiting edit mode synchronously inside the submit handler itself, which removes the timing dependency entirely and still reverts correctly, since the collapsed view just re-reads the (unchanged, because the mutation failed) `commission` prop.

## Decisions & deviations
- Reused every piece of shared test infrastructure (`mockTranslation.ts`, `renderWithRoutes`, `createQueryWrapper`, `setup.ts`'s polyfills/cleanup) completely unchanged — nothing new was needed.
- `DataTable`'s simultaneous desktop+mobile row rendering under JSDOM (no CSS media queries) required `getAllByText(...)[0]` in a couple of spots, and a substring/regex matcher where `StatusPill`'s `"● {label}"` renders as one text node (exact-text matching would never find it) — both are established patterns from Part-1/2, not new discoveries.
- No architecture shift — `plan.md` untouched. The two bugs above were fixed at the component level (`AdminAccountsTab.tsx`, `CommissionCell.tsx`), not the plan/contract level.

## Validation results
- `npm run check` (both `tsconfig.json` and `tsconfig.test.json`) ✅ clean.
- `npx vitest run` ✅ 54/54 files, 393/393 tests green.
- `npx eslint` scoped to this sprint's touched files (2 source files + 6 test files) — 5 pure-Prettier findings across 3 test files, fixed via scoped `--fix`; 0 errors after.
- No stray test files under `/src` (confirmed via `find src -iname "*.test.*"` — empty).

## Sprint plan complete
This closes out Admin Part 3 (Activations, Activation Detail, Statistics + Heatmap, Settings, Logs) — all 7 sprints done: Foundation → Primitives & States → Assembly & Wiring (×3) → Polish → Tests.
