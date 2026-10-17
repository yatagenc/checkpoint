import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Search, X } from "lucide-react";
import { PageIntro } from "../components/ui/PageIntro";
import { GameCard } from "../components/games/GameCard";
import { DemoExplorePage } from "./DemoExplorePage";
import { rawgClient } from "../services/rawgClient";
import { rememberGame } from "../services/gameDisplay";
import { canonicalGame } from "../services/checkpointGameService";
import {
  rawgGenres,
  rawgPlatforms,
  rawgSorts,
  MAX_PAGE,
} from "../lib/rawg-contract";
import type { GamePage } from "../lib/rawg-contract";
import { useGenres } from "../hooks/useGenres";
import { games as curatedGames } from "../data/games";

export function ExplorePage() {
  const [params] = useSearchParams();
  return params.get("source") === "demo" ? (
    <>
      <p className="sample-note">
        <Link className="text-link" to="/explore">
          Search the RAWG database ↗
        </Link>
      </p>
      <DemoExplorePage />
    </>
  ) : (
    <RawgExplore />
  );
}
function RawgExplore() {
  const { state: genreState, retry: retryGenres } = useGenres();
  const genreOptions = genreState?.data?.genres.length
    ? genreState.data.genres.map(
        (genre) => [String(genre.id), genre.name] as const,
      )
    : rawgGenres;
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const page = params.get("page") ?? "1";
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    key: string;
    data?: GamePage;
    error?: string;
  }>({ key: "" });
  const oldPlatforms: Record<string, string> = {
    pc: "4",
    ps5: "187",
    ps4: "18",
    "xbox-series": "186",
    "xbox-one": "1",
    switch: "7",
    mac: "5",
    linux: "6",
  };
  const selectedGenre = params.get("genre") ?? "";
  const genre =
    rawgGenres.find(
      ([id, label]) => id === selectedGenre || label === selectedGenre,
    )?.[0] ?? selectedGenre;
  const platform =
    oldPlatforms[params.get("platform") ?? ""] ?? params.get("platform") ?? "";
  const sort = params.get("sort") ?? "relevance";
  const year = params.get("year") ?? "";
  const request = new URLSearchParams();
  for (const [key, value] of Object.entries({
    q: query.trim(),
    genre,
    platform,
    sort,
    year,
    page,
    page_size: "20",
  }))
    if (value) request.set(key, value);
  const requestKey = request.toString();
  const key = `${requestKey}:${attempt}`;
  const tooShort = query.trim().length === 1;
  useEffect(() => {
    if (tooShort) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void rawgClient
        .search(new URLSearchParams(requestKey), controller.signal)
        .then((data) => {
          if (!controller.signal.aborted) {
            const mapped = {
              ...data,
              games: [
                ...new Map(
                  data.games
                    .map((game) => canonicalGame(game))
                    .map((game) => [game.id, game]),
                ).values(),
              ],
            };
            mapped.games.forEach(rememberGame);
            setState({ key, data: mapped });
          }
        })
        .catch((error) => {
          if (!controller.signal.aborted)
            setState({
              key,
              error:
                error instanceof Error
                  ? error.message
                  : "Game discovery is unavailable.",
            });
        });
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [requestKey, key, tooShort]);
  function update(name: string, value: string) {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.delete("page");
        if (value) next.set(name, value);
        else next.delete(name);
        return next;
      },
      { replace: name === "q" },
    );
  }
  const current = state.key === key ? state : undefined;
  const numberPage = Number(page);
  return (
    <>
      <PageIntro
        eyebrow="DISCOVERY STARTS HERE"
        title="Find your next world."
        description="A familiar favorite. A different perspective. A game you didn’t know you were looking for."
      />
      <div className="catalog-context">
        <span className="badge">Powered by RAWG</span>
        <p>
          On-demand results · 20 games per page ·{" "}
          <Link className="text-link" to="/explore?source=demo">
            Browse the {curatedGames.length}-game offline demo ↗
          </Link>
        </p>
      </div>
      <section
        className="discovery-controls"
        aria-label="Game discovery filters"
      >
        <div className="discovery-search">
          <Search size={20} aria-hidden="true" />
          <input
            type="search"
            aria-label="Search games by title"
            placeholder="Search the game database…"
            maxLength={100}
            value={query}
            onChange={(event) => update("q", event.target.value)}
          />
        </div>
        <div className="filter-grid">
          <label>
            Genre
            <select
              value={genre}
              onChange={(event) => update("genre", event.target.value)}
            >
              <option value="">All genres</option>
              {genre && !genreOptions.some(([id]) => id === genre) && (
                <option value={genre}>
                  {genreState?.data?.genres.find((item) => item.slug === genre)
                    ?.name ?? `Selected RAWG genre: ${genre}`}
                </option>
              )}
              {genreOptions.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Platform
            <select
              value={platform}
              onChange={(event) => update("platform", event.target.value)}
            >
              <option value="">All platforms</option>
              {platform && !rawgPlatforms.some(([id]) => id === platform) && (
                <option value={platform}>
                  Unsupported platform: {platform}
                </option>
              )}
              {rawgPlatforms.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Release year
            <select
              value={year}
              onChange={(event) => update("year", event.target.value)}
            >
              <option value="">All years</option>
              {year && !/^\d{4}$/.test(year) && (
                <option value={year}>Unsupported year: {year}</option>
              )}
              {Array.from(
                { length: new Date().getUTCFullYear() + 3 - 1970 },
                (_, index) => String(new Date().getUTCFullYear() + 2 - index),
              ).map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            Sort by
            <select
              value={sort}
              onChange={(event) => update("sort", event.target.value)}
            >
              {!rawgSorts.some(([id]) => id === sort) && (
                <option value={sort}>Unsupported sorting</option>
              )}
              {rawgSorts.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>
      {!genreState && (
        <p className="sample-note" role="status">
          Loading RAWG genre filters…
        </p>
      )}
      {genreState?.error && (
        <p className="sample-note">
          Genre metadata is unavailable; supported fallback filters remain
          available.{" "}
          <button className="text-button" onClick={retryGenres}>
            Retry genre filters
          </button>
        </p>
      )}
      <div className="collection-bar results-bar">
        <p role="status" aria-live="polite">
          {tooShort
            ? "Enter at least two characters."
            : !current
              ? "Searching RAWG…"
              : current.error
                ? "Search unavailable"
                : `${current.data?.count.toLocaleString()} matching games · Page ${page}`}
        </p>
        <button
          className="clear-filters"
          disabled={!params.size}
          onClick={() => setParams({})}
        >
          <X size={14} /> Clear filters
        </button>
      </div>
      {!tooShort && !current && (
        <div className="catalog-state" role="status">
          <h2>Discovering worlds…</h2>
          <p>Loading this page from RAWG.</p>
        </div>
      )}
      {current?.error && (
        <div className="catalog-state" role="alert">
          <h2>The game database is taking a pause.</h2>
          <p>{current.error}</p>
          <button
            className="button button-secondary"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Try again
          </button>
          <p>
            <Link className="text-link" to="/explore?source=demo">
              Open the offline demo catalog ↗
            </Link>
          </p>
        </div>
      )}
      {!tooShort && current?.data && (
        <>
          {current.data.games.length ? (
            <div className="game-grid discovery-grid">
              {current.data.games.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h2>No worlds on this path.</h2>
              <p>Try another title or broaden your filters.</p>
            </div>
          )}
          <nav className="pagination" aria-label="Game result pages">
            <button
              className="button button-secondary"
              disabled={numberPage <= 1}
              onClick={() => update("page", String(numberPage - 1))}
            >
              Previous page
            </button>
            <span>
              Page {page}
              {numberPage === MAX_PAGE
                ? " · Search limit reached; narrow your filters."
                : ""}
            </span>
            <button
              className="button button-secondary"
              disabled={!current.data.hasNext}
              onClick={() => update("page", String(numberPage + 1))}
            >
              Next page
            </button>
          </nav>
        </>
      )}
      <p className="subtle-notice">
        Game data and imagery via{" "}
        <a
          className="text-link"
          href="https://rawg.io"
          target="_blank"
          rel="noreferrer"
        >
          RAWG ↗
        </a>
        . Filters and sorting apply across the database on the server.
        Metacritic and RAWG ratings are separate from your personal scores.
        Unmapped curated editions retain their own identities.
      </p>
    </>
  );
}
