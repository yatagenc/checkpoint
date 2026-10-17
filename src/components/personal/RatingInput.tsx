import { useId } from "react";
import { Star } from "lucide-react";
import type { Rating } from "../../types";
import { isRating, ratingValues } from "../../lib/personal";

export function RatingInput({
  value,
  onChange,
  label = "Your rating",
}: {
  value: Rating | undefined;
  onChange: (value: Rating | undefined) => void;
  label?: string;
}) {
  const name = useId();
  return (
    <fieldset className="rating-input">
      <legend>{label}</legend>
      <select
        className="rating-select"
        aria-label={`${label} in half-star steps`}
        value={value ?? ""}
        onChange={(event) => {
          const rating = Number(event.target.value);
          if (!event.target.value) onChange(undefined);
          else if (isRating(rating)) onChange(rating);
        }}
      >
        <option value="">Not rated</option>
        {ratingValues.map((rating) => (
          <option key={rating} value={rating}>
            {rating} / 5
          </option>
        ))}
      </select>
      <div className="rating-stars">
        {ratingValues.map((rating) => (
          <label
            key={rating}
            className={`half-star ${Number.isInteger(rating) ? "right-half" : ""} ${(value ?? 0) >= rating ? "selected" : ""}`}
            title={`${rating} out of 5 stars`}
          >
            <input
              className="sr-only"
              type="radio"
              name={name}
              value={rating}
              aria-label={`${rating} out of 5 stars`}
              checked={value === rating}
              onChange={() => onChange(rating)}
            />
            <Star aria-hidden="true" size={36} strokeWidth={1.25} />
          </label>
        ))}
      </div>
      <div className="rating-caption">
        <output>{value === undefined ? "Not rated" : `${value} / 5`}</output>
        <button
          type="button"
          className="text-button"
          disabled={value === undefined}
          onClick={() => onChange(undefined)}
        >
          Clear rating
        </button>
      </div>
    </fieldset>
  );
}
