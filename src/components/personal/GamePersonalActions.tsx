import { useState } from "react";
import { Heart, Library, PenLine, Settings2 } from "lucide-react";
import type { Game } from "../../types";
import { usePersonalData } from "../../hooks/usePersonalData";
import { isStatus, statuses } from "../../lib/personal";
import type { PersonalAction } from "../../lib/personal";
import { RatingInput } from "./RatingInput";
import { LibraryEditor } from "./LibraryEditor";
import { ReviewEditor } from "./ReviewEditor";

export function GamePersonalActions({ game }: { game: Game }) {
  const { data, dispatch } = usePersonalData();
  const entry = data.library.find((entry) => entry.gameId === game.id);
  const review = data.reviews.find((review) => review.gameId === game.id);
  const [editing, setEditing] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  function save(action: PersonalAction, message: string) {
    const result = dispatch(action);
    setError(result.ok ? "" : result.message);
    setFeedback(result.ok ? message : "");
  }
  return (
    <section className="game-personal-actions" aria-label="Your game tracking">
      <p className="eyebrow">YOUR EXPERIENCE</p>
      <div className="personal-action-row">
        {entry ? (
          <label className="compact-status">
            Library status
            <select
              value={entry.status}
              onChange={(event) => {
                if (isStatus(event.target.value))
                  save(
                    {
                      type: "edit",
                      gameId: game.id,
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
        ) : (
          <button
            className="button button-primary"
            onClick={() =>
              save({ type: "add", gameId: game.id }, "Added to your backlog.")
            }
          >
            <Library size={16} />
            Add to Library
          </button>
        )}
        {entry && (
          <>
            <button
              className="button button-secondary"
              onClick={() => setEditing(true)}
            >
              <Settings2 size={15} />
              Edit details
            </button>
            <button
              className={`button button-secondary favorite-button ${entry.favoriteOrder !== undefined ? "is-favorite" : ""}`}
              aria-pressed={entry.favoriteOrder !== undefined}
              onClick={() =>
                save(
                  { type: "favorite", gameId: game.id },
                  entry.favoriteOrder !== undefined
                    ? "Removed from favorites."
                    : "Added to favorites.",
                )
              }
            >
              <Heart
                size={15}
                fill={
                  entry.favoriteOrder !== undefined ? "currentColor" : "none"
                }
              />
              {entry.favoriteOrder !== undefined ? "Favorited" : "Favorite"}
            </button>
          </>
        )}
      </div>
      <RatingInput
        value={entry?.rating}
        onChange={(rating) =>
          save(
            { type: "rate", gameId: game.id, rating },
            rating === undefined
              ? "Personal rating cleared."
              : "Personal rating saved.",
          )
        }
      />
      <button
        className="button button-secondary"
        onClick={() => setReviewing(true)}
      >
        <PenLine size={15} />
        {review ? "Edit Review" : "Write Review"}
      </button>
      <p className="form-help">
        Stored only on this device. Rating or reviewing an unsaved game adds it
        to Backlog. Playthrough journals below keep independent progress and
        provisional ratings.
      </p>
      {feedback && (
        <p className="save-feedback" role="status">
          {feedback}
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {editing && entry && (
        <LibraryEditor
          entry={entry}
          title={game.title}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setError("");
            setFeedback("Library details saved.");
          }}
        />
      )}
      {reviewing && (
        <ReviewEditor
          gameId={game.id}
          title={game.title}
          review={review}
          rating={entry?.rating}
          onClose={() => setReviewing(false)}
          onSaved={() => {
            setError("");
            setFeedback("Review saved on this device.");
          }}
        />
      )}
    </section>
  );
}
