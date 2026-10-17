import { games } from "../data/games.ts";
import type { GameService } from "./game-service.types.ts";

export const mockGameService: GameService = {
  sourceLabel: "Local demo catalog",
  async listGames(signal) {
    signal?.throwIfAborted();
    return games;
  },
  async getGame(id, signal) {
    signal?.throwIfAborted();
    return games.find((game) => game.id === id) ?? null;
  },
};
