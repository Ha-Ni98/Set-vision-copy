---
sprint: 7
title: Inventory — Sets + Lots + Cards
status: ✅ Done
commit: 5179705
---

# Sprint 7 Report — Inventory

## Work done

### Services (`src/services`, all new)
| File | Notes |
|---|---|
| `src/services/sets.service.ts` | All 4 `SET_ROUTES` — `getAll`, `create` (201), `transition` (command constrained to `PENDING_PRINTING \| PRINTED` by the contract), `remove` (204). |
| `src/services/lots.service.ts` | All 4 `LOT_ROUTES` — `getAll`, `getAvailableForOrder`, `create` (201), `remove` (204). |
| `src/services/cards.service.ts` | All 7 `CARD_ROUTES` — `getAll`, `getAvailableForLot`, `getById`, `remove` (204), `disable`, `enable`, `revoke`. |

### Hooks (`src/hooks`, all new, grouped per D6)
| File | Notes |
|---|---|
| `src/hooks/useSets.ts` | 4 hooks. All 3 mutations (`useCreateSet`, `useTransitionSet`, `useDeleteSet`) invalidate **both** `qk.sets.all()` and `qk.cards.all()` — a set's lifecycle creates/re-states its cards (plan.md §3.2). |
| `src/hooks/useLots.ts` | 4 hooks (incl. `useAvailableLotsForOrder`). Both mutations (`useCreateLot`, `useDeleteLot`) invalidate **both** `qk.lots.all()` and `qk.cards.all()` — cards move `IN_LOT`/back. |
| `src/hooks/useCards.ts` | 7 hooks. `useAvailableCardsForLot` takes `subscriptionPlanId: string \| undefined` directly (not a partial query object) since the contract's `GetAvailableCardsQuery.subscriptionPlanId` is required, not optional — mirrors `useCommunes`'s pattern from Sprint 6. All 4 card mutations invalidate `qk.cards.all()` only — cards are the leaf of this cluster, nothing invalidates *into* them from elsewhere in this sprint. |

### Test scaffold additions
| File | Notes |
|---|---|
| `tests/fixtures/data/sets.mock.ts` | `SetDTO` (incl. null `printedAt`), paginated. |
| `tests/fixtures/data/lots.mock.ts` | `LotDTO` (incl. null `deliveryDate` — the DTO's only nullable field), paginated. |
| `tests/fixtures/data/cards.mock.ts` | `CardDTO` (incl. null `lotNumber`/`distributorName`), `CardDetailDTO` (distribution timeline), `AvailableCardDTO`, paginated. |
| `tests/fixtures/msw/{sets,lots,cards}.handlers.ts` | Happy-path defaults + `*ErrorHandlers` maps. `cards.handlers.ts` registers `getAvailableForLot` ('/available-for-lot') before the parameterized `getById` ('/:id') — both single-segment GET routes — mirroring `Apps/api`'s own router ordering. |
| `tests/fixtures/msw/server.ts` | Now seeded with all three new handler arrays. |

### Tests
| File | Cases |
|---|---|
| `tests/integration/services/sets.service.test.ts` | 6 cases incl. a `transition` call using the schema-constrained command. |
| `tests/integration/services/lots.service.test.ts` | 6 cases incl. `getAvailableForOrder` hitting its own literal-path handler. |
| `tests/integration/services/cards.service.test.ts` | 9 cases incl. a **handler-ordering regression guard**: `getAvailableForLot`'s result is asserted to differ from `getById`'s fixture, so if registration order were ever reversed (available-for-lot's request accidentally matching the `:id` pattern with `"available-for-lot"` as the id), the test would fail instead of silently passing. |
| `tests/integration/hooks/sets.test.tsx` | 4 cases: list hook + all 3 mutations' dual `sets`+`cards` invalidation via a shared helper. |
| `tests/integration/hooks/lots.test.tsx` | 4 cases: both query hooks + both mutations' dual `lots`+`cards` invalidation. |
| `tests/integration/hooks/cards.test.tsx` | 9 cases: 4 query-hook cases (incl. `useAvailableCardsForLot`'s enabled-gating) + all 4 mutations' own-domain-only invalidation. |

## Validation results
- `npx tsc --noEmit` ✅ clean (`src`, 0 errors)
- `npx tsc --noEmit -p tsconfig.test.json` ✅ clean (`src` + `tests`, 0 errors)
- `npx eslint` on every Sprint 7 file ✅ 0 errors after `--fix` (prettier formatting only)
- `npx vitest run` ✅ 258/258 tests pass, 29/29 files (220 carried over from Sprints 1–6 + 38 new)
- `npx vite build` ✅ production build unaffected

## Decisions & deviations
- **A real bug, caught by the fixture-schema-validation design itself, not by manual review.** The first full-suite run failed all 29 test files at once with a `ZodError: Invalid UUID` — every new fixture ID used the prefixes `g1000000…`/`h1000000…`, and `g`/`h` are not valid hexadecimal digits (UUIDs are hex-only). Every `.mock.ts` file `.parse()`s at module load (test-rules §3), and `server.ts` transitively imports all of them, so the invalid fixture broke every test file simultaneously rather than just the sets/lots/cards ones. Fixed by replacing the prefixes with valid hex (`71000000…`/`72000000…`/`73000000…`/`81000000…`) and re-sweeping every fixture file with a regex for any other non-hex leading character — found none. This is exactly the failure mode test-rules §3's "validate every fixture through its contract schema so it can never drift" is meant to catch, and it did, immediately, on the very first run — not discovered later against a live API.
- **`useAvailableCardsForLot` takes a bare `subscriptionPlanId` parameter, not a `GetAvailableCardsQuery` object** — the contract makes that field required, so a hook signature accepting a partial/optional query wouldn't type-check for the "not yet chosen" state the enabled-gating needs to represent. Same resolution as `useCommunes` (Sprint 6): accept the id directly, construct the real query object only when enabled.
- **No `/src/components`/`/src/pages` tension** — this domain (like Sprints 6 and part of 5) has no UI consumer yet, so the standing execution-scope constraint never came into play this sprint.
