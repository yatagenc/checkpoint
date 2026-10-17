import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyPersonalData,
  isPersonalData,
  isRating,
  parsePlaytime,
  personalStats,
  updatePersonalData,
} from "./personal.ts";
import type { PersonalData, PersonalAction } from "./personal.ts";
import type { Rating } from "../types/index.ts";

const created = "2026-10-16T10:00:00.000Z";
const updated = "2026-10-16T11:00:00.000Z";
const apply = (data: PersonalData, action: PersonalAction, now = created) =>
  updatePersonalData(data, action, now, () => `review:${action.gameId}`);
test("stale editors cannot resurrect removed records or overwrite identity fields", () => {
  assert.throws(
    () =>
      apply(emptyPersonalData(), {
        type: "edit",
        gameId: "hades",
        changes: { status: "playing" },
      }),
    /removed/,
  );
  const original = apply(emptyPersonalData(), { type: "add", gameId: "hades" });
  const changes = {
    status: "playing" as const,
    id: "bad",
    gameId: "different",
    userId: "other",
    favoriteOrder: 1,
  };
  const edited = apply(original, { type: "edit", gameId: "hades", changes });
  assert.equal(edited.library[0].id, original.library[0].id);
  assert.equal(edited.library[0].gameId, "hades");
  assert.equal(edited.library[0].favoriteOrder, undefined);
  assert.equal(
    isPersonalData({
      ...edited,
      library: [{ ...edited.library[0], addedAt: "2026-02-31T00:00:00Z" }],
    }),
    false,
  );
});
test("library CRUD uses stable IDs, preserves initial date and avoids duplicates or metadata", () => {
  let data = apply(emptyPersonalData(), { type: "add", gameId: "elden-ring" });
  const original = data;
  assert.equal(apply(data, { type: "add", gameId: "elden-ring" }), data);
  data = apply(
    data,
    {
      type: "edit",
      gameId: "elden-ring",
      changes: {
        status: "playing",
        playtimeHours: 12.5,
        notes: "  A memorable fight  ",
        rating: 4.5,
      },
    },
    updated,
  );
  assert.equal(data.library.length, 1);
  assert.equal(data.library[0].addedAt, created);
  assert.equal(data.library[0].updatedAt, updated);
  assert.equal(data.library[0].notes, "A memorable fight");
  assert.equal(data.library[0].playtimeHours, 12.5);
  assert.equal(original.library[0].status, "backlog");
  assert.equal(data.library[0].gameId, "elden-ring");
  assert.ok(!("title" in data.library[0]));
  assert.equal(
    apply(data, { type: "remove", gameId: "elden-ring" }).library.length,
    0,
  );
});
test("all half-star ratings can be set, changed and cleared without completing the game", () => {
  let data = emptyPersonalData();
  for (const rating of [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5] as Rating[]) {
    data = apply(data, { type: "rate", gameId: "hades", rating });
    assert.equal(data.library[0].rating, rating);
    assert.equal(data.library[0].status, "backlog");
  }
  data = apply(data, { type: "rate", gameId: "hades" });
  assert.equal(data.library[0].rating, undefined);
  assert.equal(personalStats(data).average, null);
  for (const value of [0, -1, 0.25, 5.5, NaN, Infinity, "5", null])
    assert.equal(isRating(value), false);
});
test("review CRUD preserves IDs and creation time, synchronizes rating and trims text", () => {
  let data = apply(emptyPersonalData(), {
    type: "save-review",
    gameId: "celeste",
    changes: {
      title: "  The climb  ",
      text: "  A thoughtful journey.  ",
      rating: 4.5,
      containsSpoilers: true,
      visibility: "friends-only",
    },
  });
  assert.equal(data.library[0].status, "backlog");
  assert.equal(data.reviews[0].text, "A thoughtful journey.");
  assert.equal(data.reviews[0].title, "The climb");
  assert.equal(data.library[0].rating, 4.5);
  const id = data.reviews[0].id;
  data = apply(
    data,
    {
      type: "save-review",
      gameId: "celeste",
      changes: {
        text: "Another perspective.",
        rating: 5,
        containsSpoilers: false,
        visibility: "public",
      },
    },
    updated,
  );
  assert.equal(data.reviews.length, 1);
  assert.equal(data.reviews[0].id, id);
  assert.equal(data.reviews[0].createdAt, created);
  assert.equal(data.reviews[0].updatedAt, updated);
  assert.equal(data.library[0].rating, 5);
  data = apply(data, { type: "rate", gameId: "celeste", rating: 3.5 });
  assert.equal(data.reviews[0].rating, 3.5);
  data = apply(data, { type: "rate", gameId: "celeste" });
  assert.equal(data.reviews[0].rating, undefined);
  data = apply(data, { type: "delete-review", gameId: "celeste" });
  assert.equal(data.reviews.length, 0);
  assert.equal(data.library.length, 1);
  assert.throws(
    () =>
      apply(data, {
        type: "save-review",
        gameId: "celeste",
        changes: {
          text: " \n ",
          containsSpoilers: false,
          visibility: "private",
        },
      }),
    /Write a review/,
  );
});
test("favorites enforce four, preserve order, and library deletion cascades coherently", () => {
  let data = emptyPersonalData();
  for (const id of ["a", "b", "c", "d", "e"])
    data = apply(data, { type: "add", gameId: id });
  for (const id of ["b", "a", "c", "d"])
    data = apply(data, { type: "favorite", gameId: id });
  assert.deepEqual(
    personalStats(data).favorites.map((entry) => entry.gameId),
    ["b", "a", "c", "d"],
  );
  assert.throws(
    () => apply(data, { type: "favorite", gameId: "e" }),
    /four favorites/,
  );
  data = apply(data, { type: "favorite", gameId: "a" });
  data = apply(data, { type: "favorite", gameId: "e" });
  assert.deepEqual(
    personalStats(data).favorites.map((entry) => entry.gameId),
    ["b", "c", "d", "e"],
  );
  data = apply(data, {
    type: "save-review",
    gameId: "b",
    changes: {
      text: "My review.",
      rating: 4,
      containsSpoilers: false,
      visibility: "private",
    },
  });
  data = apply(data, { type: "remove", gameId: "b" });
  assert.equal(data.reviews.length, 0);
  assert.equal(personalStats(data).favorites.length, 3);
  assert.equal(
    data.library.some((entry) => entry.gameId === "b"),
    false,
  );
  assert.throws(
    () => apply(data, { type: "favorite", gameId: "absent" }),
    /library first/,
  );
});
test("profile statistics reflect actual data, not unrated games or community scores", () => {
  let data = emptyPersonalData();
  for (const [gameId, status, hours, rating] of [
    ["a", "completed", 20.5, 5],
    ["b", "playing", 1.5, 4],
    ["c", "backlog", undefined, undefined],
  ] as const) {
    data = apply(data, { type: "add", gameId });
    data = apply(data, {
      type: "edit",
      gameId,
      changes: { status, playtimeHours: hours, rating },
    });
  }
  const stats = personalStats(data);
  assert.equal(stats.total, 3);
  assert.equal(stats.completed, 1);
  assert.equal(stats.playing, 1);
  assert.equal(stats.backlog, 1);
  assert.equal(stats.hours, 22);
  assert.equal(stats.average, 4.5);
  assert.equal(stats.ratedCount, 2);
  assert.equal(stats.distribution.find((bin) => bin.rating === 5)?.count, 1);
});
test("runtime validation rejects corruption, duplicate IDs, invalid hours, dates and ratings", () => {
  const valid = apply(emptyPersonalData(), { type: "add", gameId: "a" });
  assert.equal(isPersonalData(valid), true);
  assert.equal(isPersonalData(JSON.parse(JSON.stringify(valid))), true);
  for (const value of [
    null,
    {},
    [],
    { library: [], reviews: [{}] },
    { library: [...valid.library, ...valid.library], reviews: [] },
  ])
    assert.equal(isPersonalData(value), false);
  for (const patch of [
    { status: "oops" },
    { playtimeHours: -1 },
    { playtimeHours: NaN },
    { playtimeHours: Infinity },
    { rating: 0 },
    { rating: 5.1 },
    { favoriteOrder: -1 },
    { completedAt: "2026-02-31" },
  ])
    assert.equal(
      isPersonalData({
        library: [{ ...valid.library[0], ...patch }],
        reviews: [],
      }),
      false,
    );
  assert.throws(() =>
    apply(valid, {
      type: "edit",
      gameId: "a",
      changes: { status: "playing", playtimeHours: -1 },
    }),
  );
  const withReview = apply(valid, {
    type: "save-review",
    gameId: "a",
    changes: {
      text: "Text",
      rating: 4,
      containsSpoilers: false,
      visibility: "private",
    },
  });
  assert.equal(
    isPersonalData({
      ...withReview,
      reviews: [{ ...withReview.reviews[0], rating: 2 }],
    }),
    false,
  );
  assert.equal(
    isPersonalData({
      ...withReview,
      reviews: [{ ...withReview.reviews[0], visibility: "everyone" }],
    }),
    false,
  );
});
test("playtime parsing distinguishes missing, zero and decimal values", () => {
  assert.equal(parsePlaytime(""), undefined);
  assert.equal(parsePlaytime("  "), undefined);
  assert.equal(parsePlaytime("0"), 0);
  assert.equal(parsePlaytime("12.5"), 12.5);
  assert.equal(parsePlaytime(".5"), 0.5);
  for (const value of [
    "-1",
    "abc",
    "NaN",
    "Infinity",
    "0x20",
    "1e500",
    "12 hours",
  ])
    assert.throws(() => parsePlaytime(value));
});
