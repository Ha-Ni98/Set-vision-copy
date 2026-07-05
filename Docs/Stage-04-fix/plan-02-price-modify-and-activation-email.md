# Stage-04 — Fix Plan #2: modifiable activation price + activation email

> **Branch:** `test-version-1` · **Status:** plan only (no code yet)
> **Decisions locked with the user:**
> 1. Issue 1 is **only** the "can't modify a set price" gap — prices are already calculated,
>    stored, and displayed correctly; the backend already re-prices with an earning/credit delta.
> 2. The activation email is **required** (valid email) for both the activator's Activate and
>    the admin's resolve-frozen-to-activate.
>
> Contract is consumed from source (`file:../contract` → `src/index.ts`), so schema edits flow
> through with no build step. Commit style: scoped `git add` (not `.`).

---

## Issue 1 — Let the admin modify an already-set activation price

### What already works (do NOT rebuild)
- `activate()` / `activateByAdmin()` compute the commission from the plan's duration tiers,
  set `activationPrice`, and increment the activator's `totalEarning` + `credits`.
- `setPrice()` re-prices **any completed** activation and adjusts `totalEarning` + `credits`
  by the delta (`new − old`).
- Every table/detail already reads the stored `activationPrice`.

### The only change: drop the "unpriced-only" frontend gate (2 spots)
1. **`Apps/web/src/pages/admin/activations/components/ActivationActionsMenu.tsx`** (line ~32):
   change
   `const canSetPrice = COMPLETED_STATES.has(activation.state) && activation.activationPrice == null;`
   → `const canSetPrice = COMPLETED_STATES.has(activation.state);`
2. **`Apps/web/src/pages/admin/activations/ActivationDetailPage.tsx`** (lines ~68–71):
   drop the `&& detail.financial.activationPrice == null` clause so `canSetPrice` is just
   `!!currentState && COMPLETED_STATES.has(currentState)`.

The `SetActivatorPriceModal` already prefills `currentAmount`, so re-pricing works once the
action is reachable.

### Small polish (optional, recommended)
- Show **"Edit Price"** instead of **"Set Price"** when a price already exists: pass a
  `hasPrice` boolean into the menu item / `FinancialBlock` button and switch the label
  (`admin.activations.actions.setPrice` vs a new `…actions.editPrice`). The modal title can do
  the same. Purely cosmetic; the mutation is identical.

### Tests to update
- `Apps/web/tests/unit/pages/activation-detail/ActivationDetailPage.test.tsx` — the existing
  "Set Price for a completed+**unpriced** activation" case: keep it, and **add** a
  completed-**and-priced** case asserting Set/Edit Price is now offered and the mutation fires
  with the new amount.
- `Apps/web/tests/unit/pages/activations/ActivationsPage.test.tsx` (if it asserts the gate) —
  same broadening.
- No backend/contract/API-test changes (behavior there is unchanged).

### Verify
Re-price a completed, already-priced activation → the activator's earning + credits move by
exactly the delta (backend `setPrice`), and every table/detail reflects the new stored value.

> Note: auto-calc only produces a non-null price when the commission tiers
> (`SubscriptionPlanCommission` + `CommissionDuration`) cover the activation's duration. Not in
> scope per your answer, but if a real activation ever shows a null price, check that seed data.

---

## Issue 2 — Required activation email on Activate (activator + admin) + recent-table column

New end-to-end feature. Today `activate`/`activateByAdmin` take **no body**; a prior
email dialog was removed for lack of a backing command.

### A. Contract — `Apps/contract/src/modules/activation/`
1. **`activation.command.ts`** — add a shared command:
   ```ts
   export const ActivateActivationSchema = z.object({
     activationEmail: z.email(),           // valid email, required (match the file's zod-v4 style)
   });
   export type ActivateActivationCommand = z.infer<typeof ActivateActivationSchema>;
   ```
   (Used by both the activator activate and the admin activate-by-admin.)
2. **`activation.dtos.ts`** — add `activationEmail: z.string().nullable()` to
   `RecentActivationResponseSchema` (so `RecentActivationDTO` carries it).

### B. API — `Apps/api/src/modules/activation/`
1. **`activation.routes.ts`** — add body validation to both activate routes:
   - `ACTIVATE`: `validateRequest({ params: ActivationActionParamsSchema, body: ActivateActivationSchema })`
   - `ACTIVATE_BY_ADMIN`: same `body: ActivateActivationSchema`.
2. **`activation.controller.ts`** — `activate` and `activateByAdmin`: read
   `req.validated.body as ActivateActivationCommand` and pass it to the service.
3. **`activation.service.ts`**:
   - `activate(id, principalUserId, cmd)` — in the transaction's `activation.update`, add
     `activationEmail: cmd.activationEmail`.
   - `activateByAdmin(id, cmd)` — same in its `activation.update`.
   - `getRecent()` — the row already has `activationEmail`; pass it into the mapper.
