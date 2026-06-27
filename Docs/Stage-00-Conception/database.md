# database.md — Setvision Data Model (Stage 0)

> Source of truth for persisted data. Authored for the contract-first pipeline: Prisma is the DB truth, and enum values here are declared identically to what `@my-app/contract` will export (both reference them).
>
> **Modeling decisions**
> - **UUID primary keys** everywhere (`String @id @default(uuid())`); all FKs are `String`. This keeps the contract's `z.uuid()` primitives intact and makes the public client-portal ids non-guessable, so no separate public token is needed.
> - **Native Prisma enums** for fixed, code-driven lifecycle states (roles, subscription type/duration, card/set/lot/order/activation stat, delivery type, account-information catalog, log action type) — these map directly to the contract's `z.enum()`.
> - **Lookup tables** only where there is genuine relational/managed data: `CommissionDuration` (carries min/max minutes), `DeliveryCompany`, `Wilaya`, `Commune`.
> - **Money** is `Decimal(12,2)` (DZD). **Timestamps** are `DateTime` in the DB and cross the wire as ISO strings (a backend mapping concern, never a DTO `z.date()`).
> - **EAV for account data:** subscription-specific fields submitted by the client live in `ActivationInformation`; corrections in `WrongInformation`; activator-requested fields in `AdditionalInformation` — each keyed by the `AccountInformation` enum with a nullable `value`. Adding a subscription plan needs no schema change.

---

## Entities

### User
Account + credentials for both admins and activators; role drives everything downstream.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, uuid | |
| username | String | unique | login id |
| password | String | required | **SENSITIVE (DB-only)** — hashed; never in any DTO |
| role | UserRole | required | ADMIN / ACTIVATOR |
| lastLoginAt | DateTime? | | |
| isEnabled | Boolean | default true | |
| createdAt | DateTime | default now | |
| updatedAt | DateTime | @updatedAt | |
| deletedAt | DateTime? | | soft delete |

**Relations:** 1–1 `Admin`, 1–1 `Activator`, 1–N `RefreshToken`, 1–N `Log`.
**Sensitive:** `password`.

### Admin
Admin profile attached to a `User`.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, uuid | |
| userId | String | FK→User, unique | |
| fullName | String | required | |
| phone | String | required | |
| isEnabled | Boolean | default true | |

**Relations:** N–1 `User` (unique → 1–1); 1–N `Payment` (as the recording admin).

### Activator
Activator profile attached to a `User`; carries denormalized performance/earning counters.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, uuid | |
| userId | String | FK→User, unique | |
| fullName | String | required | |
| phone | String | required | |
| totalEarning | Decimal(12,2) | default 0 | lifetime earned |
| credits | Decimal(12,2) | default 0 | current balance owed |
| nbOfActivation | Int | default 0 | |
| nbOfSuccessfulActivation | Int | default 0 | |

**Relations:** N–1 `User` (unique → 1–1); 1–N `Payment`; 1–N `Activation`.

### Payment
Admin-recorded payout to an activator; soft-deletable, snapshots the prior balance.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, uuid | |
| adminId | String | FK→Admin | who recorded it |
| activatorId | String | FK→Activator | who was paid |
| totalAmount | Decimal(12,2) | required | |
| previousCredits | Decimal(12,2) | required | balance snapshot at payment time |
| paymentDate | DateTime | default now | |
| isDeleted | Boolean | default false | soft delete |
| deletedDate | DateTime? | | |

**Relations:** N–1 `Admin`, N–1 `Activator`.

### Distributor
Retail point that holds cards and originates activations.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, uuid | |
| fullName | String | required | |
| storeName | String | required | |
| wilayaId | String | FK→Wilaya | |
| communeId | String | FK→Commune | |
| isEnabled | Boolean | default true | |
| nbOfActiveCards | Int | default 0 | denormalized stock |
| nbOfActivation | Int | default 0 | |
| createdAt | DateTime | default now | |
| updatedAt | DateTime | @updatedAt | |
| deletedAt | DateTime? | | soft delete |

**Relations:** N–1 `Wilaya`, N–1 `Commune`; 1–N `Card`; 1–N `Order`.

