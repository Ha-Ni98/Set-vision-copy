# Stage-04 — Fix Report #2

> **Date:** 2026-07-05 · **Branch:** `test-version-1`
> **Scope:** two reported issues (modifiable activation price, required activation email).
> Full plan: [`plan-02-price-modify-and-activation-email.md`](./plan-02-price-modify-and-activation-email.md).
> Contract is consumed from source (`file:../contract` → `src/index.ts`), so schema edits flow
> through with no build step.

---

## Issue 1 — Let the admin modify an already-set activation price

### Diagnosis (confirmed with you)
The backend already did everything asked: `activate()`/`activateByAdmin()` compute the price
from the plan's commission tiers and credit the activator's earning/credits; `setPrice()`
re-prices any completed activation and adjusts earning/credits by the delta. The only real gap
was two **frontend gates** that hid the re-price action once a price already existed, so nothing
on the backend needed to change.

### Change
- `Apps/web/src/pages/admin/activations/components/ActivationActionsMenu.tsx` — dropped the
  `activation.activationPrice == null` clause from `canSetPrice`; the menu item now reads **Set
  Price** or **Edit Price** depending on whether a price already exists.
- `Apps/web/src/pages/admin/activations/ActivationDetailPage.tsx` — same gate removed from
  `canSetPrice`.
- `FinancialBlock.tsx` / `SetActivatorPriceModal.tsx` — cosmetic: button label and dialog title
  switch between "Set Price" and "Edit Price" (`admin.activations.actions.editPrice`,
  `admin.activations.setPriceModal.editTitle`); the modal already prefilled `currentAmount`, so
  re-pricing worked the moment the action became reachable.

### Tests
- `ActivationDetailPage.test.tsx` / `ActivationsPage.test.tsx` — replaced the old "Set Price is
  hidden once priced" assertions with **"Edit Price is offered, prefills the current amount, and
  re-submits with the new amount"** cases.

---

## Issue 2 — Required activation email on Activate (activator + admin) + recent-table column

New end-to-end feature (confirmed: **required, valid email**, shared by both activation paths).
Previously `activate`/`activateByAdmin` took no body at all.

### Contract
- `activation.command.ts` — new `ActivateActivationSchema = z.object({ activationEmail: z.email() })`
  and its inferred `ActivateActivationCommand`, shared by both activate routes.
- `activation.dtos.ts` — `RecentActivationResponseSchema` gained `activationEmail: z.string().nullable()`.

### API
- `activation.routes.ts` — both `ACTIVATE` and `ACTIVATE_BY_ADMIN` now validate
  `body: ActivateActivationSchema`.
- `activation.controller.ts` / `activation.interface.ts` — `activate`/`activateByAdmin` take the
  validated command and pass it through to the service.
- `activation.service.ts` — both methods now write `activationEmail: cmd.activationEmail` into
  the `activation.update`; `getRecent()` passes the stored email into the mapper.
- `activation.mapper.ts` — `toRecentDTO(...)` includes `activationEmail` in its output.

### Web — data layer
- `services/activations.service.ts` — `activate`/`activateByAdmin` now POST the command body.
- `hooks/useActivateRequest.ts` / `hooks/useAdminActivations.ts` (`useActivateByAdmin`) —
  `mutationFn` takes `{ id, command }` instead of a bare id.

### Web — activator Activate dialog
- New `components/sections/activator/activate-request.schema.ts` — `{ activationEmail }`,
  required + valid email, mirroring the existing `freeze-request.schema.ts` pattern.
- `ActiveRequestCard.tsx` — the **Activate** button is now a `Dialog` trigger (mirroring the
  existing Freeze dialog): an email input, RHF + Zod validation, submits
  `activateRequest.mutate({ id, command: { activationEmail } })`, closes on success. The pool
  row's own "Activate" (= *take*) button is a different action and was left untouched.

### Web — admin activate-frozen dialog
`ResolveFreezeDialog` is shared for `"activate" | "cancel"`. The **cancel** branch is unchanged
(`AlertDialogAction`/`AlertDialogCancel`). The **activate** branch needed real form validation to
gate submission — and `AlertDialogAction` is literally Radix's `DialogPrimitive.Close` under the
hood, so it always closes on click regardless of validity (a finding from a prior sprint's Freeze
dialog work). It was replaced, for the activate branch only, with a real
`<form onSubmit={handleSubmit(...)}>` and a plain `<Button type="submit">`, using the same
`activateRequestSchema`.
- Callers updated to thread the collected email through: `FrozenActivationsTable.tsx`,
  `DashboardPage.tsx`, `ActivationsPage.tsx` — all now call
  `activateByAdmin.mutate({ id, command })`.

