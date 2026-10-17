import { useState } from "react";
import type { PlaythroughEntry } from "../../types";
import { journalEntryTypes } from "../../lib/journals";
import { visibilityOptions } from "../../lib/personal";
import { formatReleaseDate } from "../../lib/discovery";
import { usePersonalData } from "../../hooks/usePersonalData";
import { Modal } from "../ui/Modal";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { JournalEntryEditor } from "./JournalEntryEditor";

export function JournalEntryCard({ entry }: { entry: PlaythroughEntry }) {
  const { dispatchJournal } = usePersonalData();
  const [revealed, setRevealed] = useState(false);
  const [reading, setReading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const hidden = entry.containsSpoilers && !revealed;
  return (
    <article className="journal-entry" data-entry-id={entry.id}>
      <div className="journal-entry-meta">
        <time dateTime={entry.entryDate}>
          {formatReleaseDate(entry.entryDate)}
        </time>
        <span>
          {journalEntryTypes.find((item) => item.value === entry.type)?.label}
        </span>
        <span>
          {
            visibilityOptions.find((item) => item.value === entry.visibility)
              ?.label
          }{" "}
          · local preference
        </span>
        {entry.containsSpoilers && (
          <span className="spoiler-badge">Spoiler-sensitive entry</span>
        )}
      </div>
      <div className="journal-entry-metrics">
        {entry.progressPercent !== undefined && (
          <span>{entry.progressPercent}% progress</span>
        )}
        {entry.playtimeHours !== undefined && (
          <span>{entry.playtimeHours} h at entry</span>
        )}
        {entry.provisionalRating !== undefined && (
          <span className="personal-score">
            {entry.provisionalRating} / 5 · Provisional
          </span>
        )}
      </div>
      <div id={`journal-content-${entry.id}`}>
        {hidden ? (
          <div className="spoiler-cover">
            <h3>Spoiler-sensitive update</h3>
            <p>Title, chapter label, and journal content are concealed.</p>
          </div>
        ) : (
          <>
            <h3>{entry.title}</h3>
            {entry.chapterLabel && (
              <p className="journal-chapter">{entry.chapterLabel}</p>
            )}
            <p className="journal-preview">
              {entry.content.slice(0, 220)}
              {entry.content.length > 220 ? "…" : ""}
            </p>
            <button className="text-button" onClick={() => setReading(true)}>
              Open full entry
            </button>
          </>
        )}
      </div>
      {entry.containsSpoilers && (
        <button
          className={
            hidden
              ? "button button-secondary reveal-entry"
              : "text-button conceal-entry"
          }
          aria-expanded={revealed}
          aria-controls={`journal-content-${entry.id}`}
          onClick={() => {
            setReading(false);
            setRevealed((value) => !value);
          }}
        >
          {hidden ? "Reveal entry" : "Hide spoilers"}
        </button>
      )}
      <div className="review-controls">
        {!hidden ? (
          <button className="text-button" onClick={() => setEditing(true)}>
            Edit entry
          </button>
        ) : (
          <span className="form-help">
            Reveal this entry to read or edit its text.
          </span>
        )}
        <button
          className="text-button danger-text"
          onClick={() => setDeleting(true)}
        >
          Delete entry
        </button>
      </div>
      {reading && !hidden && (
        <Modal title={entry.title} onClose={() => setReading(false)}>
          <p className="sample-note">
            {formatReleaseDate(entry.entryDate)}
            {entry.chapterLabel ? ` · ${entry.chapterLabel}` : ""}
          </p>
          <p className="review-text">{entry.content}</p>
          <button
            className="button button-secondary reading-close"
            onClick={() => setReading(false)}
          >
            Back to timeline
          </button>
        </Modal>
      )}
      {editing && !hidden && (
        <JournalEntryEditor
          playthroughId={entry.playthroughId}
          entry={entry}
          onClose={() => setEditing(false)}
          onSaved={() => setRevealed(false)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete this journal entry?"
          description="Only this entry will be permanently removed from this device. Other entries and the playthrough will be kept."
          onClose={() => setDeleting(false)}
          onConfirm={() =>
            dispatchJournal({ type: "delete-entry", id: entry.id })
          }
        />
      )}
    </article>
  );
}
