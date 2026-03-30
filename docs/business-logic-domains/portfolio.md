# Portfolio and Positions

## Scope

Define portfolio aggregation, position display rules, calculation assumptions, and reconciliation behavior.

## Rules

- Dashboard landing view represents a consolidated portfolio across account types (`Equity`, `Crypto`, `Event Contract`).
- Consolidation indicator should be visible in dashboard summary and section-level helper copy.
- Holdings and recent activity shown on dashboard are presented as merged multi-account views.
- Dashboard includes a multi-select asset class filter (`ALL`, then each asset class) that controls summary cards, holdings, and recent activity content.
- Dashboard sections are displayed as an accordion (`Portfolio`, `Holdings`) with `Portfolio` expanded by default and `Holdings` collapsed.
- Portfolio summary and money cards are grouped under the single `Portfolio` section and share the same balances data source.
- Dashboard API calls are section-driven: balances data is fetched when `Portfolio` is opened, and holdings data is fetched when `Holdings` is opened.
- `ALL` acts as a global selection and is mutually exclusive with manual class subsets; if all individual classes become selected, filter resets to `ALL`.
- Holdings UI uses a generic presentation mapper with reusable display slots (`title`, `left metric`, optional `left hint`, `right value/performance`) so new asset classes can be added without changing list layout structure.
- Asset-class-specific holdings display conventions:
  - `Equity`: ticker symbol, last price with `1D` change, market value, P/L percent.
  - `Crypto`: pair-style symbol (for example `BTC/USD`), last price with `24H` move label, market value, P/L percent.
  - `Event Contract`: instrument symbol with bought side semantics (`YES`/`NO`), side pricing context (`YES`/`NO` prices), market value, P/L percent.

## Calculation Assumptions

- Dashboard values are backend-supplied and treated as source-of-truth aggregates.
- Backend calls Harbor balances endpoint once per linked account ID and executes these calls in parallel.
- Frontend wireframe does not perform cross-account aggregation calculations.
- Aggregation semantics for `GET /api/v1/balances`: totals are sums across account responses and include account-level breakdown.

## Reconciliation Behavior

- Any discrepancy handling between account-level and consolidated values is backend-owned.

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

- Legacy `/api/v1/dashboard` route deprecation timeline is pending.
- Account mapping source-of-truth is persistent key-value storage with uniqueness on (`userId`, `accountType`).

## Change Log

| Date (YYYY-MM-DD) | Change | Author |
| --- | --- | --- |
| 2026-03-29 | Switched portfolio balance endpoint references from `/api/v1/dashboard` to `/api/v1/balances`. | AI assistant |
| 2026-03-29 | Combined `Portfolio` and `Money` into one dashboard section and restored section-to-endpoint mapping (`Portfolio` -> dashboard API, `Holdings` -> positions API). | AI assistant |
| 2026-03-29 | Updated section-triggered API behavior so opening `Portfolio` does not call dashboard balances; dashboard API now opens with `Money` only. | AI assistant |
| 2026-03-29 | Added dashboard accordion default-state behavior and section-triggered lazy API call rules (`Portfolio`/`Money` -> dashboard API, `Holdings` -> positions API). | AI assistant |
| 2026-03-29 | Added realistic holdings display conventions for equity/crypto/event contracts and documented the generic holdings presentation mapper. | AI assistant |
| 2026-03-27 | Replaced Postgres mapping note with persistent key-value storage source-of-truth. | AI assistant |
| 2026-03-27 | Updated data-model note to `client` -> `broker_account` 1:N mapping with unique (`client_id`, `account_type`). | AI assistant |
| 2026-03-27 | Migrated dashboard consolidation/filtering/API aggregation rules from root business logic doc. | AI assistant |
| 2026-03-27 | Created domain template. | AI assistant |
