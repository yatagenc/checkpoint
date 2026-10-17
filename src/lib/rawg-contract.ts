import type { Game } from "../types/index.ts";

export const rawgGenres = [
  ["action", "Action"],
  ["indie", "Indie"],
  ["adventure", "Adventure"],
  ["role-playing-games-rpg", "RPG"],
  ["strategy", "Strategy"],
  ["shooter", "Shooter"],
  ["casual", "Casual"],
  ["simulation", "Simulation"],
  ["puzzle", "Puzzle"],
  ["platformer", "Platformer"],
  ["racing", "Racing"],
  ["sports", "Sports"],
] as const;
export const rawgPlatforms = [
  ["4", "PC"],
  ["187", "PlayStation 5"],
  ["18", "PlayStation 4"],
  ["186", "Xbox Series S/X"],
  ["1", "Xbox One"],
  ["7", "Nintendo Switch"],
  ["5", "macOS"],
  ["6", "Linux"],
] as const;
export const rawgSorts = [
  ["relevance", "Relevance / popular"],
  ["title", "Title · A–Z"],
  ["title-desc", "Title · Z–A"],
  ["newest", "Release · newest"],
  ["oldest", "Release · oldest"],
  ["rating", "Metacritic · highest"],
] as const;
const ordering: Record<string, string> = {
  title: "name",
  "title-desc": "-name",
  newest: "-released",
  oldest: "released",
  rating: "-metacritic",
};
export const MAX_PAGE = 100;
export interface GamePage {
  games: Game[];
  count: number;
  page: number;
  hasNext: boolean;
}
export interface ScreenshotPage {
  screenshots: Game["screenshots"];
  page: number;
  hasNext: boolean;
}
export interface GameGenre {
  id: number;
  name: string;
  slug: string;
  gamesCount: number;
}
export interface GenrePage {
  genres: GameGenre[];
  count: number;
  page: number;
  hasNext: boolean;
}
export function isGameGenre(value: unknown): value is GameGenre {
  if (typeof value !== "object" || value === null) return false;
  const genre = value as Record<string, unknown>;
  return (
    Number.isSafeInteger(genre.id) &&
    (genre.id as number) > 0 &&
    typeof genre.name === "string" &&
    !!genre.name.trim() &&
    genre.name.length <= 200 &&
    typeof genre.slug === "string" &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(genre.slug) &&
    genre.slug.length <= 100 &&
    Number.isSafeInteger(genre.gamesCount) &&
    (genre.gamesCount as number) >= 0
  );
}
export class GameApiError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "GameApiError";
    this.status = status;
  }
}
export function rawgNumericId(value: string): string | null {
  const match = /^rawg:([1-9]\d{0,9})$/.exec(value);
  return match?.[1] ?? null;
}
/** A small, explicit query surface; no arbitrary URLs, upstream paths or next links. */
export function validateRawgQuery(input: URLSearchParams): {
  endpoint: string;
  params: URLSearchParams;
  kind: "list" | "detail" | "screenshots" | "genres";
  page: number;
} {
  const allowed = [
    "id",
    "resource",
    "q",
    "genre",
    "platform",
    "year",
    "sort",
    "page",
    "page_size",
  ];
  for (const key of input.keys())
    if (!allowed.includes(key) || input.getAll(key).length !== 1)
      throw new GameApiError("Unsupported or repeated request parameter.", 400);
  const id = input.get("id");
  const resource = input.get("resource") ?? "games";
  if (!["games", "screenshots", "genres"].includes(resource))
    throw new GameApiError("Unsupported resource.", 400);
  const number = (key: string, fallback: number, max: number) => {
    const value = input.get(key) ?? String(fallback);
    if (!/^[1-9]\d*$/.test(value) || Number(value) > max)
      throw new GameApiError(`Invalid ${key}.`, 400);
    return Number(value);
  };
  const page = number("page", 1, MAX_PAGE);
  const size = number("page_size", 20, 20);
  const params = new URLSearchParams();
  if (resource === "genres") {
    if (
      [...input.keys()].some(
        (key) => !["resource", "page", "page_size"].includes(key),
      )
    )
      throw new GameApiError("Genre metadata supports pagination only.", 400);
    if (page > 5)
      throw new GameApiError("Genre metadata page limit reached.", 400);
    params.set("page", String(page));
    params.set("page_size", String(size));
    return { endpoint: "/genres", params, kind: "genres", page };
  }
  if (id !== null) {
    const numeric = rawgNumericId(id);
    if (!numeric) throw new GameApiError("Invalid RAWG game ID.", 400);
    for (const key of ["q", "genre", "platform", "year", "sort"])
      if (input.has(key))
        throw new GameApiError("Filters apply only to game listings.", 400);
    if (resource === "games" && (input.has("page") || input.has("page_size")))
      throw new GameApiError("Game details are not paginated.", 400);
    if (resource === "screenshots") {
      params.set("page", String(page));
      params.set("page_size", String(size));
    }
    return {
      endpoint: `/games/${numeric}${resource === "screenshots" ? "/screenshots" : ""}`,
      params,
      kind: resource === "screenshots" ? "screenshots" : "detail",
      page,
    };
  }
  if (resource === "screenshots")
    throw new GameApiError("A game ID is required.", 400);
  const q = (input.get("q") ?? "").trim();
  if (
    q.length > 100 ||
    (q.length > 0 && q.length < 2) ||
    [...q].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
  )
    throw new GameApiError("Search needs 2–100 characters.", 400);
  if (q) params.set("search", q);
  const genre = input.get("genre") ?? "";
  if (genre) {
    if (
      !rawgGenres.some(([id]) => id === genre) &&
      !/^[1-9]\d{0,9}$/.test(genre)
    )
      throw new GameApiError("Unsupported genre.", 400);
    params.set("genres", genre);
  }
  const platform = input.get("platform") ?? "";
  if (platform) {
    if (!rawgPlatforms.some(([id]) => id === platform))
      throw new GameApiError("Unsupported platform.", 400);
    params.set("platforms", platform);
  }
  const year = input.get("year") ?? "";
  if (year) {
    if (
      !/^\d{4}$/.test(year) ||
      Number(year) < 1970 ||
      Number(year) > new Date().getUTCFullYear() + 2
    )
      throw new GameApiError("Unsupported release year.", 400);
    params.set("dates", `${year}-01-01,${year}-12-31`);
  }
  const sort = input.get("sort") ?? "relevance";
  if (!rawgSorts.some(([id]) => id === sort))
    throw new GameApiError("Unsupported sorting.", 400);
  if (sort !== "relevance") params.set("ordering", ordering[sort]);
  else if (!q) params.set("ordering", "-added");
  params.set("page", String(page));
  params.set("page_size", String(size));
  return { endpoint: "/games", params, kind: "list", page };
}
