import catalog from "./catalog.json" with { type: "json" };
import consolePlatforms from "./platform-sources.json" with { type: "json" };
import type { Game } from "../types/index.ts";

/** Verified local demo snapshot, not live statistics. */
const platformDetails: Record<
  string,
  { platforms: Game["platforms"]; sources: Game["source"]["platformSources"] }
> = consolePlatforms;
export const games: readonly Game[] = catalog.map((game) => ({
  ...game,
  providerIds: { steam: new URL(game.source.url).pathname.split("/")[2] },
  platforms: [
    ...game.platforms,
    ...(platformDetails[game.id]?.platforms ?? []),
  ],
  source: {
    ...game.source,
    platformSources: platformDetails[game.id]?.sources ?? [],
    note: "Local demo snapshot. Dates and critic scores refer to the Steam edition. Platforms are a verified, non-exhaustive subset. Tags and descriptions are Checkpoint editorial copy.",
  },
}));
