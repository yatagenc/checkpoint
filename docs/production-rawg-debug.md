# Production RAWG integration audit — October 17, 2026

## Confirmed cause

The deployed release is older than the RAWG implementation. This is a deployment mismatch, not evidence of a missing API key:

- Production `/` returns HTTP 200, referencing `/assets/index--1r0n4C5.js`. That bundle contains the old local-demo label and lacks the RAWG proxy client, live Explore label and dynamic genre implementation.
- `/.netlify/functions/rawg?id=invalid` returns HTTP 404 HTML. The current function must return HTTP 400 JSON for that request, before using any API key or making an upstream request.
- `/explore?q=Animal%20Well` returns HTTP 404 on direct navigation. The current repository's SPA rewrite is absent from the active release too.
- GitHub `main` was still `0aaf494` (Phase 5A). The RAWG integration exists in local commit `56e3817` and had not been pushed.

The public responses establish a stale/incomplete release. They do not establish whether it came from an older Git deployment or a static upload. Private Netlify deploy logs, environment scopes and runtime credentials cannot be inspected from this unlinked checkout. No secret values were read or printed for these checks.

## Source audit and fixes

The existing `netlify.toml` already declares the correct build command, `dist` publish directory, `netlify/functions` function directory, esbuild bundler and SPA fallback. No speculative routing changes were needed. The frontend uses the same-origin reserved Netlify function path. The gateway reads `process.env.RAWG_API_KEY` only on the server, restricts RAWG endpoints and inputs, bounds requests, and returns safe JSON errors. Vite does not inject this secret.

A confirmed error-handling defect was fixed: an HTML 404 from a missing function was being treated like a genuine game-not-found response. Non-JSON proxy responses now produce an explicit deployment/setup error with status 502. A real JSON game 404 still produces a game-not-found state. Search failures remain visible and do not silently substitute the 36-game catalog.

Files changed:

- `src/services/rawgClient.ts`: distinguish missing/broken proxies from missing games.
- `src/lib/rawg.test.ts`: regressions for HTML 200/404 responses and explicit search errors.
- `scripts/test-ui.mjs`: remote detail/search failure, explicit demo navigation and unchanged personal storage.
- `scripts/verify-deployment.mjs`: bounded, read-only deployed-function/frontend/SPA checks; optional targeted live checks.
- `scripts/production-routing.test.mjs`: mocked stale releases, valid routing/pagination and intercepted function routes.
- `package.json`: deployment verifier command and regression-test registration.
- `README.md` and this report: production verification and redeployment instructions.

Current homepage labels already distinguish curated editorial collections from RAWG discovery. The deployed “Local demo catalog” label belongs to the old build. No homepage redesign or personal-record migration is needed. Curated IDs, external `rawg:<id>` identities and all existing storage schemas remain unchanged.

## Checks actually executed

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm test`: passed; 42 domain tests, 28 React scenarios, four local-port tests and three production-verifier tests.
- `npm run build`: passed.
- Netlify CLI 27.13.0 `netlify build --offline --context production`: passed, including packaging `netlify/functions/rawg.ts`. This is a local build, not a deployment.
- `git diff --check`: passed.
- `npm run verify:deployment -- https://checkpointv1.netlify.app`: correctly failed all three release checks: function routing (404 HTML), live frontend (old bundle) and nested SPA route (404).

Production checks made no upstream RAWG requests. Automated mocked tests cover live pagination, remote details, remote library/review/journal workflows, existing records and explicit fallback behavior. No actual browser visual checks or production personal-data edits were performed. Successful live production search cannot be claimed until a full release is deployed and verified.

## Exact redeployment steps

1. Commit the diagnostic changes, then push local `main` to `origin/main`. A push must include the existing RAWG commit `56e3817`; rebuilding the old GitHub revision cannot fix this release.
2. Open the **existing** `checkpointv1` Netlify project. Confirm its linked repository is `yatagenc/checkpoint`, production branch is `main`, and base directory is the repository root. Build with `npm run build`, publish `dist`, and package `netlify/functions` using the checked-in `netlify.toml`.
3. Check the existing `RAWG_API_KEY` variable has Functions scope (or all scopes) and is available to the Production deploy context. Do not copy its value into logs, source, Vite variables or this report. Its absence was not diagnosed; this is a runtime-scope check.
4. Trigger a full production deployment of the updated revision. If a Git push triggers one automatically, inspect that deployment instead of starting another. Do not deploy only the `dist` folder: the release needs the function and routing configuration too. Environment-scope changes also require a new deployment.
5. In that deploy's log, verify function packaging includes `rawg.ts`; in the deployed Functions list, verify `rawg` exists. Select its invocation logs when investigating failures. Record only safe status codes/request identifiers; do not paste key-bearing upstream URLs.
6. Run:

   ```sh
   npm run verify:deployment -- https://checkpointv1.netlify.app
   npm run verify:deployment -- https://checkpointv1.netlify.app --live
   ```

   Run the second command after the first passes. The live option makes at most three targeted requests: a one-result search, one detail request and a second search page when available. It stops on failure. No key is sent by the verifier; the deployed function uses its runtime environment.

The first command should report all three checks passing. If invalid-ID routing still returns HTML/404, inspect deployed function packaging and deploy revision before troubleshooting credentials. JSON setup/credential/rate-limit errors from valid searches indicate a different runtime issue; inspect the safe function response and Netlify logs.

Official references: [Netlify Functions](https://docs.netlify.com/build/functions/overview/) and [function environment variables](https://docs.netlify.com/build/functions/environment-variables/).

## Manual browser checklist after deployment

- Open `/explore?q=Animal%20Well` directly and refresh; confirm live source labeling and a game outside the curated collection.
- Navigate to the next results page and back; confirm URL state, loading and result changes.
- Open a remote game detail page and refresh it; check missing metadata/artwork fallbacks and optional screenshots.
- On that browser origin, add a remote game, rate/review it and create a playthrough/journal entry; reload and verify persistence. Confirm old curated records remain accessible. Use temporary records and delete them through the normal confirmed actions if desired.
- Test API failure/offline behavior: show a clear error; the demo collection appears only after explicit selection. Existing library/reviews/journals must remain accessible.
- Check homepage live genre counts and genre links, curated editorial labels, keyboard navigation and mobile layout.

LocalStorage is scoped to browser origin: localhost records do not automatically appear on the production hostname. This behavior is independent of RAWG and must not be mistaken for a migration failure.