### SubscriptionPlan
A sellable product = subscription type + duration. Cards/sets/lots reference a plan.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, uuid | |
| subscriptionType | SubscriptionType | required | |
| subscriptionDuration | SubscriptionDuration | required | |
| isActive | Boolean | default true | |

**Relations:** 1–N `SubscriptionPlanCommission`, `Set`, `Lot`, `Card`. **Unique:** (subscriptionType, subscriptionDuration).

### SubscriptionPlanCommission
The speed-tiered activator commission: per plan, per time tier, an amount.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, uuid | |
| subscriptionPlanId | String | FK→SubscriptionPlan | |
| commissionDurationId | String | FK→CommissionDuration | |
| commission | Decimal(12,2) | required | DZD for this plan × tier |

**Relations:** N–1 `SubscriptionPlan`, N–1 `CommissionDuration`. **Unique:** (subscriptionPlanId, commissionDurationId).

### CommissionDuration *(lookup table)*
A speed tier with its minute bounds; drives which commission applies at completion.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, uuid | |
| key | String | unique | e.g. `LESS_15_MIN` |
| label | String | required | display label |
| nbMinuteMin | Int | required | inclusive lower bound (minutes) |
| nbMinuteMax | Int? | nullable | upper bound; null = catch-all (unbounded) |
| createdAt | DateTime | default now | |

**Relations:** 1–N `SubscriptionPlanCommission`.

### Set
A printed batch of keys; deletion cascades to its cards (app-managed transaction).

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, uuid | |
| setNumber | String | unique | |
| subscriptionPlanId | String | FK→SubscriptionPlan | |
| numberOfKeys | Int | required | |
| setStat | SetStat | default NOT_PRINTED | |
| createdAt | DateTime | default now | |
| printedAt | DateTime? | | |

**Relations:** N–1 `SubscriptionPlan`; 1–N `Card`.

### Lot
A grouping of printed cards prepared for delivery; many-to-many with orders.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, uuid | |
| lotNumber | String | unique | |
| subscriptionPlanId | String | FK→SubscriptionPlan | |
| lotStat | LotStat | default PENDING | |
| nbOfCards | Int | default 0 | |
| isReturned | Boolean | default false | |
| createdAt | DateTime | default now | |
| deliveryDate | DateTime? | | |

**Relations:** N–1 `SubscriptionPlan`; 1–N `Card`; M–N `Order` via `OrderLot`.

### Order
A delivery of one or more lots to a distributor.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, uuid | |
| orderNumber | String | unique | |
| distributorId | String | FK→Distributor | |
| receivedName | String | required | receiver (may differ from distributor) |
| receivedPhone | String | required | |
| wilayaId | String | FK→Wilaya | delivery wilaya |
| communeId | String | FK→Commune | delivery commune |
| deliveryCompanyId | String | FK→DeliveryCompany | |
| deliveryType | DeliveryType | required | HOME / PICKUP_POINT / STORE |
| orderPrice | Decimal(12,2) | required | charged for the cards |
| deliverPrice | Decimal(12,2) | required | shipping cost |
| cardsDeliveredCount | Int | default 0 | recorded delivered quantity |
| orderStat | OrderStat | default PENDING_DELIVERY | |
| createdAt | DateTime | default now | |
| completedAt | DateTime? | | delivered/returned time |

**Relations:** N–1 `Distributor`, `Wilaya`, `Commune`, `DeliveryCompany`; M–N `Lot` via `OrderLot`.

### OrderLot *(join table)*
Associates orders and lots (an order bundles many lots; a lot may recur across orders over its lifecycle).

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, uuid | |
| orderId | String | FK→Order | |
| lotId | String | FK→Lot | |

**Relations:** N–1 `Order`, N–1 `Lot`. **Unique:** (orderId, lotId).

### Card
The scratch key — single combined lifecycle stat plus boolean flags.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, uuid | |
| key | String | unique | printed key |
| subscriptionPlanId | String | FK→SubscriptionPlan | |
| setId | String | FK→Set | |
| lotId | String? | FK→Lot | null until added to a lot |
| distributorId | String? | FK→Distributor | null until AT_DISTRIBUTOR |
| cardStat | CardStat | default IN_SET | |
| isActive | Boolean | default false | **client-side gate** — true from AT_DISTRIBUTOR onward |
| isDisabled | Boolean | default false | |
| isRevoked | Boolean | default false | |
| createdAt | DateTime | default now | |
| updatedAt | DateTime | @updatedAt | |
| deletedAt | DateTime? | | |

