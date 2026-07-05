---
sprint: 4
title: Assembly & Wiring — Active Requests (primary page)
status: ✅ Done
commit: 0c1a599
---

# Sprint 4 Report — Assembly & Wiring (Active Requests)

## Work done

Most of this page's wiring already existed from Sprint 2's `ActiveRequestCard` rewrite (gating, all 5 card-level mutations, timers, pending pool, take mutation). This sprint's real work was closing five concrete gaps found while checking that wiring against the plan/spec in detail, plus building the genuinely-new realtime pieces the plan reserved for this sprint.

### Fixed: `useActivateRequest`'s toast referenced a deleted i18n key
Sprint 2 renamed `activator.requests.card.doneToast` → `activateToast` when replacing the email-collecting Activate modal with a direct button, but `useActivateRequest.ts` itself still called `t("activator.requests.card.doneToast")` — a key that no longer exists. Since `translate()` returns the raw key string when a key is missing, every successful Activate would have shown the literal text "activator.requests.card.doneToast" instead of "Activation completed!". A repo-wide grep confirmed this was the only stale key reference anywhere in the portal. Fixed.

### Fixed: Request-OTP button used a hardcoded literal instead of the plan-fields registry
`requestableFields()` already existed in `plan-fields.ts` but was unused — `onOtp` hardcoded `{ fields: [AccountInformation.OTP] }` directly. Same value today (Snapchat+ is the only plan), but the sprint's own task wording ("plan-fields registry drives the copyable field list + OTP") means the registry should actually drive this, not just the Wrong-Info checkbox list. Swapped in `requestableFields(req.subscriptionLabel)`.

### Fixed: take-race 409 showed the wrong message
`useTakeActivation` had no `onError` handler at all, so a 409 (another activator already took the request) would surface through the app's global generic-message toast with the backend's raw text, `"Activation is no longer pending"` — not the spec's own wording (line 259: *"the loser sees 'This request was taken by another activator.'"*). Added a local `onError`: 409 → the new `activator.requests.takeRaceToast` key; anything else → the same generic message the global toast would have shown, reusing `query-client.ts`'s now-exported `message()` helper. To avoid a double toast, the mutation opts out of the global cache's toast via a new `meta: { silentErrorToast: true }` convention (added to `query-client.ts`'s `MutationCache.onError`, which checks `mutation.options?.meta?.silentErrorToast`) — a small, reusable escape hatch, not a one-off hack. Row removal on the loser's screen needed no fix: the winner's successful take already broadcasts `activation:taken`, which every connected activator's socket — including the loser's — already invalidates `qk.activations.pending()` on.

### Added: new-request chime + a functional highlight, connection indicator, reconnect toast + refetch
None of these existed yet — all three were genuinely Sprint 4's job per the plan:
- **Pending-list diff → chime + highlight** (`RequestsPage.tsx`): tracks the previous pending-id set in a ref; a new arrival (id present now but not in the previous set) triggers `useNotificationSound().playChime()` (already a no-op while muted) and a temporary highlight class on that row via a new `getRowClassName` prop added to the shared `DataTable`. Deliberately **not** the full "purple glow" animation — the plan splits detection (S4) from animation polish + reduced-motion safety (S5) explicitly, so this sprint's highlight is a plain functional fade, and Sprint 5 will do the actual glow treatment.
- **Connection indicator** (`ActivatorHeader.tsx`): mirrors Admin's existing `NotificationBell` pattern exactly — a pulsing dot on the bell icon + "Reconnecting…" text in its dropdown, driven by `useRealtimeStatus()`.
- **Reconnect toast + re-fetch on reconnect** (`lib/realtime.ts`): a `disconnect` handler on the activator socket shows `"Connection lost. Reconnecting…"` (skipped for an intentional logout disconnect, detected via socket.io's own disconnect reason string), and a `connect` handler invalidates `active`/`pending` so events missed while offline are caught up on reconnect.

### Corrected (not a new decision this sprint): the sidebar badge
The sidebar's "Active Requests" badge was showing the activator's own **active-request count**. Sprint 2's report justified this as following "a pre-existing `§8.Q5` decision" — checking that citation this sprint, **no such decision exists**: `codebase-map.md`'s actual `§8.Q5` is about the `/3` active-slots-cap constant being intentionally hardcoded, unrelated to badge semantics. The spec (SV-PAGE-002-005 line 61) is explicit and unambiguous: "badge = current pending-pool count." Since this is a factual correction (a mistaken citation used to justify a decision, not a real prior ruling) rather than a design fork, it's fixed directly rather than re-raised as a question — `ActivatorSidebarNav` now reads `usePendingActivations()`. This is also the "badge" the plan's own Sprint 4 task list means by "chime/glow/**badge** via a pending-list diff."

## Validation results
- `npm run check` (both tsconfigs) ✅ clean.
- `npx vitest run` ✅ 54/54 files, 392/392 tests green (a `mutationCache.onError`'s new 4th-parameter access needed a defensive `mutation.options?.meta` — the existing `query-client.test.ts` suite calls the cache callback directly with a bare `{}` fixture for `mutation`, which caught this immediately).
- `npx eslint` scoped to all 11 touched files — a handful of Prettier reflows plus one real pre-existing `@typescript-eslint/no-explicit-any` in `DataTable.tsx` (`ColumnDef<TData, any>` → `ColumnDef<TData>`, following the same cleanup already done for `HistoryPage`/`RequestsPage` in earlier sprints) — 0 errors after.
- **Live Playwright verification**: confirmed the bell/sidebar-badge regression check (still correct with the pool empty); then killed the live dev API mid-session to force a real socket drop — confirmed the "Connection lost. Reconnecting…" toast, the bell's reconnecting dot + dropdown text, and that the socket auto-reconnects once the API comes back (socket.io's own default backoff, no code needed for that part). Did **not** attempt a live take-race or new-arrival chime/glow test — manufacturing two simultaneous activators taking a real seeded pending activation is disproportionate for this sprint's verification pass (same judgment Sprint 2 made for the Active-card visuals); that logic is code-reviewed here and Sprint 6 will exercise it deterministically against mocked hooks.

## Sprint plan status
Admin work untouched this sprint (out of scope). Activator Portal: 4/6 sprints done — both Assembly & Wiring sprints (S3, S4) are now complete. Next = S5 (Polish — mobile-first responsive, a11y, dark mode, animations), which explicitly owns the card exit animation and the new-request glow's actual visual polish + reduced-motion safety that this sprint deliberately left as a plain functional highlight.
