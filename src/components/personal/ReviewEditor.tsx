import { useState } from "react";
import type { FormEvent } from "react";
import type { Rating, Review, Visibility } from "../../types";
import { isVisibility, visibilityOptions } from "../../lib/personal";
import { usePersonalData } from "../../hooks/usePersonalData";
import { Modal } from "../ui/Modal";
import { RatingInput } from "./RatingInput";

export function ReviewEditor({
  gameId,
  title,
  review,
  rating,
  onClose,
  onSaved,
}: {
  gameId: string;
  title: string;
  review?: Review;
  rating?: Rating;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { dispatch } = usePersonalData();
  const [reviewTitle, setTitle] = useState(review?.title ?? "");
  const [text, setText] = useState(review?.text ?? "");
  const [score, setScore] = useState(rating);
  const [spoilers, setSpoilers] = useState(review?.containsSpoilers ?? false);
  const [visibility, setVisibility] = useState<Visibility>(
    review?.visibility ?? "private",
  );
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = dispatch({
      type: "save-review",
      gameId,
      changes: {
        title: reviewTitle,
        text,
        rating: score,
        containsSpoilers: spoilers,
        visibility,
      },
    });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onSaved();
    onClose();
  }
  return (
    <Modal
      title={`${review ? "Edit" : "Write"} review · ${title}`}
      onClose={onClose}
    >
      <form className="personal-form" noValidate onSubmit={submit}>
        <p className="local-preference-note">
          Stored only in this browser. Visibility is a local preference, not
          access control. Public and Friends Only do not publish or share your
          review.
        </p>
        <label>
          Review title (optional)
          <input
            name="reviewTitle"
            value={reviewTitle}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label>
          Review text
          <textarea
            name="reviewText"
            required
            rows={7}
            value={text}
            onChange={(event) => setText(event.target.value)}
            aria-invalid={error && !text.trim() ? true : undefined}
          />
        </label>
        <RatingInput value={score} onChange={setScore} />
        <label className="checkbox-label">
          <input
            type="checkbox"
            name="spoilers"
            checked={spoilers}
            onChange={(event) => setSpoilers(event.target.checked)}
          />
          This review contains spoilers
        </label>
        <label>
          Visibility preference
          <select
            name="visibility"
            value={visibility}
            onChange={(event) => {
              if (isVisibility(event.target.value))
                setVisibility(event.target.value);
            }}
          >
            {visibilityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <p className="form-help">
          Saving keeps one review per game and updates your personal rating. A
          game outside your library is added to Backlog.
        </p>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button type="submit" className="button button-primary">
            Save review
          </button>
        </div>
      </form>
    </Modal>
  );
}
