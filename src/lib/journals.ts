import type {
  Playthrough,
  PlaythroughEntry,
  PlaythroughStatus,
  JournalEntryType,
} from "../types/index.ts";
import {
  isDateOnly,
  isRating,
  isVisibility,
  parsePlaytime,
} from "./personal.ts";
import { isTimestamp as timestamp } from "./validation.ts";

export const playthroughStatuses: {
  value: PlaythroughStatus;
  label: string;
}[] = [
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "paused", label: "Paused" },
  { value: "abandoned", label: "Abandoned" },
];
export const journalEntryTypes: { value: JournalEntryType; label: string }[] = [
  { value: "chapter", label: "Chapter" },
  { value: "mission", label: "Mission" },
  { value: "milestone", label: "Milestone" },
  { value: "general-update", label: "General Update" },
];
export interface JournalData {
  playthroughs: Playthrough[];
  entries: PlaythroughEntry[];
}
export const emptyJournalData = (): JournalData => ({
  playthroughs: [],
  entries: [],
});
export type PlaythroughChanges = Pick<
  Playthrough,
  | "title"
  | "startedAt"
  | "completedAt"
  | "status"
  | "platform"
  | "difficulty"
  | "notes"
>;
export type EntryChanges = Omit<
  PlaythroughEntry,
  "id" | "playthroughId" | "createdAt" | "updatedAt"
>;
export type JournalAction =
  | { type: "create-playthrough"; gameId: string; changes: PlaythroughChanges }
  | { type: "edit-playthrough"; id: string; changes: PlaythroughChanges }
  | { type: "delete-playthrough"; id: string }
  | {
      type: "save-entry";
      playthroughId: string;
      id?: string;
      changes: EntryChanges;
    }
  | { type: "delete-entry"; id: string };

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const text = (value: unknown): value is string =>
  typeof value === "string" && !!value.trim();
const optionalText = (value: unknown) =>
  value === undefined || typeof value === "string";
const optionalNumber = (value: unknown, min: number, max = Number.MAX_VALUE) =>
  value === undefined ||
  (typeof value === "number" &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max);
export const isPlaythroughStatus = (
  value: unknown,
): value is PlaythroughStatus =>
  playthroughStatuses.some((status) => status.value === value);
export const isEntryType = (value: unknown): value is JournalEntryType =>
  journalEntryTypes.some((type) => type.value === value);
