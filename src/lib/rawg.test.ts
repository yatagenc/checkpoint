import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeGame,
  normalizeScreenshots,
} from "../../server/rawg-normalize.ts";
import { createRawgHandler } from "../../server/rawg-proxy.ts";
import { rawgNumericId, validateRawgQuery } from "./rawg-contract.ts";
import { isGameMetadata } from "./catalog.ts";
import { createRawgClient } from "../services/rawgClient.ts";
import { createCheckpointService } from "../services/checkpointGameService.ts";
import { mockGameService } from "../services/mockGameService.ts";
import {
  emptyPersonalData,
  isPersonalData,
  updatePersonalData,
} from "./personal.ts";
import {
  emptyJournalData,
  updateJournalData,
  isJournalData,
} from "./journals.ts";

const dto = {
  id: 123,
  name: "A remote game",
  slug: "a-remote-game",
  released: "2024-05-09",
  background_image: "https://media.rawg.io/media/game.jpg",
  description_raw: "Plain text <script>never executed</script>",
  description: "<h1>Untrusted</h1>",
  developers: [{ name: "Developer" }],
  publishers: [{ name: "Publisher" }],
  genres: [{ name: "Adventure" }],
  tags: [{ name: "Exploration" }],
  platforms: [{ platform: { id: 4, name: "PC" } }],
  metacritic: 90,
  rating: 4.2,
  ratings_count: 20,
  playtime: 5,
  website: "https://example.com",
};
const game = normalizeGame(dto);
test("RAWG normalization validates metadata, distinguishes ratings and omits unsupported estimates/HTML", () => {
  assert.ok(isGameMetadata(game));
  assert.equal(game.id, "rawg:123");
  assert.equal(game.communityRating?.value, 4.2);
  assert.equal(game.estimatedPlaytimeHours, null);
  assert.ok(!game.description?.includes("<h1>"));
  assert.equal(normalizeGame({ id: 1, name: "Minimal" }).coverUrl, null);
  assert.equal(
    normalizeGame({
      ...dto,
      released: "2024-02-31",
      background_image: "javascript:alert(1)",
      rating: 7,
      website: "https://example.com?key=bad",
    }).releaseDate,
    null,
  );
  assert.equal(normalizeGame({ ...dto, rating: 7 }).communityRating, null);
  assert.throws(() => normalizeGame({ name: "No ID" }));
  assert.deepEqual(
    normalizeScreenshots({
      results: [
        { image: "javascript:bad" },
        { image: "https://media.rawg.io/a.jpg" },
      ],
    }),
    [{ url: "https://media.rawg.io/a.jpg", alt: "Game screenshot 2 via RAWG" }],
  );
});
test("RAWG parameters limit endpoints, pages, filters and namespace without arbitrary forwarding", () => {
  const query = validateRawgQuery(
    new URLSearchParams(
      "q=hello&genre=action&platform=4&year=2024&sort=rating&page=2&page_size=5",
    ),
  );
  assert.equal(query.endpoint, "/games");
  assert.equal(query.params.get("search"), "hello");
  assert.equal(query.params.get("dates"), "2024-01-01,2024-12-31");
  assert.equal(query.params.get("ordering"), "-metacritic");
  assert.equal(query.page, 2);
  for (const value of [
    "url=https://bad",
    "id=../x",
    "id=123",
    "id=rawg:01",
    "page=101",
    "page_size=21",
    "q=x",
    "q=a&q=b",
    "genre=unknown",
    "platform=999",
    "year=2000-01",
    "sort=random",
    "resource=secrets",
    "resource=screenshots",
    "id=rawg:123&q=hi",
    "id=rawg:123&page=1",
  ])
    assert.throws(() => validateRawgQuery(new URLSearchParams(value)), value);
  assert.equal(rawgNumericId("rawg:123"), "123");
  assert.equal(rawgNumericId("123"), null);
  assert.equal(
    validateRawgQuery(
      new URLSearchParams("id=rawg:123&resource=screenshots&page_size=6"),
    ).endpoint,
    "/games/123/screenshots",
  );
});
test("proxy uses only official RAWG, normalizes pagination and never forwards next links or credentials", async () => {
  let calls = 0;
  const handler = createRawgHandler({
    key: () => "unit-test-secret",
    fetcher: async (input, options) => {
      calls++;
      const url = new URL(String(input));
      assert.equal(url.origin, "https://api.rawg.io");
      assert.equal(url.searchParams.get("key"), "unit-test-secret");
      assert.equal(options?.redirect, "error");
      return Response.json({
        count: 2,
        next: "https://api.rawg.io/api/games?key=unit-test-secret&page=2",
        results: [dto],
      });
    },
  });
  const response = await handler(
    new Request(
      "https://checkpoint.test/.netlify/functions/rawg?q=hello&page_size=1",
    ),
  );
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.games[0].id, "rawg:123");
  assert.equal(body.hasNext, true);
  assert.equal(body.next, undefined);
  assert.ok(!JSON.stringify(body).includes("unit-test-secret"));
  assert.equal(calls, 1);
  assert.equal(
    (await handler(new Request("https://checkpoint.test/?url=https://bad")))
      .status,
    400,
  );
  assert.equal(calls, 1);
  assert.equal(
    (await handler(new Request("https://checkpoint.test/", { method: "POST" })))
      .status,
    405,
  );
  const noKey = createRawgHandler({
    key: () => undefined,
    fetcher: async () => {
      throw new Error("Must not fetch");
    },
  });
  assert.equal(
    (await noKey(new Request("https://checkpoint.test/"))).status,
    503,
  );
});
test("proxy contains failures, malformed JSON, redirect/network errors, timeouts and upstream error bodies", async () => {
  for (const [upstream, expected] of [
    [401, 503],
    [403, 503],
    [404, 404],
    [429, 429],
    [500, 502],
    [302, 502],
  ]) {
    const handler = createRawgHandler({
      key: () => "unit-test-secret",
      fetcher: async () =>
        new Response("unit-test-secret", { status: upstream }),
    });
    const response = await handler(
      new Request("https://checkpoint.test/?id=rawg:123"),
    );
    assert.equal(response.status, expected);
    assert.ok(!(await response.text()).includes("unit-test-secret"));
  }
  const invalid = createRawgHandler({
    key: () => "unit-test-secret",
    fetcher: async () => new Response("{bad"),
  });
  assert.equal(
    (await invalid(new Request("https://checkpoint.test/"))).status,
    502,
  );
  const timeout = createRawgHandler({
    key: () => "unit-test-secret",
    timeoutMs: 1,
    fetcher: async (_url, options) =>
      new Promise((_resolve, reject) =>
        options?.signal?.addEventListener("abort", () =>
          reject(new Error("unit-test-secret")),
        ),
      ),
  });
  assert.equal(
    (await timeout(new Request("https://checkpoint.test/"))).status,
    504,
  );
});
test("client caches, deduplicates and isolates subscriber cancellation, TTL and proxy failures", async () => {
  let count = 0;
  let now = 0;
  const client = createRawgClient(
    async () => {
      count++;
      await new Promise((resolve) => setTimeout(resolve, 5));
      return Response.json({
        games: [game],
        count: 1,
        page: 1,
        hasNext: false,
      });
    },
    () => now,
  );
  const a = new AbortController();
  const first = client.search(new URLSearchParams("q=remote"), a.signal);
  const second = client.search(new URLSearchParams("q=remote"));
  a.abort();
  await assert.rejects(first, { name: "AbortError" });
  await second;
  assert.equal(count, 1);
  await client.search(new URLSearchParams("q=remote"));
  assert.equal(count, 1);
  now = 120001;
  await client.search(new URLSearchParams("q=remote"));
  assert.equal(count, 2);
  const missing = createRawgClient(async () =>
    Response.json({ error: "ignored" }, { status: 404 }),
  );
  assert.equal(await missing.getGame("rawg:123"), null);
  const broken = createRawgClient(async () => new Response("not a function"));
  await assert.rejects(broken.search(new URLSearchParams()), /Netlify Dev/);
});
test("old and remote identities share service and personal transitions without rewriting records", async () => {
  let count = 0;
  const service = createCheckpointService(mockGameService, {
    async getGame(id) {
      count++;
      return id === "rawg:123" ? game : null;
    },
  });
  assert.equal((await service.getGame("elden-ring"))?.id, "elden-ring");
  assert.equal((await service.getGame("rawg:326243"))?.id, "elden-ring");
  assert.equal(count, 1);
  assert.equal(await service.getGame("unknown-legacy"), null);
  assert.equal(count, 1);
  assert.equal((await service.getGame("rawg:123"))?.id, "rawg:123");
  let data = updatePersonalData(emptyPersonalData(), {
    type: "add",
    gameId: "elden-ring",
  });
  const old = JSON.stringify(data.library[0]);
  data = updatePersonalData(data, {
    type: "save-review",
    gameId: "rawg:123",
    changes: {
      text: "Remote review",
      rating: 4.5,
      visibility: "private",
      containsSpoilers: true,
    },
  });
  data = updatePersonalData(data, { type: "favorite", gameId: "rawg:123" });
  assert.ok(isPersonalData(data));
  assert.equal(data.library.length, 2);
  assert.equal(JSON.stringify(data.library[0]), old);
  assert.equal(data.reviews[0].gameId, "rawg:123");
  const journals = updateJournalData(emptyJournalData(), {
    type: "create-playthrough",
    gameId: "rawg:123",
    changes: {
      title: "Remote journey",
      startedAt: "2026-10-17",
      status: "in-progress",
    },
  });
  assert.ok(isJournalData(journals));
  assert.equal(journals.playthroughs[0].gameId, "rawg:123");
  const offline = createCheckpointService(mockGameService, {
    async getGame() {
      throw new Error("Offline");
    },
  });
  assert.equal((await offline.getGame("rawg:123"))?.availability, "snapshot");
});

