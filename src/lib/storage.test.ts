import { test } from "node:test";
import assert from "node:assert/strict";
import { createStorage } from "./storage.ts";

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    key: (i) => [...values.keys()][i] ?? null,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
}
const isString = (value: unknown): value is string => typeof value === "string";
test("round trips, namespaces keys and removes only its own key", () => {
  const target = memoryStorage();
  const store = createStorage(() => target);
  target.setItem("unrelated", "keep");
  assert.equal(store.write("note", "Chapter one"), true);
  assert.equal(store.read("note", "", isString), "Chapter one");
  assert.ok(target.getItem("checkpoint:v1:note"));
  assert.equal(store.remove("note"), true);
  assert.equal(store.read("note", "fallback", isString), "fallback");
  assert.equal(target.getItem("unrelated"), "keep");
});
test("rejects corrupted JSON, incompatible versions and invalid data", () => {
  const target = memoryStorage();
  const store = createStorage(() => target);
  for (const raw of [
    "{",
    "null",
    '{"version":2,"data":"old"}',
    '{"version":1,"data":12}',
  ]) {
    target.setItem("checkpoint:v1:note", raw);
    assert.equal(store.read("note", "fallback", isString), "fallback");
  }
});
test("handles unavailable storage, blocked access, quota errors and circular values", () => {
  for (const getStorage of [
    () => undefined,
    () => {
      throw new Error("Blocked");
    },
  ]) {
    const store = createStorage(getStorage);
    assert.equal(store.read("note", "fallback", isString), "fallback");
    assert.equal(store.write("note", "value"), false);
    assert.equal(store.remove("note"), false);
  }
  const target = memoryStorage();
  target.setItem = () => {
    throw new Error("Quota exceeded");
  };
  assert.equal(createStorage(() => target).write("note", "value"), false);
  const circular: { self?: unknown } = {};
  circular.self = circular;
  assert.equal(createStorage(memoryStorage).write("note", circular), false);
});
