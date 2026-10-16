const PREFIX = "checkpoint:v1:";
type Validator<T> = (value: unknown) => value is T;
type StoredValue<T> = { version: 1; data: T };

/** Access is deferred: SSR, blocked storage and quota errors all fail safely. */
export function createStorage(getStorage: () => Storage | undefined) {
  return {
    read<T>(key: string, fallback: T, validate: Validator<T>): T {
      try {
        const raw = getStorage()?.getItem(PREFIX + key);
        if (!raw) return fallback;
        const value: unknown = JSON.parse(raw);
        if (typeof value !== "object" || value === null) return fallback;
        const envelope = value as Partial<StoredValue<unknown>>;
        return envelope.version === 1 && validate(envelope.data)
          ? envelope.data
          : fallback;
      } catch {
        return fallback;
      }
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
