# Checkpoint

A cinematic game discovery and personal tracking application. Phase 5A hardens persistence, validation, dialogs and responsive controls while preparing explicit external-game identities. See the [Phase 5A audit and remaining browser checklist](docs/phase-5a-audit.md). Existing discovery, library, ratings, reviews, favorites and playthrough journals retain the charcoal/mint identity and original homepage hero. See the [journal architecture](docs/playthrough-journals.md) and [personal collection architecture](docs/personal-data.md).

## Run locally

Use Node.js 22.20+ and npm:

```sh
npm ci
npm run dev
```

No environment variables or API key are required. Open Vite’s printed local URL.

```sh
npm run typecheck # Strict TypeScript validation
npm run lint      # ESLint / React checks
npm test          # Storage, discovery, service and React DOM integration tests
npm run build     # TypeScript validation and production bundle
npm run preview   # Serve the production bundle after building
```

React, TypeScript, Vite, Tailwind CSS via `@tailwindcss/vite`, React Router, and Lucide React remain the runtime stack. jsdom is a development-only dependency for DOM integration tests. There is no backend, authentication, or live game API.

## Discovery and routes

| Route                   | Behavior                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `/`                     | Original hero; featured editorial collection; PC critic picks; latest Steam-edition releases in the catalog; genre discovery               |
| `/explore`              | 36-game grid, case-insensitive title search, genre/platform/Steam release-year filters, sorting, live result count, reset and empty states |
| `/games/:id`            | Cover and background, description, developer/publisher, edition date, platforms, sourced scores, screenshots, tags and external links      |
| `/library`              | Persistent collection with status, playtime, notes, ratings, favorites, search, filters, sorting and confirmed deletion                    |
| `/profile`              | Actual personal statistics, rating distribution, favorites, recent games and review management                                             |
| `/diary`                | Playthrough hub with creation, game-title search, status filtering, activity/start-date sorting and highlights                             |
| `/diary/:playthroughId` | Individual playthrough facts, management, chronological entries and full-reading dialogs                                                   |
| `*`                     | Not-found recovery; unknown game IDs have a specific state                                                                                 |

Header search submits to Explore, including mobile navigation. Search, filters, and sorting are URL-based and support direct links and Back/Forward. Typing replaces the current search history entry; select changes create history entries. Examples:

```text
/explore?q=elden
/explore?genre=RPG&platform=ps5&year=2023
/explore?sort=rating
```

Sort choices: title A–Z/Z–A, Steam release newest/oldest, and highest available PC Metacritic score. Missing dates/scores always sort last. Critic picks are sourced critic scores, not invented community popularity. No live “popular” ranking or recent-release feed is implied.

