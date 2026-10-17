# Phase 5B — RAWG integration report

Genre counts, Metacritic platform presentation and identity-only metadata mapping are subsequently corrected by [Phase 5B.1](phase-5b1-consistency.md).

Implemented October 17, 2026. No deployment, Phase 5C, database download, scraping, bulk game requests or personal-data migration was performed.

## Integration

The existing React UI now queries a same-origin Netlify Function, which sends the server environment key only to the official RAWG API. Explore is live by default; the 36-game demo is explicitly available at `/explore?source=demo`. Homepage editorial collections remain local and do not trigger remote catalog requests. Existing library, reviews, ratings, favorites, journals and spoiler controls remain functional.

The function uses an endpoint/parameter allowlist, 20-item maximum page size, 100-page search window, 8-second upstream timeout, 2MB response cap, redirect rejection, safe normalized responses and no sensitive logging. Credentials and upstream `next` URLs never reach the frontend. Missing/rejected credentials, invalid input/IDs, 404, rate limiting, timeout, malformed responses and network/server failures have bounded, sanitized error paths. No automatic retries are made.

## Endpoints and metadata

| Same-origin request                                                                   | Operation                            |
| ------------------------------------------------------------------------------------- | ------------------------------------ |
| `GET /.netlify/functions/rawg?q=Animal+Well&page=1&page_size=20`                      | On-demand title search/listing       |
| `GET /.netlify/functions/rawg?genre=action&platform=4&year=2024&sort=rating`          | Global server-side filters/ordering  |
| `GET /.netlify/functions/rawg?id=rawg:783856`                                         | Individual game details              |
| `GET /.netlify/functions/rawg?id=rawg:783856&resource=screenshots&page=1&page_size=6` | Explicitly requested screenshot page |

Available metadata includes titles, release dates, description text, developer/publisher names, platforms, genres, tags, background artwork, Metacritic and clearly labeled RAWG ratings, plus official HTTPS websites. Unknown metrics remain unavailable. RAWG average activity hours are not interpreted as completion-time estimates. Descriptions are plain text escaped by React; HTML is not injected. Backgrounds are cropped for cards; no invented cover URLs are used.

Explore debounces changes by 400ms, skips one-character queries, sends filters to RAWG and replaces one visible page at a time. Empty search browses one popular page. Previous/Next controls never follow every API page. Query/filter/sort/page state is in the URL. Cancellation and response keys prevent obsolete results from replacing newer ones. Screenshots require a button click and have their own pagination/retry state. Demo results are never silently substituted for live results.

## Identity and user records

All curated IDs and the `checkpoint:v1:personal-data` / `checkpoint:v1:journals` envelopes are unchanged. No user record was deleted, reset or rewritten. New external records use `rawg:<id>`. RAWG Elden Ring `326243` was explicitly verified and resolves to canonical `elden-ring`, retaining its curated edition metadata. No other mapping is guessed by title. Future mappings must account for any remote IDs already saved; adding aliases later requires a separate preservation/migration policy.

Saved views remain readable/editable independently of the API. They use local metadata, a bounded transient working set and small remote display snapshots; unresolved records retain their IDs and management controls. A view hydrates at most four missing remote IDs, and individual detail routes can resolve further entries. Display snapshots use a separate key, hold at most 200 ID/title/cover/date/source summaries, and contain no full details, reviews or journals. Failed/corrupt snapshot storage does not block personal saves. Saved snapshots are visibly labeled when used on details.

The memory API cache holds at most 64 responses, with 2-minute search and 10-minute detail/screenshot TTLs. Identical simultaneous requests are shared; subscriber cancellation preserves other consumers. Failure/malformed responses are evicted. An additional 100-entry transient display working set is bounded. No server database or large caching dependency was introduced.

## Files

- Gateway: `netlify/functions/rawg.ts`, `server/rawg-proxy.ts`, `server/rawg-normalize.ts`.
- Configuration: `netlify.toml`, `.env.example`, `.gitignore`, `package.json`, `tsconfig.node.json`, `scripts/netlify-dev.mjs`.
- Metadata/client: `src/lib/rawg-contract.ts`, `src/services/rawgClient.ts`, `checkpointGameService.ts`, `gameDisplay.ts`, `gameService.ts`, `src/data/provider-mappings.ts`, `games.ts`, `src/types/index.ts`.
- UI/state: Explore and explicit DemoExplore pages, `RemoteScreenshots`, GameDetails/route error feedback, Footer attribution, saved-view hook and its Library/Profile/Diary/Playthrough/JournalProfile consumers, PersonalProvider's best-effort display snapshot calls.
- Coverage/docs: `src/lib/rawg.test.ts`, `scripts/test-ui.mjs`, `README.md`, `docs/rawg-integration.md`, this report.

