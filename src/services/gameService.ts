import type { GameService } from "./game-service.types";
import { mockGameService } from "./mockGameService";
import { createMixedGameService } from "./mixedGameService";

// Select a future RAWG adapter here. No live calls or API key in Phase 2.
export const gameService: GameService = createMixedGameService(mockGameService);
