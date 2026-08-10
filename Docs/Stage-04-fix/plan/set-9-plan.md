# Set 9 — Activation cost & subscription-plan cost settings

**Depends on:** 1 · **Touches:** prisma, contract, api, web · **Migration: yes.**
**Must land before Sets 10 and 11.**
**Status:** PLAN ONLY — no code written in this session.
**Date:** 2026-08-10 · **Branch:** `version-02-01` · **Tree at:** `46005fc` + the uncommitted Set 7 working tree.

**Inputs read:** `.claude/CLAUDE.md`, `Docs/Stage-04-fix/plan/v2-decisions.md`,
`Docs/Stage-01-Contract/contract-rules.md`, `Docs/Stage-02-Backend/back-end-rules.md`,
`Docs/Stage-03-Frontend/front-end-rules.md`,
`Docs/Stage-04-fix/new-features-fixes/version-2-description.md` (§ Set 9), `set-7-plan.md`.

> **Tree note.** The working tree carries uncommitted Set 7 changes (activation, card,
> distributor, order modules + `Apps/api/src/common/auth/`). Every line/number in this plan was
> read from that working tree, not from `46005fc`. If Set 7 is amended before Set 9 executes,
> re-verify §2 only — the two completion paths are the one thing that must not drift.

## Decisions taken by the user in this planning session

