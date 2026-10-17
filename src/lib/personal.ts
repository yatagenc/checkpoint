import type {
  GameStatus,
  LibraryEntry,
  Rating,
  Review,
  Visibility,
} from "../types/index.ts";
import { isDateOnly, isTimestamp as timestamp } from "./validation.ts";
export { isDateOnly } from "./validation.ts";

export const statuses: { value: GameStatus; label: string }[] = [
  { value: "backlog", label: "Backlog" },
  { value: "playing", label: "Playing" },
  { value: "completed", label: "Completed" },
  { value: "on-hold", label: "On Hold" },
  { value: "dropped", label: "Dropped" },
];
export const visibilityOptions: { value: Visibility; label: string }[] = [
  { value: "public", label: "Public" },
  { value: "friends-only", label: "Friends Only" },
  { value: "private", label: "Private" },
];
export const ratingValues: Rating[] = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
export interface PersonalData {
  library: LibraryEntry[];
  reviews: Review[];
}
export const emptyPersonalData = (): PersonalData => ({
  library: [],
  reviews: [],
});
export interface LibraryChanges {
  status: GameStatus;
  playtimeHours?: number;
  rating?: Rating;
  notes?: string;
  completedAt?: string;
}
export interface ReviewChanges {
  title?: string;
  text: string;
  rating?: Rating;
  containsSpoilers: boolean;
  visibility: Visibility;
}
export type PersonalAction =
  | { type: "add"; gameId: string; status?: GameStatus }
  | { type: "edit"; gameId: string; changes: LibraryChanges }
  | { type: "rate"; gameId: string; rating?: Rating }
  | { type: "favorite"; gameId: string }
  | { type: "remove"; gameId: string }
  | { type: "save-review"; gameId: string; changes: ReviewChanges }
  | { type: "delete-review"; gameId: string };

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const nonempty = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
export const isRating = (value: unknown): value is Rating =>
  typeof value === "number" && ratingValues.includes(value as Rating);
export const isStatus = (value: unknown): value is GameStatus =>
  statuses.some((status) => status.value === value);
export const isVisibility = (value: unknown): value is Visibility =>
  visibilityOptions.some((option) => option.value === value);
const optionalString = (value: unknown) =>
  value === undefined || typeof value === "string";
const optionalRating = (value: unknown) =>
  value === undefined || isRating(value);
const validHours = (value: unknown) =>
  value === undefined ||
  (typeof value === "number" && Number.isFinite(value) && value >= 0);

export function isPersonalData(value: unknown): value is PersonalData {
  if (
    !record(value) ||
    !Array.isArray(value.library) ||
    !Array.isArray(value.reviews)
  )
    return false;
  const library = value.library;
  const reviews = value.reviews;
  if (
    !library.every(
      (entry) =>
        record(entry) &&
        nonempty(entry.id) &&
        nonempty(entry.userId) &&
        nonempty(entry.gameId) &&
        isStatus(entry.status) &&
        isVisibility(entry.visibility) &&
        timestamp(entry.addedAt) &&
        timestamp(entry.updatedAt) &&
        optionalRating(entry.rating) &&
        validHours(entry.playtimeHours) &&
        optionalString(entry.notes) &&
        (entry.completedAt === undefined || isDateOnly(entry.completedAt)) &&
        (entry.favoriteOrder === undefined ||
          (Number.isSafeInteger(entry.favoriteOrder) &&
            (entry.favoriteOrder as number) >= 0)),
    )
  )
    return false;
  if (
    new Set(library.map((entry) => entry.gameId)).size !== library.length ||
    new Set(library.map((entry) => entry.id)).size !== library.length
  )
    return false;
  const favorites = library.filter(
    (entry) => entry.favoriteOrder !== undefined,
  );
  if (
    favorites.length > 4 ||
    new Set(favorites.map((entry) => entry.favoriteOrder)).size !==
      favorites.length
  )
    return false;
  if (
    !reviews.every(
      (review) =>
        record(review) &&
        nonempty(review.id) &&
        nonempty(review.userId) &&
        nonempty(review.gameId) &&
        nonempty(review.text) &&
        optionalString(review.title) &&
        optionalRating(review.rating) &&
        typeof review.containsSpoilers === "boolean" &&
        isVisibility(review.visibility) &&
        timestamp(review.createdAt) &&
        timestamp(review.updatedAt) &&
        library.some(
          (entry) =>
            entry.gameId === review.gameId && entry.rating === review.rating,
        ),
    )
  )
    return false;
  return (
    new Set(reviews.map((review) => review.gameId)).size === reviews.length &&
    new Set(reviews.map((review) => review.id)).size === reviews.length
  );
}

