import { useEffect, useState } from "react";
import { usePersonalData } from "./usePersonalData";
import { gameService } from "../services/gameService";
import { knownGames } from "../services/gameDisplay";
import { games as curated } from "../data/games";
import { rawgNumericId } from "../lib/rawg-contract";
import type { Game } from "../types";

/** Saved content always renders; only four missing display records are hydrated per view. */
export function useSavedGames(): {
  resource: { status: "ready"; data: Game[] } | { status: "loading" | "error" };
  retry: () => void;
} {
  const { data, journals } = usePersonalData();
  const ids = [
    ...new Set([
      ...data.library.map((item) => item.gameId),
      ...journals.playthroughs.map((item) => item.gameId),
    ]),
  ]
    .sort()
    .join("|");
  const [hydrated, setHydrated] = useState<Game[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    const known = new Set([...curated, ...knownGames()].map((game) => game.id));
    const missing = ids
      .split("|")
      .filter((id) => rawgNumericId(id) && !known.has(id))
      .slice(0, 4);
    for (const id of missing)
      void gameService
        .getGame(id, controller.signal)
        .then((game) => {
          if (game && !controller.signal.aborted)
            setHydrated((previous) => [
              ...previous.filter((item) => item.id !== game.id),
              game,
            ]);
        })
        .catch(() => {});
    return () => controller.abort();
  }, [ids]);
  const games = [
    ...new Map(
      [...curated, ...knownGames(), ...hydrated].map((game) => [game.id, game]),
    ).values(),
  ];
  return {
    resource: { status: "ready" as const, data: games },
    retry: () => {},
  };
}
