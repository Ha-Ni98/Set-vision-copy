# Set 5 — Execution Report: Card revocation requests

**Plan:** `Docs/Stage-04-fix/plan/set-5-plan.md` · **Branch:** `version-02-01` · **Date:** 2026-08-10
**Order followed:** prisma → contract → backend → frontend, per plan.

---

## Migration

**Name:** `20260810081327_add_card_revocation_request`

Created and applied via `npx prisma migrate dev`. Contents: `CREATE TYPE "RevocationRequestStat"`, `ALTER TYPE "LogActionType" ADD VALUE 'CHANGE_REVOCATION_REQUEST_STAT'`, `CREATE TABLE "CardRevocationRequest"` with 4 indexes + 4 FK constraints. No existing model gained a required field; no seed script needed updating.

---

## The `card.service.ts` refactor — exactly one place mutates `Card` revocation state

As the plan called out, `CardService.revoke()` could not be reused as-is because it opened its own `$transaction` and wrote its `REVOKE_CARD` log *after* it — neither of which the revocation-request approval path could join.

**What changed:** the body of `revoke()` was extracted into a module-level exported function, `revokeCardWithin(tx, cardId, actorId)`, in [card.service.ts](Apps/api/src/modules/card/card.service.ts). `CardService.revoke()` is now a thin wrapper: `this.prisma.$transaction(tx => revokeCardWithin(tx, id, actorId))` + a re-read for the DTO. `CardRevocationRequestService.approve()` calls the same function inside its own transaction.

**Verified: `grep -rn "isRevoked" Apps/api/src` shows exactly one write site** (`revokeCardWithin`) — everything else is a read (the `card.dtos` field, `card.mapper`, `statistics.service`'s count, the three web components).

Three deliberate behaviour changes carried by the refactor, all called out per the plan:
1. **The `REVOKE_CARD` log now writes inside the transaction** (was after it — one of the five legacy R8 sites; closing it here was required by "approve = card mutation + log write in one transaction").
2. **`deletedAt` is now checked** — a soft-deleted card was previously revocable through this path; it no longer is.
3. **An explicit `isRevoked` guard was added** — previously only reachable indirectly via the `cardStat` check.

No signature or route change to `CardService.revoke()` / `CARD_ROUTES.REVOKE`; the direct admin revoke behaves identically (manual test 12 below verifies this explicitly).

---

## Eligibility — as clarified by the user

The plan's original design proposed a 6-condition conjunction including an `ActivationStat` allowlist. The user clarified mid-session: *"the distributor can only request a revoke for cards with activation failed (like the admin can revoke only a card with this stat)"* — i.e. eligibility should be **exactly** the gate `CardService.revoke()` itself uses, no broader and no narrower. Implemented as five conditions in `CardRevocationRequestService.create()` and mirrored in `getEligible()`'s `where` clause, so the UI list and the server check cannot drift:

1. card exists, `deletedAt === null`
2. ownership — `card.distributorId === distributor.id` (404, not 403, if it belongs to someone else)
3. `cardStat === ACTIVATION_FAILED`
4. `!isRevoked`
5. `!isDisabled`

No separate `ActivationStat` allowlist. `activationId` is still resolved and stored (most-recent `Activation` by `requestedAt`) for display/audit context, never as an eligibility gate.

---

## Duplicate-request policy

At most one `PENDING` request per card, enforced in `create()` with a `findFirst({ where: { cardId, stat: PENDING } })` check before insert. `REJECTED`/`CANCELLED` cards may be resubmitted; an `APPROVED` request's card fails eligibility instead (already revoked), which produces the more useful message. Per the plan, no hand-written partial unique index was added (Q2 — kept the schema portable, relying on the service check + `revokeCardWithin`'s `isRevoked` guard as the actual safety net against double-revocation).

---

## Files created / modified

### `Apps/api` (prisma)
- **Modified:** `prisma/schema.prisma` — `RevocationRequestStat` enum, `CardRevocationRequest` model, `LogActionType += CHANGE_REVOCATION_REQUEST_STAT`, virtual back-references on `Card`/`Activation`/`Distributor`/`User`.
- **New:** `prisma/migrations/20260810081327_add_card_revocation_request/`

