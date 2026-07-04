---
sprint: 4
title: Assembly & Wiring — Step 3 + Realtime + Sections
status: ✅ Done
commit: TBD
---

# Sprint 4 Report — Step 3 + Realtime + Sections

## Work done

### Step 3 OTP + completion views — already done
OTP submit, resend cooldown, wrong-code/lockout handling, and the Activated/Failed/Under-review views were all already fully wired by Sprint 2/3 (`viewForStatus` already dispatches all three). This sprint renamed the callback in Sprint 3 to thread a real mutation result into context — nothing new to build here.

### Realtime backbone
`useActivationStatus` existed since the Sub-01 MVP but had no consumer ("ready for a future page to enable it"). This sprint is that page:
- **`LandingPage`** enables the query whenever `activation.activationId` exists and the status isn't terminal (`ACTIVATED`/`FAILED` — no further changes are ever expected once there), and folds a changed result back into `ActivationContext` through a new `applyStatus()` helper. That same helper now backs Step 2/3's own mutation successes too, replacing what used to be two separate, duplicated inline object-spreads.
- **`useActivationStatus` itself** gained `refetchOnWindowFocus: true` (the global default is `false`, so this is a deliberate per-query override) and a `refetchInterval` that polls every 8s only while `getRealtimeStatus() !== "connected"` — the existing connection-status store `lib/realtime.ts` already exposed for `NotificationBell`, reused as-is.
- **`lib/realtime.ts`'s `attachClientNamespaceListeners`** gained the same two things `attachActivatorNamespaceListeners` already has for its own namespace: a "Connection lost. Reconnecting…" toast on `disconnect` (new `public.landing.shell.connectionLost` key, stable toast id so a flaky connection replaces rather than stacks), and a `connect` handler that invalidates the current subscription's status query on every (re)connect, to catch anything missed while offline.
- **Re-dispatch required no new code at all** — it's just `viewForStatus()` (built in Sprint 3) reacting to whatever `applyStatus()` puts in context. The realtime backbone's entire job is getting a fresh status into context; everything downstream of that was already correct.
- **"Check Another Key" teardown**: `CheckAnotherKeyButton` now reads `activation?.activationId` and calls `unsubscribeActivation()` before `reset()`. Deliberately **not** mirrored onto the header logo's own reset — the spec (plan.md §D1) ties the unsubscribe specifically to this button, not the logo, and extending it there would be scope the spec didn't ask for.

### Sections — confirmed unchanged
`usePublicStats`/`/api/stats` still don't exist (§E-1). `StatsRow`/`WhoWeAre` stay exactly as Sprint 2 left them — static, degrading silently, never an error block.

## A new documented data gap, not a local patch
`useActivationStatus`'s return type is fixed at `ClientActivationStatusDTO = {activationId, status}` — the contract's own thin status endpoint, which the plan's own §B1 explicitly names as the realtime mechanism (not a re-verify call, which *would* return the richer fields). This means a realtime-driven transition into **Needs-correction** or **Activated** updates `status` correctly but can't refresh `flaggedFields` or `accountUsername` — those stay whatever the last verify/mutation response had. Both degrade gracefully (no fields highlighted / no username badge shown, never a crash — `CompletedStep` already conditionally skips the username display when absent). This mirrors §E-1's own precedent exactly ("missing contract data is an upstream fix, never a local patch") — documented here as a comparable gap rather than silently worked around by, say, swapping in a re-verify call the plan never asked for.

## Reasoned calls, not escalated
- **Multi-tab "latest wins"** needed no new code: there's exactly one `ActivationContext.activation` at a time, so whichever `activationId` is currently in context is the only one any query or effect ever operates on — an older, abandoned activationId's socket invalidation just lands on a query nothing observes anymore.
- **No new toast/reconnect-invalidate test added to `realtime.test.ts`**: the pre-existing file has zero test coverage for the *activator* socket's own equivalent disconnect-toast and reconnect-invalidate behavior either, despite having tests for every discrete `activation:*` event. Adding coverage only for the new client-socket code would be inconsistent with that file's own established scope boundary; page-level realtime behavior (view re-dispatch, teardown) is explicitly Sprint 6's job (`ClientPortal.realtime.test.tsx`).

## Validation results
- `npm run check` (both tsconfigs) ✅ clean.
- `npx vitest run` ✅ 59/59 files, 439/439 tests. One pre-existing test file (`tests/integration/hooks/keys.test.tsx`) needed its `@/lib/realtime` mock extended with a `getRealtimeStatus` export, since `useActivationStatus`'s new `refetchInterval` now calls it on every render — without it, React crashed mounting the hook under test. `tests/unit/lib/realtime.test.ts`'s existing 24 tests stayed green untouched.
- `npx eslint`/`prettier` scoped to all 6 touched files — 0 errors after one scoped `--fix` (JSX line-wrap only).
- **Live Playwright verification** (route-mocked backend — no real Socket.IO server available in this environment, so the socket itself never actually connects here): with a Needs-OTP screen showing, and the mocked `/keys/:id/status` endpoint returning a changed status on its second call, the page **automatically re-dispatched to the Under-review screen after ~8 seconds with zero user interaction** — proof the polling-fallback path (which invalidates→refetches→calls `applyStatus`→re-renders via `viewForStatus`, the exact same pipeline a live socket event drives) works end-to-end. The socket-specific pieces (disconnect toast, reconnect-invalidate) were verified by reading the code and by the full existing `realtime.test.ts` suite staying green, not by a live socket drop/reconnect — flagged honestly above rather than claimed as fully live-verified.

## Sprint plan status
Client Portal: 4/6 sprints done. Next = S5 (Polish — mobile-first responsive, RTL-readiness audit, a11y, dark mode, anims). No behavior changes expected there; the flow itself is now fully wired end-to-end for all 9 statuses, forms, OTP, and realtime re-sync.