**Relations:** N–1 `SubscriptionPlan`, `Set`, `Lot?`, `Distributor?`; 1–N `Activation`.

### Activation
One activation attempt for a card. Subscription-agnostic columns only — account fields live in `ActivationInformation`.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, uuid | |
| cardId | String | FK→Card | |
| activatorId | String? | FK→Activator | null until picked up |
| activationStat | ActivationStat | default PENDING | |
| clientFullName | String | required | |
| clientPhone | String | required | |
| clientEmail | String? | nullable | reserved; not collected in the Snapchat UI |
| activationEmail | String? | nullable | email actually used to activate |
| activationPrice | Decimal(12,2)? | nullable | set at completion (tier) or admin override |
| freezReason | String? | nullable | set when FREEZE |
| requestedAt | DateTime | default now | |
| takenAt | DateTime? | | pickup time (tier basis start) |
| completedAt | DateTime? | | completion time (tier basis end) |

**Relations:** N–1 `Card`, `Activator?`; 1–N `ActivationInformation`, `ActivationStep`.

### ActivationInformation
The client's initial submission, one row per account field used by the plan.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, uuid | |
| activationId | String | FK→Activation | |
| accountInform | AccountInformation | required | which field |
| value | String? | nullable | the submitted value |

**Relations:** N–1 `Activation`. **Unique:** (activationId, accountInform) — one row per field per activation.
**Sensitive:** `value` may hold the Snapchat **password**/OTP. Exposed only to the assigned activator via the active-request DTO; **never** in admin-list or public DTOs.

### ActivationStep
Timeline — one row per `ActivationStat` transition.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, uuid | |
| activationId | String | FK→Activation | |
| activationStat | ActivationStat | required | the state entered |
| createdAt | DateTime | default now | |

**Relations:** N–1 `Activation`; 1–N `WrongInformation`, `AdditionalInformation`.

### WrongInformation
Fields the activator flagged incorrect at a given step; `value` filled with the client's correction.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, uuid | |
| activationStepId | String | FK→ActivationStep | |
| accountInform | AccountInformation | required | flagged field |
| value | String? | nullable | corrected value once re-submitted |

**Relations:** N–1 `ActivationStep`.
**Sensitive:** `value` may hold a corrected password — same exposure rule as `ActivationInformation.value`.

### AdditionalInformation
Fields the activator requested that weren't initially submitted (Snapchat: OTP); `value` filled when supplied.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, uuid | |
| activationStepId | String | FK→ActivationStep | |
| accountInform | AccountInformation | required | requested field |
| value | String? | nullable | supplied value (e.g. OTP) |

**Relations:** N–1 `ActivationStep`.
**Sensitive:** `value` may hold an OTP — same exposure rule as above.

### Log
Immutable audit trail; written only for actions covered by `LogActionType`.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, uuid | |
| actionType | LogActionType | required | |
| actionDescription | String | required | free text |
| userId | String | FK→User | actor |
| createdAt | DateTime | default now | |

**Relations:** N–1 `User`.

### RefreshToken
Backing store for JWT refresh/rotation.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, uuid | |
| userId | String | FK→User | |
| tokenHash | String | unique | **SENSITIVE (DB-only)** — never in any DTO |
| expiredAt | DateTime | required | |

**Relations:** N–1 `User`.
**Sensitive:** `tokenHash`.

### Wilaya *(lookup table)*
The 58 Algerian wilayas, bilingual.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, uuid | |
| wilayaCode | String | unique | |
| frName | String | required | |
| arName | String | required | |

**Relations:** 1–N `Commune`, `Distributor`, `Order`.

### Commune *(lookup table)*
Communes scoped to a wilaya, bilingual.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, uuid | |
| communeCode | String | unique | |
| wilayaId | String | FK→Wilaya | |
| frName | String | required | |
| arName | String | required | |

