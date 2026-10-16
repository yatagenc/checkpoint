import { ArrowLeft, BookOpen, Library, ShieldCheck } from "lucide-react";
import { Link, useParams } from "react-router";
import { games } from "../data/games";
import { GameArtwork } from "../components/games/GameArtwork";
import { NotFoundPage } from "./NotFoundPage";

export function GameDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const game = games.find((game) => game.id === id);
  if (!game) return <NotFoundPage game />;
  return (
    <>
      <Link className="text-link back-link" to="/explore">
        <ArrowLeft size={15} /> Back to explore
      </Link>
      <div className="game-details">
        <GameArtwork id={game.id} title={game.title} />
        <div className="game-detail-copy">
          <span className="badge">Sample game details</span>
          <p className="eyebrow mt-6">
            {game.releaseDate.slice(0, 4)} · {game.developer}
          </p>
          <h1>{game.title}</h1>
          <div className="tag-list">
            {game.genres.map((genre) => (
              <span key={genre}>{genre}</span>
            ))}
          </div>
          <p className="game-summary">{game.summary}</p>
          <dl className="game-metadata">
            <div>
              <dt>Platforms</dt>
              <dd>
                {game.platforms.map((platform) => platform.name).join(" · ")}
              </dd>
            </div>
            <div>
              <dt>Release date</dt>
              <dd>
                {new Intl.DateTimeFormat("en", {
                  dateStyle: "long",
                  timeZone: "UTC",
                }).format(new Date(game.releaseDate))}
              </dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-3">
            <Link className="button button-secondary" to="/library">
              <Library size={16} /> My library
            </Link>
            <Link className="button button-secondary" to="/diary">
              <BookOpen size={16} /> Playthrough diary
            </Link>
          </div>
        </div>
      </div>
      <section className="review-placeholder">
        <ShieldCheck size={23} />
        <div>
          <h2>Every perspective has a place.</h2>
          <p>
            Half-star ratings, reviews, and spoiler-aware conversations are
            coming in a future phase.
          </p>
        </div>
        <span className="badge">Coming later</span>
      </section>
    </>
  );
}
