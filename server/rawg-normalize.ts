import type { Game } from "../src/types/index.ts";
import { isDateOnly } from "../src/lib/validation.ts";
import { isGameGenre } from "../src/lib/rawg-contract.ts";
import type { GameGenre } from "../src/lib/rawg-contract.ts";
export const record = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
const array = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];
const text = (value: unknown, max = 400): string | null =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
export function publicUrl(value: unknown): string | null {
  try {
    if (typeof value !== "string" || value.length > 2048) return null;
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      [...url.searchParams.keys()].some((key) => /key|token|secret/i.test(key))
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}
const names = (value: unknown) =>
  [
    ...new Set(
      array(value)
        .map((item) => text(record(item).name))
        .filter((item): item is string => !!item),
    ),
  ].slice(0, 30);
const score = (value: unknown, max: number) =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value > 0 &&
  value <= max
    ? value
    : null;
/** Plain text only. React escapes remaining markup; description HTML is never injected. */
export function normalizeGame(value: unknown): Game {
  const dto = record(value);
  if (
    !Number.isSafeInteger(dto.id) ||
    (dto.id as number) < 1 ||
    !text(dto.name)
  )
    throw new Error("Malformed game metadata");
  const id = String(dto.id);
  const slug = text(dto.slug) ?? id;
  const url = `https://rawg.io/games/${encodeURIComponent(slug)}`;
  const metacritic = score(dto.metacritic, 100);
  const rating = score(dto.rating, 5);
  const website = publicUrl(dto.website);
  const image = publicUrl(dto.background_image);
  return {
    id: `rawg:${id}`,
    providerIds: { rawg: id },
    slug,
    title: text(dto.name)!,
    coverUrl: image,
    backgroundUrl: image,
    description: text(dto.description_raw, 20000),
    releaseDate: isDateOnly(dto.released) ? dto.released : null,
    releaseDateNote: "Release date · RAWG",
    developer: names(dto.developers).join(" · ") || null,
    publisher: names(dto.publishers).join(" · ") || null,
    genres: names(dto.genres),
    tags: names(dto.tags),
    platforms: array(dto.platforms)
      .slice(0, 40)
      .flatMap((item) => {
        const p = record(record(item).platform);
        const name = text(p.name);
        return Number.isSafeInteger(p.id) && name
          ? [{ id: `rawg-platform:${p.id}`, name, abbreviation: name }]
          : [];
      }),
    screenshots: [],
    metacritic:
      metacritic === null
        ? null
        : {
            score: metacritic,
            url: publicUrl(dto.metacritic_url) ?? url,
            platform: null,
          },
    metacriticPlatforms: array(dto.metacritic_platforms)
      .slice(0, 40)
      .flatMap((item) => {
        const entry = record(item);
        const metascore = score(entry.metascore, 100);
        if (metascore === null || !Number.isInteger(metascore)) return [];
        const platform = record(entry.platform);
        const platformId =
          Number.isSafeInteger(platform.platform) &&
          (platform.platform as number) > 0
            ? `rawg-platform:${platform.platform}`
            : undefined;
        const matchingPlatform = platformId
          ? array(dto.platforms)
              .map((item) => record(record(item).platform))
              .find((item) => item.id === platform.platform)
          : undefined;
        return [
          {
            score: metascore,
            url: publicUrl(entry.url) ?? url,
            platform: text(platform.name) ?? text(matchingPlatform?.name),
            ...(platformId ? { platformId } : {}),
          },
        ];
      }),
    communityRating:
      rating !== null &&
      Number.isSafeInteger(dto.ratings_count) &&
      (dto.ratings_count as number) > 0
        ? { value: rating, count: dto.ratings_count as number, url }
        : null,
    // RAWG playtime is an average activity statistic, not estimated completion time.
    estimatedPlaytimeHours: null,
    externalLinks: [
      { label: "View on RAWG", url },
      ...(website ? [{ label: "Official website", url: website }] : []),
    ],
    source: {
      name: "RAWG",
      url,
      verifiedAt: new Date().toISOString().slice(0, 10),
      note: "Game data and imagery provided by RAWG. Ratings are RAWG community ratings, separate from your personal rating. Release/platform information may vary by edition. Background artwork is cropped for cards. Rights remain with their owners.",
      platformSources: [],
    },
  };
}
export function normalizeGenres(value: unknown): GameGenre[] {
  const results = record(value).results;
  if (!Array.isArray(results)) throw new Error("Malformed genre metadata");
  const genres = results.slice(0, 20).map((item) => {
    const genre = record(item);
    const normalized = {
      id: genre.id,
      name: genre.name,
      slug: genre.slug,
      gamesCount: genre.games_count,
    };
    if (!isGameGenre(normalized)) throw new Error("Malformed genre metadata");
    return normalized;
  });
  if (new Set(genres.map((genre) => genre.id)).size !== genres.length)
    throw new Error("Duplicate genre metadata");
  return genres;
}
export function normalizeScreenshots(value: unknown): Game["screenshots"] {
  return array(record(value).results)
    .slice(0, 20)
    .flatMap((item, index) => {
      const url = publicUrl(record(item).image);
      return url ? [{ url, alt: `Game screenshot ${index + 1} via RAWG` }] : [];
    });
}
