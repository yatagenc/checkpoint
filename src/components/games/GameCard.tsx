import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router";
import type { Game } from "../../types";
import { GameArtwork } from "./GameArtwork";
import { getReleaseYear } from "../../lib/discovery";

export function GameCard({ game }: { game: Game }) {
  return (
    <Link className="game-card group" to={`/games/${game.id}`}>
      <div className="game-card-cover">
        <GameArtwork id={game.id} title={game.title} coverUrl={game.coverUrl} />
        {game.metacritic && (
          <span
            className="critic-badge"
            aria-label={`Metacritic ${game.metacritic.score} out of 100, ${game.metacritic.platform}`}
          >
            MC <strong>{game.metacritic.score}</strong>
          </span>
        )}
      </div>
      <div className="game-card-title">
        <h3>{game.title}</h3>
        <ArrowUpRight size={15} />
      </div>
      <p>
        {getReleaseYear(game) ?? "Year unavailable"}
        {game.genres[0] && (
          <>
            <span>·</span> {game.genres[0]}
          </>
        )}
      </p>
    </Link>
  );
}
