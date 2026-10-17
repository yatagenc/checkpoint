import type { Game, GameProvider } from "../types/index.ts";
import { isDateOnly } from "./validation.ts";

export function providerGameId(provider: GameProvider, id: string): string {
  if (
    !["steam", "rawg"].includes(provider) ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(id)
  )
    throw new Error("Invalid external game identifier.");
  return `${provider}:${id}`;
}
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const strings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");
const text = (value: unknown): value is string =>
  typeof value === "string" && !!value.trim();
const nullableText = (value: unknown) => value === null || text(value);
const https = (value: unknown) => {
  try {
    return typeof value === "string" && new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};
const links = (value: unknown) =>
  Array.isArray(value) &&
  value.every((item) => record(item) && text(item.label) && https(item.url));
const number = (value: unknown, min: number, max: number) =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= min &&
  value <= max;
/** Future adapters must produce validated plain metadata before reaching the UI. */
export function isGameMetadata(value: unknown): value is Game {
  if (!record(value)) return false;
  const game = value;
  return (
    text(game.id) &&
    text(game.title) &&
    text(game.slug) &&
    (game.providerIds === undefined ||
      (record(game.providerIds) &&
        Object.entries(game.providerIds).every(
          ([provider, id]) =>
            ["steam", "rawg"].includes(provider) &&
            typeof id === "string" &&
            /^[A-Za-z0-9_-]{1,128}$/.test(id),
        ))) &&
    (game.releaseDate === null || isDateOnly(game.releaseDate)) &&
    text(game.releaseDateNote) &&
    nullableText(game.developer) &&
    nullableText(game.publisher) &&
    nullableText(game.description) &&
    (game.coverUrl === null || https(game.coverUrl)) &&
    (game.backgroundUrl === null || https(game.backgroundUrl)) &&
    strings(game.genres) &&
    strings(game.tags) &&
    Array.isArray(game.platforms) &&
    game.platforms.every(
      (item) =>
        record(item) &&
        text(item.id) &&
        text(item.name) &&
        text(item.abbreviation),
    ) &&
    Array.isArray(game.screenshots) &&
    game.screenshots.every(
      (item) => record(item) && https(item.url) && text(item.alt),
    ) &&
    (game.metacritic === null ||
      (record(game.metacritic) &&
        number(game.metacritic.score, 0, 100) &&
        https(game.metacritic.url) &&
        nullableText(game.metacritic.platform))) &&
    (game.metacriticPlatforms === undefined ||
      (Array.isArray(game.metacriticPlatforms) &&
        game.metacriticPlatforms.length <= 40 &&
        game.metacriticPlatforms.every(
          (item) =>
            record(item) &&
            number(item.score, 0, 100) &&
            https(item.url) &&
            nullableText(item.platform) &&
            (item.platformId === undefined || text(item.platformId)),
        ))) &&
    (game.communityRating === null ||
      (record(game.communityRating) &&
        number(game.communityRating.value, 0, 5) &&
        Number.isSafeInteger(game.communityRating.count) &&
        (game.communityRating.count as number) >= 0 &&
        https(game.communityRating.url))) &&
    (game.estimatedPlaytimeHours === null ||
      number(game.estimatedPlaytimeHours, 0, Number.MAX_VALUE)) &&
    links(game.externalLinks) &&
    record(game.source) &&
    text(game.source.name) &&
    https(game.source.url) &&
    isDateOnly(game.source.verifiedAt) &&
    typeof game.source.note === "string" &&
    Array.isArray(game.source.platformSources) &&
    game.source.platformSources.every(
      (item) => record(item) && text(item.name) && https(item.url),
    )
  );
}

export function gameAliases(game: Game): string[] {
  return [
    game.id,
    ...Object.entries(game.providerIds ?? {}).map(([provider, id]) =>
      providerGameId(provider as GameProvider, id),
    ),
  ];
}

/** Local metadata/edition and IDs win; explicit aliases deduplicate additional games. */
export function mergeCatalog(
  local: readonly Game[],
  additional: readonly unknown[],
): readonly Game[] {
  const games = new Map<string, Game>();
  const aliases = new Map<string, string>();
  function register(game: Game) {
    for (const alias of gameAliases(game)) {
      const previous = aliases.get(alias);
      if (previous && previous !== game.id)
        throw new Error(
          "Conflicting provider mapping; catalog identities must be resolved explicitly.",
        );
      aliases.set(alias, game.id);
    }
    games.set(game.id, game);
  }
  for (const game of local) {
    if (!isGameMetadata(game) || games.has(game.id))
      throw new Error("Invalid or duplicate canonical catalog entry.");
    register(game);
  }
  for (const candidate of additional) {
    if (!isGameMetadata(candidate))
      throw new Error("The additional catalog contains invalid game metadata.");
    const providerAliases = Object.entries(candidate.providerIds ?? {}).map(
      ([provider, id]) => providerGameId(provider as GameProvider, id),
    );
    if (!providerAliases.includes(candidate.id))
      throw new Error("Additional games must use a namespaced provider ID.");
    const matches = new Set(
      gameAliases(candidate).flatMap((alias) =>
        aliases.has(alias) ? [aliases.get(alias)!] : [],
      ),
    );
    if (matches.size > 1)
      throw new Error(
        "Conflicting provider mapping; refusing to merge saved-game identities.",
      );
    const existing = games.get([...matches][0]);
    if (existing) {
      for (const [provider, id] of Object.entries(
        candidate.providerIds ?? {},
      )) {
        const previous = existing.providerIds?.[provider as GameProvider];
        if (previous && previous !== id)
          throw new Error(
            "Conflicting provider mapping for the same canonical game.",
          );
      }
      register({
        ...existing,
        providerIds: { ...candidate.providerIds, ...existing.providerIds },
      });
    } else register(candidate);
  }
  return [...games.values()];
}
