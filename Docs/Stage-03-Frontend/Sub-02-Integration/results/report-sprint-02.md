---
sprint: 2
title: Auth Domain
status: ✅ Done
commit: tbd
---

# Sprint 2 Report — Auth Domain

## Work done

### Services & hooks (`src/services`, `src/hooks`)
| File | Notes |
|---|---|
| `src/services/auth.service.ts` (rewired) | All 4 `AUTH_ROUTES` mapped. `login` unwraps `AuthTokensDTO` and calls `tokenStore.setTokens`. `logout` reads the refresh token from the store itself (see Decisions), POSTs it, and clears tokens in a `finally` regardless of outcome. `me` unwraps `SessionUserDTO`, return type dropped the stub's `\| null` (real errors now throw instead of resolving null). `refresh` is a direct re-export of `refreshTokens` from `src/lib/axios.ts` — route-coverage completeness with zero duplicated single-flight logic. |
| `src/hooks/useLogin.ts` (new) | Mutation; invalidates `qk.auth.me()` on success. |
| `src/hooks/useLogout.ts` (new) | Mutation; `queryClient.clear()` on **settle** (not just success) — local logout always happens per the service's `finally`, so the cache should reflect it either way. |
| `src/hooks/useSession.ts` (new) | Query on `qk.auth.me()`, `staleTime: Infinity`, `retry: false`. |

### Test scaffold additions
| File | Notes |
|---|---|
| `tests/fixtures/data/auth.mock.ts` | `AuthTokensDTO` + `SessionUserDTO` (ACTIVATOR and ADMIN variants), all `Schema.parse`d against the contract. |
| `tests/fixtures/msw/auth.handlers.ts` | Happy-path defaults for all 4 routes (`ok`/`noContent`) + an `authErrorHandlers` map (401 invalid-credentials, 401 unauthorized, 500, 401 invalid-refresh) for `server.use()` overrides. |
| `tests/fixtures/msw/server.ts` | Now seeded with `authHandlers` (was an empty array after Sprint 1). |

### Tests
| File | Cases |
|---|---|
| `tests/integration/services/auth.service.test.ts` | 10 cases: login unwrap + token storage, login 401 (no tokens stored), a request after login carries the stored token, me unwrap, me 401, **cold-start restore** (only a persisted refresh token → me() 401 → silent refresh → retried request succeeds, asserted via a 2-call counter), logout 204 + clears, logout 500 (still throws, still clears), logout with no stored refresh token (asserted zero network calls), and `refresh` reference-equality with `axios.ts`'s `refreshTokens`. |
| `tests/integration/hooks/auth.test.tsx` | 5 cases: `useSession` success/error, `useLogin` invalidation (asserted via a request counter — the session refetches after login), `useLogout` cache clear on success and on API failure (asserted via `queryClient.getQueryData`, a documented public API — not internals). |

## Validation results
- `npx tsc --noEmit` ✅ clean (`src`, 0 errors) — confirms `AuthProvider.tsx` still compiles against the changed service signatures with zero edits to it (see Decisions)
- `npx tsc --noEmit -p tsconfig.test.json` ✅ clean (`src` + `tests`, 0 errors)
- `npx eslint` on every Sprint 2 file ✅ 0 errors after `--fix` (prettier formatting only)
- `npx vitest run` ✅ 52/52 tests pass, 6/6 files (37 carried over from Sprint 1 + 15 new)
- `npx vite build` ✅ production build unaffected

## Decisions & deviations
- **`AuthProvider.tsx` / `ProtectedRoute.tsx` left untouched — the sprints.md task calling for the `stubSession` deletion and `isReady` gate is deferred**, not done this sprint. The execution protocol's constraints for this run state "never touch `/src/components` or `/src/pages`" (and Commandment #2: "No UI code"); `AuthProvider.tsx` lives under `src/components/providers/`. This is a genuine change from the Sprint 2 plan I wrote in Phase 02, which had scoped that edit in as "plumbing, not UI" — the freshly-restated hard boundary in this execution turn takes precedence, so it's deferred rather than silently done anyway. Concretely this means: the app still works exactly as before (no regression — see below), but `AuthProvider`'s local `stubSession` bridge and its stale post-login placeholder (`{ id: "", username: "", role: ACTIVATOR, fullName: "" }`) remain in place until a UI-integration stage touches that file.
- **Why no regression despite that deferral**: `AuthProvider.tsx` calls `authService.login` / `authService.logout` / `authService.me` by reference, not by reimplementing them — so making those functions real (instead of stubs) required zero signature changes on `AuthProvider`'s side. `me()`'s stub-era `\| null` return narrowed to just `SessionUserDTO` (throws instead), which is still compatible with `meQuery.data ?? stubSession` (TypeScript's `??` only cares about `undefined`, not the removed `\| null`). The new hooks (`useLogin`/`useLogout`/`useSession`) and `AuthProvider`'s existing inline `useMutation`/`useQuery` calls also target the *same* query key — `qk.auth.me()` serializes to the identical `["auth","me"]` tuple `AuthProvider` already hardcodes — so `useLogin`'s invalidation will correctly refetch `AuthProvider`'s session query today, with no wiring needed.
- **`logout()` takes zero parameters, reading the refresh token from the store internally** rather than accepting a `RefreshTokenCommand` argument as the plan's route table literally shows. This was the direct consequence of the "don't touch AuthProvider" constraint: `AuthProvider` calls `logoutMutation.mutate()` with no argument, and changing `logout`'s signature to require one would force `TVariables` inference to require an argument at that call site — a type error I'd have had to fix inside `AuthProvider.tsx`. Reading the token internally (mirroring `refreshTokens()`'s own established pattern from Sprint 1) avoids that entirely and is arguably the better design regardless, since the caller shouldn't need to know or supply the refresh token by hand.
- **`refresh` has no hook**, confirmed as planned in Sprint 1's report: it's a direct re-export of the axios-layer single-flight function, verified by a reference-equality test rather than re-testing refresh behavior (already covered by Sprint 1's `axios.test.ts`).
- **Added `setRedirect(vi.fn())` to both new test files' `beforeEach`**: 401 tests with no stored refresh token fall through to axios's real redirect path; without a stub, jsdom logged a noisy (non-failing) "Not implemented: navigation" error for every such case. Caught by inspecting stderr output during the first test run, not assumed.
