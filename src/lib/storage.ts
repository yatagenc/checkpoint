const PREFIX = "checkpoint:v1:";
type Validator<T> = (value: unknown) => value is T;
type StoredValue<T> = { version: 1; data: T };
export type StorageRead<T> =
  | { status: "ready"; data: T }
  | { status: "missing" | "invalid" | "unavailable" };

/** Access is deferred: SSR, blocked storage and quota errors all fail safely. */
export function createStorage(getStorage: () => Storage | undefined) {
  function snapshot<T>(
    key: string,
    validate: Validator<T>,
  ): { result: StorageRead<T>; raw: string | null } {
    let raw: string | null;
    try {
      const target = getStorage();
      if (!target) return { result: { status: "unavailable" }, raw: null };
      raw = target.getItem(PREFIX + key);
    } catch {
      return { result: { status: "unavailable" }, raw: null };
    }
    if (raw === null) return { result: { status: "missing" }, raw };
    try {
      const value: unknown = JSON.parse(raw);
      if (typeof value !== "object" || value === null)
        return { result: { status: "invalid" }, raw };
      const envelope = value as Partial<StoredValue<unknown>>;
      const result: StorageRead<T> =
        envelope.version === 1 && validate(envelope.data)
          ? { status: "ready", data: envelope.data }
          : { status: "invalid" };
      return { result, raw };
    } catch {
      return { result: { status: "invalid" }, raw };
    }
  }
  function readResult<T>(key: string, validate: Validator<T>): StorageRead<T> {
    return snapshot(key, validate).result;
  }
  return {
    snapshot,
    readResult,
    /** Best-effort optimistic guard; LocalStorage has no atomic cross-tab CAS. */
    writeIfUnchanged<T>(
      key: string,
      data: T,
      expectedRaw: string | null,
    ):
      | { ok: true; raw: string }
      | { ok: false; reason: "conflict" | "unavailable" } {
      try {
        const target = getStorage();
        if (!target) return { ok: false, reason: "unavailable" };
        if (target.getItem(PREFIX + key) !== expectedRaw)
          return { ok: false, reason: "conflict" };
        const raw = JSON.stringify({
          version: 1,
          data,
        } satisfies StoredValue<T>);
        target.setItem(PREFIX + key, raw);
        return { ok: true, raw };
      } catch {
        return { ok: false, reason: "unavailable" };
      }
    },
    read<T>(key: string, fallback: T, validate: Validator<T>): T {
      const result = readResult(key, validate);
      return result.status === "ready" ? result.data : fallback;
    },
    write<T>(key: string, data: T): boolean {
      try {
        const target = getStorage();
        if (!target) return false;
        const envelope: StoredValue<T> = { version: 1, data };
        target.setItem(PREFIX + key, JSON.stringify(envelope));
        return true;
      } catch {
        return false;
      }
    },
    remove(key: string): boolean {
      try {
        const target = getStorage();
        if (!target) return false;
        target.removeItem(PREFIX + key);
        return true;
      } catch {
        return false;
      }
    },
  };
}

export const storage = createStorage(() =>
  typeof window === "undefined" ? undefined : window.localStorage,
);
