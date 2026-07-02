---
sprint: 4
title: Realtime Client
status: ✅ Done
commit: tbd
---

# Sprint 4 Report — Realtime Client

## Work done

### Core module (`src/lib`)
| File | Notes |
|---|---|
| `src/lib/realtime.ts` (new) | Namespace names + the `subscribe`/`unsubscribe` client→server interface pinned locally (contract gap, plan.md §7.5 — `ClientToServerEvents` in `@my-app/contract` is still `Record<string, never>`). Handshake `auth` callback re-reads the token store on every (re)connection attempt. `connect_error` handling branches on `err.message`: `UNAUTHORIZED` → shared `refreshTokens()` (Sprint 1's single-flight, re-used as-is) → one manual `socket.connect()`, guarded by a per-socket `hasRetried` flag (reset on the next successful `connect`) so a second 401 in the same cycle disconnects instead of looping; `FORBIDDEN` → permanent `disconnect()`; anything else (network blips) is left untouched for Socket.IO's own default reconnection/backoff. `connectRoleSocket(role)`/`disconnectRoleSocket()` manage the authed `/activators`\|`/admin` socket; `subscribeActivation`/`unsubscribeActivation` lazily create and manage the public `/client` socket, re-emitting the current subscription on every `connect` (realtime-rules.md §8). All six gateway events wired to `queryClient.invalidateQueries` per the plan.md §5.2 routing table — payloads are never written into the cache. A small connection-status store (`getRealtimeStatus`/`onRealtimeStatusChange`) backs the hook below. |
| `src/hooks/useRealtimeStatus.ts` (new) | `useSyncExternalStore` wrapper; no UI consumer yet. |

### Hook-layer wiring (within this sprint's allowed scope — see Decisions)
| File | Notes |
|---|---|
| `src/hooks/useVerifyKey.ts` | `onSuccess` now calls `subscribeActivation(data.activationId)` when present (not every verify status carries one — `INVALID` never does). |
| `src/hooks/useSubmitActivation.ts` | `onSuccess` now calls `subscribeActivation(data.activationId)` unconditionally (`ClientActivationStatusDTO.activationId` is required on this route). |

### Test scaffold additions
| File | Notes |
|---|---|
| `tests/fixtures/data/realtime.mock.ts` | All five non-`created` event payloads parsed through their contract schemas; `activation:created`'s payload reuses the existing `PendingActivationDTO` fixture rather than duplicating it. |
| `tests/unit/lib/realtime.test.ts` | 24 cases against a hand-rolled `FakeSocket` (real `EventEmitter` + spied `connect`/`disconnect`/`io.on`) behind a mocked `socket.io-client`: namespace URL composition + role gating, the auth callback resolving the *current* token (not a stale capture) across a simulated refresh, the full `UNAUTHORIZED`/`FORBIDDEN`/other-error `connect_error` matrix (incl. the no-loop and retry-guard-reset cases), every event→invalidation mapping for both role namespaces, portal subscribe/unsubscribe/resubscribe-on-reconnect, the public socket never touching auth-error handling, `disconnectRoleSocket`'s listener cleanup, and reconnecting tearing down any prior role socket first. |

### Test fix in an existing Sprint-3 file
| File | Notes |
|---|---|
| `tests/integration/hooks/keys.test.tsx` | Added `vi.mock("@/lib/realtime", ...)`. Without it, `useSubmitActivation`'s new `subscribeActivation` call opened a **real** `socket.io-client` connection during this file's tests (caught as an MSW "unhandled request" warning on the first run) — this file tests the keys hooks' own behavior, not realtime wiring, so the module is now a no-op mock here. |

## Validation results
- `npx tsc --noEmit` ✅ clean (`src`, 0 errors)
- `npx tsc --noEmit -p tsconfig.test.json` ✅ clean (`src` + `tests`, 0 errors)
- `npx eslint` on every Sprint 4 file ✅ 0 errors after `--fix` (prettier formatting only)
- `npx vitest run` ✅ 133/133 tests pass, 11/11 files (109 carried over from Sprints 1–3 + 24 new)
- `npx vite build` ✅ production build unaffected (the `LandingPage` chunk grew ~29KB→~72KB since `socket.io-client` now bundles into it via the `useVerifyKey`/`useSubmitActivation` import chain — expected, not a regression)

## Decisions & deviations
- **`AuthProvider`'s connect/disconnect binding and the portal's "reset unsubscribes" wiring are deferred**, matching Sprint 2's precedent. `sprints.md`'s Sprint 4 task list calls for "`AuthProvider` effect connects/disconnects the role socket" and a UI-level unsubscribe-on-reset — both require editing component/page files (`AuthProvider.tsx`, `LandingPage.tsx`), which the execution protocol's standing constraint (`never touch /src/components or /src/pages`) rules out this sprint. What *is* in scope and done: the library functions (`connectRoleSocket`/`disconnectRoleSocket`/`subscribeActivation`/`unsubscribeActivation`) are fully built, tested, and ready to be called; and the one piece of wiring that lives entirely in `/src/hooks` (`useVerifyKey`/`useSubmitActivation` calling `subscribeActivation` on success) *is* done, since hooks are in-scope. No functional regression results: without the `AuthProvider` binding, the role socket simply never connects yet, so activator/admin realtime updates are inert until that binding lands — a real, scoped gap, not a silent one.
- **A per-socket `hasRetried` flag, reset on `connect`**, goes beyond literally what plan.md's `connect_error` description states, mirroring `axios.ts`'s `_retried` pattern for symmetry. Without it, a second `UNAUTHORIZED` in the same connection cycle (refreshed token still rejected) would trigger a *second* refresh attempt — not an infinite loop, but not "one reconnect" either. Verified by a dedicated test that fires two `connect_error` events without an intervening successful `connect` and asserts `refreshTokens()` was called exactly once.
- **`activation:resolved`'s my-stats invalidation uses the normalized `qk.activators.myStats()`**, not the legacy singular key — same reasoning as `useCancelActivation` (Sprint 3): this module is brand new, carries no legacy key to preserve, and plan.md's own §5.2 table already writes it in the normalized (plural) form.
- **Test isolation required `vi.resetModules()` + dynamic re-import per test, not just mock clearing.** `realtime.ts` holds module-level singleton state (`roleSocket`, `clientSocket`, `currentSubscription`) with no reset export, so importing it once at the top of the test file would leak connection state across `it()` blocks. A `setup()` helper resets the module registry and re-imports `realtime.ts` *and* its transitive dependencies (`@/lib/query-client`, `@/lib/token-store`, the mocked `@/lib/axios`) together each time, so they all resolve to the same fresh instances. One further wrinkle, caught by the first run: `vi.mock()` factories run once per file, not once per `resetModules()` call, so the mocked `refreshTokens` function was accumulating call history across tests until `setup()` explicitly called `.mockReset()` on it.
