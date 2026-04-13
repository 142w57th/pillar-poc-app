# Trading POC App

Mobile-first trading app built with Next.js App Router, Tailwind v4, and React Query.

## Current Product Flow

- App enforces onboarding before non-onboarding routes.
- Onboarding journey: `Account Type` -> `Personal Info` -> `Suitability`.
- Dashboard shows portfolio summary, holdings, and recent orders.
- Global instrument search routes to instrument details.
- Instrument details page fetches live quote + position context and links to Buy/Sell flows.
- Transfer flow includes Deposit and Withdraw journeys, plus payment account linking.

## Stack

- Next.js (App Router, TypeScript)
- Tailwind CSS
- TanStack React Query
- Route Handlers under `src/app/api` for backend APIs
- `Keyv` Postgres-backed runtime storage

## Getting Started

```bash
npm install
cp src/server/.env.sample src/server/.env
npm run dev
```

Open http://localhost:3000.

## Available Scripts

- `npm run dev` - start local dev server
- `npm run db:generate` - generate Drizzle SQL migrations from schema
- `npm run migrate` - apply Drizzle migrations from `drizzle/`
- `npm run build` - production build
- `npm run start` - start production server
- `npm run lint` - run ESLint
- `npm run typecheck` - run TypeScript checks

## Environment

Copy `.env.example` to `.env` and adjust values as needed:

- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_API_BASE_URL`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD` (Postgres connection for app users + Keyv persistence)
- `APP_AUTH_SECRET` (signs login session cookies)
- `HARBOR_PROVIDER` (`mock` by default, set `real` to call Harbor APIs for all domains)
- `HARBOR_API_BASE_URL`
- `HARBOR_AUTH_URL`
- `HARBOR_CLIENT_ID`
- `HARBOR_CLIENT_SECRET`
- `HARBOR_PARTIES_PATH`
- `HARBOR_ACCOUNTS_PATH`
- `HARBOR_ACCOUNT_TEMPLATES_PATH`
- `HARBOR_BALANCES_PATH`
- `HARBOR_PARTY_BALANCES_PATH`
- `HARBOR_INSTRUMENTS_PATH`
- `HARBOR_ORDERS_PATH`
- `HARBOR_PARTY_ORDERS_PATH`
- `HARBOR_POSITIONS_PATH`
- `HARBOR_PARTY_POISITIONS_PATH` (legacy typo key still supported)
- `HARBOR_PARTY_POSITIONS_PATH`
- `HARBOR_QUOTES_PATH`
- `HARBOR_PRICE_SNAPSHOT_API`
- `HARBOR_PAYMENT_INSTRUCTIONS_PATH`
- `HARBOR_PAYMENT_ACCOUNTS_PATH`
- `HARBOR_DEPOSITS_PATH`
- `HARBOR_AUTH_SCOPE`
- `HARBOR_REQUEST_TIMEOUT_MS`

Notes:

Harbor is the single backend provider for all data domains (balances, instruments, orders).

- Use `HARBOR_PROVIDER=mock` to serve all responses from local fixtures (no outbound HTTP calls).
- Use `HARBOR_PROVIDER=real` to route all API calls through the live Harbor integration (with OAuth auth).
- All API response contracts stay the same in both modes.

Orders support both `BUY` and `SELL` side values at `POST /api/v1/orders`, and order history is fetched from Harbor APIs.

Runtime storage uses `Keyv` with a Postgres backend and only persists onboarding/account linkage plus OAuth token cache (no order storage).

User authentication is email/password based:

- Passwords are stored as bcrypt hashes in Postgres (`app_users` table).
- Session auth uses an HTTP-only signed cookie.

## API Endpoints

Health + status:

- `GET /api/health`
- `GET /api/v1/status`

Authentication:

- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/session`

Dashboard + portfolio:

- `GET /api/v1/dashboard`
- `GET /api/v1/dashboard/accounts`
- `GET /api/v1/balances?scope=account|party&assetClass=<optional>`
- `GET /api/v1/positions?scope=account|party&symbol=<optional>&assetClass=<optional>`

Instruments + market data:

- `GET /api/v1/instruments?q=<optional>&limit=<optional>&assetClass=<optional>&instrumentType=<optional>&exchange=<optional>&status=<optional>`
- `GET /api/v1/quotes?symbol=<required>&assetClass=<optional>&includeExtendedHours=<optional>`

Orders:

- `GET /api/v1/orders`
- `POST /api/v1/orders`

Onboarding:

- `GET /api/v1/onboarding/status`
- `GET /api/v1/onboarding/account-templates`
- `POST /api/v1/onboarding/accounts`

Payments:

- `GET /api/v1/payments/payment-instructions`
- `GET /api/v1/payments/payment-accounts`
- `POST /api/v1/payments/payment-accounts`
- `GET /api/v1/payments/destination-accounts`
- `POST /api/v1/payments/deposits`

Debug stream:

- `GET /api/v1/api-log/stream?clear=1` (optional clear-on-connect)
- `DELETE /api/v1/api-log/stream`
## Project Structure

```text
src/
  app/
    api/
    onboarding/
    buy/
    sell/
    deposit/
    withdraw/
    instruments/[symbol]/
    transfer/
    settings/
    page.tsx
  components/
    shared/
  lib/
    api-client.ts
    account-asset-class.ts
    providers.tsx
    query-client.ts
  server/
    auth/
    features/
    integrations/harbor/
    storage/
    http/
  types/
    api.ts
```

## Documentation

- Business logic rules and assumptions: `docs/business-logic.md`
- Domain documents:
  - `docs/business-logic-domains/accounts.md`
  - `docs/business-logic-domains/instruments.md`
  - `docs/business-logic-domains/orders.md`
  - `docs/business-logic-domains/portfolio.md`
  - `docs/business-logic-domains/risk.md`
  - `docs/business-logic-domains/transfer.md`

## Deployment (External DB)

For staging/production, use your existing deployed app and connect it to a managed Postgres instance (for example, existing RDS).

Required environment variables:

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `APP_AUTH_SECRET`

Apply schema migrations before app start/deploy:

```bash
npm run migrate
```

## Onboarding Flow

- Route: `/onboarding`
- Journey steps: `Account Type` -> `Personal Info` -> `Suitability`
- Stepper/progress is shown at the top of the onboarding card.
- Discoverability entry points:
  - Dashboard CTA (`Start onboarding`)
  - Sidebar navigation item (`Onboarding`)

## Theming

- App colors are implemented with semantic CSS tokens in `src/app/globals.css` (for example: `--surface-1`, `--text-primary`, `--positive`, `--tag-equity-bg`).
- UI components use semantic utility classes (`bg-surface-1`, `text-app-secondary`, `border-app`, `text-positive`, `tag-equity`, etc.) instead of hardcoded Tailwind color names.
- Theme selection is available in `Settings` and persisted locally using `localStorage` key `qapital-theme`.
- Included theme presets: `light`, `dark`, `ocean`, `sunset`.
- To adjust brand/theme colors, update token values in `:root` and `[data-theme="..."]` blocks without changing component markup.
