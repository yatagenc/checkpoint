import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { BookOpen } from "lucide-react";
import { useGames } from "../hooks/useGames";
import { usePersonalData } from "../hooks/usePersonalData";
import { playthroughStatuses } from "../lib/journals";
import { PageIntro } from "../components/ui/PageIntro";
import { CatalogState } from "../components/games/CatalogState";
import { PlaythroughEditor } from "../components/journals/PlaythroughEditor";
import { PlaythroughCard } from "../components/journals/PlaythroughCard";

export function DiaryPage() {
  const { journals } = usePersonalData();
  const { resource, retry } = useGames();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("recent");
  const games = resource.status === "ready" ? resource.data : [];
  const gameMap = new Map(games.map((game) => [game.id, game]));
  const gameId = params.get("game") ?? "";
  const results = journals.playthroughs
    .filter(
      (item) =>
        (!gameId || item.gameId === gameId) &&
        (!status || item.status === status) &&
        (gameMap.get(item.gameId)?.title ?? item.gameId)
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
    )
    .sort(
      (a, b) =>
        (sort === "recent"
          ? b.updatedAt.localeCompare(a.updatedAt)
          : sort === "start-oldest"
            ? a.startedAt.localeCompare(b.startedAt)
            : b.startedAt.localeCompare(a.startedAt)) ||
        a.id.localeCompare(b.id),
    );
  const highlights = [
    {
      title: "Ongoing journeys",
      items: results
        .filter((item) => item.status === "in-progress")
        .slice(0, 3),
    },
    {
      title: "Recently updated",
      items: [...results]
        .sort(
          (a, b) =>
            b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id),
        )
        .slice(0, 3),
    },
    {
      title: "Completed journeys",
      items: results.filter((item) => item.status === "completed").slice(0, 3),
    },
  ];
  return (
    <>
      <PageIntro
        eyebrow="BETWEEN THE START AND THE CREDITS"
        title="Playthrough diary"
        description="Every wrong turn. Every discovery. A home for the stories that unfold while you play."
      />
      <div className="diary-intro-bar">
        <p className="form-help">
          Journals stay in this browser. Visibility preferences are local
          metadata; nothing is published or shared.
        </p>
        <button
          className="button button-primary"
          disabled={resource.status !== "ready"}
          onClick={() => setCreating(true)}
        >
          <BookOpen size={16} />
          Start a playthrough
        </button>
      </div>
      {resource.status === "loading" ? (
        <CatalogState />
      ) : resource.status === "error" ? (
        <CatalogState error retry={retry} />
      ) : (
        <>
          {gameId && (
            <div className="active-journal-bar">
              <span>Journals for {gameMap.get(gameId)?.title ?? gameId}</span>
              <button className="text-button" onClick={() => setParams({})}>
                Show all games
              </button>
            </div>
          )}
          {journals.playthroughs.length ? (
            <>
              <section
                className="personal-library-filters diary-filters"
                aria-label="Diary filters"
              >
                <label>
                  Search by game title
                  <input
                    name="diarySearch"
                    type="search"
                    placeholder="Find a game’s journeys"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </label>
                <label>
                  Playthrough status
                  <select
                    name="diaryStatus"
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                  >
                    <option value="">All statuses</option>
                    {playthroughStatuses.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Sort playthroughs
                  <select
                    name="diarySort"
                    value={sort}
                    onChange={(event) => setSort(event.target.value)}
                  >
                    <option value="recent">Recent activity</option>
                    <option value="start-newest">Start date · newest</option>
                    <option value="start-oldest">Start date · oldest</option>
                  </select>
                </label>
              </section>
              <div className="collection-bar results-bar">
                <p role="status">
                  {results.length}{" "}
                  {results.length === 1 ? "playthrough" : "playthroughs"}
                </p>
                <button
                  className="text-button"
                  onClick={() => {
                    setQuery("");
                    setStatus("");
                    setSort("recent");
                    setParams({});
                  }}
                  disabled={!query && !status && sort === "recent" && !gameId}
                >
                  Clear diary filters
                </button>
              </div>
              {results.length ? (
                <>
                  <div className="diary-highlights">
                    {highlights.map((group) => (
                      <section key={group.title}>
                        <h2>{group.title}</h2>
                        {group.items.length ? (
                          <ul>
                            {group.items.map((item) => (
                              <li key={item.id}>
                                <Link to={`/diary/${item.id}`}>
                                  {item.title}
                                  <span>
                                    {gameMap.get(item.gameId)?.title ??
                                      item.gameId}{" "}
                                    · #{item.playthroughNumber}
                                  </span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="sample-note">
                            No matching journeys yet.
                          </p>
                        )}
                      </section>
                    ))}
                  </div>
                  <section className="section">
                    <h2>All your playthroughs</h2>
                    <div className="playthrough-grid diary-playthroughs">
                      {results.map((item) => (
                        <PlaythroughCard
                          key={item.id}
                          playthrough={item}
                          game={gameMap.get(item.gameId)}
                        />
                      ))}
                    </div>
                  </section>
                </>
              ) : (
                <div className="journal-empty">
                  <h2>No journeys on this path.</h2>
                  <p>Try another game title or clear the filters.</p>
                  <button
                    className="button button-secondary"
                    onClick={() => {
                      setQuery("");
                      setStatus("");
                      setParams({});
                    }}
                  >
                    Show all playthroughs
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="journal-empty">
              <BookOpen size={32} />
              <h2>Your first chapter is still unwritten.</h2>
              <p>
                Start a separate playthrough for any game. Record chapters,
                missions, milestones, or simply how the session felt.
              </p>
              <button
                className="button button-secondary"
                onClick={() => setCreating(true)}
              >
                Start your first playthrough
              </button>
            </div>
          )}
          {creating && (
            <PlaythroughEditor
              games={games}
              gameId={gameMap.has(gameId) ? gameId : undefined}
              onClose={() => setCreating(false)}
              onSaved={(id) => navigate(`/diary/${id}`)}
            />
          )}
        </>
      )}
    </>
  );
}
