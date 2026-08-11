# Set 14 — Optional "new password" field on the Distributor and Admin edit forms

**Depends on:** Set 1 (which introduced the activator optional-password pattern) · **Touches:** contract (2 fields), api (2 services), web (2 schemas, 2 components, 4 translation keys)
**Schema change:** none · **Migration:** none
**Date:** 2026-08-11 · **Branch:** `version-02-01`

**Goal:** replicate, field-for-field, the activator edit dialog's *optional new password* on
1. the **distributor** inline edit form — [DistributorProfileCard.tsx](Apps/web/src/pages/admin/distributors/components/DistributorProfileCard.tsx), reached from [DistributorDetailPage.tsx](Apps/web/src/pages/admin/distributors/DistributorDetailPage.tsx)
2. the **admin account** edit dialog — [EditAdminModal.tsx](Apps/web/src/pages/admin/settings/components/EditAdminModal.tsx), reached from [AdminAccountsTab.tsx](Apps/web/src/pages/admin/settings/components/AdminAccountsTab.tsx)

**Confirmed decisions (this session):**
- **D1 — Distributor with no linked login:** the password field is **not rendered**; the backend additionally rejects a password for such a distributor with `ConflictError` (§3.2). Creating the login is the existing separate flow, which already takes a chosen password.
- **D2 — Placement:** distributor password goes **inline in the existing edit grid**, not in a new dialog (§4.1).
- **D3 — Sessions:** a password change **does not** revoke refresh tokens. This matches every existing password path (activator edit + all three resets). No behaviour drift outside this set.
- **D4 — Admin self-edit:** allowed with **no special case**. The JWT is untouched, so the admin stays signed in and the new password applies at next login.

---

## 1. Audit — the pattern being copied

The activator path is complete and is the reference. Every piece below already exists; nothing new is being invented.

