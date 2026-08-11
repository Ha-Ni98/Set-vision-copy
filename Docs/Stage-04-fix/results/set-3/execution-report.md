# Set 3 — Execution Report

**Plan:** [Docs/Stage-04-fix/plan/set-3-plan.md](../../plan/set-3-plan.md)
**Branch:** `version-02-01` · **Migration:** none

This set replaced the original "admin correction" Set 3, which was withdrawn per your
correction — the admin never edits an activation field, only the commission. This set instead
fixes a real storage-inversion bug in the existing client wrong-information flow, plus the Q1
fix you asked for (the `SUBMITTED` pre-pickup re-edit window, which previously always 409'd).

## Files changed, by package

### `Apps/api`
- `prisma/schema.prisma` — comment-only updates on `ActivationInformation.value` (now documented as the CURRENT value, updated by `update()`) and `WrongInformation.value` (now documented as the immutable REJECTED-value snapshot). **No migration** — the `@@unique([activationId, accountInform])` this set needs already existed.
- `src/modules/activation/activation.service.ts`:
  - `resolveLatestWinsInfo` renamed to `resolveEffectiveInfo`; the `wrongInformation` overlay was removed (only `additionalInformation`/OTP is still overlaid, keeping its null-overwrite semantics). All three call sites (`verify()`, `buildActiveRequestDTO()`, `getById()`) updated.
  - `flagWrong()` now snapshots the field's current value (read via `resolveEffectiveInfo` on data already in memory — no extra query) into `WrongInformation.value` instead of writing `null`.
  - `update()` rewritten: upserts `ActivationInformation` on `[activationId, accountInform]` (sequential `await`s, not `Promise.all`) instead of updating `WrongInformation`; guards writes to only the fields flagged in the latest `WRONG_INFORMATION` step; **and** now also accepts a `PENDING` pre-dispatch edit (Q1 fix — the client owns the whole form pre-pickup, no flagged-field guard applies, no status/step transition, no realtime event, since nothing has an activator yet to notify).

### `Apps/web`
- `src/pages/admin/activations/components/ActivationTimeline.tsx` — added the hint line under "Rejected Values".
- `src/config/translations.json` — `admin.activationDetail.timeline.wrongFields` re-labelled "Incorrect Fields" → "Rejected Values" (fr: "Champs incorrects" → "Valeurs rejetées"); new key `admin.activationDetail.timeline.wrongFieldsHint`.

**Not changed:** contract (no new command/route/event/DTO field — `UpdateActivationSchema` was already `{ accountFields }`), the client form, the activator card. Both render whatever the API returns, so the two behavioural fixes (activator keeps seeing the rejected value; client prefill no longer blanks) fall out of the backend change with zero frontend logic change.

## Migration

**None.** Per your instruction, no `prisma migrate reset` was run — the existing database still holds rows from before this fix, written under the old (inverted) semantics. Any activation that went through a correction *before* this change will show a stale value in `ActivationInformation` until it goes through the corrected flow again, since the `wrongInformation` overlay that used to mask this is now gone. You confirmed this is acceptable (test data).

## Verification

- `tsc --noEmit`: clean in `api` and `web` (contract untouched by this set). Same 9 pre-existing frozen-test errors as Set 2, unrelated to this set's changes.
- `eslint` (`web`): 115 problems, identical to the pre-existing baseline — zero new issues.
- `madge --circular src`: clean in `contract` and `api`.
- `npx prisma validate`: schema valid.
- `git status`: no test file created, modified, deleted, or run.

## Open questions from the plan — resolved

- **Q1 (SUBMITTED re-edit 409)** — fixed in this execution, per your instruction.
- **Q3 (stale DB rows)** — left as-is, per your instruction; no reset.
- **Q2 (clientFullName/clientPhone silently discarded on correction)** — not touched; unchanged behaviour, flagged for awareness only.
- **Q4 (no seeded activation exercises this flow)** — still true; manual testing must go through the real submit → flag → correct path, seeded data won't cover it.
- **Q5 (frozen tests)** — `Apps/api/test/unit/modules/activation*.spec.ts` and the activation integration spec assert the old `wrongInformation.updateMany` behaviour and will fail. Expected and untouched.

## Manual test checklist

Run against an activation created through the real client → activator flow (seeded data doesn't exercise this path).

1. **Baseline submit** — submit `USERNAME = "adm"` via the public portal. `ActivationInformation.USERNAME = "adm"`, no `WrongInformation` rows.
2. **Flag, then check the activator's card** — flag USERNAME as wrong. The card still shows `Username: adm` — it must **not** go blank.
3. **Flag, then check the client's form** — re-check the key: the correction form prefills `"adm"`, not empty.
4. **Snapshot landed** — in the DB, the round-1 `WrongInformation.USERNAME.value = "adm"`, not `null`.
5. **Correct it** — client changes USERNAME to `"admin"`. `ActivationInformation.USERNAME = "admin"`; the round-1 `WrongInformation.USERNAME` is still `"adm"`; no duplicate `ActivationInformation` row.
6. **Activator sees it live** — the card flips to `Username: admin` without a manual refresh, status badge moves to `PROCESSING`.
7. **Client's own tab reacts** — moves from "needs correction" to "processing" without a reload.
8. **Round 2 composes** — flag USERNAME again → new step's `WrongInformation.value = "admin"`. Client sends `"admin1"` → `ActivationInformation.USERNAME = "admin1"`. Two `WrongInformation` rows read `adm`, `admin` in order.
9. **Unflagged fields ignored** — flag only USERNAME, submit USERNAME + a changed EMAIL together. `ActivationInformation.EMAIL` is unchanged.
10. **Admin detail agrees** — Submitted Information shows the current value; the timeline's "Rejected Values" entries show the historical rejected values with the new hint line.
11. **Password in the clear** — flag and correct PASSWORD. Both old (in `WrongInformation`) and new (in `ActivationInformation`) values are visible unmasked in the admin detail. Confirm neither appears in the API's Pino output.
12. **OTP flow untouched** — request additional info (OTP), have the client answer. The activator's dedicated OTP field behaves exactly as before; `ActivationInformation` has no OTP row.
13. **Never-submitted field, then flagged** — submit without EMAIL, flag EMAIL, correct it. `WrongInformation.value` is `null` (nothing to snapshot); the upsert's `create` branch adds a new `ActivationInformation` row.
14. **Nothing leaks over the socket** — inspect the `activation:status-changed` and `activation:client-updated` socket frames: only ids/status/timestamp, no field values.
15. **Q1 — pre-pickup re-edit** — submit an activation, do **not** let an activator take it (stays `PENDING`), then use the "edit" action on the client portal to change a field. It succeeds (no 409), the field updates in `ActivationInformation`, and the activation stays `PENDING` (does not jump to `PROCESSING`, no activator to notify).
16. **Pre-pickup edit after takeover** — attempt the same pre-pickup edit after an activator has already taken the request (now `PROCESSING`, not `WRONG_INFORMATION` or `PENDING`) → still rejected with 409, since neither condition matches.
