# Set 14 — Execution report: optional "new password" on Distributor and Admin edit forms

**Plan:** [Docs/Stage-04-fix/plan/set-14-password.md](../../plan/set-14-password.md)
**Date:** 2026-08-11 · **Branch:** `version-02-01`

Full plan executed as written, no deviations from the four confirmed decisions (D1–D4).

---

## Files modified, by package

### `Apps/contract`
- `src/modules/admin/admin.command.ts` — added `password: z.string().min(8).optional()` to `UpdateAdminSchema`.
- `src/modules/distributor/distributor.command.ts` — added `password: z.string().min(8).optional()` to `UpdateDistributorSchema`.

### `Apps/api`
- `src/modules/admin/admin.service.ts` — `update()`: conditional hash, `userData` object replacing the `username !== undefined` ternary, conditional log type/description (`CHANGE_USER_PASSWORD` vs `CHANGE_USER_INFORMATION`).
- `src/modules/distributor/distributor.service.ts` — `update()`: D1 guard (`ConflictError('Distributor has no account')` when `cmd.password` is set but `existing.userId` is null), hash before the transaction, conditional `tx.user.update` inside the existing transaction, a **second** conditional log row (`CHANGE_USER_PASSWORD`) alongside the untouched `CHANGE_DISTRIBUTOR_INFORMATION` row — see Q1 below.

### `Apps/web`
- `src/pages/admin/settings/components/update-admin.schema.ts` — added the `password` field (blank → `undefined`, else `≥ 8`) and the `UpdateAdminFormInput` (`z.input`) export.
- `src/pages/admin/settings/components/EditAdminModal.tsx` — 3-arg `useForm` generic, `showPwd` state, password field block (eye toggle, `autoComplete="new-password"`) after the phone field. No self-edit special case (D4).
- `src/pages/admin/distributors/components/update-distributor.schema.ts` — same `password` field/export as above.
- `src/pages/admin/distributors/components/DistributorProfileCard.tsx` — `hasLogin = distributor.username !== null` gate; password field replaces the old `<div />` spacer only when `hasLogin` is true, else the spacer is kept so the 2-column grid alignment holds (D1, D2).
- `src/config/translations.json` — 4 new keys: `admin.distributors.edit.password`, `admin.distributors.edit.passwordHelper`, `admin.settings.admins.edit.password`, `admin.settings.admins.edit.passwordHelper`. All `en`/`fr` filled, `ar: ""`.

**Migration:** none (no schema change, as planned).

---

## Verification

- `npx tsc --noEmit` — clean in `Apps/contract`. Clean in `Apps/web`. In `Apps/api`, all errors are confined to `test/` (frozen); confirmed via `git stash` that the identical `test/` breakage exists on the unmodified branch — pre-existing, not introduced by this set. `src/` in `Apps/api` is 0 errors.
- eslint — `Apps/contract` clean. `Apps/web`: the 4 changed files are individually clean; a stray formatting issue introduced in `EditAdminModal.tsx` (multi-line `Label` from the plan's copy-paste) was caught and fixed inline. The other errors `eslint src` surfaced (`StatCard.tsx`, `LandingPage.tsx`, `SetActionsMenu.tsx`, `wilaya-geometry.ts`) are in files **not touched** by this set — confirmed via `git status`, pre-existing lint debt. `Apps/api` has no eslint config/dependency in this repo at all (no `eslint.config.js`, not in `devDependencies`) — this predates the set and could not be run; flagging it as an open question below rather than silently skipping it.
- `npx madge --circular src` (via `src/index.ts` entry) in `Apps/contract` — 114 files processed, no circular dependency.
- `git status` — no test file changed (confirmed above; only the 9 listed files + the new plan doc).

---

## Open questions

1. **Q1 (from the plan, unresolved):** distributor `update()` now writes **two** log rows for a combined name+password edit (`CHANGE_DISTRIBUTOR_INFORMATION` + `CHANGE_USER_PASSWORD`), unlike the activator's single conditional row. This was the deliberate call in the plan because the two facts are genuinely different log types here. Confirm you want two rows, or say the word to collapse to one (at the cost of a combined edit logging only as a password change).
2. **`Apps/api` has no eslint setup in this repo.** Not something this set can fix without installing a dependency (against the "ask before installing" rule) — flagging rather than silently skipping the "eslint clean in all three" checklist item.

---

## Expected (frozen) test breakage

Not touched, not run, per the freeze. Expected to go red because of this set:
- Any contract conformance / unit test asserting the exact field set of `UpdateAdminSchema` or `UpdateDistributorSchema`.
- Any `admin.service` / `distributor.service` unit test asserting the exact `log.create` call shape for `update()`.
- Any RTL test asserting the DOM node count/labels inside `EditAdminModal` or `DistributorProfileCard`'s edit form.

(The `test/` tsc errors observed above are unrelated pre-existing breakage, not caused by this set — see Verification.)

---

## Manual test checklist

See [set-14-password.md §7](../../plan/set-14-password.md#7-manual-test-checklist) — 16 numbered scenarios covering: distributor with/without a login, admin edit (including self-edit), session persistence after password change (D3), and EN/FR translation + autofill sanity checks. Not run — hand-off for your manual pass.
