import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router";
import { useGame } from "../hooks/useGames";
import { CatalogState } from "../components/games/CatalogState";
import { GameDetails } from "../components/games/GameDetails";
import { NotFoundPage } from "./NotFoundPage";

export function GameDetailsPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { resource, retry } = useGame(id);
  const title =
    resource.status === "ready"
      ? (resource.data?.title ?? "Game not found")
      : "Game details";
  useEffect(() => {
    document.title = `${title} — Checkpoint`;
  }, [title]);
  if (resource.status === "ready" && !resource.data)
    return <NotFoundPage game />;
  return (
    <>
      <Link className="text-link back-link" to="/explore">
        <ArrowLeft size={15} /> Back to explore
      </Link>
      {resource.status === "loading" ? (
        <CatalogState />
      ) : resource.status === "error" ? (
        <CatalogState error retry={retry} message={resource.message} />
      ) : (
        resource.data && (
          <>
            {resource.data.availability === "snapshot" && (
              <button className="button button-secondary" onClick={retry}>
                Refresh game metadata
              </button>
            )}
            <GameDetails key={resource.data.id} game={resource.data} />
          </>
        )
      )}
    </>
  );
}
