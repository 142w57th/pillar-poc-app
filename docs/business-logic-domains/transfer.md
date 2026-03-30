# Transfers

## Scope

Define transfer page display behavior for balances and the current Deposit/Withdraw action scope.

## Rules

- `/transfer` is a mobile-first page focused on account cash movement context.
- Transfer page displays two backend-sourced values:
  - `Buying Power`
  - `Cash available for withdrawal`
- Both values are fetched from the balances API and shown as USD currency.
- `Deposit` action routes to `/deposit`; `Withdraw` remains UI-only in this phase.
- Transfer page uses semantic theme tokens and shared card/button patterns for consistency with dashboard and order pages.
- Any request that eventually reaches Braavos or any third-party API must go through internal proxy routes under `/api/v1/*`.

## API Contract Notes

- Endpoints involved:
  - `GET /api/v1/balances?userId=<uuid>`
- Validation rules:
  - `userId` (UUID) is required.
- Error semantics:
  - `HARBOR_AUTH_FAILED`: Harbor token acquisition failed.
  - `HARBOR_BALANCES_FETCH_FAILED`: one or more Harbor balances calls failed.
  - `SERVER_CONFIG_ERROR`: required backend env variables are missing/invalid.

## Open Questions

- Withdraw flow destination is pending.

## Change Log

| Date (YYYY-MM-DD) | Change | Author |
| --- | --- | --- |
| 2026-03-30 | Updated `Deposit` action to route to dedicated `/deposit` flow and documented proxy-only integration rule. | AI assistant |
| 2026-03-29 | Created transfer domain rules with balances API and UI-only action scope. | AI assistant |
