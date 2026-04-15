# Orders and Execution

## Scope

Define order lifecycle, validations, routing/execution behavior, and failure handling.

## Rules

- `/buy` is a mobile-first order ticket UI with two order modes selected by instrument asset class:
  - Standard BUY mode for `Equity` and `Crypto`.
  - Event Contract mode for `Event Contract` with explicit side selection (`YES`/`NO`).
- `/sell` mirrors `/buy` as a preview-only sell ticket:
  - Shows invested balance for the selected instrument from quote position data.
  - Validates entered amount against invested balance.
  - Keeps Event Contract side-aware sell semantics (`SELL YES` / `SELL NO`) and dual side pricing display.
- Instrument labeling conventions:
  - `Crypto` instruments are shown as market pairs (for example `BTC/USD`) and previews summarize estimated base-asset units.
  - `Event Contract` instruments keep question-style titles and explicit `BUY YES` / `BUY NO` side semantics.
- Buy ticket must show buying power near the top before amount entry.
- Sell ticket must show invested balance near the top before amount entry.
- Chart components are not shown for any asset class in the order ticket.
- The bottom summary section is not shown in the current order ticket version.
- Order amount input supports preset quick amounts (`$100`, `$500`, `$1K`) and `Max`.
- The primary CTA label depends on page + mode:
  - Standard mode: `BUY`.
  - Event Contract mode: `BUY YES` or `BUY NO` based on side selection.
- Sell page standard mode: `SELL`.
- Sell page Event Contract mode: `SELL YES` or `SELL NO` based on side selection.
- Buy and sell tickets currently use local preview flow, but backend submit endpoint accepts both buy/sell payload shapes.
- Trade backend integration follows the unified Harbor provider pattern:
  - Current immediate path: `mock` mode for trades.
  - Future live path: `real` mode routes to Harbor API for all trade execution.

## Validation Rules

- Order amount must be parsed as a non-negative numeric value.
- Event Contract estimated outcome is side-aware and uses side price (`YES`/`NO`) for calculations.
- Event Contract preview copy should communicate payout as outcome resolution semantics (`if outcome resolves YES/NO`).
- Sell amount cannot exceed the selected instrument's invested balance.

## Failure and Retry Handling

- _TBD_

## API Contract Notes

- Endpoints involved:
  - `POST /api/v1/orders` for trade submission using the Harbor provider (`HARBOR_PROVIDER=mock|real`, default `mock`).
  - `GET /api/v1/orders` to list user orders via the Harbor provider proxy.
- Validation rules:
  - `userId` must be UUID.
  - `instrumentSymbol` is required.
  - `side` supports `BUY` and `SELL`.
  - `amountUsd` and `pricePerUnit` must be positive numbers.
  - `eventSide` is required for `Event Contract` and rejected for non-event asset classes.
  - A linked broker account must exist in KV for the request asset class (`equity`, `crypto`, `event-contract`).
- Error semantics:
  - `INVALID_ORDER_INPUT` for malformed/invalid request payload.
  - `SERVER_CONFIG_ERROR` for invalid/missing server configuration in real mode.
  - `TRADES_SUBMIT_FAILED` for downstream provider submission failures.

## Integration

- Orders are submitted through the unified **Harbor** provider (`HARBOR_PROVIDER=mock|real`).
- When `mock`, a simulated order is created immediately in `pending` state with a mock order ID.
- When `real`, the order is translated to Harbor's market-order envelope and POSTed to the Harbor API path configured by `HARBOR_ORDERS_PATH` (default `/trading/v1/orders`).
- Real Harbor order mapping currently supports `Equity` and `Crypto` payload translation for `/trading/v1/orders`.
- Every submitted order (mock or real) is persisted in in-memory `Keyv` storage together with account linkage and normalized order metadata.

## Open Questions

- _TBD_

## Change Log

| Date (YYYY-MM-DD) | Change | Author |
| --- | --- | --- |
| 2026-04-07 | Switched order persistence storage backend to in-memory `Keyv` (default adapter). | AI assistant |
| 2026-03-30 | Rewired `GET /api/v1/orders` through Harbor provider proxy (party-scoped), matching the positions integration pattern. | AI assistant |
| 2026-03-30 | Added `GET /api/v1/orders` and a lazy-loaded dashboard Orders section that fetches on expand. | AI assistant |
| 2026-03-30 | Wired `/buy` and `/sell` submits to `POST /api/v1/orders`; mock submission now returns `pending` status to support staged API rollout. | AI assistant |
| 2026-03-30 | Enabled buy/sell submission semantics in backend, mapped real execution to `/trading/v1/orders`, resolved account IDs from KV by asset class, and persisted submitted orders in KV storage. | AI assistant |
| 2026-03-30 | Renamed buy route from `/orders` to `/buy`, added preview-only `/sell` ticket with invested-balance limits and Event Contract sell semantics. | AI assistant |
| 2026-03-29 | Added realistic order-labeling conventions for crypto pairs and event-contract side-specific payout messaging. | AI assistant |
| 2026-03-27 | Created domain template. | AI assistant |
| 2026-03-27 | Added order ticket UI rules and mock-data assumption. | AI assistant |
| 2026-03-27 | Added `POST /api/v1/orders` backend scaffold with provider-based trade execution. | AI assistant |
| 2026-03-27 | Consolidated orders under unified Harbor provider; removed standalone trades/sycamore integration. | AI assistant |
