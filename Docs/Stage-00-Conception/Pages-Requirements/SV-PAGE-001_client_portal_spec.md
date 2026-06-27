# SV-PAGE-001 — Client Activation Portal (public)

> **App:** Setvision Web Application
> **Page:** Public client activation page
> **Route:** `/` or `/activate`
> **Auth:** None (public)
> **Primary User:** End client (scratch-card holder) — **mobile-first**
> **Languages:** Arabic (RTL) · French · English — default from browser locale, fallback French
> **Dark/Light mode:** Yes, persisted in localStorage
> **Real-time:** WebSocket/SSE with polling fallback (activator/admin → client updates)
> **Source of truth:** new DB schema + scenarios. The backend resolves the key to a single client-facing state; the front never inspects raw card/activation enums.

---

## Conventions (same as the other documents)

- **API output rule:** responses are pre-resolved. Verify returns one client-facing status plus exactly what that view needs (subscription label, previously submitted values, requested fields, reference token). No raw FKs or internal enum values.
- **Data dependencies:** each region lists the `use[Name]` hooks it reads/triggers, the fields collected, and the Command they map to. Interfaces and enum value lists are omitted.
- **Navigation:** only the `<Link>` and its target are noted; this is effectively a single page, so most links are external (social, support) plus the in-page "Check Another Key" reset.
- **States:** every region defines loading and empty/error.

### The genericity principle on the client side

The Step 2 account form and the Step 3 additional-info input are **per-subscription-plan**, not hard-coded. The verify response carries the plan, and the front renders the matching form/additional-info component. **Snapchat Plus (the only plan today):** submitted fields = Snapchat username, email, phone (optional), password; the single requestable additional field = **OTP**. A future plan ships its own form + additional-info component keyed by the returned plan, with no schema or page-flow change.

---

## The single gate: `is_active`

Every key check resolves through the card's `is_active` flag. It is true from `AT_DISTRIBUTOR` onward and stays true through `ACTIVATION_PROGRESS`, `ACTIVATED`, and `ACTIVATION_FAILED`; it is false before delivery and while a card is disabled.

- **Key not found, or `is_active = false`** → one generic message: *"This key does not exist. Please verify the key printed on your card and try again."* (Pre-delivery, disabled, and non-existent keys are intentionally indistinguishable to the client.)
- **`is_active = true`** → the backend resolves the precise client-facing state from the card/activation status (below).

---

## Page structure

```
┌─────────────────────────────────────────┐
│ HEADER  Logo+Name | Social | Terms | Lang | 🌙
├─────────────────────────────────────────┤
│ STEP INDICATOR  [1]──[2]──[3]            │
├─────────────────────────────────────────┤
│ MAIN (changes per step/status)          │
│ [ Check Another Key ] (always visible)   │
├─────────────────────────────────────────┤
│ WHO WE ARE                               │
│ RECENT ACTIVITY / STATS                  │
├─────────────────────────────────────────┤
│ FOOTER  Logo | Social | Terms | © 2026   │
└─────────────────────────────────────────┘
```

- **Header:** logo (`<Link>` home/reset), social icons (Instagram, WhatsApp — external, new tab), Terms / Privacy links, AR|FR|EN switcher (persist; AR flips the whole page to RTL), dark-mode toggle. Collapses to a hamburger below 768px.
- **Footer:** logo + "Setvision — Marketing And Digital Services", social, Terms / Privacy, "© 2026 Setvision." Stacks on mobile.
- **Step indicator:** 1 Enter Key · 2 Account Information · 3 Activation. Completed = green check; active = purple; future = gray/non-clickable.

---

## Step 1 — Key entry & verification

- Heading "Enter Your Activation Key"; input placeholder `XXXX-XXXX-XXXX-XXXX`; "Verify Key" button (purple, spinner + disabled while in-flight); centered, full-width on mobile.
- **Client-side validation:** empty → "Please enter your activation key."; bad format → "Invalid key format. Please check your key and try again."

### Verify result → client-facing state → UI

The backend returns one resolved status:

| Client-facing status | Resolved from | UI |
|----------------------|---------------|----|
| **Invalid** | not found or `is_active = false` | red generic "does not exist" message; input border red; field stays editable |
| **Ready** | `is_active`, card `AT_DISTRIBUTOR`, no live activation (incl. a revoked card re-usable) | → Step 2, empty editable account form |
| **Submitted** | activation `PENDING` | → Step 2 read-only (submitted values) + amber 15-min support notice + "Update Information" |
| **Processing** | activation `PROCESSING` | → Step 2/Step 3 read-only "being processed" notice |
| **Needs correction** | activation `WRONG_INFORMATION` (+ flagged fields) | → Step 2 with the flagged fields highlighted + "Update & Re-submit" |
| **Needs OTP** | activation `ADDITIONAL_INFORMATION` (+ requested field = OTP) | → Step 3 OTP input (plan-specific additional-info UI) |
| **Under review** | activation `FREEZE` | → Step 3 amber "being reviewed by our team, please wait or contact support" |
| **Activated** | card `ACTIVATED` | → Step 3 success view |
| **Failed** | card `ACTIVATION_FAILED` | → Step 3 failure view (completion-style card): "Activation failed — please contact us." + WhatsApp |

