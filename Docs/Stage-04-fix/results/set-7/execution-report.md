# Set 7 — Distributor portal — Execution Report

**Implements:** `Docs/Stage-04-fix/plan/set-7-plan.md`
**Order followed:** contract → backend → frontend.
**Migration:** none (no `schema.prisma` change — confirmed by plan §8 and by `git status`
showing no diff under `Apps/api/prisma/`).
**Branch:** `version-02-01`

---

## 1. Files changed, by package

### `Apps/contract` (13 modified, 0 new)

| File | Change |
|---|---|
| `modules/distributor/distributor.routes.ts` | `+ MY_DASHBOARD: '/me/dashboard'` |
| `modules/distributor/distributor.dtos.ts` | `+ DistributorDashboardResponseSchema` / `DistributorDashboardDTO` |
| `modules/card/card.routes.ts` | `+ GET_MINE`, `+ GET_MINE_BY_ID` |
| `modules/card/card.query.ts` | `+ GetDistributorCardsQuerySchema` |
| `modules/card/card.dtos.ts` | `+ DistributorCardResponseSchema` / `DistributorCardDTO`, `+ PaginatedDistributorCardsSchema` |
| `modules/order/order.routes.ts` | `+ GET_MINE`, `+ GET_MINE_BY_ID` |
| `modules/order/order.query.ts` | `+ GetMyOrdersQuerySchema` |
| `modules/activation/activation.routes.ts` | `+ GET_ON_MY_CARDS`, `+ GET_ON_MY_CARDS_BY_ID` |
| `modules/activation/activation.query.ts` | `+ GetDistributorActivationsQuerySchema`, `+ DistributorActivationIdParamsSchema` |
| `modules/activation/activation.dtos.ts` | `+ DistributorActivationResponseSchema` / `DistributorActivationDTO`, `+ DistributorActivationDetailResponseSchema` / `DistributorActivationDetailDTO`, `+ PaginatedDistributorActivationsSchema` |
| `modules/card-revocation-request/card-revocation-request.dtos.ts` | `CardRevocationRequestDTO.cardKey` → `.nullable()`; binding comment added to `RevocableCardDTO.cardKey` (no type change) |
| `modules/card-revocation-request/card-revocation-request.events.ts` | `RevocationRequestStatusChangedPayload.cardKey` → `.optional()` |

No new contract module, no barrel changes needed (existing `index.ts` files already `export *`
the touched sub-files).

### `Apps/api` (18 modified, 1 new)

| File | Change |
|---|---|
| `common/auth/distributor-scope.ts` | **new** — `resolveDistributorScope(prisma, userId)` |
| `common/realtime/realtime-gateway.ts` | strips `cardKey` before emitting `revocation-request:status-changed` to the distributor room |
| `common/notifications/notification.subscribers.ts` | `onRevocationRequestStatusChanged`'s `cardKey` param widened to optional + guarded (type-compat with the now-optional bus payload; behaviour unchanged — see §4) |
| `modules/distributor/{mapper,interface,service,controller,routes}.ts` | `+ myDashboard` end to end; one `card.groupBy` round trip |
| `modules/card/card.mapper.ts` | `+ distributorVisibleKey()` (the key gate), `+ toDistributorDTO`, `+ DistributorCardJoins` |
| `modules/card/{interface,service,controller,routes}.ts` | `+ getMine`, `+ getMineById` |
| `modules/order/{interface,service,controller,routes}.ts` | `+ getMine`, `+ getMineById` — **`order.mapper.ts` untouched**, reused verbatim |
| `modules/activation/activation.mapper.ts` | `+ toDistributorActivationDTO`, `+ toDistributorActivationDetailDTO` (imports `distributorVisibleKey` from the card module) |
| `modules/activation/{interface,service,controller,routes}.ts` | `+ getOnMyCards`, `+ getOnMyCardsById` |
| `modules/card-revocation-request/card-revocation-request.mapper.ts` | `+ toMineDTO` (distributor audience, key-gated); `CardRevocationRequestJoins.card.cardStat` added |
| `modules/card-revocation-request/card-revocation-request.service.ts` | `DETAIL_INCLUDE` now selects `cardStat`; `getMine()` → `toMineDTO`; `create()`/`emitStatusChanged()` kept on `toDTO` with a comment explaining why (see §4) |