function validPlaythrough(value: unknown): value is PlaythroughChanges {
  return (
    record(value) &&
    text(value.title) &&
    isDateOnly(value.startedAt) &&
    (value.completedAt === undefined ||
      (isDateOnly(value.completedAt) &&
        value.completedAt >= value.startedAt)) &&
    isPlaythroughStatus(value.status) &&
    optionalText(value.platform) &&
    optionalText(value.difficulty) &&
    optionalText(value.notes)
  );
}
function validEntry(value: unknown): value is EntryChanges {
  return (
    record(value) &&
    text(value.title) &&
    text(value.content) &&
    isEntryType(value.type) &&
    optionalText(value.chapterLabel) &&
    optionalNumber(value.progressPercent, 0, 100) &&
    optionalNumber(value.playtimeHours, 0) &&
    (value.provisionalRating === undefined ||
      isRating(value.provisionalRating)) &&
    typeof value.containsSpoilers === "boolean" &&
    isVisibility(value.visibility) &&
    isDateOnly(value.entryDate)
  );
}
export function isJournalData(value: unknown): value is JournalData {
  if (
    !record(value) ||
    !Array.isArray(value.playthroughs) ||
    !Array.isArray(value.entries)
  )
    return false;
  const parents = value.playthroughs,
    entries = value.entries;
  if (
    !parents.every(
      (item) =>
        record(item) &&
        text(item.id) &&
        text(item.gameId) &&
        Number.isSafeInteger(item.playthroughNumber) &&
        (item.playthroughNumber as number) > 0 &&
        timestamp(item.createdAt) &&
        timestamp(item.updatedAt) &&
        validPlaythrough(item),
    )
  )
    return false;
  if (
    !entries.every(
      (item) =>
        record(item) &&
        text(item.id) &&
        text(item.playthroughId) &&
        parents.some((parent) => parent.id === item.playthroughId) &&
        timestamp(item.createdAt) &&
        timestamp(item.updatedAt) &&
        validEntry(item),
    )
  )
    return false;
  const ids = [...parents, ...entries].map((item) => item.id);
  return (
    new Set(ids).size === ids.length &&
    new Set(
      parents.map((item) =>
        JSON.stringify([item.gameId, item.playthroughNumber]),
      ),
    ).size === parents.length
  );
}
export function updateJournalData(
  data: JournalData,
  action: JournalAction,
  now = new Date().toISOString(),
  newId: () => string = () => crypto.randomUUID(),
): JournalData {
  let playthroughs = [...data.playthroughs],
    entries = [...data.entries];
  function allocateId() {
    const id = newId();
    if (
      !text(id) ||
      [...playthroughs, ...entries].some((item) => item.id === id)
    )
      throw new Error(
        "Couldn’t allocate a unique journal ID. Please try again.",
      );
    return id;
  }
  function parent(id: string) {
    const item = playthroughs.find((item) => item.id === id);
    if (!item) throw new Error("This playthrough no longer exists.");
    return item;
  }
  function touch(id: string) {
    playthroughs = playthroughs.map((item) =>
      item.id === id ? { ...item, updatedAt: now } : item,
    );
  }
  function cleanPlaythrough(changes: PlaythroughChanges): PlaythroughChanges {
    if (!text(changes.title)) throw new Error("Give your playthrough a title.");
    if (!validPlaythrough(changes))
      throw new Error(
        "Choose a valid status and start date. If set, completion date must be on or after the start date.",
      );
    return {
      title: changes.title.trim(),
      startedAt: changes.startedAt,
      completedAt: changes.completedAt,
      status: changes.status,
      platform: changes.platform?.trim() || undefined,
      difficulty: changes.difficulty?.trim() || undefined,
      notes: changes.notes?.trim() || undefined,
    };
  }
  switch (action.type) {
    case "create-playthrough": {
      if (!text(action.gameId))
        throw new Error("Choose a game for your playthrough.");
      const changes = cleanPlaythrough(action.changes);
      const playthroughNumber =
        Math.max(
          0,
          ...playthroughs
            .filter((item) => item.gameId === action.gameId)
            .map((item) => item.playthroughNumber),
        ) + 1;
      playthroughs.push({
        id: allocateId(),
        gameId: action.gameId,
        playthroughNumber,
        ...changes,
        createdAt: now,
        updatedAt: now,
      });
      break;
    }
    case "edit-playthrough": {
      const previous = parent(action.id);
      const changes = cleanPlaythrough(action.changes);
      playthroughs = playthroughs.map((item) =>
        item.id === action.id
          ? { ...previous, ...changes, updatedAt: now }
          : item,
      );
      break;
    }
    case "delete-playthrough":
      parent(action.id);
      playthroughs = playthroughs.filter((item) => item.id !== action.id);
      entries = entries.filter((item) => item.playthroughId !== action.id);
      break;
    case "save-entry": {
      parent(action.playthroughId);
      const changes = action.changes;
      if (!text(changes.title))
        throw new Error("Give this journal entry a title.");
      if (!text(changes.content))
        throw new Error("Write some journal content before saving.");
      if (!optionalNumber(changes.progressPercent, 0, 100))
        throw new Error(
          "Progress must be a number between 0 and 100, or left blank.",
        );
      if (!optionalNumber(changes.playtimeHours, 0))
        throw new Error(
          "Playtime must be a nonnegative number, or left blank.",
        );
      if (!validEntry(changes))
        throw new Error(
          "Check the entry type, date, provisional half-star rating and visibility preference.",
        );
      const previous = action.id
        ? entries.find((item) => item.id === action.id)
        : undefined;
      if (
        action.id &&
        (!previous || previous.playthroughId !== action.playthroughId)
      )
        throw new Error("This entry does not belong to this playthrough.");
      const entry: PlaythroughEntry = {
        ...changes,
        title: changes.title.trim(),
        content: changes.content.trim(),
        chapterLabel: changes.chapterLabel?.trim() || undefined,
        id: previous?.id ?? allocateId(),
        playthroughId: action.playthroughId,
        createdAt: previous?.createdAt ?? now,
        updatedAt: now,
      };
      entries = previous
        ? entries.map((item) => (item.id === entry.id ? entry : item))
        : [...entries, entry];
      touch(action.playthroughId);
      break;
    }
    case "delete-entry": {
      const entry = entries.find((item) => item.id === action.id);
      if (!entry) throw new Error("This entry no longer exists.");
      entries = entries.filter((item) => item.id !== action.id);
      touch(entry.playthroughId);
      break;
    }
  }
  const result = { playthroughs, entries };
  if (!isJournalData(result))
    throw new Error("The journal changes could not be validated.");
  return result;
}
export function chronologicalEntries(
  entries: readonly PlaythroughEntry[],
): PlaythroughEntry[] {
  return [...entries].sort(
    (a, b) =>
      a.entryDate.localeCompare(b.entryDate) ||
      a.createdAt.localeCompare(b.createdAt) ||
      a.id.localeCompare(b.id),
  );
}
export function journalStats(data: JournalData) {
  return {
    total: data.playthroughs.length,
    completed: data.playthroughs.filter((item) => item.status === "completed")
      .length,
    active: data.playthroughs.filter((item) => item.status === "in-progress")
      .length,
    entries: data.entries.length,
  };
}
export function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
export function parseProgress(value: string): number | undefined {
  const number = parsePlaytime(value);
  if (number !== undefined && number > 100)
    throw new Error("Progress must be between 0 and 100.");
  return number;
}
