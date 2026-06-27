# Stage 01 · Phase 02 — Contract Sprint Plan

> Ordered decomposition of `plan.md` into dependency-aware sprints. Each sprint is 1–3 related modules, sized so a single focused session can land it under the §6 validation gates. **No code yet** — this file is the schedule.

---

## Ordering rationale

The dependency map from `plan.md` Part 2 is a DAG. Walked breadth-first from the leaves, it produces nine sprints:

```
Sprint 0  common/types + common/errors                          (no deps)
Sprint 1  user, common/auth, auth                               ← Sprint 0
Sprint 2  admin, activator                                      ← Sprint 1 (user)
Sprint 3  payment, log                                          ← Sprint 0; conceptually after Sprint 2
Sprint 4  subscription-plan, geography, delivery-company        ← Sprint 0 (independent leaves)
Sprint 5  distributor, set, lot                                 ← Sprint 4 (subscription-plan + geography conceptually; uuid-only at the type layer)
Sprint 6  order, card                                           ← Sprint 5 (LotStat for order; inventory cohort for card)
Sprint 7  activation                                            ← Sprint 6 (CardStat) + Sprint 2 (activator) + Sprint 4 (subscription-plan)
Sprint 8  statistics + root barrel finalize                     ← every preceding sprint (touches every enum)
```

Two reminders from the rules embedded in the schedule:

- **`common/auth.ts` is in Sprint 1, not Sprint 0**, because it imports `UserRole` from the `user` module. Sprint 0 covers only the dependency-free `common` files (`types.ts`, `errors.ts`).
- **Statistics is intentionally last.** Building it confirms every domain enum already exists and re-exports cleanly through the root barrel.

Each sprint ends by updating the relevant module barrels **and** the root `src/index.ts`, so the package is always shippable from any green sprint.

---

### Sprint 0: Common Foundation   — Status: ✅ Complete

**Goals**
- Stand up the `@my-app/contract` workspace skeleton (`package.json`, `tsconfig.json`, `src/index.ts` stub).
- Implement the dependency-free `common/` files so every later sprint has the envelope, error codes, and pagination factory available.

**Tasks**
- [x] Initialise the workspace at `Apps/contract` with `package.json` (deps: `zod`; devDeps: `typescript`, `madge`) and the strict `tsconfig.json` baseline from `plan.md` Part 3 / `contract-rules.md §3.8`.
- [x] Create `src/common/types.ts` — `ApiResponse<T = null>` discriminated union, `PaginationMetaSchema` / `PaginationMeta`, `paginated()` factory, `PaginatedResult<T>` companion type (per `plan.md §1.1`).
- [x] Create `src/common/errors.ts` — `ErrorCode` enum with exactly the seven values in `plan.md §1.2` (`AUTH_INVALID_CREDENTIALS`, `AUTH_UNAUTHORIZED`, `AUTH_FORBIDDEN`, `VALIDATION_ERROR`, `RESOURCE_NOT_FOUND`, `RESOURCE_CONFLICT`, `INTERNAL_SERVER_ERROR`).
- [x] Update `src/index.ts` to re-export everything in `src/common/` (defer the `common/auth` re-export to Sprint 1 when the file exists).

**Validation**
- [x] `tsc --noEmit` is clean.
- [x] `madge --circular src` reports no cycles.
- [x] Lint is clean.
- [x] Every type is `z.infer`'d from a schema; no `any`; dates are `z.iso.datetime()`.
- [x] No sensitive field appears in any DTO.
- [x] No business logic / DB / Express imports.
- [x] Committed on green.

---

### Sprint 1: User Identity & Auth   — Status: ✅ Complete

**Goals**
- Land the `user` module (the foundational identity primitives every other module reads from), close `common/` by adding `common/auth.ts`, and stand up the `auth` module on top.

