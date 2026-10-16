import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router";
import type { Game } from "../../types";
import { GameArtwork } from "./GameArtwork";

export function GameCard({ game }: { game: Game }) {
  return (
    <Link className="game-card group" to={`/games/${game.id}`}>
      <GameArtwork id={game.id} title={game.title} />
      <div className="game-card-title">
        <h3>{game.title}</h3>
        <ArrowUpRight size={15} />
      </div>
      <p>
        {game.releaseDate.slice(0, 4)} <span>·</span> {game.genres[0]}
      </p>
    </Link>
  );
}
