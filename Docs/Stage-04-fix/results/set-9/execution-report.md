# Set 9 — Execution Report

**Implemented exactly per** `Docs/Stage-04-fix/plan/set-9-plan.md`. Order: prisma → contract → backend → frontend.
**Date:** 2026-08-10 · **Branch:** `version-02-01`

---

## Migration

**Name:** `20260810140841_add_activation_cost_and_plan_cost`
**Created and applied** via `npx prisma migrate dev --name add_activation_cost_and_plan_cost` against `postgresql://user:password@localhost:5432/setvision_test`.

Contents (matches the plan's §1.1/§1.3 exactly):
- `CREATE TABLE "SubscriptionPlanCost"` (`id`, `subscriptionPlanId` unique, `cost Decimal(12,2)?`, `createdAt`, `updatedAt`) + unique index + FK to `SubscriptionPlan` (`onDelete: Cascade`)
- `ALTER TABLE "Activation" ADD COLUMN "activationCost" DECIMAL(12,2) DEFAULT 0` — backfills every existing row to `0`
- `ALTER TYPE "LogActionType" ADD VALUE 'SET_SUBSCRIPTION_PLAN_COST'` / `'CHANGE_ACTIVATION_COST'`

No index was added beyond the plan or Table 1.2 in the plan (the `@unique` on `subscriptionPlanId` covers both the upsert target and the completion-time lookup; no redundant `@@index`).

---

## THE COMPLETION PATH INVENTORY — stamped, confirmed one by one

Per the plan's §2, there are exactly two runtime completion paths plus the seed script.

| # | Path | Stamped? | Where |
|---|---|---|---|
| **1** | `ActivationService.activate()` | ✅ **Yes** | `resolvePlanCost(tx, subscriptionPlanId)` called inside the `$transaction`, result written unconditionally as `activationCost: cost` in the same `tx.activation.update` that sets `activationStat: ACTIVATED` — [activation.service.ts](Apps/api/src/modules/activation/activation.service.ts) `activate()`. |
| **2** | `ActivationService.activateByAdmin()` | ✅ **Yes** | Identical pattern inside its own `$transaction`; the resolved `cost` is also folded into the returned DTO's spread (`{ ...activation, activationCost: cost, ... }`) so the response echoes the stamped value, not the pre-update `0` — `activateByAdmin()`. |
| **3** | `scripts/load-mock-data.ts` | ⚠️ **Not updated — flagged, see Open Questions Q3** | Per CLAUDE.md, seed-script gaps are reported, not silently fixed without confirmation; this was Q3 in the plan and is still open. Seeded completed activations will read `activationCost = 0`. |

Both runtime paths write the cost **unconditionally** (never the `...(price && {})` conditional-spread pattern that leaves `activationPrice` null) — confirmed by reading the diff back after editing.

`resolvePlanCost` reads `SubscriptionPlanCost` **inside** the same transaction as the completion, on the activation's own `card.subscriptionPlanId`, and returns `Prisma.Decimal(0)` when no row exists — never `null`, never a skipped write.

**Snapshot guarantee:** nothing else in the codebase writes `Activation.activationCost` except these two paths and the new `setCost()` admin action. `SubscriptionPlanCost` edits (`updateCost`) never touch any `Activation` row.

---

## Files changed

### Prisma
- `Apps/api/prisma/schema.prisma` — `SubscriptionPlanCost` model, `SubscriptionPlan.cost` back-relation, `Activation.activationCost`, two `LogActionType` values
- `Apps/api/prisma/migrations/20260810140841_add_activation_cost_and_plan_cost/migration.sql` (new)

### Contract (`Apps/contract`)
- `src/modules/log/log.enums.ts` — `SET_SUBSCRIPTION_PLAN_COST`, `CHANGE_ACTIVATION_COST`
- `src/modules/subscription-plan/subscription-plan.routes.ts` — `GET_COSTS`, `UPDATE_COST`
- `src/modules/subscription-plan/subscription-plan.dtos.ts` — `SubscriptionPlanCostResponseSchema` / `SubscriptionPlanCostDTO`
- `src/modules/subscription-plan/subscription-plan.command.ts` — `UpdateSubscriptionPlanCostSchema` / `UpdateSubscriptionPlanCostCommand`
- `src/modules/activation/activation.routes.ts` — `SET_COST`
- `src/modules/activation/activation.command.ts` — `SetActivationCostSchema` / `SetActivationCostCommand` (separate from `SetActivatorPriceSchema` per plan §3.3)
- `src/modules/activation/activation.dtos.ts` — `AdminActivationResponseSchema.activationCost`, `ActivationDetailResponseSchema.financial.activationCost`

### Backend (`Apps/api`)
- `src/modules/subscription-plan/subscription-plan.interface.ts` — `getCosts`, `updateCost`
- `src/modules/subscription-plan/subscription-plan.mapper.ts` — `toCostDTO`
- `src/modules/subscription-plan/subscription-plan.service.ts` — `getCosts()` (parallel `findMany` + in-memory join, mirrors `getCommissions`), `updateCost()` (upsert + Log in one `$transaction`)
- `src/modules/subscription-plan/subscription-plan.controller.ts` — `getCosts`, `updateCost` handlers
- `src/modules/subscription-plan/subscription-plan.routes.ts` — `GET_COSTS`/`UPDATE_COST`, both `adminOnly`, registered in the statics block before `/:id/toggle`
- `src/modules/activation/activation.service.ts`:
  - Added `COMPLETED_STATS` constant; `TERMINAL_STATS` now built from it; `setPrice()`'s inline `completedStats` array replaced with the shared constant (zero-behaviour-change dedup, per plan §4.2)
  - Added private `resolvePlanCost(tx, subscriptionPlanId)`
  - `activate()` and `activateByAdmin()` — stamp `activationCost` (see inventory above)
  - Added `setCost(id, cmd, actorId)` — completed-only gate via `COMPLETED_STATS`, writes `activationCost` + `CHANGE_ACTIVATION_COST` log **inside** the transaction (unlike `setPrice`'s legacy out-of-transaction log, R8 — new code follows the majority in-transaction pattern), no activator earnings/credits delta, no other side effect
- `src/modules/activation/activation.interface.ts` — `setCost` signature
- `src/modules/activation/activation.controller.ts` — `setCost` handler
- `src/modules/activation/activation.routes.ts` — `POST /:id/set-cost`, `adminOnly`
- `src/modules/activation/activation.mapper.ts` — `toAdminActivationDTO` / `toActivationDetailDTO` input types and output both carry `activationCost`

### Frontend (`Apps/web`)
- `src/services/subscription-plans.service.ts` — `getCosts`, `updateCost`
- `src/services/activations.service.ts` — `setCost`
- `src/lib/query-keys.ts` — `qk.subscriptionPlans.costs()`
- `src/hooks/useSubscriptionPlans.ts` — `usePlanCosts`, `useUpdatePlanCost`
- `src/hooks/useAdminActivations.ts` — `useSetActivationCost` (invalidates `activations` only — **not** `activators`, per plan §5.1/§6)
- `src/pages/admin/settings/SettingsPage.tsx` — 5th tab, `planCosts`; updated the stale "Exactly 4 tabs" comment
- `src/pages/admin/settings/components/PlanCostsTab.tsx` (new) — lists **all** plans incl. inactive (plan §7 Q1), `EnabledBadge`, `PlanCostCell`
- `src/pages/admin/settings/components/PlanCostCell.tsx` (new), `plan-cost-cell.schema.ts` (new) — copy-adapted from `CommissionCell`/`commission-cell.schema.ts`
- `src/pages/admin/activations/components/ActivationsTable.tsx` — `cost` column, `costRow` state, `SetActivationCostModal`, `onSetCost` prop
- `src/pages/admin/activations/components/ActivationActionsMenu.tsx` — `onRequestSetCost` prop, Set/Edit cost menu item gated on `COMPLETED_STATES`
- `src/pages/admin/activations/components/SetActivationCostModal.tsx` (new), `set-activation-cost.schema.ts` (new) — copy-adapted from `SetActivatorPriceModal`/`set-activator-price.schema.ts`
- `src/pages/admin/activations/ActivationsPage.tsx` — wires `useSetActivationCost`, `onSetCost`, folds `isPending` into `isMutating`
- `src/pages/admin/activations/components/FinancialBlock.tsx` (U2) — Cost row + its own edit button, independent of the price button
- `src/pages/admin/activations/ActivationDetailPage.tsx` — `costModalOpen` state, `useSetActivationCost`, wires `FinancialBlock`'s new props and `SetActivationCostModal`
- `src/components/shared/StatusBadge.tsx` — `LOG_ACTION_TONE` map extended for the two new `LogActionType` values (required for `Record<LogActionType, BadgeTone>` exhaustiveness — not in the plan text but required for `tsc` to pass)
- `src/config/translations.json` — all keys from plan §5.5, plus `enums.logActionType.SET_SUBSCRIPTION_PLAN_COST` / `.CHANGE_ACTIVATION_COST` (needed for the logs page, same reason as above)

---

## What was verified

- **`npx tsc --noEmit`**
  - `Apps/contract` — clean
  - `Apps/api` — `src/` fully clean. `test/` has errors, but **all of them are either pre-existing** (from Set 7's uncommitted `telegramLinkToken`/`telegramChatId` additions to `Admin`/`Activator`, unrelated to Set 9 — visible in `activator.factory.ts`, `admin.factory.ts`, `log.mapper.spec.ts`, `payment.mapper.spec.ts`, `order.service.spec.ts`) **or expected per CLAUDE.md** (`activation.mapper.spec.ts` and `activation.factory.ts` now require the new `activationCost` field — "Existing tests WILL break as the contract changes... Do not 'fix' them"). No test file was touched.
  - `Apps/web` — clean (tests live outside `src/**` per `tsconfig.json`'s `include`, so this run doesn't touch them at all)
- **eslint** — `Apps/contract` clean. `Apps/web`: ran `--fix` scoped to only the files this set touched (never a broad `--fix` across the repo); all Set 9 files are now clean. Pre-existing unrelated lint errors elsewhere in `Apps/web` (landing page components, `wilaya-geometry.ts`, etc.) were left untouched. **`Apps/api` has no eslint config or dependency installed at all** — this predates Set 9; adding one would be new tooling and CLAUDE.md says not to install a library without asking, so it's flagged as an open item rather than fixed silently.
- **`npx madge --circular --extensions ts src`** in `Apps/contract` — clean, no circular dependency
- **`git status`** — no test file (`*.test.ts`, `*.spec.ts`, `__tests__/`, `vitest.config.*`, `docker-compose.test.yml`) appears in the diff

---

## Confirmations from the plan's §6 ("what the edit does NOT do")

Verified by re-reading the final `setCost()` body:
- Touches only `Activation.activationCost` + its `Log` row
- No `Activator.totalEarning`/`credits` delta (unlike `setPrice`)
- No write to `SubscriptionPlanCost`
- No re-stamping of any other activation
- No commission recomputation
- No `Card`/`Distributor`/`Activator` counter touched
- No `activationStat`/`completedAt`/`takenAt`/`activationEmail` change
- No event emitted
- Frontend invalidates `activations` only, not `activators`

And symmetrically, `updateCost()` never touches `Activation` — it only upserts `SubscriptionPlanCost` and writes its own log row.

---

## Open questions (from the plan, still open)

1. **Q1 (settings list scope)** — implemented as recommended: **all** plans listed, including inactive ones, badged with `EnabledBadge`.
2. **Q3 (seed script)** — **not implemented.** `scripts/load-mock-data.ts` still writes completed activations with no `activationCost` (they will read `0`, which is correct-but-uninformative — there's no unset-plan-cost row to demonstrate the `—` state without hand-editing the DB). Confirm before I touch it, per CLAUDE.md.
3. Q2, Q4, Q5, Q6 from the plan — resolved as written in the plan (no un-set path, no cost filter/sort, statistics untouched, frozen tests expected to drift).

## New item found during execution (not anticipated in the plan)

- The frontend has an exhaustive `Record<LogActionType, BadgeTone>` map in `StatusBadge.tsx` and a dynamic `enums.logActionType.*` translation lookup used by the logs page/filters. Both needed the two new `LogActionType` values added for `tsc` to pass and for the logs UI to render real copy instead of a blank/raw key. Done as a mechanical, in-scope extension — flagging it since it wasn't named in the plan's file list.

---

## Manual test checklist

Run against a reseeded DB. `mockadmin` / `Password123!`.

1. **Migration applied.** `npx prisma migrate status` shows `20260810140841_add_activation_cost_and_plan_cost` applied; `\d "Activation"` shows `activationCost numeric(12,2) default 0`; `\d "SubscriptionPlanCost"` shows the unique index on `subscriptionPlanId`.
2. **Settings tab exists and lists every plan.** `/admin/settings` shows a 5th tab **Plan Costs**, positioned after Commission. It lists every subscription plan (including any disabled one); plans with no cost row show `—`, not `0`.
3. **Set a cost.** Click a plan's `—`, type `500`, save. The cell shows `500,00 DZD`. `/admin/logs` has a fresh `SET_SUBSCRIPTION_PLAN_COST` row naming the plan and the value.
4. **The stamp works.** Complete an activation on that plan through the activator portal (`/requests` → take → Activate). `/admin/activations` shows the row with **Cost = 500,00 DZD**. The detail page's Financial block agrees.
5. **The stamp is a snapshot.** Change the plan's cost to `900` in settings. Reload `/admin/activations` — the activation from step 4 **still reads 500,00 DZD**. Complete a *second* activation on that plan: it reads `900,00 DZD`.
6. **Null plan cost → 0, no crash.** Pick a plan with `—` in the cost tab, complete an activation on it. It completes normally and the row reads `0,00 DZD`.
7. **Pre-existing rows.** An activation completed *before* the migration reads `0,00 DZD` (the column default backfill), not blank and not an error.
8. **Edit one activation's cost.** Row menu → **Set cost** on a completed activation → `123.45` → confirm. The row and the detail page both show `123,45 DZD`; a `CHANGE_ACTIVATION_COST` log row appears with the old and new values.
9. **Completed-only, enforced server-side.** (a) A `PENDING`/`PROCESSING`/`FREEZE`/cancelled row has **no** Set-cost item in its menu. (b) With DevTools, `POST /api/v1/activations/<a PENDING id>/set-cost` with `{"amount": 10}` returns **409 `RESOURCE_CONFLICT`**, "Activation is not completed".
10. **The edit changes nothing else.** Note the activator's **Total earning** and **Credits** on `/admin/activators/<id>` before step 8; re-check after. Both are **unchanged**, and so are `activationPrice`, the state badge, and `completedAt`. The plan's cost in settings is also unchanged.
11. **Admin completion path stamps too.** Freeze an activation from the activator portal, then resolve it from `/admin` (Activate). The resulting `ACTIVATED_BY_ADMIN` row carries the plan's cost.
12. **Guards.** Log in as an activator: `GET /api/v1/subscription-plans/costs` and `PATCH /api/v1/subscription-plans/costs` both return **403**; `POST /activations/:id/set-cost` returns **403**. Same as a distributor.
13. **Loading and error states.** Throttle to offline and open the Plan Costs tab: a skeleton then the `NotFoundState` with a working **Try again** — the page header and tab bar stay visible throughout.
14. **i18n.** Toggle EN/FR: every new label on the tab, the column header, both menu items and the modal translate. No raw key text, no untranslated English in FR.
15. **Logs page.** `/admin/logs` renders the two new action types with a real (translated) label and a tone-colored badge, not a raw enum string.