**Tasks**
- [x] Create `src/modules/user/user.enums.ts` — `UserRole` enum (`ADMIN`, `ACTIVATOR`) verbatim from `schema.prisma`.
- [x] Create `src/modules/user/user.dtos.ts` — `UserIdentityResponseSchema` → `UserIdentityDTO` per `plan.md::user`. Confirm `password`, `tokenHash`, `deletedAt` are absent.
- [x] Create `src/modules/user/index.ts` — re-export `user.enums` and `user.dtos`. (No `routes.ts` / `command.ts` / `query.ts` / `events.ts` for this module.)
- [x] Create `src/common/auth.ts` — `JWTPayloadSchema` / `JWTPayload` importing `UserRole` from `modules/user/user.enums`.
- [x] Create `src/modules/auth/auth.routes.ts` — `AUTH_ROUTES` (`BASE: '/auth'`, `LOGIN`, `REFRESH`, `LOGOUT`, `ME`).
- [x] Create `src/modules/auth/auth.command.ts` — `LoginSchema` / `LoginCommand`, `RefreshTokenSchema` / `RefreshTokenCommand`.
- [x] Create `src/modules/auth/auth.dtos.ts` — `AuthTokensResponseSchema` / `AuthTokensDTO` (sanctioned §0.1.3 exception with the `accessToken`/`refreshToken` exposure), `SessionUserResponseSchema` / `SessionUserDTO`.
- [x] Create `src/modules/auth/index.ts` — re-export `auth.routes`, `auth.command`, `auth.dtos`.
- [x] Update `src/index.ts` to re-export `common/auth`, `modules/user`, `modules/auth`.

**Validation**
- [x] `tsc --noEmit` is clean.
- [x] `madge --circular src` reports no cycles.
- [x] Lint is clean.
- [x] Every type is `z.infer`'d from a schema; no `any`; dates are `z.iso.datetime()`.
- [x] No sensitive field appears in any DTO.
- [x] No business logic / DB / Express imports.
- [x] Committed on green.

---

### Sprint 2: Admin & Activator   — Status: ✅ Complete

**Goals**
- Implement the two admin-managed identity modules. Both depend on `user.enums` and `common/paginated`; they share the §0.1.1 sanctioned `generatedPassword` exposure pattern.

**Tasks**
- [x] Create `src/modules/admin/admin.routes.ts` — `ADMIN_ROUTES` (`BASE: '/admins'`, the 7 routes per `plan.md::admin`).
- [x] Create `src/modules/admin/admin.command.ts` — `CreateAdminSchema` / `CreateAdminCommand`, `UpdateAdminSchema` / `UpdateAdminCommand` (all fields optional per `exactOptionalPropertyTypes`).
- [x] Create `src/modules/admin/admin.query.ts` — `GetAdminsQuerySchema` / `GetAdminsQuery` (use `z.coerce` for `page`/`limit`, `min(1).max(100).default(10)`), `AdminIdParamsSchema` / `AdminIdParams`.
- [x] Create `src/modules/admin/admin.dtos.ts` — `AdminResponseSchema` / `AdminDTO`, `AdminWithCredentialsResponseSchema` / `AdminWithCredentialsDTO` (§0.1.1), `AdminGeneratedPasswordResponseSchema` / `AdminGeneratedPasswordDTO` (§0.1.1, prefixed to avoid root-barrel collision), paginated wrapper.
- [x] Create `src/modules/admin/index.ts`.
- [x] Create `src/modules/activator/activator.routes.ts` — `ACTIVATOR_ROUTES` (`BASE: '/activators'`, the 9 routes including `PERFORMANCE` and `MY_STATS`).
- [x] Create `src/modules/activator/activator.command.ts` — `CreateActivatorSchema` / `CreateActivatorCommand` (incl. optional `initialCredits`), `UpdateActivatorSchema` / `UpdateActivatorCommand`.
- [x] Create `src/modules/activator/activator.query.ts` — `GetActivatorsQuerySchema`, `ActivatorIdParamsSchema`, `ActivatorPerformanceQuerySchema` (`days?: int.min(1).default(30)`).
- [x] Create `src/modules/activator/activator.dtos.ts` — `ActivatorResponseSchema` / `ActivatorDTO`, `ActivatorDetailResponseSchema` / `ActivatorDetailDTO` (via `.extend`), `ActivatorWithCredentialsResponseSchema` / `ActivatorWithCredentialsDTO` (§0.1.1), `ActivatorGeneratedPasswordResponseSchema` / `ActivatorGeneratedPasswordDTO` (§0.1.1, kept local, prefixed), `ActivatorPerformanceResponseSchema` / `ActivatorPerformanceDTO`, `ActivatorDashboardResponseSchema` / `ActivatorDashboardDTO`, paginated wrapper.
- [x] Create `src/modules/activator/index.ts`.
- [x] Update `src/index.ts` to re-export both modules.

