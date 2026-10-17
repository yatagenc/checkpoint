import { useState } from "react";
import type { FormEvent } from "react";
import type { GameStatus, LibraryEntry, Rating } from "../../types";
import { isStatus, parsePlaytime, statuses } from "../../lib/personal";
import { usePersonalData } from "../../hooks/usePersonalData";
import { Modal } from "../ui/Modal";
import { RatingInput } from "./RatingInput";

export function LibraryEditor({
  entry,
  title,
  onClose,
  onSaved,
}: {
  entry: LibraryEntry;
  title: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { dispatch } = usePersonalData();
  const [status, setStatus] = useState<GameStatus>(entry.status);
  const [playtime, setPlaytime] = useState(
    entry.playtimeHours?.toString() ?? "",
  );
  const [rating, setRating] = useState<Rating | undefined>(entry.rating);
  const [notes, setNotes] = useState(entry.notes ?? "");
  const [completedAt, setCompletedAt] = useState(entry.completedAt ?? "");
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const result = dispatch({
        type: "edit",
        gameId: entry.gameId,
        changes: {
          status,
          playtimeHours: parsePlaytime(playtime),
          rating,
          notes,
          completedAt: completedAt || undefined,
        },
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onSaved();
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Check your details.");
    }
  }
  return (
    <Modal title={`Your collection · ${title}`} onClose={onClose}>
      <form className="personal-form" noValidate onSubmit={submit}>
        <div className="form-grid">
          <label>
            Status
            <select
              name="status"
              value={status}
              onChange={(event) => {
                if (isStatus(event.target.value)) setStatus(event.target.value);
              }}
            >
              {statuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Total playtime (hours)
            <input
              type="text"
              name="playtime"
              inputMode="decimal"
              value={playtime}
              onChange={(event) => setPlaytime(event.target.value)}
              placeholder="e.g. 12.5"
            />
          </label>
          <label>
            Date completed (optional)
            <input
              type="date"
              name="completedAt"
              value={completedAt}
              onChange={(event) => setCompletedAt(event.target.value)}
            />
          </label>
        </div>
        <RatingInput value={rating} onChange={setRating} />
        <label>
          Personal notes (optional)
          <textarea
            name="notes"
            rows={4}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
        <p className="form-help">
          Ratings also update your review’s rating. Status is always your
          choice; rating a game never marks it completed.
        </p>
        {error && (
          <p className="form-error" role="alert">
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
          <button className="button button-primary" type="submit">
            Save changes
          </button>
        </div>
      </form>
    </Modal>
  );
}