### `Apps/contract`
- **New module** `src/modules/card-revocation-request/`: `.enums.ts`, `.routes.ts`, `.command.ts` (`reason: z.string().min(3).max(500)` — 3 chars per user's clarification, not the originally proposed 10), `.query.ts`, `.dtos.ts`, `.events.ts`, `index.ts`
- **Modified:** `src/index.ts` (barrel), `src/modules/log/log.enums.ts` (`+CHANGE_REVOCATION_REQUEST_STAT`)
- **`card.*` and `activation.*` contract modules: untouched**, as the plan required.

### `Apps/api` (backend)
- **New module** `src/modules/card-revocation-request/`: `.mapper.ts`, `.interface.ts`, `.service.ts`, `.controller.ts`, `.routes.ts` — 5 files, mirroring Set 4's module shape.
- **Modified:**
  - `src/modules/card/card.service.ts` — the `revokeCardWithin` extraction described above
  - `src/modules/index.ts` — router wiring
  - `src/common/events/event-bus.ts` — `AppEvents` widened with `CardRevocationRequestEvents`
  - `src/common/realtime/socket.types.ts`, `realtime-gateway.ts` — two new events, routed to `/admin` (`ADMIN_BELL`) and `/distributors` (`rooms.distributor(id)`)

### `Apps/web`
- **New:** `src/services/card-revocation-requests.service.ts`, `src/hooks/useCardRevocationRequests.ts`, `src/pages/distributor/RevocationsPage.tsx` + `components/{SubmitRevocationRequestModal.tsx, submit-revocation-request.schema.ts, MyRevocationRequestsTable.tsx}`, `src/pages/admin/distributors/RevocationRequestsPage.tsx` + `components/{RevocationRequestsFilters.tsx, RevocationRequestsTable.tsx, ReviewRevocationRequestModal.tsx, review-revocation-request.schema.ts}`
- **Modified:** `src/lib/query-keys.ts` (+`cardRevocationRequests` family), `src/lib/realtime.ts` (admin + distributor listeners, local `ServerToClientEvents` widened further), `src/components/shared/StatusBadge.tsx` (+`RevocationRequestStatusBadge`, `LOG_ACTION_TONE` entry), `src/config/nav-links.ts`, `src/App.tsx` (2 routes, static-before-`:id` precedence preserved), `src/config/translations.json` (~55 keys, `en`/`fr`/`ar:""`)

---

## Decisions applied (per user)

- **Eligibility (Q3/Q4):** simplified to `cardStat === ACTIVATION_FAILED` only, exactly mirroring the admin's own revoke gate — confirmed explicitly, resolving both questions at once.
- **Q5:** `reason` minimum length is **3 characters**, not the originally proposed 10.
- Q1, Q2, Q6, Q7: recommendation followed as-is (add `CHANGE_REVOCATION_REQUEST_STAT`; no hand-written partial unique index; approval outcome unchanged field-for-field from the direct admin revoke; 5-file backend module).

---

## Definition-of-done checks

| Check | Result |
|---|---|
| `tsc --noEmit` — contract | ✅ clean |
| `tsc --noEmit` — api | ✅ clean (production code); frozen test files show expected drift (Set 4's `order.service` signature change + pre-existing activation mapper drift) — untouched |
| `tsc --noEmit` — web (both configs) | ✅ clean (production code); one pre-existing frozen-test error (`formatTime`, from Set 2/3) |
| `eslint` — contract | ✅ clean |
| `eslint` — api | no tooling installed (pre-existing gap) |
| `eslint` — web | 117 problems, identical file list to the Set-4 baseline — zero new issues |
| `madge --circular` — contract | ✅ clean |
| `madge --circular` — api (informational) | ✅ clean — no cycle between `order` → `card-order-request` and `card-revocation-request` → `card` |
| Migration applied | ✅ `20260810081327_add_card_revocation_request` |
| Test files touched | ✅ none — verified via `git status` |
| Exactly one `Card.isRevoked` write site | ✅ `revokeCardWithin` — verified via grep |

---

## Manual test checklist

Setup: drive a card to `ACTIVATION_FAILED` via the real path — client submits → activator takes → activator freezes → **admin cancels the frozen activation**. That is the only path that produces a revocable card.

1. **The action appears only where it should.** The distributor's revocation page lists exactly that one card; a card that is `AT_DISTRIBUTOR`/`ACTIVATED`/`ACTIVATION_PROGRESS`/disabled/already-revoked, or belongs to another distributor, does not appear.
2. **Submit → admin sees it live; the card is NOT yet revoked.** Distributor submits a reason. Admin's queue gains the row live; the card's `isRevoked`/`cardStat` are unchanged in `/admin/activations/cards`.
3. **Approve → card revoked correctly.** `isRevoked = true`, `cardStat = AT_DISTRIBUTOR`, `isActive = true`, `isDisabled` unchanged, distributor's `nbOfActiveCards` +1, distributor's page flips to `APPROVED` live.
4. **`REVOKE_CARD` log present, identical to a direct revoke.** `/admin/logs` shows `Revoked card: <key>` with the approving admin as actor, plus a `CHANGE_REVOCATION_REQUEST_STAT` row alongside it.
5. **Reject → card untouched, reason visible.** Reject with an `adminNote`; card unchanged; distributor sees `REJECTED` and the note.
6. **Duplicate while `PENDING`.** Second submit for the same card → 409, confirmed via UI and `curl`.
7. **Resubmit after rejection is allowed.** Same card, after rejection → new `PENDING` row accepted.
8. **Still-active activation → rejected server-side.** `curl` a request for a card in `ACTIVATION_PROGRESS` → 409, no row created.
9. **Another distributor's card → 404.** `curl` with B's token against A's failed card → 404, no row created.
10. **Cross-distributor isolation on reads.** B's `/mine` excludes A's requests; admin `GET_ALL` with B's token → 403.
11. **Cancel.** `PENDING` → `CANCELLED`, gone from the admin queue, log actor = the distributor's user. `APPROVED` → cancel rejected with 409 (unlike Set 4's order requests, revocation approval is instantaneous/terminal).
12. **The direct admin revoke still works unchanged.** From `/admin/activations/cards`, revoke a failed card the old way — same result as test 3, confirming the refactor didn't alter existing behaviour.
13. **Approve a request whose card changed underneath.** Submit, then revoke the card directly as admin, then approve the request → 409, request stays `PENDING`, `nbOfActiveCards` incremented exactly once (not twice).
14. **Reconnect.** Kill/restart the API; both the admin queue and the distributor history re-fetch on reconnect.