**Validation**
- [x] `tsc --noEmit` is clean.
- [x] `madge --circular src` reports no cycles.
- [x] Lint is clean.
- [x] Every type is `z.infer`'d from a schema; no `any`; dates are `z.iso.datetime()`.
- [x] No sensitive field appears in any DTO.
- [x] No business logic / DB / Express imports.
- [x] Committed on green.

---

### Sprint 3: Payment & Log   — Status: ✅ Complete

**Goals**
- Land the two ledger/audit modules. Payment owns the activator-credit financial surface; Log owns the immutable read-only audit feed. Both are small and have no domain dependencies beyond `common`.

**Tasks**
- [x] Create `src/modules/payment/payment.routes.ts` — `PAYMENT_ROUTES` (`BASE: '/payments'`, `GET_ALL`, `CREATE`, `DELETE`).
- [x] Create `src/modules/payment/payment.command.ts` — `RecordPaymentSchema` / `RecordPaymentCommand` (`amount: number.positive().multipleOf(0.01)`, optional `date: iso.datetime`).
- [x] Create `src/modules/payment/payment.query.ts` — `GetPaymentsQuerySchema` (incl. `includeDeleted?: coerce.boolean`), `PaymentIdParamsSchema`.
- [x] Create `src/modules/payment/payment.dtos.ts` — `PaymentResponseSchema` / `PaymentDTO` (incl. resolved `recordedByName`), paginated wrapper.
- [x] Create `src/modules/payment/index.ts`.
- [x] Create `src/modules/log/log.enums.ts` — `LogActionType` enum, 13 values verbatim from `schema.prisma`.
- [x] Create `src/modules/log/log.routes.ts` — `LOG_ROUTES` (`BASE: '/logs'`, `GET_ALL` only — writes are internal).
- [x] Create `src/modules/log/log.query.ts` — `GetLogsQuerySchema` (filters: `userId`, `actionType`, `dateFrom`, `dateTo`, `search`).
- [x] Create `src/modules/log/log.dtos.ts` — `LogResponseSchema` / `LogDTO` (resolved `userName`), paginated wrapper.
- [x] Create `src/modules/log/index.ts`.
- [x] Update `src/index.ts` to re-export both modules.

**Validation**
- [x] `tsc --noEmit` is clean.
- [x] `madge --circular src` reports no cycles.
- [x] Lint is clean.
- [x] Every type is `z.infer`'d from a schema; no `any`; dates are `z.iso.datetime()`.
- [x] No sensitive field appears in any DTO.
- [x] No business logic / DB / Express imports.
- [x] Committed on green.

---

### Sprint 4: Catalog & Reference Data   — Status: ✅ Complete

**Goals**
- Implement the three independent leaf modules that every inventory/order module reads from: `subscription-plan` (catalog + commission matrix), `geography` (read-only wilaya/commune lookup), `delivery-company`.

**Tasks**
- [x] Create `src/modules/subscription-plan/subscription-plan.enums.ts` — `SubscriptionType` (`SNAPCHAT_PLUS`), `SubscriptionDuration` (8 values) verbatim from `schema.prisma`.
- [x] Create `src/modules/subscription-plan/subscription-plan.routes.ts` — `SUBSCRIPTION_PLAN_ROUTES` (the 6 routes).
- [x] Create `src/modules/subscription-plan/subscription-plan.command.ts` — `CreateSubscriptionPlanSchema` / `CreateSubscriptionPlanCommand`, `UpdateCommissionSchema` / `UpdateCommissionCommand`.
- [x] Create `src/modules/subscription-plan/subscription-plan.query.ts` — `GetSubscriptionPlansQuerySchema` (`active?: coerce.boolean`), `SubscriptionPlanIdParamsSchema`.
- [x] Create `src/modules/subscription-plan/subscription-plan.dtos.ts` — `SubscriptionPlanResponseSchema` / `SubscriptionPlanDTO`, `CommissionDurationResponseSchema` / `CommissionDurationDTO`, `CommissionCellResponseSchema` / `CommissionCellDTO`, `CommissionMatrixResponseSchema` / `CommissionMatrixDTO`.
- [x] Create `src/modules/subscription-plan/index.ts`.
- [x] Create `src/modules/geography/geography.routes.ts` — `GEOGRAPHY_ROUTES` (`GET_WILAYAS`, `GET_COMMUNES`).
- [x] Create `src/modules/geography/geography.query.ts` — `WilayaIdParamsSchema` / `WilayaIdParams` (will be re-imported by `statistics` in Sprint 8).
- [x] Create `src/modules/geography/geography.dtos.ts` — `WilayaResponseSchema` / `WilayaDTO`, `CommuneResponseSchema` / `CommuneDTO`.
- [x] Create `src/modules/geography/index.ts`.
- [x] Create `src/modules/delivery-company/delivery-company.routes.ts` — `DELIVERY_COMPANY_ROUTES` (`GET_ALL`, `CREATE`, `UPDATE`, `TOGGLE`; **no `DELETE`** by design).
- [x] Create `src/modules/delivery-company/delivery-company.command.ts` — `CreateDeliveryCompanySchema`, `UpdateDeliveryCompanySchema`.
- [x] Create `src/modules/delivery-company/delivery-company.query.ts` — `GetDeliveryCompaniesQuerySchema` (`active?: coerce.boolean`), `DeliveryCompanyIdParamsSchema`.
- [x] Create `src/modules/delivery-company/delivery-company.dtos.ts` — `DeliveryCompanyResponseSchema` / `DeliveryCompanyDTO`.
- [x] Create `src/modules/delivery-company/index.ts`.
- [x] Update `src/index.ts` to re-export the three modules.