| Layer | File | What it does |
|---|---|---|
| contract | [activator.command.ts:19](Apps/contract/src/modules/activator/activator.command.ts#L19) | `password: z.string().min(8).optional()` on `UpdateActivatorSchema` |
| api (route) | [activator.routes.ts](Apps/api/src/modules/activator/activator.routes.ts) | `validateRequest({ body: UpdateActivatorSchema })` — **`min(8)` is therefore already enforced server-side, for free** |
| api (service) | [activator.service.ts:202-231](Apps/api/src/modules/activator/activator.service.ts#L202-L231) | hashes when present, folds into the same `user.update`, picks the log action type conditionally |
| api (mapper) | [activator.mapper.ts:129-139](Apps/api/src/modules/activator/activator.mapper.ts#L129-L139) | `toPersistenceUpdate` **whitelists** `fullName/username/phone` — password never reaches the profile row |
| web (schema) | [update-activator.schema.ts:22-35](Apps/web/src/pages/admin/activators/components/update-activator.schema.ts#L22-L35) | `""` passes, `""` → `undefined`, otherwise `≥ 8`; exports both `…FormValues` (`z.infer`) and `…FormInput` (`z.input`) |
| web (component) | [EditActivatorModal.tsx:88-115](Apps/web/src/pages/admin/activators/components/EditActivatorModal.tsx#L88-L115) | the field markup: eye toggle, `autoComplete="new-password"`, helper line that the error replaces |

Two mechanics worth stating explicitly, because both targets depend on them:

- **Empty means "unchanged", end to end.** The Zod `.transform()` turns `""` into `undefined`; `JSON.stringify` drops `undefined` keys, so the PATCH body simply has no `password`. No sentinel value, no server-side "is it blank" check.
- **The `useForm` generic must be the 3-arg form.** A schema with a `.transform()` has different input and output types, so `useForm<Input, unknown, Output>` is required. `useForm<Output>` will not compile once the transform is added — this is the one change in each component that is easy to miss.

### Current state of the two targets

**Distributor** — [distributor.command.ts:12-19](Apps/contract/src/modules/distributor/distributor.command.ts#L12-L19) has no `password` on `UpdateDistributorSchema`. The edit UI is an **inline form inside the profile card** (`isEditing` toggles display ↔ form), has **no username field**, and the grid ends with an empty `<div />` spacer at [DistributorProfileCard.tsx:174](Apps/web/src/pages/admin/distributors/components/DistributorProfileCard.tsx#L174).

The distributor/login relationship is the one real difference from the activator: `Distributor.userId` is **nullable**, `DistributorDetailDTO.username` is `z.string().nullable()` ([distributor.dtos.ts:9](Apps/contract/src/modules/distributor/distributor.dtos.ts#L9)), and the login is created/unlinked through `createAccount` / `unlinkAccount`. Hence D1.

**Admin** — [admin.command.ts:10-15](Apps/contract/src/modules/admin/admin.command.ts#L10-L15) has no `password` on `UpdateAdminSchema`. `AdminService.update` currently touches `user` **only when `username` is supplied** ([admin.service.ts:111-114](Apps/api/src/modules/admin/admin.service.ts#L111-L114)) — that condition has to become a `userData` object, exactly as the activator does. There is **no self-service change-password screen anywhere in the app**, which is why D4 is "allow".

---

## 2. Contract

> Rule reminders that govern this section: zero logic, types are `z.infer` of a schema, no sensitive field in any **DTO** (a *Command* input is the sanctioned place for a password — `CreateUserSchema` in contract-rules §5C is the canonical example).

### 2.1 `Apps/contract/src/modules/admin/admin.command.ts`

Add to `UpdateAdminSchema`, after `phone`:

```ts
  // Optional new password (Set 14). Omit it to leave the current password unchanged.
  password: z.string().min(8).optional(),
```

Do **not** add a password to `CreateAdminSchema` — admin creation still auto-generates and reveals once. Out of scope.

### 2.2 `Apps/contract/src/modules/distributor/distributor.command.ts`

Add to `UpdateDistributorSchema`, after `communeId`:

```ts
  // Optional new password for the distributor's linked login (Set 14). Omit it to leave the
  // current password unchanged. Rejected with 409 if the distributor has no linked login.
  password: z.string().min(8).optional(),
```

`CreateDistributorAccountSchema` already has its own optional password — leave it alone.

### 2.3 Nothing else

No new files, no barrel edits (both modules already `export * from './[module].command'`), no DTO changes, no route-constant changes. `madge --circular src` must stay clean.

---

## 3. Backend

> Rule reminders: no `res.status().json()` in a service, errors are `AppError` subclasses, no `console.*`, routes come from contract constants. Both `PATCH` routes already validate the body against the contract schema, so **no route file changes** — the `min(8)` rule lands server-side automatically.

### 3.1 `AdminService.update` — [admin.service.ts:96-134](Apps/api/src/modules/admin/admin.service.ts#L96-L134)

Mirror the activator implementation.

1. Leave `AdminMapper.toPersistence` **unchanged** — it whitelists `fullName/username/phone`, so `cmd.password` is already dropped from `adminFields` with no code change. Do not add `password` to its return type.
2. After the username-conflict check, hash conditionally and build the user patch:

```ts
    // Optional new password (Set 14) — hashed here and folded into the same user update
    // below. Absent = leave the password untouched.
    const hashedPassword = cmd.password ? await hashPassword(cmd.password) : undefined;
    const userData = {
      ...(username !== undefined && { username }),
      ...(hashedPassword !== undefined && { password: hashedPassword }),
    };
```

3. Replace the `username !== undefined ? tx.user.update(...) : result.user` ternary with the `Object.keys(userData).length > 0` form used at [activator.service.ts:210-214](Apps/api/src/modules/activator/activator.service.ts#L210-L214).
4. Make the log entry conditional, same shape as [activator.service.ts:221-231](Apps/api/src/modules/activator/activator.service.ts#L221-L231):
   - `actionType`: `LogActionType.CHANGE_USER_PASSWORD` when a password was set, else `LogActionType.CHANGE_USER_INFORMATION`.
   - `actionDescription`: `Updated admin information (incl. password): ${user.username}` / `Updated admin information: ${user.username}`.

`hashPassword` is already imported in this file. No interface change — `update`'s signature is unchanged.

### 3.2 `DistributorService.update` — [distributor.service.ts:124-165](Apps/api/src/modules/distributor/distributor.service.ts#L124-L165)

This one is not a pure copy, because the login is optional and lives on a different row.

1. The existing `findFirst` already returns the full distributor row, so `existing.userId` is available — **do not** add a `select`/`include` that would drop it.
2. Immediately after the not-found check, enforce D1:

```ts
    // The login is a separate, optional row (createAccount/unlinkAccount own it), so a
    // password for an account-less distributor is a client error, not a silent no-op.
    if (cmd.password !== undefined && !existing.userId) {
      throw new ConflictError('Distributor has no account');
    }
```

`ConflictError` is already imported. Wording matches `createAccount`'s `'Distributor already has an account'`.

3. Hash **before** the transaction (bcrypt is slow — do not hold a transaction open across it), same as the activator:

```ts
    const hashedPassword = cmd.password ? await hashPassword(cmd.password) : undefined;
```

4. Inside the existing `$transaction`, after the `tx.distributor.update(...)` call, add the user update:

```ts
      if (hashedPassword && existing.userId) {
        await tx.user.update({ where: { id: existing.userId }, data: { password: hashedPassword } });
      }
```

`existing.userId` is re-tested only to satisfy the narrowing; the guard in step 2 is the real check.

5. **Logging — deliberate deviation from the activator.** Keep the existing `CHANGE_DISTRIBUTOR_INFORMATION` log exactly as it is, and **append a second entry** in the same transaction when a password was set:

```ts
      if (hashedPassword) {
        await tx.log.create({
          data: {
            actionType: LogActionType.CHANGE_USER_PASSWORD,
            actionDescription: `Changed login password for distributor ${d.fullName}`,
            userId: actorId,
          },
        });
      }
```

Rationale: for the activator both branches are `CHANGE_USER_*` types, so one conditional row loses nothing. Here the two facts are genuinely different log types (`CHANGE_DISTRIBUTOR_INFORMATION` vs `CHANGE_USER_PASSWORD`) and a combined edit would otherwise erase the profile-edit audit trail. If you'd rather have one row, say so and I'll collapse it — but then a name+password edit logs only as a password change.

6. `hashPassword` is already imported. No interface change, no mapper change — the `data:` object in `tx.distributor.update` lists its fields explicitly, so `cmd.password` cannot leak onto the distributor row.

### 3.3 Not touched

`admin.routes.ts`, `distributor.routes.ts`, both controllers, both interfaces, both mappers, `password.utils.ts`, the reset-password endpoints, `refreshToken` handling (D3).

---

## 4. Frontend

> Rule reminders: Component → Hook → Service (hooks and services need **no change** here — the command type flows through `useUpdateDistributor` / `useUpdateAdmin` generically), no inline strings in JSX, `ar` present as `""`, layout survives loading/error.

### 4.1 Distributor

**a. `Apps/web/src/pages/admin/distributors/components/update-distributor.schema.ts`**

Add the field to the object, copied verbatim from the activator schema (same comment intent, same message keys):

```ts
    // Optional new password (Set 14): blank passes and is stripped to `undefined` so the
    // current password is left unchanged; a typed value must be ≥ 8 chars.
    password: z
      .string()
      .refine((v) => v.length === 0 || v.length >= 8, t("common.validation.minLength", { min: 8 }))
      .transform((v) => (v.length === 0 ? undefined : v))
      .optional(),
```

Add the input-type export next to the existing one:

```ts
// Pre-transform shape — what useForm's field-values generic needs (see update-activator.schema.ts).
export type UpdateDistributorFormInput = z.input<ReturnType<typeof updateDistributorSchema>>;
```

Leave the `_UpdateDistributorCommandCheck` guard as is — it now also proves the new field matches §2.2.

**b. `Apps/web/src/pages/admin/distributors/components/DistributorProfileCard.tsx`**

1. Import `useState` is already there; add `Eye, EyeOff` to the existing `lucide-react` import and `UpdateDistributorFormInput` to the schema import.
2. `const [showPwd, setShowPwd] = useState(false);` next to `isEditing`.
3. Derive the D1 gate from the DTO (nullable username = no login):
   ```ts
   const hasLogin = distributor.username !== null;
   ```
4. Change the generic to the 3-arg form:
   ```ts
   useForm<UpdateDistributorFormInput, unknown, UpdateDistributorFormValues>({ … })
   ```
5. Add `password: ""` to **both** `defaultValues` and the `reset({ … })` inside the `isEditing` effect. Leave that effect's `eslint-disable` line and dep array alone.
6. Replace the empty `<div />` spacer at line 174 with:
   ```tsx
   {hasLogin ? (
     <div className="space-y-2"> …password field… </div>
   ) : (
     <div />
   )}
   ```
   Keeping the spacer in the else branch preserves the 2-column grid alignment for the wilaya/commune row below.
7. The field body is the **exact markup** of [EditActivatorModal.tsx:89-114](Apps/web/src/pages/admin/activators/components/EditActivatorModal.tsx#L89-L114), with these substitutions only:
   - `id` / `htmlFor` → `edit-distributor-password`
   - label key → `admin.distributors.edit.password`
   - helper key → `admin.distributors.edit.passwordHelper`
   - the eye button's `aria-label` keeps the shared `auth.login.showPassword` / `auth.login.hidePassword` keys (already reused cross-scope by the activator and distributor-account modals)
   - keep `type={showPwd ? "text" : "password"}`, `autoComplete="new-password"`, `className="pe-10"`, `tabIndex={-1}`
8. Nothing else changes: `onSave(values)` already receives the transformed output type, and `DistributorDetailPage` passes it straight to `updateDistributor.mutate({ id, command: values })`. `useUpdateDistributor` invalidates `qk.distributors.all()` = `["distributors"]`, which prefix-matches the detail query, so the card refetches on its own.

### 4.2 Admin

**a. `Apps/web/src/pages/admin/settings/components/update-admin.schema.ts`**

Same two additions as §4.1a: the `password` field (identical code) and

```ts
export type UpdateAdminFormInput = z.input<ReturnType<typeof updateAdminSchema>>;
```

**b. `Apps/web/src/pages/admin/settings/components/EditAdminModal.tsx`**

This is the closest to a straight copy of `EditActivatorModal`:

1. Add `useState` to the React import, `Eye, EyeOff` from `lucide-react`, `UpdateAdminFormInput` to the schema import.
2. `const [showPwd, setShowPwd] = useState(false);`
3. `useForm<UpdateAdminFormInput, unknown, UpdateAdminFormValues>({ … })`.
4. `password: ""` in `defaultValues` and in the `reset({ … })` inside the existing open-effect.
5. Insert the password field block after the phone field, before `<DialogFooter>` — same markup as §4.1.7 with `id`/`htmlFor` = `edit-admin-password`, label key `admin.settings.admins.edit.password`, helper key `admin.settings.admins.edit.passwordHelper`.
6. **No self-edit special case** (D4). `AdminAccountsTab` already computes `isSelf` for the *delete* guard only — do not extend it to the edit dialog, do not thread a new prop.

### 4.3 `Apps/web/src/config/translations.json` — 4 new keys

Flat key → `{ en, fr, ar }`, `ar` as `""`. Copy is lifted from the activator equivalents so the three forms read identically.

Insert after `"admin.distributors.account.passwordHelper"` (currently line 587):

```json
  "admin.distributors.edit.password": { "en": "New Password (optional)", "fr": "Nouveau mot de passe (facultatif)", "ar": "" },
  "admin.distributors.edit.passwordHelper": { "en": "Leave blank to keep the current password.", "fr": "Laissez vide pour conserver le mot de passe actuel.", "ar": "" },
```

Insert after `"admin.settings.admins.edit.title"` (currently line 917):

```json
  "admin.settings.admins.edit.password": { "en": "New Password (optional)", "fr": "Nouveau mot de passe (facultatif)", "ar": "" },
  "admin.settings.admins.edit.passwordHelper": { "en": "Leave blank to keep the current password.", "fr": "Laissez vide pour conserver le mot de passe actuel.", "ar": "" },
```

Scope-local keys rather than reusing `admin.activators.edit.*`, following the precedent already set by `admin.distributors.account.password` vs `admin.activators.create.password`. No new validation keys — `common.validation.minLength` already exists and is interpolated.

### 4.4 Not touched

`useDistributors.ts`, `useAdmins.ts`, both service files, `AddAdminModal` (admin creation keeps auto-generating), `CreateDistributorAccountModal`, `GeneratedPasswordPanel`, the reset-password dialogs, `DistributorsTable`.

---

## 5. Tests — frozen

Do not create, modify, delete, move, or run any test file or test config. Do not run `npm test`, `test:unit`, `test:int`, or `validate`.

Expect existing suites to go red — `UpdateAdminSchema` / `UpdateDistributorSchema` gain a field, and both edit forms gain a DOM node, so contract conformance tests, service unit tests and any RTL test asserting the field set will break. **That is expected and out of scope.** Note it in the report; do not fix it.

---

## 6. Definition of done

1. `npx tsc --noEmit` clean in `Apps/contract`, `Apps/api`, `Apps/web`
2. eslint clean in all three
3. `npx madge --circular src` clean in `Apps/contract`
4. No migration (no schema change) — nothing to run
5. `git status` shows **no** test file changed
6. No magic strings in any changed file — all copy through `t()`, all log types through `LogActionType`
7. Stop and report. Do not start the next set.

Report to `Docs/Stage-04-fix/results/set-14-password/`: files created/modified grouped by package, "migration: none", open questions, execution report, and the checklist below.

---

## 7. Manual test checklist

**Distributor — with a login**
1. Open a distributor that shows a username on its profile card → **Edit** → the "New Password (optional)" field is present, masked, with the helper line under it.
2. Click the eye icon → the value becomes visible; click again → masked.
3. Type 4 characters → **Save** → inline "at least 8 characters" error, the dialog stays open, nothing is saved.
4. Change the store name only, leave the password blank → **Save** → the card shows the new store name; the distributor can still sign in with the **old** password.
5. Set a password of 8+ characters together with a phone change → **Save** → both persist; the distributor can sign in with the **new** password and not the old one.
6. Sign in as that distributor in a second browser *before* step 5, then repeat step 5 → that session stays alive (D3 — expected, not a bug).

**Distributor — without a login**
7. Open a distributor whose profile card shows "no account" → **Edit** → the password field is **absent**, and the two-column layout of the remaining fields is unchanged.
8. Save a name change on that distributor → succeeds normally.

**Admin accounts**
9. Settings → Admin accounts → row menu → **Edit** on *another* admin → the "New Password (optional)" field is present, masked, with helper text; the eye toggle works.
10. Type 4 characters → **Save** → inline minimum-length error, nothing saved.
11. Leave it blank, change the full name → **Save** → the row updates; that admin still signs in with the old password.
12. Set a new 8+ character password → **Save** → sign out, sign in as that admin with the new password → works; the old one is rejected.
13. **Edit your own row**, set a new password → **Save** → you stay signed in (D4); sign out and back in with the new password → works.
14. Reset-password from the row menu still reveals a generated password once and still works after all of the above.

**Cross-cutting**
15. Toggle the language EN ↔ FR with each dialog open → the label and helper line both translate; no raw key text appears.
16. Browser autofill does not pre-fill either password field on open (that is what `autoComplete="new-password"` is for).

---

## 8. Open questions / notes

- **Q1 (blocking nothing, answer at review):** distributor logging writes two rows for a combined name+password edit (§3.2 step 5). Confirm you want two rows rather than the activator's single conditional row.
- **Note A:** the `AssertAssignable` guards check *form output extends contract command*, not the reverse — a contract field missing from a form is not a compile error. Unchanged by this set, just don't read the guard as bidirectional.
- **Note B:** an admin who mistypes their own new password in step 13 has no recovery path from the UI other than another admin resetting it. This is pre-existing (there is no self-service change-password screen) and D4 accepts it; worth a follow-up set if you want a "current password + new password" self-service form.
- **Note C:** no rate limiting or password-strength rule beyond `min(8)` — same as the activator. If you want a strength policy it should be one shared contract-level schema applied to all four password entry points at once, not bolted on here.
