import type { Game } from "../types";

const pc = { id: "pc", name: "PC", abbreviation: "PC" };
const ps5 = { id: "ps5", name: "PlayStation 5", abbreviation: "PS5" };
const switchPlatform = {
  id: "switch",
  name: "Nintendo Switch",
  abbreviation: "Switch",
};

/** Small static catalog for layout previews, not a live game database. */
export const games: Game[] = [
  {
    id: "elden-ring",
    slug: "elden-ring",
    title: "Elden Ring",
    releaseDate: "2022-02-25",
    developer: "FromSoftware",
    genres: ["Action RPG", "Open world"],
    platforms: [pc, ps5],
    summary:
      "Chart your own path through the Lands Between. A vast, mysterious world of fallen kingdoms, unlikely allies, and discoveries beyond the horizon.",
  },
  {
    id: "hollow-knight",
    slug: "hollow-knight",
    title: "Hollow Knight",
    releaseDate: "2017-02-24",
    developer: "Team Cherry",
    genres: ["Metroidvania", "Adventure"],
    platforms: [pc, switchPlatform],
    summary:
      "Descend into a forgotten kingdom beneath a quiet town. Explore winding caverns and uncover the stories of a beautiful, haunting world.",
  },
  {
    id: "disco-elysium",
    slug: "disco-elysium",
    title: "Disco Elysium",
    releaseDate: "2019-10-15",
    developer: "ZA/UM",
    genres: ["RPG", "Narrative"],
    platforms: [pc, ps5, switchPlatform],
    summary:
      "A detective, a city, and a mind full of competing voices. Shape your investigation through conversations, choices, and unexpected discoveries.",
  },
  {
    id: "celeste",
    slug: "celeste",
    title: "Celeste",
    releaseDate: "2018-01-25",
    developer: "Maddy Makes Games",
    genres: ["Platformer", "Adventure"],
    platforms: [pc, switchPlatform],
    summary:
      "Climb a mountain one screen at a time. A precise platforming adventure about perseverance, self-discovery, and finding your footing.",
  },
];