**Relations:** N–1 `Wilaya`; 1–N `Distributor`, `Order`.

### DeliveryCompany *(lookup table)*
Admin-managed couriers selectable on orders.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, uuid | |
| name | String | required | |
| registeredName | String | required | |
| isActive | Boolean | default true | |

**Relations:** 1–N `Order`.

---

## Enums

**UserRole** — `ADMIN`, `ACTIVATOR`

**SubscriptionType** — `SNAPCHAT_PLUS`

**SubscriptionDuration** — `ONE_DAY`, `ONE_WEEK`, `TWO_WEEK`, `ONE_MONTH`, `THREE_MONTH`, `SIXTH_MONTH`, `ONE_YEAR`, `UNLIMITED`

**CardStat** — `IN_SET`, `PRINTED`, `IN_LOT`, `AT_DISTRIBUTOR`, `ACTIVATION_PROGRESS`, `ACTIVATED`, `ACTIVATION_FAILED`

**SetStat** — `NOT_PRINTED`, `PENDING_PRINTING`, `PRINTED`

**LotStat** — `PENDING`, `IN_DELIVERY`, `DELIVERED`, `RETURNED`

**OrderStat** — `PENDING_DELIVERY`, `IN_DELIVERY`, `DELIVERED`, `RETURNED`

**ActivationStat** — `PENDING`, `PROCESSING`, `WRONG_INFORMATION`, `ADDITIONAL_INFORMATION`, `FREEZE`, `ACTIVATED`, `ACTIVATED_BY_ADMIN`, `CANCELLED_BY_ACTIVATOR`, `REMOVED_FROM_ACTIVATOR`, `CANCELLED_BY_ADMIN`

**DeliveryType** — `HOME`, `PICKUP_POINT`, `STORE`

**AccountInformation** — `USERNAME`, `EMAIL`, `PHONE_NUMBER`, `OTP`, `BIRTHDAY`, `PASSWORD`

**LogActionType** — `CHANGE_USER_PASSWORD`, `CHANGE_USER_STAT`, `CHANGE_USER_INFORMATION`, `SET_PAYMENT`, `DELETE_PAYMENT`, `ADD_DISTRIBUTOR`, `CHANGE_DISTRIBUTOR_INFORMATION`, `CHANGE_DISTRIBUTOR_STAT`, `CHANGE_ACTIVATION_COMMISSION`, `REMOVE_LOT`, `REMOVE_SET`, `REMOVE_CARD`, `REVOKE_CARD`

> `CommissionDuration` is **not** an enum — it is a lookup table because each tier carries minute bounds. Its `key` values (e.g. `LESS_15_MIN`, `LESS_30_MIN`, `OTHER`) are seed data, not a compile-time enum.

---

## Relations (textual map)

- **User** is the identity root: 1–1 **Admin**, 1–1 **Activator**; 1–N **RefreshToken**; 1–N **Log**.
- **Payment** links **Admin** (recorder) and **Activator** (payee).
- **Distributor** belongs to a **Wilaya** + **Commune**; owns 1–N **Card** and 1–N **Order**.
- **SubscriptionPlan** = type + duration; owns 1–N **SubscriptionPlanCommission**, **Set**, **Lot**, **Card**. Each commission row also points at a **CommissionDuration** tier.
- **Set** → 1–N **Card**. **Lot** → 1–N **Card**, and **Lot** ↔ **Order** is many-to-many through **OrderLot**.
- **Order** belongs to a **Distributor**, a delivery **Wilaya** + **Commune**, and a **DeliveryCompany**; bundles lots via **OrderLot**.
- **Card** belongs to a **SubscriptionPlan**, a **Set**, optionally a **Lot** and a **Distributor**; owns 1–N **Activation**.
- **Activation** belongs to a **Card** and (optionally) an **Activator**; owns 1–N **ActivationInformation** (initial submission) and 1–N **ActivationStep** (timeline).
- **ActivationStep** owns 1–N **WrongInformation** and 1–N **AdditionalInformation**, each keyed by an **AccountInformation** field.
- **Wilaya** → 1–N **Commune**; both **Wilaya** and **Commune** are referenced by **Distributor** and **Order**.

---

