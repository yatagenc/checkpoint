import { useState } from "react";
import type { FormEvent } from "react";
import type { Game, Playthrough, PlaythroughStatus } from "../../types";
import {
  isPlaythroughStatus,
  localToday,
  playthroughStatuses,
} from "../../lib/journals";
import { usePersonalData } from "../../hooks/usePersonalData";
import { Modal } from "../ui/Modal";

export function PlaythroughEditor({
  games,
  gameId,
  playthrough,
  onClose,
  onSaved,
}: {
  games: readonly Game[];
  gameId?: string;
  playthrough?: Playthrough;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const { dispatchJournal } = usePersonalData();
  const [selectedGame, setGame] = useState(playthrough?.gameId ?? gameId ?? "");
  const [title, setTitle] = useState(playthrough?.title ?? "");
  const [startedAt, setStart] = useState(
    playthrough?.startedAt ?? localToday(),
  );
  const [completedAt, setEnd] = useState(playthrough?.completedAt ?? "");
  const [status, setStatus] = useState<PlaythroughStatus>(
    playthrough?.status ?? "in-progress",
  );
  const [platform, setPlatform] = useState(playthrough?.platform ?? "");
  const [difficulty, setDifficulty] = useState(playthrough?.difficulty ?? "");
  const [notes, setNotes] = useState(playthrough?.notes ?? "");
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!playthrough && !games.some((game) => game.id === selectedGame)) {
      setError("Choose a game from the catalog.");
      return;
    }
    const changes = {
      title,
      startedAt,
      completedAt: completedAt || undefined,
      status,
      platform,
      difficulty,
      notes,
    };
    const result = dispatchJournal(
      playthrough
        ? { type: "edit-playthrough", id: playthrough.id, changes }
        : { type: "create-playthrough", gameId: selectedGame, changes },
    );
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onClose();
    if (result.id) onSaved(result.id);
  }
  return (
    <Modal
      title={playthrough ? "Edit playthrough" : "Start a playthrough"}
      onClose={onClose}
    >
      <form className="personal-form" noValidate onSubmit={submit}>
        <label>
          Game
          <select
            name="gameId"
            value={selectedGame}
            disabled={Boolean(playthrough || gameId)}
            onChange={(event) => setGame(event.target.value)}
          >
            <option value="">Choose a game</option>
            {!games.some((game) => game.id === selectedGame) &&
              selectedGame && (
                <option value={selectedGame}>
                  Unavailable game ({selectedGame})
                </option>
              )}
            {games.map((game) => (
              <option key={game.id} value={game.id}>
                {game.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Playthrough title
          <input
            name="playthroughTitle"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="First journey, New Game+, a fresh start…"
            required
          />
        </label>
        <div className="form-grid">
          <label>
            Start date
            <input
              name="startedAt"
              type="date"
              value={startedAt}
              onChange={(event) => setStart(event.target.value)}
            />
          </label>
          <label>
            Completion date (optional)
            <input
              name="completedAt"
              type="date"
              value={completedAt}
              onChange={(event) => setEnd(event.target.value)}
            />
          </label>
          <label>
            Playthrough status
            <select
              name="playthroughStatus"
              value={status}
              onChange={(event) => {
                if (isPlaythroughStatus(event.target.value))
                  setStatus(event.target.value);
              }}
            >
              {playthroughStatuses.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Platform (optional)
            <input
              name="platform"
              value={platform}
              onChange={(event) => setPlatform(event.target.value)}
              placeholder="Your platform"
            />
          </label>
          <label>
            Difficulty (optional)
            <input
              name="difficulty"
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value)}
              placeholder="Any difficulty or custom rules"
            />
          </label>
        </div>
        <label>
          Playthrough notes (optional)
          <textarea
            name="playthroughNotes"
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
        <p className="form-help">
          A separate journey for this game. Its status, hours, and ratings do
          not change your library or review. Playthrough information is not
          spoiler-concealed; use entry spoiler flags for sensitive details.
        </p>
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
            {playthrough ? "Save playthrough" : "Create playthrough"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
