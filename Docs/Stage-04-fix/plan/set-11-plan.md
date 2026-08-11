# Set 11 — Admin revenue dashboard & charts

**Depends on:** 9 · **Touches:** prisma (indexes only), contract, api, web · **Migration: yes — see §3.4.**
**Status:** PLAN ONLY — no code written in this session.
**Date:** 2026-08-10 · **Branch:** `version-02-01` · **Tree at:** `552f8d9` + the uncommitted Set 10 working tree.

**Inputs read:** `.claude/CLAUDE.md`, `Docs/Stage-04-fix/plan/v2-decisions.md` (D9, A3, R6, R7, R10, R15),
`Docs/Stage-04-fix/plan/set-9-plan.md` (§0.3 the Decimal rule, §1.2 indexes),
`Docs/Stage-01-Contract/contract-rules.md`, `Docs/Stage-02-Backend/back-end-rules.md`,
`Docs/Stage-03-Frontend/front-end-rules.md`,
`Docs/Stage-04-fix/new-features-fixes/version-2-description.md` (§ Set 11).

> **Tree note.** The working tree carries uncommitted Set 10 changes (activation-email pool). Every
> line number below was read from that working tree, plus a live query against the local dev DB
> (`localhost:5432/setvision_test`). Set 9 has already landed: `Activation.activationCost` exists at
> [`schema.prisma:522`](Apps/api/prisma/schema.prisma#L522) and every row carries it.

---

## Decisions taken by the user in this planning session

| # | Question | Decision |
|---|---|---|
| **U1** | Cash IN cannot be keyed to a subscription plan — `Order.orderPrice` is one number per order, and an order links N lots each with its own `Lot.subscriptionPlanId`. | **Pro-rata allocation by `Lot.nbOfCards`.** Each order's price is split across its lots' plans weighted by card count. Exact for single-plan orders (all of them today). §2.2. |
| **U2** | Cash IN and cash OUT reach a wilaya by different paths — `Order.wilayaId` (delivery destination) vs `Distributor.wilayaId`. They differ for **5 of the 6 live orders**. | **`Distributor.wilayaId` for both terms.** `net` per wilaya is then arithmetically valid, and the axis matches the existing choropleth. `Order.wilayaId` is never used by this set. §2.3. |
| **U3** | What happens to the existing `overview.revenueOverTime`, which sums `activationPrice` in JS floats and calls it "revenue"? | **Leave the endpoint and DTO untouched; relabel the chart only** (R6). New `cashIn`/`cashOut`/`net` fields are added alongside, never redefining an existing field. §7.3. |

---

## 0. Audit

### 0.1 What `OrderStat` values orders actually reach, and whether `completedAt` is reliable

**The state machine** ([`order.service.ts:38-41`](Apps/api/src/modules/order/order.service.ts#L38-L41)):

```
PENDING_DELIVERY → IN_DELIVERY → { DELIVERED | RETURNED }
```

`DELIVERED` and `RETURNED` are terminal. There is no path out of either, and no writer of `Order.orderStat` anywhere in `Apps/api/src` outside `OrderService`.

| `orderStat` | Reached by | `completedAt` |
|---|---|---|
| `PENDING_DELIVERY` | `create()` [`:236`](Apps/api/src/modules/order/order.service.ts#L236) | **null** |
| `IN_DELIVERY` | `transition()` [`:330`](Apps/api/src/modules/order/order.service.ts#L330) | **null** — this branch does not write it |
| `DELIVERED` | `transition()` [`:341`](Apps/api/src/modules/order/order.service.ts#L341) | **set to `now`** |
| `RETURNED` | `transition()` [`:361`](Apps/api/src/modules/order/order.service.ts#L361) | **set to `now`** |

**Live DB, `setvision_test`:**

```
 orderStat | count | with_completed |           min           |           max
-----------+-------+----------------+-------------------------+-------------------------
 DELIVERED |     6 |              6 | 2026-07-22 07:33:37.586 | 2026-08-10 08:25:10.897
```

Only `DELIVERED` exists today, and 6/6 carry `completedAt` — but that is because
[`load-mock-data.ts:311-312`](Apps/api/scripts/load-mock-data.ts#L311-L312) writes `orderStat: DELIVERED`
and a `completedAt` **directly**, bypassing `transition()`. The seed proves nothing about the runtime
paths; the source above does.

**Verdict on A3 (cash in): the anchor is correct, and the state filter is mandatory.**
`Order.completedAt` alone is **not** a sufficient predicate — it is set on `RETURNED` as well, and a
returned order is money that came back. The predicate is:

```
orderStat = 'DELIVERED' AND completedAt IS NOT NULL AND completedAt BETWEEN from AND to
```

The `IS NOT NULL` is redundant against the range comparison but is written anyway so the intent
survives a later edit to the range handling.

**Do not copy `ordersSummary`.** [`statistics.service.ts:148`](Apps/api/src/modules/statistics/statistics.service.ts#L148)
sums `orderPrice` over **every** order with **no** state filter and **no** date anchor at all. That
field is not cash in and Set 11 does not reuse it (R6).

### 0.2 Activation completion — the cash-out side

`Activation.completedAt` is written on **every terminal outcome**, not only successes:
`activate()`, `activateByAdmin()`, `cancel()`, `release()`, `cancelByAdmin()` all stamp it.

**Live DB:**

```
     activationStat     | count | with_completed | with_price | with_cost
------------------------+-------+----------------+------------+-----------
 ACTIVATED              |    11 |             11 |         11 |        11
 ACTIVATED_BY_ADMIN     |     2 |              2 |          2 |         2
 CANCELLED_BY_ACTIVATOR |     7 |              2 |          0 |         7
 CANCELLED_BY_ADMIN     |     7 |              4 |          0 |         7
 FREEZE                 |     5 |              0 |          0 |         5
 PROCESSING             |     5 |              0 |          0 |         5
 WRONG_INFORMATION      |     3 |              0 |          0 |         3
 ADDITIONAL_INFORMATION |     3 |              0 |          0 |         3
```

11 cancelled rows carry a non-null `completedAt`. Anchoring on `completedAt` alone would sweep them in.

**Verdict on A3 (cash out): the anchor is correct, and the state filter is mandatory.**
All 13 completed rows have `completedAt`, so the anchor is total over the population that matters.
The predicate reuses the module's existing constant, `COMPLETED_STATS`
([`statistics.service.ts:24`](Apps/api/src/modules/statistics/statistics.service.ts#L24)).

**Nullability (R10).** `activationPrice` is `Decimal?` and is written with the conditional spread
`...(price && { activationPrice: price })`, so an activation whose elapsed time matched no commission
tier completes with `activationPrice = null`. `activationCost` is `Decimal? @default(0)`. Both terms
are `COALESCE(…, 0)`. Never `SUM(a + b)` — a null in either operand nulls the whole row.

### 0.3 Current reference totals (the number manual test 1 must reproduce)

```sql
SELECT sum("orderPrice") FROM "Order" WHERE "orderStat"='DELIVERED';                       -- 18848.00
SELECT sum(COALESCE("activationCost",0)), sum(COALESCE("activationPrice",0))
  FROM "Activation" WHERE "activationStat" IN ('ACTIVATED','ACTIVATED_BY_ADMIN');           --  0.00 | 7194.00
```

⇒ all-time `cashIn = 18 848.00`, `cashOut = 7 194.00`, `net = 11 654.00`.

**`activationCost` is 0 on every row and `SubscriptionPlanCost` is empty (0 rows).** Set 9 shipped the
column with a `@default(0)` backfill but nobody has configured a plan cost, and
[`load-mock-data.ts`](Apps/api/scripts/load-mock-data.ts) was not updated (Set 9 §7 Q3, R15). **The
cost half of the ledger will be a flat zero line until that is fixed** — see Q2.

### 0.4 The existing statistics module

| Layer | File | Shape |
|---|---|---|
| contract routes | [`statistics.routes.ts`](Apps/contract/src/modules/statistics/statistics.routes.ts) | 9 constants under `BASE: '/statistics'`; the static `WILAYA_HEATMAP` is deliberately registered before the param route `WILAYA_DRILLDOWN` |
| contract query | [`statistics.query.ts`](Apps/contract/src/modules/statistics/statistics.query.ts) | `StatisticsPeriodSchema` = `z.enum([...7 string literals])`; `StatisticsOverviewQuerySchema { period, dateFrom?, dateTo?, subscriptionPlanId?, wilayaId? }` |
| contract dtos | [`statistics.dtos.ts`](Apps/contract/src/modules/statistics/statistics.dtos.ts) | 9 response schemas. Money is `z.number()`, dates `z.iso.datetime()`, enum arrays use `z.enum(NativeEnum)` (e.g. `:35`) |
| time helper | [`statistics.time.ts`](Apps/api/src/modules/statistics/statistics.time.ts) | `todayStart/weekStart/monthStart/yearStart`, `bucketDate`, `resolvePeriod`. **A 6th file in the module** — precedent that a module may carry a pure helper beside the 5-file pattern |
| service | [`statistics.service.ts`](Apps/api/src/modules/statistics/statistics.service.ts) | 483 lines, `constructor(prisma)`, `Promise.all` fan-out per endpoint |
| mapper | [`statistics.mapper.ts`](Apps/api/src/modules/statistics/statistics.mapper.ts) | `Raw*` input types with a `DecimalLike = { toFixed(n): string }`, every method ends in `Schema.parse(...)`, money via `Number(d.toFixed(2))` |
| routes | [`statistics.routes.ts`](Apps/api/src/modules/statistics/statistics.routes.ts) | module-level `const service = new StatisticsService(prisma)`, `adminOnly` on all 9 |
| web page | [`StatisticsPage.tsx`](Apps/web/src/pages/admin/statistics/StatisticsPage.tsx) | 150 lines, **no tabs today**; filter bar + a 2-col chart grid + the heatmap card + the drilldown sheet |
| web charts | [`statistics/components/`](Apps/web/src/pages/admin/statistics/components/) | 6 recharts components + `WilayaHeatmap` (inline SVG over `wilaya-geometry.ts`) + `heatmap-color-scale.ts` |

**The wilaya choropleth.** [`WilayaHeatmap.tsx`](Apps/web/src/pages/admin/statistics/components/WilayaHeatmap.tsx)
renders inline SVG paths from `wilaya-geometry.ts`, coloured by
[`heatmap-color-scale.ts`](Apps/web/src/pages/admin/statistics/components/heatmap-color-scale.ts) in one of
three modes (`activations` / `cancellations` / `duration`), all **unsigned** scales. It is typed to
`WilayaHeatmapDTO`. **Set 11 does not touch it** — see §6.4 for why.

### 0.5 Two patterns in the existing module that Set 11 must NOT copy

1. **`overview()` fetches rows and aggregates in JS.**
   [`:224-283`](Apps/api/src/modules/statistics/statistics.service.ts#L224-L283) pulls every completed
   activation in the range into memory and loops. Money is accumulated as a **JS float**
   (`revenueMap.set(key, (revenueMap.get(key) ?? 0) + price)`, [`:257-258`](Apps/api/src/modules/statistics/statistics.service.ts#L257-L258)),
   then smuggled through the mapper's `DecimalLike` port as a hand-rolled `{ toFixed }` object
   ([`:295`](Apps/api/src/modules/statistics/statistics.service.ts#L295)). This violates both the Set 11
   execute prompt ("aggregate in the database, never fetch rows to sum them in JS") and R7.
   **Per U3 it stays as-is** — but no new code imitates it.
2. **Series are built only from buckets that have data.** `sortedKeys(revenueMap)` yields present keys
   only, so empty periods are **holes**, not zeros — exactly the defect manual test 2 targets.

### 0.6 Raw SQL — there is none in this codebase

```
$ grep -rn "queryRaw\|\$executeRaw\|Prisma.sql" Apps/api/src Apps/api/scripts
(no matches)
```

Set 11 introduces the first. §3.1 justifies it, bounds it, and sets the convention.

### 0.7 The Decimal rule, carried over verbatim from Set 9 §0.3 (U1/R7)

> Money is `Prisma.Decimal` in the database and in every calculation, comparison and aggregation.
> It becomes a JS number **only** at the mapper boundary, via `Number(d.toFixed(2))`, and is
> `z.number()` in the DTO. Inbound money is `z.number().nonnegative().multipleOf(0.01)` in the
> command and is converted with `new Prisma.Decimal(cmd.x)` **before** it touches Prisma.
> No service, no aggregation and no comparison ever operates on the JS number.

**Set 11 has no inbound money at all** (every endpoint is a read), so only the outbound half applies.
Three consequences, each load-bearing:

- Every sum, every subtraction, every pro-rata multiplication happens in Postgres `NUMERIC`.
  Postgres `NUMERIC` is exact decimal arithmetic — no float exists at any point.
- `net` is **returned as its own SQL column** (`cash_in - cash_out`), never computed as
  `dto.cashIn - dto.cashOut` in the service, the mapper, the hook, or a chart tooltip.
- `$queryRaw` deserializes Postgres `NUMERIC` to `Prisma.Decimal`, so the raw row types declare
  `Decimal`, and the mapper's existing `DecimalLike` port accepts them unchanged.

---

## 1. The revenue formula, over named fields, with its anchor per term

> This is the definition of the set. Every number on every chart is this formula under a different
> `WHERE` clause. The **anchor** is the timestamp that decides which bucket a term falls into — change
> it and every point moves.

### 1.1 Cash in

```
cashIn(from, to)  =  Σ  Order.orderPrice

  ANCHOR   Order.completedAt        ∈ [from, to]      ← the moment of delivery
  FILTER   Order.orderStat          =  DELIVERED
  EXCLUDED Order.deliverPrice       — never summed, in any endpoint, in any dimension
```

- **`Order.orderPrice`** is `Decimal @db.Decimal(12,2)`, **NOT NULL** — no `COALESCE` on the column.
  The aggregate itself is coalesced (`COALESCE(SUM(...), 0)`) because `SUM` over zero rows is `NULL`.
- **Why `completedAt` and not `createdAt`:** the money is in when the cards are delivered. Anchoring on
  `createdAt` would book revenue into a period in which the order may still have been in transit, and a
  `PENDING_DELIVERY` order would be absent from the chart, then retroactively appear in a **past**
  bucket on delivery — silently rewriting history the admin already looked at.
- **Why the `DELIVERED` filter is not optional:** `completedAt` is stamped on `RETURNED` too (§0.1).
  Without the filter, returned orders count as revenue.

### 1.2 Cash out

```
cashOut(from, to) =  Σ ( COALESCE(Activation.activationCost, 0)
                       + COALESCE(Activation.activationPrice, 0) )

  ANCHOR   Activation.completedAt   ∈ [from, to]      ← the moment of successful activation
  FILTER   Activation.activationStat ∈ (ACTIVATED, ACTIVATED_BY_ADMIN)
```

- **`activationPrice`** — the activator's commission. Confirmed as a **business cost, not a sale
  price**, by three independent proofs in v2-decisions §10: its source is `computeCommission()`, the
  same value increments `Activator.totalEarning` **and** `Activator.credits` in the same transaction,
  and the activator-facing DTO calls it `earning`.
- **`activationCost`** — the plan's cost, stamped at completion by Set 9 from `SubscriptionPlanCost`.
  A historical snapshot; never recomputed.
- **Both are `COALESCE`d** (R10). `activationPrice` is genuinely null when no commission tier matched.
- **Why the stat filter is not optional:** 11 of the 24 cancelled/removed rows in the live DB carry a
  non-null `completedAt` (§0.2).
- **Not summed:** `Activator.totalEarning`, `Activator.credits`, `Payment.totalAmount`. `credits` and
  `totalEarning` are running balances derived from `activationPrice`; summing them alongside would
  double-count. `Payment` is the *settlement* of a cost already booked at activation time — booking it
  again on payout would double-count the same commission.

### 1.3 Net

```
net(from, to) = cashIn(from, to) − cashOut(from, to)
```

Computed as a `NUMERIC` expression **inside the same SQL statement** that produces the two terms, and
returned as a third column. Never subtracted in TypeScript.

### 1.4 The anchor asymmetry, stated plainly

The two terms are anchored on **different tables' different clocks**, and they are not correlated:

- An order delivered in June whose cards are activated in September books **cash in** in June and
  **cash out** in September.
- A period's `net` is therefore **not** the margin on that period's orders. It is the cash movement
  within the window. There is no attempt in this set to match a card's activation back to the order
  that delivered it.
- Consequence for the chart: early periods can show a large positive net (deliveries, no activations
  yet) and later periods a negative net (activations against long-delivered stock). **This is correct
  and expected**, and the Revenue tab carries a one-line note saying so
  (`admin.revenue.anchorNote`, §7.5).

### 1.5 Dimension keys

| Dimension | Cash-in key | Cash-out key |
|---|---|---|
| **plan** | `Lot.subscriptionPlanId` via `Order → OrderLot → Lot`, **pro-rata by `Lot.nbOfCards`** (U1, §2.2) | `Card.subscriptionPlanId` via `Activation → Card` — exact, one row one plan |
| **wilaya** | `Distributor.wilayaId` via `Order → Distributor` (U2) | `Distributor.wilayaId` via `Activation → Card → Distributor` — matches the existing choropleth |
| **distributor** | `Order.distributorId` — exact | `Card.distributorId` via `Activation → Card` |

`Order.wilayaId` (the delivery destination) is **not used by this set**. It differs from the
distributor's wilaya for 5 of the 6 live orders; mixing the two would make per-wilaya `net` a
subtraction of unrelated quantities (U2).

---

## 2. Endpoints

Three routes. **The breakdown is one parameterized endpoint covering three dimensions**, not three
narrow endpoints — that is the "few parameterized endpoints" answer.

### 2.1 Contract additions

**`Apps/contract/src/modules/statistics/statistics.routes.ts`** — three statics, registered
**before** the existing param route `WILAYA_DRILLDOWN`:

```ts
export const STATISTICS_ROUTES = {
  …
  REVENUE_SUMMARY:   '/revenue/summary',
  REVENUE_SERIES:    '/revenue/series',
  REVENUE_BREAKDOWN: '/revenue/breakdown',
  WILAYA_DRILLDOWN:  '/wilaya/:wilayaId',   // stays last
} as const;
```

**`Apps/contract/src/modules/statistics/statistics.enums.ts`** — a **new file** (the module has none
today; contract-rules §5A puts fixed value sets here). These are **native TS enums**, not
`z.enum([...string literals])`, deliberately: the literal-array form is why
[`StatisticsFilterBar.tsx:14-25`](Apps/web/src/pages/admin/statistics/components/StatisticsFilterBar.tsx#L14-L25)
had to re-declare the period list locally with an apologetic comment. A native enum gives the frontend
a runtime object to iterate. `z.enum(NativeEnum)` is the Zod-4 form already used at
[`statistics.dtos.ts:35`](Apps/contract/src/modules/statistics/statistics.dtos.ts#L35).

```ts
export enum RevenueGranularity { DAY = 'day', WEEK = 'week', MONTH = 'month' }
export enum RevenueDimension  { PLAN = 'plan', WILAYA = 'wilaya', DISTRIBUTOR = 'distributor' }
export enum RevenueSort       { CASH_IN = 'cashIn', CASH_OUT = 'cashOut', NET = 'net' }

// Sentinel key for breakdown rows whose dimension value is null — an activation on a card with no
// distributor, or an order lot with no plan. Such rows still carry money, so they get a bucket
// rather than being dropped: Σ rows + others must always equal the summary total.
// The frontend renders `admin.revenue.breakdown.unattributed` for this key (no server-side copy).
export const REVENUE_UNATTRIBUTED_KEY = '__unattributed__';
```

Add `export * from './statistics.enums';` to the module barrel.

**`Apps/contract/src/modules/statistics/statistics.query.ts`** — one shared shape, three schemas.
Written as an object spread rather than `.extend()` chains so the files stay obviously logic-free:

```ts
// Range + filters shared by all three revenue endpoints. `period` and the two date fields are the
// SAME contract as StatisticsOverviewQuerySchema, so one filter bar drives both tabs.
const revenueRangeShape = {
  period:             StatisticsPeriodSchema,
  dateFrom:           z.iso.datetime().optional(),
  dateTo:             z.iso.datetime().optional(),
  subscriptionPlanId: z.uuid().optional(),
  wilayaId:           z.uuid().optional(),
};

export const RevenueSummaryQuerySchema = z.object({ ...revenueRangeShape });
export type RevenueSummaryQuery = z.infer<typeof RevenueSummaryQuerySchema>;

export const RevenueSeriesQuerySchema = z.object({
  ...revenueRangeShape,
  granularity: z.enum(RevenueGranularity).default(RevenueGranularity.DAY),
});
export type RevenueSeriesQuery = z.infer<typeof RevenueSeriesQuerySchema>;

export const RevenueBreakdownQuerySchema = z.object({
  ...revenueRangeShape,
  dimension: z.enum(RevenueDimension),
  sort:      z.enum(RevenueSort).default(RevenueSort.CASH_IN),
  limit:     z.coerce.number().int().min(1).max(50).default(10),
});
export type RevenueBreakdownQuery = z.infer<typeof RevenueBreakdownQuerySchema>;
```

`z.coerce` on `limit` because it arrives as a query string; the `validateRequest` middleware writes the
coerced result to `req.validated.query`, which the controller reads (back-end-rules §7A).

**`Apps/contract/src/modules/statistics/statistics.dtos.ts`** — appended, nothing existing modified:

```ts
// Every money field here is a JS number ONLY at the wire (Set 9 §0.3). `net` is produced by the
// database as its own column; it is never cashIn - cashOut in TypeScript.
export const RevenueTotalsSchema = z.object({
  cashIn:  z.number(),
  cashOut: z.number(),
  net:     z.number(),
});
export type RevenueTotalsDTO = z.infer<typeof RevenueTotalsSchema>;

export const RevenueSummaryResponseSchema = z.object({
  range:    z.object({ from: z.iso.datetime(), to: z.iso.datetime() }),
  current:  RevenueTotalsSchema,
  previous: RevenueTotalsSchema,     // same-length window ending at `from` — drives the KPI trend
  cashOutSplit: z.object({
    activationCost:  z.number(),
    activationPrice: z.number(),
  }),
  deliveredOrders:      z.number().int(),
  completedActivations: z.number().int(),
});
export type RevenueSummaryDTO = z.infer<typeof RevenueSummaryResponseSchema>;

export const RevenueSeriesResponseSchema = z.object({
  granularity: z.enum(RevenueGranularity),
  // Zero-filled server-side: every bucket in [from, to] is present, missing ones are 0. Never a hole.
  points: z.array(
    z.object({
      bucketStart: z.iso.datetime(),
      cashIn:  z.number(),
      cashOut: z.number(),
      net:     z.number(),
    }),
  ),
});
export type RevenueSeriesDTO = z.infer<typeof RevenueSeriesResponseSchema>;

export const RevenueBreakdownRowSchema = z.object({
  // z.string(), NOT z.uuid() — REVENUE_UNATTRIBUTED_KEY is a valid value here.
  key:     z.string(),
  label:   z.string(),
  cashIn:  z.number(),
  cashOut: z.number(),
  net:     z.number(),
});

export const RevenueBreakdownResponseSchema = z.object({
  dimension: z.enum(RevenueDimension),
  rows:      z.array(RevenueBreakdownRowSchema),   // top `limit` by `sort`
  others:    RevenueTotalsSchema,                  // everything below the cut, so the view reconciles
  totals:    RevenueTotalsSchema,                  // == RevenueSummaryDTO.current for the same query
});
export type RevenueBreakdownDTO = z.infer<typeof RevenueBreakdownResponseSchema>;
```

**Reconciliation invariant, guaranteed by construction and asserted by manual test 3:**

```
Σ series.points[].cashIn   ==  summary.current.cashIn
Σ breakdown.rows[].cashIn  +  breakdown.others.cashIn  ==  breakdown.totals.cashIn
breakdown.totals           ==  summary.current                    (same query params)
```

…in `NUMERIC`. Each output number is independently rounded to 2 dp at the mapper boundary, so a sum of
*displayed* rows can differ from the *displayed* total by cents on the plan dimension (the only one
that allocates fractions). Documented, not fixed — fixing it would mean distributing rounding
residue, which invents money.

### 2.2 Cash-in pro-rata allocation (U1)

`Order.orderPrice` is one number covering a basket of lots. `lotIds` is `.nonempty()`
([`order.command.ts:6`](Apps/contract/src/modules/order/order.command.ts#L6)) so every order has ≥1 lot,
and nothing constrains those lots to a single plan.

```
share(order, lot) = Lot.nbOfCards / Σ Lot.nbOfCards over that order's lots
allocated(lot)    = Order.orderPrice × share(order, lot)
```

Three edge cases, all handled in SQL:

| Case | Why it happens | Handling |
|---|---|---|
| Every lot in an order has `nbOfCards = 0` | `Lot.nbOfCards` is `Int @default(0)` ([`schema.prisma:392`](Apps/api/prisma/schema.prisma#L392)) and a lot can exist before cards are attached | Denominator is 0 → fall back to an **equal split across the order's lots**. Shares still sum to 1. |
| An order with no `OrderLot` rows | Should be impossible (`.nonempty()`), but a cascade or a manual delete could produce it | **LEFT JOIN**, so the order survives with `plan_id = NULL` → the `REVENUE_UNATTRIBUTED_KEY` bucket. The money is never silently dropped. |
| Fractional cents | Any multi-lot order with an uneven card split | **No per-row rounding.** Full `NUMERIC` precision is carried through the aggregation; rounding happens once, at the mapper. |

**The allocation is used only where a plan is involved** — the `dimension='plan'` breakdown and any
query carrying a `subscriptionPlanId` filter. Summary and series **without** a plan filter sum
`orderPrice` once per order, which is exact and free of allocation drift. Both expressions agree in
`NUMERIC` because the shares partition the price exactly.

### 2.3 Endpoint table

| Route | Method | Guard | Query schema | Response DTO | Answers |
|---|---|---|---|---|---|
| `GET /statistics/revenue/summary` | GET | `adminOnly` | `RevenueSummaryQuerySchema` | `RevenueSummaryDTO` | "What did we take in, pay out and net this period, and how does that compare to the period before?" |
| `GET /statistics/revenue/series` | GET | `adminOnly` | `RevenueSeriesQuerySchema` | `RevenueSeriesDTO` | "How is that trending, bucketed by day / week / month, with no gaps?" |
| `GET /statistics/revenue/breakdown` | GET | `adminOnly` | `RevenueBreakdownQuerySchema` | `RevenueBreakdownDTO` | "Which plans / wilayas / distributors drive it?" |

`adminOnly = requireAuth({ roles: [UserRole.ADMIN] })` — identical to the module's other 9 routes.
The module has no widened guard; **revenue must never reach an activator or a distributor.**

---

## 3. Aggregation strategy

### 3.1 Why raw SQL, and how it is bounded

**Prisma's query builder cannot express any of the three endpoints.** Specifically:

| Requirement | Why `groupBy` / `aggregate` fails |
|---|---|
| Bucket by day/week/month | `groupBy` groups by **scalar columns only**. There is no `DATE_TRUNC` expression. |
| Zero-fill empty buckets | Requires `generate_series` LEFT JOINed to the aggregate. No Prisma equivalent. |
| Group cash out by plan / wilaya / distributor | Those keys live on `Card` and `Distributor`, **not on `Activation`**. `groupBy` cannot group by a relation's column. |
| Pro-rata plan allocation | Needs a window function (`SUM(...) OVER (PARTITION BY order)`). |
| `SUM(cost + price)` in one pass | `aggregate._sum` sums columns independently; the coalesced two-column sum has to be an expression. |

The only Prisma-expressible alternative is `findMany` + a JS loop — which is precisely the pattern the
Set 11 execute prompt bans and which §0.5 documents as the existing module's defect.

**⇒ All three revenue endpoints use `prisma.$queryRaw`.** This is the first raw SQL in the codebase, so
the plan sets the convention:

1. **`$queryRaw` tagged template only. `$queryRawUnsafe` is banned** — it must not appear in the diff.
2. **Zero string concatenation into SQL text.** Every variable part is a **bound parameter**:
   - Range bounds → `${from}::timestamptz`, `${to}::timestamptz`
   - The `DATE_TRUNC` unit → `date_trunc(${unit}, …)`. `date_trunc(text, timestamp)` takes its unit as
     a **text argument**, so it binds. It is never spliced into the SQL string.
   - The `generate_series` step → `${step}::interval`. Same reasoning.
   - The timezone → `AT TIME ZONE ${REPORTING_TZ}`. `timezone(text, timestamptz)` — also an argument.
   - The dimension → **not interpolated at all.** The dimension selects which of three pre-written
     `Prisma.sql` fragments to compose (§3.3), keyed off the *validated enum*. No user-supplied string
     reaches the query in any form.
3. **Enum literals come from the Prisma client enums**, bound as parameters
   (`${PrismaOrderStat.DELIVERED}::"OrderStat"`), never typed as `'DELIVERED'` in the SQL text —
   no magic strings (CLAUDE.md).
4. **Home:** a new module-local file **`Apps/api/src/modules/statistics/statistics.revenue.sql.ts`**,
   exporting `Prisma.sql` fragment builders and the raw row types. `statistics.time.ts` is the
   precedent for a pure helper file beside the 5-file module pattern. The service composes fragments
   and calls `$queryRaw`; it contains no SQL text of its own.
5. **Result typing:**
   - `NUMERIC` → `Prisma.Decimal`. Raw row types declare `Decimal`, and the mapper's existing
     `DecimalLike` port accepts them with no change.
   - `COUNT(*)` returns **bigint**, which Prisma deserializes to a JS `BigInt` and which `z.number()`
     will reject. **Every count is cast `::int` in SQL.** (Live counts are far below 2³¹.)
   - Timestamps → JS `Date`, `.toISOString()`d in the mapper like every other date in the module.

### 3.2 Per-endpoint strategy

| Endpoint | Statements | Shape |
|---|---|---|
| **summary** | **2** `$queryRaw`, one `Promise.all` | One statement returns the current window's `cash_in`, `cash_out`, `net`, `activation_cost`, `activation_price`, `delivered_orders::int`, `completed_activations::int`. The second is the **same statement with shifted bounds** for `previous`. Two CTEs (`cash_in`, `cash_out`) `FULL OUTER JOIN`ed on a constant, or simply two scalar subselects in one `SELECT` — the latter is simpler and is what the plan specifies. |
| **series** | **1** `$queryRaw` | `buckets` (from `generate_series`) `LEFT JOIN` `in_by_bucket` `LEFT JOIN` `out_by_bucket`, `COALESCE(...,0)` on both, `net` computed in the select list. Zero-filled by construction. |
| **breakdown** | **1** `$queryRaw` | `keys` (the union of both sides' dimension keys) `LEFT JOIN` `in_by_key` `LEFT JOIN` `out_by_key`, ordered by the `sort` column desc, with `LIMIT ${limit}`. **A second statement is not used for `others`/`totals`** — they come from window aggregates (`SUM(...) OVER ()`) in the same statement, so they cannot drift from the rows. |

Total: **4 SQL round-trips for the whole Revenue tab** (summary ×2, series ×1, breakdown ×1), versus
the existing overview tab's one query that materialises every completed activation in the range.

### 3.3 SQL sketch (the shape the implementation must produce)

```sql
-- ── shared fragments, composed by dimension ────────────────────────────────
-- cash IN, one row per order (no plan dimension / no plan filter)
WITH cash_in AS (
  SELECT o.id, o."completedAt" AS at, o."distributorId" AS distributor_id,
         d."wilayaId" AS wilaya_id, o."orderPrice" AS amount
  FROM "Order" o
  JOIN "Distributor" d ON d.id = o."distributorId"
  WHERE o."orderStat"   = ${PrismaOrderStat.DELIVERED}::"OrderStat"
    AND o."completedAt" IS NOT NULL
    AND o."completedAt" BETWEEN ${from}::timestamptz AND ${to}::timestamptz
),

-- cash IN, allocated across plans (plan dimension OR subscriptionPlanId filter) — §2.2
cash_in_alloc AS (
  SELECT o.id, o."completedAt" AS at, o."distributorId" AS distributor_id,
         d."wilayaId" AS wilaya_id, l."subscriptionPlanId" AS plan_id,
         CASE WHEN SUM(GREATEST(COALESCE(l."nbOfCards",0),0))
                     OVER (PARTITION BY o.id) > 0
              THEN o."orderPrice" * GREATEST(COALESCE(l."nbOfCards",0),0)::numeric
                   / SUM(GREATEST(COALESCE(l."nbOfCards",0),0))
                       OVER (PARTITION BY o.id)
              ELSE o."orderPrice" / COUNT(*) OVER (PARTITION BY o.id)
         END AS amount
  FROM "Order" o
  JOIN "Distributor" d ON d.id = o."distributorId"
  LEFT JOIN "OrderLot" ol ON ol."orderId" = o.id      -- LEFT: a lot-less order keeps its money
  LEFT JOIN "Lot"      l  ON l.id = ol."lotId"
  WHERE o."orderStat"   = ${PrismaOrderStat.DELIVERED}::"OrderStat"
    AND o."completedAt" BETWEEN ${from}::timestamptz AND ${to}::timestamptz
),

-- cash OUT, one row per completed activation
cash_out AS (
  SELECT a.id, a."completedAt" AS at, c."distributorId" AS distributor_id,
         d."wilayaId" AS wilaya_id, c."subscriptionPlanId" AS plan_id,
         COALESCE(a."activationCost", 0) AS cost,
         COALESCE(a."activationPrice", 0) AS price,
         COALESCE(a."activationCost", 0) + COALESCE(a."activationPrice", 0) AS amount
  FROM "Activation" a
  JOIN "Card" c ON c.id = a."cardId"
  LEFT JOIN "Distributor" d ON d.id = c."distributorId"   -- LEFT: card may have no distributor
  WHERE a."activationStat" = ANY(${COMPLETED_STATS}::"ActivationStat"[])
    AND a."completedAt" IS NOT NULL
    AND a."completedAt" BETWEEN ${from}::timestamptz AND ${to}::timestamptz
)

-- ── series ─────────────────────────────────────────────────────────────────
, buckets AS (
  SELECT gs AS bucket_start
  FROM generate_series(
    date_trunc(${unit}, ${from}::timestamptz AT TIME ZONE ${REPORTING_TZ}),
    date_trunc(${unit}, ${to}::timestamptz   AT TIME ZONE ${REPORTING_TZ}),
    ${step}::interval
  ) gs
)
SELECT (b.bucket_start AT TIME ZONE ${REPORTING_TZ})       AS bucket_start,
       COALESCE(i.amount, 0)                               AS cash_in,
       COALESCE(o.amount, 0)                               AS cash_out,
       COALESCE(i.amount, 0) - COALESCE(o.amount, 0)       AS net
FROM buckets b
LEFT JOIN (SELECT date_trunc(${unit}, at AT TIME ZONE ${REPORTING_TZ}) k,
                  SUM(amount) amount FROM cash_in  GROUP BY 1) i ON i.k = b.bucket_start
LEFT JOIN (SELECT date_trunc(${unit}, at AT TIME ZONE ${REPORTING_TZ}) k,
                  SUM(amount) amount FROM cash_out GROUP BY 1) o ON o.k = b.bucket_start
ORDER BY b.bucket_start;
```

Note the `AT TIME ZONE` round trip: `timestamptz AT TIME ZONE 'Africa/Algiers'` yields a local
`timestamp` (so `date_trunc` cuts at Algiers midnight); applying `AT TIME ZONE` again to that
`timestamp` converts it back to the `timestamptz` instant that Prisma hands back as a `Date`. §4.2.

### 3.4 Indexes — this set has a migration

Two composite indexes. Both are pure additions; no column, table or constraint changes.

```prisma
model Order {
  …
  @@index([distributorId])
  @@index([orderStat])
  @@index([wilayaId])
  @@index([deliveryCompanyId])
  @@index([createdAt])
+ // Set 11 (D9): the cash-in predicate is `orderStat = DELIVERED AND completedAt BETWEEN …`.
+ // Equality column first, range column second — the only ordering a btree can serve as a range scan.
+ // There is no index on completedAt at all today.
+ @@index([orderStat, completedAt])
}

model Activation {
  …
  @@index([activationStat])
  @@index([completedAt])
+ // Set 11 (D9): the cash-out predicate is `activationStat IN (2) AND completedAt BETWEEN …`.
+ // The two single-column indexes above force a bitmap-AND or an index scan plus a filter; this one
+ // serves the whole predicate. It also covers the existing COMPLETED_STATS + completedAt reads in
+ // dashboard() / activationsSummary() / overview().
+ @@index([activationStat, completedAt])
}
```

**Not added, and why:**
- `OrderLot` already has `@@index([orderId])`; `Lot` has `@@index([subscriptionPlanId])` — the
  allocation join is covered.
- `Card` already has `@@index([distributorId])` and `@@index([subscriptionPlanId])` — both cash-out
  dimension joins are covered.
- Nothing on `activationCost` / `activationPrice` / `orderPrice`. They are only ever `SUM()` **output**
  columns, never predicates — the same reasoning Set 9 §1.2 gave for declining an index there. That
  conclusion still holds; **these two indexes are about the `WHERE` clause, which Set 9 did not own**,
  so this is an addition to Set 9's analysis, not a contradiction of it.

**Migration name: `add_revenue_aggregation_indexes`** →
`npx prisma migrate dev --name add_revenue_aggregation_indexes`.
Contents: two `CREATE INDEX` statements. Non-destructive, no reseed required.

> **Deviation from the set header.** `version-2-description.md` § Set 11 says "Touches: contract, api,
> web" and lists no migration. Index-only, so no data risk — but it is a `schema.prisma` change and a
> migration file, and CLAUDE.md's definition of done requires the migration to be named in the report.
> See Q1.

---

## 4. Zero-filling, timezone, date-range defaults

### 4.1 Zero-filling empty periods

Done **server-side, in SQL**, via `generate_series` LEFT JOINed to the aggregates (§3.3). The frontend
receives a complete, contiguous, ordered array and does no gap-filling of its own.

- Every bucket in `[date_trunc(from), date_trunc(to)]` is present.
- A bucket with no orders and no activations is `{ cashIn: 0, cashOut: 0, net: 0 }` — **zero, never
  null, never absent**. `z.number()` (not `.nullable()`) enforces it at the contract boundary.
- A range with no data at all yields an array of all-zero points, **not** an empty array. The chart
  therefore renders a flat line at 0 rather than an empty state (manual test 4 checks this
  distinction, and §6.2 says which state the UI shows when).
- **Partial edge buckets:** if `from` is 2026-08-10 14:00, the first bucket is 2026-08-10 00:00 and
  contains only 14:00-onward data. Standard for period-anchored charts; the tooltip shows the bucket
  start date so it is legible.
- **Bucket-count cap.** `custom` + `day` over a decade would generate thousands of points. The service
  computes the bucket count before querying and throws `BadRequestError('Date range too wide for this
  granularity — choose a coarser granularity')` above **400** buckets. 400 covers a full year of days
  and a decade of months.

### 4.2 Timezone

**Reporting timezone is `Africa/Algiers`** — the same one
[`statistics.time.ts:3-4`](Apps/api/src/modules/statistics/statistics.time.ts#L3-L4) already assumes,
where it is hard-coded as a constant `UTC+1, no DST`.

- Add `export const REPORTING_TZ = 'Africa/Algiers';` to `statistics.time.ts` and pass it into SQL as
  a **bound parameter**. This is the single source; the string never appears anywhere else.
- **In SQL, use `AT TIME ZONE ${REPORTING_TZ}`, not the `+1h` constant.** Postgres resolves it against
  tzdata, which is authoritative. The two agree today (Algeria has been permanently UTC+1 since 1981,
  no DST) and will keep agreeing; if that ever changes, the SQL is right and the JS helper becomes the
  thing to fix. Mixing a hand-rolled offset into new code would bake the assumption in twice.
- **Day boundaries are Algiers midnight, not UTC midnight.** Without the conversion, an activation
  completed at 00:30 Algiers lands in the previous day's column — an hour of every day misfiled.
- **Week boundaries agree.** Postgres `date_trunc('week', …)` is ISO — Monday-start — which is exactly
  what [`statistics.time.ts:21`](Apps/api/src/modules/statistics/statistics.time.ts#L21) computes with
  `(getUTCDay() + 6) % 7`. No reconciliation needed.
- **Month boundaries** are Algiers-local first-of-month, consistent with `monthStart()`.
- `bucketStart` crosses the wire as a **UTC ISO instant** (`z.iso.datetime()`), like every other date
  in the module. The frontend formats it with `Intl.DateTimeFormat`, matching
  [`RevenueOverTimeChart.tsx:27-30`](Apps/web/src/pages/admin/statistics/components/RevenueOverTimeChart.tsx#L27-L30).
  Because the instant is Algiers-midnight, a viewer in another timezone sees the neighbouring date —
  accepted: this is an internal admin tool for an Algerian business, and the same is already true of
  every existing chart.

### 4.3 Date-range defaults

- **Range resolution reuses `resolvePeriod(period, dateFrom, dateTo)` verbatim.** No new range logic.
- **`resolvePeriod`'s `bucket` return value is discarded** by all three revenue endpoints. It only
  knows `'day' | 'week'` and is derived from the span; the revenue endpoints take `granularity`
  explicitly from the query so the user's toggle is authoritative. State this in a comment at the call
  site or a future reader will assume the toggle is ignored.
- **`period` default:** the query schema requires it (matching `StatisticsOverviewQuerySchema`); the
  **page** defaults it to `this_month`, the same `useState("this_month")` the statistics page already
  uses ([`StatisticsPage.tsx:26`](Apps/web/src/pages/admin/statistics/StatisticsPage.tsx#L26)) — and
  because the filter bar is shared, both tabs are always on the same period.
- **`granularity` default:** `RevenueGranularity.DAY`, defaulted in the schema so a bare request works.
  The UI toggle also starts on Day. It is **not** auto-derived from the period — a silently changing
  bucket size is worse than a wrong-but-visible one, and the user can see and change the toggle.
- **`custom` with a missing `dateFrom`** falls back to `todayStart()` inside `resolvePeriod`
  ([`statistics.time.ts:67`](Apps/api/src/modules/statistics/statistics.time.ts#L67)) — a pre-existing
  quirk, inherited unchanged, not fixed here.
- **`previous` window** (summary only): the same-length window ending at `from`, i.e.
  `[from − (to − from), from)`. Half-open at the top so a boundary row is never counted twice.

---

## 5. Charts — which chart answers which question

Recharts only. **No new library.** `recharts` is already a dependency and is sanctioned by
front-end-rules §6A.

| # | Question the admin is asking | Visual | Recharts | Component |
|---|---|---|---|---|
| 1 | "What did we take in, pay out and net this period — and is that better or worse than last period?" | 3 KPI tiles with a period-over-period delta | none (reuses `StatCard`) | `RevenueKpiRow.tsx` |
| 2 | "How is that trending, and when did we cross into the red?" | Grouped bars for cash in / cash out with a net line overlaid, zero-filled | `ComposedChart` + 2×`Bar` + `Line` + `ReferenceLine y={0}` | `RevenueTrendChart.tsx` |
| 3 | "What is cash out actually made of — plan costs or activator commissions?" | One stacked horizontal bar | `BarChart layout="vertical"` + 2 stacked `Bar` | `CashOutSplitBar.tsx` |
| 4 | "Which plans / wilayas / distributors drive the number?" | Horizontal grouped bars with a dimension `Select` | `BarChart layout="vertical"` + 3×`Bar` | `RevenueBreakdownChart.tsx` |

Four visuals over three endpoints. #1 and #3 share the summary response; #4 owns the breakdown
endpoint and its dimension `Select` maps 1:1 to the endpoint's `dimension` param — one control, one
parameter, one component.

**Rules every chart follows:**

- **`<ResponsiveContainer width="100%" height={…}>`** — required. Manual test 6 checks narrow
  viewports; a fixed pixel width overflows the admin content column on a phone.
- **Money is never recomputed client-side.** `net` is plotted from `point.net`, never
  `point.cashIn - point.cashOut`. Tooltips and axis labels format the server's number — the execute
  prompt's "money is never a JS float, including chart tooltips and axis labels".
- **Y-axis formatting:** a new **`formatDZDCompact(amount, language)`** in `lib/utils.ts`, next to
  `formatDZD`, using `Intl.NumberFormat(LOCALE_TAG[language], { notation: 'compact' })` + `' DZD'`.
  `formatDZD` renders `18 848 DZD` per tick, which collides at narrow widths — the existing
  `RevenueOverTimeChart` has this bug at
  [`:73`](Apps/web/src/pages/admin/statistics/components/RevenueOverTimeChart.tsx#L73) and is left
  alone (out of scope). **Tooltips keep full `formatDZD`** — precision where it is read, compactness
  where it is scanned. See Q5.
- **Negative values.** `net` can be negative (§1.4). Y domain must include 0 (`domain={['auto','auto']}`
  plus an explicit `<ReferenceLine y={0} />`); bars below the axis are the correct rendering, not a
  bug to clamp.
- **Colours** follow the module's existing CSS-variable convention
  ([`RevenueOverTimeChart.tsx:79`](Apps/web/src/pages/admin/statistics/components/RevenueOverTimeChart.tsx#L79)
  uses `oklch(var(--success))`): cash in → `--success`, cash out → `--destructive`, net →
  `--primary`. All three are theme variables, so light and dark both work with no extra code.
- **X-axis density:** `interval="preserveStartEnd"` plus `minTickGap={24}` so a 90-day daily series
  thins its labels instead of overlapping them.
- **Long category labels** (store names, wilaya names) are why #3 and #4 use `layout="vertical"` —
  horizontal bars give the label a full-width gutter. `YAxis width` set explicitly, label truncated
  with a `tickFormatter`, full value in the tooltip.
- **`REVENUE_UNATTRIBUTED_KEY` rows** render `t("admin.revenue.breakdown.unattributed")` instead of
  `row.label`. The server sends an empty `label` for that row — no user-facing copy is ever produced
  by the backend (front-end-rules §6B).
- **Three states each**, as front-end-rules §4 requires: `isLoading → <ChartSkeleton />`,
  `isError → <NotFoundState>` + a retry `Button`, empty → `<EmptyState>`. The tab header, filter bar
  and tab strip stay mounted through all three.

**Explicitly NOT built (scope guard).** A net-revenue **choropleth** on the existing `WilayaHeatmap`.
It is tempting — the geometry and the component are right there — but it would require a **signed,
diverging** colour scale in
[`heatmap-color-scale.ts`](Apps/web/src/pages/admin/statistics/components/heatmap-color-scale.ts)
(all three current modes are unsigned), a fourth `HeatmapColorMode`, and a second DTO shape threaded
through a component that the frozen `tests/unit/pages/statistics` suite covers. The breakdown chart in
`wilaya` mode answers the same question with none of that. If the map is wanted, it is its own set.

---

## 6. How this coexists with the existing statistics page

### 6.1 Decision: **tabs on the existing `/admin/statistics` page.**

`StatisticsPage.tsx` gains a Radix `Tabs` shell with two tabs:

```
/admin/statistics
├── PageHeader                     (unchanged)
├── StatisticsFilterBar            (unchanged, HOISTED above the tabs — shared by both)
└── Tabs
    ├── "overview"  → OverviewTab.tsx   ← today's chart grid + heatmap + drilldown, moved verbatim
    └── "revenue"   → RevenueTab.tsx    ← new
```

**Why tabs and not a new page:**

1. **The filter bar is shared.** Period / plan / wilaya drive both tabs and are the *same* contract
   fields. A separate `/admin/revenue` route would duplicate the filter-bar wiring and force the admin
   to re-pick the period when switching between "how many activations" and "what did they cost" — the
   two questions you always ask together.
2. **Radix unmounts inactive `TabsContent`,** so the three revenue queries do not fire until the tab
   is opened. The existing Overview tab's load is completely unchanged. This is the same property
   `SettingsPage` already relies on (set-9-plan §0.2).
3. **`tabs.tsx` exists** in `components/ui/`, and `SettingsPage.tsx` is the in-repo precedent for a
   tabbed admin page — no new primitive, no new pattern.
4. **No routing work at all** — no `App.tsx` change, no new `nav-links.ts` entry, no `AdminGuard`
   wiring, no lazy-route registration.

**Why not simply append the revenue section below the heatmap** (the zero-restructure option): the
page already runs three queries and renders seven visuals; adding three queries and four more would
make every visit to `/admin/statistics` pay for revenue it may not want, and the page would scroll
past any reasonable length.

### 6.2 What changes in the existing files

| File | Change |
|---|---|
| `StatisticsPage.tsx` | Wrap in `Tabs`; **hoist** the filter-bar state (which is already all `useState` at the top) so both tabs read it; move the existing JSX body into `OverviewTab.tsx` and pass the filter state down as props. |
| `components/OverviewTab.tsx` | **New file, but not new code** — the current page body, lifted. The six chart components and the heatmap are imported and used with **byte-identical props**. |
| the 6 existing chart components + `WilayaHeatmap` + `heatmap-color-scale.ts` | **Not modified.** |
| `translations.json` → `admin.statistics.charts.revenueOverTime.title` | **Value** changed EN/FR to "Activator commissions over time" / "Commissions des activateurs dans le temps" (U3). The **key name is not renamed** — renaming it would touch the frozen statistics test for no gain. This is the whole of U3's "relabel". |

### 6.3 Frozen-test impact — call this out in the report

`Apps/web/tests/unit/pages/statistics` renders `StatisticsPage` and asserts on its current, un-tabbed
structure. **The tab restructure will break it.** This is expected and out of scope per R11 and the
CLAUDE.md freeze, but it is the one suite this set breaks *structurally* rather than through DTO
drift, so it must be named explicitly in the execution report rather than folded into "conformance
suites still red".

Mitigation that costs nothing: keep every chart component's file and props unchanged, so the damage is
confined to the page-shell test and the child-component tests stay green.

### 6.4 R6 — the legacy `totalRevenue` fields (U3)

Four existing DTO fields use the word "revenue" for something that is, under D9, cash **out** or an
unfiltered order sum:

| Field | Current meaning | Set 11 |
|---|---|---|
| `DashboardStatsDTO.totalRevenue` | `SUM(activationPrice)`, all time | untouched |
| `ActivationsSummaryDTO.totalRevenue` | `SUM(activationPrice)`, all time | untouched |
| `StatisticsOverviewDTO.revenueOverTime[].revenue` | `SUM(activationPrice)` per bucket, in JS floats | untouched; **chart title relabelled** |
| `OrdersSummaryDTO.totalRevenue` | `SUM(orderPrice)` over **all** orders, no state filter, no anchor | untouched |

**Nothing is renamed and nothing is redefined.** `cashIn` / `cashOut` / `net` are new, explicitly
named, and live in new DTOs. Add a short comment above each legacy field in `statistics.dtos.ts`
pointing at this document, so the next reader does not "unify" them.

### 6.5 Frontend wiring

**`services/statistics.service.ts`** += `revenueSummary(query, signal)`, `revenueSeries(query, signal)`,
`revenueBreakdown(query, signal)`. Each: `api.get<ApiResponse<T>>(apiPath(BASE, ROUTE), { params: query, signal })`
+ the file's existing defensive `if (!res.data.success) throw` line. `params` (not a hand-built query
string) so axios serialises and the optional filters drop out when undefined.

**`lib/query-keys.ts`** += under `qk.statistics`:
```ts
revenueSummary:   (q: RevenueSummaryQuery)   => ["statistics", "revenue", "summary", q] as const,
revenueSeries:    (q: RevenueSeriesQuery)    => ["statistics", "revenue", "series", q] as const,
revenueBreakdown: (q: RevenueBreakdownQuery) => ["statistics", "revenue", "breakdown", q] as const,
```
Query objects in the key, matching the existing `overview` / `wilayaHeatmap` convention at
[`query-keys.ts:173-176`](Apps/web/src/lib/query-keys.ts#L173-L176).

**`hooks/useStatistics.ts`** += `useRevenueSummary`, `useRevenueSeries`, `useRevenueBreakdown` — plain
`useQuery` wrappers, no mutations. The file's header comment ("statistics reads everything and touches
nothing, so no mutation hooks exist here") stays true.

**No component calls a service directly**, no `useEffect` fetches anything (front-end-rules §2).

### 6.6 Backend wiring

- **`statistics.interface.ts`** += the three method signatures.
- **`statistics.service.ts`** += three methods, each composing fragments from
  `statistics.revenue.sql.ts` and calling `$queryRaw`. `COMPLETED_STATS` is reused, not re-declared.
- **`statistics.mapper.ts`** += `toRevenueSummaryDTO`, `toRevenueSeriesDTO`, `toRevenueBreakdownDTO`,
  each taking a `Raw*` type whose money fields are `DecimalLike` and ending in `Schema.parse(...)`,
  exactly like the nine methods already there. Money via `Number(d.toFixed(2))`.
- **`statistics.controller.ts`** += three handlers, each `try { … sendSuccess(res, result) } catch (e) { next(e) }`,
  reading `req.validated.query`.
- **`statistics.routes.ts`** += three `GET`s with `adminOnly` + `validateRequest({ query: … })`,
  registered **before** `WILAYA_DRILLDOWN` so `/revenue/*` is never captured by `/wilaya/:wilayaId`.
  (`/revenue/...` would not actually match that pattern, but the file's existing comment at
  [`:42`](Apps/api/src/modules/statistics/statistics.routes.ts#L42) establishes statics-before-params
  as the house rule.)
- **No `console.*`**, no `res.status().json()` in the service, errors as `AppError` subclasses
  (`BadRequestError` for the bucket cap), every response through `sendSuccess`.

### 6.7 Translation keys

Flat `key → { en, fr, ar }` with `ar: ""` present on every key (front-end-rules §6B).

| Key | en | fr |
|---|---|---|
| `admin.statistics.tabs.overview` | Overview | Vue d'ensemble |
| `admin.statistics.tabs.revenue` | Revenue | Revenus |
| `admin.revenue.anchorNote` | Cash in is booked when an order is delivered; cash out when an activation completes. A period's net is cash movement, not the margin on that period's orders. | Les entrées sont comptabilisées à la livraison d'une commande, les sorties à l'achèvement d'une activation. Le net d'une période représente le mouvement de trésorerie, pas la marge des commandes de cette période. |
| `admin.revenue.kpi.cashIn` | Cash in | Entrées |
| `admin.revenue.kpi.cashOut` | Cash out | Sorties |
| `admin.revenue.kpi.net` | Net | Net |
| `admin.revenue.kpi.vsPrevious` | vs. previous period | vs. période précédente |
| `admin.revenue.granularity.label` | Granularity | Granularité |
| `admin.revenue.granularity.day` | Day | Jour |
| `admin.revenue.granularity.week` | Week | Semaine |
| `admin.revenue.granularity.month` | Month | Mois |
| `admin.revenue.trend.title` | Cash in / out over time | Entrées / sorties dans le temps |
| `admin.revenue.cashOutSplit.title` | What cash out is made of | Composition des sorties |
| `admin.revenue.cashOutSplit.activationCost` | Plan cost | Coût de la formule |
| `admin.revenue.cashOutSplit.activationPrice` | Activator commission | Commission activateur |
| `admin.revenue.breakdown.title` | Breakdown | Répartition |
| `admin.revenue.breakdown.dimension.plan` | By plan | Par formule |
| `admin.revenue.breakdown.dimension.wilaya` | By wilaya | Par wilaya |
| `admin.revenue.breakdown.dimension.distributor` | By distributor | Par distributeur |
| `admin.revenue.breakdown.unattributed` | Unattributed | Non attribué |
| `admin.revenue.breakdown.others` | Others | Autres |
| `admin.revenue.breakdown.planNote` | Order revenue is split across a plan pro-rata by cards in each lot. | Le revenu d'une commande est réparti entre les formules au prorata des cartes de chaque lot. |
| `admin.revenue.empty` | No revenue activity in this period. | Aucune activité de revenus sur cette période. |
| `admin.revenue.rangeTooWide` | That range is too wide for this granularity — choose a coarser one. | Cette plage est trop large pour cette granularité — choisissez-en une plus large. |

Changed values (key names unchanged): `admin.statistics.charts.revenueOverTime.title` → §6.2.
Reused unchanged: `common.actions.tryAgain`, `admin.dashboard.sectionError`,
`admin.dashboard.sectionErrorBody`, `admin.statistics.charts.empty`, `admin.statistics.period.*`,
`admin.statistics.filters.*`.

---

## 7. Open questions

| # | Question | My recommendation |
|---|---|---|
| **Q1** | The set header says "Touches: contract, api, web" and names no migration, but §3.4 adds two composite indexes — which means a `schema.prisma` change and a migration file. Proceed? | **Yes.** Index-only, non-destructive, no reseed. Without them the cash-in predicate has **no** usable index (`Order` has nothing on `completedAt` at all) and the cash-out predicate falls back to a bitmap-AND of two single-column indexes. Named in the report per CLAUDE.md. |
| **Q2** | **The cost half of the ledger is currently a flat zero.** `SubscriptionPlanCost` has 0 rows and all 13 completed activations carry `activationCost = 0` — Set 9's `@default(0)` backfill, and `load-mock-data.ts` was never updated (Set 9 §7 Q3, R15). The dashboard will be demonstrably correct but visually half-dead. | **Update `load-mock-data.ts`** as Set 9 §7 Q3 already proposed: seed one `SubscriptionPlanCost` per plan (one left deliberately unset) and stamp `activationCost` on seeded completed activations. It is the one file outside prisma/contract/api/web this touches, so **confirm before I write it**. Alternative if you'd rather not touch the seed: configure two plan costs by hand in `/admin/settings` and complete two fresh activations before running the manual checklist. |
| **Q3** | Is the **`previous`-period comparison** on the summary endpoint wanted? It doubles the summary's SQL round-trips (2 instead of 1) and adds a `previous` block to the DTO. | **Keep it.** `StatCard` already has a `trend` prop, and a revenue KPI without period-over-period context is close to useless. Cheap: the same statement with shifted bounds. Trivial to drop if you disagree — remove `previous` from the DTO and the second query. |
| **Q4** | `$queryRaw` is the **first raw SQL in this codebase** (§0.6). It is unavoidable (§3.1) and sanctioned by the execute prompt's "aggregate in the database", but it is a new pattern with new review surface. | **Proceed**, under the five rules in §3.1: tagged template only, `$queryRawUnsafe` banned, zero string concatenation, dimension chosen by fragment selection rather than interpolation, enum literals bound from the Prisma client enums. |
| **Q5** | `formatDZDCompact` is a new export in `lib/utils.ts`. CLAUDE.md warns against god-utils, and `utils.ts` is already a grab-bag. | **Put it beside `formatDZD`** rather than in a new module — it is four lines and belongs with its sibling. If you'd rather split money formatting out, `lib/money.ts` with both functions re-exported from `utils.ts` is the alternative, but that touches ~15 existing import sites. |
| **Q6** | Should the Revenue tab be **reachable by deep link** (`/admin/statistics?tab=revenue`)? | **No, not in this set.** Radix `Tabs` holds the value in local state; adding URL sync means `useSearchParams` plumbing that nothing else in the admin does today. Add later if someone asks for a bookmarkable link. |
| **Q7** | Frozen tests: `tests/unit/pages/statistics` breaks structurally on the tab restructure (§6.3); the contract conformance suites break on the new DTOs. | Expected and out of scope (R11). Not touched, not fixed — **but named explicitly in the report**, because the page-shell breakage is structural rather than DTO drift. |
| **Q8** | Should `deliverPrice` ever be visible anywhere on this dashboard — e.g. as a separate "delivery costs" figure? | **No.** D9 excludes it from revenue, and showing it beside cash in/out would invite someone to add it in. It appears nowhere in this set. Raise it as its own decision if delivery economics need tracking. |

---

## 8. Manual test checklist

Run against the local dev DB. `mockadmin` / `Password123!`. Tests 2, 6 and 7 need Q2 resolved first —
without plan costs, `cashOut` is commission-only and `cashOutSplit.activationCost` is 0 everywhere.

1. **Migration applied.** `npx prisma migrate status` shows `add_revenue_aggregation_indexes` applied.
   `\d "Order"` lists an index on `("orderStat","completedAt")`; `\d "Activation"` lists one on
   `("activationStat","completedAt")`.

2. **All-time totals match a manual SQL sum.** Set the period to a range covering all data. Compare the
   three KPI tiles against:
   ```sql
   SELECT sum("orderPrice") FROM "Order" WHERE "orderStat"='DELIVERED';
   SELECT sum(COALESCE("activationCost",0) + COALESCE("activationPrice",0))
     FROM "Activation" WHERE "activationStat" IN ('ACTIVATED','ACTIVATED_BY_ADMIN');
   ```
   Against today's data that is **cash in 18 848,00 · cash out 7 194,00 · net 11 654,00**.

3. **The three endpoints reconcile.** With the same filters: the sum of the trend chart's `cashIn`
   across all buckets equals the cash-in KPI; the breakdown chart's rows + "Others" equals the same
   KPI, on all three dimensions. (Plan dimension may differ by cents from display rounding — §2.1.)

4. **Empty periods are zeros, not gaps.** Pick a period containing a quiet stretch (e.g. `last_90d` at
   Day granularity). Every date between the first and last bucket is present on the X axis; quiet days
   sit **on** the zero line. There is no gap and no jump between non-adjacent dates.

5. **A range with no data → empty state, no crash.** Set a custom range far in the past (e.g.
   2020-01-01 → 2020-01-31). The tab renders its empty state, the KPI tiles read `0 DZD`, the header,
   filter bar and tab strip stay visible, and nothing throws.

6. **Granularity toggle changes the buckets.** With `this_year` selected, switch Day → Week → Month.
   Bucket count drops each time, the totals across all buckets stay **identical**, and the month
   buckets start on the 1st (Algiers local), the week buckets on Mondays.

7. **Two-decimal accuracy, no floating-point artifacts.** Set a plan cost of `0.10` in
   `/admin/settings` → Plan Costs, complete three activations on that plan, and confirm the cash-out
   figure reads exactly `0,30 DZD` more than before — not `0,30000000000000004`. Check the tooltip,
   the axis label and the KPI tile.

8. **The anchor is `completedAt`, not `createdAt`.** Find an order created in one month and delivered
   in the next (or transition one now). It must appear in the **delivery** month's bucket, and be
   absent from the creation month's.

9. **Returned orders are excluded.** Transition an order `IN_DELIVERY → RETURNED`. `completedAt` is
   stamped, but cash in does **not** move. Then transition another to `DELIVERED` — cash in rises by
   exactly its `orderPrice`.

10. **`deliverPrice` is excluded.** Note an order's `deliverPrice` in `/admin/orders`. It appears in no
    figure on the Revenue tab, and cash in moves by `orderPrice` alone.

11. **Cancelled activations are excluded.** Cancel an activation from `/admin` (its `completedAt` gets
    stamped — §0.2). Cash out does **not** move.

12. **Null commission does not null the row.** Find or create a completed activation with
    `activationPrice = NULL` (no matching commission tier). Its `activationCost` still contributes to
    cash out; the row is not skipped and no bucket becomes null.

13. **Wilaya breakdown uses the distributor's wilaya (U2).** Pick an order whose distributor's wilaya
    differs from its delivery wilaya — 5 of the 6 seeded orders qualify:
    ```sql
    SELECT o."orderNumber", d."wilayaId" AS distributor_wilaya, o."wilayaId" AS delivery_wilaya
      FROM "Order" o JOIN "Distributor" d ON d.id = o."distributorId";
    ```
    Its cash in must land in the **distributor's** wilaya row, not the delivery wilaya's.

14. **Plan breakdown allocation (U1).** With all orders single-lot (as today), each order's full
    `orderPrice` lands on its lot's plan and the plan rows sum to the cash-in total. If you can build a
    two-lot order with two different plans, confirm the split is proportional to `Lot.nbOfCards` and
    still sums to the order's price.

15. **Unattributed bucket.** Find or create a completed activation on a card with
    `distributorId = NULL`. In the wilaya and distributor breakdowns it appears in the **Unattributed**
    row — its money is not dropped, and rows + Others still equals the total.

16. **Charts render on a narrow viewport without overflow.** DevTools → 375 px. All four visuals fit,
    the page scrolls vertically only, X labels thin out rather than overlap, and the Y axis shows
    compact amounts (`19 k DZD`) instead of clipping.

17. **Bucket cap.** Custom range `2015-01-01 → 2026-12-31` at Day granularity returns
    **400 VALIDATION/BAD_REQUEST** with the "range too wide" message rendered inline; the page does not
    hang or blank. Switching to Month granularity succeeds.

18. **The Overview tab is unchanged.** Every existing chart, the heatmap and the wilaya drilldown behave
    exactly as before. Only the revenue chart's **title** now reads "Activator commissions over time".

19. **Filters apply to both tabs.** Pick a wilaya and a plan on the shared filter bar; switch tabs. Both
    tabs reflect the same selection, and switching back does not reset the period.

20. **Loading and error states.** Throttle to offline and open the Revenue tab: skeletons, then a
    `NotFoundState` with a working **Try again** in each chart card. The page header, filter bar and tab
    strip stay visible throughout.

21. **Guards.** As an activator (and as a distributor), `GET /api/v1/statistics/revenue/summary`,
    `/series` and `/breakdown` all return **403**.

22. **i18n.** Toggle EN/FR: every KPI label, granularity option, dimension option, chart title, the
    anchor note, "Unattributed" and "Others" translate. No raw key text, no untranslated English in FR.

---

## 9. Definition of done (CLAUDE.md)

- `npx tsc --noEmit` clean in `Apps/contract`, `Apps/api`, `Apps/web`
- eslint clean in all three
- `npx madge --circular src` clean in `Apps/contract` (the new `statistics.enums.ts` is imported by
  `statistics.query.ts` and `statistics.dtos.ts` **within the same module** — no cross-module import,
  so no new cycle risk; R13)
- Migration `add_revenue_aggregation_indexes` created **and applied**
- No test file created, modified, deleted or run — verified with `git status`
- No magic strings: routes from `STATISTICS_ROUTES` on both sides, SQL enum literals bound from the
  Prisma client enums, `REPORTING_TZ` from `statistics.time.ts`, `REVENUE_UNATTRIBUTED_KEY` from the
  contract, all copy from `translations.json`
- `$queryRawUnsafe` appears nowhere in the diff
- Execution report + this checklist under `Docs/Stage-04-fix/results/set-11/`
- **Stop. Do not start Set 12.**