The source repository is [yatagenc/checkpoint](https://github.com/yatagenc/checkpoint). No deployment or hosting service is configured. A future static host must rewrite application routes to `index.html` for direct links and refreshes.

## Architecture

```text
scripts/
  refresh-catalog.mjs     Build-time metadata/artwork research utility
  test-ui.mjs             React DOM navigation and interaction tests
src/
  assets/                 Original homepage landscape
  components/
    layout/               App shell, header, mobile navigation, search, footer
    ui/                   Headings, empty states and safe external links
    games/                Cards, images/fallbacks, collections and detail view
    personal/             Library/review editors, ratings, cards and local feedback
  context/                Validated personal data and persistence provider
  pages/                  Existing route screens
  hooks/                  Service loading/retry/cancellation and route accessibility
  services/               GameService contract, mock implementation, source selection
  types/                  Game, library, review and future journal contracts
  lib/                    Discovery, personal transitions/statistics, safe storage and tests
  data/                   Verified static catalog, platform sources, editorial IDs
  styles/                 Original Tailwind tokens plus responsive discovery styling
docs/rawg-integration.md  Future adapter plan and field mapping
```

`GameService` separates transport from UI. `useGames` and `useGame` handle asynchronous results, loading, retries and cancellation. The source is selected in `src/services/gameService.ts`. There are no live network requests for metadata at runtime. The [RAWG integration plan](docs/rawg-integration.md) documents the adapter boundary, normalization, pagination considerations and credential handling. No dummy API integration or key is included.

## Catalog and sources

The local demo includes **36 recognizable games**, spanning Steam releases from 2004 through 2025 and action, RPG, adventure, strategy, simulation, casual and indie categories.

- `src/data/catalog.json` is a snapshot researched from each game’s **official Steam store listing**, via the public store app-details response. Each record links to its exact source and verification date (October 16, 2026).
- Developer, publisher, genres, release date, desktop platforms and available PC Metacritic scores come from that response. **Dates refer to the Steam edition**, not necessarily the original release. Edition names are retained; for example The Last of Us Part I and Resident Evil 4 refer to their listed PC editions.
- Windows, macOS and Linux support is verified from the storefront. Selected console releases for Elden Ring, Baldur’s Gate 3 and Celeste are additionally verified from [Bandai Namco](https://www.bandainamcoent.com/games/elden-ring), [Larian](https://baldursgate3.game/) and [Celeste’s official site](https://www.celestegame.com/). These sources are recorded in `src/data/platform-sources.json` and linked on detail pages. **Platform coverage is intentionally non-exhaustive**; absence is not a claim that a console edition does not exist.
- Real cover art, backgrounds and **108 screenshots** use publisher promotional assets hosted on Steam’s CDN. Every selected URL returned a successful image content-type response during research. Images are linked, not bundled into the repository; rights remain with the relevant owners. Source attribution appears on detail pages. These are not claimed to be openly licensed assets.
- Descriptions and descriptive tags are original Checkpoint editorial copy. Featured selections are editorial. The hero remains the original illustration.
- **Community ratings and estimated playtimes are unavailable (`null`)**, not fabricated. Games without a sourced critic score display no score badge. No prices, performance specifications, user reviews, or invented statistics are included.

`npm run refresh:catalog` explicitly refetches metadata and verifies media URLs; this requires internet access. It is a research/development command, not part of startup or build. Failed/unavailable artwork falls back to original abstract covers or a readable image placeholder. Remote screenshots and covers can still become unavailable later. Metadata can become outdated; this catalog is visibly labeled as a demo snapshot throughout the UI.

## Data contracts and persistence

`Game` now includes nullable cover/background, description, release date, developer/publisher, platforms, genres, tags, screenshots, source-aware Metacritic/community metrics, estimated hours and external links. The compile-time model is in `src/types/index.ts`; remote adapters must additionally validate their inputs at runtime.

`LibraryEntry` and `Review` power personal tracking. Statuses are `backlog`, `playing`, `completed`, `on-hold`, `dropped`; personal ratings allow half-stars from 0.5 to 5. Game details include working library/status/rating/review/favorite actions and playthrough journals. Reviews have optional titles/ratings, required trimmed text, spoiler concealment and timestamps. Visibility (`public`, `friends-only`, `private`) is a local preference, not access control. Confirmed library deletion removes its associated personal details/review but keeps independent journals; review-only deletion preserves the library/rating. Account profile editing remains future work.

The browser-safe utility validates typed reads, uses versioned envelopes and handles parsing/blocked access/quota failures. `PersonalProvider` shares personal data and journals across routes. Initialization only reads; no seeded records or empty-state writes occur. Actions persist successfully before updating Context. Game metadata is not copied into user records. Personal data uses `checkpoint:v1:personal-data`; journals use the independent `checkpoint:v1:journals` key so journal actions never overwrite library/review data. [Journal documentation](docs/playthrough-journals.md) describes models, validation, chronology, cascade deletion and independent provisional ratings/playtime.

## Accessibility, performance and validation

Cards use native links; search forms and native select controls have accessible labels. Navigation supports keyboard focus, a skip link and mobile menu state. Route changes update focus and page titles. Result counts announce changes. Reduced-motion preferences are respected; external links disclose that they open another tab. Image aspect ratios reserve space, covers/screenshots load lazily, and broken images reveal fallbacks. No external fonts are requested.

Responsive CSS uses four desktop columns, three tablet columns and two mobile columns for game cards; filters become two columns, detail pages stack, and screenshots become a single column on mobile. The existing hero and design tokens are retained.

Automated validation includes pure discovery and service checks plus React DOM tests for navigation, URL search/deep links, combined filters, sorting, history restoration, clear/empty states, all 36 detail renders, missing metadata, broken-image events, mobile menu interactions and service retry. DOM tests use jsdom; they **do not verify browser layout, pixel rendering, actual image decoding, or physical-device behavior**. Visual desktop/tablet/mobile review remains necessary because the available browser preview was blocked by its URL security policy.

## Next steps

Complete the [Phase 5A browser checklist and review remaining limitations](docs/phase-5a-audit.md) before external API work. Unreadable records block saves to the affected dataset; revision checks reject detected stale-tab writes for review/retry. LocalStorage has no atomic cross-tab transaction. Provider mappings and mixed-catalog hydration helpers are prepared; only the 36-game local adapter is configured. RAWG integration, deployment and Phases 5B/5C have not been started.
