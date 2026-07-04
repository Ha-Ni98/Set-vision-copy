---
sprint: 1
title: Core Pipeline
status: ✅ Done
commit: 83e0a20
---

# Sprint 1 Report — Core Pipeline

## Work done

### Dependencies & config
| File | Notes |
|---|---|
| `package.json` | Dev: `vitest@3.2.6`, `jsdom@25.0.1` (pinned below 27+, see Decisions), `@testing-library/react@16.3.2`, `@testing-library/user-event@14.6.1`, `@testing-library/jest-dom@6.9.1`, `msw@2.14.6`, `@vitest/coverage-v8@3.2.6`. Runtime: `socket.io-client@4.8.3` (consumed Sprint 4; approval — plan.md §8.8). New scripts `test`/`test:watch`; `check` now runs both `tsconfig.json` and `tsconfig.test.json`. |
| `vitest.config.ts` | `mergeConfig` over `vite.config.ts`; `environment: 'jsdom'`, `setupFiles: ['./tests/fixtures/wrappers/setup.ts']`, `include: ['tests/**/*.test.{ts,tsx}']` (structurally enforces "no tests in `/src`"). |
| `tsconfig.test.json` | Extends `tsconfig.json`, adds `tests/**/*` to `include` — `npm run check` now covers the test tree. |
| `.env.test` (new) / `.env.example` | `VITE_API_URL` (existing) + new `VITE_WS_URL` (server origin, no `/api/v1` prefix — sockets attach at `WS_PATH`, consumed Sprint 4). |

### Core infrastructure (`src/lib`)
| File | Notes |
|---|---|
| `src/lib/token-store.ts` (new) | Access token in a module-scoped variable only (never persisted); refresh token in `localStorage` under `sv_refresh_token`. `getAccessToken/getRefreshToken/setTokens/clear`. |
| `src/lib/axios.ts` (reworked) | Dropped `withCredentials`; added `timeout: 15_000`. Request interceptor attaches `Authorization: Bearer` from the token store. Response interceptor implements the 4-step 401 state machine: (1) non-401 passes through, (2) 401 on `LOGIN`/`REFRESH`/`LOGOUT` never refreshes/redirects, (3) single-flight `refreshTokens()` + one `_retried` replay, (4) failure/already-retried clears tokens and redirects via the existing `setRedirect` bridge with loop prevention preserved. `refreshTokens()` exported for reuse by the realtime layer (Sprint 4). |
| `src/lib/query-client.ts` (hardened) | `defaultOptions`: `staleTime: 30_000`, `gcTime: 5m`, no retry on 4xx, `refetchOnWindowFocus: false`, mutations `retry: 0`. Both caches now suppress toasts on 401 and on canceled/aborted requests (`axios.isCancel`), in addition to the existing first-load guard. |
| `src/lib/query-keys.ts` (new) | Full `qk` registry for all 16 domains per plan.md §3.1, each with an `all()` prefix for the plan §3.2 domain-wide invalidation rows. Later sprints only consume this — no further additions planned. |

### Test scaffold (`/tests`)
| File | Notes |
|---|---|
| `tests/fixtures/msw/envelope.ts` | `ok()`/`fail()`/`noContent()`, mirroring `Apps/api`'s `sendSuccess`/`globalErrorHandler` exactly (including the Zod-issues `details` shape on 400s). |
| `tests/fixtures/msw/api-url.ts` | `apiUrl()` = `VITE_API_URL` + `apiPath(...)` — the same builder services use, so handler URLs can't drift. |
| `tests/fixtures/msw/server.ts` | `setupServer()` with an empty handler array; later sprints append their domain's handlers here. |
| `tests/fixtures/wrappers/setup.ts` | MSW lifecycle (`onUnhandledRequest: 'error'`), `@testing-library/jest-dom/vitest`, and per-test `tokenStore.clear()` + `localStorage.clear()`. |
| `tests/fixtures/wrappers/createQueryWrapper.tsx` | Fresh `QueryClient` per test, retries off, for hook integration tests in later sprints. |