**Validation**
- [x] `tsc --noEmit` is clean.
- [x] `madge --circular src` reports no cycles.
- [x] Lint is clean.
- [x] Every type is `z.infer`'d from a schema; no `any`; dates are `z.iso.datetime()`.
- [x] No sensitive field appears in any DTO.
- [x] No business logic / DB / Express imports.
- [x] Committed on green.

---

### Sprint 5: Inventory Core — Distributor, Set, Lot   — Status: ✅ Complete

**Goals**
- Land the three inventory primitives that `order` and `card` will compose with in Sprint 6. None import each other's types (FK ids are `uuid` strings at the contract layer), so all three fit cleanly in one sprint.

**Tasks**
- [x] Create `src/modules/distributor/distributor.routes.ts` — `DISTRIBUTOR_ROUTES` (the 6 routes).
- [x] Create `src/modules/distributor/distributor.command.ts` — `CreateDistributorSchema`, `UpdateDistributorSchema`.
- [x] Create `src/modules/distributor/distributor.query.ts` — `GetDistributorsQuerySchema`, `DistributorIdParamsSchema`.
- [x] Create `src/modules/distributor/distributor.dtos.ts` — `DistributorResponseSchema` / `DistributorDTO` (incl. resolved `wilayaName`/`communeName` + derived counts), `DistributorDetailResponseSchema` / `DistributorDetailDTO` via `.extend({ soldKeys, ordersCount })`, paginated wrapper.
- [x] Create `src/modules/distributor/index.ts`.
- [x] Create `src/modules/set/set.enums.ts` — `SetStat` (`NOT_PRINTED`, `PENDING_PRINTING`, `PRINTED`).
- [x] Create `src/modules/set/set.routes.ts` — `SET_ROUTES` (4 routes).
- [x] Create `src/modules/set/set.command.ts` — `CreateSetSchema`, `TransitionSetSchema` (`to` narrowed to `PENDING_PRINTING | PRINTED`).
- [x] Create `src/modules/set/set.query.ts` — `GetSetsQuerySchema`, `SetIdParamsSchema`.
- [x] Create `src/modules/set/set.dtos.ts` — `SetResponseSchema` / `SetDTO`, paginated wrapper.
- [x] Create `src/modules/set/index.ts`.
- [x] Create `src/modules/lot/lot.enums.ts` — `LotStat` (`PENDING`, `IN_DELIVERY`, `DELIVERED`, `RETURNED`).
- [x] Create `src/modules/lot/lot.routes.ts` — `LOT_ROUTES` (4 routes incl. `GET_AVAILABLE_FOR_ORDER`).
- [x] Create `src/modules/lot/lot.command.ts` — `CreateLotSchema` (`cardIds: array(uuid).nonempty()`).
- [x] Create `src/modules/lot/lot.query.ts` — `GetLotsQuerySchema`, `GetAvailableLotsQuerySchema`, `LotIdParamsSchema`.
- [x] Create `src/modules/lot/lot.dtos.ts` — `LotResponseSchema` / `LotDTO`, paginated wrapper.
- [x] Create `src/modules/lot/index.ts`.
- [x] Update `src/index.ts` to re-export the three modules.

