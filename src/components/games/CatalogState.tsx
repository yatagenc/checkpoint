export function CatalogState({
  error = false,
  retry,
  message,
}: {
  error?: boolean;
  retry?: () => void;
  message?: string;
}) {
  return (
    <div className="catalog-state" role={error ? "alert" : "status"}>
      <p className="eyebrow">
        {error ? "A PAUSE IN THE JOURNEY" : "DISCOVERING WORLDS"}
      </p>
      <h2>
        {error ? "The catalog couldn’t be loaded." : "Opening the collection…"}
      </h2>
      {error && (
        <>
          <p>{message ?? "Please try again in a moment."}</p>
          <button className="button button-secondary" onClick={retry}>
            Try again
          </button>
        </>
      )}
    </div>
  );
}
