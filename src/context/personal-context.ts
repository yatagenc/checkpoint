import { createContext } from "react";
import type { PersonalAction, PersonalData } from "../lib/personal";
import type { JournalAction, JournalData } from "../lib/journals";

export type SaveResult = { ok: true } | { ok: false; message: string };
export type JournalSaveResult =
  { ok: true; id?: string } | { ok: false; message: string };
export interface PersonalContextValue {
  announcement: string;
  data: PersonalData;
  storageStatus: "ready" | "missing" | "invalid" | "unavailable";
  dispatch: (action: PersonalAction) => SaveResult;
  journals: JournalData;
  journalStorageStatus: "ready" | "missing" | "invalid" | "unavailable";
  dispatchJournal: (action: JournalAction) => JournalSaveResult;
}
export const PersonalContext = createContext<PersonalContextValue | null>(null);
