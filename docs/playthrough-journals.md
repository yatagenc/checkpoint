# Phase 4: playthrough journals

Persistence and responsive behavior are updated by [Phase 5A](phase-5a-audit.md).

## Product behavior

The existing game discovery, details, personal collection, reviews, ratings and favorites are preserved. Journals add independent journeys through a game, each with its own timeline.

- Start a playthrough from a game page or the Diary hub. Multiple journeys for the same game receive distinct UUIDs and automatic per-game numbers.
- Edit title, start/completion dates, In Progress/Completed/Paused/Abandoned status, optional platform, difficulty and notes. A completion date is optional; if supplied it cannot precede the start date.
- Create, read, edit and delete Chapter, Mission, Milestone or General Update entries. Optional labels can describe a place, event, mission, chapter or any personal marker; numbered chapters are not assumed.
- Record optional 0–100% progress, nonnegative decimal hours at that moment, and a provisional half-star rating from 0.5–5. Zero and missing values remain distinct. Clearing a provisional rating affects only that entry.
- Titles and journal content are required after trimming. Dates must be valid. Validation/save errors retain the open form and all entered fields.
- The vertical timeline orders by entry calendar date, then original creation timestamp, then stable ID for ties. Edits preserve original creation timestamps. Each entry has a full-reading dialog.
- Entry writes/deletions update the parent’s recent-activity timestamp. Parent deletion requires confirmation and removes only its own entries. Entry deletion is independently confirmed.

## Routes and integration

