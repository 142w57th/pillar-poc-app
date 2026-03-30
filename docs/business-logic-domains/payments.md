# Payments and Deposits

## Scope

Define `/deposit` flow behavior for payment instructions, destination-account selection, amount input, and deposit submission.

## Rules

- `/deposit` is a mobile-first flow.
- The page fetches payment instruction accounts from `GET /api/v1/payments/payment-instructions`.
- If payment instructions are empty, the page must show an empty state and keep submit disabled.
- Destination account dropdown options are fetched from internal KV-backed data via `GET /api/v1/payments/destination-accounts?userId=<uuid>`.
- Destination account selection is required before submit.
- Deposit amount must parse as a positive numeric USD value.
- Submit triggers `POST /api/v1/payments/deposits` with:
  - `userId`
  - `destinationAccountId`
  - `amountUsd`
- Bank-account linking UI is explicitly out of scope for this phase and is shown as a future enhancement.
- Any call to Braavos or other external APIs must happen through internal proxy/backend layers; frontend code must only call internal `/api/v1/*` routes.

## API Contract Notes

- Endpoints involved:
  - `GET /api/v1/payments/payment-instructions`
  - `GET /api/v1/payments/destination-accounts?userId=<uuid>`
  - `POST /api/v1/payments/deposits`
- Validation rules:
  - `userId` must be UUID.
  - `destinationAccountId` is required and must map to linked internal destination accounts for the given user.
  - `amountUsd` must be a positive number.
- Error semantics:
  - `INVALID_DEPOSIT_INPUT` for malformed/invalid request payload.
  - `PAYMENT_INSTRUCTIONS_FETCH_FAILED` for upstream payment instructions failures.
  - `DEPOSIT_SUBMIT_FAILED` for upstream deposit submission failures.
  - `SERVER_CONFIG_ERROR` for missing/invalid backend configuration.

## Integration

- Payments use the unified provider abstraction with `HARBOR_PROVIDER=mock|real`.
- `mock` mode returns fixture payment instructions and a simulated submitted deposit.
- `real` mode routes to configurable paths:
  - `HARBOR_PAYMENT_INSTRUCTIONS_PATH` (default `/braavos/v1/payments/payment-instructions`)
  - `HARBOR_DEPOSITS_PATH` (default `/braavos/v1/payments/deposits`)

## Open Questions

- Detailed Braavos field mapping and response normalization may need refinement once final provider payloads are confirmed.
- Link bank account onboarding flow and verification states are pending.

## Change Log

| Date (YYYY-MM-DD) | Change | Author |
| --- | --- | --- |
| 2026-03-30 | Added initial deposit flow domain rules, internal destination account source, and proxy-only API integration policy. | AI assistant |
