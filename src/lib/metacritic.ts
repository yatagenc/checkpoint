import type { Game, MetacriticScore } from "../types/index.ts";
export function metacriticScores(game: Game): MetacriticScore[] {
  const unique = new Map<string, MetacriticScore>();
  for (const score of [
    ...(game.metacritic ? [game.metacritic] : []),
    ...(game.metacriticPlatforms ?? []),
  ]) {
    const key = `${score.platform ?? score.platformId ?? "unspecified"}:${score.score}`;
    if (!unique.has(key)) unique.set(key, score);
  }
  return [...unique.values()];
}
export const metacriticPlatformLabel = (score: MetacriticScore) =>
  score.platform ?? "Platform unspecified";
