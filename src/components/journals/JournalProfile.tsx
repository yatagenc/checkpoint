import { Link } from "react-router";
import { usePersonalData } from "../../hooks/usePersonalData";
import { useSavedGames } from "../../hooks/useSavedGames";
import { journalStats } from "../../lib/journals";
import { SectionHeading } from "../ui/SectionHeading";
import { JournalEntryCard } from "./JournalEntryCard";

export function JournalProfile() {
  const { journals } = usePersonalData();
  const { resource } = useSavedGames();
  const stats = journalStats(journals);
  const games = new Map(
    (resource.status === "ready" ? resource.data : []).map((game) => [
      game.id,
      game,
    ]),
  );
  const recent = [...journals.entries]
    .sort(
      (a, b) =>
        b.updatedAt.localeCompare(a.updatedAt) ||
        b.createdAt.localeCompare(a.createdAt) ||
        a.id.localeCompare(b.id),
    )
    .slice(0, 4);
  return (
    <section className="section profile-journals">
      <SectionHeading
        eyebrow="THE STORIES IN PROGRESS"
        title="Your playthrough journals"
      >
        <Link className="text-link" to="/diary">
          Open your diary ↗
        </Link>
      </SectionHeading>
      <dl className="personal-stats journal-stats">
        {[
          { label: "Total playthroughs", value: stats.total },
          { label: "Completed playthroughs", value: stats.completed },
          { label: "Active playthroughs", value: stats.active },
          { label: "Journal entries", value: stats.entries },
        ].map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
      <h3>Recent journal activity</h3>
      <p className="sample-note">
        Latest entry updates on this device. Spoiler-marked text stays concealed
        until you reveal it.
      </p>
      {recent.length ? (
        <div className="review-list">
          {recent.map((entry) => {
            const parent = journals.playthroughs.find(
              (item) => item.id === entry.playthroughId,
            );
            return parent ? (
              <div key={`${entry.id}:${entry.updatedAt}`}>
                <Link
                  className="activity-parent text-link"
                  to={`/diary/${parent.id}`}
                >
                  {games.get(parent.gameId)?.title ?? parent.gameId} ·{" "}
                  {parent.title} ↗
                </Link>
                <JournalEntryCard entry={entry} />
              </div>
            ) : null;
          })}
        </div>
      ) : (
        <p className="subtle-notice">
          Your journal activity will appear here when you record your first
          entry.
        </p>
      )}
    </section>
  );
}
