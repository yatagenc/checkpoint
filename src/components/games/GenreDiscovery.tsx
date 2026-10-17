import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router";
import { useGenres } from "../../hooks/useGenres";
import { SectionHeading } from "../ui/SectionHeading";
export function GenreDiscovery() {
  const { state, retry } = useGenres();
  return (
    <section
      className="section genre-section"
      aria-label="RAWG genre discovery"
    >
      <SectionHeading
        eyebrow="FOLLOW YOUR CURIOSITY"
        title="Discover by genre"
      />
      <p className="sample-note">
        Genre totals provided by{" "}
        <a
          href="https://rawg.io"
          className="text-link"
          target="_blank"
          rel="noreferrer"
        >
          RAWG ↗
        </a>{" "}
        · May change as the database is updated.
      </p>
      {!state ? (
        <p className="subtle-notice" role="status">
          Loading RAWG genres…
        </p>
      ) : state.error ? (
        <div className="subtle-notice" role="alert">
          <p>{state.error} Counts are unavailable.</p>
          <button className="button button-secondary" onClick={retry}>
            Retry genres
          </button>
        </div>
      ) : !state.data?.genres.length ? (
        <p className="subtle-notice" role="status">
          Genre information is currently unavailable. Explore games to continue
          discovering.
        </p>
      ) : (
        <>
          <div className="genre-grid">
            {state.data.genres.map((genre) => (
              <Link
                key={genre.id}
                to={`/explore?${new URLSearchParams({ genre: String(genre.id) })}`}
              >
                <span>{genre.name}</span>
                <small>
                  {genre.gamesCount.toLocaleString("en")}{" "}
                  {genre.gamesCount === 1 ? "game" : "games"} on RAWG
                </small>
                <ArrowUpRight size={17} />
              </Link>
            ))}
          </div>
          {state.data.hasNext && (
            <p className="sample-note">
              Showing the first {state.data.genres.length} RAWG genres. More
              genre metadata is available from RAWG; no game pages were
              downloaded for these counts.
            </p>
          )}
        </>
      )}
    </section>
  );
}
