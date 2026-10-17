# Checkpoint

A cinematic game discovery and personal tracking application built with React, TypeScript, Vite, Tailwind CSS, React Router and Lucide. Phase 5B adds on-demand RAWG discovery through a server-side Netlify Function. The original hero, charcoal/mint design, library, ratings, reviews, favorites and playthrough journals are preserved.

Phase 5B.1 replaces homepage genre counts with RAWG metadata and preserves platform-specific Metacritic scores. See the [data consistency report](docs/phase-5b1-consistency.md).

## Local development

Use Node.js 22.20+ and npm:

```sh
npm ci
npm run dev
```

Open the URL printed by the launcher, normally `http://localhost:8888`. The command loads `.env.local` into the server process and starts Netlify CLI 27.13.0 with Vite. `npm run dev:netlify` is an equivalent alias. On first use, npm downloads the CLI into the ignored project cache. Local offline CLI mode avoids linking or creating a Netlify site; RAWG requests still use the network.

Copy `.env.example` to `.env.local` and supply `RAWG_API_KEY` there. Never prefix the secret with `VITE_`, commit it, put it in client URLs, or share it in logs. Only the function reads the key and sends it to the official RAWG API. Missing configuration produces a useful setup error; the curated demo requires no key.

To choose an alternative public port:

```sh
npm run dev -- --port 8889
# Optional explicit Vite target:
npm run dev -- --port 8889 --target-port 5174
```

The launcher checks IPv4/IPv6 binding, reuses an already-running Checkpoint server, and never kills unrelated listeners. If the default 8888 is unavailable for another reason, it selects a free port in 8889–8898 and prints the new URL. Explicit unavailable ports fail with a useful message. Vite gets a separate free port in 5173–5182 and uses strict port binding so Netlify's target cannot silently drift. `CHECKPOINT_PORT` and `CHECKPOINT_VITE_PORT` optionally set these ports in the environment; command-line flags take precedence. Stop with Ctrl+C; the launcher forwards shutdown to its own child processes. Reused servers must be restarted to pick up environment changes.

`npm run dev:vite` starts **Vite only**, usually on port 5173. It does not provide Netlify Functions. Use `/explore?source=demo` for curated discovery in that mode. `npm run preview` also serves only the frontend. Bare `netlify dev` uses the fixed defaults in `netlify.toml`; use the npm wrapper for port detection and explicit `.env.local` loading.

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

There is no authentication or database. User content remains in this browser and origin. Changing between ports/origins does not transfer existing LocalStorage records; use the original origin to access them. No records are migrated or reset.

## Discovery and routes

| Route                   | Behavior                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| `/`                     | Original hero and clearly labeled curated editorial collections; no initial remote catalog download          |
| `/explore`              | RAWG title search, server-side genre/platform/year filters, sorting and explicit Previous/Next page controls |
| `/explore?source=demo`  | Original 36-game offline/demo discovery, with its own local filters and sorting                              |
| `/games/:id`            | Curated or on-demand RAWG details; personal actions and optional screenshot loading                          |
| `/library`              | Persistent library/status/notes/hours/ratings/favorites and confirmed deletion                               |
| `/profile`              | Personal statistics, favorites and review management                                                         |
| `/diary`                | Independent playthroughs, search/filter/sort and creation                                                    |
| `/diary/:playthroughId` | Journal entry CRUD, chronological reading and spoiler concealment                                            |
| `*`                     | Recovery for missing routes/games                                                                            |

Examples:

```text
/explore?q=Animal%20Well
/explore?genre=action&platform=4&year=2024&sort=rating&page=2
/games/rawg:783856
/games/elden-ring
```

Header search submits to RAWG Explore. Explore waits 400ms after changes; a one-character query makes no request. Empty search explicitly browses one popular listing page. Requests contain at most 20 games, with pages limited to 1–100; nothing follows pagination automatically. Filters and ordering are sent to RAWG, not applied to the current response page as global filters. Homepage genres and Explore genre options come from one bounded RAWG genre metadata request; counts use API-provided games_count, with loading/error/unavailable states and a 10-minute memory cache. Numeric API genre IDs and legacy supported slugs are forwarded to RAWG. Platform controls expose a supported subset, years from 1970 through the current year +2, relevance/popularity, title, release-date and Metacritic ordering. URL state supports history and deep links.

RAWG details include available description, developers/publishers, release date, platforms, genres, tags, sourced Metacritic/RAWG ratings and official HTTPS links. Description text is escaped by React; raw HTML is never injected. RAWG backgrounds are cropped for cards rather than misrepresented as verified portrait covers. RAWG average playtime is not a completion-time estimate and is left unavailable. Screenshots load only after an explicit request, six per page. Missing images and optional fields have fallbacks. Metacritic scores retain their provider-supplied platform labels; an unspecified score stays unspecified, and missing scores show unavailable. Details show the supplied platform-specific values without hardcoded game corrections.

