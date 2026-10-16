import { PageIntro } from "../components/ui/PageIntro";
import { GameCard } from "../components/games/GameCard";
import { games } from "../data/games";

export function ExplorePage() {
  return (
    <>
      <PageIntro
        eyebrow="DISCOVERY STARTS HERE"
        title="Find your next world."
        description="Familiar favorites and new horizons. A small taste of the game discovery experience to come."
      />
      <div className="collection-bar">
        <span>THE STARTER COLLECTION</span>
        <span>4 games · Sample catalog</span>
      </div>
      <div className="game-grid">
        {games.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
      <p className="subtle-notice">
        Curated mock catalog with original artwork placeholders. Search,
        filtering, and a connected game database are planned for a later phase.
      </p>
    </>
  );
}
