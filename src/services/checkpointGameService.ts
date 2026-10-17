import type { GameService } from "./game-service.types.ts";
import { gameAliases } from "../lib/catalog.ts";
import { rawgNumericId } from "../lib/rawg-contract.ts";
import { knownGames, rememberGame } from "./gameDisplay.ts";
import { games } from "../data/games.ts";
import type { Game } from "../types/index.ts";

export function canonicalGame(game: Game): Game {
  const local = games.find((item) => gameAliases(item).includes(game.id));
  // Identity mapping must not replace live provider scores with curated metadata.
  return local
    ? {
        ...game,
        id: local.id,
        providerIds: { ...local.providerIds, ...game.providerIds },
      }
    : game;
}

/** listGames is deliberately local-only; remote browsing requires an explicit paginated query. */
export function createCheckpointService(
  local: GameService,
  remote: Pick<GameService, "getGame">,
): GameService {
  return {
    sourceLabel: "Curated catalog + on-demand RAWG",
    listGames: (signal) => local.listGames(signal),
    async getGame(id, signal) {
      signal?.throwIfAborted();
      const localGames = await local.listGames(signal);
      const known = localGames.find((game) => gameAliases(game).includes(id));
      if (known && (id === known.id || !rawgNumericId(id))) return known;
      if (!rawgNumericId(id)) return null;
      const fallback = () =>
        knownGames().find((game) => gameAliases(game).includes(id)) ?? known;
      try {
        const game = await remote.getGame(id, signal);
        signal?.throwIfAborted();
        if (game) {
          const canonical = canonicalGame(game);
          rememberGame(canonical);
          return canonical;
        }
        const cached = fallback();
        return cached ? { ...cached, availability: "snapshot" } : null;
      } catch (error) {
        signal?.throwIfAborted();
        const cached = fallback();
        if (cached)
          return {
            ...cached,
            availability: "snapshot",
            source: {
              ...cached.source,
              note:
                "Live RAWG data is unavailable. Showing saved metadata; your personal data remains editable. " +
                cached.source.note,
            },
          };
        throw error;
      }
    },
  };
}
