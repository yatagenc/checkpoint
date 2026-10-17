import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeGame, normalizeGenres } from "../../server/rawg-normalize.ts";
import { createRawgHandler } from "../../server/rawg-proxy.ts";
import { validateRawgQuery } from "./rawg-contract.ts";
import { createRawgClient } from "../services/rawgClient.ts";
import { isGameMetadata } from "./catalog.ts";
import { metacriticScores, metacriticPlatformLabel } from "./metacritic.ts";
import { canonicalGame } from "../services/checkpointGameService.ts";

const genres = {
  count: 2,
  next: null,
  results: [
    {
      id: 4,
      name: "Action",
      slug: "action",
      games_count: 123456,
      games: [{ id: 1, name: "Never forwarded" }],
    },
    { id: 5, name: "RPG", slug: "role-playing-games-rpg", games_count: 0 },
  ],
};
test("genre metadata keeps API counts including zero and excludes embedded game listings", () => {
  const normalized = normalizeGenres(genres);
  assert.deepEqual(normalized, [
    { id: 4, name: "Action", slug: "action", gamesCount: 123456 },
    { id: 5, name: "RPG", slug: "role-playing-games-rpg", gamesCount: 0 },
  ]);
  assert.throws(() =>
    normalizeGenres({ results: [{ ...genres.results[0], games_count: -1 }] }),
  );
  assert.throws(() =>
    normalizeGenres({ results: [genres.results[0], genres.results[0]] }),
  );
});
test("genre proxy and game filters forward only bounded official metadata requests", async () => {
  let calls = 0;
  const handler = createRawgHandler({
    key: () => "unit-test-secret",
    fetcher: async (input) => {
      calls++;
      const url = new URL(String(input));
      assert.equal(url.origin, "https://api.rawg.io");
      assert.equal(url.pathname, "/api/genres");
      assert.equal(url.searchParams.get("page_size"), "20");
      return Response.json(genres);
    },
  });
  const response = await handler(
    new Request("https://checkpoint.test/?resource=genres&page_size=20"),
  );
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.genres[0].gamesCount, 123456);
  assert.equal(body.genres[0].games, undefined);
  assert.equal(calls, 1);
  for (const query of [
    "resource=genres&id=rawg:28",
    "resource=genres&q=action",
    "resource=genres&page=6",
    "resource=genres&page_size=21",
  ])
    assert.throws(() => validateRawgQuery(new URLSearchParams(query)));
  assert.equal(
    validateRawgQuery(new URLSearchParams("genre=4")).params.get("genres"),
    "4",
  );
  assert.equal(
    validateRawgQuery(new URLSearchParams("genre=action")).params.get("genres"),
    "action",
  );
});
test("genre requests share the bounded client cache and expire without fetching further pages", async () => {
  let calls = 0;
  let now = 0;
  const normalized = {
    genres: normalizeGenres(genres),
    count: 2,
    page: 1,
    hasNext: false,
  };
  const client = createRawgClient(
    async (input) => {
      calls++;
      assert.equal(
        new URL(String(input), "https://checkpoint.test").searchParams.get(
          "resource",
        ),
        "genres",
      );
      return Response.json(normalized);
    },
    () => now,
  );
  await Promise.all([client.genres(), client.genres()]);
  assert.equal(calls, 1);
  await client.genres();
  assert.equal(calls, 1);
  now = 600001;
  await client.genres();
  assert.equal(calls, 2);
});
test("RDR2 Metacritic normalization retains separate provider values and actual platform labels", () => {
  const game = normalizeGame({
    id: 28,
    name: "Red Dead Redemption 2",
    metacritic: 96,
    platforms: [{ platform: { id: 4, name: "PC" } }],
    metacritic_platforms: [
      { metascore: 97, platform: { platform: 18, name: "PlayStation 4" } },
      { metascore: 93, platform: { platform: 4, name: "PC" } },
      { metascore: 97, platform: { platform: 1, name: "Xbox One" } },
    ],
  });
  assert.equal(game.metacritic?.platform, null);
  assert.equal(game.metacritic?.score, 96);
  assert.deepEqual(
    game.metacriticPlatforms?.map((item) => [item.platform, item.score]),
    [
      ["PlayStation 4", 97],
      ["PC", 93],
      ["Xbox One", 97],
    ],
  );
  assert.equal(
    metacriticPlatformLabel(metacriticScores(game)[0]),
    "Platform unspecified",
  );
  assert.ok(isGameMetadata(game));
  assert.equal(
    isGameMetadata({
      ...game,
      metacriticPlatforms: [
        { score: 101, platform: "PC", url: "https://rawg.io" },
      ],
    }),
    false,
  );
});
test("missing scores stay unavailable and unspecified values never inherit a listed platform", () => {
  const missing = normalizeGame({
    id: 1,
    name: "No scores",
    metacritic_platforms: [
      { metascore: null },
      { metascore: 101 },
      { metascore: "97" },
    ],
  });
  assert.deepEqual(metacriticScores(missing), []);
  const unspecified = normalizeGame({
    id: 2,
    name: "One score",
    metacritic: 80,
    platforms: [{ platform: { id: 4, name: "PC" } }],
  });
  assert.equal(
    metacriticPlatformLabel(metacriticScores(unspecified)[0]),
    "Platform unspecified",
  );
  const linked = normalizeGame({
    id: 3,
    name: "Explicit platform IDs",
    platforms: [{ platform: { id: 4, name: "PC" } }],
    metacritic_platforms: [
      { metascore: 70, platform: { platform: 4 } },
      { metascore: 75, platform: {} },
    ],
  });
  assert.equal(linked.metacriticPlatforms?.[0].platform, "PC");
  assert.equal(linked.metacriticPlatforms?.[1].platform, null);
});
test("mapping preserves canonical identity while retaining live RAWG score and source metadata", () => {
  const live = normalizeGame({
    id: 326243,
    name: "Live provider fixture",
    metacritic: 82,
    metacritic_platforms: [
      { metascore: 83, platform: { platform: 4, name: "PC" } },
    ],
  });
  const mapped = canonicalGame(live);
  assert.equal(mapped.id, "elden-ring");
  assert.equal(mapped.metacritic?.score, 82);
  assert.equal(mapped.metacriticPlatforms?.[0].score, 83);
  assert.equal(mapped.source.name, "RAWG");
});
