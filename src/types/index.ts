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
export interface Game {
  id: string;
  title: string;
  slug: string;
  releaseDate: string;
  developer: string;
  genres: string[];
  platforms: GamePlatform[];
  summary: string;
  coverUrl?: string;
}
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
}
export interface Review {
  id: string;
  userId: string;
  gameId: string;
  rating: Rating;
  text: string;
  containsSpoilers: boolean;
  visibility: Visibility;
  createdAt: string;
  updatedAt: string;
}
export interface PlaythroughEntry {
  id: string;
  userId: string;
  gameId: string;
  playthroughId: string;
  chapterLabel: string;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
  notes: string;
  containsSpoilers: boolean;
  visibility: Visibility;
  minutesPlayed?: number;
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
