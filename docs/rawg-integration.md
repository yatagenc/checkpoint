# RAWG integration reference — Phase 5B

React calls the same-origin `/.netlify/functions/rawg` gateway. Only the server reads `RAWG_API_KEY`; client code, URLs and bundles contain no key. Netlify Dev supplies the function locally; Vite alone does not. See [README setup](../README.md).

Phase 5B.1 updates genre metadata and platform scores; see [the consistency report](phase-5b1-consistency.md).

## HTTP contract

All endpoints are GET requests to the same function, selected by validated parameters:

| Request                                                   | Official upstream                                            | Normalized result               |
| --------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------- |
| `?q=Animal+Well&page=1&page_size=20`                      | `/api/games` with `search`, `page`, `page_size`              | `{games, count, page, hasNext}` |
| `?genre=action&platform=4&year=2024&sort=rating`          | `/api/games` with `genres`, `platforms`, `dates`, `ordering` | Same page result                |
| `?id=rawg:783856`                                         | `/api/games/783856`                                          | `{game}`                        |
| `?id=rawg:783856&resource=screenshots&page=1&page_size=6` | `/api/games/783856/screenshots`                              | `{screenshots, page, hasNext}`  |

Only `id`, `resource`, `q`, `genre`, `platform`, `year`, `sort`, `page`, `page_size` are accepted, once each. Details cannot take listing filters or pagination. IDs must be `rawg:` plus a positive numeric ID (up to 10 digits). Pages are 1–100, sizes 1–20. Query length is 2–100 after trimming; empty queries browse a single popular page. Genres use API-provided positive numeric IDs, with the existing supported slugs retained for old links. Platform controls remain a fixed supported subset in `src/lib/rawg-contract.ts`. Years map to full-year `dates` ranges. Ordering maps to `name`, `-name`, `released`, `-released`, `-metacritic`, or no explicit ordering for search relevance (`-added` for an empty browse).

No upstream URL or `next` link is returned or followed. Unknown parameters, arbitrary URLs, repeated keys and malformed inputs return 400. Missing/rejected credentials return sanitized 503; genuine missing games/pages 404; rate limits 429 with a bounded retry hint; upstream/network/malformed responses 502; timeout 504. The client does not display upstream error bodies and does not retry automatically.

The server sends credentials only to `https://api.rawg.io/api/...`, disables redirects and applies an 8-second timeout and 2MB response cap. No request/response logging includes secret-bearing URLs. Netlify's declared IP rate limit is 60 requests per 60 seconds; production enforcement depends on the platform and has not been deployed/tested.

## Normalization and identity

`server/rawg-normalize.ts` extracts only supported metadata and HTTPS links, applies size/range/date checks, and ignores HTML descriptions in favor of `description_raw`. React escapes the plain string. Unknown fields become `null` or empty arrays. RAWG backgrounds are reused/cropped for cards; average playtime is not labeled completion time. Metacritic platform context is null/unspecified when RAWG does not supply it. Optional metacriticPlatforms retains metascore, safe source URL and explicit platform name/ID from metacritic_platforms. Names may be joined to the platform list only by an explicit matching ID; scores never determine attribution. RAWG user ratings are labeled separately from Checkpoint personal ratings.

Legacy IDs and storage schemas are unchanged. `src/data/provider-mappings.ts` contains the single verified base-game mapping for Elden Ring; the legacy route retains curated metadata, while RAWG-backed cards/alias routes retain provider metadata under the original canonical ID. No slug/title guesses or mass mappings are used. New records use `rawg:<id>`. Before adding a new mapping, check whether its remote ID was already saved: supporting both references without losing user records requires a separately designed migration/alias policy. No existing records are rewritten now.

## Resolution and caching

`rawgClient` provides bounded paginated queries, detail and screenshot calls with in-memory TTL caching and subscriber-aware cancellation/deduplication. Failed/malformed responses are not cached. Search TTL is 2 minutes; detail/screenshots 10 minutes; max 64 entries. Screenshots require a user request. Pagination replaces the visible page instead of appending an unbounded collection.

`checkpointGameService` resolves local IDs and mapped aliases locally, then namespaced remote details on demand. Its legacy `listGames` is intentionally curated-only; no caller can accidentally request a complete remote catalog through that contract. Saved views combine curated data, a 100-entry transient display set and at most 200 persisted minimal display snapshots, then hydrate at most four missing IDs. Individual detail routes resolve further records. Outages retain snapshot/ID access; personal content does not cross the metadata boundary.

The separate `game-display` key is best-effort and disposable. It stores no complete detail response and is never required to validate personal data. Corrupt display storage is not overwritten automatically. There is no database, global server cache, Redis, catalog enumeration or automatic crawl. A page reload loses memory cache; display snapshots remain until evicted or browser storage is cleared.

## References

- [Official RAWG API schema](https://api.rawg.io/docs/): list, detail, screenshot endpoint and parameter definitions were inspected.
- [RAWG API and terms](https://rawg.io/apidocs): attribution links are present wherever remote data can appear through the global footer, Explore and details.
- [Netlify Functions API](https://docs.netlify.com/build/functions/api/): Request/Response handler and rate-limit configuration.
- [Netlify function environment variables](https://docs.netlify.com/build/functions/environment-variables/): production secret requires Functions scope.

Consult current provider terms before public/commercial deployment. Short bounded application caches are used; no data resale, catalog archive or bulk redistribution is implemented.

## Genre metadata

`GET /.netlify/functions/rawg?resource=genres&page_size=20` forwards only to `/api/genres`. It returns `{genres, count, page, hasNext}`; each genre contains `{id, name, slug, gamesCount}` derived from the API games_count field. Embedded game previews/artwork are discarded. Only metadata pagination is allowed (pages 1–5, maximum 20 entries); the client requests the first page only, with a 10-minute bounded memory cache and no automatic next-page requests. If more categories exist, the homepage labels the subset. Game filters use the genre IDs, so newly supplied genres work without expanding a title-based mapping or enumerating games.