| Route/surface           | Experience                                                                                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/diary`                | Functional hub with ongoing, recently updated and completed highlights; all journeys; game-title search, status filter, activity/start-date sorting, clear/reset, empty states and creation |
| `/diary?game=:gameId`   | Game-scoped diary reached from a library journal indicator; Show all games removes that scope                                                                                               |
| `/diary/:playthroughId` | Playthrough facts, edit/delete, entry creation and chronological timeline; unknown/deleted IDs have recovery navigation                                                                     |
| `/games/:id`            | Journal section with all journeys, the most recently active In Progress journey, creation and quick progress entry                                                                          |
| `/profile`              | Real total/completed/active playthrough counts, entry count, recent journal activity and timeline links; previous statistics remain                                                         |
| `/library`              | Journal count/link for games with journeys; library removal explicitly keeps journals                                                                                                       |

Multiple playthroughs may be In Progress simultaneously. The game page highlights the most recently updated one rather than introducing a separate hidden active-selection state.

## Data and persistence

`src/types/index.ts` adds `Playthrough`, `PlaythroughStatus` and `JournalEntryType`, and implements the earlier placeholder `PlaythroughEntry` contract. `JournalData` in `src/lib/journals.ts` contains normalized `playthroughs` and `entries` arrays. Parents reference `gameId`; entries reference only `playthroughId`. No game metadata is copied into these records.

The existing `PersonalProvider`/`usePersonalData` Context now exposes journals and validated journal dispatch alongside personal data. It reuses the same typed LocalStorage utility and version envelope.

- **Journal key:** `checkpoint:v1:journals`, containing `{version: 1, data: {playthroughs, entries}}`.
- **Existing key:** `checkpoint:v1:personal-data` remains unchanged. Journal actions never write it. Personal actions never write the journal key. No migration of library/review data is needed.
- Initialization is read-only, including when records are missing/corrupt. There is no seeded journal data or automatic write of empty defaults.
- Runtime validation rejects malformed entities, invalid dates/values, duplicate entity IDs/numbers and orphan entries. Corrupt/incompatible journal storage falls back safely with a visible warning; the original record remains untouched and journal saves are blocked until recovery and reload.
- A journal action validates the next complete snapshot, writes it, then updates Context. Quota/blocked-storage failures do not apply unpersisted state or announce success; forms remain editable.
- IDs and original creation times survive edits/reloads. Entries cannot be moved to a different playthrough by supplying another parent to an edit. Confirmed parent deletion removes the parent and children atomically in one snapshot.

Library status, completion date, personal/review rating and logged hours remain independent. Journaling does not add a library entry or automatically complete one. Entry hours are reported snapshots, not increments or a sum used to replace library hours. Deleting a library entry keeps its journeys, which remain accessible in the diary.

## Spoiler and visibility behavior

For a spoiler-marked entry, **title, chapter/mission label and written content are not rendered into the DOM before explicit reveal**. No hidden previews, tooltip text or accessible labels contain that writing. Diary and game summary cards never preview entry writing. Profile activity uses the same protected entry component.

Each entry has an independent reveal/hide state. A persistent native button exposes `aria-expanded`/`aria-controls` and retains its identity across toggles. Hidden entries must be revealed before editing or opening the full reader. Concealment resets after remount/reload or a saved edit. Date/type/progress/hours/provisional rating/visibility metadata remain visible.

Public, Friends Only and Private are **local preferences only**, not access controls. Nothing is published, sent to other users or protected by encryption. The entry form and timeline explain this. Parent playthrough title/notes do not have a spoiler flag; the creation form explains that sensitive writing belongs in a flagged entry.

## Implementation files

- `src/lib/journals.ts` and `journals.test.ts`: validated transitions, parsing, chronology and actual statistics.
- `src/components/journals/PlaythroughEditor.tsx`, `PlaythroughCard.tsx`, `JournalEntryEditor.tsx`, `JournalEntryCard.tsx`, `GameJournals.tsx`, `JournalProfile.tsx`.
- `src/pages/DiaryPage.tsx`, new `PlaythroughPage.tsx`, route registration in `src/App.tsx`.
- Existing types, Context, storage notices, game details, profile, library card, rating input, modal focus fallback, footer and styles are extended.
- `scripts/test-ui.mjs` retains Phase 1–3 scenarios and adds journal flows. No dependency was added.

## Validation

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

Domain tests cover independent replay IDs/numbers, parent/entry CRUD, preserved creation times, stable same-date ordering, optional/zero values, invalid inputs, unique IDs, cross-parent edit rejection, orphan rejection, scoped cascades and computed statistics.

React DOM tests exercise real forms and router handlers: creating two journeys for the same game, invalid progress/hours without draft loss, entry creation/editing, full reading, reveal/hide/reload concealment, profile counts, diary search/status/sort, quick entry from game details, library journal navigation, canceled/confirmed deletion, independent library persistence, corrupt journal initialization and quota failure. Provider remounts use retained LocalStorage to exercise the reload path.

The harness uses jsdom, not a rendered browser. Native dialog open/close is emulated; real layout, image decoding, browser focus containment and actual page reload still need manual checks. Prior local preview access was blocked by browser URL policy; no visual browser verification is claimed.

## Manual checklist

1. Run `npm run dev`. Check Diary, a timeline, game details, library and profile at desktop/tablet/mobile widths; look for overflowing titles, filters, cards or dialog fields.
2. Create two journeys for one game with different start dates/platforms/difficulties. Edit each status, complete one, reload and check independent records and numbering.
3. Add each entry type, backdate entries and add two on the same date. Verify chronological order remains stable after editing/reload.
4. Try blank title/content, progress below 0/above 100, negative/invalid hours and invalid dates. Confirm understandable errors and retained drafts. Test zero, decimal and missing values and clearing provisional ratings.
5. Mark an entry as a spoiler with distinctive title/label/body. Check timeline and profile before reveal, reveal using keyboard, read in full, hide again, then reload. Check that other entries remain independent.
6. Cancel entry/playthrough deletion, then confirm. Verify only the selected parent’s entries disappear. Delete a library entry and verify its journals remain accessible and other personal statistics behave as before.
7. Check Diary game-title search, status filtering, all sort modes and game scope from Library. Verify latest active links and quick-entry routing from game details.
8. Check profile counts and recent activity after updates. Confirm provisional ratings/hours and journal completion never alter library ratings/hours/status.
9. Exercise native dialogs with Tab, Shift+Tab, Enter and Escape. Verify reveal buttons keep focus, dialogs contain focus, and save/deletion returns focus to a sensible connected element.
10. In a disposable browser profile, simulate unavailable/full storage and a corrupt journal record. Verify no initialization write, no false success, retained editor text and intact library/review storage.

## Limitations and scope

Records belong to this browser and origin; clearing storage removes them. There is no account, cross-device synchronization, export/backup, multi-tab conflict merging, online sharing or enforceable privacy. Phase 5A detects sequential stale-tab writes and requires review/retry against fresh records. This comparison is not atomic; simultaneous writes can still race. Existing static catalog and remote artwork limitations remain. No external API, backend, Steam integration or social feature was added. Phase 5A adds local stabilization only. Changes remain local unless separately committed/pushed.
