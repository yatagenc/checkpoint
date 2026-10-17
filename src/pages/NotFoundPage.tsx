import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";

export function NotFoundPage({ game = false }: { game?: boolean }) {
  return (
    <div className="not-found">
      <p className="eyebrow">{game ? "UNKNOWN GAME" : "404 / OFF THE MAP"}</p>
      <h1>
        {game ? "This game isn’t in our collection." : "An unexplored path."}
      </h1>
      <p>
        {game
          ? "This game is not in the local demo catalog. Explore the collection to continue."
          : "This page doesn’t exist. Let’s get you back to familiar ground."}
      </p>
      <Link className="button button-primary" to={game ? "/explore" : "/"}>
        <ArrowLeft size={16} />
        {game ? "Explore the collection" : "Back to home"}
      </Link>
    </div>
  );
}
