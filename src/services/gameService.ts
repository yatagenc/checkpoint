import type { GameService } from "./game-service.types";
import { mockGameService } from "./mockGameService";
import { createCheckpointService } from "./checkpointGameService";
import { rawgClient } from "./rawgClient";

export const gameService: GameService = createCheckpointService(
  mockGameService,
  rawgClient,
);
