import { ArrowUpRight } from "lucide-react";
import type { Game } from "../../types";
import { GameArtwork } from "./GameArtwork";
import { GameImage } from "./GameImage";
import { ExternalLink } from "../ui/ExternalLink";
import { formatReleaseDate, getReleaseYear } from "../../lib/discovery";
import { GamePersonalActions } from "../personal/GamePersonalActions";
import { ReviewCard } from "../personal/ReviewCard";
import { usePersonalData } from "../../hooks/usePersonalData";
import { GameJournals } from "../journals/GameJournals";
import { RemoteScreenshots } from "./RemoteScreenshots";
import {
  metacriticScores,
  metacriticPlatformLabel,
} from "../../lib/metacritic";

export function GameDetails({ game }: { game: Game }) {
  const { data } = usePersonalData();
  const review = data.reviews.find((review) => review.gameId === game.id);
  const critics = metacriticScores(game);
  return (
    <>
      <section className="detail-backdrop" aria-label={`${game.title} artwork`}>
        <GameImage
          src={game.backgroundUrl}
          alt={`${game.title} promotional background`}
          priority
        />
        <div className="detail-backdrop-shade" />
        <span className="badge">
          {game.source.name.startsWith("RAWG")
            ? "Game data via RAWG"
            : "Local demo catalog · Steam edition"}
        </span>
      </section>
      <div className="game-details detail-with-backdrop">
        <div className="detail-cover">
          <GameArtwork
            id={game.id}
            title={game.title}
            coverUrl={game.coverUrl}
          />
          <p>
            Artwork via {game.source.name.startsWith("RAWG") ? "RAWG" : "Steam"}
          </p>
        </div>
        <div className="game-detail-copy">
          <p className="eyebrow">
            {getReleaseYear(game) ?? "Release year unavailable"} ·{" "}
            {game.developer ?? "Developer unavailable"}
          </p>
          <h1>{game.title}</h1>
          {game.availability === "snapshot" && (
            <p className="storage-notice" role="status">
              Showing saved metadata. Live RAWG details are unavailable; your
              personal records are still editable.
            </p>
          )}
          <div className="tag-list">
            {game.genres.length ? (
              game.genres.map((genre) => <span key={genre}>{genre}</span>)
            ) : (
              <span>Genres unavailable</span>
            )}
          </div>
          <p className="game-summary">
            {game.description ??
              "A description is not available for this game yet."}
          </p>
          <dl className="game-metadata">
            <div>
              <dt>Developer</dt>
              <dd>{game.developer ?? "Unavailable"}</dd>
            </div>
            <div>
              <dt>Publisher</dt>
              <dd>{game.publisher ?? "Unavailable"}</dd>
            </div>
            <div>
              <dt>{game.releaseDateNote}</dt>
              <dd>{formatReleaseDate(game.releaseDate)}</dd>
            </div>
            <div>
              <dt>Verified platforms</dt>
              <dd>
                {game.platforms.map((platform) => platform.name).join(" · ") ||
                  "Unavailable"}
              </dd>
            </div>
          </dl>
          <div className="rating-strip">
            <div>
              {critics.length ? (
                critics.map((critic, index) => (
                  <ExternalLink
                    key={`${critic.platformId ?? critic.platform ?? "unspecified"}:${index}`}
                    href={critic.url}
                    className="metacritic-score"
                  >
                    <strong>
                      {critic.score}
                      <small>/100</small>
                    </strong>
                    <span>
                      Metacritic · {metacriticPlatformLabel(critic)}{" "}
                      <ArrowUpRight size={12} />
                    </span>
                  </ExternalLink>
                ))
              ) : (
                <>
                  <strong className="rating-unavailable">—</strong>
                  <span>Metacritic unavailable</span>
                </>
              )}
            </div>
            <div>
              {game.communityRating ? (
                <ExternalLink href={game.communityRating.url}>
                  <strong>
                    {game.communityRating.value}
                    <small>/5</small>
                  </strong>
                  <span>
                    {game.providerIds?.rawg ? "RAWG · " : ""}
                    {game.communityRating.count.toLocaleString()} community
                    ratings
                  </span>
                </ExternalLink>
              ) : (
                <>
                  <strong className="rating-unavailable">—</strong>
                  <span>Community rating unavailable</span>
                </>
              )}
            </div>
            <div>
              <strong>
                {game.estimatedPlaytimeHours === null ? (
                  <span className="rating-unavailable">—</span>
                ) : (
                  <>
                    {game.estimatedPlaytimeHours}
                    <small> hours</small>
                  </>
                )}
              </strong>
              <span>
                Estimated playtime
                {game.estimatedPlaytimeHours === null ? " unavailable" : ""}
              </span>
            </div>
          </div>
          <GamePersonalActions game={game} />
        </div>
      </div>
      <GameJournals game={game} />
      <section className="detail-section personal-review-section">
        <p className="eyebrow">YOUR PERSPECTIVE</p>
        <h2>Your review</h2>
        <p className="sample-note">
          Reviews stay in this browser. Visibility preferences do not publish or
          restrict access.
        </p>
        {review ? (
          <ReviewCard
            key={`${review.id}:${review.updatedAt}`}
            review={review}
            gameTitle={game.title}
          />
        ) : (
          <p className="subtle-notice">
            No review yet. Capture your thoughts using Write Review above.
          </p>
        )}
      </section>
      <section className="detail-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">A GLIMPSE INSIDE</p>
            <h2>Screenshots</h2>
          </div>
          <span className="sample-note">Open an image for full size ↗</span>
        </div>
        {game.providerIds?.rawg &&
        game.source.name.startsWith("RAWG") &&
        !game.screenshots.length ? (
          <RemoteScreenshots
            key={game.id}
            id={`rawg:${game.providerIds.rawg}`}
          />
        ) : game.screenshots.length ? (
          <div className="screenshot-grid">
            {game.screenshots.map((screenshot, index) => (
              <ExternalLink
                key={screenshot.url}
                href={screenshot.url}
                className="screenshot-link"
                ariaLabel={`Open ${game.title} screenshot ${index + 1} in full size`}
              >
                <GameImage src={screenshot.url} alt={screenshot.alt} />
                <span>
                  0{index + 1} <ArrowUpRight size={14} />
                </span>
              </ExternalLink>
            ))}
          </div>
        ) : (
          <p className="subtle-notice">
            Screenshots are not available for this game.
          </p>
        )}
      </section>
      <section className="detail-bottom">
        <div>
          <p className="eyebrow">LOOK A LITTLE CLOSER</p>
          <h2>In this world</h2>
          <div className="tag-list">
            {game.tags.length ? (
              game.tags.map((tag) => <span key={tag}>{tag}</span>)
            ) : (
              <span>Tags unavailable</span>
            )}
          </div>
          <p className="sample-note">
            {game.source.name === "RAWG"
              ? "Tags supplied by RAWG."
              : "Tags are editorial descriptors for this demo catalog."}
          </p>
        </div>
        <div>
          <p className="eyebrow">BEYOND CHECKPOINT</p>
          <h2>Find out more</h2>
          <div className="external-links">
            {game.externalLinks.length ? (
              game.externalLinks.map((link) => (
                <ExternalLink
                  key={link.url}
                  href={link.url}
                  className="text-link"
                >
                  {link.label}
                  <ArrowUpRight size={15} />
                </ExternalLink>
              ))
            ) : (
              <p className="sample-note">External links unavailable.</p>
            )}
          </div>
        </div>
      </section>
      <aside className="source-note">
        <span className="badge">Source & context</span>
        <p>{game.source.note}</p>
        <p>
          <ExternalLink href={game.source.url}>
            {game.source.name} <ArrowUpRight size={12} />
          </ExternalLink>{" "}
          · Verified {formatReleaseDate(game.source.verifiedAt)}. Artwork
          belongs to its respective rights holders.
        </p>
        {game.source.platformSources.map((source) => (
          <p key={source.url}>
            <ExternalLink href={source.url}>
              {source.name} <ArrowUpRight size={12} />
            </ExternalLink>
          </p>
        ))}
      </aside>
    </>
  );
}
