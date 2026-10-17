import { useCallback, useEffect, useState } from "react";
import { gameService } from "../services/gameService";
import { GameApiError } from "../lib/rawg-contract";

type Resource<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "error"; message?: string };

function useGameResource<T>(
  key: string,
  load: (signal: AbortSignal) => Promise<T>,
) {
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${key}:${attempt}`;
  const [state, setState] = useState<{ key: string; resource: Resource<T> }>({
    key: requestKey,
    resource: { status: "loading" },
  });
  useEffect(() => {
    const controller = new AbortController();
    Promise.resolve()
      .then(() => load(controller.signal))
      .then((data) => {
        if (!controller.signal.aborted)
          setState({ key: requestKey, resource: { status: "ready", data } });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({
            key: requestKey,
            resource: {
              status: "error",
              message:
                error instanceof GameApiError ? error.message : undefined,
            },
          });
      });
    return () => controller.abort();
  }, [requestKey, load]);
  const resource: Resource<T> =
    state.key === requestKey ? state.resource : { status: "loading" };
  return { resource, retry: () => setAttempt((value) => value + 1) };
}

const loadCatalog = (signal: AbortSignal) => gameService.listGames(signal);
export function useGames() {
  return useGameResource("catalog", loadCatalog);
}
export function useGame(id: string) {
  const load = useCallback(
    (signal: AbortSignal) => gameService.getGame(id, signal),
    [id],
  );
  return useGameResource(`game:${id}`, load);
}
