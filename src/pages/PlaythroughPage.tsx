import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Plus } from "lucide-react";
import { usePersonalData } from "../hooks/usePersonalData";
import { useGames } from "../hooks/useGames";
import { chronologicalEntries, playthroughStatuses } from "../lib/journals";
import { formatReleaseDate } from "../lib/discovery";
import { PageIntro } from "../components/ui/PageIntro";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { JournalEntryCard } from "../components/journals/JournalEntryCard";
import { JournalEntryEditor } from "../components/journals/JournalEntryEditor";
import { PlaythroughEditor } from "../components/journals/PlaythroughEditor";

export function PlaythroughPage() {
  const { playthroughId = "" } = useParams<{ playthroughId: string }>();
  return <PlaythroughView key={playthroughId} playthroughId={playthroughId} />;
}
function PlaythroughView({ playthroughId }: { playthroughId: string }) {
  const { journals, dispatchJournal } = usePersonalData();
  const { resource } = useGames();
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const playthrough = journals.playthroughs.find(
    (item) => item.id === playthroughId,
  );
  useEffect(() => {
    document.title = `${playthrough?.title ?? "Playthrough not found"} — Checkpoint`;
  }, [playthrough?.title]);
  if (!playthrough)
    return (
      <div className="not-found">
        <p className="eyebrow">JOURNEY NOT FOUND</p>
        <h1>This playthrough isn’t on your shelf.</h1>
        <p>
          It may have been deleted or saved in another browser. Your other
          journeys are still in the diary.
        </p>
        <Link className="button button-primary" to="/diary">
          Back to diary
        </Link>
      </div>
    );
  const games = resource.status === "ready" ? resource.data : [];
  const game = games.find((game) => game.id === playthrough.gameId);
  const entries = chronologicalEntries(
    journals.entries.filter((entry) => entry.playthroughId === playthrough.id),
  );
  return (
    <>
      <Link className="text-link back-link" to="/diary">
        <ArrowLeft size={15} />
        All playthroughs
      </Link>
      <PageIntro
        eyebrow={`PLAYTHROUGH ${playthrough.playthroughNumber} · ${playthroughStatuses.find((item) => item.value === playthrough.status)?.label}`}
        title={playthrough.title}
        description={game?.title ?? `Game: ${playthrough.gameId}`}
      />
      <div className="playthrough-toolbar">
        <Link to={`/games/${playthrough.gameId}`} className="text-link">
          View game ↗
        </Link>
        <button
          className="button button-secondary"
          onClick={() => setEditing(true)}
        >
          Edit playthrough
        </button>
        <button
          className="button button-primary"
          onClick={() => setAdding(true)}
        >
          <Plus size={15} />
          Add journal entry
        </button>
        <button
          className="text-button danger-text"
          onClick={() => setDeleting(true)}
        >
          Delete playthrough
        </button>
      </div>
      <dl className="playthrough-facts">
        <div>
          <dt>Started</dt>
          <dd>{formatReleaseDate(playthrough.startedAt)}</dd>
        </div>
        <div>
          <dt>Completed</dt>
          <dd>
            {playthrough.completedAt
              ? formatReleaseDate(playthrough.completedAt)
              : "Not recorded"}
          </dd>
        </div>
        <div>
          <dt>Platform</dt>
          <dd>{playthrough.platform || "Not specified"}</dd>
        </div>
        <div>
          <dt>Difficulty</dt>
          <dd>{playthrough.difficulty || "Not specified"}</dd>
        </div>
      </dl>
      {playthrough.notes && (
        <p className="playthrough-notes">{playthrough.notes}</p>
      )}
      <p className="local-preference-note">
        This is a local journal. Visibility preferences do not share entries or
        enforce access controls. Spoiler concealment is a viewing preference,
        not encryption. Library status, playtime, and personal ratings remain
        independent.
      </p>
      <div className="section-heading timeline-heading">
        <h2>Your journey, one moment at a time</h2>
        <span className="sample-note">
          {entries.length} {entries.length === 1 ? "entry" : "entries"} · Oldest
          first
        </span>
      </div>
      {entries.length ? (
        <ol className="journal-timeline">
          {entries.map((entry) => (
            <li key={`${entry.id}:${entry.updatedAt}`}>
              <JournalEntryCard entry={entry} />
            </li>
          ))}
        </ol>
      ) : (
        <div className="journal-empty">
          <h2>A blank page, a whole world ahead.</h2>
          <p>
            Record a chapter, mission, milestone, or a general update. There’s
            no fixed way to play.
          </p>
          <button
            className="button button-secondary"
            onClick={() => setAdding(true)}
          >
            Write your first entry
          </button>
        </div>
      )}
      {adding && (
        <JournalEntryEditor
          playthroughId={playthrough.id}
          onClose={() => setAdding(false)}
          onSaved={() => {}}
        />
      )}
      {editing && (
        <PlaythroughEditor
          games={games}
          playthrough={playthrough}
          onClose={() => setEditing(false)}
          onSaved={() => {}}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete this playthrough?"
          description={`This permanently deletes this playthrough and all ${entries.length} associated journal entries from this device. Other playthroughs, library records and reviews will be kept.`}
          onClose={() => setDeleting(false)}
          onConfirm={() =>
            dispatchJournal({ type: "delete-playthrough", id: playthrough.id })
          }
        />
      )}
    </>
  );
}