## prisma/schema.prisma

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ============================================================
// Enums (fixed, code-driven — mirror @my-app/contract z.enum())
// ============================================================

enum UserRole {
  ADMIN
  ACTIVATOR
}

enum SubscriptionType {
  SNAPCHAT_PLUS
}

enum SubscriptionDuration {
  ONE_DAY
  ONE_WEEK
  TWO_WEEK
  ONE_MONTH
  THREE_MONTH
  SIXTH_MONTH
  ONE_YEAR
  UNLIMITED
}

enum CardStat {
  IN_SET
  PRINTED
  IN_LOT
  AT_DISTRIBUTOR
  ACTIVATION_PROGRESS
  ACTIVATED
  ACTIVATION_FAILED
}

enum SetStat {
  NOT_PRINTED
  PENDING_PRINTING
  PRINTED
}

enum LotStat {
  PENDING
  IN_DELIVERY
  DELIVERED
  RETURNED
}

enum OrderStat {
  PENDING_DELIVERY
  IN_DELIVERY
  DELIVERED
  RETURNED
}

enum ActivationStat {
  PENDING
  PROCESSING
  WRONG_INFORMATION
  ADDITIONAL_INFORMATION
  FREEZE
  ACTIVATED
  ACTIVATED_BY_ADMIN
  CANCELLED_BY_ACTIVATOR
  REMOVED_FROM_ACTIVATOR
  CANCELLED_BY_ADMIN
}

enum DeliveryType {
  HOME
  PICKUP_POINT
  STORE
}

enum AccountInformation {
  USERNAME
  EMAIL
  PHONE_NUMBER
  OTP
  BIRTHDAY
  PASSWORD
}

enum LogActionType {
  CHANGE_USER_PASSWORD
  CHANGE_USER_STAT
  CHANGE_USER_INFORMATION
  SET_PAYMENT
  DELETE_PAYMENT
  ADD_DISTRIBUTOR
  CHANGE_DISTRIBUTOR_INFORMATION
  CHANGE_DISTRIBUTOR_STAT
  CHANGE_ACTIVATION_COMMISSION
  REMOVE_LOT
  REMOVE_SET
  REMOVE_CARD
  REVOKE_CARD
}

// ============================================================
// Identity & Access
// ============================================================

model User {
  id          String    @id @default(uuid())
  username    String    @unique
  password    String // SENSITIVE: hashed, never in a DTO
  role        UserRole
  lastLoginAt DateTime?
  isEnabled   Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?

  admin         Admin?
  activator     Activator?
  refreshTokens RefreshToken[]
  logs          Log[]

  @@index([role])
  @@index([isEnabled])
  @@index([deletedAt])
}

model Admin {
  id        String  @id @default(uuid())
  userId    String  @unique
  fullName  String
  phone     String
  isEnabled Boolean @default(true)

  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  payments Payment[]
}

model Activator {
  id                       String  @id @default(uuid())
  userId                   String  @unique
  fullName                 String
  phone                    String
  totalEarning             Decimal @default(0) @db.Decimal(12, 2)
  credits                  Decimal @default(0) @db.Decimal(12, 2)
  nbOfActivation           Int     @default(0)
  nbOfSuccessfulActivation Int     @default(0)

  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  payments    Payment[]
  activations Activation[]
}

