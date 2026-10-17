# Future RAWG integration boundary

Phase 5A configures `createMixedGameService(mockGameService)` in `src/services/gameService.ts`, with no additional provider. No RAWG request is made, and the application works without credentials. Review the [official API documentation](https://rawg.io/apidocs) and current credential/attribution requirements before enabling an adapter.

## Stable identities and hydration (Phase 5A)

Existing canonical IDs remain unchanged. Optional `Game.providerIds` explicitly maps `steam` and future `rawg` IDs; `providerGameId('rawg', '123')` produces `rawg:123` for new remote games. Existing Steam mappings derive from the catalog source URLs.

`src/lib/catalog.ts` validates normalized metadata and merges catalogs without changing local editions or IDs. Additional records require namespaced provider IDs. Only explicit aliases deduplicate; ambiguous/conflicting aliases fail rather than merge personal records by title. Local metadata wins for mapped editions.

`src/services/mixedGameService.ts` is an optional-adapter composition boundary. Its `hydrateSavedGames` helper takes saved IDs only, deduplicates them, limits concurrent lookups to four, supports cancellation and returns available/unavailable/error states with the original requested ID. It does not write storage or transmit personal content. Future remote views must deliberately wire hydration and pagination; no remote provider is configured now.

Never remove aliases or rewrite saved IDs without a backed-up migration that preserves reviews, library records and journals. Missing metadata must preserve its record and show a fallback. See [the audit's migration risks](phase-5a-audit.md).

## Contract

Implement `GameService` from `src/services/game-service.types.ts`:

- `sourceLabel`: a human-readable source label.
- `listGames(signal)`: resolve the catalog to normalized `Game` records.
- `getGame(id, signal)`: resolve one normalized record, or `null` for a genuine missing game.

Transport failures reject; a failed request must not be interpreted as an unknown game. Both operations accept cancellation. The existing hooks handle loading, failure/retry, cancellation, and preventing stale results when navigating between games. Pages consume these hooks and know nothing about transport DTOs.

## Proposed mapping

| RAWG field / endpoint             | Checkpoint                                                                                         |
| --------------------------------- | -------------------------------------------------------------------------------------------------- |
| Game `id`, `slug`, `name`         | Stable ID, slug, title; preserve existing local IDs with an explicit mapping                       |
| `background_image`                | Background image; use only suitable verified art for a portrait cover, otherwise `null`            |
| Detail `description_raw`          | Plain description; never render remote HTML directly                                               |
| `released`                        | Release date with source/edition context                                                           |
| Detail `developers`, `publishers` | Developer/publisher names or `null`                                                                |
| `platforms`, `genres`, `tags`     | Normalized stable platform IDs and display labels                                                  |
| `/games/{id}/screenshots`         | Screenshot URLs and accessible text                                                                |
| `metacritic`                      | Score with platform and source link, or `null`                                                     |
| `rating`, `ratings_count`         | RAWG community score with source, **not** a Checkpoint user rating                                 |
| `playtime`                        | Only map when its statistical meaning is clear; it is not automatically a completion-time estimate |
| `website`, stores                 | Validated HTTPS external links                                                                     |

Validate incoming JSON at the adapter boundary. Accept only HTTPS image/link URLs, check scores against the documented scale, and retain explicit `null` values instead of zeros for unknown metrics. Track source and snapshot information. Do not mix scores from different editions/platforms without labeling them.

The present UI filters a bounded catalog locally. An initial adapter can provide an equivalently bounded collection and hide pagination inside the service. Full-database search needs a deliberate paginated-query contract rather than downloading the entire RAWG database or silently truncating results. Keep local IDs stable so the later library/journal work remains compatible.

## Configuration and scope

Keep credentials out of client source, URLs checked into Git, and `VITE_*` variables. A later integration can call an application-owned proxy through `VITE_GAME_API_BASE_URL`; `.env.example` contains only a commented placeholder. No proxy or backend is implemented in Phase 2, and there is no nonfunctional source-switch control in the UI.
