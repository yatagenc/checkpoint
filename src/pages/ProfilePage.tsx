import { UserRound } from "lucide-react";
import { Link } from "react-router";
import { PageIntro } from "../components/ui/PageIntro";
import { SectionHeading } from "../components/ui/SectionHeading";
import { GameCard } from "../components/games/GameCard";
import { CatalogState } from "../components/games/CatalogState";
import { ReviewCard } from "../components/personal/ReviewCard";
import { useGames } from "../hooks/useGames";
import { usePersonalData } from "../hooks/usePersonalData";
import { personalStats } from "../lib/personal";
import { JournalProfile } from "../components/journals/JournalProfile";

export function ProfilePage() {
  const { data } = usePersonalData();
  const { resource, retry } = useGames();
  const stats = personalStats(data);
  const games = new Map(
    (resource.status === "ready" ? resource.data : []).map((game) => [
      game.id,
      game,
    ]),
  );
  const recent = [...data.library]
    .sort(
      (a, b) =>
        b.addedAt.localeCompare(a.addedAt) || a.gameId.localeCompare(b.gameId),
    )
    .slice(0, 4);
  const reviews = [...data.reviews].sort(
    (a, b) =>
      b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id),
  );
  return (
    <>
      <PageIntro
        eyebrow="YOUR CORNER OF CHECKPOINT"
        title="User profile"
        description="Your collection, your taste, your stories. Everything here comes from the games you save on this device."
      />
      <section className="profile-panel">
        <div className="profile-banner" />
        <div className="profile-body">
          <span className="profile-avatar">
            <UserRound size={35} strokeWidth={1.25} />
          </span>
          <span className="badge">Local profile</span>
          <h2>Welcome, player.</h2>
          <p>
            No account required. These are your records, stored in this browser.
          </p>
          <dl className="personal-stats">
            {[
              { label: "Games in library", value: stats.total },
              { label: "Completed", value: stats.completed },
              { label: "Currently playing", value: stats.playing },
              { label: "Backlog", value: stats.backlog },
              {
                label: "Logged playtime",
                value: `${Number(stats.hours.toFixed(2))} h`,
              },
              {
                label: "Average personal rating",
                value:
                  stats.average === null
                    ? "Not rated"
                    : `${stats.average.toFixed(2)} / 5`,
              },
            ].map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
          <Link className="button button-secondary" to="/library">
            Manage your library
          </Link>
        </div>
      </section>
      <JournalProfile />
      <section className="section">
        <SectionHeading
          eyebrow="YOUR TASTE, AT A GLANCE"
          title="Personal rating distribution"
        />
        <p className="sample-note">
          {stats.ratedCount} rated {stats.ratedCount === 1 ? "game" : "games"} ·
          Unrated games are excluded from the average.
        </p>
        <dl className="rating-distribution">
          {stats.distribution.map((bin) => (
            <div key={bin.rating}>
              <dt>{bin.rating} ★</dt>
              <dd>
                <span className="distribution-track" aria-hidden="true">
                  <span
                    style={{
                      width: `${stats.ratedCount ? (bin.count / stats.ratedCount) * 100 : 0}%`,
                    }}
                  />
                </span>
                <span>
                  {bin.count} {bin.count === 1 ? "game" : "games"}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </section>
      {resource.status === "loading" ? (
        <CatalogState />
      ) : resource.status === "error" ? (
        <CatalogState error retry={retry} />
      ) : (
        <>
          <section className="section">
            <SectionHeading
              eyebrow="THE ONES THAT STAY"
              title={`Your favorites · ${stats.favorites.length}/4`}
            >
              <Link className="text-link" to="/library">
                Choose in your library ↗
              </Link>
            </SectionHeading>
            {stats.favorites.length ? (
              <div className="game-grid profile-game-grid">
                {stats.favorites.map((entry, index) => {
                  const game = games.get(entry.gameId);
                  return (
                    <div key={entry.gameId}>
                      <p className="favorite-order">0{index + 1}</p>
                      {game ? (
                        <GameCard game={game} />
                      ) : (
                        <p className="subtle-notice">
                          Saved game {entry.gameId} is currently unavailable.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="subtle-notice">
                Pick up to four favorites from your library. They’ll appear here
                in the order you select them.
              </p>
            )}
          </section>
          <section className="section">
            <SectionHeading
              eyebrow="FRESH ON YOUR SHELF"
              title="Recently added"
            />
            {recent.length ? (
              <div className="game-grid profile-game-grid">
                {recent.map((entry) => {
                  const game = games.get(entry.gameId);
                  return game ? (
                    <GameCard key={game.id} game={game} />
                  ) : (
                    <p key={entry.gameId} className="subtle-notice">
                      Saved game {entry.gameId} is currently unavailable.
                    </p>
                  );
                })}
              </div>
            ) : (
              <p className="subtle-notice">
                Your recently added games will appear here.
              </p>
            )}
          </section>
          <section className="section">
            <SectionHeading eyebrow="YOUR WORDS" title="Recent reviews" />
            <p className="sample-note">
              {reviews.length} saved{" "}
              {reviews.length === 1 ? "review" : "reviews"}. Stored locally;
              visibility labels are preferences and provide no access control.
            </p>
            {reviews.length ? (
              <div className="review-list">
                {reviews.map((review) => (
                  <ReviewCard
                    key={`${review.id}:${review.updatedAt}`}
                    review={review}
                    gameTitle={games.get(review.gameId)?.title ?? review.gameId}
                  />
                ))}
              </div>
            ) : (
              <p className="subtle-notice">
                Write a review from any game page to start your collection of
                perspectives.
              </p>
            )}
          </section>
        </>
      )}
    </>
  );
}
