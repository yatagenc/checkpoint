import { Link } from "react-router";
import type { Game, Playthrough } from "../../types";
import { playthroughStatuses } from "../../lib/journals";
import { formatReleaseDate } from "../../lib/discovery";
import { usePersonalData } from "../../hooks/usePersonalData";
import { GameArtwork } from "../games/GameArtwork";

export function PlaythroughCard({
  playthrough,
  game,
  active = false,
}: {
  playthrough: Playthrough;
  game?: Game;
  active?: boolean;
}) {
  const { journals } = usePersonalData();
  const count = journals.entries.filter(
    (entry) => entry.playthroughId === playthrough.id,
  ).length;
  return (
    <article
      className={`playthrough-card ${active ? "active-playthrough" : ""}`}
      data-playthrough-id={playthrough.id}
    >
      <Link
        className="playthrough-cover"
        to={`/diary/${playthrough.id}`}
        aria-label={`Open playthrough ${playthrough.playthroughNumber} for ${game?.title ?? playthrough.gameId}`}
      >
        <GameArtwork
          id={playthrough.gameId}
          title={game?.title ?? playthrough.gameId}
          coverUrl={game?.coverUrl}
        />
      </Link>
      <div>
        <p className="eyebrow">
          PLAYTHROUGH {playthrough.playthroughNumber}
          {active ? " · MOST RECENTLY ACTIVE" : ""}
        </p>
        <Link to={`/diary/${playthrough.id}`}>
          <h3>{playthrough.title}</h3>
        </Link>
        <Link
          className="playthrough-game-name"
          to={`/games/${playthrough.gameId}`}
        >
          {game?.title ?? `Unavailable game (${playthrough.gameId})`}
        </Link>
        <div className="journal-entry-meta">
          <span className="badge">
            {
              playthroughStatuses.find(
                (item) => item.value === playthrough.status,
              )?.label
            }
          </span>
          <span>
            {count} {count === 1 ? "entry" : "entries"}
          </span>
        </div>
        <p className="sample-note">
          Started {formatReleaseDate(playthrough.startedAt)}
          <br />
          Updated{" "}
          {new Intl.DateTimeFormat("en", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(playthrough.updatedAt))}
        </p>
        <Link className="text-link" to={`/diary/${playthrough.id}`}>
          Open timeline ↗
        </Link>
      </div>
    </article>
  );
}
