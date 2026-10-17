import type { Game } from "../types/index.ts";

export const sortOptions = [
  { value: "title", label: "Title · A–Z" },
  { value: "title-desc", label: "Title · Z–A" },
  { value: "newest", label: "Release · newest" },
  { value: "oldest", label: "Release · oldest" },
  { value: "rating", label: "Metacritic · highest" },
] as const;
export type GameSort = (typeof sortOptions)[number]["value"];
export interface DiscoveryFilters {
  q: string;
  genre: string;
  platform: string;
  year: string;
  sort: GameSort;
}

export function readFilters(params: URLSearchParams): DiscoveryFilters {
  const sort = params.get("sort");
  return {
    q: params.get("q") ?? "",
    genre: params.get("genre") ?? "",
    platform: params.get("platform") ?? "",
    year: params.get("year") ?? "",
    sort: sortOptions.find((option) => option.value === sort)?.value ?? "title",
  };
}
export function getReleaseYear(game: Game): string | null {
  return game.releaseDate?.slice(0, 4) ?? null;
}
const byTitle = (a: Game, b: Game) =>
  a.title.localeCompare(b.title, "en", { sensitivity: "base" }) ||
  a.id.localeCompare(b.id);

export function discoverGames(
  games: readonly Game[],
  filters: DiscoveryFilters,
): Game[] {
  const query = filters.q.trim().toLocaleLowerCase("en");
  const result = games.filter(
    (game) =>
      (!query || game.title.toLocaleLowerCase("en").includes(query)) &&
      (!filters.genre || game.genres.includes(filters.genre)) &&
      (!filters.platform ||
        game.platforms.some((platform) => platform.id === filters.platform)) &&
      (!filters.year || getReleaseYear(game) === filters.year),
  );
  return result.sort((a, b) => {
    if (filters.sort === "title-desc") return -byTitle(a, b);
    if (filters.sort === "newest" || filters.sort === "oldest") {
      if (!a.releaseDate || !b.releaseDate)
        return a.releaseDate ? -1 : b.releaseDate ? 1 : byTitle(a, b);
      const comparison = a.releaseDate.localeCompare(b.releaseDate);
      return (
        (filters.sort === "newest" ? -comparison : comparison) || byTitle(a, b)
      );
    }
    if (filters.sort === "rating")
      return (
        (b.metacritic?.score ?? -1) - (a.metacritic?.score ?? -1) ||
        byTitle(a, b)
      );
    return byTitle(a, b);
  });
}

export function getFilterOptions(games: readonly Game[]) {
  return {
    genres: [...new Set(games.flatMap((game) => game.genres))].sort(),
    platforms: [
      ...new Map(
        games
          .flatMap((game) => game.platforms)
          .map((platform) => [platform.id, platform]),
      ).values(),
    ].sort((a, b) => a.name.localeCompare(b.name)),
    years: [
      ...new Set(
        games
          .map(getReleaseYear)
          .filter((year): year is string => year !== null),
      ),
    ]
      .sort()
      .reverse(),
  };
}
export function formatReleaseDate(value: string | null): string {
  if (!value) return "Unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unavailable"
    : new Intl.DateTimeFormat("en", {
        dateStyle: "long",
        timeZone: "UTC",
      }).format(date);
}
export function safeExternalUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}