| # | Question | Decision |
|---|---|---|
| **U1** | Decimal serialization (R7) | **Keep `z.number()` at the wire.** New money DTO fields are `z.number().nullable()` through `decimalToNumber()`. Storage, arithmetic, comparison and aggregation stay `Prisma.Decimal` server-side. §3.4. |
| **U2** | Where `activationCost` surfaces | **Activations table (column + row edit action) *and* the activation-detail Financial block** (read-only value + the same edit action) — one modal, two call sites, exactly how `activationPrice` behaves today. §5.3, §5.4. |
| **U3** | (asked for Set 10, recorded here because it lands in this file's DTOs) | `subscriptionPlanId` is added to `ActiveRequestDTO` / `AdminActivationDTO` — **in Set 10, not Set 9.** Set 9 does not touch those two fields. |

---

## 0. Audit

### 0.1 How `SubscriptionPlanCommission` is administered today — the pattern to mirror

| Layer | File | Shape |
|---|---|---|
| prisma | `schema.prisma:310-321` | `SubscriptionPlanCommission { subscriptionPlanId, commissionDurationId, commission Decimal @db.Decimal(12,2) }`, `@@unique([subscriptionPlanId, commissionDurationId])`, `@@index([subscriptionPlanId])`, `onDelete: Cascade` on the plan FK |
| contract routes | [`subscription-plan.routes.ts`](Apps/contract/src/modules/subscription-plan/subscription-plan.routes.ts) | `GET_COMMISSIONS: '/commissions'`, `UPDATE_COMMISSION: '/commissions'` (PATCH) — a **static** pair, registered before `/:id/toggle` |
| contract dtos | `subscription-plan.dtos.ts` | `CommissionMatrixDTO { tiers[], rows[{planId, planLabel, cells[{commissionDurationId, commission: z.number().nullable()}]}] }`, `CommissionCellDTO` returned by the write |
| contract command | `subscription-plan.command.ts` | `UpdateCommissionSchema { subscriptionPlanId: uuid, commissionDurationId: uuid, commission: z.number().nonnegative().multipleOf(0.01) }` |
| service | [`subscription-plan.service.ts:75-101`](Apps/api/src/modules/subscription-plan/subscription-plan.service.ts#L75-L101) | `updateCommission(cmd, actorId)` — **`upsert` on the compound unique + `tx.log.create` in one `$transaction`**, returns the cell DTO |
| mapper | `subscription-plan.mapper.ts` | `toMatrixDTO` builds a `Map` keyed `planId:tierId`, missing cell → `null`; Decimal → `Number(d.toFixed(2))` |
| routes | `subscription-plan.routes.ts:26-41` | statics first, `adminOnly` |
| web hook | [`useSubscriptionPlans.ts`](Apps/web/src/hooks/useSubscriptionPlans.ts) | `useCommissions()` query + `useUpdateCommission()` mutation invalidating `qk.subscriptionPlans.commissions()` |
| web tab | [`CommissionMatrixTab.tsx`](Apps/web/src/pages/admin/settings/components/CommissionMatrixTab.tsx) + [`CommissionCell.tsx`](Apps/web/src/pages/admin/settings/components/CommissionCell.tsx) + `commission-cell.schema.ts` | Self-contained tab: `isLoading → TableSkeleton`, `isError → NotFoundState + retry`, plain `<table>`, inline click-to-edit cell with per-cell `isSaving`/`hasError` state held by the tab |

**Set 9's cost tab is the same pattern with one column instead of N.** It is a list, not a matrix, so no `Map` and no `tiers` axis are needed.

### 0.2 Does an admin settings area with tabs exist? — **Yes.**

[`SettingsPage.tsx`](Apps/web/src/pages/admin/settings/SettingsPage.tsx), routed `/admin/settings` behind `<AdminGuard>`. Radix `Tabs`, **4** tabs today (`admins`, `commission`, `plans`, `companies`), each a self-contained component in `pages/admin/settings/components/`. Radix unmounts inactive `TabsContent`, so a tab's queries fire on first activation — no `enabled` flags needed.

**No shell work is required.** Set 9 adds a 5th `TabsTrigger`/`TabsContent` pair; Set 10 adds a 6th. The file-level comment that says *"Exactly 4 tabs"* (`SettingsPage.tsx:9-12`) is stale from an earlier decision and must be **updated, not defended**.

### 0.3 How Prisma Decimal is serialized in DTOs today — one consistent answer

There are **three** identical private helpers, all producing a JS number:

| Helper | File | Body |
|---|---|---|
| `decimalToNumber(d): number \| null` | [`activation.mapper.ts:92`](Apps/api/src/modules/activation/activation.mapper.ts#L92) | `Number(Number(d).toFixed(2))`, null-safe |
| `ActivatorMapper.decimalToNumber(d): number` | [`activator.mapper.ts:42`](Apps/api/src/modules/activator/activator.mapper.ts#L42) | same |
| `decimalToNumber(d): number` | [`order.mapper.ts:15`](Apps/api/src/modules/order/order.mapper.ts#L15) | same |
| inline | `subscription-plan.mapper.ts` | `Number(cell.commission.toFixed(2))` |

Every money field in the contract is `z.number()` — `activationPrice`, `earning`, `orderPrice`, `deliverPrice`, `commission`, `totalEarning`, `credits`, `totalAmount`, `previousCredits`. Writes go the other way through `new Prisma.Decimal(cmd.amount)` ([`activation.service.ts:1495`](Apps/api/src/modules/activation/activation.service.ts#L1495), `payment.service.ts:54`).

**The rule, stated once for Sets 9, 10 and 11 (U1 / R7):**

> Money is `Prisma.Decimal` in the database and in every calculation, comparison and aggregation.
> It becomes a JS number **only** at the mapper boundary, via `decimalToNumber()`, and is
> `z.number()` in the DTO. Inbound money is `z.number().nonnegative().multipleOf(0.01)` in the
> command and is converted with `new Prisma.Decimal(cmd.x)` **before** it touches Prisma.
> No service, no aggregation and no comparison ever operates on the JS number.

This is a deliberate, recorded reading of CLAUDE.md's *"Money is Prisma Decimal. Never a JS float"* as a rule about **computation**, not about JSON encoding — JSON has no decimal type, and the alternative (decimal strings) would give the same DTO two money conventions. Set 11 reuses this verbatim.

### 0.4 Existing precedent for "completed only, enforced server-side"

`setPrice()` ([`activation.service.ts:1470-1523`](Apps/api/src/modules/activation/activation.service.ts#L1470-L1523)) already does exactly this: it re-declares a local `completedStats` array (`:1481-1484`) and throws `ConflictError('Activation is not completed')`. Its UI counterpart gates the menu item on the same set ([`ActivationActionsMenu.tsx:20-33`](Apps/web/src/pages/admin/activations/components/ActivationActionsMenu.tsx#L20-L33)) and the modal is shared by the list and the detail page. `setCost` mirrors all of it.

Two existing quirks that Set 9 must **not** copy:
- `setPrice` writes its `Log` row **outside** the transaction (`:1506`) — R8. New code logs **inside** the transaction (the 13-of-18 majority pattern).
- `activationPrice` is written with the conditional spread `...(price && { activationPrice: price })` — R10. `activationCost` must be written **unconditionally**.

---

## 1. Prisma

### 1.1 Exact diff

```prisma
model SubscriptionPlan {
  id                   String               @id @default(uuid())
  subscriptionType     SubscriptionType
  subscriptionDuration SubscriptionDuration
  isActive             Boolean              @default(true)

  commissions       SubscriptionPlanCommission[]
  sets              Set[]
  lots              Lot[]
  cards             Card[]
  cardOrderRequests CardOrderRequest[]
+ cost              SubscriptionPlanCost?

  @@unique([subscriptionType, subscriptionDuration])
}
```

```prisma
+// Set 9 (D10). NOT the same thing as SubscriptionPlanCommission above, despite the similar
+// name: `commission` is what the business PAYS THE ACTIVATOR for an activation (a function of
+// plan × elapsed-time tier); `cost` here is what the subscription itself COSTS THE BUSINESS
+// per activation on this plan. One row per plan, one nullable cost, no tier axis.
+// Activation.activationCost is a SNAPSHOT of this value taken at completion — editing a row
+// here never rewrites a completed activation.
+model SubscriptionPlanCost {
+  id                 String   @id @default(uuid())
+  subscriptionPlanId String   @unique
+  cost               Decimal? @db.Decimal(12, 2) // null = never configured (renders "—")
+  createdAt          DateTime @default(now())
+  updatedAt          DateTime @updatedAt
+
+  subscriptionPlan SubscriptionPlan @relation(fields: [subscriptionPlanId], references: [id], onDelete: Cascade)
+}
```

```prisma
model Activation {
  id              String         @id @default(uuid())
  ...
  activationEmail String?
  activationPrice Decimal?       @db.Decimal(12, 2)
+ // Set 9 (D10): the plan's cost STAMPED at completion. Written unconditionally by both
+ // completion paths (never the `...(x && {})` spread that leaves activationPrice null) and
+ // thereafter changed only by an explicit admin edit. Not recomputed, ever.
+ activationCost  Decimal?       @default(0) @db.Decimal(12, 2)
  freezReason     String?
  ...
}
```

```prisma
enum LogActionType {
  ...
  GENERATE_TELEGRAM_TOKEN
  UNLINK_TELEGRAM
+ SET_SUBSCRIPTION_PLAN_COST
+ CHANGE_ACTIVATION_COST
}
```

### 1.2 Indexes

- **`SubscriptionPlanCost`: `@unique` on `subscriptionPlanId` is the only index needed.** It is simultaneously the 1:1 constraint, the `upsert` target, and the sole lookup key — both readers (the settings list join and the per-completion stamp lookup) address the table by plan id and nothing else. Do **not** add a redundant `@@index([subscriptionPlanId])`; unlike `SubscriptionPlanCommission`, which is 1:N per plan and genuinely needs one, this table's unique index already covers it.
- **`Activation`: no new index.** Set 11 aggregates cost over `activationStat IN (…) AND completedAt BETWEEN …`, and `@@index([activationStat])` + `@@index([completedAt])` already exist. `activationCost` is only ever a `SUM()` output column, never a predicate.

### 1.3 Migration

**Name: `add_activation_cost_and_plan_cost`** → `npx prisma migrate dev --name add_activation_cost_and_plan_cost` (produces `<timestamp>_add_activation_cost_and_plan_cost`, following `add_telegram_notifications`).

Contents: `CREATE TABLE "SubscriptionPlanCost"` + unique index + FK; `ALTER TABLE "Activation" ADD COLUMN "activationCost" DECIMAL(12,2) DEFAULT 0`; `ALTER TYPE "LogActionType" ADD VALUE` ×2.

**Postgres backfills every existing `Activation` row with `0`** because the column is added with a default. That is intended and is why manual test 7 checks a *pre-existing* completed activation reads `0` rather than blank.

> `ALTER TYPE … ADD VALUE` cannot run inside a transaction block on older Postgres. If the
> migration fails on that, split the enum values into their own migration step — Prisma normally
> handles this, and the DB is throwaway (`prisma migrate reset` + reseed is sanctioned).

### 1.4 Why nullable on the plan, `@default(0)` on the activation

| | `SubscriptionPlanCost.cost` — `Decimal?`, no default | `Activation.activationCost` — `Decimal? @default(0)` |
|---|---|---|
| What null means | **"An admin has never set this."** Distinct from a deliberate `0` (a genuinely free plan). The settings tab must render `—` for the first and `0,00 DZD` for the second, so an admin can see at a glance which plans are unconfigured. There is no defensible default cost to invent for a plan. | Nothing — it should not occur. The default applies at insert, so every activation created by `submit()` carries `0` from birth and carries `0` forever unless a completion path stamps it. |
| What the value is for | An **editable setting**, read once per completion. | A **stamped historical fact**, read by aggregation. |
| Why not the other way | A plan cost defaulted to `0` would silently stamp `0` onto real activations while looking configured. | A nullable-with-no-default cost would force `COALESCE` in every Set 11 aggregate and would be indistinguishable from "the plan had no cost" — the exact ambiguity R10 flags for `activationPrice`. `0` makes the ledger arithmetic total. |

The column stays *nullable* (rather than `Decimal @default(0)` non-null) purely to match the D10/spec wording and to mirror `activationPrice`'s nullability so both money columns on `Activation` read the same; in practice the mapper's `decimalToNumber` returns `number \| null` and the DTO is `z.number().nullable()`, which costs nothing. **No code may rely on it being null** — treat null as `0` if it is ever seen.

---

## 2. THE COMPLETION PATH INVENTORY

> **This is the correctness risk of the set.** A path that transitions an activation to
> `ACTIVATED` or `ACTIVATED_BY_ADMIN` without stamping the cost produces an activation that is
> permanently, silently, wrong in Set 11's revenue figures — with no error and no way to detect it
> after the fact except by comparing against a plan cost that may have changed since.
>
> **Set 10 reuses this table verbatim.** Both sets hook the same two places.

### 2.1 The inventory

| # | Path | Entry point | Sets `activationStat` to | Transaction | Line the stamp goes on |
|---|---|---|---|---|---|
| **1** | **`ActivationService.activate()`** — the activator completes their own request | `POST /activations/:id/activate` → `ACTIVATION_ROUTES.ACTIVATE`, `activatorOnly` ([`activation.routes.ts:143-148`](Apps/api/src/modules/activation/activation.routes.ts#L143-L148)) | `ACTIVATED` | `$transaction` opened at [`activation.service.ts:768`](Apps/api/src/modules/activation/activation.service.ts#L768) | Inside the **first** `tx.activation.update` — [`:769-777`](Apps/api/src/modules/activation/activation.service.ts#L769-L777), the same `data` object that already carries `activationStat`, `completedAt`, `activationEmail`, `activationPrice` |
| **2** | **`ActivationService.activateByAdmin()`** — admin resolves a `FREEZE` to success | `POST /activations/:id/activate-by-admin` → `ACTIVATE_BY_ADMIN`, `adminOnly` ([`activation.routes.ts:172-177`](Apps/api/src/modules/activation/activation.routes.ts#L172-L177)) | `ACTIVATED_BY_ADMIN` | `$transaction` opened at [`activation.service.ts:1348`](Apps/api/src/modules/activation/activation.service.ts#L1348) | Inside the **first** `tx.activation.update` — [`:1349-1357`](Apps/api/src/modules/activation/activation.service.ts#L1349-L1357), same `data` object |
| **3** | **`scripts/load-mock-data.ts`** — seed | not a runtime path; `seedActivation(...)` call at [`:345-352`](Apps/api/scripts/load-mock-data.ts#L345-L352), stat chosen from `activationStats[]` at `:265-275`, `isActivated` computed at `:330` | both | n/a | The same `...(isActivated && { … })` spread that already sets `activationPrice` — add `activationCost`. See §7 Q3. |

**There are exactly two runtime completion paths.** Both are in `activation.service.ts`; both already open an interactive `$transaction`; both already write `activationEmail` in the same `data` object (which is why Set 10 hooks the identical two places).

### 2.2 Proof that the inventory is exhaustive

Every occurrence of `ACTIVATED` / `ACTIVATED_BY_ADMIN` under `Apps/api/src` and `Apps/api/scripts`, classified:

| Site | Kind | Why it is not a completion path |
|---|---|---|
| `activation.service.ts:78-79` | `TERMINAL_STATS` const | read-only list used by guards |
| `activation.service.ts:243-244` | mapper-input branch | derives a client-facing status |
| `activation.service.ts:772`, `:802`, `:814` | **path 1** | ← the update, its `ActivationStep` row, and the returned DTO |
| `activation.service.ts:1062` | `where … in` | read filter (card history) |
| `activation.service.ts:1352`, `:1381`, `:1390`, `:1400` | **path 2** | ← the update, step row, event payload, returned DTO |
| `activation.service.ts:1482-1483` | local `completedStats` in `setPrice` | **guard on an already-completed row.** `setPrice` mutates `activationPrice` only; it is not a transition and must not stamp cost |
| `activation.mapper.ts:49-50` | `ClientActivationStatus` map | presentation |
| `activator.service.ts:79,154,327,385-417` | `where … activationStat` | read filters for stats/performance |
| `statistics.service.ts:24` | `COMPLETED_STATS` | read filter |
| `notification.subscribers.ts:40-41,157-158` · `notification.templates.ts:71,112` | notification type map + French copy | reacts to the event, writes nothing |
| `schema.prisma:94` | enum member | — |
| `load-mock-data.ts:270-271,330` | **path 3** | seed |

Nothing else writes `Activation.activationStat`. `cancel()`, `release()`, `freeze()`, `cancelByAdmin()` write non-completed terminal stats and are out of scope.

### 2.3 Where the value comes from — one choke point

Add one private helper to `ActivationService`, and call it from both paths **inside** their existing transaction:

```
private async resolvePlanCost(tx, subscriptionPlanId): Promise<Prisma.Decimal>
  row = await tx.subscriptionPlanCost.findUnique({ where: { subscriptionPlanId } })
  return row?.cost ?? new Prisma.Decimal(0)
```

- **Read inside the transaction, not from the pre-transaction `include`.** Both paths already load `card.subscriptionPlan` before the transaction, and extending that `include` with `cost: true` would be one fewer query — but the set's defining invariant is *"the cost stamped is the plan cost at the moment of completion"*, and an in-transaction read on a unique key makes that literally true instead of approximately true. The lookup is a single indexed row.
- **Null plan cost → `Prisma.Decimal(0)`**, never `null`, never a skipped write.
- Written **unconditionally**: `data: { …, activationCost: cost }`. Do **not** write `...(cost && { activationCost: cost })` — `Decimal(0)` is falsy-adjacent territory and that idiom is exactly what left `activationPrice` null (R10).
- Plan id is already on hand in both paths: `activation.card.subscriptionPlanId`.

### 2.4 The resulting diffs

**Path 1** — `activate()`, [`activation.service.ts:768-777`](Apps/api/src/modules/activation/activation.service.ts#L768-L777):
```
await this.prisma.$transaction(async (tx) => {
+ const cost = await this.resolvePlanCost(tx, activation.card.subscriptionPlanId);
  await tx.activation.update({
    where: { id },
    data: {
      activationStat: PrismaActivationStat.ACTIVATED,
      completedAt: now,
      activationEmail: cmd.activationEmail,
+     activationCost: cost,
      ...(price && { activationPrice: price }),
    },
  });
```

**Path 2** — `activateByAdmin()`, [`activation.service.ts:1348-1357`](Apps/api/src/modules/activation/activation.service.ts#L1348-L1357): identical insertion, `activation.card.subscriptionPlanId`, stat `ACTIVATED_BY_ADMIN`.

**Path 3** — seed, §7 Q3.

Both paths return a DTO built from a spread of the pre-update entity (`{ ...activation, activationStat: …, completedAt: now }`); those spreads must also carry `activationCost: cost` so the response echoes the stamped value rather than the pre-update `0`.

---

## 3. Contract

Package `Apps/contract`. Zero logic; every type `z.infer`'d; no magic strings; `madge --circular src` clean (all changes are within existing modules — no new cross-module import, so no new cycle risk).

### 3.1 `modules/log/log.enums.ts`

```ts
export enum LogActionType {
  …
  SET_SUBSCRIPTION_PLAN_COST = 'SET_SUBSCRIPTION_PLAN_COST',
  CHANGE_ACTIVATION_COST = 'CHANGE_ACTIVATION_COST',
}
```
Must stay byte-identical to the prisma enum (§1.1).

### 3.2 `modules/subscription-plan/`

**`subscription-plan.routes.ts`** (statics, mirroring the commissions pair):
```ts
export const SUBSCRIPTION_PLAN_ROUTES = {
  …
  GET_COSTS: '/costs',
  UPDATE_COST: '/costs',
} as const;
```

**`subscription-plan.dtos.ts`** — a list, not a matrix:
```ts
export const SubscriptionPlanCostResponseSchema = z.object({
  subscriptionPlanId: z.uuid(),
  planLabel: z.string(),
  isActive: z.boolean(),          // the tab badges inactive plans; see Q1
  cost: z.number().nullable(),    // null = never configured → renders "—"
  updatedAt: z.iso.datetime().nullable(),
});
export type SubscriptionPlanCostDTO = z.infer<typeof SubscriptionPlanCostResponseSchema>;
```
`GET_COSTS` returns `SubscriptionPlanCostDTO[]` (unpaginated — the plan catalogue is a handful of rows, exactly like `GET_COMMISSIONS`). `UPDATE_COST` returns a single `SubscriptionPlanCostDTO`.

**`subscription-plan.command.ts`**:
```ts
export const UpdateSubscriptionPlanCostSchema = z.object({
  subscriptionPlanId: z.uuid(),
  cost: z.number().nonnegative().multipleOf(0.01),
});
export type UpdateSubscriptionPlanCostCommand = z.infer<typeof UpdateSubscriptionPlanCostSchema>;
```
No un-set path (Q2). `multipleOf(0.01)` matches `UpdateCommissionSchema` and the `Decimal(12,2)` column.

Barrel already `export *`s these files — no `index.ts` change.

### 3.3 `modules/activation/`

**`activation.routes.ts`**: `SET_COST: '/:id/set-cost'` added to `ACTIVATION_ROUTES` (next to `SET_PRICE`).

**`activation.command.ts`**:
```ts
export const SetActivationCostSchema = z.object({
  amount: z.number().nonnegative().multipleOf(0.01),
});
export type SetActivationCostCommand = z.infer<typeof SetActivationCostSchema>;
```
A separate schema from `SetActivatorPriceSchema` even though the shape is identical — they are different commands on different money, and collapsing them would make a later divergence (e.g. a reason field on one) a breaking change to both.

**`activation.dtos.ts`**:
- `AdminActivationResponseSchema` += `activationCost: z.number().nullable()`
- `ActivationDetailResponseSchema.financial` += `activationCost: z.number().nullable()` → the block becomes `{ activationPrice, activationCost, commissionTierLabel }`

**Deliberately NOT added** (record it in a comment next to the field, as Set 7 did for the distributor DTO):
- `ActivatorHistoryItemDTO`, `ActiveRequestDTO`, `RecentActivationDTO` — activator-facing. Cost is a business figure, not the activator's; `earning` stays the only money an activator sees.
- `DistributorActivationDTO` — Set 7 §4.1 forbids money on the distributor surface, and this is more sensitive than the commission, not less.
- `PendingActivationDTO`, `KeyVerificationDTO`, `ClientActivationStatusDTO` — pool/public.

### 3.4 The Decimal decision, applied

Per **U1** (§0.3): `cost`, `activationCost`, `amount` are all `z.number()` on the wire; every server-side read/write goes through `Prisma.Decimal`. Concretely in this set:

| Direction | Where | How |
|---|---|---|
| out | `SubscriptionPlanMapper.toCostDTO` | `row?.cost != null ? Number(row.cost.toFixed(2)) : null` (matches `toCellDTO`'s existing idiom) |
| out | `ActivationMapper.toAdminActivationDTO`, `toActivationDetailDTO` | the existing module-level `decimalToNumber(activation.activationCost)` |
| in | `SubscriptionPlanService.updateCost` | `new Prisma.Decimal(cmd.cost)` before the upsert |
| in | `ActivationService.setCost` | `new Prisma.Decimal(cmd.amount)` before the update |
| internal | `resolvePlanCost` | returns `Prisma.Decimal`; never converted to a number |

**No new `decimalToNumber` helper.** Three copies already exist (§0.3) — reuse the one in the mapper you are editing. Consolidating them is a separate concern and out of this set's scope.

---

## 4. Backend

Package `Apps/api`. 5-file module pattern; `sendSuccess` for every response; `AppError` subclasses only; Pino, never `console`; routes from contract constants.

### 4.1 `modules/subscription-plan/` — the plan-cost settings

**`subscription-plan.interface.ts`** += 
```ts
getCosts(): Promise<SubscriptionPlanCostDTO[]>;
updateCost(cmd: UpdateSubscriptionPlanCostCommand, actorId: string): Promise<SubscriptionPlanCostDTO>;
```

**`subscription-plan.mapper.ts`** += `toCostDTO(plan: SubscriptionPlan, row: SubscriptionPlanCost | null): SubscriptionPlanCostDTO` — `planLabel` from the existing `composeSubscriptionLabel(plan)`, `cost`/`updatedAt` null when no row, `.parse()` on the way out like every other mapper here.

**`subscription-plan.service.ts`**:

```
getCosts():
  [plans, costs] = await Promise.all([
    prisma.subscriptionPlan.findMany(),                    // ALL plans — see Q1
    prisma.subscriptionPlanCost.findMany(),
  ])
  map costs by subscriptionPlanId; return plans.map(p => toCostDTO(p, map.get(p.id) ?? null))
```
Two flat queries + an in-memory join, exactly like `getCommissions()` — not a `findMany({ include: { cost: true } })`, so the shape stays parallel to the tab it feeds.

```
updateCost(cmd, actorId):
  plan = await prisma.subscriptionPlan.findUnique({ where: { id: cmd.subscriptionPlanId } })
  if (!plan) throw new NotFoundError('Subscription plan not found')
  row = await prisma.$transaction(async (tx) => {
    const upserted = await tx.subscriptionPlanCost.upsert({
      where:  { subscriptionPlanId: cmd.subscriptionPlanId },
      update: { cost: new Prisma.Decimal(cmd.cost) },
      create: { subscriptionPlanId: cmd.subscriptionPlanId, cost: new Prisma.Decimal(cmd.cost) },
    })
    await tx.log.create({ data: {
      actionType: LogActionType.SET_SUBSCRIPTION_PLAN_COST,
      actionDescription: `Set subscription plan cost for plan ${cmd.subscriptionPlanId} to ${cmd.cost}`,
      userId: actorId,
    }})
    return upserted
  })
  return SubscriptionPlanMapper.toCostDTO(plan, row)
```

- **Transaction boundary:** the upsert and the `Log` row commit together — the majority pattern, and the same one `updateCommission` uses three lines above.
- **`upsert`, not find-then-branch** — the unique key makes two concurrent admin edits safe (A6's reasoning, applied here too).
- The plan existence check is outside the transaction on purpose: it is a validation, and the FK would fail the write anyway; this just turns a P2003 into a clean 404.
- No log helper exists in this codebase (R9); the description string is inlined like the other 18 sites.

**`subscription-plan.controller.ts`** += `getCosts` / `updateCost`, both the standard `try { … sendSuccess(res, result) } catch (e) { next(e) }`; `updateCost` reads `req.validated.body` and `req.user!.id`.

**`subscription-plan.routes.ts`** — register **in the statics block, before `/:id/toggle`**:
```ts
subscriptionPlanRouter.get(SUBSCRIPTION_PLAN_ROUTES.GET_COSTS, adminOnly, controller.getCosts);
subscriptionPlanRouter.patch(
  SUBSCRIPTION_PLAN_ROUTES.UPDATE_COST, adminOnly,
  validateRequest({ body: UpdateSubscriptionPlanCostSchema }), controller.updateCost,
);
```
**Guards: `adminOnly` on both.** Note the module's other guard, `adminOrDistributor`, applies to `GET_ALL` only (the plan catalogue for the distributor order-request form) — cost is financial and must not widen to it.

### 4.2 `modules/activation/` — the stamp and the admin edit

**Module-level constant.** `activation.service.ts:76-80` currently defines `TERMINAL_STATS` by spreading `CANCELLED_STATS` into a literal `ACTIVATED`/`ACTIVATED_BY_ADMIN` pair, and `setPrice` re-declares the same pair locally at `:1481-1484`. Add
```ts
const COMPLETED_STATS: PrismaActivationStat[] = [
  PrismaActivationStat.ACTIVATED,
  PrismaActivationStat.ACTIVATED_BY_ADMIN,
];
const TERMINAL_STATS: PrismaActivationStat[] = [...COMPLETED_STATS, ...CANCELLED_STATS];
```
and point **both** `setPrice`'s local list and the new `setCost` at it. This is a zero-behaviour-change deletion of a duplicate in the same file, done now specifically so Set 9 does not create a *third* copy. Nothing else about `setPrice` is touched.

**`resolvePlanCost(tx, subscriptionPlanId)`** — §2.3. Private, takes the transaction client so it cannot accidentally be called outside one.

**Stamp** — §2.4, both paths, unconditional.

**`setCost(id, cmd, actorId)`** — mirrors `setPrice`, with the differences that matter:
```
activation = await prisma.activation.findUnique({ where: { id }, include: {
  card: { include: { subscriptionPlan: true, distributor: { select: { storeName: true } } } },
  activator: { select: { id: true, fullName: true } },
}})
if (!activation) throw new NotFoundError('Activation not found')
if (!COMPLETED_STATS.includes(activation.activationStat)) throw new ConflictError('Activation is not completed')

const oldCost = activation.activationCost ?? new Prisma.Decimal(0)
const newCost = new Prisma.Decimal(cmd.amount)

await prisma.$transaction(async (tx) => {
  await tx.activation.update({ where: { id }, data: { activationCost: newCost } })
  await tx.log.create({ data: {
    actionType: LogActionType.CHANGE_ACTIVATION_COST,
    actionDescription: `Set activation cost to ${cmd.amount} (was ${oldCost.toFixed(2)}) for activation ${id}`,
    userId: actorId,
  }})
})

return ActivationMapper.toAdminActivationDTO({ ...activation, activationCost: newCost }, plan, …)
```
- **The completed-only rule is enforced here, server-side** — the disabled menu item is a convenience, not the control (manual test 9 asserts the API rejects it directly).
- **Log inside the transaction** (unlike `setPrice`, R8 — new code follows the majority).
- `oldCost` is compared/formatted as a `Decimal`; no float arithmetic anywhere (there is no delta to compute — see §6).
- Interface + controller + route:
```ts
activationRouter.post(
  ACTIVATION_ROUTES.SET_COST, adminOnly,
  validateRequest({ params: ActivationActionParamsSchema, body: SetActivationCostSchema }),
  controller.setCost,
);
```
registered next to `SET_PRICE`, after the static GETs.

**`activation.mapper.ts`**: `toAdminActivationDTO`'s input type += `activationCost: Decimal | null`, output += `activationCost: decimalToNumber(activation.activationCost)`; same for `toActivationDetailDTO`'s `financial`. Callers already pass the whole entity, so only the two paths' post-update spreads need the extra key (§2.4).

### 4.3 Audit-log writes — both new actions

| Action | `LogActionType` | Written at | In transaction? |
|---|---|---|---|
| Admin sets/changes a plan's cost | `SET_SUBSCRIPTION_PLAN_COST` | `SubscriptionPlanService.updateCost` | **Yes** |
| Admin edits one activation's cost | `CHANGE_ACTIVATION_COST` | `ActivationService.setCost` | **Yes** |

The **stamp** itself writes no log row — it is an automatic consequence of completing an activation, not an admin action, and the completion is already recorded by the `ActivationStep` row. Only the two explicit admin actions are logged.

---

## 5. Frontend

Package `Apps/web`. Component → Hook → Service; no `useEffect` fetching; no inline strings; layout survives loading and error.

### 5.1 Service + hooks + query keys

**`services/subscription-plans.service.ts`** += `getCosts(signal)` (GET `apiPath(BASE, GET_COSTS)`) and `updateCost(command)` (PATCH `apiPath(BASE, UPDATE_COST)`), both unwrapping the envelope with the file's existing defensive `if (!res.data.success) throw` line.

**`services/activations.service.ts`** += `setCost(id, command)` → POST `withParams(apiPath(ACTIVATION_ROUTES.BASE, ACTIVATION_ROUTES.SET_COST), { id })`.

**`lib/query-keys.ts`** += `qk.subscriptionPlans.costs: () => ["subscription-plans", "costs"] as const`.

**`hooks/useSubscriptionPlans.ts`** += `usePlanCosts()` and `useUpdatePlanCost()` (invalidates `qk.subscriptionPlans.costs()` **only** — a cost edit changes no commission, no plan list, and, per §6, no activation).

**`hooks/useAdminActivations.ts`** += `useSetActivationCost()`:
```ts
mutationFn: ({ id, command }: { id: string; command: SetActivationCostCommand }) => activationsService.setCost(id, command),
onSuccess: () => { queryClient.invalidateQueries({ queryKey: qk.activations.all() }); }
```
**It must NOT invalidate `qk.activators.all()`** — that line exists in `useSetActivationPrice` because price moves activator earnings/credits. Cost moves nothing of the sort (§6); invalidating activators here would be a false signal.

### 5.2 The settings tab

**`SettingsPage.tsx`**: add a 5th trigger/content pair, `value="planCosts"`, placed after `commission` (the two are the same kind of thing). Update the stale "Exactly 4 tabs" comment to state the current count and why it grew (Sets 9 and 10).

**`components/PlanCostsTab.tsx`** — a near-copy of `CommissionMatrixTab` with one value column:
- `usePlanCosts()`; `isLoading → <TableSkeleton rows={4} columns={3} />`; `isError → <NotFoundState … />` with a retry `Button`; the explanatory `<p>` note above the table, outside both branches.
- Columns: **Plan** (`planLabel`) · **Status** (reuse `admin.settings.plans.table.status` + the existing status badge treatment from `SubscriptionPlansTab`) · **Cost** (`PlanCostCell`).
- Per-row `savingPlanId` / `erroredPlanId` state held by the tab, passed down — same mechanism as `savingCellKey`/`erroredCellKey`.

**`components/PlanCostCell.tsx`** + **`components/plan-cost-cell.schema.ts`** — adapted from `CommissionCell` / `commission-cell.schema.ts`: collapsed state renders `cost != null ? formatDZD(cost, language) : "—"` with the hover pencil; editing state is a `type="number" min={0} step={0.01}` input with check/cancel buttons; submit exits edit mode synchronously and the failure surfaces as `hasError` styling on the collapsed value.

> Copy-adapt rather than generalize `CommissionCell`. It is bound to a `commission` prop name,
> its own Zod schema, and the `admin.settings.commission.saveError` key; parameterizing it for two
> call sites would cost more than the ~60 duplicated lines and would touch a component the frozen
> settings tests already cover.
>
> The literal `"—"` in JSX matches the established convention for a null money/value placeholder
> (`CommissionCell.tsx:65`, `ActivationsTable.tsx:61,77,84`, `FinancialBlock.tsx:38,45`). It is a
> typographic placeholder, not copy, and is deliberately **not** a translation key.

### 5.3 The activation table column and its edit action

**`ActivationsTable.tsx`**:
- New column after `price`:
```tsx
{ id: "cost", header: t("admin.activations.table.cost"),
  accessorFn: (row) => row.activationCost != null ? formatDZD(row.activationCost, language) : "—" }
```
- `TableSkeleton columns={9}` → `10`.
- Owns a second row-scoped modal: `const [costRow, setCostRow] = useState<AdminActivationDTO | null>(null)` and `<SetActivationCostModal … currentAmount={costRow?.activationCost} onSubmit={…} />`, mirroring the existing `priceRow` wiring.
- New prop `onSetCost: (activation: AdminActivationDTO, amount: number) => void`; `isMutating` in `ActivationsPage` gains `setActivationCost.isPending`.

**`ActivationActionsMenu.tsx`**: one new item, gated by the **same** `COMPLETED_STATES` set that already gates Set/Edit Price:
```tsx
{canSetCost && (
  <DropdownMenuItem onClick={() => onRequestSetCost(activation)}>
    <Coins className="mr-2 h-4 w-4" />
    {t(hasCost ? "admin.activations.actions.editCost" : "admin.activations.actions.setCost")}
  </DropdownMenuItem>
)}
```
`const canSetCost = COMPLETED_STATES.has(activation.state)` — i.e. `ACTIVATED` or `ACTIVATED_BY_ADMIN` only. `hasCost = activation.activationCost != null`. (`Coins` from lucide-react, already a dependency.)

**`components/SetActivationCostModal.tsx`** + **`set-activation-cost.schema.ts`** — copy-adapt of `SetActivatorPriceModal` / `set-activator-price.schema.ts`: same `useEffect(() => { if (open) reset({ amount: currentAmount ?? 0 }) }, [open, currentAmount, reset])` prefill, same compile-time `AssertAssignable` guard against `SetActivationCostCommand`, cost-specific titles.

**The enable/disable rule, stated once:** the cost edit is offered **only** when `state ∈ {ACTIVATED, ACTIVATED_BY_ADMIN}`. The menu item is absent otherwise (matching how Set/Edit Price behaves — absent, not rendered-disabled), and `ActivationService.setCost` throws `ConflictError` for any other state regardless of what the UI did.

### 5.4 The activation detail page (U2)

**`FinancialBlock.tsx`**: the `<dl>` grows a third entry, **Cost**, rendering `formatDZD` or `—`; the header gains a second button (`Set/Edit cost`), gated by the same `canSetPrice`-style boolean the page already computes from `state`. `ActivationDetailPage.tsx` holds the modal open-state and calls `useSetActivationCost()`, exactly as it already does for price.

### 5.5 Translation keys

All added to `config/translations.json` as flat `key → { en, fr, ar }`, `ar: ""` present on every key.

| Key | en | fr |
|---|---|---|
| `admin.settings.tabs.planCosts` | Plan Costs | Coûts des formules |
| `admin.settings.planCosts.note` | The cost is stamped onto each activation when it completes. Changes apply to future activations only. | Le coût est enregistré sur chaque activation à son achèvement. Les modifications s'appliquent uniquement aux futures activations. |
| `admin.settings.planCosts.table.plan` | Plan | Formule |
| `admin.settings.planCosts.table.cost` | Cost | Coût |
| `admin.settings.planCosts.saveError` | Couldn't save — reverted. | Échec de l'enregistrement — annulé. |
| `admin.settings.planCosts.empty.noPlans` | No subscription plans yet. | Aucune formule d'abonnement pour le moment. |
| `admin.activations.table.cost` | Cost | Coût |
| `admin.activations.actions.setCost` | Set cost | Définir le coût |
| `admin.activations.actions.editCost` | Edit cost | Modifier le coût |
| `admin.activations.setCostModal.title` | Set activation cost | Définir le coût d'activation |
| `admin.activations.setCostModal.editTitle` | Edit activation cost | Modifier le coût d'activation |
| `admin.activations.setCostModal.amount` | Amount (DZD) | Montant (DZD) |
| `admin.activationDetail.financial.cost` | Cost | Coût |

Reused unchanged: `admin.settings.plans.table.status`, `common.actions.{save,cancel,confirm,tryAgain}`, `common.validation.*`, `admin.dashboard.sectionError*`.

---

## 6. What the admin cost edit does NOT do

`ActivationService.setCost` writes **exactly one column on exactly one row**, plus its `Log` row. Explicitly, it does not:

1. **Touch `activationPrice`.** Cost and commission are independent numbers on the same row.
2. **Touch `Activator.totalEarning` or `Activator.credits`.** This is the single biggest difference from `setPrice`, which applies a `delta` to both (`:1489-1503`). Cost is a business expense; it is not owed to anyone. **There is no delta computation in `setCost` at all** — if the implementation contains one, it is wrong.
3. **Write back to `SubscriptionPlanCost`.** Editing one activation's cost never changes the plan's setting.
4. **Re-stamp any other activation.** Not on the same plan, not in the same period, not ever. The stamp is per-row and happens once.
5. **Recompute the commission tier** or re-run `computeCommission`.
6. **Touch `Card.cardStat`, `Distributor.nbOfActivation`/`nbOfActiveCards`, `Activator.nbOfActivation`,** or any other counter.
7. **Change `activationStat`, `completedAt`, `takenAt`, or `activationEmail`.**
8. **Emit any event.** No `activation:status-changed`, no `activation:resolved`, no notification. Nothing about the activation's lifecycle changed, so no socket room and no Telegram recipient should hear about it.
9. **Invalidate `qk.activators.all()`** on the frontend (§5.1).

And symmetrically, **editing a plan's cost in settings does not**:

10. **Rewrite any completed activation's `activationCost`.** That is the snapshot guarantee (manual test 5). No backfill, no migration-time recompute, no "sync" button.
11. **Affect in-flight activations** retroactively — an activation that completes *after* the edit picks up the new value simply because `resolvePlanCost` reads at completion time.

---

## 7. Open questions

| # | Question | My recommendation |
|---|---|---|
| **Q1** | Should the Plan Costs tab list **inactive** plans too? `getCommissions()` filters to `isActive: true`; the Set 9 manual test says *"lists every plan"*. | **List all plans**, with the inactive ones badged (the DTO carries `isActive` for exactly this). An inactive plan can still have completed activations against it, and hiding its cost hides why those rows are what they are. Deviates from `getCommissions` deliberately. |
| **Q2** | Should `UPDATE_COST` be able to clear a cost back to `null` (un-configure a plan)? | **No, not in this set.** The command takes a required non-negative number. Nothing in the spec asks for it, and `0` covers "this plan costs nothing". Add later if a real need appears. |
| **Q3** | `scripts/load-mock-data.ts` seeds completed activations directly (R15) and will otherwise produce `activationCost = 0` on every seeded row while `activationPrice` is randomised. Update it? | **Yes** — (a) seed one `SubscriptionPlanCost` row per plan with a plausible cost, leaving **one plan deliberately unset** so the `—` state is visible without hand-editing the DB; (b) add `...(isActivated && { activationCost: <the plan's cost, or 0> })` alongside the existing `activationPrice` spread at `load-mock-data.ts:345-352`. Confirm before I write it — it is the one file outside prisma/contract/api/web this set touches. |
| **Q4** | Should the admin activations list gain a **cost filter or sort**? | **No.** The spec asks for a column and an edit action. Sorting/filtering on cost is Set 11's dashboard concern, and `GetActivationsQuery` has no cost dimension today. |
| **Q5** | Does anything need to change in `statistics.service.ts` now? | **No.** D9's `cashIn`/`cashOut`/`net` are Set 11's, and R6 says not to redefine the existing `totalRevenue` fields. Set 9 stamps the data; Set 11 reads it. |
| **Q6** | Frozen tests: the contract conformance suites and the settings/activations unit tests will break on the new DTO fields and the 5th tab. | Expected and out of scope (R11). Not touched, not fixed, reported. |

---

## 8. Manual test checklist

Run against a reseeded DB. `mockadmin` / `Password123!`.

1. **Migration applied.** `npx prisma migrate status` shows `add_activation_cost_and_plan_cost` applied; `\d "Activation"` shows `activationCost numeric(12,2) default 0`; `\d "SubscriptionPlanCost"` shows the unique index on `subscriptionPlanId`.
2. **Settings tab exists and lists every plan.** `/admin/settings` shows a 5th tab **Plan Costs**. It lists every subscription plan; plans with no cost row show `—`, not `0`.
3. **Set a cost.** Click a plan's `—`, type `500`, save. The cell shows `500,00 DZD`. `/admin/logs` has a fresh `SET_SUBSCRIPTION_PLAN_COST` row naming the plan and the value.
4. **The stamp works.** Complete an activation on that plan through the activator portal (`/requests` → take → Activate). `/admin/activations` shows the row with **Cost = 500,00 DZD**. The detail page's Financial block agrees.
5. **The stamp is a snapshot.** Change the plan's cost to `900` in settings. Reload `/admin/activations` — the activation from step 4 **still reads 500,00 DZD**. Complete a *second* activation on that plan: it reads `900,00 DZD`.
6. **Null plan cost → 0, no crash.** Pick a plan with `—` in the cost tab, complete an activation on it. It completes normally and the row reads `0,00 DZD`.
7. **Pre-existing rows.** An activation completed *before* the migration reads `0,00 DZD` (the column default backfill), not blank and not an error.
8. **Edit one activation's cost.** Row menu → **Set cost** on a completed activation → `123.45` → confirm. The row and the detail page both show `123,45 DZD`; a `CHANGE_ACTIVATION_COST` log row appears with the old and new values.
9. **Completed-only, enforced server-side.** (a) A `PENDING`/`PROCESSING`/`FREEZE`/cancelled row has **no** Set-cost item in its menu. (b) With DevTools, `POST /api/v1/activations/<a PENDING id>/set-cost` with `{"amount": 10}` returns **409 `RESOURCE_CONFLICT`**, "Activation is not completed".
10. **The edit changes nothing else.** Note the activator's **Total earning** and **Credits** on `/admin/activators/<id>` before step 8; re-check after. Both are **unchanged**, and so are `activationPrice`, the state badge, and `completedAt`. The plan's cost in settings is also unchanged.
11. **Admin completion path stamps too.** Freeze an activation from the activator portal, then resolve it from `/admin` (or `/admin/activations` row menu → Activate). The resulting `ACTIVATED_BY_ADMIN` row carries the plan's cost — this is the path most likely to be forgotten.
12. **Guards.** Log in as an activator: `GET /api/v1/subscription-plans/costs` and `PATCH /api/v1/subscription-plans/costs` both return **403**; `POST /activations/:id/set-cost` returns **403**. Same as a distributor.
13. **Loading and error states.** Throttle to offline and open the Plan Costs tab: a skeleton then the `NotFoundState` with a working **Try again** — the page header and tab bar stay visible throughout.
14. **i18n.** Toggle EN/FR: every new label on the tab, the column header, both menu items and the modal translate. No raw key text, no untranslated English in FR.

---

## 9. Definition of done (CLAUDE.md)

- `npx tsc --noEmit` clean in `Apps/contract`, `Apps/api`, `Apps/web`
- eslint clean in all three
- `npx madge --circular src` clean in `Apps/contract`
- Migration `add_activation_cost_and_plan_cost` created **and applied**
- No test file created, modified, deleted or run — verified with `git status`
- No magic strings in changed files (routes from contract constants both sides; the `"—"` placeholder is the one sanctioned literal, §5.2)
- Execution report + this checklist under `Docs/Stage-04-fix/results/set-9/`
- **Stop. Do not start Set 10.**
