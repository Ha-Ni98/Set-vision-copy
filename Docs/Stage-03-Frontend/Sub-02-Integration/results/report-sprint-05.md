---
sprint: 5
title: People & Money — Activators + Admins + Payments
status: ✅ Done
commit: tbd
---

# Sprint 5 Report — People & Money

## Work done

### Services (`src/services`)
| File | Notes |
|---|---|
| `src/services/activator.service.ts` (extended) | All 9 `ACTIVATOR_ROUTES`: rewired `getMyStats` (now takes a `signal`) alongside 8 new functions — `getAll`, `create`, `getById`, `update` (PATCH), `toggle`, `resetPassword`, `remove` (204), `getPerformance`. |
| `src/services/admins.service.ts` (new) | All 7 `ADMIN_ROUTES` — same CRUD shape as activators minus performance/my-stats. |
| `src/services/payments.service.ts` (new) | All 3 `PAYMENT_ROUTES` — `getAll`, `record` (201), `remove` (204). |

### D4 key normalization (plan.md D4 — done atomically this sprint)
| File | Notes |
|---|---|
| `src/hooks/useMyStats.ts` | `["activator","my-stats"]` → `qk.activators.myStats()`; also now forwards the query signal (`({ signal }) => activatorService.getMyStats(signal)`), consistent with every other query hook since Sprint 3. |
| `src/hooks/useTakeActivation.ts`, `useActivateRequest.ts`, `useReleaseActivation.ts`, `useFreezeActivation.ts` | Each of the four (not three — the Sprint 3 plan text undercounted; there are four call sites, not counting `useMyStats`'s own key) `["activator","my-stats"]` invalidation literals replaced with `qk.activators.myStats()`, matching Sprint 3's `useCancelActivation` and `realtime.ts`, which already used the normalized key. |
| — | **Grep-verified**: `grep -rn '\["activator", *"my-stats"\]'` over `src/` returns zero matches. The migration is complete, not partial. |

### Hooks (`src/hooks`)
| File | Notes |
|---|---|
| `src/hooks/useActivators.ts` (new, grouped per D6) | 8 hooks: `useActivators` (list), `useCreateActivator`, `useActivator` (detail, enabled-gated), `useUpdateActivator`, `useToggleActivator`, `useResetActivatorPassword`, `useDeleteActivator`, `useActivatorPerformance` (enabled-gated). All 5 mutations invalidate `qk.activators.all()`. No toasts (D7). |
| `src/hooks/useAdmins.ts` (new, grouped) | 7 hooks mirroring the activators shape (no performance/my-stats equivalent). All mutations invalidate `qk.admins.all()`. |
| `src/hooks/usePayments.ts` (new, grouped) | 3 hooks. `useRecordPayment`/`useDeletePayment` both invalidate **both** `qk.payments.all()` and `qk.activators.all()` — a payment changes an activator's credits balance (plan.md §3.2). |

### Test scaffold additions
| File | Notes |
|---|---|
| `tests/fixtures/data/activators.mock.ts` | `ActivatorDTO` (incl. null `avgActivationTimeSeconds`), `ActivatorDetailDTO`, `ActivatorWithCredentialsDTO`, `ActivatorGeneratedPasswordDTO`, `ActivatorPerformanceDTO`, `ActivatorDashboardDTO` (incl. empty-`weekly` variant), paginated. All schema-parsed. |
| `tests/fixtures/data/admins.mock.ts` | `AdminDTO` (incl. null `lastLoginAt`), `AdminWithCredentialsDTO`, `AdminGeneratedPasswordDTO`, paginated. |
| `tests/fixtures/data/payments.mock.ts` | `PaymentDTO` (incl. `isDeleted: true` variant), paginated. |
| `tests/fixtures/msw/{activators,admins,payments}.handlers.ts` | Happy-path defaults + `*ErrorHandlers` maps. `MY_STATS` (`/me/stats`) registered before the parameterized `GET_BY_ID` (`/:id`), mirroring the API's own ordering comment on that route. |
| `tests/fixtures/msw/server.ts` | Now seeded with all three new handler arrays. |

### Tests
| File | Cases |
|---|---|
| `tests/integration/services/activator.service.test.ts` | 14 cases: myStats unwrap/500, getAll unwrap/500/query-serialization, create 201/400, getById unwrap/404, update PATCH-verb assertion, toggle/resetPassword/remove(204)/getPerformance. |
| `tests/integration/services/admins.service.test.ts` | 10 cases mirroring the activator CRUD shape. |
| `tests/integration/services/payments.service.test.ts` | 7 cases incl. the explicitly-required `includeDeleted` boolean-string serialization (`true`/`false` as literal query-string values, matching `BooleanQuerySchema`). |
| `tests/integration/hooks/activators.test.tsx` | 10 cases: a **D4 regression test** proving `useMyStats` resolves under the normalized `qk.activators.myStats()` key (via `queryClient.getQueryData` at that exact key — would fail if the hook still used the legacy key), 4 query-hook cases (list, detail enabled-gating, performance enabled-gating), and all 5 mutations' `qk.activators.all()` invalidation via a shared helper. |
| `tests/integration/hooks/admins.test.tsx` | 8 cases mirroring the activators hook shape. |
| `tests/integration/hooks/payments.test.tsx` | 3 cases, including the **payments→activators cross-invalidation** the sprint task explicitly called for: both `useRecordPayment` and `useDeletePayment` are asserted to refetch an already-mounted `useActivators` list, not just their own domain. |

## Validation results
- `npx tsc --noEmit` ✅ clean (`src`, 0 errors)
- `npx tsc --noEmit -p tsconfig.test.json` ✅ clean (`src` + `tests`, 0 errors)
- `npx eslint` on every Sprint 5 file ✅ 0 errors after `--fix` (prettier formatting only)
- `npx vitest run` ✅ 185/185 tests pass, 17/17 files (133 carried over from Sprints 1–4 + 52 new)
- `npx vite build` ✅ production build unaffected
- **D4 grep-verify**: `grep -rn '\["activator", *"my-stats"\]' src/` → 0 matches (the sprint task's explicit acceptance check)

## Decisions & deviations
- **`GetActivatorsQuery`/`GetAdminsQuery`/`GetPaymentsQuery` require `page`/`limit`** unlike `GetActivationsQuery` and friends from Sprint 3, which made them optional. The contract schemas differ in a way that matters for TypeScript: `.default(1).optional()` (activations-style) keeps the field optional in the inferred type, while `.default(1)` alone (activator/admin/payment-style) does not — `z.infer` resolves to the *post-default* output shape, where the field is always present. Every test in this sprint that calls a `getAll`-style function passes `{ page: 1, limit: 10 }` rather than `{}`; caught immediately by `tsc`, not assumed from the plan's `GetXQuery` naming similarity.
- **The "three invalidation sites" the Sprint 3 plan text named for D4 was actually four** (`useTakeActivation`, `useActivateRequest`, `useReleaseActivation`, `useFreezeActivation`) — corrected by grep rather than trusting the count in the sprint description; all four (plus `useMyStats` itself) are migrated, and the grep-verify step confirms none were missed.
- **No `AuthProvider`/UI-layer touches this sprint** — this domain has no UI consumer at all yet (admin pages don't exist until a later sub-stage), so the "don't touch `/src/components` or `/src/pages`" constraint from Sprints 2 and 4 never came up as a real tension here; there was nothing in those directories this sprint would have wanted to touch.