### Tests
| File | Cases |
|---|---|
| `tests/unit/lib/api-path.test.ts` | 10 cases: joining, duplicate-slash collapse, trailing-slash strip, root `'/'`, param encoding (space/unicode), multi-param paths, pinned missing-param → literal `"undefined"`. |
| `tests/unit/lib/token-store.test.ts` | 6 cases: set/get, refresh-token persistence key, access token never written to `localStorage`, null-before-set, `clear()`, tolerance of a pre-existing unexpected string value. |
| `tests/unit/lib/axios.test.ts` | 13 cases against the real MSW server: Bearer attach/absence, single-refresh-and-replay, single-flight under concurrency, refresh-failure clear+redirect (exactly once), no double redirect on a second 401, `LOGIN`-endpoint exclusion, no-refresh-token straight redirect, already-on-`/login` loop prevention, `refreshTokens()` short-circuit with no refresh token, non-401 passthrough, timeout enforcement, untransformed network error. |
| `tests/unit/lib/query-client.test.ts` | 8 cases invoking `QueryCache`/`MutationCache` `.config.onError` directly: server-message toast, 401 silence, canceled-request silence (both caches), first-load silence vs. background-refetch toast, translated fallback when no envelope is present. |

## Validation results
- `npx tsc --noEmit` ✅ clean (`src`, 0 errors)
- `npx tsc --noEmit -p tsconfig.test.json` ✅ clean (`src` + `tests`, 0 errors)
- `npx eslint` on every Sprint 1 file (`src/lib/*`, `tests/**`, `vitest.config.ts`) ✅ 0 errors (project-wide `eslint .` still reports pre-existing errors in untouched Sub-01 files — `src/pages/activator/*`, `src/services/*.service.ts` — confirmed via `git diff --stat` to predate this sprint; out of scope per the execution protocol's `/src/components`, `/src/pages` boundary and outside this sprint's task list)
- `npx vitest run` ✅ 37/37 tests pass, 4/4 files
- `npx vite build` ✅ production build unaffected

## Decisions & deviations
- **Auth transport is Bearer, not cookies** (plan.md D1, owner decision 2026-07-01): the execution protocol's boilerplate text ("Axios handles cookies + 401") is superseded by this already-approved deviation; `axios.ts`'s interceptors implement Bearer + single-flight refresh instead. Noted per the standing rule (resolve HOW conflicts toward the rules/prior decisions, note them) rather than treated as a new conflict requiring a pause.
- **`jsdom` pinned to `25.0.1`, not latest (`29.x`)**: `jsdom@29` pulls `html-encoding-sniffer` → `@exodus/bytes`, an ESM-only package that fails to load under Node 18.18 (`ERR_REQUIRE_ESM`), confirmed by direct reproduction before committing to it. `jsdom@25` loads cleanly, dedupes against `vitest`'s own `jsdom` peer with no version conflict, and keeps `npm audit --omit=dev` at 0 vulnerabilities.
- **Timeout test forces `adapter: 'http'` and a 50ms override, not the instance's `timeout: 15_000` at real speed**: two environment-only gaps, confirmed by direct diagnosis, neither of which changes production behavior. (1) `vi.useFakeTimers()` deadlocks MSW's real event-loop-driven interception instead of fast-forwarding it — reproduced live (20s hang) before working around it. (2) jsdom's XHR shim doesn't enforce `.timeout` when MSW intercepts underneath it at the `ClientRequest` layer (a jsdom+MSW test-environment gap — real browsers do enforce `xhr.timeout`), confirmed by a two-adapter diagnostic (`http` adapter timed out correctly in 74ms; `xhr` adapter hung past 3s). The `http` adapter override exercises the identical `timeout` config plumbing MSW and Node both handle correctly.
- **`query-client.test.ts` invokes `QueryCache`/`MutationCache` `.config.onError` directly** rather than driving them through rendered `useQuery`/`useMutation` hooks: TanStack's own cancel-on-unmount machinery suppresses `onError` before it would ever reach our wiring for cancellations it triggers itself (confirmed against the library's cancellation-suppression behavior) — asserting that path would test TanStack internals, out of bounds per plan.md §4.6. Calling the caches' own `.config` is a documented public surface and isolates the test to *our* suppression logic (message extraction, 401/cancel silencing) regardless of what produced the error.
- **`refresh()` has no hook** (by design, not an omission): `AUTH_ROUTES.REFRESH` is interceptor-only infrastructure inside `axios.ts`; a React hook wrapping it would violate the axios-layer's "one instance, no domain callers reaching around it" boundary. `auth.service.ts`'s own `refresh` export (Sprint 2, for route-coverage completeness) will delegate to `refreshTokens()` here rather than duplicate the single-flight logic.
