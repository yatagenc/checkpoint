import { test } from "node:test";
import assert from "node:assert/strict";
import { games } from "../data/games.ts";
import { mockGameService } from "../services/mockGameService.ts";
import {
  discoverGames,
  formatReleaseDate,
  getFilterOptions,
  readFilters,
  safeExternalUrl,
} from "./discovery.ts";
import type { Game } from "../types/index.ts";

const base = readFilters(new URLSearchParams());
test("catalog contains 36 unique, sourced games with valid dates and real score ranges", () => {
  assert.equal(games.length, 36);
  assert.equal(new Set(games.map((game) => game.id)).size, 36);
  for (const game of games) {
    assert.ok(
      game.title && game.description && game.developer && game.publisher,
    );
    assert.ok(game.source.url.startsWith("https://store.steampowered.com/"));
    assert.equal(game.source.verifiedAt, "2026-10-16");
    assert.ok(game.releaseDate && /^\d{4}-\d{2}-\d{2}$/.test(game.releaseDate));
    assert.ok(!Number.isNaN(Date.parse(game.releaseDate)));
    assert.equal(game.screenshots.length, 3);
    assert.ok(game.coverUrl && safeExternalUrl(game.coverUrl));
    if (game.metacritic)
      assert.ok(
        game.metacritic.score > 0 &&
          game.metacritic.score <= 100 &&
          safeExternalUrl(game.metacritic.url),
      );
    assert.equal(game.communityRating, null);
    assert.equal(game.estimatedPlaytimeHours, null);
  }
});
test("case-insensitive trimmed title search, exact filters, and intersections work", () => {
  assert.deepEqual(
    discoverGames(games, { ...base, q: "  eLdEn RiNg  " }).map(
      (game) => game.id,
    ),
    ["elden-ring"],
  );
  assert.equal(
    discoverGames(games, { ...base, q: "no such adventure exists" }).length,
    0,
  );
  for (const genre of getFilterOptions(games).genres) {
    const result = discoverGames(games, { ...base, genre });
    assert.ok(
      result.length && result.every((game) => game.genres.includes(genre)),
    );
  }
  const result = discoverGames(games, {
    ...base,
    genre: "RPG",
    platform: "ps5",
    year: "2023",
  });
  assert.deepEqual(
    result.map((game) => game.id),
    ["baldurs-gate-3"],
  );
  assert.equal(
    discoverGames(games, { ...base, platform: "unknown-platform" }).length,
    0,
  );
  assert.equal(
    discoverGames(games, { ...base, genre: "unknown-genre" }).length,
    0,
  );
  assert.equal(discoverGames(games, { ...base, year: "1900" }).length, 0);
});
test("title, date, and rating sorts are deterministic without mutating the catalog", () => {
  const before = games.map((game) => game.id);
  const az = discoverGames(games, base);
  assert.deepEqual(
    discoverGames(games, { ...base, sort: "title-desc" }).map(
      (game) => game.id,
    ),
    az.map((game) => game.id).reverse(),
  );
  assert.equal(
    discoverGames(games, { ...base, sort: "newest" })[0].id,
    "clair-obscur-expedition-33",
  );
  assert.equal(
    discoverGames(games, { ...base, sort: "oldest" })[0].id,
    "half-life-2",
  );
  assert.equal(
    discoverGames(games, { ...base, sort: "rating" })[0].id,
    "disco-elysium",
  );
  assert.deepEqual(
    games.map((game) => game.id),
    before,
  );
});
test("missing dates and ratings always sort last, including oldest first", () => {
  const missing: Game = {
    ...games[0],
    id: "missing",
    title: "A missing entry",
    releaseDate: null,
    metacritic: null,
  };
  for (const sort of ["newest", "oldest", "rating"] as const)
    assert.equal(
      discoverGames([missing, games[0]], { ...base, sort }).at(-1)?.id,
      "missing",
    );
  assert.equal(formatReleaseDate(null), "Unavailable");
  assert.equal(formatReleaseDate("not-a-date"), "Unavailable");
  assert.equal(formatReleaseDate("2022-02-24"), "February 24, 2022");
});
test("URL filters retain shareable values and unsupported sorting falls back safely", () => {
  const params = new URLSearchParams(
    "q=Dark+Souls&genre=Action&platform=pc&year=2016&sort=rating",
  );
  assert.deepEqual(readFilters(params), {
    q: "Dark Souls",
    genre: "Action",
    platform: "pc",
    year: "2016",
    sort: "rating",
  });
  assert.deepEqual(readFilters(new URLSearchParams("sort=oops")), base);
  assert.deepEqual(readFilters(new URLSearchParams()), base);
  assert.equal(safeExternalUrl("javascript:alert(1)"), null);
  assert.equal(safeExternalUrl("http://example.com"), null);
  assert.equal(safeExternalUrl("bad url"), null);
});
test("service supports stable lookup, missing IDs and cancellation", async () => {
  assert.equal((await mockGameService.listGames()).length, 36);
  for (const game of games)
    assert.equal((await mockGameService.getGame(game.id))?.id, game.id);
  assert.equal(await mockGameService.getGame("missing"), null);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(mockGameService.listGames(controller.signal), {
    name: "AbortError",
  });
  await assert.rejects(
    mockGameService.getGame("elden-ring", controller.signal),
    { name: "AbortError" },
  );
});