**Validation**
- [x] `tsc --noEmit` is clean.
- [x] `madge --circular src` reports no cycles.
- [x] Lint is clean.
- [x] Every type is `z.infer`'d from a schema; no `any`; dates are `z.iso.datetime()`.
- [x] No sensitive field appears in any DTO.
- [x] No business logic / DB / Express imports.
- [x] Committed on green.

---

### Sprint 6: Order & Card   — Status: ⬜ Pending

**Goals**
- Compose Sprint 5's primitives into the order/card surface. `order` is the first module to import another module's enum (`LotStat`), so this is also where the cross-module re-export discipline gets exercised.

**Tasks**
- [ ] Create `src/modules/order/order.enums.ts` — `OrderStat` (4 values), `DeliveryType` (3 values).
- [ ] Create `src/modules/order/order.routes.ts` — `ORDER_ROUTES` (5 routes).
- [ ] Create `src/modules/order/order.command.ts` — `CreateOrderSchema` (`lotIds: array(uuid).nonempty()`, `orderPrice` / `deliverPrice` with `.multipleOf(0.01)`), `TransitionOrderSchema` (`to` narrowed to `IN_DELIVERY | DELIVERED | RETURNED`, optional `deliveredCount: int.nonnegative()`).
- [ ] Create `src/modules/order/order.query.ts` — `GetOrdersQuerySchema` (incl. `dateFrom`/`dateTo` as `iso.datetime`), `OrderIdParamsSchema`.
- [ ] Create `src/modules/order/order.dtos.ts` — `OrderResponseSchema` / `OrderDTO`, `OrderDetailResponseSchema` / `OrderDetailDTO` (imports `LotStat` from `../lot`), paginated wrapper.
- [ ] Create `src/modules/order/index.ts`.
- [ ] Create `src/modules/card/card.enums.ts` — `CardStat` (7 values verbatim) + contract-only `CardFlag` (`disabled`, `revoked`, lowercase per `plan.md`).
- [ ] Create `src/modules/card/card.routes.ts` — `CARD_ROUTES` (7 routes incl. `DISABLE` / `ENABLE` / `REVOKE`).
- [ ] Create `src/modules/card/card.query.ts` — `GetCardsQuerySchema` (incl. `flag?: CardFlag`), `GetAvailableCardsQuerySchema` (required `subscriptionPlanId: uuid`), `CardIdParamsSchema`. (No `card.command.ts` — admin actions are path-param only.)
- [ ] Create `src/modules/card/card.dtos.ts` — `CardResponseSchema` / `CardDTO`, `CardDetailResponseSchema` / `CardDetailDTO` (with `distributionTimeline`), `AvailableCardResponseSchema` / `AvailableCardDTO`, paginated wrapper.
- [ ] Create `src/modules/card/index.ts`.
- [ ] Update `src/index.ts` to re-export both modules.

**Validation**
- [ ] `tsc --noEmit` is clean.
- [ ] `madge --circular src` reports no cycles.
- [ ] Lint is clean.
- [ ] Every type is `z.infer`'d from a schema; no `any`; dates are `z.iso.datetime()`.
- [ ] No sensitive field appears in any DTO.
- [ ] No business logic / DB / Express imports.
- [ ] Committed on green.

---

### Sprint 7: Activation   — Status: ⬜ Pending

**Goals**
- Land the largest module — two route exports, six content files, three audiences, and the §0.1.2 sanctioned exposure on `ActiveRequestDTO`. Isolated in its own sprint because it depends on everything before and concentrates the strictest exposure rules.

