# Checkpoint

A cinematic game tracking and journaling app. Phase 1 establishes a local React application, navigation, design system, and future data contracts.

## Run locally

Use Node.js 22.20+ (or a newer supported LTS) and npm.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. No environment variables are needed. `.env.example` documents future configuration; never put secrets in `VITE_*` variables because Vite exposes them to the browser.

```sh
npm run build   # Strict TypeScript checks and production bundle
npm run lint    # TypeScript / React lint checks
npm test        # Storage behavior and failure cases
npm run preview # Serve the production bundle locally after building
```

## Stack

React, TypeScript, Vite, Tailwind CSS with `@tailwindcss/vite`, React Router in declarative mode, and Lucide React. npm's lockfile records installed versions. No backend, UI framework, state management package, authentication, or game API integration.

## Routes

| Path         | Purpose                                                 |
| ------------ | ------------------------------------------------------- |
| `/`          | Editorial home with featured sample games               |
| `/explore`   | Small static sample catalog                             |
| `/library`   | Empty library with planned statuses                     |
| `/diary`     | Playthrough journal placeholder                         |
| `/profile`   | Local placeholder profile                               |
| `/games/:id` | Sample game details; unknown IDs have a recovery screen |
| `*`          | Not-found page                                          |

Navigation uses client-side routing. A future production static host must rewrite application URLs to `index.html` so direct links and refreshes work. The source repository is [yatagenc/checkpoint](https://github.com/yatagenc/checkpoint). No hosting service has been initialized.

## Source structure

```text
public/                  App favicon
src/
  assets/                Original illustrative landscape
  components/
    layout/              Header, footer, routed application shell
    ui/                  Page introductions, section headings, empty states
    games/               Reusable game cards and placeholder artwork
  pages/                 Route-level screens
  hooks/                 Navigation focus, page titles, and scroll behavior
  types/                 Future application data contracts
  lib/                   Browser-safe storage utility and focused tests
  data/                  Explicitly identified static sample catalog
  styles/                Tailwind theme tokens and responsive component styling
  App.tsx                Route configuration
  main.tsx               React and router entry point
```

Add `services/` when a real API boundary is introduced. It is intentionally absent while the app uses only static sample data. Place future data hooks under `hooks/` and keep API-specific transformations outside page components.

## Design system

`src/styles/index.css` defines Tailwind `@theme` tokens for canvas, surface, raised surface, text, muted text, accent, borders, and typography. Shared button styles, cards, headings, and empty states establish a charcoal/teal editorial identity. Original SVG and CSS artwork are clearly marked placeholders, not official cover art. No external image or font requests are made.

The shell includes mobile navigation, active links, keyboard focus styles, a skip link, route focus/title updates, and reduced-motion support. Search is a disabled visual placeholder and is labeled as coming soon.

## Data contracts

`src/types/index.ts` defines Game, GamePlatform, LibraryEntry, Review, PlaythroughEntry, and UserProfile. Relationships use stable string IDs; dates use ISO 8601 strings. Ratings are a union of half-star values from 0.5 through 5; absent ratings are unrated. Library statuses use `backlog`, `playing`, `completed`, `on-hold`, and `dropped`. Visibility uses `public`, `friends-only`, and `private`. Reviews and progress notes support spoiler flags. Progress entries include a playthrough ID, chapter label, occurrence timestamp, and notes.

TypeScript types are compile-time contracts, so future API and form boundaries also need runtime validation. Visibility and spoiler fields are planned data contracts; no access enforcement or social features exist in Phase 1.

## Local storage

`src/lib/storage.ts` defers browser access until called and catches JSON, blocked-storage, quota, and serialization errors. Keys are scoped to `checkpoint:v1:` and values include a version envelope. Reads require a runtime type guard and a fallback, so invalid shapes or incompatible versions do not enter typed application state. Writes/removals report success as a boolean. Only the requested namespaced key is removed; unrelated application data is untouched.

```ts
import { storage } from "./src/lib/storage";

const isString = (value: unknown): value is string => typeof value === "string";
storage.write("draft", "A new chapter");
const draft = storage.read("draft", "", isString);
storage.remove("draft");
```

There are no saved user records or fake signed-in accounts in this phase. When persistence is introduced, add entity validators at its boundary. Introduce a new namespace and explicit migration when data contracts change. LocalStorage is device-local and is not suitable for credentials or enforcing private data access.

## Phase boundaries

Implemented: architecture, responsive shell, all requested routes, static sample game details, reusable UI/tokens, future types, safe storage utility, and environment template.

Later: game API, search and filters, library editing, ratings and reviews, chapter journals, spoiler reveals, social discovery, and profile editing. Backend-backed privacy and accounts will require their own architecture decision. No deployment is part of this phase.
