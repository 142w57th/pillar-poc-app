# Trading POC App

Mobile-first Next.js scaffold for a trading web app.

## Stack

- Next.js (App Router, TypeScript)
- Tailwind CSS
- TanStack React Query
- Next.js Route Handlers for backend APIs

Note: this project uses Tailwind CSS v4 syntax (`@import "tailwindcss";`) in `src/app/globals.css`.

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Available Scripts

- `npm run dev` - start local dev server
- `npm run build` - production build
- `npm run start` - start production server
- `npm run lint` - run ESLint
- `npm run typecheck` - run TypeScript checks
- `npm run storage:seed` - seed local client-account mappings into file storage

## API Endpoints

- `GET /api/health`
- `GET /api/v1/status`
- `GET /api/v1/balances?userId=<uuid>`
- `GET /api/v1/dashboard?userId=<uuid>`
- `GET /api/v1/instruments`
- `GET /api/v1/positions?userId=<uuid>`
- `GET /api/v1/quotes?symbol=<symbol>`
- `POST /api/v1/orders`

## Environment

Copy `.env.example` to `.env` and adjust values as needed:

- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_API_BASE_URL`
- `KV_STORE_FILE` (optional, defaults to `src/server/.store/kv.json`)
- `DEMO_USER_ID` (used by local seed utility)
- `NEXT_PUBLIC_DEMO_USER_ID` (used by dashboard/buy/sell/transfer UI requests)
- `HARBOR_PROVIDER` (`mock` by default, set `real` to call Harbor APIs for all domains)
- `HARBOR_API_BASE_URL`
- `HARBOR_AUTH_URL`
- `HARBOR_CLIENT_ID`
- `HARBOR_CLIENT_SECRET`
- `HARBOR_BALANCES_PATH` (optional, defaults to `/v2/financials/accounts/{accountId}/balances`)
- `HARBOR_INSTRUMENTS_PATH` (optional, defaults to `/instruments`)
- `HARBOR_ORDERS_PATH` (optional, defaults to `/trading/v1/orders`)
- `HARBOR_POSITIONS_PATH` (optional, defaults to `/positions`)
- `HARBOR_QUOTES_PATH` (optional, defaults to `/quotes`)
- `HARBOR_AUTH_SCOPE` (optional)
- `HARBOR_REQUEST_TIMEOUT_MS`

### Harbor Provider Mode

Harbor is the single backend provider for all data domains (balances, instruments, orders).

- Use `HARBOR_PROVIDER=mock` to serve all responses from local fixtures (no outbound HTTP calls).
- Use `HARBOR_PROVIDER=real` to route all API calls through the live Harbor integration (with OAuth auth).
- All API response contracts stay the same in both modes.

Orders support both `BUY` and `SELL` side values at `POST /api/v1/orders`. Submitted orders are persisted in the local KV store file for history/audit usage.

Runtime storage uses a local JSON key-value file and reads environment variables from `src/server/.env`.

## Project Structure

```text
src/
  app/
    api/
      health/route.ts
      v1/status/route.ts
    globals.css
    layout.tsx
    onboarding/page.tsx
    page.tsx
  components/
    shared/
  features/
  lib/
    api-client.ts
    providers.tsx
    query-client.ts
  server/
    features/
      dashboard/
    storage/
      kv-store.ts
      seed.ts
    integrations/
      harbor/
    http/response.ts
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