model RefreshToken {
  id        String   @id @default(uuid())
  userId    String
  tokenHash String   @unique // SENSITIVE
  expiredAt DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model Log {
  id                String        @id @default(uuid())
  actionType        LogActionType
  actionDescription String
  userId            String
  createdAt         DateTime      @default(now())

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([actionType])
  @@index([createdAt])
}

// ============================================================
// Finance
// ============================================================

model Payment {
  id              String    @id @default(uuid())
  adminId         String
  activatorId     String
  totalAmount     Decimal   @db.Decimal(12, 2)
  previousCredits Decimal   @db.Decimal(12, 2)
  paymentDate     DateTime  @default(now())
  isDeleted       Boolean   @default(false)
  deletedDate     DateTime?

  admin     Admin     @relation(fields: [adminId], references: [id])
  activator Activator @relation(fields: [activatorId], references: [id])

  @@index([activatorId])
  @@index([adminId])
  @@index([isDeleted])
}

// ============================================================
// Catalog (plans + tiered commission)
// ============================================================

model SubscriptionPlan {
  id                   String               @id @default(uuid())
  subscriptionType     SubscriptionType
  subscriptionDuration SubscriptionDuration
  isActive             Boolean              @default(true)

  commissions SubscriptionPlanCommission[]
  sets        Set[]
  lots        Lot[]
  cards       Card[]

  @@unique([subscriptionType, subscriptionDuration])
}

model CommissionDuration {
  id          String   @id @default(uuid())
  key         String   @unique
  label       String
  nbMinuteMin Int
  nbMinuteMax Int? // null = catch-all (unbounded upper tier)
  createdAt   DateTime @default(now())

  commissions SubscriptionPlanCommission[]
}

model SubscriptionPlanCommission {
  id                   String  @id @default(uuid())
  subscriptionPlanId   String
  commissionDurationId String
  commission           Decimal @db.Decimal(12, 2)

  subscriptionPlan   SubscriptionPlan   @relation(fields: [subscriptionPlanId], references: [id], onDelete: Cascade)
  commissionDuration CommissionDuration @relation(fields: [commissionDurationId], references: [id])

  @@unique([subscriptionPlanId, commissionDurationId])
  @@index([subscriptionPlanId])
}

// ============================================================
// Inventory (sets, lots, orders, cards)
// ============================================================

model Set {
  id                 String    @id @default(uuid())
  setNumber          String    @unique
  subscriptionPlanId String
  numberOfKeys       Int
  setStat            SetStat   @default(NOT_PRINTED)
  createdAt          DateTime  @default(now())
  printedAt          DateTime?

  subscriptionPlan SubscriptionPlan @relation(fields: [subscriptionPlanId], references: [id])
  cards            Card[]

  @@index([setStat])
  @@index([subscriptionPlanId])
}

model Lot {
  id                 String    @id @default(uuid())
  lotNumber          String    @unique
  subscriptionPlanId String
  lotStat            LotStat   @default(PENDING)
  nbOfCards          Int       @default(0)
  isReturned         Boolean   @default(false)
  createdAt          DateTime  @default(now())
  deliveryDate       DateTime?

  subscriptionPlan SubscriptionPlan @relation(fields: [subscriptionPlanId], references: [id])
  cards            Card[]
  orderLots        OrderLot[]

  @@index([lotStat])
  @@index([subscriptionPlanId])
}

model Order {
  id                  String       @id @default(uuid())
  orderNumber         String       @unique
  distributorId       String
  receivedName        String
  receivedPhone       String
  wilayaId            String
  communeId           String
  deliveryCompanyId   String
  deliveryType        DeliveryType
  orderPrice          Decimal      @db.Decimal(12, 2)
  deliverPrice        Decimal      @db.Decimal(12, 2)
  cardsDeliveredCount Int          @default(0)
  orderStat           OrderStat    @default(PENDING_DELIVERY)
  createdAt           DateTime     @default(now())
  completedAt         DateTime?

  distributor     Distributor     @relation(fields: [distributorId], references: [id])
  wilaya          Wilaya          @relation(fields: [wilayaId], references: [id])
  commune         Commune         @relation(fields: [communeId], references: [id])
  deliveryCompany DeliveryCompany @relation(fields: [deliveryCompanyId], references: [id])
  orderLots       OrderLot[]

  @@index([distributorId])
  @@index([orderStat])
  @@index([wilayaId])
  @@index([deliveryCompanyId])
  @@index([createdAt])
}

model OrderLot {
  id      String @id @default(uuid())
  orderId String
  lotId   String

  order Order @relation(fields: [orderId], references: [id], onDelete: Cascade)
  lot   Lot   @relation(fields: [lotId], references: [id])

  @@unique([orderId, lotId])
  @@index([orderId])
  @@index([lotId])
}

model Card {
  id                 String    @id @default(uuid())
  key                String    @unique
  subscriptionPlanId String
  setId              String
  lotId              String?
  distributorId      String?
  cardStat           CardStat  @default(IN_SET)
  isActive           Boolean   @default(false)
  isDisabled         Boolean   @default(false)
  isRevoked          Boolean   @default(false)
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  deletedAt          DateTime?

  subscriptionPlan SubscriptionPlan @relation(fields: [subscriptionPlanId], references: [id])
  set              Set              @relation(fields: [setId], references: [id])
  lot              Lot?             @relation(fields: [lotId], references: [id])
  distributor      Distributor?     @relation(fields: [distributorId], references: [id])
  activations      Activation[]

  @@index([cardStat])
  @@index([distributorId])
  @@index([lotId])
  @@index([setId])
  @@index([subscriptionPlanId])
  @@index([isActive])
}

// ============================================================
// Activation (EAV account data)
// ============================================================

model Activation {
  id              String         @id @default(uuid())
  cardId          String
  activatorId     String?
  activationStat  ActivationStat @default(PENDING)
  clientFullName  String
  clientPhone     String
  clientEmail     String?
  activationEmail String?
  activationPrice Decimal?       @db.Decimal(12, 2)
  freezReason     String?
  requestedAt     DateTime       @default(now())
  takenAt         DateTime?
  completedAt     DateTime?

  card        Card                    @relation(fields: [cardId], references: [id])
  activator   Activator?              @relation(fields: [activatorId], references: [id])
  information ActivationInformation[]
  steps       ActivationStep[]

  @@index([cardId])
  @@index([activatorId])
  @@index([activationStat])
  @@index([requestedAt])
  @@index([completedAt])
}

model ActivationInformation {
  id            String             @id @default(uuid())
  activationId  String
  accountInform AccountInformation
  value         String? // SENSITIVE: may hold password/OTP — activator-only exposure

  activation Activation @relation(fields: [activationId], references: [id], onDelete: Cascade)

  @@unique([activationId, accountInform])
  @@index([activationId])
}

model ActivationStep {
  id             String         @id @default(uuid())
  activationId   String
  activationStat ActivationStat
  createdAt      DateTime       @default(now())

  activation            Activation              @relation(fields: [activationId], references: [id], onDelete: Cascade)
  wrongInformation      WrongInformation[]
  additionalInformation AdditionalInformation[]

  @@index([activationId])
}

model WrongInformation {
  id               String             @id @default(uuid())
  activationStepId String
  accountInform    AccountInformation
  value            String? // SENSITIVE: may hold a corrected password — activator-only exposure

  activationStep ActivationStep @relation(fields: [activationStepId], references: [id], onDelete: Cascade)

  @@index([activationStepId])
}

model AdditionalInformation {
  id               String             @id @default(uuid())
  activationStepId String
  accountInform    AccountInformation
  value            String? // SENSITIVE: may hold an OTP — activator-only exposure

  activationStep ActivationStep @relation(fields: [activationStepId], references: [id], onDelete: Cascade)

  @@index([activationStepId])
}

// ============================================================
// Reference data (lookup tables)
// ============================================================

model Wilaya {
  id         String @id @default(uuid())
  wilayaCode String @unique
  frName     String
  arName     String

  communes     Commune[]
  distributors Distributor[]
  orders       Order[]
}

model Commune {
  id          String @id @default(uuid())
  communeCode String @unique
  wilayaId    String
  frName      String
  arName      String

  wilaya       Wilaya        @relation(fields: [wilayaId], references: [id])
  distributors Distributor[]
  orders       Order[]

  @@index([wilayaId])
}

model DeliveryCompany {
  id             String  @id @default(uuid())
  name           String
  registeredName String
  isActive       Boolean @default(true)

  orders Order[]
}

// ============================================================
// Distributor (references reference data above)
// ============================================================

model Distributor {
  id              String    @id @default(uuid())
  fullName        String
  storeName       String
  wilayaId        String
  communeId       String
  isEnabled       Boolean   @default(true)
  nbOfActiveCards Int       @default(0)
  nbOfActivation  Int       @default(0)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  deletedAt       DateTime?

  wilaya  Wilaya  @relation(fields: [wilayaId], references: [id])
  commune Commune @relation(fields: [communeId], references: [id])
  cards   Card[]
  orders  Order[]

  @@index([wilayaId])
  @@index([communeId])
  @@index([isEnabled])
}
```
