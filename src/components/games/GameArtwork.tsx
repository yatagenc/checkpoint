import landscape from "../../assets/landscape.svg";
import { GameImage } from "./GameImage";

/** Real covers when available; original abstract fallback artwork otherwise. */
export function GameArtwork({
  id,
  title,
  coverUrl = null,
}: {
  id: string;
  title: string;
  coverUrl?: string | null;
}) {
  if (coverUrl)
    return (
      <GameImage
        src={coverUrl}
        alt={`${title} cover art`}
        className="game-art cover-art"
      />
    );
  return (
    <div className={`game-art art-${id}`} aria-hidden="true">
      {id === "elden-ring" ? (
        <img src={landscape} alt="" />
      ) : (
        <>
          <span className="art-orbit" />
          <span className="art-mountain" />
          <span className="art-mountain second" />
        </>
      )}
      <span className="art-number">ARTWORK UNAVAILABLE / CHECKPOINT</span>
      <span className="art-title">{title}</span>
    </div>
  );
}
