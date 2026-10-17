import { useEffect, useState } from "react";
import { rawgClient } from "../../services/rawgClient";
import type { ScreenshotPage } from "../../lib/rawg-contract";
import { GameImage } from "./GameImage";
import { ExternalLink } from "../ui/ExternalLink";

export function RemoteScreenshots({ id }: { id: string }) {
  const [page, setPage] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const key = `${id}:${page}:${attempt}`;
  const [state, setState] = useState<{
    key: string;
    data?: ScreenshotPage;
    error?: string;
  }>({ key: "" });
  useEffect(() => {
    if (!page) return;
    const controller = new AbortController();
    void rawgClient
      .screenshots(id, page, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ key, data });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setState({
            key,
            error:
              "Screenshots could not be loaded. Your game and personal data are still available.",
          });
      });
    return () => controller.abort();
  }, [id, page, key]);
  const current = state.key === key ? state : undefined;
  if (!page)
    return (
      <button className="button button-secondary" onClick={() => setPage(1)}>
        Load screenshots from RAWG
      </button>
    );
  return (
    <div>
      {!current && <p role="status">Loading screenshots…</p>}
      {current?.error && (
        <p role="alert">
          {current.error}{" "}
          <button
            className="text-button"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Retry screenshots
          </button>
        </p>
      )}
      {current?.data && (
        <>
          {current.data.screenshots.length ? (
            <div className="screenshot-grid">
              {current.data.screenshots.map((item) => (
                <ExternalLink
                  key={item.url}
                  href={item.url}
                  className="screenshot-link"
                >
                  <GameImage src={item.url} alt={item.alt} />
                </ExternalLink>
              ))}
            </div>
          ) : (
            <p className="subtle-notice">
              Screenshots are not available for this game.
            </p>
          )}
          <nav className="pagination" aria-label="Screenshot pages">
            <button
              className="button button-secondary"
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
            >
              Previous screenshots
            </button>
            <span>Page {page}</span>
            <button
              className="button button-secondary"
              disabled={!current.data.hasNext}
              onClick={() => setPage((value) => value + 1)}
            >
              Next screenshots
            </button>
          </nav>
        </>
      )}
    </div>
  );
}
