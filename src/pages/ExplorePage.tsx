import { Search, SlidersHorizontal, X } from "lucide-react";
import { useSearchParams } from "react-router";
import { PageIntro } from "../components/ui/PageIntro";
import { GameCard } from "../components/games/GameCard";
import { CatalogState } from "../components/games/CatalogState";
import { useGames } from "../hooks/useGames";
import {
  discoverGames,
  getFilterOptions,
  readFilters,
  sortOptions,
} from "../lib/discovery";

export function ExplorePage() {
  const [params, setParams] = useSearchParams();
  const filters = readFilters(params);
  const { resource, retry } = useGames();
  const games = resource.status === "ready" ? resource.data : [];
  const options = getFilterOptions(games);
  const results = discoverGames(games, filters);
  const active = Boolean(
    filters.q ||
    filters.genre ||
    filters.platform ||
    filters.year ||
    filters.sort !== "title",
  );
  function update(key: string, value: string) {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (value && !(key === "sort" && value === "title"))
          next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: key === "q" },
    );
  }
  return (
    <>
      <PageIntro
        eyebrow="DISCOVERY STARTS HERE"
        title="Find your next world."
        description="A familiar favorite. A different perspective. A game you didn’t know you were looking for."
      />
      <div className="catalog-context">
        <span className="badge">Local demo catalog</span>
        <p>36 selected games · Store metadata snapshot · No live rankings</p>
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
            placeholder="Search for your next story…"
            value={filters.q}
            onChange={(event) => update("q", event.target.value)}
          />
        </div>
        <div className="filter-grid">
          <label>
            Genre
            <select
              value={filters.genre}
              onChange={(event) => update("genre", event.target.value)}
            >
              <option value="">All genres</option>
              {filters.genre && !options.genres.includes(filters.genre) && (
                <option value={filters.genre}>
                  Unknown genre: {filters.genre}
                </option>
              )}
              {options.genres.map((genre) => (
                <option key={genre}>{genre}</option>
              ))}
            </select>
          </label>
          <label>
            Platform
            <select
              value={filters.platform}
              onChange={(event) => update("platform", event.target.value)}
            >
              <option value="">All verified platforms</option>
              {filters.platform &&
                !options.platforms.some(
                  (platform) => platform.id === filters.platform,
                ) && (
                  <option value={filters.platform}>
                    Unknown platform: {filters.platform}
                  </option>
                )}
              {options.platforms.map((platform) => (
                <option key={platform.id} value={platform.id}>
                  {platform.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Steam release year
            <select
              value={filters.year}
              onChange={(event) => update("year", event.target.value)}
            >
              <option value="">All years</option>
              {filters.year && !options.years.includes(filters.year) && (
                <option value={filters.year}>
                  Unknown year: {filters.year}
                </option>
              )}
              {options.years.map((year) => (
                <option key={year}>{year}</option>
              ))}
            </select>
          </label>
          <label>
            Sort by
            <select
              value={filters.sort}
              onChange={(event) => update("sort", event.target.value)}
            >
              {sortOptions.map((sort) => (
                <option key={sort.value} value={sort.value}>
                  {sort.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>
      {resource.status === "loading" ? (
        <CatalogState />
      ) : resource.status === "error" ? (
        <CatalogState error retry={retry} />
      ) : (
        <>
          <div className="collection-bar results-bar">
            <p role="status" aria-live="polite">
              <strong>{results.length}</strong>{" "}
              {results.length === 1 ? "game" : "games"}
              {filters.q.trim() && <> matching “{filters.q.trim()}”</>}
            </p>
            <button
              className="clear-filters"
              disabled={!active}
              onClick={() => setParams({})}
            >
              <X size={14} /> Clear filters
            </button>
          </div>
          {results.length ? (
            <div className="game-grid discovery-grid">
              {results.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span className="icon-tile">
                <SlidersHorizontal size={25} />
              </span>
              <h2>No worlds on this path.</h2>
              <p>
                Try another title or broaden your filters. This demo collection
                is deliberately small.
              </p>
              <button
                className="button button-secondary"
                onClick={() => setParams({})}
              >
                Reset discovery
              </button>
            </div>
          )}
          <p className="subtle-notice">
            Demo catalog, not a live game database. Release dates and Metacritic
            scores describe the Steam edition. Platform filters cover verified
            desktop support and selected console releases, not an exhaustive
            platform list. Promotional artwork is served from Steam;
            descriptions and tags are Checkpoint editorial selections.
          </p>
        </>
      )}
    </>
  );
}
