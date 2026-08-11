# Set 7 — Distributor portal

**Depends on:** 1, 4, 5 · **Touches:** contract, api, web · **No prisma change, no migration.**
**Status:** PLAN ONLY — no code written in this session.
**Date:** 2026-08-10 · **Branch:** `version-02-01` · **Tree at:** `e5bebb2`

**Inputs read:** `.claude/CLAUDE.md`, `Docs/Stage-04-fix/plan/v2-decisions.md`,
`Docs/Stage-01-Contract/contract-rules.md`, `Docs/Stage-02-Backend/back-end-rules.md`,
`Docs/Stage-03-Frontend/front-end-rules.md`,
`Docs/Stage-04-fix/new-features-fixes/version-2-description.md` (§ Set 7),
`set-4-plan.md`, `set-5-plan.md`, `set-6-plan.md`.

## Decisions taken by the user in this planning session

They override my recommendations where they differ and are folded into every section below.

| # | Decision |
|---|---|
| **U1** | Key visibility is **three-tier**, not two: `ACTIVATED` + `ACTIVATION_FAILED` → **full key**; `ACTIVATION_PROGRESS` → **first 4 characters only**; every other `CardStat` → **nothing**. (§2.2) |
| **U2** | Masking is performed **server-side, in the mapper**. The client never receives a full key it is expected to hide. (§2.3) |
| **U3** | A distributor sees, on activations against their own cards: client name + phone, status, timing. **No** account credentials, **no** activator identity, **no** money. (§4.1) |
| **U4** | The Set 5 key exposure is **reconciled inside Set 7** — one key-visibility policy across the whole portal. (§7) |

### U1 ⇄ U2 reconciliation — resolved, not deferred

U1 says non-lifecycle cards show "nothing". The Q2 answer selected *server-side masked tail* as the
identification mechanism. Read literally against each other these disagree for `AT_DISTRIBUTOR`.

**The spec settles it.** `version-2-description.md` § Set 7 manual test 2 is binding:

> An `AT_DISTRIBUTOR` card shows no key **in the network response**, not just in the UI.

So U2 is taken as governing the **mechanism** (masking happens on the server, never in the browser)
and U1 as governing the **levels** (which stats get what). Final policy in §2.2. `AT_DISTRIBUTOR`
rows carry no key material of any kind — not full, not prefixed, not tailed. §2.5 covers how those
rows stay identifiable without one. **Confirm at review — Q1.**

---

## 0. Audit

Everything here is observed in the tree at `e5bebb2`. Nothing is carried over from Set 0 unverified.

### 0.1 The activator portal — what actually transfers

