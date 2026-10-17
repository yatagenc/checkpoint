import { useState } from "react";
import { Library, Search } from "lucide-react";
import { Link } from "react-router";
import { EmptyState } from "../components/ui/EmptyState";
import { PageIntro } from "../components/ui/PageIntro";
import { CatalogState } from "../components/games/CatalogState";
import { LibraryCard } from "../components/personal/LibraryCard";
import { useSavedGames } from "../hooks/useSavedGames";
import { usePersonalData } from "../hooks/usePersonalData";
import { statuses } from "../lib/personal";

export function LibraryPage() {
  const { data } = usePersonalData();
  const { resource, retry } = useSavedGames();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("newest");
  const games = new Map(
    (resource.status === "ready" ? resource.data : []).map((game) => [
      game.id,
      game,
    ]),
  );
  const title = (id: string) => games.get(id)?.title ?? id;
  const entries = data.library
    .filter(
      (entry) =>
        (!status || entry.status === status) &&
        title(entry.gameId).toLowerCase().includes(query.trim().toLowerCase()),
    )
    .sort((a, b) => {
      if (sort === "title")
        return title(a.gameId).localeCompare(title(b.gameId));
      if (sort === "rating")
        return (
          (b.rating ?? -1) - (a.rating ?? -1) ||
          title(a.gameId).localeCompare(title(b.gameId))
        );
      return (
        (sort === "oldest"
          ? a.addedAt.localeCompare(b.addedAt)
          : b.addedAt.localeCompare(a.addedAt)) ||
        a.gameId.localeCompare(b.gameId)
      );
    });
  return (
    <>
      <PageIntro
        eyebrow="YOUR PERSONAL COLLECTION"
        title="My library"
        description="The games that stayed with you. And the ones still waiting to be discovered."
      />
      <div className="status-overview" aria-label="Library status counts">
        {statuses.map((status) => (
          <div key={status.value}>
            <span>{status.label}</span>
            <strong>
              {
                data.library.filter((entry) => entry.status === status.value)
                  .length
              }
            </strong>
          </div>
        ))}
      </div>
      <p className="sample-note">
        Your collection is saved only in this browser. Explore the catalog to
        add games.
      </p>
      {!data.library.length ? (
        <EmptyState
          icon={Library}
          title="A new collection starts here."
          description="Find a game in Explore and add it to your library. Keep your status, playtime, ratings, and personal notes in one place."
        />
      ) : (
        <>
          {resource.status === "loading" && (
            <p className="sample-note" role="status">
              Loading game metadata. Your saved records are available below.
            </p>
          )}
          {resource.status === "error" && <CatalogState error retry={retry} />}
          <section
            className="personal-library-filters"
            aria-label="Library filters"
          >
            <label className="library-search">
              <span>
                <Search size={15} />
                Search your library
              </span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Game title"
              />
            </label>
            <label>
              Status
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="">All statuses</option>
                {statuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Sort library
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
              >
                <option value="newest">Date added · newest</option>
                <option value="oldest">Date added · oldest</option>
                <option value="title">Title · A–Z</option>
                <option value="rating">Personal rating · highest</option>
              </select>
            </label>
          </section>
          <div className="collection-bar results-bar">
            <p role="status">
              {entries.length} {entries.length === 1 ? "game" : "games"}
            </p>
            <button
              className="text-button"
              disabled={!query && !status && sort === "newest"}
              onClick={() => {
                setQuery("");
                setStatus("");
                setSort("newest");
              }}
            >
              Clear library filters
            </button>
            <Link to="/explore" className="text-link">
              Add more games ↗
            </Link>
          </div>
          {entries.length ? (
            <div className="library-grid">
              {entries.map((entry) => (
                <LibraryCard
                  key={entry.id}
                  entry={entry}
                  game={games.get(entry.gameId)}
                />
              ))}
            </div>
          ) : (
            <div className="catalog-state">
              <h2>No matches in your library.</h2>
              <p>Try a different title or clear your status filter.</p>
              <button
                className="button button-secondary"
                onClick={() => {
                  setQuery("");
                  setStatus("");
                }}
              >
                Show all saved games
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
