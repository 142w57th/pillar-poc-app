# Business Logic Documentation

This document captures domain/business rules for the trading app. Keep it updated whenever business behavior, constraints, or assumptions change.

## Document Rules

- Update this file in the same PR/change where business logic is introduced or modified.
- Prefer explicit rule statements over implementation details.
- Record unknowns and assumptions so they can be reviewed with product/compliance teams.
- Track effective date and change owner in the changelog section.

## Current Product Scope (Scaffold Phase)

- Current scope is platform scaffolding only.
- No trading workflows, portfolio flows, order flows, or account lifecycle rules are implemented yet.
- Existing API endpoints are infrastructure endpoints only (`/api/health`, `/api/v1/status`).

## Domain Documents

Use these files for domain-specific business logic. Keep this root document as the cross-domain index and decision log.

- Accounts and User Eligibility: `docs/business-logic-domains/accounts.md`
- Instruments and Market Data: `docs/business-logic-domains/instruments.md`
- Orders and Execution: `docs/business-logic-domains/orders.md`
- Portfolio and Positions: `docs/business-logic-domains/portfolio.md`
- Risk, Limits, and Safeguards: `docs/business-logic-domains/risk.md`

## Cross-Domain Decisions and Assumptions

- Operational endpoints (`/api/health`, `/api/v1/status`) remain infrastructure-only and are not treated as product business workflows.
- Any rule that spans more than one domain should be recorded here and linked to the impacted domain files.

## Open Questions (Cross-Domain)

- _None currently._

## Change Log

| Date (YYYY-MM-DD) | Change | Author |
| --- | --- | --- |
| 2026-04-07 | Replaced file-based KV runtime storage with `Keyv` using the default in-memory backend for mappings, token cache, and order history. | AI assistant |
| 2026-03-27 | Removed Postgres/Drizzle runtime dependency and moved to persistent file-based key-value storage (`KV_STORE_FILE`) for mappings and token cache. | AI assistant |
| 2026-03-27 | Replaced DB architecture with persistent file-based key-value storage for client-account mappings and token cache. | AI assistant |
| 2026-03-27 | Updated architecture decision to strict 1:N model: `client (user_id unique)` -> `broker_account (client_id FK)`. | AI assistant |
| 2026-03-27 | Migrated onboarding/dashboard rules and API semantics from root doc into domain files (`accounts`, `portfolio`); kept root doc as index + cross-domain log. | AI assistant |
| 2026-03-27 | Added domain-level business logic document set under `docs/business-logic-domains/` for independent maintenance by area. | AI assistant |
| 2026-03-27 | Added `userId` requirement for dashboard API account lookup and documented `broker_account` ownership keying by user ID + account type. | AI assistant |
| 2026-03-27 | Added backend dashboard API business rules for Harbor OAuth (`client_credentials`), per-account parallel balance fetch, and consolidated aggregation/error semantics. | AI assistant |
| 2026-03-26 | Added onboarding flow rules: discoverability entry points, 3-step journey (`Account Type`, `Personal Info`, `Suitability`), and stepper requirements. | AI assistant |
| 2026-03-26 | Added dashboard asset-class multi-select filtering behavior (`ALL` + class subsets) and defined filter semantics for summary/holdings/activity sections. | AI assistant |
| 2026-03-24 | Added consolidated portfolio dashboard assumptions for merged account-type view, including Equity, Crypto, and Event Contract display rules. | AI assistant |
| 2026-03-24 | Created business logic documentation baseline for scaffold phase. | AI assistant |
