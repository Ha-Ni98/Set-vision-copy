# Set 10 — Activation email pool

**Depends on:** 9 (reuses its completion-path inventory and its settings-tab shell) · **Touches:** prisma, contract, api, web · **Migration: yes.**
**Status:** PLAN ONLY — no code written in this session.
**Date:** 2026-08-10 · **Branch:** `version-02-01` · **Tree at:** `46005fc` + the uncommitted Set 7 working tree.

**Inputs read:** `.claude/CLAUDE.md`, `Docs/Stage-04-fix/plan/v2-decisions.md` (D13, A4, A5, A6),
`Docs/Stage-04-fix/plan/set-9-plan.md`, `Docs/Stage-01-Contract/contract-rules.md`,
`Docs/Stage-02-Backend/back-end-rules.md`, `Docs/Stage-03-Frontend/front-end-rules.md`,
`Docs/Stage-04-fix/new-features-fixes/version-2-description.md` (§ Set 10).

## Decisions taken by the user in this planning session

| # | Question | Decision |
|---|---|---|
| **U1** | How does the picker learn which plan the activation is on? Neither `ActiveRequestDTO` nor `AdminActivationDTO` carries a plan id today. | **Add `subscriptionPlanId` to both DTOs** (contract + mapper only — the `Activation` *model* is untouched). The picker route is then a plain list filtered by plan id, and the new module reads only its own table. §5.4, §8. |
| **U2** | Decimal serialization (Set 9 §0.3) | Not applicable — this set has no money. Recorded so the rule isn't re-litigated. |

---

## 0. Audit

### 0.1 THE COMPLETION PATH INVENTORY — restated from `set-9-plan.md` §2

> Every one of these paths writes `Activation.activationEmail`. **All of them must run the
> match-and-increment logic, in the same transaction as the completion.** This is the same list
> Set 9 stamps `activationCost` on — one audit, two sets.

