# Accounts and User Eligibility

## Scope

Define account onboarding, eligibility, profile requirements, and lifecycle constraints.

## Rules

- Onboarding flow is discoverable from both dashboard (`Start onboarding` CTA) and global navigation (`Onboarding` menu item).
- Client onboarding (personal info) is a one-time activity. If the user has completed client onboarding for any account type previously, the `Personal Info` step is skipped entirely.
- When client is already onboarded, the flow is 2 steps: `Account Type` -> `Suitability`.
- When client is not yet onboarded, the flow is 3 steps: `Account Type` -> `Personal Info` -> `Suitability`.
- `Account Type` is a single-choice selection from onboarding intent cards (`event-contract`, `equity`, `crypto`).
- Already-opened account types are greyed out with a checked mark and display their `externalAccountId` below the description.
- Only un-opened account types can be selected for new onboarding.
- If all three account types are opened, the page shows a completion message with a link to the dashboard.
- Suitability fields (`employmentType`, `investmentObjective`, `riskTolerance`) are required for every account opening.
- Auto-fill toggle is intentionally omitted from onboarding UX in this scaffold.

## Compliance Constraints

- _TBD_

## Edge Cases

- If a user attempts to open an account type that already exists, the API returns a `409 ACCOUNT_ALREADY_EXISTS` error.
- If the client record does not exist and `personalInfo` is omitted from the request, the API returns a `400 CLIENT_NOT_ONBOARDED` error.

## API Contract Notes

- Endpoints involved:
  - `GET /api/v1/onboarding/status?userId=<uuid>` — returns client onboarding status and list of already-opened accounts with their external IDs.
  - `POST /api/v1/onboarding/accounts` — creates a new broker account. Accepts `userId`, `accountType`, optional `personalInfo` (required for first-time), and `suitability`.
  - `GET /api/v1/balances?userId=<uuid>` (depends on existing linked accounts for the supplied user)
- Validation rules:
  - `userId` (UUID) is required to resolve client identity from key-value storage.
  - `accountType` must be one of `equity`, `crypto`, `event-contract`.
  - Suitability fields `employmentType`, `investmentObjective`, `riskTolerance` are required.
- Error semantics:
  - `NO_LINKED_ACCOUNTS`: no account mapping exists for the resolved client in key-value storage.
  - `ACCOUNT_ALREADY_EXISTS` (409): user already has an account of the requested type.
  - `CLIENT_NOT_ONBOARDED` (400): personal info required but not provided.
  - `MISSING_SUITABILITY` (400): required suitability fields missing.

## Open Questions

- _TBD_

## Change Log

| Date (YYYY-MM-DD) | Change | Author |
| --- | --- | --- |
| 2026-03-27 | Replaced database client-account mapping references with persistent key-value storage mappings. | AI assistant |
| 2026-03-27 | Updated account mapping semantics to `client (user_id)` -> `broker_account (client_id)` for strict 1:N architecture. | AI assistant |
| 2026-03-27 | Migrated onboarding and account-linked dashboard input rules from root business logic doc. | AI assistant |
| 2026-03-27 | Created domain template. | AI assistant |
| 2026-03-27 | Added API integration for onboarding: GET /onboarding/status, POST /onboarding/accounts. Client onboarding is one-time; opened accounts greyed out with account IDs. | AI assistant |
