import { usePersonalData } from "../../hooks/usePersonalData";

export function StorageNotice() {
  const { storageStatus, journalStorageStatus, announcement } =
    usePersonalData();
  return (
    <>
      {storageStatus === "invalid" && (
        <p className="storage-notice" role="alert">
          Saved personal data couldn’t be read. The stored record is untouched.
          Saves are blocked to protect it; recover the data and reload before
          editing.
        </p>
      )}
      {storageStatus === "unavailable" && (
        <p className="storage-notice" role="alert">
          Device storage is unavailable. Personal changes cannot be saved until
          storage is enabled.
        </p>
      )}
      {journalStorageStatus === "invalid" && (
        <p className="storage-notice" role="alert">
          Saved journal data couldn’t be read. It is untouched and journal saves
          are blocked to protect it. Recover the data and reload before editing
          journals. Your library and reviews are separate.
        </p>
      )}
      {journalStorageStatus === "unavailable" && (
        <p className="storage-notice" role="alert">
          Journal storage is unavailable. Journal changes cannot be saved until
          storage is enabled.
        </p>
      )}
      {announcement && (
        <p className="save-feedback personal-announcement" role="status">
          {announcement}
        </p>
      )}
    </>
  );
}
