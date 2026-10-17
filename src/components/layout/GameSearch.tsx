import { Search } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import type { FormEvent } from "react";

export function GameSearch({ onSearch }: { onSearch?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search).get("q") ?? "";
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = String(
      new FormData(event.currentTarget).get("q") ?? "",
    ).trim();
    const params = new URLSearchParams();
    if (value) params.set("q", value);
    navigate({ pathname: "/explore", search: params.toString() });
    onSearch?.();
  }
  return (
    <form
      key={`${location.pathname}${location.search}`}
      className="nav-search"
      role="search"
      onSubmit={submit}
    >
      <input
        type="search"
        name="q"
        defaultValue={query}
        placeholder="Search games…"
        aria-label="Search game titles"
      />
      <button type="submit" aria-label="Find games">
        <Search size={17} />
      </button>
    </form>
  );
}