## Identity, metadata and persistence

Canonical curated IDs and the version-1 personal/journal keys are unchanged. New remote games use `rawg:<numeric-id>`. One explicit mapping, RAWG `326243` to `elden-ring`, was verified through a targeted detail response. The legacy route retains curated metadata; RAWG search cards and provider-alias routes retain live metadata while personal actions use the existing canonical ID. Identity mapping never substitutes static critic scores into RAWG results. No other games are merged by title similarity. Other unmapped editions retain separate identities and source labels. Future mappings require verification and a preservation plan for already-saved external IDs.

Personal records reference IDs, never full API responses. A separate best-effort `checkpoint:v1:game-display` record stores at most 200 small remote display snapshots: ID, title, cover URL, release date, source URL and saved date. No descriptions, ratings, screenshots, reviews or journals are copied into it. Snapshot failure never blocks a personal save. If metadata is unavailable, saved content stays editable with a snapshot or stable-ID fallback. These snapshots are display conveniences, not backups.

Memory caches hold at most 64 recent API responses (2-minute search, 10-minute detail/screenshot TTL), deduplicate simultaneous requests and cancel upstream browser requests after the last subscriber leaves. A separate 100-item display working set supports recently viewed games. Saved views use local/display metadata first and hydrate at most four missing remote records per view, never the complete game database. Open a game's detail route to resolve additional missing metadata.

The Phase 5A corruption protection, optimistic revision comparison and draft-preserving error feedback remain. Unreadable personal/journal records block writes to the affected dataset. LocalStorage cannot provide atomic multi-tab transactions, automatic backups or cross-device synchronization. See [personal-data architecture](docs/personal-data.md), [journals](docs/playthrough-journals.md) and [Phase 5A report](docs/phase-5a-audit.md).

## Server proxy and deployment configuration

`netlify/functions/rawg.ts` handles `GET /.netlify/functions/rawg`; `server/rawg-proxy.ts` validates requests and normalizes responses. The gateway supports game lists, details, screenshots and bounded genre metadata. It rejects arbitrary URLs/paths, unknown or repeated parameters, malformed IDs, unbounded pages and excessive page sizes. It uses a fixed official origin, refuses redirects, times out after 8 seconds, limits response size and returns sanitized errors. Upstream next URLs and credential-bearing error bodies never reach the browser. Function configuration includes an IP-based 60-request/minute limit; monitor provider/hosting quotas before production use.

`netlify.toml` declares `npm run build`, output `dist`, the Functions directory and an SPA fallback. For a future deployment:

1. Connect this repository to a Netlify project when deployment is authorized.
2. Set `RAWG_API_KEY` in Netlify environment variables with **Functions** scope for the intended deploy context. Never add it to `netlify.toml` or build-time `VITE_*` configuration.
3. Build/deploy through Netlify so Functions are packaged with the frontend; uploading `dist` alone does not deploy the proxy.
4. Verify the function, nested-route refreshes, attribution, environment scopes and applicable quotas.

**No deployment has been performed.** Full API design, endpoints, test evidence and limitations are in [Phase 5B report](docs/phase-5b-rawg.md) and [integration reference](docs/rawg-integration.md).

## Data and attribution

RAWG-powered pages include active [RAWG](https://rawg.io) links in the footer and source context. RAWG metadata/artwork and third-party images belong to their respective owners. Review the [official API documentation and applicable terms](https://rawg.io/apidocs) for your intended usage/plan; this project does not redistribute a database.

The 36-game demo remains a Steam metadata snapshot researched October 16, 2026, with 108 linked Steam promotional screenshots. Steam-edition dates/scores are labeled; selected console platform information has individual official sources recorded in `src/data/platform-sources.json`. Descriptions/tags for curated games are editorial copy. Sources and dates appear on detail pages. Artwork can become unavailable and metadata can become outdated. `npm run refresh:catalog` is a separate opt-in research script for that small curated catalog; startup/build never execute it.

## Validation and limits

Automated tests cover domain/storage integrity, normalization, proxy validation/errors, cache/abort behavior, old/new IDs, real React handlers for search/pagination/details and remote personal workflows. Mocked HTTP is used for repeatable tests. A handful of live RAWG requests verified two searches, details, screenshots, pagination and an invalid ID; no bulk download/crawl was performed.

React DOM tests use jsdom and do not verify pixel layout, native dialog focus trapping, actual image decoding or physical-device behavior. The [manual browser checklist](docs/phase-5b-rawg.md) remains necessary. API access requires network and configured server credentials. Catalog matching is intentionally conservative; local snapshots do not provide a complete remote catalog, service worker, account sync or offline application shell. Phase 5C has not started.