`modules/index.ts` untouched — every new route hangs off an already-mounted router.

### `Apps/web` (11 modified, 12 new)

| File | Change |
|---|---|
| `App.tsx` | 3 lazy imports + 3 route objects under the existing `RoleGuard allow={[DISTRIBUTOR]}` branch |
| `config/nav-links.ts` | `DISTRIBUTOR_NAV_LINKS` 3 → 6 entries; `Ban` icon for revocations (freed from `CreditCard`, now owned by the new Cards link) |
| `config/translations.json` | 3 stale `distributor.portal.*` keys removed (no longer referenced); **72 new keys** added, all with `ar: ""` |
| `lib/query-keys.ts` | `distributors.myDashboard()`; `cards.mineAll/mine/mineDetail`; `orders.mineAll/mine/mineDetail`; `activations.onMyCardsAll/onMyCards/onMyCardsDetail` |
| `lib/realtime.ts` | Distributor namespace listener extended: `connect` and `order-request:status-changed` now also invalidate the three new Set 7 query families |
| `services/distributors.service.ts` | `+ getMyDashboard` |
| `services/cards.service.ts` | `+ getMine`, `+ getMineById` |
| `services/orders.service.ts` | `+ getMine`, `+ getMineById` |
| `services/activations.service.ts` | `+ getOnMyCards`, `+ getOnMyCardsById` |
| `hooks/useDistributorDashboard.ts` | **new** |
| `hooks/useMyCards.ts` | **new** — `useMyCards`, `useMyCard` |
| `hooks/useMyOrders.ts` | **new** — `useMyOrders`, `useMyOrder` |
| `hooks/useMyCardActivations.ts` | **new** — `useMyCardActivations`, `useMyCardActivation` |
| `pages/distributor/PortalPage.tsx` | rewritten — dashboard (was Set 1's empty shell) |
| `pages/distributor/CardsPage.tsx` | **new** |
| `pages/distributor/OrdersPage.tsx` | **new** |
| `pages/distributor/ActivationsPage.tsx` | **new** |
| `pages/distributor/components/CardsByStatusGrid.tsx` | **new** |
| `pages/distributor/components/MyCardsFilters.tsx` / `MyCardsTable.tsx` | **new** |
| `pages/distributor/components/MyOrdersFilters.tsx` / `MyOrdersTable.tsx` / `MyOrderDetailDrawer.tsx` | **new** |
| `pages/distributor/components/MyActivationsFilters.tsx` / `MyActivationsTable.tsx` / `MyActivationDetailDrawer.tsx` | **new** |
| `pages/distributor/components/MyRevocationRequestsTable.tsx` | `cardKey` cell made null-safe (renders `—`), both desktop and mobile |

---

## 2. The key gate — where it lives and how it was verified

`Apps/api/src/modules/card/card.mapper.ts` — `distributorVisibleKey(key, stat)`:
- `ACTIVATED` / `ACTIVATION_FAILED` → full key.
- `ACTIVATION_PROGRESS` → first 4 characters + a fixed-length mask (not length-revealing).
- every other `CardStat` (default branch) → `null`.

Called from exactly three places, all distributor-audience mappers:
`CardMapper.toDistributorDTO`, `ActivationMapper.toDistributorActivationDTO` (and its detail
variant, which delegates to the base), and `CardRevocationRequestMapper.toMineDTO`. Verified by
grep that no other call site exists and that no admin/activator path reaches it:

```
$ grep -rn "distributorVisibleKey" Apps/api/src
card.mapper.ts:43:export function distributorVisibleKey(key: string, stat: CardStat): string | null {
card.mapper.ts:...   key: distributorVisibleKey(card.key, stat),        // toDistributorDTO
activation.mapper.ts:...  key: distributorVisibleKey(card.key, stat),   // toDistributorActivationDTO
card-revocation-request.mapper.ts:...  cardKey: distributorVisibleKey(joins.card.key, joins.card.cardStat as CardStat), // toMineDTO
```

`card.service.ts`'s `getMine`/`getMineById` call `CardMapper.toDistributorDTO` exclusively —
`CardMapper.toDTO` (unconditional key) is never referenced on those two methods.

## 3. Scoping — service-query enforcement

All six new distributor-scoped methods (`distributor.myDashboard`, `card.getMine/getMineById`,
`order.getMine/getMineById`, `activation.getOnMyCards/getOnMyCardsById`) resolve
`resolveDistributorScope(prisma, req.user!.id)` first and put `distributorId: distributor.id` (or
`card: { distributorId: distributor.id }` for activations) as the **first key** inside the same
`where` object as the other filters — never a post-fetch filter, never spread from a separately
built object that a later edit could silently drop. Detail lookups use `findFirst` with the scope
predicate in the `where`, not `findUnique` + a post-check — a foreign id therefore 404s
(`NotFoundError`), never 403s.

## 4. Two deliberate deviations from the plan text, both forced by `tsc`

1. **§7.2 — `create()` on `CardRevocationRequestService` was planned to move to `toMineDTO`,
   then reverted to `toDTO`.** The `revocation-request:created` event payload's `cardKey` field
   is unchanged (still a required `z.string()`) — only the *status-changed* payload's `cardKey`
   was made optional (per §7.3). `toMineDTO` returns `string | null`, which doesn't satisfy that
   required field. Since the card is verified `ACTIVATION_FAILED` a few lines above `create()`'s
   emit (the full-key tier either way), the fix was `toDTO` with a comment explaining the
   equivalence, not a contract change. Functionally identical to what the plan intended; the byte
   the response carries is the same in both cases.
2. **`notification.subscribers.ts`'s `onRevocationRequestStatusChanged` needed its `cardKey` type
   widened to optional** to compile against the now-optional bus payload, plus a guard
   (`if (!p.cardKey) return`). This file is a Set 6 artifact the Set 7 plan did not mention. See
   the open question below — the Telegram message this handler sends still contains the full card
   key on every approval today, since the three service call sites that reach it always populate
   `cardKey`. That is a **known gap**, not fixed in this set (see §6).

## 5. Definition of Done — verified

| Check | Contract | Api | Web |
|---|---|---|---|
| `npx tsc --noEmit` | ✅ 0 errors | ✅ 0 **new** errors (diffed against a stashed baseline — see method below) | ✅ 0 errors |
| eslint | ✅ (`npm run lint` clean) | N/A — **no eslint config exists in `Apps/api`** (pre-existing gap, first flagged in Set 1/Set 6 reports, unrelated to this set) | ✅ 0 problems on every touched/new file |
| `npx madge --circular src` | ✅ none | ✅ none (141 files, informational for api since CLAUDE.md only requires it for contract) | — |
| Migration | none | | |
| Test files touched | `git status --short \| grep -iE "\.test\.\|\.spec\.\|__tests__\|/tests/\|vitest.config"` → **empty** | | |
| Magic strings | Routes come from `CARD_ROUTES` / `ORDER_ROUTES` / `ACTIVATION_ROUTES` / `DISTRIBUTOR_ROUTES` constants throughout; no inline route strings added | | |

**Method for the api tsc check:** `Apps/api` already had 60 pre-existing `tsc` errors before this
set touched anything — all inside frozen test files and two test-data factories, from earlier
sets' schema changes (`telegramLinkToken`, mapper argument-count drift, etc.), matching the
"frozen conformance suites break on the first contract change" note in `v2-decisions.md` §14/R11.
To avoid mistaking that pre-existing breakage for something this set caused, I captured a
`git stash` baseline, ran `tsc`, restored the stash, ran `tsc` again, and diffed the two error
lists. The diff after all fixes: **empty** — every error in the current tree also existed in the
baseline. (One tsc run was accidentally taken *without* restoring untracked files first — `git
stash` doesn't touch untracked files by default — so that specific run's output was discarded and
not used to justify anything; the final verification re-ran cleanly against the fully-restored
tree, confirmed by `git status --short` showing the same 46 modified + 17 new files before and
after.)

---

## 6. Open items for you

1. **Telegram notification on revocation approval still sends the full card key** (§4, item 2).
   `notification.subscribers.ts`'s `REVOCATION_APPROVED` template includes `cardKey` in the
   message body sent to the distributor. Under the Set 7 policy, by the time that message is
   composed the card may already be back at `AT_DISTRIBUTOR` (locked tier). This is a Set 6
   artifact the plan didn't scope in, and I did not change its behavior — only kept it compiling.
   Fixing it (drop `cardKey` from the template, or gate it the same way) is a small, contained
   follow-up if you want it in this set or the next.
2. **Plan §10 Q1–Q7** are all resolved as stated in the plan (spec wins on the U1⇄U2
   reconciliation; masked-tail identification for the prefix tier only; `resolveDistributorScope`
   used for new code only, the two Set 4/5 private copies left alone; house `page`/`limit` caps
   matched; no live update for the distributor's own activation list on `activation:status-changed`
   — refetch-on-reconnect only; contract option (a) for the optional socket `cardKey`).
3. **No manual test was run against a live server/browser in this session** — the report below is
   a checklist for you to execute, not a record of executed results.

---

## 7. Manual test checklist

Same as the plan's §11, reproduced here for convenience. Set up a distributor account with cards
in each of `AT_DISTRIBUTOR`, `ACTIVATION_PROGRESS`, `ACTIVATED`, `ACTIVATION_FAILED` first.

**Key visibility**

1. `GET /cards/mine` — an `AT_DISTRIBUTOR` card's `key` is `null` in the raw response.
2. An `ACTIVATION_PROGRESS` card's `key` is exactly 4 real characters + the fixed mask.
3. `ACTIVATED` and `ACTIVATION_FAILED` cards carry the full key.
4. UI: locked row shows `—` and no copy button; prefixed row shows the prefix and no copy button;
   full-tier rows show the full key with a working copy button.
5. Revoke an `ACTIVATION_FAILED` card as admin → reload `/portal/cards` → that card's `key` is now
   `null` (re-locked).
6. Same card, `/portal/revocations` — `GET /card-revocation-requests/mine` shows `cardKey: null`
   for that historical row; the same request via the **admin** endpoint still shows the full key.
7. Page through every page of `AT_DISTRIBUTOR`-filtered `/portal/cards` — no response contains a
   non-null key.

**Scoping (curl, distributor A's token against B's ids)**

8. `GET /cards/mine/{B's card id}` → 404.
9. `GET /orders/mine/{B's order id}` → 404.
10. `GET /activations/on-my-cards/{B's activation id}` → 404.
11. `/distributors/me/dashboard` totals match a manual `COUNT`/`GROUP BY` against the DB for that
    distributor; stats with 0 cards are absent from `cardsByStat`, not present with `0`.
12. Admin token → `GET /cards/mine` → 403. Activator token → same → 403.
13. `GET /cards/mine?distributorId={B}` — the param is silently ignored (not in the schema); result
    still scoped to A only.

**Activations list**

14. Search by full name → matches; by phone → matches; by a full card key → **no results** (key
    search is intentionally absent).
15. Combine state + card-status + plan + date range filters — narrows monotonically.
16. Change a filter while on page 3 → resets to page 1.
17. Sort Newest/Oldest/Recently-completed — each fires a new network request (server-side sort).
18. Activation detail drawer shows client/plan/key/status/timing/history and **nothing** about
    account fields, activator identity, or money.

**Orders, dashboard, layout, realtime**

19. `/portal/orders` lists only A's orders; detail drawer has no card key anywhere.
20. Dashboard headline numbers agree with the status grid and with filtered `/portal/cards`.
21. Slow-network reload of all four pages: sidebar/header/filters stay mounted, skeletons occupy
    content only.
22. API down: error state renders inside the content area with a retry button; no redirect.
23. Zero-card distributor: dashboard empty state links to `/portal/requests`; list pages show their
    no-data (not no-match) empty state.
24. Filtered-to-nothing: no-match empty state with a working clear-filters button.
25. 375px viewport: all four pages render cards, not tables; all six nav entries reachable via the
    sheet menu.
26. EN⇄FR toggle on every page and both drawers: no raw translation key, no leftover English string.
27. Activator/admin sessions redirected away from `/portal/*` to their own home.
28. Move an A order to `DELIVERED` as admin while `/portal/cards` is open in another window — A's
    card list and dashboard counts update without a manual reload.
29. Approve a revocation for A with the WS frame inspector open on the distributor namespace — the
    `revocation-request:status-changed` frame has no `cardKey` field; the admin namespace's frame
    still does.
