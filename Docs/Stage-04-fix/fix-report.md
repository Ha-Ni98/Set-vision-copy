# Stage-04 — Fix Report

> **Date:** 2026-07-05 · **Branch:** `test-version-1`
> **Scope:** three reported issues (admin dashboard 401, activator custom password, editable set keys).
> Each fix spans the layers it needs (contract → API → web); the contract package is consumed
> from source (`file:../contract` → `src/index.ts`), so schema edits flow through with no build step.

---

## Issue 1 — Admin dashboard: "Recent Activity" & "Pending Activations" show an error

### Diagnosis
The admin dashboard reads the **global** recent feed and pending pool via the same hooks the
activator portal uses (`useRecentActivations`, `usePendingActivations` →
`GET /activations/recent`, `GET /activations/pending`). Both routes were gated **activator-only**,
so an admin's token was rejected. The reported "401" is actually a **403** (`ForbiddenError`,
role mismatch — the auth middleware only returns 401 for a missing/invalid token). The two
tables then rendered their error state.

The two controller methods (`getPending()`, `getRecent()`) take **no arguments and use no
activator identity** — they're genuinely global reads — so letting admins in is safe (admins
already see everything via `getAll`).

### Change
- `Apps/api/src/modules/activation/activation.routes.ts` — added an `activatorOrAdmin` guard
  (`[UserRole.ACTIVATOR, UserRole.ADMIN]`) and applied it to `GET_PENDING` and `GET_RECENT`.
- No frontend change — the tables clear their error state automatically once the API returns 200.

### Tests
- `activation.integration.spec.ts` — flipped the "403 — admin role is rejected" pending test to
  assert admin now gets **200 + an array**; updated the static-route-resolution test that had
  used the admin-403 as its signal (now asserts 200 + array, which still proves `/pending`
  resolves before `/:id`).

---

## Issue 2 — Activators: allow choosing/changing the password on create **and** edit

Previously the password was **always server-generated** (create returned it once; a separate
"Reset Password" action re-generated it). There was no way to set a chosen password.

**Decision (confirmed with you):** on **create**, add an optional password field — leave it
blank to auto-generate (unchanged behavior), or type one to override; on **edit**, add an
optional "New Password" field to the Edit Activator modal — blank leaves the current password
unchanged.

### Changes
**Contract** — `activator.command.ts`: added `password: z.string().min(8).optional()` to both
`CreateActivatorSchema` and `UpdateActivatorSchema` (the routes validate bodies against these,
so the 8-char minimum is enforced server-side too).

**API** — `activator.service.ts`:
- `create()` — uses `cmd.password ?? generateTempPassword()`, then hashes; the chosen value is
  still returned once via the credentials DTO.
- `update()` — when `password` is present, hashes it and folds it into the same `user` update
  (alongside `username`), and logs `CHANGE_USER_PASSWORD` instead of `CHANGE_USER_INFORMATION`.
  Absent/blank leaves the password untouched.

**Web:**
- `create-activator.schema.ts` / `update-activator.schema.ts` — optional `password`; a blank
  value passes validation and is **stripped to `undefined`** on output (so axios omits it and
  the server keeps its existing behavior). A typed value must be ≥ 8 chars. The update schema
  gained an `Input` type so the modal uses the three-generic `useForm` (input ≠ output).
- `CreateActivatorModal.tsx` / `EditActivatorModal.tsx` — password input with a show/hide
  toggle and helper text ("Leave blank to auto-generate" / "…to keep the current password").
- `translations.json` — 4 new keys (`admin.activators.create.password` + helper,
  `admin.activators.edit.password` + helper). No page wiring changes: the modals already pass
  form values straight to the mutations, and the schema output now already omits a blank password.