/** Pure transitions keep one entry/review per ID and ratings in agreement. */
export function updatePersonalData(
  data: PersonalData,
  action: PersonalAction,
  now = new Date().toISOString(),
  newId: () => string = () => crypto.randomUUID(),
): PersonalData {
  if (!nonempty(action.gameId)) throw new Error("A valid game ID is required.");
  let library = [...data.library];
  let reviews = [...data.reviews];
  function ensureEntry() {
    let entry = library.find((entry) => entry.gameId === action.gameId);
    if (!entry) {
      entry = {
        id: `library:${action.gameId}`,
        userId: "local-player",
        gameId: action.gameId,
        status: "backlog",
        visibility: "private",
        addedAt: now,
        updatedAt: now,
      };
      library.push(entry);
    }
    return entry;
  }
  function patchEntry(patch: Partial<LibraryEntry>) {
    library = library.map((entry) =>
      entry.gameId === action.gameId
        ? { ...entry, ...patch, updatedAt: now }
        : entry,
    );
  }
  function syncRating(rating: Rating | undefined) {
    if (!optionalRating(rating))
      throw new Error("Choose a half-star rating from 0.5 to 5.");
    patchEntry({ rating });
    reviews = reviews.map((review) =>
      review.gameId === action.gameId
        ? { ...review, rating, updatedAt: now }
        : review,
    );
  }
  switch (action.type) {
    case "add":
      if (library.some((entry) => entry.gameId === action.gameId)) return data;
      ensureEntry();
      if (action.status !== undefined) {
        if (!isStatus(action.status)) throw new Error("Choose a valid status.");
        patchEntry({ status: action.status });
      }
      break;
    case "edit": {
      const changes = action.changes;
      if (
        !isStatus(changes.status) ||
        !validHours(changes.playtimeHours) ||
        !optionalRating(changes.rating) ||
        !optionalString(changes.notes) ||
        (changes.completedAt !== undefined && !isDateOnly(changes.completedAt))
      )
        throw new Error("Check the status, date, playtime, and rating.");
      if (!library.some((entry) => entry.gameId === action.gameId))
        throw new Error(
          "This library entry was removed. Add the game again before editing it.",
        );
      patchEntry({
        status: changes.status,
        playtimeHours: changes.playtimeHours,
        rating: changes.rating,
        completedAt: changes.completedAt,
        notes: changes.notes?.trim() || undefined,
      });
      syncRating(changes.rating);
      break;
    }
    case "rate":
      ensureEntry();
      syncRating(action.rating);
      break;
    case "favorite": {
      const entry = library.find((entry) => entry.gameId === action.gameId);
      if (!entry) throw new Error("Add this game to your library first.");
      if (entry.favoriteOrder !== undefined)
        patchEntry({ favoriteOrder: undefined });
      else {
        const favorites = library.filter(
          (entry) => entry.favoriteOrder !== undefined,
        );
        if (favorites.length >= 4)
          throw new Error(
            "You can choose up to four favorites. Remove one before adding another.",
          );
        patchEntry({
          favoriteOrder:
            Math.max(-1, ...favorites.map((entry) => entry.favoriteOrder!)) + 1,
        });
      }
      break;
    }
    case "remove":
      library = library.filter((entry) => entry.gameId !== action.gameId);
      reviews = reviews.filter((review) => review.gameId !== action.gameId);
      break;
    case "save-review": {
      const changes = action.changes;
      if (!nonempty(changes.text))
        throw new Error("Write a review before saving.");
      if (
        !isVisibility(changes.visibility) ||
        typeof changes.containsSpoilers !== "boolean" ||
        !optionalRating(changes.rating) ||
        !optionalString(changes.title)
      )
        throw new Error("Check the review preferences and rating.");
      ensureEntry();
      syncRating(changes.rating);
      const previous = reviews.find(
        (review) => review.gameId === action.gameId,
      );
      const review: Review = {
        id: previous?.id ?? newId(),
        userId: "local-player",
        gameId: action.gameId,
        rating: changes.rating,
        containsSpoilers: changes.containsSpoilers,
        visibility: changes.visibility,
        title: changes.title?.trim() || undefined,
        text: changes.text.trim(),
        createdAt: previous?.createdAt ?? now,
        updatedAt: now,
      };
      reviews = previous
        ? reviews.map((item) => (item.gameId === action.gameId ? review : item))
        : [...reviews, review];
      break;
    }
    case "delete-review":
      reviews = reviews.filter((review) => review.gameId !== action.gameId);
      break;
  }
  return { library, reviews };
}

export function personalStats(data: PersonalData) {
  const ratings = data.library.flatMap((entry) =>
    entry.rating === undefined ? [] : [entry.rating],
  );
  return {
    total: data.library.length,
    completed: data.library.filter((entry) => entry.status === "completed")
      .length,
    playing: data.library.filter((entry) => entry.status === "playing").length,
    backlog: data.library.filter((entry) => entry.status === "backlog").length,
    hours: data.library.reduce(
      (sum, entry) => sum + (entry.playtimeHours ?? 0),
      0,
    ),
    average: ratings.length
      ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
      : null,
    ratedCount: ratings.length,
    distribution: ratingValues.map((rating) => ({
      rating,
      count: ratings.filter((value) => value === rating).length,
    })),
    favorites: data.library
      .filter((entry) => entry.favoriteOrder !== undefined)
      .sort((a, b) => a.favoriteOrder! - b.favoriteOrder!),
  };
}

export function parsePlaytime(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const hours = Number(value);
  if (
    !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim()) ||
    !Number.isFinite(hours) ||
    hours < 0
  )
    throw new Error(
      "Enter a nonnegative number of hours, such as 12.5, or leave it blank.",
    );
  return hours;
}
