# Set 8 — Lot creation card picker — Execution Report

**Implemented exactly per** `Docs/Stage-04-fix/plan/set-8-plan.md`. Order: contract → backend → frontend.
**Date:** 2026-08-11 · **Branch:** `version-02-01`

No open questions blocked execution — the plan's Q1 (confirmed: predicate tightenings accepted),
Q2 (`AvailableCardDTO` deleted, not deprecated), Q3 (oldest-set-first ordering), Q4 (`limit` caps
at 20 sets), Q6 (no seed change needed) were all pre-resolved in the plan itself. Q5 (frozen
tests) and Q7 (search index threshold — no index added) are informational, not blocking.

---

## Files created

**`Apps/api`**
- `src/modules/card/card.eligibility.ts` — `lotEligibleCardWhere()`, the one predicate shared by
  the read (`getAvailableForLot`) and the write (`LotService.create()`)

**`Apps/web`**
- `src/pages/admin/activations/components/card-picker.types.ts` — `SelectedCard` (the Map value
  shape: `{key, setId, setNumber}`)
- `src/pages/admin/activations/components/CardPickerRow.tsx` — `React.memo`'d single row
- `src/pages/admin/activations/components/CardPickerGroup.tsx` — collapsible group with a
  tri-state header checkbox
- `src/pages/admin/activations/components/CardPicker.tsx` — search + paged groups + selection
  counter, the component `CreateLotModal` now composes

## Files modified

**`Apps/contract`**
- `src/modules/card/card.enums.ts` — += `CardUnavailableReason`
- `src/modules/card/card.dtos.ts` — removed `AvailableCardResponseSchema`/`AvailableCardDTO`
  (single consumer, replaced in this same set); added `AvailableCardItemSchema`,
  `AvailableCardSetGroupSchema`, `AvailableCardsBySetSchema`, `UnavailableCardSchema`,
  `LotCreationConflictDetailsSchema`
- `src/modules/card/card.query.ts` — `GetAvailableCardsQuerySchema` += `search`, `page`
  (`min 1 max 100`), `limit` (`min 1 max 20 default 5`)
- `src/modules/lot/lot.command.ts` — `CreateLotSchema.cardIds` += duplicate-id `.refine()`

**`Apps/api`**
- `src/modules/card/card.service.ts` — `getAvailableForLot()` rewritten: pages `Set`, not `Card`,
  with a nested `cards` include filtered by the same `cardWhere`; added the module-level
  `buildKeySearch()` search helper (exact-match fast path + prefix `startsWith`)
- `src/modules/card/card.mapper.ts` — `toAvailableDTO` → `toAvailableCardsBySetDTO`
- `src/modules/card/card.interface.ts` — `getAvailableForLot` return type
- `src/modules/lot/lot.service.ts` — `create()` rewritten: diagnostic classification (a) →
  `lot.create` (b) → re-asserted `updateMany` against `lotEligibleCardWhere` with a
  `count !== cardIds.length` guard (c), all inside one transaction; added the module-level
  `classifyCard()` helper and `CardDiagnosticRow` type

**`Apps/web`**
- `src/services/cards.service.ts` — `getAvailableForLot` return type
- `src/hooks/useCards.ts` — `useAvailableCardsForLot(planId, {search,page,limit})` with
  `placeholderData: keepPreviousData`
- `src/lib/query-keys.ts` — `cards.availableForLot(query)` now takes the full query
- `src/pages/admin/activations/components/CreateLotModal.tsx` — rewritten around `CardPicker`;
  owns plan selection, the `Map<string, SelectedCard>` selection state, form validation, and the
  409-conflict list
- `src/pages/admin/activations/components/create-lot.schema.ts` — mirrored the duplicate-id refine
- `src/pages/admin/activations/SetsLotsPage.tsx` — passes `createLot.error` into the modal and
  resets it on close (mirrors the existing `CreateSetModal` wiring)
- `src/config/translations.json` — 19 new keys under `admin.setsLots.lots.create.*` /
  `.picker.*`; removed the now-dead `admin.setsLots.lots.create.selectedCount` key (its only
  caller was the flat list this set replaces)

## Migration: none

`schema.prisma` is untouched, as planned — the predicate uses only existing columns and indexes.

---

## Deviations from the plan (disclosed)

1. **§5.5's "prefer the key from the client's selection, fall back to the server's key" was
   simplified to "use the server's key directly."** The plan's fallback chain existed to handle a
   case where the client's local `Map` might know a key the server response didn't — but by the
   time the conflict list renders, the failed cards have already been removed from the selection
   Map (so it can no longer be re-queried), and implementing the fallback would have meant either
   a side-effecting `setState` call inside another `setState`'s updater function (a real anti-
   pattern) or extra state just to carry the stale keys across one render. In practice this
   distinction is moot: `classifyCard()` includes `card.key` for every row that was found at all —
   even soft-deleted ones — so `key: null` only occurs for a genuinely non-existent card id, which
   the UI can never produce (only a replayed/forged request can, manual test 16). The simpler
   version — render `c.key`, falling back to a translated "unknown card" label — gives the same
   practical result with less code and no anti-pattern.
2. **`common.actions.selectAll` / `common.actions.deselectAll` translation keys were left in
   place**, even though their only caller (the old flat-list `CreateLotModal`) is gone. They're
   under the shared `common.actions.*` namespace rather than `admin.setsLots.*`, so unlike
   `selectedCount` (which I did remove) they read as general-purpose actions that could be reused
   elsewhere, not lot-picker-specific dead code. Flagging in case you'd rather they go too.

Nothing else deviates — the eligibility predicate, the grouped/paged response shape, the search
behaviour, the selection state design, the conflict error shape, and the transaction structure all
match the plan as written.

