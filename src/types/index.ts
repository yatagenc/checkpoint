/** Stable IDs and ISO 8601 timestamps are used across all persisted entities. */
export type GameStatus =
  "backlog" | "playing" | "completed" | "on-hold" | "dropped";
export type Visibility = "public" | "friends-only" | "private";
export type Rating = 0.5 | 1 | 1.5 | 2 | 2.5 | 3 | 3.5 | 4 | 4.5 | 5;

export interface GamePlatform {
  id: string;
  name: string;
  abbreviation: string;
}
export interface MetacriticScore {
  score: number;
  url: string;
  /** null means the provider did not identify a platform; never infer it from a score. */
  platform: string | null;
  platformId?: string;
}
export interface Game {
  availability?: "snapshot";
  /** Optional provider mappings never replace the canonical persisted id. */
  providerIds?: Partial<Record<GameProvider, string>>;
  id: string;
  title: string;
  slug: string;
  releaseDate: string | null;
  releaseDateNote: string;
  developer: string | null;
  publisher: string | null;
  genres: string[];
  platforms: GamePlatform[];
  description: string | null;
  coverUrl: string | null;
  backgroundUrl: string | null;
  tags: string[];
  screenshots: { url: string; alt: string }[];
  metacritic: MetacriticScore | null;
  metacriticPlatforms?: MetacriticScore[];
  communityRating: { value: number; count: number; url: string } | null;
  estimatedPlaytimeHours: number | null;
  externalLinks: { label: string; url: string }[];
  source: {
    name: string;
    url: string;
    verifiedAt: string;
    note: string;
    platformSources: { name: string; url: string }[];
  };
}
export type GameProvider = "steam" | "rawg";
export interface LibraryEntry {
  id: string;
  userId: string;
  gameId: string;
  status: GameStatus;
  rating?: Rating;
  platformId?: string;
  visibility: Visibility;
  addedAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  playtimeHours?: number;
  notes?: string;
  /** Rank records favorite order; absent means not a favorite. */
  favoriteOrder?: number;
}
export interface Review {
  id: string;
  userId: string;
  gameId: string;
  rating?: Rating;
  title?: string;
  text: string;
  containsSpoilers: boolean;
  visibility: Visibility;
  createdAt: string;
  updatedAt: string;
}
export type PlaythroughStatus =
  "in-progress" | "completed" | "paused" | "abandoned";
export type JournalEntryType =
  "chapter" | "mission" | "milestone" | "general-update";
export interface Playthrough {
  id: string;
  gameId: string;
  title: string;
  playthroughNumber: number;
  startedAt: string;
  completedAt?: string;
  status: PlaythroughStatus;
  platform?: string;
  difficulty?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
export interface PlaythroughEntry {
  id: string;
  playthroughId: string;
  title: string;
  type: JournalEntryType;
  chapterLabel?: string;
  progressPercent?: number;
  playtimeHours?: number;
  content: string;
  provisionalRating?: Rating;
  entryDate: string;
  createdAt: string;
  updatedAt: string;
  containsSpoilers: boolean;
  visibility: Visibility;
}
export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl?: string;
  favoriteGameIds: string[];
  defaultVisibility: Visibility;
  joinedAt: string;
}
