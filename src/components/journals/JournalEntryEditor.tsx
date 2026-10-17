import { useState } from "react";
import type { FormEvent } from "react";
import type {
  JournalEntryType,
  PlaythroughEntry,
  Rating,
  Visibility,
} from "../../types";
import {
  isEntryType,
  journalEntryTypes,
  localToday,
  parseProgress,
} from "../../lib/journals";
import {
  isVisibility,
  parsePlaytime,
  visibilityOptions,
} from "../../lib/personal";
import { usePersonalData } from "../../hooks/usePersonalData";
import { Modal } from "../ui/Modal";
import { RatingInput } from "../personal/RatingInput";

export function JournalEntryEditor({
  playthroughId,
  entry,
  onClose,
  onSaved,
}: {
  playthroughId: string;
  entry?: PlaythroughEntry;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const { dispatchJournal } = usePersonalData();
  const [title, setTitle] = useState(entry?.title ?? "");
  const [type, setType] = useState<JournalEntryType>(
    entry?.type ?? "general-update",
  );
  const [label, setLabel] = useState(entry?.chapterLabel ?? "");
  const [content, setContent] = useState(entry?.content ?? "");
  const [date, setDate] = useState(entry?.entryDate ?? localToday());
  const [progress, setProgress] = useState(
    entry?.progressPercent?.toString() ?? "",
  );
  const [hours, setHours] = useState(entry?.playtimeHours?.toString() ?? "");
  const [rating, setRating] = useState<Rating | undefined>(
    entry?.provisionalRating,
  );
  const [spoilers, setSpoilers] = useState(entry?.containsSpoilers ?? false);
  const [visibility, setVisibility] = useState<Visibility>(
    entry?.visibility ?? "private",
  );
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const result = dispatchJournal({
        type: "save-entry",
        playthroughId,
        id: entry?.id,
        changes: {
          title,
          type,
          chapterLabel: label,
          content,
          entryDate: date,
          progressPercent: parseProgress(progress),
          playtimeHours: parsePlaytime(hours),
          provisionalRating: rating,
          containsSpoilers: spoilers,
          visibility,
        },
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onClose();
      if (result.id) onSaved(result.id);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Check your journal details.",
      );
    }
  }
  return (
    <Modal
      title={entry ? "Edit journal entry" : "Add journal entry"}
      onClose={onClose}
    >
      <form className="personal-form" noValidate onSubmit={submit}>
        <p className="local-preference-note">
          Stored only in this browser. Visibility is a local preference, not
          access control or online sharing. Spoiler concealment is a viewing
          choice, not encryption.
        </p>
        <label>
          Entry title
          <input
            name="entryTitle"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <div className="form-grid">
          <label>
            Entry type
            <select
              name="entryType"
              value={type}
              onChange={(event) => {
                if (isEntryType(event.target.value))
                  setType(event.target.value);
              }}
            >
              {journalEntryTypes.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Entry date
            <input
              name="entryDate"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <label>
            Chapter or mission label (optional)
            <input
              name="chapterLabel"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="A place, mission, chapter, or your own milestone"
            />
          </label>
          <label>
            Progress percentage (optional)
            <input
              name="progressPercent"
              type="text"
              inputMode="decimal"
              value={progress}
              onChange={(event) => setProgress(event.target.value)}
              placeholder="0–100"
            />
          </label>
          <label>
            Total playtime at entry (hours, optional)
            <input
              name="entryPlaytime"
              type="text"
              inputMode="decimal"
              value={hours}
              onChange={(event) => setHours(event.target.value)}
              placeholder="e.g. 12.5"
            />
          </label>
        </div>
        <label>
          Journal content
          <textarea
            name="entryContent"
            required
            rows={7}
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />
        </label>
        <RatingInput
          label="Provisional rating"
          value={rating}
          onChange={setRating}
        />
        <p className="form-help">
          A snapshot of your opinion at this point. This does not replace your
          personal game or review rating.
        </p>
        <label className="checkbox-label">
          <input
            name="entrySpoilers"
            type="checkbox"
            checked={spoilers}
            onChange={(event) => setSpoilers(event.target.checked)}
          />
          Contains spoilers — conceal title, label and written content
        </label>
        <label>
          Visibility preference
          <select
            name="entryVisibility"
            value={visibility}
            onChange={(event) => {
              if (isVisibility(event.target.value))
                setVisibility(event.target.value);
            }}
          >
            {visibilityOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button
            className="button button-secondary"
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="button button-primary" type="submit">
            Save journal entry
          </button>
        </div>
      </form>
    </Modal>
  );
}