4. **`activation.mapper.ts`** — `toRecentDTO(...)`: include
   `activationEmail: activation.activationEmail ?? null` (widen the param type to include it).

### C. Web — data layer
1. **`services/activations.service.ts`**:
   - `activate(id, command: ActivateActivationCommand)` → POST the body.
   - `activateByAdmin(id, command: ActivateActivationCommand)` → POST the body.
2. **`hooks/useActivateRequest.ts`** & **`hooks/useActivateByAdmin.ts`** — change the
   `mutationFn` to take `{ id, command }` (invalidations unchanged).

### D. Web — activator Activate (required email dialog)
1. New **`components/sections/activator/activate-request.schema.ts`** —
   `{ activationEmail: z.string().email(t(...)) }` (mirror `freeze-request.schema.ts`).
2. **`components/sections/activator/ActiveRequestCard.tsx`** — convert the **Activate** button
   (line ~293, currently a direct `onActivate`) into a `Dialog` trigger mirroring the existing
   **Freeze** dialog: an email input (RHF + the new schema), on submit →
   `activateRequest.mutate({ id: req.id, command: { activationEmail } })`, close on success.
   (The pool row's "Activate" button = *take*, a different action — leave it untouched.)

### E. Web — admin activate-frozen (required email dialog)
`ResolveFreezeDialog` is shared for `"activate" | "cancel"`. The **activate** branch must
collect a required email; the **cancel** branch stays a plain confirm.
1. **`pages/admin/components/ResolveFreezeDialog.tsx`** — for `action === "activate"`, render an
   email input and submit via a real form + plain `Button` (not `AlertDialogAction`, which is
   Radix's auto-closing `Close` — the Sprint-6 finding). Change `onConfirm` to
   `onConfirm(command: ActivateActivationCommand)` for the activate case.
2. **Callers** pass the email into the mutation:
   - `pages/admin/components/FrozenActivationsTable.tsx` (`onActivate` → include the email)
   - `pages/admin/DashboardPage.tsx` (`activateByAdmin.mutate({ id, command })`)
   - `pages/admin/activations/ActivationsPage.tsx` (line ~229 `onActivate` → `{ id, command }`)

### F. Web — recent-activation "email" column
1. **`pages/admin/components/RecentActivationsTable.tsx`** — add an `activationEmail` column
   (render the value or a `—` when null) + i18n header
   `admin.dashboard.recent.columns.activationEmail`.
2. **`pages/activator/HistoryPage.tsx`** — the activator's "Global Recent" table uses the same
   `RecentActivationDTO`; add the same column there for consistency (optional but recommended,
   since the field is now free). New key `activator.history.recentTable.email`.

### G. i18n (`Apps/web/src/config/translations.json`)
- Activator activate dialog: title/body/label/placeholder + `common.validation.invalidEmail`
  (already exists) for the email.
- Admin activate-frozen: email label/placeholder (reuse where possible).
- Recent-table column header(s) from F.

### Tests
- **API integration** (`activation.integration.spec.ts`): update the existing activate /
  activate-by-admin cases to send `{ activationEmail }`; assert the value is persisted; add a
  **400 on missing/invalid email**. Recent: assert `activationEmail` is present in the payload.
- **API unit** (`activation.service.spec.ts`, if it drives activate directly): pass the email.
- **Contract conformance** (`routes.conformance.spec.ts`): covers the new body schema.
- **Web**:
  - `ActiveRequestCard` / `RequestsPage.test.tsx` — the Activate flow now opens a dialog;
    assert the email dialog gates submission and calls `mutate({ id, command })`.
  - `FrozenActivationsTable` / dashboard test — the activate resolve now collects an email.
  - `RecentActivationsTable` — asserts the email column.
  - Update `activations.service` / hook tests for the new `{ id, command }` shape and any
    fixtures/mocks that call activate/activateByAdmin with a bare id.
  - Extend the `RecentActivationDTO` fixture with `activationEmail`.

### Verify (live)
Activator completes an activation → email dialog is required → row leaves the queue → the value
lands in `activationEmail` and appears in the recent table. Admin resolves a frozen activation
to Activated with a required email → same. Recent tables (admin dashboard + activator history)
show the email column.

---

## Sequencing
Issue 1 is a ~2-line frontend gate change (+ optional label + test) — quick, independent, do first.
Issue 2 is cross-stack; suggested order: contract → API (routes/controller/service/mapper) →
web data layer (service/hooks) → activator dialog → admin dialog → recent column → i18n → tests.

## Assumptions to confirm if any differ
- Email is a plain required `email()` with no domain restriction.
- The admin activate-frozen reuses the same `ActivateActivationCommand` (one schema for both).
- Adding the email column to the activator's *own* recent table (F.2) is in scope; say if you
  want it admin-only.
