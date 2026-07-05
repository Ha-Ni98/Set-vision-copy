---
sprint: 9
title: Statistics & Closeout
status: ✅ Done
commit: 6b8f3d2
---

# Sprint 9 Report — Statistics & Closeout

## Work done

### Services (`src/services`, new)
| File | Notes |
|---|---|
| `src/services/statistics.service.ts` | All 9 `STATISTICS_ROUTES` — 6 zero-argument summary GETs (`dashboard`, `activatorsSummary`, `distributorsSummary`, `inventorySummary`, `ordersSummary`, `activationsSummary`), `overview` (`StatisticsOverviewQuery.period` required by the contract), `wilayaHeatmap` (returns a top-level **array**, not an object — the envelope's `data` is the array itself), `wilayaDrilldown` (param + query). |

### Hooks (`src/hooks`, new, grouped per D6)
| File | Notes |
|---|---|
| `src/hooks/useStatistics.ts` | 9 query hooks, no mutations — statistics reads everything and touches nothing (plan.md §9), and no other domain's mutations invalidate these keys (§3.2). `useWilayaDrilldown` is enabled-gated on a truthy `wilayaId`, mirroring the `useCommunes`/`useAvailableCardsForLot` pattern from Sprints 6–7. |

### Test scaffold additions
| File | Notes |
|---|---|
| `tests/fixtures/data/statistics.mock.ts` | All 9 DTOs. `InventorySummaryDTO`'s `sets`/`lots`/`cards` arrays and `OrdersSummaryDTO`/`ActivationsSummaryDTO`'s `byState` arrays deliberately **omit** zero-count enum members (e.g. `SetStat.NOT_PRINTED`, `CardStat.ACTIVATION_FAILED` are absent) to exercise the contract's documented "missing stat = 0" rule. `WilayaHeatmapDTO` fixture is a top-level array; one entry's `avgActivationTimeSeconds` is `null` (its only nullable field — no activations recorded yet for that wilaya). Reuses cross-domain ids already established by prior sprints' fixtures (activator `c1…`, distributor `f3…`, wilaya `f1…`, subscription plan `81…`) for cross-domain consistency. |
| `tests/fixtures/msw/statistics.handlers.ts` | Registers the static `/wilaya-heatmap` before the parameterized `/wilaya/:wilayaId`, mirroring `Apps/api`'s own router comment ("Static /wilaya-heatmap must be registered BEFORE the param route /wilaya/:wilayaId"). |
| `tests/fixtures/msw/server.ts` | Now seeded with all 16 domains' handler arrays — registry complete. |

### Tests
| File | Cases |
|---|---|
| `tests/integration/services/statistics.service.test.ts` | 10 cases incl. `inventorySummary`'s omitted-zero-count assertion, `overview`'s required-`period` query serialization, and `wilayaHeatmap`'s array-root unwrap. |
| `tests/integration/hooks/statistics.test.tsx` | 10 cases: 7 zero-arg query hooks, `useStatisticsOverview` with a required `period`, and `useWilayaDrilldown`'s enabled-gating + fetch-once-given-a-real-id pair. |

### Sprint 8 drift found and fixed during the closeout audit
Cross-checking every existing invalidation against plan.md §3.2's mutation matrix (task: "note any contract gaps newly discovered") surfaced two real gaps from Sprint 8, both fixed this sprint:
- **`useCreateOrder`/`useDeleteOrder`** (`src/hooks/useOrders.ts`) invalidated only `qk.orders.all()`. Plan §3.2 requires `['orders']`, `['lots']` — creating/deleting an order reserves/frees the lots on it. Fixed via a shared `invalidateOrdersAndLots` helper (mirroring the existing `invalidateTransitionFanOut` pattern); `tests/integration/hooks/orders.test.tsx`'s corresponding describe block rewritten to assert both families refetch.
- **`useUpdateCommission`** (`src/hooks/useSubscriptionPlans.ts`) invalidated only `qk.subscriptionPlans.commissions()`. Plan §3.2 requires both `['subscription-plans','commissions']` and `['subscription-plans','commission-durations']`. Fixed by adding the second `invalidateQueries` call; the hook test now also asserts the plans *list* is untouched (still only 1 call) while both commission-related queries refetch.

Both fixes were caught mechanically — by re-deriving the invalidation matrix from `plan.md` §3.2 line-by-line against the actual hook code, not by re-reading Sprint 8's own report — exactly the kind of drift the closeout audit exists to catch.

## Closeout audit (mechanical, against contract exports — not the plan document)

| Check | Result |
|---|---|
| Total non-`BASE` route keys across every `*.routes.ts` in `Apps/contract` | **92** (auth 4 · keys 5 · activations 16 · activators 9 · admins 7 · payments 3 · logs 1 · subscription-plans 6 · geography 2 · delivery-companies 4 · distributors 6 · sets 4 · lots 4 · orders 5 · cards 7 · statistics 9) — matches plan.md's coverage confirmation exactly. |
| Every route referenced by exactly one service function | **Confirmed.** Script-counted references; the only routes with count ≠ 1 (`ACTIVATION_ROUTES.ACTIVATE`, `AUTH_ROUTES.LOGOUT`) were extra hits inside explanatory comments, not duplicate call sites. |
| Service files | **16**, matching plan.md exactly. |
| Every service function (minus `auth.refresh`) called from exactly one hook | **Confirmed** — 91 functions, 0 unreferenced (checked by resolving each hook file's actual `import * as xService` alias, not a filename guess). |
| Hooks | **94 exported `use*` functions** across 37 hook files; 2 (`useIsMobile`, `useTranslation`) are pre-existing UI utilities outside this plan's scope. The remaining 92 = 91 service-backed hooks + `useRealtimeStatus` — matches plan.md exactly. |
| Every hook's `queryKey`/`invalidateQueries` sourced from `qk` | **Confirmed** — no inline array-literal query keys found anywhere in `src/hooks`. |
| Gateway events wired in `src/lib/realtime.ts` | **6/6** — `activation:created/taken/client-updated/resolved/frozen/status-changed`. |
| Fixture files (`tests/fixtures/data/`) | **17**, matching plan.md exactly. |
| MSW handler files (`tests/fixtures/msw/*.handlers.ts`) | **16**, matching plan.md exactly. |
| Test files | **37** (`npx vitest run` file count), matching plan.md's "37 planned test files" exactly. |
| `TODO(Sub-02)` markers | **1 remaining**, in `src/components/providers/AuthProvider.tsx:19` — not new drift. Documented and deliberately deferred since Sprint 2 (report-sprint-02.md) and reaffirmed in Sprint 4 (report-sprint-04.md): `AuthProvider.tsx` and `ProtectedRoute.tsx` are components, and every sprint's execution constraint has forbidden touching `/src/components`/`/src/pages`. No other `TODO(Sub-02)` marker, inline `useQuery`/`useMutation`, or literal query-key array exists anywhere else in `src/components` or `src/pages`. |
| Plan §6 readiness checklist | **All 8 items re-verified true against the codebase as it stands today** (interceptors, global error handling, route→service, service→hook, keys+invalidations, schema-validated fixtures, test boundaries, realtime mapping) — no regressions found. |
| Plan §7 contract-gap addendum | **Nothing new to add.** The subscription-plan and statistics modules' "static-before-param" router comments (Sprints 8–9) don't reflect an actual path collision (segment counts differ in both cases, unlike Sprint 7's `cards` domain where a real collision exists) — noted as an observation in each sprint's own report, not a contract gap. |

## Validation results
- `npx tsc --noEmit` ✅ clean (`src`, 0 errors)
- `npx tsc --noEmit -p tsconfig.test.json` ✅ clean (`src` + `tests`, 0 errors)
- `npx eslint --fix` on every Sprint 9 file (+ the two Sprint 8 files fixed this sprint) ✅ 0 errors (prettier formatting only)
- `npx vitest run` ✅ **310/310 tests pass, 37/37 files** (full suite, not just this sprint's — 290 carried over from Sprints 1–8 + 20 new/updated)
- `npx vite build` ✅ production build unaffected

## Decisions & deviations
- **The two Sprint 8 invalidation gaps (above) were fixed in place rather than deferred to a follow-up sprint**, since Sprint 9 is the last sprint in the plan and the closeout audit's entire purpose is to be "the last catch for silent drift" (sprints.md's own risk note for this sprint). Deferring a known-wrong invalidation past the final sprint would leave it permanently unfixed.
- **No `/src/components`/`/src/pages` touches** — the one open item that *would* require them (`AuthProvider.tsx`'s `stubSession` deletion and the realtime connect/disconnect lifecycle binding) remains exactly where Sprints 2 and 4 left it: fully specified and ready, blocked only by the standing scope constraint, not by anything missing on the `/src/lib`/`/src/services`/`/src/hooks` side.

## Sub-stage summary — Sub-02 Integration Engine, complete

All 9 sprints are ✅ Done. Final state:
- **92/92 contract routes** mapped across **16 service files**; every service function unwraps `ApiResponse` and throws on `success: false`; 204 endpoints are typed `void`.
- **91 hooks + `useRealtimeStatus`** across 37 hook files; every query hook returns TanStack's standard shape and forwards `AbortSignal`; every mutation invalidates via the central `qk` registry per the §3.2 matrix (now audited end-to-end).
- **Realtime**: all 6 gateway events wired to registry-key invalidations; `connectRoleSocket`/`disconnectRoleSocket`/`subscribeActivation`/`unsubscribeActivation` built and tested; the lifecycle *binding* into `AuthProvider`/UI remains a documented, scope-blocked follow-up for whichever stage next touches `/src/components`.
- **310 tests passing across 37 files**; every fixture schema-validated at module load; every MSW handler built on the shared envelope/URL helpers; no mocks of the modules under test.
- **One known, intentionally-deferred item**: `AuthProvider.tsx`'s `stubSession` bridge and the realtime lifecycle binding — both fully unblocked on the library side, waiting only on a UI-integration stage (Sub-03 or later) that's permitted to edit components.

Sub-02 Integration is ready to close out.
