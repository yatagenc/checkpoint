import { useState } from "react";
import { Link } from "react-router";
import { Heart, Pencil, Trash2 } from "lucide-react";
import type { Game, LibraryEntry } from "../../types";
import type { PersonalAction } from "../../lib/personal";
import { isStatus, statuses } from "../../lib/personal";
import { usePersonalData } from "../../hooks/usePersonalData";
import { GameArtwork } from "../games/GameArtwork";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { LibraryEditor } from "./LibraryEditor";

export function LibraryCard({
  entry,
  game,
}: {
  entry: LibraryEntry;
  game?: Game;
}) {
  const { dispatch, journals } = usePersonalData();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const title = game?.title ?? `Unavailable game (${entry.gameId})`;
  function save(action: PersonalAction, message: string) {
    const result = dispatch(action);
    setError(result.ok ? "" : result.message);
    setFeedback(result.ok ? message : "");
  }
  return (
    <article className="library-card" data-game-id={entry.gameId}>
      <Link to={`/games/${entry.gameId}`} className="library-cover">
        <GameArtwork
          id={entry.gameId}
          title={title}
          coverUrl={game?.coverUrl}
        />
      </Link>
      <div className="library-card-content">
        <div className="library-card-heading">
          <Link to={`/games/${entry.gameId}`}>
            <h2>{title}</h2>
          </Link>
          <button
            className={`icon-button favorite-button ${entry.favoriteOrder !== undefined ? "is-favorite" : ""}`}
            aria-label={`${entry.favoriteOrder !== undefined ? "Remove" : "Add"} ${title} ${entry.favoriteOrder !== undefined ? "from" : "to"} favorites`}
            aria-pressed={entry.favoriteOrder !== undefined}
            onClick={() =>
              save(
                { type: "favorite", gameId: entry.gameId },
                entry.favoriteOrder !== undefined
                  ? "Favorite removed."
                  : "Favorite saved.",
              )
            }
          >
            <Heart
              size={18}
              fill={entry.favoriteOrder !== undefined ? "currentColor" : "none"}
            />
          </button>
        </div>
        <label className="compact-status">
          Status for {title}
          <select
            value={entry.status}
            onChange={(event) => {
              if (isStatus(event.target.value))
                save(
                  {
                    type: "edit",
                    gameId: entry.gameId,
                    changes: { ...entry, status: event.target.value },
                  },
                  "Status saved.",
                );
            }}
          >
            {statuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </label>
        <div className="library-entry-meta">
          <span className="personal-score">
            {entry.rating !== undefined
              ? `${entry.rating} / 5 · Your rating`
              : "Not rated"}
          </span>
          <span>
            {entry.playtimeHours === undefined
              ? "Playtime not logged"
              : `${entry.playtimeHours} h logged`}
          </span>
          <span>
            Added{" "}
            {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
              new Date(entry.addedAt),
            )}
          </span>
          {entry.completedAt && <span>Completed {entry.completedAt}</span>}
        </div>
        {journals.playthroughs.some((item) => item.gameId === entry.gameId) && (
          <Link
            className="library-journal-link"
            to={`/diary?${new URLSearchParams({ game: entry.gameId })}`}
          >
            {
              journals.playthroughs.filter(
                (item) => item.gameId === entry.gameId,
              ).length
            }{" "}
            playthrough journals ↗
          </Link>
        )}
        {entry.notes && <p className="library-notes">{entry.notes}</p>}
        <div className="library-card-actions">
          <button className="text-button" onClick={() => setEditing(true)}>
            <Pencil size={13} />
            Edit details
          </button>
          <button
            className="text-button danger-text"
            onClick={() => setDeleting(true)}
          >
            <Trash2 size={13} />
            Remove
          </button>
        </div>
        {feedback && (
          <p role="status" className="save-feedback">
            {feedback}
          </p>
        )}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
      </div>
      {editing && (
        <LibraryEditor
          entry={entry}
          title={title}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setError("");
            setFeedback("Library details saved.");
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={`Remove ${title}?`}
          description="This permanently deletes this game’s library entry, notes, playtime, personal rating, favorite selection, and any saved review from this device. Independent playthrough journals will be kept."
          onClose={() => setDeleting(false)}
          onConfirm={() => dispatch({ type: "remove", gameId: entry.gameId })}
        />
      )}
    </article>
  );
}
