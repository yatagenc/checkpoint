# Phase 5B.1 — RAWG data consistency

## Audit and fixes

- Homepage genre totals were counts of the 36 curated games. A separate `GenreDiscovery` component now requests `resource=genres` through the existing Netlify gateway, normalizes RAWG IDs/names/slugs/`games_count`, and displays API totals only. It preserves the existing card styling and has loading, error/retry and unavailable states. Failure never substitutes local counts.
- The proxy allows `/genres` with bounded metadata pagination only. The browser requests one page of at most 20 genres, caches it for 10 minutes in the existing bounded/deduplicated memory cache, and never follows pages automatically. Embedded game previews are discarded. If more genres exist, the visible subset is labeled.
- Homepage genre cards link to Explore with the API genre ID. Explore uses the same cached genre metadata for its controls and forwards IDs to RAWG's `genres` filter. Existing supported slug links and fallback controls remain valid.
- Metacritic platform rows were discarded by normalization. `Game.metacriticPlatforms` now optionally retains actual metascores, source URLs, platform labels and IDs. The single top-level RAWG value has a null platform, rather than being described as an aggregate or attributed to an assumed platform. A platform name can be resolved through an explicit matching API platform ID; it is never inferred from a score or the mere presence of a PC release.
- Cards visibly label the platform for their displayed score; unspecified scores say “Platform unspecified.” Details show all supplied platform rows, separately from RAWG community ratings and personal ratings. Missing/invalid scores show unavailable. No game-specific score corrections or invented platform values were added.
- The verified identity mapping previously replaced live metadata with the curated object. Mapping now changes identity/provider aliases only. RAWG-backed cards and alias routes retain live metadata while personal actions use the canonical ID. Legacy curated routes and editorial collections retain their labeled snapshot metadata, with a fallback on provider failure. No stored IDs or user records are rewritten.
- The homepage no longer labels the whole application as a local demo. Featured games, PC critic picks and latest curated releases remain explicitly editorial/snapshot sections. Demo counts are derived from the current curated catalog rather than duplicated constants; the offline catalog link remains explicitly labeled.

## Files

`server/rawg-normalize.ts`, `rawg-proxy.ts`; `src/lib/rawg-contract.ts`, `catalog.ts`, new `metacritic.ts` and `rawg-consistency.test.ts`; `src/types/index.ts`; `src/services/rawgClient.ts`, `checkpointGameService.ts`; new `src/hooks/useGenres.ts`; new `GenreDiscovery.tsx`, `HomeCollections.tsx`, `GameCard.tsx`, `GameDetails.tsx`; Home/Explore/DemoExplore pages; styles, existing regression tests, README and integration reference.

## Verification

Official RAWG schema was inspected. Only **two targeted live API requests** were made: one genre metadata page and one RDR2 detail record. The genre response contained 19 genres. The RDR2 response supplied an unspecified top-level Metacritic value of 96, PlayStation 4 97, PC 93 and Xbox One 97. These are observations of the response on October 17, 2026, not production constants or claims that scores will remain unchanged. The implementation consumes whatever valid values the provider supplies. No secrets or complete API responses were printed.

Automated HTTP responses are mocked. Coverage checks API counts (including zero), metadata-only responses, genre IDs/filter forwarding, cache expiry/deduplication, homepage count links, genre-filtered Explore results, loading/error/retry/unavailable states, RDR2 platform presentation, unknown/missing scores, identity mapping, and library/review persistence. The existing personal/journal and port regression suites remain included.

| Check               | Result                                                                |
| ------------------- | --------------------------------------------------------------------- |
| `npm run typecheck` | Passed                                                                |
| `npm run lint`      | Passed                                                                |
| `npm test`          | Passed: 41 domain tests, 27 React scenarios, 4 development-port tests |
| `npm run build`     | Passed                                                                |

Secret scan and git diff --check also passed. Production JS: 453.00 kB (127.13 kB gzip); CSS: 46.99 kB (10.55 kB gzip).

## Remaining limitations

Genre totals and scores depend on RAWG data quality and may be up to 10 minutes old in memory. Only the first 20 genre records are requested; no game database is downloaded to calculate totals. RAWG listings may omit platform breakdowns; those cards honestly show the supplied unspecified value, with detail rows available when returned by the detail endpoint. Legacy curated routes remain source-labeled snapshots rather than silently refreshed remote records. No browser visual check was performed; verify genre grids/count wrapping and score rows at mobile/desktop widths, plus direct genre links and provider outages. No deployment, authentication or social features were added.

References: [RAWG API schema](https://api.rawg.io/docs/), [RAWG API information](https://rawg.io/apidocs), [integration contract](rawg-integration.md).
