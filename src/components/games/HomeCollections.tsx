import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Link } from "react-router";
import { useGames } from "../../hooks/useGames";
import { featuredGameIds } from "../../data/collections";
import { discoverGames, getFilterOptions } from "../../lib/discovery";
import { SectionHeading } from "../ui/SectionHeading";
import { GameCard } from "./GameCard";
import { CatalogState } from "./CatalogState";

export function HomeCollections() {
  const { resource, retry } = useGames();
  if (resource.status !== "ready")
    return <CatalogState error={resource.status === "error"} retry={retry} />;
  const games = resource.data;
  const base = { q: "", genre: "", platform: "", year: "" };
  const featured = featuredGameIds.flatMap((id) => {
    const game = games.find((game) => game.id === id);
    return game ? [game] : [];
  });
  const criticPicks = discoverGames(games, { ...base, sort: "rating" })
    .filter((game) => game.metacritic !== null)
    .slice(0, 4);
  const recent = discoverGames(games, { ...base, sort: "newest" })
    .filter((game) => game.releaseDate !== null)
    .slice(0, 4);
  const sections = [
    {
      eyebrow: "YOUR NEXT CHAPTER",
      title: "Worlds worth getting lost in",
      note: "Featured games · An editorial selection from our local demo catalog",
      games: featured,
      url: "/explore",
    },
    {
      eyebrow: "CRITIC PICKS",
      title: "A lasting impression",
      note: "Highest available PC Metacritic scores in this snapshot · Not a community ranking",
      games: criticPicks,
      url: "/explore?sort=rating",
    },
    {
      eyebrow: "SOMETHING NEW TO YOU",
      title: "Latest in the collection",
      note: "Sorted by Steam edition release date · A curated snapshot, not a live release feed",
      games: recent,
      url: "/explore?sort=newest",
    },
  ];
  return (
    <>
      {sections.map((section) => (
        <section className="section" key={section.title}>
          <SectionHeading eyebrow={section.eyebrow} title={section.title}>
            <Link className="text-link" to={section.url}>
              Explore games <ArrowRight size={16} />
            </Link>
          </SectionHeading>
          <p className="sample-note">{section.note}</p>
          <div className="game-grid">
            {section.games.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </section>
      ))}
      <section className="section genre-section">
        <SectionHeading
          eyebrow="FOLLOW YOUR CURIOSITY"
          title="Discover by genre"
        />
        <div className="genre-grid">
          {getFilterOptions(games).genres.map((genre) => (
            <Link key={genre} to={`/explore?${new URLSearchParams({ genre })}`}>
              <span>{genre}</span>
              <small>
                {games.filter((game) => game.genres.includes(genre)).length}{" "}
                games
              </small>
              <ArrowUpRight size={17} />
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
