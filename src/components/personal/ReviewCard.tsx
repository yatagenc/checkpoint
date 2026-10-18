import { useState } from "react";
import { Link } from "react-router";
import type { Review } from "../../types";
import { usePersonalData } from "../../hooks/usePersonalData";
import { visibilityOptions } from "../../lib/personal";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { ReviewEditor } from "./ReviewEditor";

export function ReviewCard({
  review,
  gameTitle,
}: {
  review: Review;
  gameTitle: string;
}) {
  const { dispatch, data } = usePersonalData();
  const [revealed, setRevealed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const hidden = review.containsSpoilers && !revealed;
  return (
    <article className="review-card">
      <div className="review-card-header">
        <Link to={`/games/${review.gameId}`}>{gameTitle}</Link>
        <span className="personal-score">
          {review.rating !== undefined
            ? `${review.rating} / 5 · Your rating`
            : "Not rated"}
        </span>
      </div>
      <div className="review-meta">
        <span>
          Created{" "}
          <time dateTime={review.createdAt}>
            {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
              new Date(review.createdAt),
            )}
          </time>
        </span>
        <span>
          Updated{" "}
          <time dateTime={review.updatedAt}>
            {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
              new Date(review.updatedAt),
            )}
          </time>
        </span>
        <span>
          {
            visibilityOptions.find(
              (option) => option.value === review.visibility,
            )?.label
          }{" "}
          · local preference
        </span>
      </div>
      <div id={`review-content-${review.id}`}>
        {hidden ? (
          <div className="spoiler-cover">
            <p>This review contains spoilers.</p>
          </div>
        ) : (
          <>
            {review.title && <h3>{review.title}</h3>}
            <p className="review-text">{review.text}</p>
          </>
        )}
      </div>
      {review.containsSpoilers && (
        <button
          className={
            hidden ? "button button-secondary reveal-entry" : "text-button"
          }
          aria-expanded={revealed}
          aria-controls={`review-content-${review.id}`}
          onClick={() => setRevealed((value) => !value)}
        >
          {hidden ? "Reveal review" : "Hide spoilers"}
        </button>
      )}
      <div className="review-controls">
        <button className="text-button" onClick={() => setEditing(true)}>
          Edit review
        </button>
        <button
          className="text-button danger-text"
          onClick={() => setDeleting(true)}
        >
          Delete review
        </button>
      </div>
      {feedback && (
        <p role="status" className="save-feedback">
          {feedback}
        </p>
      )}
      {editing && (
        <ReviewEditor
          gameId={review.gameId}
          title={gameTitle}
          review={review}
          rating={
            data.library.find((entry) => entry.gameId === review.gameId)?.rating
          }
          onClose={() => setEditing(false)}
          onSaved={() => {
            setRevealed(false);
            setFeedback("Review saved on this device.");
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete this review?"
          description="This permanently removes the review from this device. Your library entry and personal rating will be kept."
          onClose={() => setDeleting(false)}
          onConfirm={() =>
            dispatch({ type: "delete-review", gameId: review.gameId })
          }
        />
      )}
    </article>
  );
}
