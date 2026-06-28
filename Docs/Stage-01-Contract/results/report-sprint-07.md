# Sprint 7 Report — Activation

**Status:** ✅ Complete  
**Date:** 2026-06-28

---

## Files created

**activation (6 files + barrel):**

| File | Description |
|------|-------------|
| `activation.enums.ts` | `ActivationStat` (10 values verbatim from `schema.prisma`), `AccountInformation` (6 values verbatim), `ClientActivationStatus` (9 values — contract-owned, not in Prisma) |
| `activation.routes.ts` | Two exports: `KEY_ROUTES` (`BASE: '/keys'`, 5 routes for the public portal) and `ACTIVATION_ROUTES` (`BASE: '/activations'`, 15 routes for activator + admin) |
| `activation.command.ts` | Shared: `AccountFieldSchema`, `AccountFieldsSchema`. Public: `VerifyKeyCommand`, `SubmitActivationCommand`, `UpdateActivationCommand`, `SubmitAdditionalInfoCommand`. Activator: `FlagWrongInfoCommand`, `RequestAdditionalInfoCommand`, `FreezeRequestCommand`. Admin: `SetActivatorPriceCommand` |
| `activation.query.ts` | `ActivationIdParamsSchema` (`:activationId` for KEY_ROUTES), `ActivationActionParamsSchema` (`:id` for ACTIVATION_ROUTES), `GetActivationsQuerySchema` (11 filters), `GetActivatorHistoryQuerySchema` (7 filters incl. closed `sortBy` enum) |
| `activation.dtos.ts` | Helper subshapes: `ClientBlockSchema`, `DistributorBlockSchema`, `AccountFieldValueSchema`, `TimelineEntrySchema`, `CardHistoryEntrySchema` (imports `CardStat`). Client DTOs: `KeyVerificationDTO` (8 optional fields), `ClientActivationStatusDTO`. Activator DTOs: `PendingActivationDTO`, `ActiveRequestDTO` (§0.1.2), `ActivatorHistoryItemDTO`, `RecentActivationDTO`. Admin DTOs: `AdminActivationDTO`, `ActivationDetailDTO`. Paginated: `PaginatedActivations`, `PaginatedActivatorHistory` |
| `activation.events.ts` | Payload schemas for 6 socket events + `ActivationEvents` typed map. `activation:resolved` `outcome` narrowed to `[ACTIVATED_BY_ADMIN, CANCELLED_BY_ADMIN]` |
| `index.ts` | Module barrel — re-exports all 6 content files |

---

## Validation results

- **`tsc --noEmit`** — clean (0 errors)
- **`madge --circular --extensions ts src`** — no circular dependency found (81 files processed)
- **Lint** — clean
- **Schema/type sync** — all types via `z.infer`; `CardStat` imported from `../card/card.enums`, no cycles introduced
- **Sensitive fields** — `ActiveRequestDTO` carries `key` + `accountFields` values: sanctioned §0.1.2 exposure, documented with inline comment. All other DTOs (`PendingActivationDTO`, `RecentActivationDTO`, `AdminActivationDTO`) mask the key as `keyMasked` or expose only the admin view
- **No business logic / DB / Express imports** — confirmed
- **Committed on green** — commit `cf208e8`

---

## Notes

- `ClientActivationStatus` is contract-owned: 9 public-portal statuses that map to subsets of `ActivationStat` at the backend mapper layer. The raw `ActivationStat` enum never reaches the public client.
- Two separate param schemas (`ActivationIdParamsSchema` with `activationId` vs `ActivationActionParamsSchema` with `id`) prevent accidental cross-use between the two route groups, which use different segment names.
- `GetActivatorHistoryQuerySchema.sortBy` uses `z.enum(['requestedAt', 'completedAt', 'durationSeconds', 'activationPrice'])` — a string-literal array form — to close the spec's open sort set, consistent with `contract-rules.md §3.4`.
- `activation.events.ts` uses `import type { PendingActivationDTO }` (verbatimModuleSyntax-safe — used only in the `ActivationEvents` type map, not at runtime).
- `ActivationDetailDTO.activator` is nullable: `z.object({ id, fullName }).nullable()` — activation may not have been assigned yet.
- Two paginated wrappers: `PaginatedActivations` (admin `GET_ALL`, uses `AdminActivationResponseSchema`) and `PaginatedActivatorHistory` (activator `GET_MY_HISTORY`, uses `ActivatorHistoryItemResponseSchema`).