### Web — recent-table email column
- `RecentActivationsTable.tsx` (admin dashboard) and `HistoryPage.tsx` (activator's own "Global
  Recent" table) both gained an `activationEmail` column (renders the value or `—`), since both
  read the same `RecentActivationDTO`.

### i18n
New keys: activator activate-dialog title/body/placeholder, admin edit-price title, and the two
recent-table email column headers (`admin.dashboard.recent.columns.activationEmail`,
`activator.history.recentTable.email`).

### Tests
- **API integration** (`activation.integration.spec.ts`) — added a full new
  `POST /activations/:id/activate` describe block (previously **zero** coverage existed for the
  activator's own activate route): 200 + persisted email, 400 missing email, 400 invalid email.
  Updated the existing activate-by-admin tests to send/assert the email, and added a 400-missing
  case. Added an end-to-end `GET /activations/recent` case asserting the email round-trips.
- **API unit** — `activation.service.spec.ts` / `activation.service.admin.spec.ts` — every
  `activate`/`activateByAdmin` call site updated to pass the command; added dedicated
  "stores the required activationEmail" tests; fixed a `getRecent` mock row that was missing the
  field entirely (was silently passing before the field became required, would otherwise crash
  the mapper's own Zod parse). `activation.mapper.spec.ts` — fixed 3 `toRecentDTO` call sites +
  added a pass-through test.
- **Web** — `RequestsPage.test.tsx`, `DashboardPage.test.tsx`, `ActivationsPage.test.tsx` — the
  Activate flows now open a dialog; each test fills the email, asserts a blank submit is blocked
  with a visible validation error, and asserts the eventual `mutate({ id, command })` call.
  `HistoryPage.test.tsx` — updated the Global Recent column-count assertion to include the new
  email column. Fixed the `activations.service.test.ts` / `activations.test.tsx` call sites and
  the shared `mockRecentActivation` fixture (a runtime `RecentActivationResponseSchema.parse(...)`
  that would otherwise throw on import once `activationEmail` became a required field).

---

## Validation

| Package  | Type-check | Tests |
|----------|-----------|-------|
| contract | ✅ `tsc --noEmit` | (covered by the API conformance suite) |
| api      | ✅ `tsc --noEmit` | ✅ unit + contract **712/712**; integration **223/223** |
| web      | ✅ `tsc` (both configs) | ✅ all touched areas green (activator requests, admin dashboard/activations, activator history) |

### Pre-existing, unrelated failures (NOT introduced here)
The full web suite still shows **28 failing tests, all in `tests/unit/pages/client-portal/**`**.
Verified by stashing this round's changes and re-running the same file against the clean tree —
identical failures occur, so this is a pre-existing issue on `test-version-1` (see the note in
[`fix-report.md`](./fix-report.md)), unrelated to either fix in this round.

The API integration suite showed one flaky failure on a single run
(`order.integration.spec.ts > POST /orders/:id/transition > 200 — PENDING_DELIVERY → IN_DELIVERY`,
an unrelated module not touched in this round); it passed both in isolation and on a full
re-run of the suite (223/223), consistent with test-order/isolation flakiness rather than a
regression from this work.

---

## Files changed

**Contract (2):** `activation.command.ts`, `activation.dtos.ts`

**API (8):** `activation.routes.ts`, `activation.controller.ts`, `activation.interface.ts`,
`activation.service.ts`, `activation.mapper.ts` + 3 test specs
(`activation.integration.spec.ts`, `activation.mapper.spec.ts`, `activation.service.spec.ts`,
`activation.service.admin.spec.ts`)

**Web (24):** `activate-request.schema.ts` (new), `ActiveRequestCard.tsx`,
`ResolveFreezeDialog.tsx`, `FrozenActivationsTable.tsx`, `RecentActivationsTable.tsx`,
`ActivationActionsMenu.tsx`, `ActivationsTable.tsx`, `FinancialBlock.tsx`,
`SetActivatorPriceModal.tsx`, `ActivationDetailPage.tsx`, `ActivationsPage.tsx`,
`DashboardPage.tsx`, `HistoryPage.tsx`, `activations.service.ts`, `useActivateRequest.ts`,
`useAdminActivations.ts`, `config/translations.json`, + 7 test files
(`activations.mock.ts`, `activations.test.tsx`, `activations.service.test.ts`,
`ActivationDetailPage.test.tsx`, `ActivationsPage.test.tsx`, `HistoryPage.test.tsx`,
`RequestsPage.test.tsx`, `DashboardPage.test.tsx`).

## Notes / not-yet-done
- Changes are **not committed** (no commit was requested). Say the word and I'll commit them
  (this branch, scoped add).
- Verification was via the automated suites, which exercise both fixes directly: re-pricing an
  already-priced activation (frontend gate + existing delta logic), and required-email
  validation on both activate paths end-to-end (contract → API → recent-table display). A live
  browser pass against the running dev stack is available on request.