### Tests
Existing activator page + service tests still pass (create flow reveals the generated password;
adding an optional field doesn't disturb them). Server-side create/update behavior is covered by
the activator integration + unit suites.

---

## Issue 3 — Sets: make the generated keys editable (and check they don't already exist)

Previously "Create Set" took a plan + a bare **count**; the server generated that many random
keys with no preview or way to edit them.

**Decision (confirmed with you):** **auto-generate + edit inline** — pick a plan and a count,
click **Generate**, then edit any key / regenerate / add / remove in a scrollable list; keys
must **match the generated format** (12 uppercase hex chars); the server re-checks the whole
list and rejects any key that already exists, highlighting exactly which one to fix.

### Changes
**Contract** — `set.command.ts`: replaced `numberOfKeys` with
`keys: z.array(z.string().regex(CARD_KEY_PATTERN)).min(1).max(MAX_KEYS_PER_SET)` plus a
no-duplicates refine. Exported the shared `CARD_KEY_PATTERN` (`/^[0-9A-F]{12}$/`, matching the
server generator) and `MAX_KEYS_PER_SET` (1000) so the client generator, the form schema, and
the command all agree.

**API** — `set.service.ts` `create()`:
- Queries `card.findMany({ where: { key: { in: cmd.keys } } })`; if any already exist, throws
  `ConflictError('Some keys already exist', { takenKeys })` (409) — the taken keys ride in
  `error.details` so the modal can highlight them.
- Otherwise inserts the set (`numberOfKeys = keys.length`) and one `IN_SET` card per provided key.
- Removed the now-unused `uniqueCardKey()` generator loop (server no longer invents keys here).

**Web:**
- New `src/lib/card-key.ts` — a client `generateCardKey()` (Web Crypto, 6 random bytes → 12
  uppercase hex) that mirrors the server format exactly.
- `create-set.schema.ts` — `{ subscriptionPlanId, keys[] }` with the same format/cap/no-dupes rules.
- `CreateSetModal.tsx` — rewritten: plan select + count + **Generate**, then an editable,
  scrollable key list (`max-h-64`, overflow-auto) with per-row regenerate/remove, plus
  **Add key** / **Regenerate all**. Live per-row validation flags bad format, in-list
  duplicates, and — after a 409 — the already-existing keys (read from `error.details.takenKeys`);
  editing a flagged key clears its highlight.
- `SetsLotsPage.tsx` — passes `createError={createSet.error}` to the modal and calls
  `createSet.reset()` on close so a stale 409 doesn't linger.
- `translations.json` — 15 new `admin.setsLots.sets.create.*` keys (generate/regenerate/add,
  hints, and the format/duplicate/taken/empty error messages).

### Tests
- `set.service.spec.ts` (unit) — added a card `findMany` mock + a `keysOf(n)` helper; updated
  the create tests to pass `keys[]`; added a **409-on-existing-key** case.
- `set.integration.spec.ts` — create now sends explicit keys; added a **409 lists the taken key**
  case and a **400 on a malformed key** case.
- `SetsLotsPage.test.tsx` (web) — the create-set flow now generates keys first; added a
  "blocks submit until keys are generated" case.
- `sets.service.test.ts` / `sets.test.tsx` (web) — updated to the `keys[]` command shape.

---

## Validation

| Package  | Type-check | Tests |
|----------|-----------|-------|
| contract | ✅ `tsc --noEmit` | (covered by the API conformance suite) |
| api      | ✅ `tsc --noEmit` | ✅ unit + contract **710/710**; integration **218/218** |
| web      | ✅ `tsc` (both configs) | ✅ all touched areas green (sets-lots, activators, sets service/hooks) |

ESLint/Prettier: clean on all touched web + contract files (the API package has no lint config).

### Pre-existing, unrelated failures (NOT introduced here)
Running the full web suite surfaced **28 failing tests, all in `tests/unit/pages/client-portal/**`**.
These fail on the clean tree too (verified by stashing this stage's changes) — they are a
**pre-existing mismatch on `test-version-1`**: this branch changed `LandingPage.tsx`'s
`KEY_FORMAT_PATTERN` to `/^[A-Z0-9]{12}$/` (12-char, no dashes — aligning with the real card-key
format) and dropped `.trim()`, but the client-portal tests still use the old dashed sample key
`"ABCD-1234-EFGH-5678"`, so Step-1 validation now rejects it and the downstream views never
render. This is orthogonal to the three fixes above and was left untouched; aligning those tests
(update the sample key to a 12-hex value) can be done separately on request.

---

## Files changed

**Contract (2):** `activator.command.ts`, `set.command.ts`
**API (6):** `activation.routes.ts`, `activator.service.ts`, `set.service.ts` + 3 test specs
**Web (11):** `lib/card-key.ts` (new), `CreateSetModal.tsx`, `create-set.schema.ts`,
`SetsLotsPage.tsx`, `CreateActivatorModal.tsx`, `EditActivatorModal.tsx`,
`create-activator.schema.ts`, `update-activator.schema.ts`, `config/translations.json`,
+ 3 test files.

## Notes / not-yet-done
- Changes are **not committed** (no commit was requested). Say the word and I'll commit them
  (this branch, scoped add).
- Verification was via the automated suites, which cover all three fixes directly (admin now
  200s on `/pending` + `/recent`; custom-password create/update; set keys editable + 409 on
  collision + 400 on bad format). A live browser pass against the running dev stack is available
  on request.