test("missing function HTML and SPA rewrites never become game-not-found or local search results", async () => {
  for (const status of [200, 404]) {
    const client = createRawgClient(
      async () =>
        new Response("<html>Static deployment</html>", {
          status,
          headers: { "Content-Type": "text/html" },
        }),
    );
    await assert.rejects(
      client.getGame("rawg:783856"),
      (error) =>
        error instanceof Error &&
        "status" in error &&
        error.status === 502 &&
        /Netlify Functions/.test(error.message),
    );
    await assert.rejects(
      client.search(new URLSearchParams("q=Animal Well")),
      /redeploy/,
    );
  }
});

test("bounded cache evicts old searches and malformed responses can be retried", async () => {
  let calls = 0;
  let malformed = true;
  const client = createRawgClient(async () => {
    calls++;
    return Response.json(
      malformed ? null : { games: [], count: 0, page: 1, hasNext: false },
    );
  });
  await assert.rejects(
    client.search(new URLSearchParams("q=retry")),
    /Invalid game service/,
  );
  malformed = false;
  await client.search(new URLSearchParams("q=retry"));
  assert.equal(calls, 2);
  for (let i = 0; i < 65; i++)
    await client.search(new URLSearchParams({ q: `cache-${i}` }));
  const previous = calls;
  await client.search(new URLSearchParams("q=retry"));
  assert.equal(calls, previous + 1);
});

test("proxy rejects oversized responses and redacts accidental secret echoes in normalized metadata", async () => {
  const handler = createRawgHandler({
    key: () => "unit-test-secret",
    fetcher: async () => Response.json({ ...dto, name: "unit-test-secret" }),
  });
  const response = await handler(
    new Request("https://checkpoint.test/?id=rawg:123"),
  );
  assert.equal(response.status, 200);
  assert.ok(!(await response.text()).includes("unit-test-secret"));
  const huge = createRawgHandler({
    key: () => "unit-test-secret",
    fetcher: async () => new Response("x".repeat(2_000_001)),
  });
  assert.equal(
    (await huge(new Request("https://checkpoint.test/"))).status,
    502,
  );
});
