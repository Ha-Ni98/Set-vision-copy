# Set 10 — Execution Report

**Implemented exactly per** `Docs/Stage-04-fix/plan/set-10-plan.md`. Order: prisma → contract → backend → frontend.
**Date:** 2026-08-10 · **Branch:** `version-02-01`

---

## Migration

**Name:** `20260810161751_add_activation_email_pool`
**Created and applied** via `npx prisma migrate dev --name add_activation_email_pool`.

Contents (matches the plan's §1.1/§1.3 exactly): `CREATE TABLE "ActivationEmail"` (`id`, `subscriptionPlanId`, `email`, `nbOfActivation`, `lastUsedAt`, `createdAt`, `isDeleted`, `deletedAt`) + the compound unique index `[subscriptionPlanId, email]` + the composite index `[subscriptionPlanId, isDeleted, lastUsedAt]` + FK to `SubscriptionPlan` (`onDelete: Cascade`); `ALTER TYPE "LogActionType" ADD VALUE 'ADD_ACTIVATION_EMAIL'` / `'DELETE_ACTIVATION_EMAIL'`.

**No `ALTER TABLE "Activation"` statement** — confirmed by grep against the migration SQL; the only `Activation`-adjacent text is the `nbOfActivation` column name inside the new table.

---

## Confirmation: `Activation` is unmodified (plan §8)

- `git diff Apps/api/prisma/schema.prisma` has **zero hunks touching `model Activation`** — verified directly.
- `Activation.activationEmail` is untouched: still `String?`, no FK, no relation field added.
- The only two lines Set 10 adds inside the two completion paths are calls to `consumeActivationEmailWithin(tx, {...})`, which write to `ActivationEmail`, never to `Activation`.
- The only two `Activation`-facing contract changes are DTO-only: `subscriptionPlanId` added to `ActiveRequestResponseSchema` and `AdminActivationResponseSchema`, sourced from the already-loaded `card.subscriptionPlan.id` (no new query, no schema change).

---

## THE COMPLETION PATH INVENTORY — hooked, confirmed one by one

Restated from `set-9-plan.md` §2 / `set-10-plan.md` §0.1, reused verbatim.

| # | Path | Match-and-increment hooked? | Where |
|---|---|---|---|
| **1** | `ActivationService.activate()` | ✅ **Yes** | `consumeActivationEmailWithin(tx, { subscriptionPlanId: activation.card.subscriptionPlanId, email: cmd.activationEmail, now })` called immediately after the first `tx.activation.update` and before `tx.card.update`, inside the same transaction. |
| **2** | `ActivationService.activateByAdmin()` | ✅ **Yes** | Identical call at the same relative position inside its own transaction. |
| **3** | `scripts/load-mock-data.ts` | ⚠️ **Not updated — flagged, see Open Questions Q3** | Per CLAUDE.md, seed-script gaps are reported, not silently fixed without confirmation. It already writes no `activationEmail` at all (pre-existing gap, R15); this set does not change that. |

Both hooks run **inside the same transaction** the completion already opens — confirmed by reading the final diff: the call is a plain `await` between two existing `tx.*` calls, no new `$transaction` boundary introduced.

---

## Files changed

### Prisma
- `Apps/api/prisma/schema.prisma` — `ActivationEmail` model, `SubscriptionPlan.activationEmails` back-relation, two `LogActionType` values
- `Apps/api/prisma/migrations/20260810161751_add_activation_email_pool/migration.sql` (new)

### Contract (`Apps/contract`)
- `src/modules/log/log.enums.ts` — `ADD_ACTIVATION_EMAIL`, `DELETE_ACTIVATION_EMAIL`
- **New module** `src/modules/activation-email/` — `activation-email.routes.ts`, `.dtos.ts`, `.command.ts`, `.query.ts`, `index.ts` (no `enums.ts`, no `events.ts` per plan §5 — neither is needed)
- `src/index.ts` — barrel export for the new module
- `src/modules/activation/activation.dtos.ts` — `subscriptionPlanId: z.uuid()` added to `ActiveRequestResponseSchema` and `AdminActivationResponseSchema` (U1)

### Backend (`Apps/api`)
- **New module** `src/modules/activation-email/` — full 5-file pattern:
  - `activation-email.mapper.ts` — `toDTO`, `toOptionDTO`
  - `activation-email.interface.ts`
  - `activation-email.service.ts` — the `ActivationEmailService` class (`getAll`, `getPool`, `create`, `delete`) **and** the exported `consumeActivationEmailWithin(tx, args)` function
  - `activation-email.controller.ts`
  - `activation-email.routes.ts` — `/pool` and `/` (GET) registered before `/:id` (DELETE); `adminOrActivator` on `/pool`, `adminOnly` on everything else
- `src/modules/index.ts` — registers `activationEmailRouter` at `ACTIVATION_EMAIL_ROUTES.BASE`
- `src/modules/activation/activation.mapper.ts` — `ActivationPlanJoin` widened to include `'id'`; `toActiveRequestDTO` and `toAdminActivationDTO` emit `subscriptionPlanId: plan.id`
- `src/modules/activation/activation.service.ts` — imports `consumeActivationEmailWithin`; both completion paths call it (see inventory above)

### Frontend (`Apps/web`)
- `src/services/activation-emails.service.ts` (new) — `getAll`, `getPool`, `create`, `remove`
- `src/lib/query-keys.ts` — `qk.activationEmails.{all,listAll,list,pool}`
- `src/hooks/useActivationEmails.ts` (new) — `useActivationEmails`, `useActivationEmailPool` (`staleTime: 0`), `useAddActivationEmail`, `useDeleteActivationEmail` (both mutations invalidate `qk.activationEmails.all()`)
- `src/pages/admin/settings/SettingsPage.tsx` — 6th tab, `activationEmails`; updated the tab-count comment
- `src/pages/admin/settings/components/ActivationEmailsTab.tsx` (new) — modelled on `AdminAccountsTab`: plan `<Select>` filter, debounced search, `DataTable`, two-variant empty state, `SimplePagination`, delete `AlertDialog`
- `src/pages/admin/settings/components/AddActivationEmailModal.tsx` (new) + `add-activation-email.schema.ts` (new) — plan `<Select>` (via RHF `Controller`, mirroring `AddPlanModal`) + email `<Input>`; inline duplicate-email message on a 409, detected the same way `useTakeActivation.ts` detects its 409 (`axios.isAxiosError(err) && err.response?.status === 409`), in addition to the global mutation-cache toast
- `src/components/shared/ActivationEmailPicker.tsx` (new) — **the one picker component**, self-contained (owns `useActivationEmailPool`), pool/free mode toggle, skeleton while loading, graceful fallback to free-text on an empty or errored pool
- `src/components/sections/activator/ActiveRequestCard.tsx` — call site 1: the free-text `<Input>` in the Activate dialog replaced by `<ActivationEmailPicker>` wrapped in RHF `Controller`, `subscriptionPlanId={req.subscriptionPlanId}`
- `src/pages/admin/components/ResolveFreezeDialog.tsx` — call site 2: same replacement, plus a new required `subscriptionPlanId` prop
- `src/pages/admin/activations/components/ActivationsTable.tsx` — passes `subscriptionPlanId={resolveRow?.row.subscriptionPlanId ?? ""}` to `ResolveFreezeDialog`
- `src/pages/admin/components/FrozenActivationsTable.tsx` — passes `subscriptionPlanId={dialogRow?.row.subscriptionPlanId ?? ""}` to `ResolveFreezeDialog`
- `src/components/shared/StatusBadge.tsx` — `LOG_ACTION_TONE` map extended for the two new `LogActionType` values (same exhaustiveness requirement as Set 9; not named in the plan but mechanically required for `tsc`)
- `src/config/translations.json` — every key from plan §7.4, plus `enums.logActionType.ADD_ACTIVATION_EMAIL` / `.DELETE_ACTIVATION_EMAIL` (same reason as the `StatusBadge` change, for the logs page)

**Not built: a second picker.** `ResolveFreezeDialog` is the one dialog both admin call sites (`ActivationsTable`, `FrozenActivationsTable`) already share, so wiring the picker into it once covers both — exactly as the plan specified. The picker component itself has exactly two call sites (`ActiveRequestCard`, `ResolveFreezeDialog`).

---

## What was verified

- **`npx tsc --noEmit`**
  - `Apps/contract` — clean
  - `Apps/api` — `src/` fully clean. `test/` shows the same 7 pre-existing files as before this set (`activation.factory.ts`, `activator.factory.ts`, `admin.factory.ts`, `activation.mapper.spec.ts`, `log.mapper.spec.ts`, `order.service.spec.ts`, `payment.mapper.spec.ts`) — **no new file broke**, confirming Set 10 introduced no new test breakage beyond what Set 9 already left (frozen, not touched, per CLAUDE.md).
  - `Apps/web` — clean
- **eslint** — `Apps/contract` clean. `Apps/web`: ran `--fix` scoped only to the files this set touched (prettier-only formatting fixes); all clean afterward. `Apps/api` still has no eslint installed at all (pre-existing gap, flagged in Set 9's report, unchanged here).
- **`npx madge --circular --extensions ts src`** in `Apps/contract` — clean; the new module imports nothing from any other contract module, so it cannot introduce a cycle.
- **`git status`** — no test file in the diff.
- **`Activation` model unchanged** — see the dedicated section above.

---

## Rule confirmations (from the reminders)

- **Case-insensitive, trimmed matching, active-only:** `normalize(email) = email.trim().toLowerCase()`, applied to both the stored pool row (on add/restore) and the submitted address before the `findUnique` on the compound unique index. `consumeActivationEmailWithin` returns immediately (no increment) when `!row || row.isDeleted` — a soft-deleted row is never matched and never implicitly restored; restoring only happens through the explicit `create` (add) action.
- **Soft delete hidden from both queries:** `getAll` (settings list) always includes `isDeleted: false` in its `where`, never optional, never overridable by a query param. `getPool` (picker) filters the same way. Verified by reading both query bodies side by side.
- **One picker component, two call sites:** confirmed above.
- **Sort — never-used first, then oldest → newest:** `orderBy: [{ lastUsedAt: { sort: 'asc', nulls: 'first' } }, { createdAt: 'asc' }]`, matching the plan's explicit-`nulls: 'first'` requirement (Postgres/Prisma default `ASC` to `NULLS LAST`, which would have been backwards).
- **Add/delete write Log rows via the existing audit path:** both `create` (with add-vs-restore description branching) and `delete` write their `Log` row inside the same `$transaction` as the data mutation, using the plain `tx.log.create({...})` idiom every other module in this codebase already uses — no new log helper introduced.

---

## Open questions (from the plan, still open)

1. **Q3 (seed script)** — **not implemented**, same as Set 9's Q3. `scripts/load-mock-data.ts` still writes no `activationEmail` on seeded completed activations, and no `ActivationEmail` rows are seeded. A fresh seed's pool is empty everywhere until an admin adds entries through the settings tab. Confirm before I touch it; it's the one file outside prisma/contract/api/web either set would touch.
2. Q1, Q2, Q4, Q5, Q6 — resolved as recommended in the plan (as-typed storage on `Activation.activationEmail`, usage count shown to both audiences, no "show deleted" toggle, unscoped pool-by-plan route accepted, frozen tests expected to drift).

## New item found during execution (not anticipated in the plan)

- Same class of gap as Set 9: `StatusBadge.tsx`'s exhaustive `Record<LogActionType, BadgeTone>` map and the `enums.logActionType.*` translation keys needed the two new log action types added for `tsc` to pass and for `/admin/logs` to render real labels. Mechanical, in scope, flagged since it wasn't named in the plan's file list.

---

## Manual test checklist

Run against a reseeded DB, with Set 9 already applied. `mockadmin` / `Password123!`.

1. **Migration applied.** `npx prisma migrate status` shows `add_activation_email_pool`; `\d "ActivationEmail"` shows both indexes and the FK. `\d "Activation"` is byte-identical to after Set 9 — no new column, no new FK.
2. **Add three emails for one plan.** Settings → **Activation Emails** → Add ×3 on the same plan. All three appear with **usage count 0** and an empty *Last used*.
3. **The picker is plan-scoped.** As the activator, take and complete a request on that plan. The Activate dialog offers a list containing exactly those three addresses — and nothing from any other plan.
4. **Pick one → counter and ordering move.** Choose the second address, complete. Settings shows it at **count 1** with a *Last used* timestamp. Reopen a picker for the same plan: that address is now **last**.
5. **Never-used sorts first.** Complete another activation on the same plan: the picker's first option is one of the still-unused addresses.
6. **Free address, no match.** Type `nobody@example.com` (not in any pool) and complete. The activation saves and shows that address; the settings list is unchanged and **no new row was created**.
7. **Free address that IS in the pool, wrong case.** Type the third pool address with different capitalisation (`FOO@Bar.com` for `foo@bar.com`) and complete. That pool row's count increments by 1.
8. **Soft delete hides it everywhere.** Delete one address in settings. It is gone from the settings list **and** from the picker. An earlier activation that used it still displays it on `/admin/activations/:id` and in the activator's history.
9. **A deleted address never matches.** Free-type the deleted address on a new completion. The activation saves; the deleted row's counter does **not** move and it is **not** restored.
10. **Re-add restores with the counter.** Add that same address for that same plan again. The row returns with its previous usage count and last-used date intact, and the log row says restored, naming the preserved count.
11. **Duplicate of an active row is rejected.** Try adding an address already active on that plan → **409**, inline "already in the pool" message under the field, plus the global toast, no second row.
12. **Same address, different plan.** Add the same address to a different plan. A separate row with its own counter appears; completing on plan A does not move plan B's counter.
13. **Admin completion path.** Freeze an activation, resolve it from the admin dashboard's frozen widget **and** (on another one) from `/admin/activations` row menu → Activate. Both show the picker, both scoped to the right plan, both increment on a pool pick.
14. **Log rows.** `/admin/logs` shows `ADD_ACTIVATION_EMAIL` (add and restore, different descriptions) and `DELETE_ACTIVATION_EMAIL` with the usage count.
15. **Guards.** As an activator: `GET /api/v1/activation-emails/pool?subscriptionPlanId=…` → 200; `GET /api/v1/activation-emails`, `POST`, `DELETE` → 403. As a distributor: all four → 403.
16. **Empty pool and offline.** (a) Complete on a plan with no pool addresses: free-text input with the "no addresses" note, completes normally. (b) Throttle offline, open the Activate dialog: falls back to free text with the load-error note; dialog buttons/copy stay laid out.
17. **Validation still bites.** Empty field and `not-an-email` are both blocked client-side; the API rejects the same values with 400.
18. **i18n.** Toggle EN/FR: the tab, every column, the add modal, the delete confirm and every picker string translate.

---

## Definition of done (CLAUDE.md)

- `npx tsc --noEmit` clean in `Apps/contract`, `Apps/api` (`src/`), `Apps/web`
- eslint clean in `Apps/contract` and `Apps/web`; `Apps/api` has no eslint installed (pre-existing, unchanged)
- `npx madge --circular src` clean in `Apps/contract`
- Migration `add_activation_email_pool` created **and applied**
- `model Activation` unchanged — verified via `git diff`
- No test file created, modified, deleted or run — verified with `git status`
- No magic strings in changed files
- This report + checklist under `Docs/Stage-04-fix/results/set-10/`
- **Stop. Do not start Set 11.**
