import { useEffect, useState } from "react";
import { rawgClient } from "../services/rawgClient";
import type { GenrePage } from "../lib/rawg-contract";
export function useGenres() {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    attempt: number;
    data?: GenrePage;
    error?: string;
  }>();
  useEffect(() => {
    const controller = new AbortController();
    void rawgClient
      .genres(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ attempt, data });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setState({
            attempt,
            error: "RAWG genre information could not be loaded.",
          });
      });
    return () => controller.abort();
  }, [attempt]);
  return {
    state: state?.attempt === attempt ? state : undefined,
    retry: () => setAttempt((value) => value + 1),
  };
}
