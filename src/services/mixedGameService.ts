import type { Game } from "../types/index.ts";
import type { GameService } from "./game-service.types.ts";
import { gameAliases, isGameMetadata, mergeCatalog } from "../lib/catalog.ts";

/** Composition seam only: no remote provider is configured in Phase 5A. */
export function createMixedGameService(
  local: GameService,
  additional?: GameService,
): GameService {
  return {
    sourceLabel: additional
      ? `${local.sourceLabel} + ${additional.sourceLabel}`
      : local.sourceLabel,
    async listGames(signal) {
      const [base, more] = await Promise.all([
        local.listGames(signal),
        additional?.listGames(signal) ?? [],
      ]);
      signal?.throwIfAborted();
      return mergeCatalog(base, more);
    },
    async getGame(id, signal) {
      const base = await local.listGames(signal);
      signal?.throwIfAborted();
      const known = base.find((game) => gameAliases(game).includes(id));
      if (known) return known;
      // Unknown legacy IDs are preserved as unresolved, never guessed from titles.
      if (!additional || !/^(rawg|steam):[A-Za-z0-9_-]{1,128}$/.test(id))
        return null;
      const game = await additional.getGame(id, signal);
      signal?.throwIfAborted();
      if (!game) return null;
      const merged = mergeCatalog(base, [game]);
      const match = merged.find((game) => gameAliases(game).includes(id));
      if (!match)
        throw new Error("Provider returned metadata for a different game.");
      return match;
    },
  };
}
export type HydratedGame =
  | { gameId: string; status: "available"; game: Game }
  | { gameId: string; status: "unavailable" | "error" };
/** Read-only bounded hydration; only IDs cross the service boundary, never notes/reviews. */
export async function hydrateSavedGames(
  service: GameService,
  gameIds: readonly string[],
  signal?: AbortSignal,
): Promise<HydratedGame[]> {
  signal?.throwIfAborted();
  const ids = [...new Set(gameIds)];
  const results: HydratedGame[] = new Array(ids.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(4, ids.length) }, async () => {
      while (next < ids.length) {
        signal?.throwIfAborted();
        const index = next++;
        const gameId = ids[index];
        try {
          const game = await service.getGame(gameId, signal);
          signal?.throwIfAborted();
          if (
            game &&
            (!isGameMetadata(game) || !gameAliases(game).includes(gameId))
          )
            throw new Error("Hydrated metadata does not match the saved ID.");
          results[index] = game
            ? { gameId, status: "available", game }
            : { gameId, status: "unavailable" };
        } catch {
          signal?.throwIfAborted();
          results[index] = { gameId, status: "error" };
        }
      }
    }),
  );
  return results;
}
