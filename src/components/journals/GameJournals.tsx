import { useState } from "react";
import { useNavigate } from "react-router";
import { BookOpen } from "lucide-react";
import type { Game } from "../../types";
import { usePersonalData } from "../../hooks/usePersonalData";
import { SectionHeading } from "../ui/SectionHeading";
import { PlaythroughEditor } from "./PlaythroughEditor";
import { PlaythroughCard } from "./PlaythroughCard";
import { JournalEntryEditor } from "./JournalEntryEditor";

export function GameJournals({ game }: { game: Game }) {
  const { journals } = usePersonalData();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const playthroughs = journals.playthroughs
    .filter((item) => item.gameId === game.id)
    .sort(
      (a, b) =>
        b.updatedAt.localeCompare(a.updatedAt) ||
        b.playthroughNumber - a.playthroughNumber,
    );
  const active = playthroughs.find((item) => item.status === "in-progress");
  return (
    <section className="detail-section game-journals">
      <SectionHeading
        eyebrow="THE STORY AS YOU PLAY IT"
        title="Playthrough journal"
      >
        <button
          className="button button-secondary"
          onClick={() => setCreating(true)}
        >
          <BookOpen size={15} />
          Start a playthrough
        </button>
      </SectionHeading>
      <p className="sample-note">
        Separate journeys, independent of your library status and final rating.
        Journal entries stay on this device.
      </p>
      {active && (
        <div className="active-journal-bar">
          <span>
            Most recently active: <strong>{active.title}</strong>
          </span>
          <button className="text-button" onClick={() => setAdding(active.id)}>
            Add progress entry
          </button>
        </div>
      )}
      {playthroughs.length ? (
        <div className="playthrough-grid">
          {playthroughs.map((item) => (
            <PlaythroughCard
              key={item.id}
              playthrough={item}
              game={game}
              active={active?.id === item.id}
            />
          ))}
        </div>
      ) : (
        <div className="journal-empty">
          <BookOpen size={26} />
          <h3>Your first chapter is still unwritten.</h3>
          <p>
            Start a journey to record missions, milestones, or anything that
            stays with you.
          </p>
          <button
            className="button button-primary"
            onClick={() => setCreating(true)}
          >
            Start your first playthrough
          </button>
        </div>
      )}
      {creating && (
        <PlaythroughEditor
          games={[game]}
          gameId={game.id}
          onClose={() => setCreating(false)}
          onSaved={(id) => navigate(`/diary/${id}`)}
        />
      )}
      {adding && (
        <JournalEntryEditor
          playthroughId={adding}
          onClose={() => setAdding(null)}
          onSaved={() => navigate(`/diary/${adding}`)}
        />
      )}
    </section>
  );
}
