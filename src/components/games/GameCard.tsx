import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router";
import type { Game } from "../../types";
import { GameArtwork } from "./GameArtwork";
import { getReleaseYear } from "../../lib/discovery";
import {
  metacriticScores,
  metacriticPlatformLabel,
} from "../../lib/metacritic";

export function GameCard({ game }: { game: Game }) {
  const critic = metacriticScores(game)[0];
  return (
    <Link
      className="game-card group"
      to={`/games/${game.source.name === "RAWG" && game.providerIds?.rawg ? `rawg:${game.providerIds.rawg}` : game.id}`}
    >
      <div className="game-card-cover">
        <GameArtwork id={game.id} title={game.title} coverUrl={game.coverUrl} />
        {critic && (
          <span
            className="critic-badge"
            aria-label={`Metacritic ${critic.score} out of 100, ${metacriticPlatformLabel(critic)}`}
          >
            MC <strong>{critic.score}</strong>
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
      <p className="card-score-context">
        {critic
          ? `Metacritic · ${metacriticPlatformLabel(critic)}`
          : "Metacritic unavailable"}
      </p>
    </Link>
  );
}