**Tasks**
- [ ] Create `src/modules/activation/activation.enums.ts` — `ActivationStat` (10 values), `AccountInformation` (6 values), contract-owned `ClientActivationStatus` (9 values).
- [ ] Create `src/modules/activation/activation.routes.ts` — **two** exports: `KEY_ROUTES` (`BASE: '/keys'`, 5 routes) and `ACTIVATION_ROUTES` (`BASE: '/activations'`, 15 routes).
- [ ] Create `src/modules/activation/activation.command.ts` — shared subschemas (`AccountFieldSchema`, `AccountFieldsSchema`), public commands (`VerifyKeySchema`, `SubmitActivationSchema`, `UpdateActivationSchema`, `SubmitAdditionalInfoSchema`), activator commands (`FlagWrongInfoSchema`, `RequestAdditionalInfoSchema`, `FreezeRequestSchema`), admin command (`SetActivatorPriceSchema`).
- [ ] Create `src/modules/activation/activation.query.ts` — both `ActivationIdParamsSchema` (uses `:activationId`) and `ActivationActionParamsSchema` (uses `:id`) to mirror the two route segments, `GetActivationsQuerySchema` (admin filters), `GetActivatorHistoryQuerySchema` (incl. closed `sortBy` enum).
- [ ] Create `src/modules/activation/activation.dtos.ts` — helper subshapes (`ClientBlockSchema`, `DistributorBlockSchema`, `AccountFieldValueSchema`, `TimelineEntrySchema`, `CardHistoryEntrySchema` importing `CardStat` from `../card`), client DTOs (`KeyVerificationDTO`, `ClientActivationStatusDTO`), activator DTOs (`PendingActivationDTO`, `ActiveRequestDTO` — sanctioned §0.1.2, `ActivatorHistoryItemDTO`, `RecentActivationDTO`), admin DTOs (`AdminActivationDTO`, `ActivationDetailDTO`), paginated wrappers for `GET_ALL` + `GET_MY_HISTORY`.
- [ ] Create `src/modules/activation/activation.events.ts` — `ActivationEvents` typed map + payload schemas for the six emissions (`activation:created`, `:taken`, `:client-updated`, `:frozen`, `:resolved`, `:status-changed`). `:resolved` `outcome` narrowed to `ACTIVATED_BY_ADMIN | CANCELLED_BY_ADMIN`.
- [ ] Create `src/modules/activation/index.ts` — re-export all six content files.
- [ ] Update `src/index.ts` to re-export the activation module.

**Validation**
- [ ] `tsc --noEmit` is clean.
- [ ] `madge --circular src` reports no cycles.
- [ ] Lint is clean.
- [ ] Every type is `z.infer`'d from a schema; no `any`; dates are `z.iso.datetime()`.
- [ ] No sensitive field appears in any DTO.
- [ ] No business logic / DB / Express imports.
- [ ] Committed on green.

---

### Sprint 8: Statistics & Finalisation   — Status: ⬜ Pending

**Goals**
- Build the cross-cutting `statistics` module last so every enum it groups by already exists. Finish the package: confirm the root barrel re-exports the full surface, run the §6 validation across the whole repo, and tag the contract package ready for Stage 02.

**Tasks**
- [ ] Create `src/modules/statistics/statistics.routes.ts` — `STATISTICS_ROUTES` (9 routes).
- [ ] Create `src/modules/statistics/statistics.query.ts` — `StatisticsPeriodSchema` (closed enum: `today`, `this_week`, `this_month`, `last_30d`, `last_90d`, `this_year`, `custom`), `StatisticsOverviewQuerySchema`, `WilayaHeatmapQuerySchema`, `WilayaDrilldownQuerySchema`. Re-import `WilayaIdParamsSchema` from `../geography` for the drilldown path param.
- [ ] Create `src/modules/statistics/statistics.dtos.ts` — `DashboardStatsDTO`, `ActivatorsSummaryDTO`, `DistributorsSummaryDTO`, `InventorySummaryDTO` (composes `SetStat`/`LotStat`/`CardStat`), `OrdersSummaryDTO`, `ActivationsSummaryDTO` (composes `ActivationStat`), `StatisticsOverviewDTO` (six pre-aggregated series), `WilayaHeatmapDTO`, `WilayaDrilldownDTO`.
- [ ] Create `src/modules/statistics/index.ts`.
- [ ] Update `src/index.ts` to its final state — re-exports `common/*` and every module barrel in the order from `plan.md` Part 3 (foundation → identity → catalog → inventory → activation → cross-cutting).
- [ ] Run final repo-wide checks (`tsc --noEmit`, `madge --circular src`, lint) and confirm the §6 Validation Commandments are satisfied across the whole package.

**Validation**
- [ ] `tsc --noEmit` is clean.
- [ ] `madge --circular src` reports no cycles.
- [ ] Lint is clean.
- [ ] Every type is `z.infer`'d from a schema; no `any`; dates are `z.iso.datetime()`.
- [ ] No sensitive field appears in any DTO.
- [ ] No business logic / DB / Express imports.
- [ ] Committed on green.
