# Phase 3: personal collection and reviews

This records the Phase 3 implementation, with persistence corrections from [Phase 5A](phase-5a-audit.md). Phase 4 adds independent journals; see [playthrough-journals.md](playthrough-journals.md). Library deletion continues to remove personal details/reviews while keeping those journals.

## Implemented behavior

- Add any catalog game from its detail page. Duplicate additions are idempotent.
- Change Backlog, Playing, Completed, On Hold or Dropped from the library or details. Rating/reviewing an unsaved game adds it to Backlog; rating never marks it completed.
- Edit optional completion date, decimal playtime, personal notes and half-star rating. Empty hours and zero are distinct. Negative/nonfinite/nonnumeric hours are rejected.
- Set, update and clear ratings from 0.5–5 through ten keyboard-accessible native radio inputs rendered as five half-selectable stars. Personal scores remain separate from external critic scores.
- Create/read/edit/delete one review per game, with optional title/rating, trimmed required body, spoiler flag, local visibility preference, stable ID and creation/update timestamps.
- Conceal both the title and body of spoiler reviews until explicit reveal. Concealment resets on remount/edit. React renders notes/reviews as escaped text.
- Select up to four favorites, preserving selection order. Removing a favorite or library entry frees its slot.
- Search/filter/sort the library by title, status, date added and personal rating.
- Derive profile counts, hours, average, rating distribution, ordered favorites, recently added games and reviews from actual user records.

## Models and source of truth

The existing `LibraryEntry` and `Review` types are extended. Library entries add optional `playtimeHours`, `notes`, and `favoriteOrder`. An absent rank means not favorited, avoiding a second favorites array. Completion dates use `YYYY-MM-DD`; creation/update dates are ISO timestamps. Review rating is optional and an optional title is added.

Review and library ratings are synchronized by every transition. Statistics use the library rating so reviewed games are counted once. External catalog scores remain unrelated. `PersonalData` stores only library entries and reviews connected by stable `gameId`; it never duplicates titles, images or game metadata. `local-player` is a local dataset identifier, not an authenticated user.

Unknown stored game IDs are retained, with unavailable-game text if the catalog no longer contains them. `PlaythroughEntry` remains a future contract; chapter journals are not implemented.

## Storage and React state

The single key is **`checkpoint:v1:personal-data`**, using the existing `{version: 1, data: ...}` envelope. Other LocalStorage keys are untouched.

`storage.ts` retains typed read/write/remove and adds `readResult` to distinguish ready, missing, invalid and unavailable storage. `personal.ts` validates statuses, visibility, half-stars, dates, finite nonnegative hours, unique IDs, favorite limits and agreement between review/library ratings.

`PersonalProvider` lazily reads on initialization. **There is no initial write, seeded user data, or effect that saves empty defaults.** Corrupt/incompatible data is left untouched and saves to that dataset are blocked until recovery and reload.

Each action computes and validates a new snapshot, persists it, and only then updates Context. A ref ensures batched actions use the latest committed state. Failed writes return errors and leave the UI/data unchanged. `usePersonalData` shares immediate updates across routes and components. A provider remount/reload reads the saved snapshot.

No personal fields are sent to external services. Existing remote artwork requests contain only the existing image URLs. No backend or account is introduced.

## Deletion and visibility

Native labeled modal dialogs confirm destructive actions. Keep it is focused initially; Escape cancels. Native browser dialogs provide modal focus containment, and cleanup restores focus to a connected trigger. Browser alert/confirm are not used.

**Library deletion also removes that game’s rating, notes, playtime, favorite selection and saved review.** Confirmation lists those effects. Deleting only a review keeps the library and rating. Cancel changes nothing; failed persistence keeps the dialog open with an error. Successful deletions announce their effects.

Public, Friends Only and Private are **local preferences only**. They neither publish records nor enforce access control. Review forms and reading sections explain this. No social sharing or privacy enforcement is implied.

## Files created or modified

| Area          | Files                                                                                                                                                                   |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| State         | `src/context/PersonalProvider.tsx`, `personal-context.ts`, `src/hooks/usePersonalData.ts`, `src/main.tsx`                                                               |
| Models/domain | `src/types/index.ts`, `src/lib/personal.ts`, `src/lib/storage.ts`                                                                                                       |
| Personal UI   | `src/components/personal/RatingInput.tsx`, `LibraryEditor.tsx`, `LibraryCard.tsx`, `ReviewEditor.tsx`, `ReviewCard.tsx`, `GamePersonalActions.tsx`, `StorageNotice.tsx` |
| Dialogs       | `src/components/ui/Modal.tsx`, `ConfirmDialog.tsx`                                                                                                                      |
| Integration   | Library/Profile pages, GameDetails, application layout/footer, shared styles                                                                                            |
| Tests/docs    | `src/lib/personal.test.ts`, `scripts/test-ui.mjs`, README, this document                                                                                                |

Existing Phase 2 changes are preserved in the working tree. No commit or push is performed as part of Phase 3.

## Validation

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

Domain tests cover CRUD, uniqueness, timestamps, rating synchronization/clearing, favorite order/limits/removal, statistics, malformed data, and missing/zero/decimal hours. React DOM tests exercise real handlers, routing, provider initialization/remounts, persisted edits, invalid hours, spoiler reveal/editing, visibility, deletion cancel/confirm, favorite limits, profile totals, corrupt initialization and quota failure. Existing discovery, sorting, filtering and all 36 details remain covered.

These tests use jsdom. The harness emulates only dialog open/close; it does not verify native focus containment, pixel layout, actual images, physical devices or a real browser reload. Provider remounts against retained storage exercise the persistence path. Visual browser checks were not run; the local browser preview was previously blocked by URL security policy.

## Manual browser checklist

1. Run `npm run dev`. Check Explore, details, library, profile, navigation and dialogs at desktop/tablet/mobile widths for overflow or overlap.
2. Add a game, change every status, edit notes/completion date/decimal hours. Try negative, invalid, zero and blank hours. Reload and verify values.
3. Tab into ratings and use arrow keys to select half-stars. Change/clear ratings and verify profile averages/distribution.
4. Submit a whitespace-only review, then save a real review with spoilers and a visibility preference. Check title/body concealment, explicit reveal and concealment after reload.
5. Edit a review/rating and verify library/profile agreement. Cancel review deletion once, then confirm; the library/rating should remain.
6. Favorite four games and try a fifth. Remove one and retry; verify order after reload. Remove a favorited game with a review: cancel once, then confirm and verify all stated records/statistics change.
7. Check dialogs using Tab/Shift+Tab, Escape and keyboard submission. Verify focus restoration after closing and a sensible remaining focus after deletion.
8. In a disposable browser profile, block storage or simulate quota failure. Check errors, unchanged data and no false success. Verify startup never replaces existing valid/corrupt data.

## Limitations and scope

Records belong to this browser/origin; clearing its storage removes them. There is no backup/export, account, cross-device synchronization or multi-tab merge. Phase 5A refuses writes when it detects a newer raw revision and loads the latest readable snapshot for review/retry. The comparison is not atomic across tabs; use one active editing tab. Local preferences do not protect data from someone with access to this device/browser.

No authentication, social networking, Steam integration, new external API, or Phase 4 journals were added. Existing catalog and remote-artwork limitations remain.