| # | Path | Entry point | Sets `activationStat` to | Transaction | Where it writes `activationEmail` |
|---|---|---|---|---|---|
| **1** | **`ActivationService.activate()`** — the activator completes their own request | `POST /activations/:id/activate` → `ACTIVATION_ROUTES.ACTIVATE`, `activatorOnly` ([`activation.routes.ts:143-148`](Apps/api/src/modules/activation/activation.routes.ts#L143-L148)) | `ACTIVATED` | `$transaction` opened at [`activation.service.ts:768`](Apps/api/src/modules/activation/activation.service.ts#L768) | `activationEmail: cmd.activationEmail` in the first `tx.activation.update`, [`:769-777`](Apps/api/src/modules/activation/activation.service.ts#L769-L777) |
| **2** | **`ActivationService.activateByAdmin()`** — admin resolves a `FREEZE` to success | `POST /activations/:id/activate-by-admin` → `ACTIVATE_BY_ADMIN`, `adminOnly` ([`activation.routes.ts:172-177`](Apps/api/src/modules/activation/activation.routes.ts#L172-L177)) | `ACTIVATED_BY_ADMIN` | `$transaction` opened at [`activation.service.ts:1348`](Apps/api/src/modules/activation/activation.service.ts#L1348) | `activationEmail: cmd.activationEmail` in the first `tx.activation.update`, [`:1349-1357`](Apps/api/src/modules/activation/activation.service.ts#L1349-L1357) |
| **3** | **`scripts/load-mock-data.ts`** — seed | not a runtime path; `seedActivation(...)` at [`:345-352`](Apps/api/scripts/load-mock-data.ts#L345-L352) | both | n/a | **writes no `activationEmail` at all** today (R15) — see §9 Q3 |

**Exactly two runtime completion paths.** Both take the address from the same contract command,
unchanged by this set:
```ts
// Apps/contract/src/modules/activation/activation.command.ts
export const ActivateActivationSchema = z.object({ activationEmail: z.email() });
```
`z.email()` is **required and non-optional** — the picker must preserve that. It also rejects
leading/trailing whitespace, which is why §3 calls `trim()` belt-and-braces and `toLowerCase()`
the operative normalization.

Exhaustiveness was re-verified for this set by the same grep as Set 9 §2.2: every other
`ACTIVATED`/`ACTIVATED_BY_ADMIN` occurrence under `Apps/api/src` is a read filter, an enum member,
a presentation map, or the notification subscriber. Nothing else writes `activationEmail` — the
only other writers of `Activation` rows are `submit()`, `update()`, `additional()`, `take()`,
`flagWrong()`, `requestAdditional()`, `cancel()`, `release()`, `freeze()`, `cancelByAdmin()`,
`setPrice()` and (after Set 9) `setCost()`, none of which touch that column.

### 0.2 How `activationEmail` is captured today — both UIs

| Actor | Component | The input | Schema | Mutation |
|---|---|---|---|---|
| **Activator** | [`ActiveRequestCard.tsx:313-350`](Apps/web/src/components/sections/activator/ActiveRequestCard.tsx#L313-L350) — a `Dialog` behind the **Activate** button | free-text `<Input type="email">` at `:330`, `{...registerActivate("activationEmail")}` at `:335`, inline error at `:337-340` | `activateRequestSchema(t)` in [`activate-request.schema.ts`](Apps/web/src/components/sections/activator/activate-request.schema.ts) — `min(1) + .email()`, with a compile-time `AssertAssignable` guard against `ActivateActivationCommand` | `useActivateRequest()` |
| **Admin** | [`ResolveFreezeDialog.tsx:90-115`](Apps/web/src/pages/admin/components/ResolveFreezeDialog.tsx#L90-L115) — the `activate` variant of the freeze-resolution dialog | free-text `<Input type="email">` at `:91-99` | **the same** `activateRequestSchema` (imported from the activator folder) | caller-owned |

`ResolveFreezeDialog` is **presentational** and has *two* callers, both passing `AdminActivationDTO` rows:
- [`ActivationsTable.tsx:156-167`](Apps/web/src/pages/admin/activations/components/ActivationsTable.tsx#L156-L167) — the activations list
- [`FrozenActivationsTable.tsx:133`](Apps/web/src/pages/admin/components/FrozenActivationsTable.tsx#L133) — the admin dashboard's frozen widget

So: **one picker component, two call sites** (`ActiveRequestCard`, `ResolveFreezeDialog`) — and because both admin callers share the dialog, adding `subscriptionPlanId` to `AdminActivationDTO` covers all three entry surfaces with one DTO field. `ActivationDetailPage` does **not** render the dialog, so it needs nothing.

Read-only display sites for `activationEmail` (unaffected): `RecentActivationDTO` → admin dashboard `RecentActivationsTable.tsx:46` and activator `HistoryPage.tsx:135`; `ActivationDetailDTO.activationEmail` → detail page.

### 0.3 The settings tab shell (from Set 9)

[`SettingsPage.tsx`](Apps/web/src/pages/admin/settings/SettingsPage.tsx) — Radix `Tabs`, 4 tabs today, **5 after Set 9** (`admins`, `commission`, `plans`, `companies`, `planCosts`). Set 10 adds the **6th**, `activationEmails`. Each tab is a self-contained component under `pages/admin/settings/components/` owning its own hooks; Radix unmounts inactive `TabsContent`, so the pool query fires on first activation only. The `"Exactly 4 tabs"` comment is corrected by Set 9; Set 10 just bumps it again.

Nearest pattern for *this* tab (a paginated list + add modal + destructive confirm) is **`AdminAccountsTab.tsx`**, not `CommissionMatrixTab` — filters outside the loading branch, `useDebouncedValue` on search, `setPage(1)` on every filter change, `DataTable`, two-variant empty state, `SimplePagination`, an `AlertDialog` for the destructive action.

### 0.4 Reusable precedents

| Need | Precedent |
|---|---|
| A cross-module write that must join the caller's transaction | **`revokeCardWithin(tx, cardId, actorId)`** — exported from [`card.service.ts:32`](Apps/api/src/modules/card/card.service.ts#L32), called by `card.service.ts:243` **and** `card-revocation-request.service.ts:222`. §6.3 mirrors it exactly. |
| Soft delete | `Payment` uses `isDeleted + deletedDate`; `Card`/`Distributor`/`User` use `deletedAt`. D13 specifies `isDeleted + deletedAt` — the boolean from the first, the column name from the (dominant) second. |
| Upsert + log in one transaction | `SubscriptionPlanService.updateCommission` ([`:75-101`](Apps/api/src/modules/subscription-plan/subscription-plan.service.ts#L75-L101)) |
| Paginated admin list module | `card-revocation-request` (5-file backend module, 7-file contract module) |

---

## 1. Prisma

### 1.1 Exact model

```prisma
model SubscriptionPlan {
  …
  cost              SubscriptionPlanCost?   // Set 9
+ activationEmails  ActivationEmail[]
}
```

```prisma
+// Set 10 (D13). A pool of addresses the activator/admin picks from when completing an
+// activation. Scoped PER PLAN: the same address may serve several plans, each with its own
+// counter — hence the compound unique, not a unique on `email`.
+// Activation.activationEmail stays a PLAIN STRING with no FK to this table: an activation
+// records the address that was actually used, which may be free-typed and may later be
+// soft-deleted here. This table counts usage; it does not own the historical value.
+model ActivationEmail {
+  id                 String    @id @default(uuid())
+  subscriptionPlanId String
+  email              String // stored normalized: trimmed + lowercased (see the match rule)
+  nbOfActivation     Int       @default(0)
+  lastUsedAt         DateTime?
+  createdAt          DateTime  @default(now())
+  isDeleted          Boolean   @default(false)
+  deletedAt          DateTime?
+
+  subscriptionPlan SubscriptionPlan @relation(fields: [subscriptionPlanId], references: [id], onDelete: Cascade)
+
+  @@unique([subscriptionPlanId, email])
+  @@index([subscriptionPlanId, isDeleted, lastUsedAt])
+}
```

```prisma
enum LogActionType {
  …
  SET_SUBSCRIPTION_PLAN_COST   // Set 9
  CHANGE_ACTIVATION_COST       // Set 9
+ ADD_ACTIVATION_EMAIL
+ DELETE_ACTIVATION_EMAIL
}
```

**`Activation` is not in this diff. See §8.**

### 1.2 The indexes, and why

| Index | Serves |
|---|---|
| `@@unique([subscriptionPlanId, email])` | The identity of a pool entry, the `upsert` target for add/restore (§4), and the *matching* lookup in the completion path (§3) — an exact-equality probe on both columns. Because emails are stored normalized-lowercase, this index is usable by the match (a `mode: 'insensitive'` comparison would **not** be — it would force a sequential scan, which is the main reason normalization happens on write). |
| `@@index([subscriptionPlanId, isDeleted, lastUsedAt])` | **The picker's sort.** The picker's `where` is `{ subscriptionPlanId, isDeleted: false }` and its `orderBy` is `lastUsedAt asc nulls first, createdAt asc`. The two leading columns are equality predicates, so Postgres seeks straight to the plan's active rows, and `lastUsedAt` as the third column lets it read them already grouped by that key. It also serves the settings list, which filters by plan. |

**Honest caveat on the sort.** Postgres b-tree defaults `ASC` to `NULLS LAST`, and the picker wants `NULLS FIRST`; Prisma's schema language cannot express `NULLS FIRST` on an index (only on `orderBy`). So the index eliminates the *scan*, but Postgres may still add a small sort node on top, plus a second one for the `createdAt` tiebreaker. That is fine and intended: a per-plan active pool is a handful of rows — tens, not thousands. If it ever grows enough to matter, a hand-written `CREATE INDEX … (subscriptionPlanId, isDeleted, lastUsedAt ASC NULLS FIRST, createdAt)` can be added in a later migration without any code change.

### 1.3 Migration

**Name: `add_activation_email_pool`** → `npx prisma migrate dev --name add_activation_email_pool`.

Contents: `CREATE TABLE "ActivationEmail"` + the unique index + the composite index + the FK; `ALTER TYPE "LogActionType" ADD VALUE` ×2. **No `ALTER TABLE "Activation"`.**

---

## 2. The picker query

```ts
// ActivationEmailService.getPool(query)
const rows = await this.prisma.activationEmail.findMany({
  where: { subscriptionPlanId: query.subscriptionPlanId, isDeleted: false },
  orderBy: [
    { lastUsedAt: { sort: 'asc', nulls: 'first' } },  // never-used first (A4)
    { createdAt: 'asc' },                             // deterministic among never-used
  ],
  take: ACTIVATION_EMAIL_POOL_LIMIT,                  // module const, 100
});
```

- **Filter:** the activation's plan, `isDeleted: false`. A soft-deleted row is invisible here, in the settings list, and to the matcher (A5) — one rule, three queries, all three must be checked (manual test 8).
- **Sort:** `{ sort: 'asc', nulls: 'first' }` is written **explicitly** because Prisma/Postgres would otherwise put the never-used rows *last* (A4's implementation note). `createdAt asc` breaks ties so the order is stable between two opens of the same picker — without it, several never-used rows all compare equal and Postgres may return them in any order.
- **Pagination: no.** The picker is a chooser, not a browser: it must present the *whole* ordered pool so "the first option is the least-recently-used address" is true, and a per-plan pool is small by construction. Instead of pages it carries a hard `take` cap (`ACTIVATION_EMAIL_POOL_LIMIT = 100`, a named constant, no magic number) so a runaway pool can never blow up the payload or the `<Select>`. If a plan ever legitimately exceeds 100 addresses, that is a product conversation, not a pagination bug.
- The **settings list** (`GET_ALL`) *is* paginated — different route, different DTO, different audience. §5.2.

---

## 3. The match-and-increment rule

### 3.1 Normalization

```
normalize(input: string): string = input.trim().toLowerCase()
```
- Applied **on write** when a pool row is added or restored → every stored `email` is canonical.
- Applied **to the submitted address** before matching.
- Therefore the comparison is plain equality on the compound unique index — **not** Prisma's
  `mode: 'insensitive'`, which would be both redundant and index-defeating.
- `trim()` is defence in depth: `z.email()` on both `ActivateActivationSchema` and
  `CreateActivationEmailSchema` already rejects surrounding whitespace, so in practice the
  operative step is `toLowerCase()`.
- The compound unique now also does real work: `Foo@x.com` and `foo@x.com` cannot both exist for
  the same plan.

### 3.2 The rule, as pseudocode

```
// consumeActivationEmailWithin(tx, { subscriptionPlanId, email, now })
// Exported from activation-email.service.ts. Called by BOTH completion paths, INSIDE the
// transaction they already open. Never called outside a transaction.

function consumeActivationEmailWithin(tx, { subscriptionPlanId, email, now }):
    normalized = normalize(email)                       // trim + lowercase

    row = tx.activationEmail.findUnique({
            where: { subscriptionPlanId_email: { subscriptionPlanId, email: normalized } }
          })

    if (row is null)            return    // free address, not in the pool — do nothing
    if (row.isDeleted === true) return    // A5: soft-deleted rows NEVER match, NEVER restore

    tx.activationEmail.update({
      where: { id: row.id },
      data:  { nbOfActivation: { increment: 1 }, lastUsedAt: now }
    })
```

- **What it matches against:** active (`isDeleted === false`) rows of **this activation's plan
  only**. The same address in another plan's pool is a different row with its own counter and is
  not touched.
- **On no match:** nothing happens. `Activation.activationEmail` is written normally with the
  submitted address, and **no pool row is created** (A5 — do not "helpfully" auto-add it).
- **On a soft-deleted match:** also nothing — no increment, and no implicit restore. Restoring is
  an explicit admin action in settings (§4).
- **`{ increment: 1 }`, not a read-modify-write.** Two activations completing on the same address
  concurrently must both count.
- **Transaction:** the fetch and the update both use the `tx` client passed in, so they run **in
  the same transaction as the activation completion**. If the completion rolls back, the counter
  rolls back with it; if the counter update fails, the activation does not complete. There is no
  path where an activation is marked `ACTIVATED` while its pool counter silently didn't move.
- `now` is the **same `Date` object** the completion path already uses for `completedAt`, passed
  in — not a second `new Date()` — so `lastUsedAt` and `completedAt` agree exactly.

### 3.3 Where it hooks into each completion path

| # | Path | Insertion point |
|---|---|---|
| **1** | `activate()` | Inside the `$transaction` at [`activation.service.ts:768`](Apps/api/src/modules/activation/activation.service.ts#L768), **immediately after** the first `tx.activation.update` (`:769-777`) and before the `tx.card.update`. Plan id: `activation.card.subscriptionPlanId`. Email: `cmd.activationEmail`. `now`: the existing `const now` from `:761`. |
| **2** | `activateByAdmin()` | Inside the `$transaction` at [`activation.service.ts:1348`](Apps/api/src/modules/activation/activation.service.ts#L1348), immediately after the first `tx.activation.update` (`:1349-1357`). Plan id: `activation.card.subscriptionPlanId`. `now`: the existing `const now` from `:1343`. |
| **3** | seed | §9 Q3 |

```
 await this.prisma.$transaction(async (tx) => {
   const cost = await this.resolvePlanCost(tx, activation.card.subscriptionPlanId);   // Set 9
   await tx.activation.update({ where: { id }, data: { …, activationEmail: cmd.activationEmail, activationCost: cost, … } });
+  await consumeActivationEmailWithin(tx, {
+    subscriptionPlanId: activation.card.subscriptionPlanId,
+    email: cmd.activationEmail,
+    now,
+  });
   await tx.card.update({ … });
   …
 });
```

**`Activation.activationEmail` keeps the submitted string exactly as sent** — not lowercased.
Matching is case-insensitive via normalization of the *comparison*, but the historical record
shows what the operator actually typed. See §9 Q1 if you want the stored value canonicalised too.

---

## 4. Restore-on-re-add, and the unique-constraint failure mode

```
// ActivationEmailService.create(cmd, actorId)
email = normalize(cmd.email)

plan = prisma.subscriptionPlan.findUnique({ where: { id: cmd.subscriptionPlanId } })
if (!plan) throw new NotFoundError('Subscription plan not found')

try {
  row = await prisma.$transaction(async (tx) => {
    existing = await tx.activationEmail.findUnique({
                 where: { subscriptionPlanId_email: { subscriptionPlanId: cmd.subscriptionPlanId, email } } })

    if (existing && !existing.isDeleted)
      throw new ConflictError('This email is already in the pool for this plan')

    const isRestore = existing !== null            // existing && existing.isDeleted

    const saved = await tx.activationEmail.upsert({
      where:  { subscriptionPlanId_email: { subscriptionPlanId: cmd.subscriptionPlanId, email } },
      create: { subscriptionPlanId: cmd.subscriptionPlanId, email },
      update: { isDeleted: false, deletedAt: null },     // nbOfActivation and lastUsedAt UNTOUCHED
    })

    await tx.log.create({ data: {
      actionType: LogActionType.ADD_ACTIVATION_EMAIL,
      actionDescription: isRestore
        ? `Restored activation email ${email} for plan ${cmd.subscriptionPlanId} (previous usage count ${existing.nbOfActivation} preserved)`
        : `Added activation email ${email} for plan ${cmd.subscriptionPlanId}`,
      userId: actorId,
    }})

    return saved
  })
} catch (err) {
  if (err is PrismaClientKnownRequestError && err.code === 'P2002')
    throw new ConflictError('This email is already in the pool for this plan')
  throw err
}
```

- **Restore semantics (A6):** flips `isDeleted → false` and `deletedAt → null`, and **leaves
  `nbOfActivation`, `lastUsedAt` and `createdAt` exactly as they were.** The row comes back with
  its history — which is why the log description says so; a counter of 7 reappearing out of
  nowhere is otherwise unexplainable from the audit trail alone.
- **`upsert` on the compound unique, not find-then-`create`/`update`.** Two admins adding the same
  address simultaneously can't both insert.
- **The exact error, both ways:** a duplicate of an *active* row is rejected up front with
  **`ConflictError`** → HTTP **409**, `ErrorCode.RESOURCE_CONFLICT`, message *"This email is
  already in the pool for this plan"*. If the pre-check loses a race and Postgres raises the unique
  violation itself, Prisma throws `P2002` and the catch converts it to **the identical
  `ConflictError`** — the client sees one error for one condition, never a raw 500. (`ConflictError`
  already exists in `@common/errors`; no new error class.)

**Delete** — soft, and the only mutation of `isDeleted` other than restore:
```
row = prisma.activationEmail.findUnique({ where: { id } })
if (!row || row.isDeleted) throw new NotFoundError('Activation email not found')
$transaction:
  tx.activationEmail.update({ where: { id }, data: { isDeleted: true, deletedAt: new Date() } })
  tx.log.create({ actionType: DELETE_ACTIVATION_EMAIL,
                  actionDescription: `Deleted activation email ${row.email} for plan ${row.subscriptionPlanId} (usage count ${row.nbOfActivation})`,
                  userId: actorId })
```
Deleting an already-deleted row is a **404**, not a silent success.

---

## 5. Contract

New module `Apps/contract/src/modules/activation-email/` — 5 content files + barrel. **No
`enums.ts`** (no fixed value set of its own) and **no `events.ts`** (nothing on the bus). It
imports from no other contract module, so it cannot introduce a cycle (R13); `madge --circular src`
stays clean.

### 5.1 `activation-email.routes.ts`
```ts
export const ACTIVATION_EMAIL_ROUTES = {
  BASE: '/activation-emails',
  GET_ALL: '/',        // settings list — ADMIN, paginated
  GET_POOL: '/pool',   // picker      — ADMIN + ACTIVATOR, unpaginated, plan-scoped
  CREATE: '/',
  DELETE: '/:id',
} as const;
```
Two read routes rather than one with a flag: the audiences, the guards, the shapes and the
pagination all differ, and a single route serving both would have to leak the settings columns to
activators.

### 5.2 `activation-email.dtos.ts`
```ts
export const ActivationEmailResponseSchema = z.object({   // settings row
  id: z.uuid(),
  subscriptionPlanId: z.uuid(),
  planLabel: z.string(),
  email: z.string(),
  nbOfActivation: z.number().int(),
  lastUsedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});
export type ActivationEmailDTO = z.infer<typeof ActivationEmailResponseSchema>;

export const PaginatedActivationEmailsSchema = paginated(ActivationEmailResponseSchema);
export type PaginatedActivationEmails = z.infer<typeof PaginatedActivationEmailsSchema>;

export const ActivationEmailOptionResponseSchema = z.object({   // picker option
  id: z.uuid(),
  email: z.string(),
  nbOfActivation: z.number().int(),
  lastUsedAt: z.iso.datetime().nullable(),
});
export type ActivationEmailOptionDTO = z.infer<typeof ActivationEmailOptionResponseSchema>;
```
`isDeleted`/`deletedAt` appear in **no** DTO — an internal flag (contract-rules §3.5), and every
route already filters on it. `email` is `z.string()`, not `z.email()`: it is an echo of stored
data, and a DTO that can fail `.parse()` on legacy data is a liability; validation belongs on the
inbound command.

### 5.3 `activation-email.command.ts` / `activation-email.query.ts`
```ts
export const CreateActivationEmailSchema = z.object({
  subscriptionPlanId: z.uuid(),
  email: z.email(),
});
export type CreateActivationEmailCommand = z.infer<typeof CreateActivationEmailSchema>;

export const GetActivationEmailsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  subscriptionPlanId: z.uuid().optional(),
  search: z.string().optional(),
});
export const GetActivationEmailPoolQuerySchema = z.object({ subscriptionPlanId: z.uuid() });
export const ActivationEmailIdParamsSchema = z.object({ id: z.uuid() });
```
(+ the four `z.infer` types, + a barrel `index.ts` `export *`-ing all five files, + the module
added to `src/index.ts`.)

### 5.4 Changes to existing contract modules

- **`modules/log/log.enums.ts`** += `ADD_ACTIVATION_EMAIL`, `DELETE_ACTIVATION_EMAIL` (byte-identical to prisma).
- **`modules/activation/activation.dtos.ts`** (U1):
  - `ActiveRequestResponseSchema` += `subscriptionPlanId: z.uuid()`
  - `AdminActivationResponseSchema` += `subscriptionPlanId: z.uuid()`

  Both with a comment naming the reason: *the completion picker is scoped to the activation's
  plan, and the composed `subscriptionLabel` string cannot be used as a key.* Not added to
  `DistributorActivationDTO` (Set 7's DELIBERATELY ABSENT list is about money and identity, but
  the distributor has no completion flow, so it has no use for it), nor to the pool/public DTOs.
- **No change to `ActivateActivationSchema`.** The command is still `{ activationEmail: z.email() }` —
  the picker is a UI affordance over the same field, and a free-typed address must remain
  indistinguishable at the wire from a picked one.

---

## 6. Backend

### 6.1 The module — `Apps/api/src/modules/activation-email/`

Full 5-file pattern: `activation-email.mapper.ts` · `.interface.ts` · `.service.ts` ·
`.controller.ts` · `.routes.ts`. Registered in `modules/index.ts`:
```ts
moduleRouter.use(ACTIVATION_EMAIL_ROUTES.BASE, activationEmailRouter);
```

**Mapper** — `toDTO(row, plan)` (`planLabel` via the existing `composeSubscriptionLabel` from
`@modules/set/set.mapper`, the same import `activation.mapper.ts` already uses) and
`toOptionDTO(row)`; both `.parse()` on the way out.

**Interface**
```ts
export interface IActivationEmailService {
  getAll(query: GetActivationEmailsQuery): Promise<PaginatedActivationEmails>;
  getPool(query: GetActivationEmailPoolQuery): Promise<ActivationEmailOptionDTO[]>;
  create(cmd: CreateActivationEmailCommand, actorId: string): Promise<ActivationEmailDTO>;
  delete(id: string, actorId: string): Promise<void>;
}
```

**Service** — `getAll` is the standard `where`-spread + `Promise.all([findMany, count])` +
`paginate` shape used by every list in this codebase, with `isDeleted: false` **always** in the
`where` (never optional, never overridable by a query param), `search` on `email` (`contains`,
`mode: 'insensitive'` is fine here — this is a human search, not the matcher), ordered
`createdAt desc`. `getPool` is §2. `create`/`delete` are §4.

**Controller** — four handlers, all `try { … sendSuccess(res, result) } catch (e) { next(e) }`;
`create` returns 201; `delete` returns `sendSuccess(res, null, 200)` (matching how the other
soft-delete controllers respond). Actor is `req.user!.id`.

### 6.2 Guards

```ts
const adminOnly       = requireAuth({ roles: [UserRole.ADMIN] });
// The picker is used by the activator's own Activate flow and the admin's resolve-freeze flow.
// Pool addresses are operational data, not credentials — but this is the ONLY route on this
// module an activator may reach.
const adminOrActivator = requireAuth({ roles: [UserRole.ADMIN, UserRole.ACTIVATOR] });

activationEmailRouter.get(ACTIVATION_EMAIL_ROUTES.GET_POOL, adminOrActivator,
  validateRequest({ query: GetActivationEmailPoolQuerySchema }), controller.getPool);      // static first
activationEmailRouter.get(ACTIVATION_EMAIL_ROUTES.GET_ALL, adminOnly,
  validateRequest({ query: GetActivationEmailsQuerySchema }), controller.getAll);
activationEmailRouter.post(ACTIVATION_EMAIL_ROUTES.CREATE, adminOnly,
  validateRequest({ body: CreateActivationEmailSchema }), controller.create);
activationEmailRouter.delete(ACTIVATION_EMAIL_ROUTES.DELETE, adminOnly,
  validateRequest({ params: ActivationEmailIdParamsSchema }), controller.delete);
```
`/pool` is registered before `/:id`; no `DISTRIBUTOR` role appears anywhere on this module.

| Route | ADMIN | ACTIVATOR | DISTRIBUTOR |
|---|---|---|---|
| `GET /activation-emails` (settings) | ✅ | ❌ 403 | ❌ 403 |
| `GET /activation-emails/pool` (picker) | ✅ | ✅ | ❌ 403 |
| `POST /activation-emails` | ✅ | ❌ 403 | ❌ 403 |
| `DELETE /activation-emails/:id` | ✅ | ❌ 403 | ❌ 403 |

### 6.3 The increment hook — one exported function, two call sites

```ts
// activation-email.service.ts, above the class — mirrors card.service.ts's revokeCardWithin
export async function consumeActivationEmailWithin(
  tx: Prisma.TransactionClient,
  args: { subscriptionPlanId: string; email: string; now: Date },
): Promise<void> { /* §3.2 */ }
```
`activation.service.ts` imports it as `@modules/activation-email/activation-email.service` and
calls it at the two points in §3.3. Module→module imports are established practice
(`card-revocation-request.service.ts:19` imports `revokeCardWithin`; `activation.mapper.ts:29-30`
imports from `set.mapper`/`card.mapper`); the `common/` → `modules/` prohibition is not engaged.
`activation-email.service.ts` imports nothing from `activation`, so there is no cycle.

**Why a shared function rather than inlining the logic twice:** the normalization rule, the
active-only rule and the increment must be *identical* in both paths. One function is one place to
get it right and one place to review — the same reasoning that made `revokeCardWithin` shared.

### 6.4 Audit-log writes

| Action | `LogActionType` | Site | In transaction? |
|---|---|---|---|
| Add an address (or restore a soft-deleted one) | `ADD_ACTIVATION_EMAIL` | `ActivationEmailService.create` | **Yes** — and the description distinguishes *added* from *restored* (A6) |
| Soft-delete an address | `DELETE_ACTIVATION_EMAIL` | `ActivationEmailService.delete` | **Yes** — description carries the usage count at deletion time |

The **increment writes no log row.** It is an automatic side effect of completing an activation,
not an admin action; the activation's own `ActivationStep` records the event, and a log row per
activation would drown the audit trail.

### 6.5 Mapper changes in the activation module (U1)

`ActivationPlanJoin` ([`activation.mapper.ts:55`](Apps/api/src/modules/activation/activation.mapper.ts#L55)) widens from
`Pick<SubscriptionPlan, 'subscriptionType' | 'subscriptionDuration'>` to include `'id'`;
`toActiveRequestDTO` and `toAdminActivationDTO` emit `subscriptionPlanId: plan.id`.
**No query changes** — every call site already loads the plan with `include: { subscriptionPlan: true }`
(`ACTIVE_REQUEST_INCLUDE` at `activation.service.ts:85-97`, and the admin `getAll`/`activateByAdmin`/
`cancelByAdmin`/`setPrice`/`setCost` includes), so the `id` is already in memory.

---

## 7. Frontend

### 7.1 Service / hooks / query keys

- **`services/activation-emails.service.ts`** (new): `getAll(query, signal)`, `getPool(subscriptionPlanId, signal)`, `create(command)`, `remove(id)` — one axios instance, routes from `ACTIVATION_EMAIL_ROUTES` via `apiPath`/`withParams`, envelope unwrapped with the codebase's defensive `if (!res.data.success) throw`.
- **`lib/query-keys.ts`** +=
  ```ts
  activationEmails: {
    all: () => ["activation-emails"] as const,
    listAll: () => ["activation-emails", "list"] as const,
    list: (query: GetActivationEmailsQuery) => ["activation-emails", "list", query] as const,
    pool: (subscriptionPlanId: string) => ["activation-emails", "pool", subscriptionPlanId] as const,
  },
  ```
- **`hooks/useActivationEmails.ts`** (new): `useActivationEmails(query)`, `useActivationEmailPool(subscriptionPlanId)`, `useAddActivationEmail()`, `useDeleteActivationEmail()`. Both mutations invalidate `qk.activationEmails.all()` (sweeping the list *and* every cached pool, since a deleted address must vanish from the picker too).
- The pool query uses `staleTime: 0` so that reopening the picker after a completion reflects the new ordering (manual test 3).

### 7.2 The settings tab

**`SettingsPage.tsx`**: 6th trigger/content pair, `value="activationEmails"`, after `planCosts`. Update the tab-count comment.

**`components/ActivationEmailsTab.tsx`** — modelled on `AdminAccountsTab`:
- Toolbar **outside** the loading/error branches: plan `<Select>` filter, debounced search `<Input>`, **Add email** `<Button>`. Every filter change calls `setPage(1)`.
- `useActivationEmails({ page, limit: 10, subscriptionPlanId, search })`; `isLoading → <TableSkeleton rows={5} columns={5} />`; `isError → <NotFoundState … />` + retry.
- `DataTable` columns: **Plan** (`planLabel`) · **Email** · **Usage count** (`nbOfActivation`) · **Last used** (`formatDateTime` or `—`) · **Actions** (a `Trash2` icon button opening an `AlertDialog`).
- Two-variant `EmptyState` (no rows at all vs. no match + a clear-filters button), `SimplePagination` below.
- `renderMobileRow`: email + plan on one line, count on the other.

**`components/AddActivationEmailModal.tsx`** + **`add-activation-email.schema.ts`**: a `Dialog` with a plan `<Select>` (from `useSubscriptionPlans({ active: true })`) and an email `<Input type="email">`; Zod schema `{ subscriptionPlanId: z.string().min(1, required), email: z.string().min(1, required).email(invalid) }` with the `AssertAssignable` compile-time guard against `CreateActivationEmailCommand`, mirroring `add-*.schema.ts` siblings. A 409 from the server surfaces through the global mutation-cache toast — **plus** an inline message under the email field for the "already in the pool" case, since that is a correctable user error rather than a system failure.

**Delete** is an `AlertDialog` confirm carrying a body that states the deletion is reversible by re-adding, and that existing activations keep showing the address.

### 7.3 The picker — ONE component, TWO call sites

**`components/shared/ActivationEmailPicker.tsx`**

```tsx
interface Props {
  subscriptionPlanId: string;
  value: string;
  onChange: (email: string) => void;
  error?: string | undefined;
  id?: string;
}
```

Behaviour:
- Calls `useActivationEmailPool(subscriptionPlanId)` itself (Component → Hook → Service; a shared component owning its own query is the same arrangement `CommissionMatrixTab` and every self-contained tab uses). **No `useEffect` fetching.**
- Local `mode` state, `"pool" | "free"`. Initial mode is `"pool"` when the query returns a non-empty pool, `"free"` when the pool is empty or the query errored — so the field is *always* usable.
- **Pool mode:** a `<Select>` (the Shadcn primitive already in `components/ui/`) with one `SelectItem` per option — the address, plus a muted suffix reading *"never used"* or *"used {count}×"*. Choosing one calls `onChange(option.email)`. Below it, a small ghost button **"Type another address"** → `mode = "free"`.
- **Free mode:** an `<Input type="email">` bound to `value`/`onChange`, with a ghost button **"Choose from the list"** back to pool mode (hidden when the pool is empty).
- **Loading:** a `<Skeleton className="h-9 w-full" />` in place of the control — the dialog's buttons and copy stay put.
- **Error:** falls back to free mode with a muted inline note ("couldn't load the list — type the address"). A pool that fails to load must never block a completion.
- `error` renders beneath in the caller's existing `text-destructive` style; `aria-invalid`/`aria-describedby` are preserved from the current inputs.
- All strings from `translations.json` — no inline text.

**Call site 1 — activator**, [`ActiveRequestCard.tsx:326-341`](Apps/web/src/components/sections/activator/ActiveRequestCard.tsx#L326-L341): the free-text `<Input {...registerActivate("activationEmail")}>` is replaced by the picker wrapped in RHF's `Controller` (already a dependency), field name unchanged. `subscriptionPlanId={req.subscriptionPlanId}` (new DTO field, §5.4). `activateRequestSchema` and the mutation are unchanged.

**Call site 2 — admin**, [`ResolveFreezeDialog.tsx:91-108`](Apps/web/src/pages/admin/components/ResolveFreezeDialog.tsx#L91-L108): identical replacement, plus a new **required** prop `subscriptionPlanId: string`. Its two callers pass it from the row they already hold:
- `ActivationsTable.tsx:156-167` → `resolveRow.row.subscriptionPlanId`
- `FrozenActivationsTable.tsx:133` → the same field on its `AdminActivationDTO` row

Because both admin callers go through this one dialog, **the picker itself has exactly two call sites** while covering three entry surfaces. Do not build a second picker for the admin.

### 7.4 Translation keys

| Key | en | fr |
|---|---|---|
| `admin.settings.tabs.activationEmails` | Activation Emails | E-mails d'activation |
| `admin.settings.activationEmails.note` | Addresses offered when completing an activation on the matching plan. | Adresses proposées lors de l'achèvement d'une activation sur la formule correspondante. |
| `admin.settings.activationEmails.filters.plan` | All plans | Toutes les formules |
| `admin.settings.activationEmails.search.placeholder` | Search by email | Rechercher par e-mail |
| `admin.settings.activationEmails.table.plan` | Plan | Formule |
| `admin.settings.activationEmails.table.email` | Email | E-mail |
| `admin.settings.activationEmails.table.usageCount` | Usage count | Nombre d'utilisations |
| `admin.settings.activationEmails.table.lastUsed` | Last used | Dernière utilisation |
| `admin.settings.activationEmails.table.actions` | Actions | Actions |
| `admin.settings.activationEmails.empty.noEmails` | No activation emails yet — add one to start building the pool. | Aucun e-mail d'activation pour le moment — ajoutez-en un pour constituer le pool. |
| `admin.settings.activationEmails.empty.noMatch` | No activation emails match your filters. | Aucun e-mail d'activation ne correspond à vos filtres. |
| `admin.settings.activationEmails.add.title` | Add Activation Email | Ajouter un e-mail d'activation |
| `admin.settings.activationEmails.add.plan` | Plan | Formule |
| `admin.settings.activationEmails.add.email` | Email | E-mail |
| `admin.settings.activationEmails.add.duplicate` | This email is already in the pool for this plan. | Cet e-mail est déjà dans le pool de cette formule. |
| `admin.settings.activationEmails.deleteConfirm.title` | Delete this activation email? | Supprimer cet e-mail d'activation ? |
| `admin.settings.activationEmails.deleteConfirm.body` | It disappears from the settings list and from the picker. Activations that already used it keep showing it, and re-adding it later restores its usage count. | Il disparaît de la liste des paramètres et du sélecteur. Les activations qui l'ont déjà utilisé continuent de l'afficher, et le rajouter plus tard restaure son nombre d'utilisations. |
| `common.activationEmailPicker.label` | Activation email | E-mail d'activation |
| `common.activationEmailPicker.fromPool` | Choose from the list | Choisir dans la liste |
| `common.activationEmailPicker.typeAnother` | Type another address | Saisir une autre adresse |
| `common.activationEmailPicker.neverUsed` | never used | jamais utilisé |
| `common.activationEmailPicker.usedCount` | used {count}× | utilisé {count}× |
| `common.activationEmailPicker.empty` | No addresses in the pool for this plan. | Aucune adresse dans le pool pour cette formule. |
| `common.activationEmailPicker.loadError` | Couldn't load the list — type the address. | Impossible de charger la liste — saisissez l'adresse. |

Reused unchanged: `activator.requests.card.activationEmailPlaceholder`, `common.actions.{add,cancel,confirm,delete,clear,tryAgain}`, `common.validation.{required,invalidEmail}`, `admin.dashboard.sectionError*`.

---

## 8. Confirmation: `Activation` is unmodified

**In writing, for the record:**

1. **`model Activation` in `schema.prisma` is not touched by Set 10.** No new column, no changed column, no new index, no new relation field. It has no `activationEmails` back-relation and no relation of any kind to `ActivationEmail`.
2. **`Activation.activationEmail` stays `String?`** — a plain string. **No FK**, no `@relation`, no `activationEmailId`, not even a nullable one.
3. **The Set 10 migration contains no `ALTER TABLE "Activation"`** (§1.3). Its statements are `CREATE TABLE "ActivationEmail"`, its two indexes, its one FK to `SubscriptionPlan`, and two `ALTER TYPE "LogActionType" ADD VALUE`.
4. **The value written to `Activation.activationEmail` is unchanged** — still `cmd.activationEmail`, verbatim, on both completion paths. Normalization applies only to the *comparison* and to what is stored in the pool table (§3.1, §9 Q1).
5. **What Set 10 *does* add to the activation module** is confined to the contract and the mapper: `subscriptionPlanId` on `ActiveRequestDTO` and `AdminActivationDTO`, sourced from the already-loaded `card.subscriptionPlan.id` (§5.4, §6.5), plus the two `consumeActivationEmailWithin` call lines inside existing transactions (§3.3). **None of that is a change to the `Activation` model or to any `Activation` column.**
6. The only column Set 10 writes on `Activation` is the one that was already being written: `activationEmail`, by the two pre-existing completion paths.

---

## 9. Open questions

| # | Question | My recommendation |
|---|---|---|
| **Q1** | Should `Activation.activationEmail` store the **normalized** (lowercased) address, or the address exactly as typed? | **As typed.** It is a historical record of what the operator entered, matching is case-insensitive regardless, and normalizing it would be a behaviour change to `Activation` data in a set whose defining constraint is "don't touch Activation". Cost: two activations can display the same address in different cases. Say the word if you'd rather canonicalise. |
| **Q2** | Should the picker's options show the **usage count** to activators, or only to admins? | **Show it to both.** It explains the ordering ("why is this one first?") and there is nothing sensitive about it. Trivial to hide later behind a prop if you disagree. |
| **Q3** | `scripts/load-mock-data.ts` writes **no `activationEmail` at all** on seeded completed activations (R15), so a fresh seed has an empty pool and blank emails on historical rows. Update it? | **Yes** — seed 3–4 pool addresses per plan (one of them soft-deleted, so the "hidden everywhere" behaviour is visible without hand-editing the DB), and give seeded completed activations an `activationEmail` drawn from their plan's pool with matching `nbOfActivation`/`lastUsedAt`. Confirm before I write it; it is the one file outside prisma/contract/api/web this set touches. |
| **Q4** | Should the settings list have a **"show deleted"** toggle for admins? | **No.** D13 says soft-deleted rows are hidden from *every* list. Re-adding the address is the documented way to bring one back, and the log rows record the history. Adding a reveal toggle would create a fourth place the `isDeleted` rule must be honoured. |
| **Q5** | Should an activator be able to see the pool for a plan they have **no active request on**? | The recommended route (`GET /pool?subscriptionPlanId=`) permits it — any activator can list any plan's pool. **Accept it.** Pool addresses are operational, not sensitive; scoping the route per-activation would cost a join on every picker open (the alternative you already rejected in planning) for no real confidentiality gain. |
| **Q6** | Frozen tests: the contract conformance suites, the activator `requests`/`settings` component tests and the MSW handlers will break on the new DTO field, the new module and the new tab. | Expected and out of scope (R11). Not touched, not fixed, reported. |

---

## 10. Manual test checklist

Run against a reseeded DB, with Set 9 already applied. `mockadmin` / `Password123!`.

1. **Migration applied.** `npx prisma migrate status` shows `add_activation_email_pool`; `\d "ActivationEmail"` shows both indexes and the FK. `\d "Activation"` is **byte-identical to before this set** apart from Set 9's `activationCost` — confirm no new column, no new FK (§8).
2. **Add three emails for one plan.** Settings → **Activation Emails** → Add ×3 on the same plan. All three appear with **usage count 0** and an empty *Last used*.
3. **The picker is plan-scoped.** As the activator, take and complete a request on that plan. The Activate dialog offers a list containing exactly those three addresses — and nothing from any other plan.
4. **Pick one → counter and ordering move.** Choose the second address, complete. Settings shows it at **count 1** with a *Last used* timestamp. Reopen a picker for the same plan: that address is now **last**.
5. **Never-used sorts first.** Complete another activation on the same plan: the picker's first option is one of the still-unused addresses.
6. **Free address, no match.** Type `nobody@example.com` (not in any pool) and complete. The activation saves and shows that address; the settings list is unchanged and **no new row was created**.
7. **Free address that IS in the pool, wrong case.** Type the third pool address with different capitalisation (`FOO@Bar.com` for `foo@bar.com`) and complete. That pool row's count increments by 1 — case-insensitive matching works.
8. **Soft delete hides it everywhere.** Delete one address in settings. It is gone from the settings list **and** from the picker (check both). An earlier activation that used it still displays it on `/admin/activations/:id` and in the activator's history.
9. **A deleted address never matches.** Free-type the deleted address on a new completion. The activation saves; the deleted row's counter does **not** move and it is **not** restored.
10. **Re-add restores with the counter.** Add that same address for that same plan again. The row returns with its **previous usage count and last-used date intact**, and the log row says *restored*, naming the preserved count.
11. **Duplicate of an active row is rejected.** Try adding an address that is already active on that plan → **409**, inline "already in the pool" message, no second row.
12. **Same address, different plan.** Add the same address to a *different* plan. A **separate row with its own counter** appears; completing on plan A does not move plan B's counter.
13. **Admin completion path.** Freeze an activation from the activator portal, resolve it from the admin dashboard's frozen widget **and** (on another one) from `/admin/activations` row menu → Activate. **Both** show the picker, both scoped to the right plan, both increment on a pool pick — this is the path most likely to be missed.
14. **Log rows.** `/admin/logs` shows `ADD_ACTIVATION_EMAIL` (add and restore, with different descriptions) and `DELETE_ACTIVATION_EMAIL` with the usage count.
15. **Guards.** As an activator: `GET /api/v1/activation-emails/pool?subscriptionPlanId=…` → **200**; `GET /api/v1/activation-emails`, `POST`, `DELETE` → **403**. As a distributor: all four → **403**.
16. **Empty pool and offline.** (a) Complete an activation on a plan with **no** pool addresses: the picker shows the free-text input with the "no addresses" note and the activation completes normally. (b) Throttle to offline and open the Activate dialog: the field falls back to free text with the load-error note; the dialog's buttons and copy are still laid out correctly.
17. **Validation still bites.** Submit the Activate dialog with an empty field, and with `not-an-email`: both are blocked client-side with the existing messages, and the API rejects the same values with **400 `VALIDATION_ERROR`**.
18. **i18n.** Toggle EN/FR: the tab, every column, the add modal, the delete confirm and every picker string translate. No raw keys, no untranslated English in FR.

---

## 11. Definition of done (CLAUDE.md)

- `npx tsc --noEmit` clean in `Apps/contract`, `Apps/api`, `Apps/web`
- eslint clean in all three
- `npx madge --circular src` clean in `Apps/contract` (new module imports no other contract module)
- Migration `add_activation_email_pool` created **and applied**
- **`model Activation` unchanged** — verify with `git diff Apps/api/prisma/schema.prisma` and confirm the only hunks are the new model, the `SubscriptionPlan` back-relation, and the two enum values
- No test file created, modified, deleted or run — verified with `git status`
- No magic strings in changed files
- Execution report + this checklist under `Docs/Stage-04-fix/results/set-10/`
- **Stop. Do not start Set 11.**
