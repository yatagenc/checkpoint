import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { storage } from "../lib/storage";
import { rememberSavedGame } from "../services/gameDisplay";
import {
  emptyPersonalData,
  isPersonalData,
  updatePersonalData,
} from "../lib/personal";
import type { PersonalAction } from "../lib/personal";
import { PersonalContext } from "./personal-context";
import type { SaveResult, JournalSaveResult } from "./personal-context";
import {
  emptyJournalData,
  isJournalData,
  updateJournalData,
} from "../lib/journals";
import type { JournalAction } from "../lib/journals";

export function PersonalProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(() =>
    storage.snapshot("personal-data", isPersonalData),
  );
  const [data, setData] = useState(() =>
    initial.result.status === "ready"
      ? initial.result.data
      : emptyPersonalData(),
  );
  const [storageStatus, setStorageStatus] = useState(initial.result.status);
  const personalRevision = useRef(initial.raw);
  const [announcement, setAnnouncement] = useState("");
  const current = useRef(data);
  const [journalInitial] = useState(() =>
    storage.snapshot("journals", isJournalData),
  );
  const [journals, setJournals] = useState(() =>
    journalInitial.result.status === "ready"
      ? journalInitial.result.data
      : emptyJournalData(),
  );
  const [journalStorageStatus, setJournalStorageStatus] = useState(
    journalInitial.result.status,
  );
  const journalRevision = useRef(journalInitial.raw);
  const currentJournals = useRef(journals);
  function dispatchJournal(action: JournalAction): JournalSaveResult {
    try {
      if (journalStorageStatus === "invalid")
        return {
          ok: false,
          message:
            "Journal saves are blocked to preserve the unreadable record. Recover the stored data and reload before saving.",
        };
      const previous = currentJournals.current;
      const next = updateJournalData(previous, action);
      const write = storage.writeIfUnchanged(
        "journals",
        next,
        journalRevision.current,
      );
      if (!write.ok && write.reason === "conflict") {
        const latest = storage.snapshot("journals", isJournalData);
        setJournalStorageStatus(latest.result.status);
        if (
          latest.result.status === "ready" ||
          latest.result.status === "missing"
        ) {
          const fresh =
            latest.result.status === "ready"
              ? latest.result.data
              : emptyJournalData();
          currentJournals.current = fresh;
          setJournals(fresh);
          journalRevision.current = latest.raw;
        }
        return {
          ok: false,
          message:
            "Journal storage changed in another tab. No changes were saved. The latest readable records were loaded; review them before trying again.",
        };
      }
      if (!write.ok)
        return {
          ok: false,
          message:
            "Couldn’t save your journal to this device. Storage may be blocked or full. Your changes have not been applied.",
        };
      journalRevision.current = write.raw;
      if (action.type === "create-playthrough")
        rememberSavedGame(action.gameId);
      const id =
        action.type === "create-playthrough"
          ? next.playthroughs.find(
              (item) =>
                !previous.playthroughs.some((old) => old.id === item.id),
            )?.id
          : action.type === "save-entry"
            ? (action.id ??
              next.entries.find(
                (item) => !previous.entries.some((old) => old.id === item.id),
              )?.id)
            : action.id;
      currentJournals.current = next;
      setJournals(next);
      setJournalStorageStatus("ready");
      setAnnouncement(
        action.type === "delete-playthrough"
          ? "Playthrough and its journal entries deleted. Other playthroughs and library records were kept."
          : action.type === "delete-entry"
            ? "Journal entry deleted."
            : action.type === "save-entry"
              ? "Journal entry saved on this device."
              : "Playthrough saved on this device.",
      );
      return { ok: true, id };
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Couldn’t save your journal.",
      };
    }
  }
  function dispatch(action: PersonalAction): SaveResult {
    try {
      if (storageStatus === "invalid")
        return {
          ok: false,
          message:
            "Personal saves are blocked to preserve the unreadable record. Recover the stored data and reload before saving.",
        };
      const next = updatePersonalData(current.current, action);
      if (next === current.current) return { ok: true };
      if (!isPersonalData(next))
        return {
          ok: false,
          message:
            "These changes contain invalid personal data and could not be saved.",
        };
      const write = storage.writeIfUnchanged(
        "personal-data",
        next,
        personalRevision.current,
      );
      if (!write.ok && write.reason === "conflict") {
        const latest = storage.snapshot("personal-data", isPersonalData);
        setStorageStatus(latest.result.status);
        if (
          latest.result.status === "ready" ||
          latest.result.status === "missing"
        ) {
          const fresh =
            latest.result.status === "ready"
              ? latest.result.data
              : emptyPersonalData();
          current.current = fresh;
          setData(fresh);
          personalRevision.current = latest.raw;
        }
        return {
          ok: false,
          message:
            "Personal storage changed in another tab. No changes were saved. The latest readable records were loaded; review them before trying again.",
        };
      }
      if (!write.ok)
        return {
          ok: false,
          message:
            "Couldn’t save to this device. Storage may be blocked or full. Your changes have not been applied.",
        };
      personalRevision.current = write.raw;
      if (action.type !== "remove" && action.type !== "delete-review")
        rememberSavedGame(action.gameId);
      current.current = next;
      setData(next);
      setStorageStatus("ready");
      setAnnouncement(
        action.type === "remove"
          ? "Game removed from this device, including its personal details, favorite selection, and review."
          : action.type === "delete-review"
            ? "Review deleted. Your library entry and personal rating were kept."
            : action.type === "save-review"
              ? "Review saved on this device."
              : "",
      );
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Couldn’t save your changes.",
      };
    }
  }
  return (
    <PersonalContext.Provider
      value={{
        data,
        storageStatus,
        dispatch,
        announcement,
        journals,
        journalStorageStatus,
        dispatchJournal,
      }}
    >
      {children}
    </PersonalContext.Provider>
  );
}
