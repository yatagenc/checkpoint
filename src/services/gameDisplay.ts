import type { Game } from "../types/index.ts";
import { storage } from "../lib/storage.ts";
import { isDateOnly } from "../lib/validation.ts";
import { rawgNumericId } from "../lib/rawg-contract.ts";

type Display = {
  id: string;
  title: string;
  coverUrl: string | null;
  releaseDate: string | null;
  url: string;
  savedAt: string;
};
const validUrl = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length <= 2048 &&
  /^https:\/\//.test(value) &&
  !/[?&](key|token|secret)=/i.test(value);
function isDisplays(value: unknown): value is Display[] {
  return (
    Array.isArray(value) &&
    value.length <= 200 &&
    value.every(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        rawgNumericId(item.id) &&
        typeof item.title === "string" &&
        item.title.length > 0 &&
        item.title.length <= 400 &&
        (item.coverUrl === null || validUrl(item.coverUrl)) &&
        (item.releaseDate === null || isDateOnly(item.releaseDate)) &&
        validUrl(item.url) &&
        isDateOnly(item.savedAt),
    )
  );
}
export function savedDisplays(): Game[] {
  return storage.read("game-display", [], isDisplays).map((item) => ({
    id: item.id,
    providerIds: { rawg: rawgNumericId(item.id)! },
    title: item.title,
    slug: rawgNumericId(item.id)!,
    coverUrl: item.coverUrl,
    backgroundUrl: null,
    releaseDate: item.releaseDate,
    releaseDateNote: "Saved release date · RAWG",
    description: null,
    developer: null,
    publisher: null,
    genres: [],
    tags: [],
    platforms: [],
    screenshots: [],
    metacritic: null,
    communityRating: null,
    estimatedPlaytimeHours: null,
    externalLinks: [{ label: "View on RAWG", url: item.url }],
    availability: "snapshot",
    source: {
      name: "RAWG · saved display",
      url: item.url,
      verifiedAt: item.savedAt,
      note: "Saved display snapshot. Live metadata is unavailable or has not been refreshed. Your personal data remains editable. Data and imagery via RAWG; rights remain with their owners.",
      platformSources: [],
    },
  }));
}
const recent = new Map<string, Game>();
export function rememberGame(game: Game) {
  recent.delete(game.id);
  recent.set(game.id, game);
  while (recent.size > 100) recent.delete(recent.keys().next().value!);
}
export function knownGames(): Game[] {
  return [
    ...new Map(
      [...savedDisplays(), ...recent.values()].map((game) => [game.id, game]),
    ).values(),
  ];
}
/** Best-effort tiny display snapshot, separate from every user-data schema. */
export function rememberSavedGame(id: string) {
  const game = recent.get(id);
  if (!rawgNumericId(id) || !game) return;
  const snapshot = storage.snapshot("game-display", isDisplays);
  if (
    snapshot.result.status === "invalid" ||
    snapshot.result.status === "unavailable"
  )
    return;
  const old = snapshot.result.status === "ready" ? snapshot.result.data : [];
  const next = [
    ...old.filter((item) => item.id !== id),
    {
      id,
      title: game.title.slice(0, 400),
      coverUrl: game.coverUrl,
      releaseDate: game.releaseDate,
      url: game.source.url,
      savedAt: new Date().toISOString().slice(0, 10),
    },
  ].slice(-200);
  if (isDisplays(next))
    storage.writeIfUnchanged("game-display", next, snapshot.raw);
}