> After an admin revokes a failed card it returns to `AT_DISTRIBUTOR` (`is_active = true`), so re-checking that key resolves to **Ready** again and a new activation can be started.

### API

| Method | Endpoint | Input | Output (resolved) |
|--------|----------|-------|-------------------|
| POST | `/api/keys/verify` | VerifyKeyCommand `{ key }` | `{ status, subscription_label, plan_key, activation_ref?, submitted_fields?:[{field_label,value}] (no password), flagged_fields?:[field_key], requested_fields?:[field_key], account_username? }` — only the parts the resolved status needs |

### Data dependencies

- **Reads/Writes:** `useVerifyKey` (→ VerifyKeyCommand). On success it seeds `ActivationContext` with status, plan, and `activation_ref` for later calls.
- **Navigation:** Invalid/Disabled views surface a WhatsApp support link (external).

### States

- **Loading:** button spinner, field disabled.
- **Empty:** initial field.
- **Error:** network fail → "Unable to verify your key. Please check your connection and try again." + retry; server 5xx → "Something went wrong on our end. Please try again later or contact support." + WhatsApp.

---

## Step 2 — Account information form (per-plan; Snapchat shown)

### Fields (Snapchat Plus)

**Group A — Your information** (stored on the activation directly)

| Field | Required | Validation |
|-------|----------|------------|
| Full Name | yes | 3–100, letters/spaces/hyphens |
| Phone Number | yes | Algerian: 05/06/07 + 8 digits |

**Group B — Snapchat account** (stored as per-field `Activation information` rows)

| Field | Required | Validation |
|-------|----------|------------|
| Snapchat Username | yes | not empty |
| Snapchat Email | yes | valid email |
| Snapchat Phone | no | defaults to the personal phone; if set, valid format |
| Password | yes | min 6, show/hide toggle |
| Confirm Password | yes | must match |

> The client's own contact email is **not** collected in the UI for Snapchat. Per-field values map into `Activation information` via the submit command; full name and phone are activation columns.

**Security notice** (amber, below the password fields): *"Your password is used solely to activate your Snapchat Plus subscription. We strongly recommend you change it once activation is confirmed."* (The password is handled as ordinary data — transmitted over HTTPS, retained, not purged — since the client is advised to change it after completion or failure.)

### Buttons

- **Save & Submit** (purple) → validate → submit → activation becomes `PENDING` → Submitted view.
- **Clear Fields** (outline) → confirm "Clear all fields?" → reset.

### State variants

- **A) Ready:** all empty, editable. Buttons: Save & Submit · Clear Fields.
- **B) Submitted (`PENDING`):** read-only submitted values (password masked as dots, never returned); amber 15-min support notice + WhatsApp; **Update Information** → re-opens fields editable.
- **C) Needs correction (`WRONG_INFORMATION`):** fields prefilled, flagged fields get a red border + error icon; top message "Some of your information needs correcting. Please fix the highlighted fields and re-submit."; button **Update & Re-submit**. (For Snapchat the flaggable set is username / email / phone / password.)
- **D) Under review / Processing:** read-only with the relevant notice; no edit.

### API

| Method | Endpoint | Input | Output |
|--------|----------|-------|--------|
| POST | `/api/keys/{activation_ref}/submit` | SubmitActivationCommand `{ full_name, phone, account_fields:[{field_key,value}] }` | 200 → status `Submitted`; activation created `PENDING` |
| PUT | `/api/keys/{activation_ref}/update` | UpdateActivationCommand `{ account_fields:[{field_key,value}] }` | 200 → returns to `PROCESSING`; updates the flagged `Wrong information` step values |

### Data dependencies

- **Reads:** `ActivationContext` (status, plan, prefilled `submitted_fields`, `flagged_fields`).
- **Writes:** `useSubmitActivation` (→ SubmitActivationCommand), `useUpdateActivation` (→ UpdateActivationCommand).
- **Navigation:** Submitted/Review views show WhatsApp support (external).

### States

- **Loading:** Save/Update button spinner, fields disabled.
- **Empty:** Ready variant is the empty form.
- **Error:** submit network fail → "Unable to submit your information. Please try again." (form data preserved); validation errors inline per field; 5xx → generic server error + WhatsApp.

---

## Step 3 — Activation (additional info · completion · failure)

### A) Needs OTP (`ADDITIONAL_INFORMATION`, requested field = OTP)

- Heading "OTP Verification Required"; message "Enter the verification code to complete activation."; numeric OTP input split into individual digit boxes; **Submit OTP**; "Resend" link with a 60-second cooldown.
- On submit → stored as the `Additional information` step value (field = OTP) → activation returns to `PROCESSING`.
- **Validation:** max 5 incorrect attempts → temporary lockout.
- (This is the plan-specific additional-info UI; a future plan renders its own component for whatever field it requests.)

