---
sprint: 3
title: Activator Flow — Keys + Activations
status: ✅ Done
commit: tbd
---

# Sprint 3 Report — Activator Flow (Keys + Activations)

## Work done

### Services (`src/services`)
| File | Notes |
|---|---|
| `src/services/keys.service.ts` (rewired) | All 5 `KEY_ROUTES`. Corrected a stale Sub-01 TODO: `UPDATE` is **POST**, not PATCH (verified against `Apps/api`'s `key.routes.ts`). `submitActivation`/`updateActivation`/`submitAdditionalInfo` upgraded from `void` stubs to real `ClientActivationStatusDTO` returns. |
| `src/services/activations.service.ts` (rewired + extended) | All 16 `ACTIVATION_ROUTES` — 11 activator-facing (incl. `activate`, wired for real per plan.md D3, and the new `cancel`) + 5 admin-facing (`getAll`, `getById`, `activateByAdmin`, `cancelByAdmin`, `setPrice`). `cancel`/`release` are `Promise<void>` with no unwrap (204). Query functions (`getPending`, `getActive`, `getRecent`, `getMyHistory`, `getAll`, `getById`) accept an optional `AbortSignal` (plan.md D5). |

### Hooks (`src/hooks`)
| File | Notes |
|---|---|
| 16 existing hook files rewired | Query hooks now forward TanStack's `queryFn` signal (`({ signal }) => service(..., signal)`) — required once services stopped taking zero arguments (see Decisions). All inline `["domain","resource"]` key arrays replaced with `qk.*` registry calls, **except** the four hooks' cross-domain `["activator","my-stats"]` invalidation (deliberately left as-is — see Decisions). `useUpdateActivation`/`useSubmitAdditionalInfo` gained the new `qk.keys.status(activationId)` invalidation (plan.md §3.2, "was nothing"). |
| `src/hooks/useCancelActivation.ts` (new) | Mirrors `useReleaseActivation`'s invalidation set; no toast (D7 — new hook, no UI consumer, no invented copy). Uses the already-normalized `qk.activators.myStats()` since it carries no legacy key to preserve. |
| `src/hooks/useAdminActivations.ts` (new, grouped per D6) | `useAdminActivations`, `useActivationDetail`, `useActivateByAdmin`, `useCancelByAdmin`, `useSetActivationPrice`. No UI consumer yet — full contract coverage ahead of the admin sub-stage. |
| `src/lib/query-keys.ts` (amended) | Added `activations.myHistoryAll()` and `activations.listAll()` — family-root keys (no query param) for mutation invalidation, distinct from the query-specific `myHistory(query)`/`list(query)` accessors. TanStack matches by key *prefix*, so invalidating the root sweeps every cached page/filter combination; this pattern generalizes to future parameterized list keys. |

### Test scaffold additions
| File | Notes |
|---|---|
| `tests/fixtures/data/keys.mock.ts` | `KeyVerificationDTO` — minimal `INVALID` (every optional absent), `READY`, `NEEDS_CORRECTION`, `NEEDS_OTP`; `ClientActivationStatusDTO`. All schema-parsed. |
| `tests/fixtures/data/activations.mock.ts` | All activator + admin DTOs incl. null-field variants (`otpValue`/`freezeReason` null and populated, `completedAt`/`durationSeconds`/`earning` null, null `activator`), plus empty-page paginated fixtures for both `PaginatedActivations` and `PaginatedActivatorHistory`. |
| `tests/fixtures/msw/keys.handlers.ts`, `activations.handlers.ts` | Happy-path defaults + `*ErrorHandlers` maps for `server.use()` overrides. Static GET routes (`pending`/`active`/`my-history`/`recent`/`all`) registered **before** the parameterized `GET_BY_ID`, mirroring `Apps/api`'s own router-ordering comment ("avoid param-shadow") — same structural collision risk the plan flagged for lots/cards. |
| `tests/fixtures/msw/server.ts` | Now seeded with `keysHandlers` + `activationsHandlers` alongside Sprint 2's `authHandlers`. |

### Tests
| File | Cases |
|---|---|
| `tests/integration/services/keys.service.test.ts` | 9 cases: verify (ready + minimal-invalid), submit (201 unwrap + 400 validation), update (POST verb + param substitution + 404), submitAdditionalInfo, status (unwrap + 500). |
| `tests/integration/services/activations.service.test.ts` | 25 cases: every activator read (incl. nullable-field assertions, empty-page shape, query-param serialization for dates/status, 500), every activator mutation (incl. `take`'s 409, `activate`'s no-longer-void return, `cancel`/`release`'s 204→void), every admin function (paginated + empty + 404/500). |
| `tests/integration/hooks/keys.test.tsx` | 7 cases: `useVerifyKey`/`useSubmitActivation` mutation success, `useActivationStatus` enabled-gating (disabled, undefined id, enabled), and the two new status-key invalidations for `useUpdateActivation`/`useSubmitAdditionalInfo`. |
| `tests/integration/hooks/activations.test.tsx` | 16 cases: 4 query-hook smoke tests, `useTakeActivation` (pending+active), `useFlagWrongInfo`+`useRequestAdditionalInfo` (active only), `useActivateRequest`/`useReleaseActivation`/`useFreezeActivation` (active+my-history+recent, via a shared helper), `useCancelActivation` (full set incl. the normalized `activators.myStats()` key, proven against a raw seeded query since there's no consumer yet), and the 3 admin mutations' domain-prefix invalidation (`qk.activations.all()`/`qk.activators.all()`). |

## Validation results
- `npx tsc --noEmit` ✅ clean (`src`, 0 errors) — this also confirms the type ripple from upgrading 5 mutation return types (`void` → real DTOs) didn't break any existing page/component consumer
- `npx tsc --noEmit -p tsconfig.test.json` ✅ clean (`src` + `tests`, 0 errors)
- `npx eslint` on every Sprint 3 file ✅ 0 errors after `--fix` (prettier formatting only)
- `npx vitest run` ✅ 109/109 tests pass, 10/10 files (52 carried over from Sprints 1–2 + 57 new)
- `npx vite build` ✅ production build unaffected

## Decisions & deviations
- **Query hooks needed a wrapper once services took a `signal` parameter.** Passing `queryFn: activationsService.getActive` directly (which worked when the Sub-01 stub took zero arguments) broke type-checking the moment the real service accepted `(signal?: AbortSignal)` — TanStack calls `queryFn` with a `QueryFunctionContext` object, not a raw signal, so the two shapes don't unify. Every affected query hook now reads `queryFn: ({ signal }) => service(..., signal)`. Caught immediately by `tsc`, not assumed — this was flagged as a real risk in `sprints.md` and confirmed on the first compile.
- **The `["activator","my-stats"]` (singular) legacy key is deliberately untouched in the four pre-existing hooks** (`useTakeActivation`, `useActivateRequest`, `useReleaseActivation`, `useFreezeActivation`) that invalidate it. `useMyStats` itself still uses that exact singular key (Sprint 3 doesn't touch it), and migrating only the *invalidation* call sites without also migrating the *query* key would silently break the invalidation (different key ⇒ no match) until Sprint 5's atomic D4 rename lands. **`useCancelActivation`, being brand new with no legacy key to preserve, uses the already-normalized `qk.activators.myStats()`** — this exact split is what plan.md's §3.2 table itself specifies (plural for the new hook, unqualified elsewhere), not an improvisation.
- **`qk.activations.myHistoryAll()` / `listAll()` added to the registry** — a real design gap found while wiring `useActivateRequest`'s invalidation: the plan's matrix invalidates the bare `['activations','my-history']` prefix (every cached page/filter), but the registry only had the fully-parameterized `myHistory(query)` accessor, which would invalidate exactly one query-param combination and miss every other cached variant. Fixed at the source (`query-keys.ts`) rather than working around it in each hook, and documented as the pattern for any future parameterized list key.
- **`useCancelActivation` and `useAdminActivations`'s five hooks ship without toasts** (D7): they're new, have no UI consumer yet, and inventing translation copy ahead of the UI stage would be scope creep beyond a data-layer sprint.
- **Hook tests needed `useTranslation` mocked**, not a real `LanguageProvider` wrapper: several mutation hooks (`useTakeActivation`, `useFlagWrongInfo`, etc.) call `useTranslation()` for toast copy, which reads React context that doesn't exist under `createQueryWrapper()`. Caught by the first failing test run (`useLanguage outside provider`), fixed per test-rules §6 by mocking the hook at its real path (`@/hooks/useTranslation` — the rules doc's own example path, `@/lib/i18n`, doesn't match this codebase's actual module layout).
- **Refactored two `it.each` invalidation tests into plain per-hook `it()` blocks** using a small shared async helper: the parametrized-tuple version required a `@ts-expect-error` to paper over each case's differently-typed `mutate()` call, which is exactly the kind of fragile cleverness worth avoiding — the unrolled version type-checks naturally with no suppression.
