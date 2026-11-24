# SetVision

A management platform for a distribution network of activation cards. Administrators print and track batches of cards (sets), distributors place orders for them, and activators use them to activate subscriptions for end clients. The platform covers the full lifecycle: printing, distribution, activation, commissions, payments, delivery and audit.

> This repository is a portfolio copy of the production codebase. The production repository is private. This copy is kept in sync for review purposes.

**Live:** [setvision.pages.dev](https://setvision.pages.dev/)

## What it does

**Administration**
- Create sets of cards tied to a subscription plan, then move each set through printing states
- Manage subscription plans, their costs and activator commissions by duration
- Manage lots and card orders from distributors, with card revocation requests
- Record payments and track balances
- Manage activators, distributors, delivery companies, and a geography of wilayas and communes
- Dashboards and statistics, and a full audit log of every mutation

**Activators**
- Work the activation queue: fill in the client's subscription information, record steps, and flag wrong information
- Request additional information, freeze requests, and track their own earnings and credits
- Real-time updates over WebSockets, so queues refresh without reloading

**Clients**
- Public landing and account flow with OTP verification
- Activation status and history for their subscription

**Notifications**
- Optional Telegram notifications through a webhook, with an activation email subsystem
- Notifications are fully inert when disabled by configuration

## Engineering highlights

- **Contract-first monorepo.** A shared `contract` package holds the Zod schemas, DTOs, route constants, enums and event types. The API and the web app both import from it and never redeclare them. Types are derived from schemas with `z.infer`.
- **Modular backend.** Each module under `Apps/api/src/modules` follows a fixed six-file pattern: mapper, interface, service, controller, routes and index. Responses are wrapped in a single `ApiResponse` envelope, and errors are typed `AppError` subclasses.
- **Event-driven side effects.** Services publish typed events to an event bus. Only a single realtime gateway talks to Socket.IO, and only one subscriber talks to the notification service, so transport details stay isolated from business logic.
- **Money as Decimal.** Monetary values are Prisma `Decimal(12,2)` on the backend and never JavaScript floats. Currency is DZD.
- **Security basics.** Argon2 password hashing, JWT access tokens with server-stored refresh tokens, role-based route guards, Helmet, origin-restricted CORS and rate limiting. Authentication errors are deliberately uniform to avoid user enumeration.
- **Structured logging.** Pino logger across the backend, with no `console` calls.
- **Frontend layering.** `component → hook (TanStack Query) → service → API`, with one Axios instance, React Hook Form using the contract's Zod schemas, and a single shared realtime client.
- **Documented design record.** The `Docs/` folder holds the data model, a per-module contract specification, page requirements, and reports from each delivery stage.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript, TanStack Query and Table, React Hook Form, Radix UI, Tailwind CSS, Recharts, pdf-lib, Socket.IO client |
| Backend | Node.js, Express 5, TypeScript, Prisma 6, PostgreSQL, Socket.IO, Pino, Argon2, JWT, Helmet |
| Shared | Zod 4 contract package |
| Testing | Vitest, Supertest, Testing Library |
| Deployment | Render (API), Vercel (web), Neon (managed PostgreSQL) |

## Repository layout

```
Apps/
  contract/   shared Zod schemas, DTOs, route constants, enums, event types
  api/        Express API, Prisma schema, migrations, scripts, tests
  web/        React single-page application
Docs/         data model, module contracts, page requirements, stage reports, deployment guide
```

## Running it locally

Prerequisites: Node.js 18 or later, and a PostgreSQL database.

```bash
# 1. Install dependencies in each app
cd Apps/contract && npm install
cd ../api && npm install
cd ../web && npm install

# 2. Configure environment files from the examples
cp Apps/api/.env.example Apps/api/.env
cp Apps/web/.env.example Apps/web/.env

# 3. Create the database schema
cd Apps/api && npx prisma migrate dev

# 4. Load reference data and create an admin account
npm run load_wilaya
npm run load_commission_durations
npm run create_admin_account

# 5. Start the API and the web app in two terminals
cd Apps/api && npm run dev
cd Apps/web && npm run dev
```

Optional: `npm run load_mock_data` loads sample activators, clients and activations for local exploration.

### Environment variables

The API reads its configuration from `Apps/api/.env.example`. The main variables are:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | signing key for access tokens (32+ characters in production) |
| `JWT_EXPIRATION`, `REFRESH_TOKEN_EXPIRATION` | token lifetimes |
| `CORS_ORIGIN` | the web app origin allowed to call the API |
| `NOTIFICATIONS_ENABLED`, `TELEGRAM_*` | optional Telegram notifications |

The web app reads `VITE_API_URL` and `VITE_WS_URL`. Secrets are never committed; the `.env.example` files contain placeholders only.

## Deployment

The API runs as a persistent Node process because it keeps WebSocket connections open. The web app is a static build. The deployment guide in `Docs/deploy-instruction.md` covers the free-tier setup: Neon for the database, Render for the API, and Vercel for the web app, including environment variables and a smoke test.

## Documentation

The `Docs/` folder records how the system was designed and delivered:

- `Stage-00-Conception/`: the database description, Prisma schema, one contract specification per module, and page requirements
- `Stage-01-Contract/`: the contract package rules and delivery reports
- `Stage-02-Backend/`: backend rules and per-module implementation reports
- `Stage-03-Frontend/`: frontend rules and per-page reports
- `Stage-04-fix/`: post-launch change sets, with plans and execution reports

## Author

Built by me :) with the help of Claude Code ofc, as a freelance project for a [client type].
