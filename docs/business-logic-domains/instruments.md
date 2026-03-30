# Instruments and Market Data

## Scope

Define supported instruments, market-data assumptions, freshness expectations, and fallback behavior.

## Rules

- _TBD_

## Data Freshness and Latency

- _TBD_

## Fallback and Degradation Behavior

- _TBD_

## API Contract Notes

- Endpoints involved:
  - `GET /api/v1/instruments` for symbol catalog and metadata used by search and details page headers.
- Validation rules:
  - Instrument details route follows `/instruments/[symbol]` and normalizes the symbol to uppercase for lookups.
  - "Your Position" tile is rendered only when the selected symbol has a position snapshot for the active client.
- Error semantics:
  - If symbol metadata is unavailable, the details page falls back to showing the symbol while preserving quote and action controls.

## Integration

- Instruments are served through the unified **Harbor** provider (`HARBOR_PROVIDER=mock|real`).
- When `mock`, the catalog is served from `src/server/integrations/harbor/fixtures/instruments.json`.
- When `real`, the catalog is fetched from the Harbor API at the path configured by `HARBOR_INSTRUMENTS_PATH` (default `/instruments`).

## Open Questions

- _TBD_

## Change Log

| Date (YYYY-MM-DD) | Change | Author |
| --- | --- | --- |
| 2026-03-27 | Created domain template. | AI assistant |
| 2026-03-27 | Added instrument details page behavior notes, including conditional position tile rendering. | AI assistant |
| 2026-03-27 | Consolidated instruments under unified Harbor provider; removed standalone instruments integration. | AI assistant |
