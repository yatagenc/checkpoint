import type { Game } from "../types/index.ts";

/** A future RAWG adapter normalizes its DTOs into Game at this boundary. */
export interface GameService {
  readonly sourceLabel: string;
  listGames(signal?: AbortSignal): Promise<readonly Game[]>;
  getGame(id: string, signal?: AbortSignal): Promise<Game | null>;
}