### B) Under review (`FREEZE`)

- Amber notice: "Your activation is being reviewed by our team. Please wait, or contact support." + WhatsApp. Read-only; updates live when the admin resolves it (→ success or failure).

### C) Activated (`ACTIVATED` / resolved `ACTIVATED_BY_ADMIN`)

- Large green animated check; "Activation Complete!"; "Your Snapchat Plus subscription is now active."; security reminder "For your safety, please change your Snapchat password now."; shows the account username for reference (no other sensitive data).

### D) Failed (`ACTIVATION_FAILED` / resolved `CANCELLED_BY_ADMIN`)

- Completion-style card, red/neutral tone: "We couldn't complete this activation. Please contact us so we can help." + WhatsApp support. (If the card is later revoked, re-checking the key returns to Ready.)

### API

| Method | Endpoint | Input | Output |
|--------|----------|-------|--------|
| POST | `/api/keys/{activation_ref}/additional` | SubmitAdditionalInfoCommand `{ account_fields:[{field_key,value}] }` (Snapchat: OTP) | 200 → returns to `PROCESSING` |

### Data dependencies

- **Reads:** `ActivationContext` (status, `requested_fields`, `account_username`).
- **Writes:** `useSubmitAdditionalInfo` (→ SubmitAdditionalInfoCommand).
- **Navigation:** Review/Failed views → WhatsApp support (external).

### States

- **Loading:** Submit OTP spinner; resend disabled during cooldown.
- **Empty:** OTP boxes empty initially.
- **Error:** wrong OTP → "Incorrect code. Please try again." (attempt counter); lockout → "Too many attempts. Please wait before retrying."; network fail → retry with preserved input.

---

## Real-time updates

- **Connect:** after submit (status `PENDING`), open WebSocket/SSE for this activation ref; fallback to polling every 5–10s.
- **Events → UI:** picked up → `Processing`; flagged → Step 2 `Needs correction` (with fields); OTP requested → Step 3 `Needs OTP`; frozen → Step 3 `Under review`; completed → Step 3 `Activated`; failed → Step 3 `Failed`.
- **Connection drop:** non-intrusive "Connection lost. Reconnecting…" toast, exponential backoff; on reconnect re-verify to re-sync; also re-verify on window focus/visibility change. Multiple tabs on one key → only the most recent submission is treated as active.

### Data dependencies

- **Reads:** `useActivationRealtime` (subscribes by `activation_ref`, updates `ActivationContext`).

---

## Persistent "Check Another Key"

Always visible at the bottom of the main section. On click: reset to Step 1, clear all form data and the key input, reset the step indicator, and tear down the realtime subscription.

---

## Informational sections (below main)

### Who We Are
Short mission paragraph (client-provided), tagline "Marketing And Digital Services", optional brand illustration/icon grid.

### Recent Activity / Statistics
Animated counters (total successful activations, activations this week, etc.).

| Method | Endpoint | Input | Output |
|--------|----------|-------|--------|
| GET | `/api/stats` | — | Public counters, pre-aggregated (cached up to ~5 min) |

- **Reads:** `usePublicStats`.
- **States:** loading → counters shimmer; **empty/error → gracefully hide the section or show a neutral placeholder** (never an error block on the public page).

---

## Security

| Concern | Implementation |
|---------|----------------|
| Transport | HTTPS everywhere |
| Password | transmitted over HTTPS; retained as ordinary data (no purge), client advised to change it post-activation |
| Key verification | rate limit (e.g. 10 attempts / IP / 15 min) |
| Bot prevention | CAPTCHA on key verification |
| CSRF | token on all form submissions |
| OTP | max 5 incorrect attempts → temporary lockout |

---

## Responsive

Mobile 320–576 (primary, stacked full-width forms) · Tablet 577–992 · Desktop 993+. Min touch target 44×44; step indicator stays horizontal but compact on mobile; header → hamburger below 768; no horizontal scroll; AR flips to full RTL.

### Data dependencies (page-level)

- **Context:** `ActivationContext` (key, status, plan, activation_ref, submitted/flagged/requested fields, account_username), `ThemeContext`.
- **Hooks:** `useVerifyKey`, `useSubmitActivation`, `useUpdateActivation`, `useSubmitAdditionalInfo`, `useActivationRealtime`, `usePublicStats`, `useLanguage` (i18n + RTL).

### States (page-level)

- **Loading:** step transitions show inline spinners; never a full-page block after the first paint.
- **Empty:** initial state is Step 1.
- **Error:** verify/submit errors are handled per step above; the public stats section degrades silently; a hard server error anywhere surfaces the generic "something went wrong" message with a WhatsApp support link, leaving entered data intact where possible.

---

*End of the Client activation portal — and of the full re-spec. Documents delivered: Client portal (SV-PAGE-001), Activator portal (SV-PAGE-002→005), and the Admin panel in three parts (SV-PAGE-006→010, 011→013, 014→018).*