## Development and production

`npm run dev` and `npm run dev:netlify` load `.env.local` and start Netlify CLI 27.13.0 with Vite. The default public URL is `http://localhost:8888`; `npm run dev -- --port 8889` selects an alternative. The launcher detects an existing Checkpoint server, checks IPv4/IPv6 availability and chooses a separate free Vite target; see [README port handling](../README.md). Bare Vite (`npm run dev:vite`) and `npm run preview` do not implement Functions. Bare `netlify dev` uses the fixed defaults in `netlify.toml`. Restart an existing process after changing secrets.

For a future authorized Netlify deployment, configure `RAWG_API_KEY` with Functions scope and the intended deploy context, build with `npm run build`, publish `dist` and package `netlify/functions` together. `netlify.toml` supplies SPA rewrites. No key uses a Vite prefix or appears in checked-in configuration. `.env.local` and `.netlify` are ignored. No deployment was performed.

RAWG backlinks appear in the global footer, live Explore and remote game source context. Third-party ownership is acknowledged. Provider documentation/terms and Netlify references are linked in the [integration reference](rawg-integration.md).

## Validation evidence

Final automated results:

| Check                            | Result                                                                                                            |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`              | Passed                                                                                                            |
| `npm run lint`                   | Passed                                                                                                            |
| `npm test`                       | Passed: 35 domain tests and 25 React DOM scenarios (plus their parent test)                                       |
| `npm run build`                  | Passed: JS 449.20 kB / 126.10 kB gzip; CSS 46.73 kB / 10.49 kB gzip                                               |
| Secret scan / `git diff --check` | Passed; actual configured secret absent from tracked/proposed files and production output; local env is untracked |

Live verification used **six targeted RAWG requests** through the actual handler: popular Elden Ring search, Animal Well search outside the curated catalog, Elden Ring detail, one screenshot, a second search page, and a nonexistent ID. Five successful operations returned 200; nonexistent ID returned sanitized 404. No full responses or credentials were printed. Initial missing-variable setup checks stopped before making any upstream request.

After the corrected environment file was loaded into a fresh Netlify Dev process, **one additional live request** through HTTP returned Animal Well details (200), with no secret in the response. Local HTTP also confirmed a nested game route returns the SPA (200) and a malformed proxy ID returns 400 before any upstream request. Total live game API traffic for development verification: seven targeted requests. Automated tests use mocked HTTP, including cache-eviction loops; they do not call RAWG.

Tests cover normalization, parameters/filters/pagination, namespaces and verified aliases, cache TTL/bounds/dedup/cancellation, late search responses, malformed/oversized responses, status handling, old-record preservation, remote details and personal workflows, explicit screenshots, offline saved views and the existing feature suite. DOM tests run actual React handlers but do not constitute visual-browser testing.

## Limits and outstanding manual browser checklist

No real-browser visual/device check was performed. Production deployment/rate-limit enforcement and production environment scopes remain untested. The gateway is public and intentionally bounded; monitor RAWG/hosting quotas before deployment. Search windows cap at page 100 and the genre/platform controls expose a subset, not every provider facet. Display snapshots may be stale or evicted; unknown IDs preserve records but cannot invent titles/artwork. There is no service worker, offline app-shell installation, account synchronization, export/backup or atomic cross-tab transaction.

1. At 320, 390, 768 and desktop widths, check header/search, filters, cards, pagination, details, screenshot pages, personal forms, timelines and profile; inspect long text and horizontal overflow.
2. Search rapidly, clear/shorten queries, switch filters and use Back/Forward. Confirm no stale results, unwanted automatic pages or per-keystroke requests. Check keyboard/touch and focus/announcements.
3. Open an external game, inspect source/ratings/artwork and request screenshots. Test screenshot errors independently from details.
4. Add/rate/review/favorite the remote game, create a playthrough and spoiler entry, reload on the **same origin**, then edit/delete/cancel actions. Verify journal independence and profile statistics.
5. In a disposable profile, simulate offline/proxy errors and reload saved views. Check snapshot/ID fallback, editable reviews/library/journals, visible stale metadata and successful explicit retry. Never clear real user storage for testing.
6. Confirm legacy game links and the verified Elden Ring alias use the original library identity without a duplicate. Verify demo/live context is explicit.
7. In browser Network/source tools, verify requests use the same-origin function, carry no API key, and no secret exists in built JS. Check nested-route refreshes and attribution on all relevant pages.