| Asset | File | Verdict for Set 7 |
|---|---|---|
| Aggregated self-scoped summary endpoint | `ACTIVATOR_ROUTES.MY_STATS = '/me/stats'` → [`activator.service.ts:356`](Apps/api/src/modules/activator/activator.service.ts#L356) | **The precedent to copy.** One route, one `Promise.all`, `ForbiddenError` when the principal has no profile. §1 mirrors it. |
| Dashboard page shape | [`DashboardPage.tsx`](Apps/web/src/pages/activator/DashboardPage.tsx) | Structure reusable (`PageHeader` outside the state branch → `isError` → `isLoading` → content). **Content is not** — every one of its 4 stat cards is earnings/credits/commission, which §Scope forbids. |
| List page shape | [`HistoryPage.tsx`](Apps/web/src/pages/activator/HistoryPage.tsx) (438 L) | **The template for the cards and activations pages.** Filters rendered *outside* the loading branch, `useDebouncedValue` on search, `setPage(1)` on every filter change, `DataTable` + `renderMobileRow`, two-variant empty state (no-data vs no-match + clear-filters). |
| Client-side sort workaround | [`HistoryPage.tsx:61-64`](Apps/web/src/pages/activator/HistoryPage.tsx#L61-L64) | **Do not copy.** It exists only because `GetActivatorHistoryQuery.sortBy` has no direction field. Set 7's query schema adds `sortDir`, so sorting is genuinely server-side (§4.2). |
| `ActiveRequestCard`, `RequestsPage`, `LiveTimer` | activator pool UI | **Nothing transfers.** No distributor equivalent of taking/working a request exists. |

### 0.2 Card and order query services

[`CardService.getAll`](Apps/api/src/modules/card/card.service.ts#L71) — `adminOnly`. `where` is
`deletedAt: null` + 8 optional spreads (`search` on `key`, `state`, `setNumber`, `lotNumber`,
`distributorId`, `subscriptionPlanId`, `flag`). `include`s plan/set/lot/distributor, maps through
`CardMapper.toDTO`, which emits **`key` as a required, unconditional string**
([`card.mapper.ts:29-45`](Apps/api/src/modules/card/card.mapper.ts#L29-L45)).

> Consequence: **`CardDTO` cannot be reused or derived from** for the distributor. `key` is
> `z.string()`, non-nullable. A `.omit({key:true}).extend({key: z.string().nullable()})` derivation
> would still start from the full entity shape — the exact "start from the entity and remember what
> to strip" pattern contract-rules §3.5 forbids. Set 7 builds `DistributorCardDTO` field by field.

[`OrderService.getAll`](Apps/api/src/modules/order/order.service.ts#L44) — `adminOnly`, same
`where`-spread idiom, `distributorId` already an optional filter. **`OrderDTO` contains no card key**
— only `lotNumbers[]` and `cardsCount`. `orderPrice`/`deliverPrice` are the *distributor's own*
spend, not activator commission, so §Scope's "no activator earnings" does not touch them.

> Consequence: **`OrderDTO` and `OrderDetailDTO` are reused verbatim.** Orders cost one route and
> one service method, zero new DTOs and zero new mappers. This is the single biggest reuse win in
> the set. §6.

### 0.3 The `getMine` pattern from Sets 4/5

Both request modules already implement exactly the shape Set 7 needs:

- Route: `GET_MINE = '/mine'`, guarded `requireAuth({ roles: [UserRole.DISTRIBUTOR] })`, registered
  **before** the `/:id` param route
  ([`card-order-request.routes.ts:27-33`](Apps/api/src/modules/card-order-request/card-order-request.routes.ts#L27-L33)).
- Controller: `this.service.getMine(req.user!.id, query)` — the principal id, never a body/query id.
- Service: `const distributor = await this.resolveDistributor(userId)` then
  `where: { distributorId: distributor.id, ... }`.
- Private helper, **duplicated verbatim in both modules**
  ([order:347](Apps/api/src/modules/card-order-request/card-order-request.service.ts#L347),
  [revocation:311](Apps/api/src/modules/card-revocation-request/card-revocation-request.service.ts#L311)):
  `findFirst({ where: { userId, deletedAt: null } })` → `ForbiddenError()` when absent.

Set 7 adds four more scoped services. That would make six copies. §3.1 extracts one helper.

### 0.4 The contract pagination / filter query-schema pattern

Eight `Get*QuerySchema` objects, byte-consistent:

```ts
page:  z.coerce.number().int().min(1).max(100).default(1).optional(),
limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
search: z.string().optional(),
<enum filters>: z.enum(X).optional(),
<id filters>:   z.uuid().optional(),
dateFrom / dateTo: z.iso.datetime().optional(),
```

Backend reads them as `query.page ?? 1` / `query.limit ?? 10` (the `.optional()` defeats `.default()`
at the type level, so the service repeats the default — house idiom, kept). Paging via
`toSkipTake` + `buildPaginationMeta` from [`common/http/pagination.ts`](Apps/api/src/common/http/pagination.ts).
Response wrapper via the `paginated()` factory.

⚠️ Note the `.max(100)` on **`page`**, not just `limit` — page 101 is unreachable across all eight
schemas. Pre-existing; Set 7 matches house style rather than diverging in one new schema. **Q5.**

### 0.5 Statistics — can I extend one instead of adding another? **No.**

All ten `STATISTICS_ROUTES` are `adminOnly` and **globally scoped** — no viewer id reaches any of
them. The nearest shape is `INVENTORY_SUMMARY`, whose `cards: [{stat, count}]` array is exactly the
dashboard's payload — but it also returns business-wide `sets`, `lots` and `cardFlags`, unfiltered.

Extending it would mean adding an optional `distributorId` **and** `DISTRIBUTOR` to its roles array,
producing one endpoint with two security postures whose scoping depends on a query parameter. That
is precisely the failure mode **R18** was written to prevent (`GET_PENDING`/`GET_RECENT` widened to
`[ACTIVATOR, ADMIN]` while their services take no viewer id), and R18 closes with:

> Set 7's distributor activation list needs its own scoped endpoint.

**Decision: a dedicated `DISTRIBUTOR_ROUTES.MY_DASHBOARD`, mirroring `ACTIVATOR_ROUTES.MY_STATS`.**
`MY_STATS` is the codebase's own answer to "self-scoped summary" and it deliberately lives in the
subject's module, not in `statistics`. The `[{stat, count}]` array *shape* is reused from
`InventorySummaryDTO` (§1.1); the endpoint is not. No statistics file is touched by Set 7.

### 0.6 Scoping facts the whole set rests on

| Fact | Evidence |
|---|---|
| `Card.distributorId` is written **once**, at order→`DELIVERED`, and **never cleared** | [`order.service.ts:274`](Apps/api/src/modules/order/order.service.ts#L274) is the only writer; `grep -rn "distributorId:" Apps/api/src/modules/*/*.service.ts` shows no null-out anywhere |
| ⇒ scoping by `distributorId` is durable across the whole card lifecycle, including after activation | derived from the above |
| `Card.deletedAt` exists (soft delete); `Order` has **none** (hard delete) | `schema.prisma`; `OrderService.getAll` has no `deletedAt` predicate |
| `Activation` reaches a distributor only through `card.distributorId` — there is no direct FK | `model Activation` has `cardId`, `activatorId`; no `distributorId` |
| CardStat lifecycle at a distributor: `AT_DISTRIBUTOR` → `ACTIVATION_PROGRESS` → `ACTIVATED` \| `ACTIVATION_FAILED` | [`activation.service.ts:354`](Apps/api/src/modules/activation/activation.service.ts#L354), [`:777`](Apps/api/src/modules/activation/activation.service.ts#L777), [`:1245`](Apps/api/src/modules/activation/activation.service.ts#L1245), [`:1316`](Apps/api/src/modules/activation/activation.service.ts#L1316) |
| Activator `cancel()` does **not** fail the card — it opens a *new* `PENDING` activation on the same card, which stays `ACTIVATION_PROGRESS` | [`activation.service.ts:815-865`](Apps/api/src/modules/activation/activation.service.ts#L815-L865) |
| ⚠️ `revokeCardWithin` returns a card to **sellable stock**: `isRevoked: true, isActive: true, cardStat: AT_DISTRIBUTOR` + `nbOfActiveCards++` | [`card.service.ts:44-58`](Apps/api/src/modules/card/card.service.ts#L44-L58) — this is why §7's leak is real, not cosmetic |
| The distributor socket namespace + room already exist and are wired end to end | [`rooms.ts`](Apps/api/src/common/realtime/rooms.ts), [`realtime-gateway.ts:110-133`](Apps/api/src/common/realtime/realtime-gateway.ts#L110-L133), [`realtime.ts:194-207`](Apps/web/src/lib/realtime.ts#L194-L207) |
| `RoleGuard`, `DistributorLayout/Sidebar/Header`, `ROLE_HOME`, `DISTRIBUTOR_NAV_LINKS` all exist | Set 1 |
| `StatusBadge` already covers `CardStat`, `OrderStat`, `ActivationStat` | [`StatusBadge.tsx:1-11`](Apps/web/src/components/shared/StatusBadge.tsx#L1-L11) |

### 0.7 ⚠️ Two live key leaks inherited from Set 5

Both are in scope per **U4**. Detail and fix in §7.

1. **`CardRevocationRequestDTO.cardKey` is an unconditional `z.string()`**
   ([contract](Apps/contract/src/modules/card-revocation-request/card-revocation-request.dtos.ts))
   and `getMine()` serves it to the distributor. After an approval the card is back at
   `AT_DISTRIBUTOR` **and re-sellable** (§0.6), so the historical request row keeps handing the
   distributor a live key for a card that is now locked-tier inventory.
2. **`revocation-request:status-changed` ships `cardKey` over the socket** to
   `rooms.distributor(...)` ([gateway:128-133](Apps/api/src/common/realtime/realtime-gateway.ts#L128-L133)),
   with the same post-approval timing. Nothing on the frontend reads the field — the listener only
   invalidates — but it is on the wire, which "keys must never leave the server" forbids outright.

`RevocableCardDTO.cardKey` (`getEligible`) is **already compliant**: its own query pins
`cardStat: ACTIVATION_FAILED`, which U1 puts in the full-key tier. It needs a binding comment, not a
change.

---

## 1. The dashboard summary DTO — field by field

**One endpoint. One database round trip.**

### 1.1 Contract

```ts
// Apps/contract/src/modules/distributor/distributor.dtos.ts

// Card counts by status for the signed-in distributor's own stock. Deliberately the ONLY
// aggregate in this DTO: the portal dashboard is "card counts by status only" (Set 7 scope).
// No money, no activator data, no activation counts.
//
// Array-of-{stat,count} rather than Record<CardStat, number>, matching InventorySummaryDTO.cards
// exactly — a Record collides with noUncheckedIndexedAccess at every read site. Stats with zero
// cards are OMITTED; a consumer treats a missing stat as 0, never as undefined.
export const DistributorDashboardResponseSchema = z.object({
  cardsByStat: z.array(z.object({ stat: z.enum(CardStat), count: z.number().int() })),
  totalCards:  z.number().int(),
  disabledCards: z.number().int(),
  revokedCards:  z.number().int(),
});
export type DistributorDashboardDTO = z.infer<typeof DistributorDashboardResponseSchema>;
```

`CardStat` is imported from `../card/card.enums`. `distributor.dtos.ts` has no existing import from
`card`, so this is a **new cross-module contract edge** — run `madge --circular src` after
(**R13**). `card.enums.ts` imports nothing, so no cycle is possible, but the check is in the DoD.

### 1.2 Field → source

| Field | Source | Notes |
|---|---|---|
| `cardsByStat[].stat` | `groupBy` key `cardStat` | Cast `PrismaCardStat → CardStat` in the mapper, as every other mapper does |
| `cardsByStat[].count` | `Σ _count._all` over the group rows sharing that `cardStat` | Folded in the service from the single query below |
| `totalCards` | `Σ _count._all` over **all** group rows | Derived — **no second query**. Not client-derived, because summing an array in JSX is logic in a component (front-end-rules §2) |
| `disabledCards` | `Σ _count._all` where `isDisabled === true` | Same fold |
| `revokedCards` | `Σ _count._all` where `isRevoked === true` | Same fold |

### 1.3 The single query

```ts
// distributor.service.ts — myDashboard(principalUserId)
const distributor = await resolveDistributorScope(this.prisma, principalUserId);

// ONE round trip. Grouping on the two boolean flags alongside cardStat yields at most
// 7 x 2 x 2 = 28 rows, which is cheaper to fold in memory than three extra COUNT queries
// (Set 7 execute prompt: "One aggregated summary endpoint. No N+1.").
const rows = await this.prisma.card.groupBy({
  by: ['cardStat', 'isDisabled', 'isRevoked'],
  where: { distributorId: distributor.id, deletedAt: null },
  _count: { _all: true },
});
```

Folding is a `for` loop into a `Map<CardStat, number>` plus three running totals, then
`DistributorMapper.toDashboardDTO(...)`, which `.parse()`es the result.

Covered by `@@index([distributorId])` on `Card`. No new index, no migration.

**Empty state is a legitimate result**, not an error: a distributor who has never received an order
gets `{ cardsByStat: [], totalCards: 0, disabledCards: 0, revokedCards: 0 }` and the page renders its
empty state (§5.3), mirroring the activator dashboard's `isNewActivator` branch.

### 1.4 Route

```ts
// Apps/contract/src/modules/distributor/distributor.routes.ts
export const DISTRIBUTOR_ROUTES = {
  …existing 9…
  MY_DASHBOARD: '/me/dashboard',   // mirrors ACTIVATOR_ROUTES.MY_STATS = '/me/stats'
} as const;
```

Registered in `distributor.routes.ts` **before** `GET_BY_ID = '/:id'` — `/me/dashboard` is two
segments so it cannot collide, but registration order stays with the house convention. Guard:
`requireAuth({ roles: [UserRole.DISTRIBUTOR] })`.

---

## 2. The card list DTO and the key gate

### 2.1 Contract

```ts
// Apps/contract/src/modules/card/card.dtos.ts

// Built field-by-field from scratch — NOT derived from CardResponseSchema. That schema's `key`
// is a required z.string(); any .omit()/.extend() derivation still starts from the full entity
// shape, which is the pattern contract-rules §3.5 forbids ("build a DTO from the fields you want;
// never start from the full entity and try to remember what to strip").
//
// Deliberately absent versus CardDTO:
//   setNumber      — production data; a distributor has no relationship to a printing set
//   distributorName — always the viewer; redundant, and echoing scope back invites its use as a filter
//   isActive       — internal circulation flag with no distributor-facing meaning
export const DistributorCardResponseSchema = z.object({
  id: z.uuid(),
  // null OR a server-truncated prefix OR the full key, decided ONLY by CardMapper's key gate.
  // See distributorVisibleKey() — the single authority. Never masked, truncated or hidden
  // anywhere on the client.
  key: z.string().nullable(),
  subscriptionPlanId: z.uuid(),
  subscriptionLabel: z.string(),
  lotNumber: z.string().nullable(),
  cardStat: z.enum(CardStat),
  isDisabled: z.boolean(),
  isRevoked: z.boolean(),
  deliveredAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});
export type DistributorCardDTO = z.infer<typeof DistributorCardResponseSchema>;

export const PaginatedDistributorCardsSchema = paginated(DistributorCardResponseSchema);
export type PaginatedDistributorCards = z.infer<typeof PaginatedDistributorCardsSchema>;
```

`deliveredAt` = the delivering order's `completedAt`, reached via `card.lot.orderLots[0].order`. The
identical nested-select already exists at
[`activation.service.ts:1147-1154`](Apps/api/src/modules/activation/activation.service.ts#L1147-L1154),
so this is a joined column in one query, **not** an N+1. `null` for a card whose lot has no
completed order.

### 2.2 The `CardStat` → key-visibility table (U1 + spec manual test 2)

| `CardStat` | `key` in the payload | Why |
|---|---|---|
| `ACTIVATED` | **Full key** | Spent. The client already consumed it; the distributor learning it grants no capability. |
| `ACTIVATION_FAILED` | **Full key** | The distributor must act on it — support the client, or file a revocation request (Set 5). Already the de-facto policy there (§0.7). |
| `ACTIVATION_PROGRESS` | **First 4 characters**, remainder replaced by a fixed mask | In flight. Enough to match the physical card a client is calling about; not enough to activate it. |
| `AT_DISTRIBUTOR` | **`null`** | **Live sellable stock.** A leaked key here is directly activatable — the whole reason the rule exists. |
| `IN_LOT` | **`null`** | Not yet delivered. Also unreachable by the scope query (`distributorId` is set at delivery). |
| `PRINTED` | **`null`** | Unreachable by the scope query. Listed so the table is exhaustive over the enum. |
| `IN_SET` | **`null`** | Unreachable by the scope query. Same. |

A **revoked** card sits at `AT_DISTRIBUTOR` (§0.6), so its key **re-locks** the moment the
revocation is approved. That is intended: revocation returns the card to sellable stock, and
sellable stock is the locked tier. It is also exactly what §7 fixes on the Set 5 side.

### 2.3 The gate — one function, default-deny

```ts
// Apps/api/src/modules/card/card.mapper.ts

/** Full key: the card has left sellable stock for good. */
const KEY_FULL_STATS: ReadonlySet<CardStat> = new Set([
  CardStat.ACTIVATED,
  CardStat.ACTIVATION_FAILED,
]);

/** Head-truncated key: the card is mid-activation. Identification, not capability. */
const KEY_PREFIX_STATS: ReadonlySet<CardStat> = new Set([CardStat.ACTIVATION_PROGRESS]);

const KEY_PREFIX_LENGTH = 4;
const KEY_PREFIX_MASK = '••••••••';   // fixed length: does NOT encode the real key length

/**
 * THE ONLY function that shapes a Card.key for a distributor audience.
 *
 * DEFAULT-DENY BY CONSTRUCTION: a CardStat present in neither set falls through to `null`.
 * A new value added to the enum later is therefore locked automatically — it can only ever be
 * leaked by someone explicitly adding it to a set above, never by forgetting to.
 *
 * Never call this on an admin or activator path; those audiences get card.key directly.
 */
export function distributorVisibleKey(key: string, stat: CardStat): string | null {
  if (KEY_FULL_STATS.has(stat)) return key;
  if (KEY_PREFIX_STATS.has(stat)) return key.slice(0, KEY_PREFIX_LENGTH) + KEY_PREFIX_MASK;
  return null;
}
```

Exported (not module-private) because `card-revocation-request.mapper.ts` must call the *same*
function for §7's reconciliation. `modules/*` importing from another `modules/*` is already the
norm here (`composeSubscriptionLabel`, `revokeCardWithin`, `propagateOrderStatToRequest`).

The mask is a **fixed-length** literal on purpose: `'*'.repeat(key.length - 4)` would publish the
key's exact length. `maskKey()` in `activation.mapper.ts` does exactly that and is **not reused**
here — it is a *tail* mask for a different audience and a different threat model. Two masks, two
call sites, deliberately not merged. State this in a comment so a later reader does not "unify" them.

### 2.4 The mapper method

```ts
static toDistributorDTO(card: DistributorCardRow, joins: DistributorCardJoins): DistributorCardDTO {
  const stat = card.cardStat as CardStat;
  const dto: DistributorCardDTO = {
    id: card.id,
    key: distributorVisibleKey(card.key, stat),   // ← the only key expression on this path
    subscriptionPlanId: card.subscriptionPlanId,
    subscriptionLabel: composeSubscriptionLabel(joins.subscriptionPlan),
    lotNumber: joins.lot?.lotNumber ?? null,
    cardStat: stat,
    isDisabled: card.isDisabled,
    isRevoked: card.isRevoked,
    deliveredAt: joins.deliveredAt?.toISOString() ?? null,
    createdAt: card.createdAt.toISOString(),
  };
  return DistributorCardResponseSchema.parse(dto);   // runtime backstop
}
```

**Four independent guarantees that a locked key cannot reach the response:**

1. `distributorVisibleKey` is default-deny (§2.3) — no `else` branch returns `key`.
2. `toDistributorDTO` is the **only** mapper the distributor card service calls. `CardMapper.toDTO`
   (unconditional key) is unreachable from any `DISTRIBUTOR`-guarded route.
3. The service uses an explicit `select`, so `DistributorCardRow` is a narrow type. It still selects
   `key` — the mapper needs it — which is why the gate is in the mapper and nowhere else, exactly as
   the execute prompt requires.
4. `.parse()` at the exit. `DistributorCardResponseSchema` is a plain `z.object` (strip mode), so
   any stray field added upstream is dropped rather than serialised.

**Definition-of-done grep:** `grep -n "\.key" Apps/api/src/modules/card/card.service.ts` — every hit
on a distributor path must be inside a `toDistributorDTO` call, and
`grep -n "toDTO\|toDetailDTO" ` must show zero hits in `getMine`/`getMineById`.

### 2.5 Identifying a locked row without a key

`AT_DISTRIBUTOR` rows carry no key material, so the table identifies them by
**lot number + subscription plan + delivered date + status**. Fifty cards from one lot do render
identically — and that is the correct model: undelivered-to-client stock is **fungible inventory**,
not individually addressable items. The distributor's real question there is *"how many of plan X do
I still have?"*, which the dashboard (§1) answers directly.

The card list's default sort is therefore `deliveredAt desc, createdAt desc`, which naturally groups
a lot together, and the UI shows a per-lot count in the mobile card (§5.4).

---

## 3. Scoping rules, as they appear in the Prisma `where`

### 3.1 One scope resolver

Six copies of `resolveDistributor` would exist after this set (two from Sets 4/5, four new). Extract:

```ts
// Apps/api/src/common/auth/distributor-scope.ts   (NEW)
//
// Lives in common/ and imports nothing from modules/ — prisma arrives as a parameter, errors come
// from common/errors. Same shape and same legality as common/realtime/realtime-gateway.ts, which
// already performs a Prisma read (User.id -> Activator.id) inside common/. Not placed in
// common/utils/, which back-end-rules §9 reserves for pure functions.
export type DistributorScope = { id: string; storeName: string; isEnabled: boolean };

/** Resolves the signed-in principal to their own Distributor row. THE single translation from
 *  User.id to Distributor.id for every scoped read in the portal. Throws ForbiddenError when the
 *  principal has no live distributor profile — a DISTRIBUTOR-role user with a deleted profile is
 *  a broken state, not a 404. */
export async function resolveDistributorScope(
  prisma: PrismaClient,
  userId: string,
): Promise<DistributorScope> {
  const d = await prisma.distributor.findFirst({
    where: { userId, deletedAt: null },
    select: { id: true, storeName: true, isEnabled: true },
  });
  if (!d) throw new ForbiddenError();
  return d;
}
```

Used by all four new service groups. Per **R9**'s precedent ("use it for everything new; leave
existing call sites alone"), the two Set 4/5 private copies are **not** refactored in this set — they
are behaviourally identical and touching them would ripple into two frozen test files for no gain.
Recorded for the Set 13/14 audit. **Q4.**

### 3.2 The `where` clause per resource

`me = await resolveDistributorScope(prisma, req.user!.id)` in every row below.

| Resource | Endpoint | Prisma `where` |
|---|---|---|
| **Dashboard** | `DISTRIBUTOR_ROUTES.MY_DASHBOARD` | `{ distributorId: me.id, deletedAt: null }` on `card.groupBy` |
| **Cards — list** | `CARD_ROUTES.GET_MINE` | `{ distributorId: me.id, deletedAt: null, …filters }` |
| **Cards — detail** | `CARD_ROUTES.GET_MINE_BY_ID` | `findFirst({ where: { id, distributorId: me.id, deletedAt: null } })` |
| **Orders — list** | `ORDER_ROUTES.GET_MINE` | `{ distributorId: me.id, …filters }` |
| **Orders — detail** | `ORDER_ROUTES.GET_MINE_BY_ID` | `findFirst({ where: { id, distributorId: me.id } })` |
| **Activations — list** | `ACTIVATION_ROUTES.GET_ON_MY_CARDS` | `{ card: { distributorId: me.id, deletedAt: null }, …filters }` |
| **Activations — detail** | `ACTIVATION_ROUTES.GET_ON_MY_CARDS_BY_ID` | `findFirst({ where: { id, card: { distributorId: me.id, deletedAt: null } } })` |
| **Order requests** | `CARD_ORDER_REQUEST_ROUTES.GET_MINE` | `{ distributorId: me.id }` — **exists, unchanged** |
| **Revocation requests** | `CARD_REVOCATION_REQUEST_ROUTES.GET_MINE` | `{ distributorId: me.id }` — **exists**; mapper changes in §7 |

### 3.3 Five non-negotiable scoping rules

1. **`findFirst` with the scope predicate in the `where` — never `findUnique` then compare.**
   A post-fetch `if (row.distributorId !== me.id) throw` loads the foreign row into memory first and
   is one early `return` away from a leak. Set 5's `create` uses the post-check form
   ([`card-revocation-request.service.ts:128-131`](Apps/api/src/modules/card-revocation-request/card-revocation-request.service.ts#L128-L131));
   new code does not copy it.
2. **A foreign id returns `NotFoundError` (404), not `ForbiddenError` (403).** 403 confirms the row
   exists, turning every detail endpoint into an existence oracle across tenants. `ForbiddenError` is
   reserved for "you have no distributor profile at all" (§3.1).
3. **The scope id comes from `req.user!.id` only.** No route in this set accepts a `distributorId`
   query param, path param or body field. The admin's `distributorId` filters on
   `GetCardsQuery`/`GetOrdersQuery`/`GetActivationsQuery` are **not** reachable from the new
   schemas — §4.2 defines separate ones that simply do not have the field.
4. **Scoping is in the query, never after the fetch and never in the UI** (execute prompt). No
   `.filter()` over a fetched page appears anywhere in this set.
5. **Reads are allowed to a disabled distributor; writes are not.** Matching Set 4, where `getMine`
   ignores `isEnabled` but `create` throws `BadRequestError` on it. Set 7 is read-only, so no new
   write gate is needed. ⚠️ Pre-existing and unchanged: distributor routes use bare `requireAuth`,
   so a disabled account keeps read access until its JWT expires — `requireAuth({ checkDB: true })`
   is the fix and is out of scope here. **Q3.**

### 3.4 Route constants

```ts
// card.routes.ts   (contract)
GET_MINE: '/mine',
GET_MINE_BY_ID: '/mine/:id',

// order.routes.ts  (contract)
GET_MINE: '/mine',
GET_MINE_BY_ID: '/mine/:id',

// activation.routes.ts → ACTIVATION_ROUTES  (contract)
GET_ON_MY_CARDS: '/on-my-cards',
GET_ON_MY_CARDS_BY_ID: '/on-my-cards/:id',
```

Named `ON_MY_CARDS`, not `MINE`: `ACTIVATION_ROUTES` already has `GET_MY_HISTORY` meaning *"the
activations I, the activator, worked"*. A distributor's are *"activations against cards I own"* —
a different relation, and a name collision here would be a genuine security-relevant confusion.

**Express registration order in all three routers: static-prefix routes before `/:id`.** `/mine`,
`/mine/:id`, `/on-my-cards` and `/on-my-cards/:id` must all be registered above the existing
`GET_BY_ID`, or `/mine` matches `/:id` and hits the admin handler. The convention and its comment
already exist in [`card.routes.ts:29-30`](Apps/api/src/modules/card/card.routes.ts#L29-L30).

Guard on all six: `const distributorOnly = requireAuth({ roles: [UserRole.DISTRIBUTOR] })`.

---

## 4. The activation list — DTO and query schema

### 4.1 `DistributorActivationDTO` (U3)

```ts
// Apps/contract/src/modules/activation/activation.dtos.ts

// Distributor-facing. Built field-by-field; NOT derived from AdminActivationResponseSchema, which
// carries activatorFullName and activationPrice — both forbidden here (Set 7: "No activator
// earnings, credits, or commission data"; the activator's identity is equally not the
// distributor's business).
//
// DELIBERATELY ABSENT, and none of these may be added later without revisiting Set 7's scope:
//   activatorFullName / activator{}   — activator identity
//   activationPrice / earning         — activator commission
//   activationEmail                   — the pool address the activation was completed with
//   submittedInformation / accountFields / otpValue / timeline[].wrongFields
//                                     — the client's Snapchat credentials. D3 opened these to the
//                                       ADMIN only; the distributor is not in that decision.
export const DistributorActivationResponseSchema = z.object({
  id: z.uuid(),
  subscriptionLabel: z.string(),
  // Same gate as the card list — see distributorVisibleKey(). An activation always implies the
  // card is in the lifecycle, so in practice this is full or 4-char-prefixed, never null; the
  // nullable type keeps the ONE policy honest instead of special-casing it here.
  key: z.string().nullable(),
  cardId: z.uuid(),
  cardStat: z.enum(CardStat),
  client: ClientBlockSchema,          // reused: { fullName, phone }
  state: z.enum(ActivationStat),
  requestedAt: z.iso.datetime(),
  completedAt: z.iso.datetime().nullable(),
  durationSeconds: z.number().int().nullable(),
});
export type DistributorActivationDTO = z.infer<typeof DistributorActivationResponseSchema>;

// Detail adds only the card's own chain and the status history — no new sensitive surface.
export const DistributorActivationDetailResponseSchema =
  DistributorActivationResponseSchema.extend({
    lotNumber: z.string().nullable(),
    // Status transitions and their timestamps ONLY. NOT TimelineEntrySchema — that carries
    // wrongFields/additionalFields, i.e. the client's credential values.
    statusHistory: z.array(
      z.object({ stat: z.enum(ActivationStat), at: z.iso.datetime() }),
    ),
  });
export type DistributorActivationDetailDTO =
  z.infer<typeof DistributorActivationDetailResponseSchema>;

export const PaginatedDistributorActivationsSchema =
  paginated(DistributorActivationResponseSchema);
```

`.extend()` on the distributor's *own* base schema is fine — the base was already built
field-by-field, so nothing is inherited from an entity shape. This is the same idiom as
`CardDetailResponseSchema.extend(...)`.

`durationSeconds` is computed by the existing `durationSeconds(takenAt, completedAt)` helper in
`activation.mapper.ts`. `takenAt` itself is **not** exposed — it is an activator workflow timestamp.

`statusHistory` reads `ActivationStep` (`activationStat`, `createdAt`) with **no** join to
`WrongInformation` / `AdditionalInformation`. Stated explicitly because the admin detail path *does*
join them and a copy-paste would leak credentials.

### 4.2 The query schema

```ts
// Apps/contract/src/modules/activation/activation.query.ts

export const GetDistributorActivationsQuerySchema = z.object({
  page:  z.coerce.number().int().min(1).max(100).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
  search: z.string().trim().min(1).max(100).optional(),
  state: z.enum(ActivationStat).optional(),
  subscriptionPlanId: z.uuid().optional(),
  cardStat: z.enum(CardStat).optional(),
  dateFrom: z.iso.datetime().optional(),
  dateTo: z.iso.datetime().optional(),
  sortBy: z.enum(['requestedAt', 'completedAt']).optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
});
export type GetDistributorActivationsQuery =
  z.infer<typeof GetDistributorActivationsQuerySchema>;

export const DistributorActivationIdParamsSchema = z.object({ id: z.uuid() });
```

**There is deliberately no `distributorId` and no `activatorId` field.** Scope is the principal
(§3.3 rule 3); activator identity is not filterable because it is not visible.

| Aspect | Value | Rationale |
|---|---|---|
| **Search fields** | `clientFullName`, `clientPhone` — `OR`, `contains`, `mode: 'insensitive'` | Exactly what spec manual test 5 requires |
| **Search — NOT the card key** | excluded | ⚠️ **Security, not omission.** A key search would confirm a full key against an `ACTIVATION_PROGRESS` card, whose key the distributor is only allowed to see 4 characters of — turning the search box into an oracle that defeats §2.2's middle tier. `GetActivationsQuery.key` (admin) exists and must **not** be copied. Write this reason into the schema as a comment. |
| **Filters** | `state` (`ActivationStat`), `subscriptionPlanId`, `cardStat`, `dateFrom`/`dateTo` on `requestedAt` | `cardStat` lets a distributor isolate "failed, needs a revocation request", the portal's main call to action |
| **Sort — whitelist** | `requestedAt` \| `completedAt` | Closed `z.enum`, so an arbitrary column can never reach `orderBy` |
| **Sort — direction** | `sortDir: asc \| desc`, separate field | The activator history's missing direction field is what forced its client-side sort ([HistoryPage.tsx:61-64](Apps/web/src/pages/activator/HistoryPage.tsx#L61-L64)). Not repeated. |
| **Sort — default** | `requestedAt desc`, tie-broken by `id asc` | A deterministic tiebreaker; without one, two rows with an identical timestamp can swap between pages and duplicate/skip across a page boundary |
| **Sort — why not duration** | `durationSeconds` is computed (`completedAt − takenAt`), not a column | Prisma cannot `orderBy` it. Offering it would need a raw query or in-memory sort of the whole table. Excluded, and said so in the schema comment. |
| **Pagination defaults** | `page = 1`, `limit = 10` | House default (`query.limit ?? 10` in the service) |
| **Max limit** | `100` | House cap across all eight existing schemas |
| **Max page** | `100` | House cap. Pre-existing quirk (§0.4) — 1 000 rows reachable at limit 10. **Q5.** |

### 4.3 The list query

```ts
const where = {
  card: {
    distributorId: me.id,
    deletedAt: null,
    ...(query.subscriptionPlanId && { subscriptionPlanId: query.subscriptionPlanId }),
    ...(query.cardStat && { cardStat: query.cardStat as PrismaCardStat }),
  },
  ...(query.state && { activationStat: query.state as PrismaActivationStat }),
  ...(query.search && {
    OR: [
      { clientFullName: { contains: query.search, mode: 'insensitive' as const } },
      { clientPhone:    { contains: query.search, mode: 'insensitive' as const } },
    ],
  }),
  ...((query.dateFrom || query.dateTo) && {
    requestedAt: {
      ...(query.dateFrom && { gte: new Date(query.dateFrom) }),
      ...(query.dateTo && { lte: new Date(query.dateTo) }),
    },
  }),
};

const orderBy = [
  { [query.sortBy ?? 'requestedAt']: query.sortDir ?? 'desc' },
  { id: 'asc' as const },
];
```

⚠️ **The scope predicate lives inside the same `card` object as the card filters.** Building
`cardWhere` separately and spreading it — the admin `getAll` idiom
([`activation.service.ts:1086-1107`](Apps/api/src/modules/activation/activation.service.ts#L1086-L1107))
— makes it possible for a future edit to overwrite `card` wholesale and drop the scope. Write it
inline, with `distributorId` as the first key.

`select` (not `include`) pulls only: activation scalars + `card: { id, key, cardStat, lot: { lotNumber } , subscriptionPlan: { subscriptionType, subscriptionDuration } }`. **`activator` is never
selected** — the join simply does not exist on this path, so activator data cannot leak even by
mapper accident.

Indexes: `Card.@@index([distributorId])` + `Activation.@@index([cardId])` + `@@index([requestedAt])`
all exist. No new index, no migration.

---

## 5. Frontend

### 5.1 Nav

`DISTRIBUTOR_NAV_LINKS` goes from 3 → 6, flat (the activator sidebar is flat; `NavGroup` is an
admin-only construct and `DistributorSidebarNav` maps a plain `NavLink[]`):

| Order | `to` | `labelKey` | Icon | Status |
|---|---|---|---|---|
| 1 | `/portal` | `distributor.nav.portal` | `LayoutDashboard` | exists |
| 2 | `/portal/cards` | `distributor.nav.cards` | `CreditCard` | **new** |
| 3 | `/portal/orders` | `distributor.nav.orders` | `Truck` | **new** |
| 4 | `/portal/activations` | `distributor.nav.activations` | `Zap` | **new** |
| 5 | `/portal/requests` | `distributor.nav.orderRequests` | `Package` | exists (Set 4) |
| 6 | `/portal/revocations` | `distributor.nav.revocations` | `Ban` | exists (Set 5) — **icon changes** from `CreditCard`, which row 2 now owns |

`Truck` and `Ban` are lucide-react icons already available — no new dependency.

**Where the Set 4/5 request pages slot in:** they do not move. Their routes, files, hooks and
services are untouched; they gain siblings above them in the sidebar and become rows 5–6 of a
six-item portal. The only edits are the `Ban` icon swap and — from §7 — a null-safe `cardKey` cell in
`MyRevocationRequestsTable.tsx`.

### 5.2 Routes

Three route objects added to the existing `RoleGuard allow={[UserRole.DISTRIBUTOR]}` →
`DistributorLayout` branch in [`App.tsx:159-183`](Apps/web/src/App.tsx#L159-L183), each
`React.lazy` + `withSuspense` + `errorElement: <RouteErrorBoundary />` like every sibling:

```
/portal/cards        → pages/distributor/CardsPage
/portal/orders       → pages/distributor/OrdersPage
/portal/activations  → pages/distributor/ActivationsPage
```

**No `:id` detail routes.** Order and activation detail open in a **Sheet/drawer** over the list, the
`OrderDetailDrawer` pattern from the admin orders page. Two reasons: filter + page state survives
opening and closing a detail (spec manual test 5 — "pagination survives filter changes"), and it
avoids three more lazy chunks and a back-navigation state-restore problem the portal has no other
need for.

`CatchAllRoute` already renders `DistributorLayout` for a `DISTRIBUTOR` session
([App.tsx:94-95](Apps/web/src/App.tsx#L94-L95)) — nothing to change.

### 5.3 `PortalPage.tsx` — dashboard

Replaces the Set 1 empty shell entirely.

```
PageHeader (title + subtitle)               ← always rendered, outside every state branch
├── isError   → NotFoundState + retry Button        (inside the content area)
├── isLoading → 4x StatCardSkeleton + a 7-tile skeleton grid
└── data
    ├── Row 1: 4x StatCard — Total cards / At distributor / In activation / Activated
    ├── Row 2: CardsByStatusGrid — one tile per CardStat present, count + StatusBadge
    ├── Row 3: two small StatCards — Disabled / Revoked
    └── totalCards === 0 → EmptyState (dashed=false) inside the Row-2 card,
                           with a Button linking to /portal/requests
```

The four Row-1 headline numbers are read out of `cardsByStat` with a small
`countOf(cardsByStat, stat)` helper (`lib/utils.ts` already exports a `countOf`) — **a missing stat
reads 0, never `undefined`** (§1.1). `totalCards` comes from the DTO, not from a client-side sum.

Skeleton shape matches the content exactly: the tile grid keeps its `grid-cols-2 lg:grid-cols-4`
container in both branches, so nothing reflows when data lands.

### 5.4 `CardsPage.tsx`

Modelled on `HistoryPage.tsx`. Filters rendered **outside** the loading/error branch so the bar never
disappears mid-typing.

- Filters: search (`useDebouncedValue`, matches `lotNumber`), `cardStat` select, plan select
  (`useSubscriptionPlans({ active: true })`), a flag select (all / disabled / revoked). Every change
  calls `setPage(1)`.
- `DataTable` columns: Key · Plan · Lot · Status · Flags · Delivered.
- **The Key cell renders `dto.key` verbatim, with `—` when `null`.** No slicing, no masking, no
  conditional on `cardStat` in the component. If a component ever needs to decide what to show, the
  server got it wrong. A `CopyButton` (already shared) is rendered **only** when `key !== null` and
  the stat is in the full tier — never on a 4-char prefix, which is not a copyable value.
- `renderMobileRow`: plan + status on line 1, key (or `—`) + lot on line 2, delivered date on line 3.
- Empty states: no-filters → "no cards yet" + link to `/portal/requests`; with-filters → "no match"
  + a clear-filters Button. Both via `EmptyState`, the `HistoryPage` two-variant pattern.
- `isLoading` → `TableSkeleton rows={10} columns={6}`; `isError` → `NotFoundState` + retry.
- `SimplePagination` below.

### 5.5 `OrdersPage.tsx`

Simplest page in the set — reuses `OrderDTO`/`OrderDetailDTO` unchanged (§0.2).

- Filters: search (order number / receiver name), `orderStat` select, date range.
- Columns: Order № · Lots · Cards · Status · Order price · Delivery price · Created · Completed.
  Money through `formatDZD`. These are the distributor's own costs, not activator commission.
- Row click → `MyOrderDetailDrawer`, showing the receiver block, delivery company/type, and the lot
  breakdown from `OrderDetailDTO.lots`. **No card keys exist anywhere in these DTOs** — verified
  §0.2 — so this page has no key surface at all.
- Same skeleton / empty / error / pagination treatment as §5.4.

### 5.6 `ActivationsPage.tsx`

- Filters: search (client name / phone — placeholder must say so, since key search is intentionally
  absent), `state` select, `cardStat` select, plan select, date range, sort select
  (Newest / Oldest / Recently completed) mapping to `sortBy` + `sortDir`. **Server-side** — no
  in-component `.sort()`.
- Columns: Client · Phone (`tel:` link, as `HistoryPage` does) · Plan · Key · Status · Requested ·
  Duration (`formatDuration` from `lib/duration.ts`).
- Row click → `MyActivationDetailDrawer`: client block, card chain (key per the gate, lot, plan),
  timing, and `statusHistory` rendered as a simple vertical timeline of `StatusBadge` + timestamp.
- The drawer must contain **no** account-field section, **no** activator name and **no** money — the
  three things §4.1 removes. Worth a comment in the component.
- Skeleton / empty / error / pagination as above.

### 5.7 Services, hooks, query keys

| Layer | Additions |
|---|---|
| `services/distributors.service.ts` | `getMyDashboard(signal)` |
| `services/cards.service.ts` | `getMine(query, signal)`, `getMineById(id, signal)` |
| `services/orders.service.ts` | `getMine(query, signal)`, `getMineById(id, signal)` |
| `services/activations.service.ts` | `getOnMyCards(query, signal)`, `getOnMyCardsById(id, signal)` |
| `hooks/` | `useDistributorDashboard`, `useMyCards`, `useMyCard`, `useMyOrders`, `useMyOrder`, `useMyCardActivations`, `useMyCardActivation` |
| `lib/query-keys.ts` | `distributors.myDashboard()`; `cards.mineAll()/mine(q)/mineDetail(id)`; `orders.mineAll()/mine(q)/mineDetail(id)`; `activations.onMyCardsAll()/onMyCards(q)/onMyCardsDetail(id)` |

All services go through the one axios instance and build paths with `apiPath` + `withParams` from
contract constants. All queries are read-only — **no mutation hook is added in this set**, so there
is no invalidation matrix to extend beyond §5.8.

Detail hooks take `enabled: !!id`, matching `useCard`.

### 5.8 Realtime

**No new event, no new payload, no contract event change.** The distributor namespace listener
([realtime.ts:194-207](Apps/web/src/lib/realtime.ts#L194-L207)) gains invalidations only:

```ts
socket.on("connect", () => {                      // existing handler, extended
  …existing two…
  queryClient.invalidateQueries({ queryKey: qk.distributors.myDashboard() });
  queryClient.invalidateQueries({ queryKey: qk.cards.mineAll() });
  queryClient.invalidateQueries({ queryKey: qk.orders.mineAll() });
});

socket.on("order-request:status-changed", () => {  // existing handler, extended
  …existing…
  // A linked order reaching DELIVERED assigns cards to this distributor and moves every
  // dashboard count — the same transaction (order.service.ts:274) that propagates this event.
  queryClient.invalidateQueries({ queryKey: qk.orders.mineAll() });
  queryClient.invalidateQueries({ queryKey: qk.cards.mineAll() });
  queryClient.invalidateQueries({ queryKey: qk.distributors.myDashboard() });
});
```

⚠️ **Known gap, accepted:** `activation:status-changed` is emitted to `/client` only, so a
distributor's activation list does **not** move live when a client's activation progresses. Adding a
distributor fan-out means a new gateway route and a payload carrying a card id — new event surface,
which Set 7's scope (contract/api/web, no schema) does not call for. The list refetches on mount and
on socket reconnect. Recorded for a later set. **Q6.**

### 5.9 Translation keys

~72 new keys under `distributor.*`, flat dot-notation, `{ en, fr, ar }` with **`ar: ""` present on
every key**. No inline string in any new JSX.

```
distributor.nav.cards | .orders | .activations
distributor.dashboard.title | .subtitle
distributor.dashboard.totalCards | .atDistributor | .inActivation | .activated
distributor.dashboard.disabled | .revoked | .byStatusTitle
distributor.dashboard.emptyTitle | .emptyBody | .goToRequests
distributor.cards.title
distributor.cards.filters.searchPlaceholder | .statPlaceholder | .planPlaceholder | .flagPlaceholder
distributor.cards.filters.flagAll | .flagDisabled | .flagRevoked
distributor.cards.table.key | .plan | .lot | .status | .flags | .delivered
distributor.cards.keyHidden                    (the "—" cell's aria-label / tooltip)
distributor.cards.empty.noCards | .noMatch
distributor.orders.title
distributor.orders.filters.searchPlaceholder | .statePlaceholder | .dateFrom | .dateTo
distributor.orders.table.number | .lots | .cards | .status | .price | .delivery | .created | .completed
distributor.orders.detail.title | .receiver | .deliveryCompany | .deliveryType | .lots
distributor.orders.empty.noOrders | .noMatch
distributor.activations.title
distributor.activations.filters.searchPlaceholder | .statePlaceholder | .cardStatPlaceholder
distributor.activations.filters.sortNewest | .sortOldest | .sortCompleted
distributor.activations.table.client | .phone | .plan | .key | .status | .requested | .duration
distributor.activations.detail.title | .client | .card | .timing | .history
distributor.activations.empty.noActivations | .noMatch
```

Reused as-is: `common.actions.*`, `common.errors.*`, `enums.cardStat.*`, `enums.orderStat.*`,
`enums.activationStat.*`, `activator.history.pageOf` (used by `SimplePagination`).

---

## 6. Reuse versus new

### Reused unchanged — no edit at all

| Layer | Asset |
|---|---|
| Contract | `paginated()`, `PaginationMetaSchema`, `ApiResponse`, `ClientBlockSchema`, **`OrderResponseSchema` / `OrderDetailResponseSchema` / `PaginatedOrdersSchema`**, `CardStat`, `ActivationStat`, `OrderStat` |
| Backend | `buildPaginationMeta`, `toSkipTake`, `sendSuccess`, `requireAuth`, `validateRequest`, `NotFoundError` / `ForbiddenError`, `composeSubscriptionLabel`, `OrderMapper` **in full**, `durationSeconds()` |
| Frontend | `StatCard`, `StatCardSkeleton`, `TableSkeleton`, `DataTable`, `SimplePagination`, `EmptyState`, `NotFoundState`, `PageHeader`, `StatusBadge`, `CopyButton`, `useDebouncedValue`, `useSubscriptionPlans`, `formatDZD`, `formatDateTime`, `formatDuration`, `countOf`, `DistributorLayout` / `Sidebar` / `Header`, `RoleGuard`, `ROLE_HOME`, `apiPath` / `withParams`, the axios instance, `queryClient` |
| Patterns | `ACTIVATOR_ROUTES.MY_STATS` (aggregated self-scoped endpoint) · `getMine` route+controller+service shape from Sets 4/5 · `HistoryPage.tsx` page composition · `OrderDetailDrawer` detail pattern |

**Orders are the headline reuse: one contract route constant + one service method + one controller
method, and zero new DTOs, schemas or mappers.**

### New, and exactly why

| New artefact | Why it cannot be reused or derived |
|---|---|
| `DistributorDashboardDTO` | `InventorySummaryDTO` is business-wide (sets + lots + cards) and its endpoint is unscoped + adminOnly. Widening it is R18's documented anti-pattern (§0.5). The `[{stat,count}]` **shape** is copied; the DTO and endpoint are not. |
| `DistributorCardDTO` + `toDistributorDTO` + `distributorVisibleKey` | `CardDTO.key` is a required `z.string()` and `CardMapper.toDTO` emits it unconditionally. No derivation can make a required field conditional without starting from the entity shape — contract-rules §3.5. The three-tier gate has no existing equivalent anywhere. |
| `DistributorActivationDTO` / `…DetailDTO` | `AdminActivationDTO` carries `activatorFullName` + `activationPrice`; `ActivationDetailDTO` carries `submittedInformation` + `timeline[].wrongFields` (the client's credentials, opened to admin by D3 only) + `financial`. Three forbidden surfaces; a subtraction-based derivation would re-leak on the next field added upstream. |
| `GetDistributorActivationsQuerySchema` | `GetActivationsQuery` has `key`, `activatorId` and `distributorId`. The first defeats the key gate (§4.2), the second exposes what §4.1 hides, the third overrides principal scoping. All three must be *absent*, not ignored. |
| `resolveDistributorScope` in `common/auth/` | The helper is private and duplicated in two modules; six copies after this set. §3.1. |
| Four page components + ~8 section components + 7 hooks + 8 service functions | No distributor equivalents exist — `pages/distributor/` holds only the Set 1 shell and the Set 4/5 request pages. |
| `distributor.nav.cards/orders/activations` + ~69 more translation keys | New copy. |

### Explicitly **not** reused, and why that is deliberate

- **`maskKey()`** (`activation.mapper.ts`) — a *tail* mask that publishes the key's exact length,
  built for the activator pending-pool. §2.3 uses a fixed-length *head* prefix for a different
  audience and threat model. Two masks, on purpose. A comment in each must say so.
- **`HistoryPage`'s client-side sort** — a documented workaround for a contract gap Set 7 does not
  reproduce (§4.2).
- **Set 5's `findUnique` + post-fetch owner check** — replaced by `findFirst` with the predicate in
  the `where` (§3.3 rule 1).

---

## 7. Set 5 key reconciliation (U4)

One key-visibility policy across the portal. All three items call `distributorVisibleKey` (§2.3).

### 7.1 `RevocableCardDTO.cardKey` — no change, add a binding comment

`getEligible()`'s own `where` pins `cardStat: ACTIVATION_FAILED`, which §2.2 places in the full-key
tier. Already compliant. Add to the DTO:

```ts
// Full key, and that is correct under the Set 7 policy: this query returns ACTIVATION_FAILED
// cards only, which distributorVisibleKey() puts in the full tier. If this query's cardStat
// predicate ever widens, route this field through distributorVisibleKey().
cardKey: z.string(),
```

### 7.2 `CardRevocationRequestDTO.cardKey` — the real fix

The request row outlives the card's state. On approval the card returns to `AT_DISTRIBUTOR`,
`isRevoked: true`, `isActive: true` — **back in sellable stock** (§0.6) — while the historical row
keeps serving its full key to the distributor.

```ts
// nullable: the DISTRIBUTOR path gates this through distributorVisibleKey(), so an approved
// revocation (card back at AT_DISTRIBUTOR and re-sellable) stops publishing a live key.
// The ADMIN path is unchanged and always receives the full key.
cardKey: z.string().nullable(),
```

Mapper — **two methods, no audience flag.** A boolean/enum "audience" parameter defaults wrong
exactly once and leaks; two named methods cannot:

```ts
// card-revocation-request.mapper.ts
static toDTO(row, joins): CardRevocationRequestDTO      // ADMIN — cardKey: joins.card.key (as today)
static toMineDTO(row, joins): CardRevocationRequestDTO  // DISTRIBUTOR — cardKey: distributorVisibleKey(...)
```

Requires `joins.card` to also select `cardStat` (today it selects `key` + plan only). `getMine()`
switches to `toMineDTO`; `getAll()` and `getById()` (both adminOnly) keep `toDTO`.

Frontend: `MyRevocationRequestsTable.tsx`'s card cell renders `—` on `null`. The admin
`RevocationRequestsTable.tsx` is untouched.

### 7.3 `cardKey` on the socket payload — strip it for the distributor room

`revocation-request:status-changed` currently emits the whole payload, `cardKey` included, to
`rooms.distributor(...)`. The precedent for a per-room field strip already exists two handlers up —
`activation:resolved` drops `activatorId` before emitting
([gateway:92-99](Apps/api/src/common/realtime/realtime-gateway.ts#L92-L99)), and
`activation:client-updated` does the same at [:78-85](Apps/api/src/common/realtime/realtime-gateway.ts#L78-L85):

```ts
eventBus.on('revocation-request:status-changed', (p) =>
  safe(() => {
    adminNs.to(rooms.ADMIN_BELL).emit('revocation-request:status-changed', p);
    // The distributor's own room never receives key material: by the time this fires the card
    // may be back at AT_DISTRIBUTOR and re-sellable (Set 7 §2.2). Nothing on the client reads
    // cardKey — the listener only invalidates — so this is a pure removal.
    const { cardKey: _cardKey, ...forDistributor } = p;
    distributorNs.to(rooms.distributor(p.distributorId)).emit('revocation-request:status-changed', forDistributor);
  }, 'revocation-request:status-changed'),
);
```

⚠️ **This needs a contract decision, because `ServerToClientEvents` types the handler as taking the
full payload.** Two options, and the execution session must pick one and say which:

- **(a) Make `cardKey` optional** on `RevocationRequestStatusChangedPayloadSchema`
  (`z.string().optional()`). One-line contract change; the emit above type-checks; the admin path
  still always sets it. Trips **R12** (`exactOptionalPropertyTypes`), so the strip must be a rest
  destructure as written above, never `cardKey: undefined`.
- **(b) Add a second, narrower socket event type** for the distributor namespace. Cleaner typing,
  but a new event name for what is the same event, and a second `socket.on` on the web side.

**Recommend (a)** — smaller, and it matches how `activation:resolved` already types a narrower
server-to-client shape than its bus payload.

`revocation-request:created` is **not** changed: it goes to `ADMIN_BELL` only, and at emit time the
card is `ACTIVATION_FAILED` (full tier) regardless.

---

## 8. Files

### `Apps/contract`

| File | Change |
|---|---|
| `modules/distributor/distributor.routes.ts` | `+ MY_DASHBOARD` |
| `modules/distributor/distributor.dtos.ts` | `+ DistributorDashboardResponseSchema` (imports `CardStat`) |
| `modules/card/card.routes.ts` | `+ GET_MINE`, `+ GET_MINE_BY_ID` |
| `modules/card/card.dtos.ts` | `+ DistributorCardResponseSchema`, `+ PaginatedDistributorCardsSchema` |
| `modules/card/card.query.ts` | `+ GetDistributorCardsQuerySchema` |
| `modules/order/order.routes.ts` | `+ GET_MINE`, `+ GET_MINE_BY_ID` |
| `modules/order/order.query.ts` | `+ GetMyOrdersQuerySchema` (no `distributorId`) |
| `modules/activation/activation.routes.ts` | `+ GET_ON_MY_CARDS`, `+ GET_ON_MY_CARDS_BY_ID` |
| `modules/activation/activation.dtos.ts` | `+ DistributorActivationResponseSchema`, `+ …DetailResponseSchema`, `+ PaginatedDistributorActivationsSchema` |
| `modules/activation/activation.query.ts` | `+ GetDistributorActivationsQuerySchema`, `+ DistributorActivationIdParamsSchema` |
| `modules/card-revocation-request/card-revocation-request.dtos.ts` | `cardKey` → `.nullable()` (§7.2); comment on `RevocableCardDTO` (§7.1) |
| `modules/card-revocation-request/card-revocation-request.events.ts` | `cardKey` → `.optional()` on the status-changed payload (§7.3, option a) |

No new contract module. No barrel file is added; each module's existing `index.ts` already
`export *`s the touched files.

### `Apps/api`

| File | Change |
|---|---|
| `common/auth/distributor-scope.ts` | **new** — `resolveDistributorScope` |
| `common/realtime/realtime-gateway.ts` | strip `cardKey` for the distributor room (§7.3) |
| `modules/distributor/{interface,service,controller,routes,mapper}.ts` | `+ myDashboard` through all five |
| `modules/card/card.mapper.ts` | `+ distributorVisibleKey`, `+ toDistributorDTO`, `+ DistributorCardJoins` |
| `modules/card/{interface,service,controller,routes}.ts` | `+ getMine`, `+ getMineById` |
| `modules/order/{interface,service,controller,routes}.ts` | `+ getMine`, `+ getMineById` — **mapper untouched** |
| `modules/activation/activation.mapper.ts` | `+ toDistributorActivationDTO`, `+ toDistributorActivationDetailDTO` |
| `modules/activation/{interface,service,controller,routes}.ts` | `+ getOnMyCards`, `+ getOnMyCardsById` |
| `modules/card-revocation-request/card-revocation-request.mapper.ts` | `+ toMineDTO` (§7.2) |
| `modules/card-revocation-request/card-revocation-request.service.ts` | `getMine` → `toMineDTO`; select `cardStat` |

`modules/index.ts` is **not** touched — every new route hangs off an already-mounted router.

### `Apps/web`

| File | Change |
|---|---|
| `config/nav-links.ts` | 3 new `DISTRIBUTOR_NAV_LINKS` entries; `Ban` icon for revocations |
| `config/translations.json` | ~72 new keys |
| `App.tsx` | 3 lazy imports + 3 route objects |
| `lib/query-keys.ts` | 10 new keys |
| `lib/realtime.ts` | 4 invalidations in the distributor listener |
| `services/{distributors,cards,orders,activations}.service.ts` | 7 new functions |
| `hooks/useDistributorDashboard.ts` | **new** |
| `hooks/{useCards,useOrders,useAdminActivations→…}` | new hooks (new file `useMyCardActivations.ts` rather than widening `useAdminActivations.ts`) |
| `pages/distributor/PortalPage.tsx` | rewritten — dashboard |
| `pages/distributor/{CardsPage,OrdersPage,ActivationsPage}.tsx` | **new** |
| `pages/distributor/components/` | `CardsByStatusGrid`, `MyCardsTable`, `MyCardsFilters`, `MyOrdersTable`, `MyOrdersFilters`, `MyOrderDetailDrawer`, `MyActivationsTable`, `MyActivationsFilters`, `MyActivationDetailDrawer` — **new** |
| `pages/distributor/components/MyRevocationRequestsTable.tsx` | null-safe `cardKey` cell (§7.2) |

**Migration: none.** No `schema.prisma` change, no new index, no seed change.

**Frozen tests that will break** (expected, not fixed — CLAUDE.md): the two conformance suites (any
contract change), `Apps/api/test/integration/{card,order,activation,distributor,card-revocation-request}.spec.ts`
(new routes + the nullable `cardKey`), `Apps/api/test/integration/realtime/gateway.spec.ts` (§7.3),
`Apps/web/tests/unit/pages/client-portal/*` and the distributor request page tests. Listed in the
execution report; not touched.

---

## 9. Build order

1. **Contract** — routes → query → dtos, per module. `tsc --noEmit` + `madge --circular src` after,
   because §1.1 adds a `distributor → card` edge.
2. **Backend** — `common/auth/distributor-scope.ts` first, then per module
   mapper → interface → service → controller → routes. §7 last, as one commit-sized unit.
3. **Frontend** — query-keys → services → hooks → components → pages → nav/routes → translations →
   realtime.

Definition of done (CLAUDE.md): `npx tsc --noEmit` clean in contract, api and web; eslint clean in
all three (⚠️ `Apps/api` still has **no eslint config** — pre-existing, first flagged in Set 1);
`npx madge --circular src` clean in `Apps/contract`; no migration; `git status` shows no test file
changed; no magic strings.

**Two extra Set-7-specific DoD greps:**

```bash
# 1. The key gate is the only key expression on a distributor path.
grep -n "card.key\|\.key," Apps/api/src/modules/card/card.service.ts
#    -> every hit inside getMine/getMineById must be a toDistributorDTO argument

# 2. No admin mapper is reachable from a distributor route.
grep -n "toDTO\|toDetailDTO" Apps/api/src/modules/card/card.service.ts
#    -> zero hits inside getMine / getMineById
```

---

## 10. Open questions

| # | Question | My position |
|---|---|---|
| **Q1** | §0's U1⇄U2 reconciliation: `AT_DISTRIBUTOR` carries **no** key material at all — not even a server-side masked tail — because `version-2-description.md` manual test 2 says so explicitly. Confirm that overrides the "masked tail" answer for the locked tier. | Spec wins. Locked = absent. §2.5 covers identification. |
| **Q2** | Should the dashboard also show open order requests / in-delivery orders? The scope says "card counts by status **only**", so I have not added them, but the portal home is thin without them. | Honour the scope as written. Add in a later set if it reads empty in practice. |
| **Q3** | Distributor routes use bare `requireAuth`, so a **disabled** distributor keeps read access until their JWT expires. `requireAuth({ checkDB: true })` would close it. Pre-existing across Sets 4/5. | Out of scope for Set 7 — it is a cross-cutting auth change. Worth its own item in Set 13. |
| **Q4** | Extract `resolveDistributorScope` for new code only (my plan, per R9), or also swap the two identical Set 4/5 private copies? | New code only. The swap touches two frozen integration tests for zero behaviour change. |
| **Q5** | `page: z.coerce.number().max(100)` caps every list at page 100. Present in all eight existing query schemas. Match it (my plan) or drop the cap on the three new ones? | Match. One new schema diverging is worse than a consistent quirk; fix all eight together in Set 13. |
| **Q6** | The distributor's activation list does not update live (§5.8) — `activation:status-changed` reaches `/client` only. Accept, or add a distributor fan-out in this set? | Accept. A fan-out is new event surface and belongs with the realtime work, not the portal build. |
| **Q7** | §7.3 option (a) — make `cardKey` `.optional()` on the socket payload — versus (b) a second narrower event type. | (a). Smaller, and `activation:taken` already establishes "narrower on the wire than on the bus". |

---

## 11. Manual test checklist

Run against a distributor account with delivered cards in **several** states. Set one card to each of
`AT_DISTRIBUTOR`, `ACTIVATION_PROGRESS`, `ACTIVATED`, `ACTIVATION_FAILED` first.

**Key visibility — the core of this set. Read the NETWORK tab, not the UI.**

1. Open `/portal/cards`. In DevTools → Network → the `GET /cards/mine` response: an
   **`AT_DISTRIBUTOR`** card's object has `"key": null`. Not a masked string. Not a prefix. `null`.
2. Same response: an **`ACTIVATION_PROGRESS`** card's `key` is exactly **4 real characters** followed
   by the fixed mask. Compare against the card's true key in the admin card list — the first 4 match
   and nothing after them does.
3. Same response: an **`ACTIVATED`** card and an **`ACTIVATION_FAILED`** card each carry the **full**
   key, byte-identical to the admin list.
4. In the UI: the `AT_DISTRIBUTOR` row shows `—` in the Key column and **no copy button**. The
   `ACTIVATION_PROGRESS` row shows the prefix and **no copy button**. The `ACTIVATED` row shows the
   full key **with** a copy button that copies the whole key.
5. Revoke the `ACTIVATION_FAILED` card as an admin (it returns to `AT_DISTRIBUTOR`), then reload
   `/portal/cards`: that card's `key` is now **`null`** in the response. The key re-locked.
6. Same card, `/portal/revocations`: its historical request row's `cardKey` is **`null`** in the
   `GET /card-revocation-requests/mine` response and `—` in the table. As **admin**, the same request
   in `/admin/distributors/revocation-requests` still shows the full key.
7. Filter `/portal/cards` to Status = `AT_DISTRIBUTOR` and page through **every** page. No response
   on any page contains a non-null `key`.

**Scoping — use curl with distributor A's token against distributor B's ids.**

8. `GET /cards/mine/{B's card id}` → **404**, not 403, not 200.
9. `GET /orders/mine/{B's order id}` → **404**.
10. `GET /activations/on-my-cards/{B's activation id}` → **404**.
11. `GET /distributors/me/dashboard` as A: `totalCards` equals
    `SELECT count(*) FROM "Card" WHERE "distributorId"=A AND "deletedAt" IS NULL`, and each
    `cardsByStat` entry matches `GROUP BY "cardStat"` on the same predicate. Statuses with zero cards
    are **absent** from the array, not present with `0`.
12. As an **ADMIN** token: `GET /cards/mine` → **403**. As an **ACTIVATOR** token: → **403**.
13. `GET /cards/mine?distributorId={B}` — the parameter is not in the schema, so it is stripped;
    the response still contains only A's cards.

**Activations list.**

14. Search a client's **full name** → matches. Search their **phone** → matches. Search a **card key**
    (full, from an `ACTIVATED` card) → **no results**. Key search is intentionally absent.
15. Combine state + card-status + plan + date range → all four narrow together; the result count
    drops monotonically as filters are added.
16. Go to page 3, then change a filter → the list returns to **page 1** with the filter applied and
    the pagination control reflects the new total. Nothing is stuck on an empty page 3.
17. Sort Newest → Oldest → Recently-completed: the order changes **and** a new network request fires
    each time (server-side sort, not a client re-sort of the same page).
18. Open an activation detail drawer. It shows client name/phone, plan, key, status, timing and the
    status history — and contains **no** username/password/OTP/birthday, **no** activator name, and
    **no** price, earning or commission figure anywhere.

**Orders, dashboard, layout.**

19. `/portal/orders` lists only A's orders. Open a detail drawer: receiver, delivery company, lots and
    card counts are present; **no card key appears anywhere** in the drawer or in the response.
20. `/portal` dashboard: the four headline numbers agree with the status grid, and the grid agrees
    with `/portal/cards` filtered to each status in turn.
21. Throttle the network to Slow 3G and reload each of the four pages: the sidebar, header,
    `PageHeader` and the filter bar stay on screen while skeletons occupy the content area. Nothing
    reflows or jumps when the data lands.
22. Stop the API and reload each page: an error state renders **inside** the content area with a retry
    button. The layout never disappears and there is no redirect.
23. A brand-new distributor with zero cards: dashboard shows the empty state with a link to
    `/portal/requests`; each list page shows its own no-data empty state (not the no-match one).
24. Apply filters that match nothing: the **no-match** empty state appears **with** a clear-filters
    button, and clicking it restores the full list at page 1.
25. Resize to mobile (375 px): all four pages render card rows rather than a horizontally scrolling
    table; the sidebar collapses into the sheet menu and all six nav entries are reachable.
26. Toggle EN ⇄ FR on every page including both detail drawers: no English string survives in FR, and
    no raw key (`distributor.cards.table.key`) is ever rendered.
27. Sign in as an **activator** and navigate to `/portal/cards` → redirected to `/dashboard`. Sign in
    as an **admin** → redirected to `/admin`.

**Realtime.**

28. With `/portal/cards` open in one window, as admin move one of A's orders to `DELIVERED` in
    another. Within a second or two A's card list and dashboard counts update **without a manual
    reload** (the `order-request:status-changed` invalidation).
29. Open DevTools → Network → WS. Approve a revocation request for A. Inspect the
    `revocation-request:status-changed` frame delivered to A: it has **no `cardKey` field at all**.
    The same frame on the admin namespace still has it.
