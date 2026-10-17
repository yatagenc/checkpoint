import { test } from "node:test";
import assert from "node:assert/strict";
import { games } from "../data/games.ts";
import { isGameMetadata, mergeCatalog, providerGameId } from "./catalog.ts";
import {
  createMixedGameService,
  hydrateSavedGames,
} from "../services/mixedGameService.ts";
import type { Game } from "../types/index.ts";
import type { GameService } from "../services/game-service.types.ts";
const remote: Game = {
  ...games[0],
  id: "rawg:123",
  providerIds: { rawg: "123" },
  title: "Remote edition",
};
const service = (items: readonly Game[]): GameService => ({
  sourceLabel: "Test",
  async listGames() {
    return items;
  },
  async getGame(id) {
    return items.find((game) => game.id === id) ?? null;
  },
});
test("catalog validates all 36 local entries and retains canonical IDs", () => {
  assert.equal(games.length, 36);
  assert.ok(games.every(isGameMetadata));
  const merged = mergeCatalog(games, [remote]);
  assert.equal(merged.length, 37);
  assert.deepEqual(
    merged.slice(0, 36).map((game) => game.id),
    games.map((game) => game.id),
  );
  assert.equal(providerGameId("rawg", "123"), "rawg:123");
  assert.throws(() => providerGameId("rawg", "../bad"));
  assert.equal(isGameMetadata({ ...remote, releaseDate: "2026-02-31" }), false);
  assert.equal(
    isGameMetadata({ ...remote, coverUrl: "javascript:alert(1)" }),
    false,
  );
  assert.throws(() => mergeCatalog(games, [{ ...remote, id: "unmapped" }]));
});
test("explicit provider aliases deduplicate without replacing local editions or guessing titles", () => {
  const local = {
    ...games[0],
    providerIds: { ...games[0].providerIds, rawg: "123" },
  };
  const merged = mergeCatalog([local], [remote]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].id, local.id);
  assert.equal(merged[0].title, local.title);
  assert.equal(
    mergeCatalog([games[0]], [{ ...remote, title: games[0].title }]).length,
    2,
  );
  assert.throws(() =>
    mergeCatalog([local, { ...games[1], providerIds: { rawg: "123" } }], []),
  );
  assert.throws(() =>
    mergeCatalog(
      [local],
      [{ ...remote, providerIds: { rawg: "123", steam: "different" } }],
    ),
  );
});
test("mixed service resolves explicit aliases and rejects mismatched provider responses", async () => {
  let calls = 0;
  const mixed = createMixedGameService(service(games), {
    ...service([remote]),
    async getGame() {
      calls++;
      return remote;
    },
  });
  assert.equal(await mixed.getGame("unknown-legacy-id"), null);
  assert.equal(calls, 0);
  assert.equal((await mixed.getGame("rawg:123"))?.id, "rawg:123");
  assert.equal(
    (await mixed.getGame(`steam:${games[0].providerIds?.steam}`))?.id,
    games[0].id,
  );
  await assert.rejects(mixed.getGame("rawg:456"), /different game/);
  assert.equal((await mixed.listGames()).length, 37);
});
test("saved-game hydration deduplicates, bounds concurrency and preserves unresolved IDs", async () => {
  let active = 0;
  let maximum = 0;
  let calls = 0;
  const adapter: GameService = {
    ...service([]),
    async getGame(id) {
      calls++;
      active++;
      maximum = Math.max(active, maximum);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active--;
      if (id === "error") throw new Error("offline");
      return games.find((game) => game.id === id) ?? null;
    },
  };
  const ids = [
    ...games.slice(0, 8).map((game) => game.id),
    "missing",
    "error",
    games[0].id,
  ];
  const result = await hydrateSavedGames(adapter, ids);
  assert.equal(calls, 10);
  assert.ok(maximum <= 4 && maximum > 1);
  assert.deepEqual(
    result.map((item) => item.gameId),
    [...new Set(ids)],
  );
  assert.equal(result[8].status, "unavailable");
  assert.equal(result[9].status, "error");
  const wrong = await hydrateSavedGames(service([remote]), ["rawg:123"]);
  assert.equal(wrong[0].status, "available");
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(hydrateSavedGames(adapter, [], controller.signal), {
    name: "AbortError",
  });
});
