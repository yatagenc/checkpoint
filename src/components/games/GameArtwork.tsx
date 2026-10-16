import landscape from "../../assets/landscape.svg";

/** Original abstract placeholders; replace with licensed cover art in the API phase. */
export function GameArtwork({ id, title }: { id: string; title: string }) {
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
      <span className="art-number">CP / COLLECTION</span>
      <span className="art-title">{title}</span>
    </div>
  );
}