---

## Definition of done

- `npx tsc --noEmit` — clean in `Apps/contract`, `Apps/api` (pre-existing errors confined to
  `test/` — pre-Set-8 fixture drift from earlier sets, `activationCost`/`telegramLinkToken`
  additions; unrelated to this set and not touched), `Apps/web` (fully clean, including
  `Apps/web/tests/`)
- eslint — `Apps/contract` clean; `Apps/web`: one file (`CardPicker.tsx`) needed a prettier
  `--fix` scoped to itself only (two formatting-only fixes: a missing line break and an
  unwrapped JSX conditional), all Set 8 files clean afterward. **`Apps/api` has no eslint
  installed** — pre-existing gap, flagged in every prior set's report since Set 1, not fixed
  here (would mean installing a new dependency without asking)
- `npx madge --circular --extensions ts src` in `Apps/contract` — clean
- `git status` confirms no test file (`**/*.test.ts`, `**/*.spec.ts`, `tests/`, `__tests__/`,
  vitest configs) was created, modified, or deleted
- `lotEligibleCardWhere` is the only expression of lot eligibility in `Apps/api/src` — both
  `CardService.getAvailableForLot()` and `LotService.create()` import it; nothing inlines any part
  of it
- No magic strings: routes from `CARD_ROUTES`/`LOT_ROUTES`, reasons from `CardUnavailableReason`,
  every new label from `translations.json` with `ar: ""`
- No new dependency in any `package.json` — the group collapse/expand is plain `useState`, the
  tri-state checkbox uses Radix's existing `checked={true|false|"indeterminate"}` support
  (`@radix-ui/react-checkbox` was already a dependency), and off-screen groups use a Tailwind
  arbitrary value (`[content-visibility:auto]`), not a virtualization library

---

## Not done this session

**The UI was not exercised in a browser.** No dev server was started; verification is `tsc` +
`eslint` + `madge` only, plus reading the diff against the plan's worked examples. The manual test
checklist below is written so you can run it directly — items 5, 13 and 14 in particular (200+
card volume, the two-tab stale-selection race, and the resulting lot integrity) are the ones I'd
most want confirmed live rather than taken on the code's word.

---

## Manual test checklist

1. **Groups render.** Open Sets & Lots → Create Lot → pick a plan with several printed sets.
   Cards appear grouped under `SET-… · <creation date> · 0/<n>`, oldest set first, groups
   collapsed by default.
2. **Only eligible cards appear.** Select a card visible in the picker; disable it from the Cards
   page; reopen the picker → it's gone and its group's count drops by one. Repeat with a card
   already in a lot, and with an unprinted (`IN_SET`) card — neither appears.
3. **Wrong-plan isolation.** A card belonging to plan B never appears under plan A, in any group,
   with or without a search term.
4. **Exact-key search.** Paste a full 8-character key → exactly one card in exactly one group,
   and that group auto-expands.
5. **Prefix search.** Type the first 3 characters of a known key → it's listed along with every
   other key sharing that prefix. Type a middle fragment (characters 4–6) → no results (prefix,
   not contains). Lowercase input finds the same cards as uppercase.
6. **Search + counter.** With a search active, the footer reads "… of N matching cards", not
   "available".
7. **Select-all-in-set.** Expand a group of ≥20 cards, click its header checkbox → all check, the
   header goes solid, the footer count rises by exactly the group's count. Uncheck 3 individually
   → header goes indeterminate, count drops by 3. Click the header again → the remaining ones
   deselect.
8. **Select-all-in-set under search.** With a search matching 5 of a group's 180 cards, the header
   checkbox selects exactly those 5, and its label reads "matching".
9. **Selection survives paging.** Select 10 cards on page 1 → go to page 2 → select 5 more →
   return to page 1. The original 10 are still checked, footer reads 15.
10. **Selection survives search.** With 15 selected, search for something matching none of them →
    footer still reads 15 → clear the search → all 15 still checked.
11. **Plan change clears.** With cards selected, change the plan → selection empties, footer
    resets to 0.
12. **Clear selection.** Select across two groups, hit "Clear selection" → count 0, every checkbox
    clears, Create is disabled.
13. **200+ cards, no lag.** Create a 500-card set, print it, open the picker, expand it, click
    select-all → stays responsive, the request succeeds, and the resulting lot's card count is 500.
14. **Stale-selection conflict names the cards.** Open the picker in two browser profiles (A and
    B) on the same plan. In A, select 5 cards and create the lot. In B (now stale), select those
    same 5 plus 3 fresh ones and submit. B gets a 409 listing the 5 by key with "already in a
    lot", those 5 drop out of B's selection automatically, the 3 fresh ones stay checked, and **no
    lot is created**. Hitting Create again immediately succeeds with 3 cards.
15. **No corrupt lot after a conflict.** Following test 14: exactly one new lot exists (A's, 5
    cards), `nbOfCards = 5`, and every one of the 8 cards is in exactly one lot or none.
16. **Disabled card cannot be forced through.** With devtools, replay a create request containing
    a disabled card's id → 409 naming that key with reason "disabled", lot not created.
17. **Duplicate ids rejected.** Replay a create request with the same card id twice → 400
    validation error (contract-level), not a confusing 409.
18. **Empty states.** No plan selected → prompt to pick one. Plan with zero eligible cards → "no
    printed cards available". Search matching nothing → "no key matches" — different copy from
    the previous one.
19. **Loading and error survive layout.** Throttle the network and reopen → skeleton rows in the
    group area only, plan select/search/footer stay mounted.
20. **Language toggle.** Every new label, counter, empty state and reason renders in FR and EN;
    nothing shows a raw translation key.
