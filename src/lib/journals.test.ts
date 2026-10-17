import { test } from "node:test";
import assert from "node:assert/strict";
import {
  chronologicalEntries,
  emptyJournalData,
  isJournalData,
  journalStats,
  parseProgress,
  updateJournalData,
} from "./journals.ts";
import type {
  EntryChanges,
  JournalAction,
  JournalData,
  PlaythroughChanges,
} from "./journals.ts";
import { emptyPersonalData, updatePersonalData } from "./personal.ts";

const start = "2026-10-01T10:00:00.000Z",
  later = "2026-10-02T10:00:00.000Z";
let sequence = 0;
const apply = (data: JournalData, action: JournalAction, now = start) =>
  updateJournalData(data, action, now, () => `journal-${++sequence}`);
const journey: PlaythroughChanges = {
  title: " First journey ",
  startedAt: "2026-10-01",
  status: "in-progress",
  platform: "PC",
  difficulty: "Custom",
};
const entry: EntryChanges = {
  title: " First discovery ",
  type: "milestone",
  content: " A moment worth remembering. ",
  entryDate: "2026-10-01",
  containsSpoilers: true,
  visibility: "private",
  provisionalRating: 3.5,
};

test("multiple playthroughs have independent IDs and per-game numbers; edits retain identity", () => {
  let data = apply(emptyJournalData(), {
    type: "create-playthrough",
    gameId: "elden-ring",
    changes: journey,
  });
  const first = data.playthroughs[0];
  data = apply(data, {
    type: "create-playthrough",
    gameId: "elden-ring",
    changes: { ...journey, title: "Second journey" },
  });
  data = apply(data, {
    type: "create-playthrough",
    gameId: "hades",
    changes: journey,
  });
  assert.deepEqual(
    data.playthroughs.map((item) => item.playthroughNumber),
    [1, 2, 1],
  );
  assert.equal(new Set(data.playthroughs.map((item) => item.id)).size, 3);
  data = apply(
    data,
    {
      type: "edit-playthrough",
      id: first.id,
      changes: {
        ...journey,
        title: "Finished",
        status: "completed",
        completedAt: "2026-10-02",
        notes: "Done.",
      },
    },
    later,
  );
  assert.equal(data.playthroughs[0].id, first.id);
  assert.equal(data.playthroughs[0].createdAt, start);
  assert.equal(data.playthroughs[0].updatedAt, later);
  assert.equal(data.playthroughs[1].status, "in-progress");
  assert.deepEqual(journalStats(data), {
    total: 3,
    active: 2,
    completed: 1,
    entries: 0,
  });
});
test("entry CRUD touches parent activity and keeps ratings independent", () => {
  let data = apply(emptyJournalData(), {
    type: "create-playthrough",
    gameId: "elden-ring",
    changes: journey,
  });
  const id = data.playthroughs[0].id;
  const personal = updatePersonalData(emptyPersonalData(), {
    type: "rate",
    gameId: "elden-ring",
    rating: 5,
  });
  const snapshot = JSON.stringify(personal);
  data = apply(
    data,
    {
      type: "save-entry",
      playthroughId: id,
      changes: { ...entry, progressPercent: 0, playtimeHours: 0 },
    },
    later,
  );
  const saved = data.entries[0];
  assert.equal(saved.content, "A moment worth remembering.");
  assert.equal(saved.title, "First discovery");
  assert.equal(data.playthroughs[0].updatedAt, later);
  assert.equal(saved.progressPercent, 0);
  assert.equal(saved.provisionalRating, 3.5);
  assert.equal(JSON.stringify(personal), snapshot);
  data = apply(
    data,
    {
      type: "save-entry",
      playthroughId: id,
      id: saved.id,
      changes: {
        ...entry,
        title: "Edited",
        content: "New thoughts.",
        provisionalRating: undefined,
        containsSpoilers: false,
        visibility: "friends-only",
      },
    },
    "2026-10-03T12:00:00.000Z",
  );
  assert.equal(data.entries.length, 1);
  assert.equal(data.entries[0].id, saved.id);
  assert.equal(data.entries[0].createdAt, later);
  assert.equal(data.entries[0].visibility, "friends-only");
  data = apply(data, { type: "delete-entry", id: saved.id });
  assert.equal(data.entries.length, 0);
  assert.equal(data.playthroughs.length, 1);
});
test("parent deletion cascades only its own entries; orphan/cross-parent edits are rejected", () => {
  let data = emptyJournalData();
  for (const title of ["One", "Two"])
    data = apply(data, {
      type: "create-playthrough",
      gameId: "elden-ring",
      changes: { ...journey, title },
    });
  const [first, second] = data.playthroughs;
  for (const item of data.playthroughs)
    data = apply(data, {
      type: "save-entry",
      playthroughId: item.id,
      changes: entry,
    });
  assert.throws(
    () =>
      apply(data, {
        type: "save-entry",
        playthroughId: second.id,
        id: data.entries[0].id,
        changes: entry,
      }),
    /does not belong/,
  );
  assert.throws(
    () =>
      apply(data, {
        type: "save-entry",
        playthroughId: "missing",
        changes: entry,
      }),
    /no longer exists/,
  );
  data = apply(data, { type: "delete-playthrough", id: first.id });
  assert.equal(data.playthroughs.length, 1);
  assert.equal(data.entries.length, 1);
  assert.equal(data.entries[0].playthroughId, second.id);
  assert.equal(isJournalData(data), true);
});
test("timeline uses entry date, timestamp and ID for stable ties, without mutation", () => {
  let data = apply(emptyJournalData(), {
    type: "create-playthrough",
    gameId: "hades",
    changes: journey,
  });
  const id = data.playthroughs[0].id;
  for (const [title, entryDate, now] of [
    ["Later day", "2026-10-03", start],
    ["Second same day", "2026-10-01", later],
    ["First same day", "2026-10-01", start],
  ])
    data = apply(
      data,
      {
        type: "save-entry",
        playthroughId: id,
        changes: { ...entry, title, entryDate },
      },
      now,
    );
  const before = JSON.stringify(data);
  assert.deepEqual(
    chronologicalEntries(data.entries).map((item) => item.title),
    ["First same day", "Second same day", "Later day"],
  );
  assert.equal(JSON.stringify(data), before);
  const tied = [
    { ...data.entries[0], entryDate: "2026-10-01", id: "b" },
    { ...data.entries[0], entryDate: "2026-10-01", id: "a" },
  ];
  assert.deepEqual(
    chronologicalEntries(tied).map((item) => item.id),
    ["a", "b"],
  );
});
test("validation rejects malformed dates, blank text, invalid percentages, hours and ratings", () => {
  const data = apply(emptyJournalData(), {
    type: "create-playthrough",
    gameId: "hades",
    changes: journey,
  });
  const id = data.playthroughs[0].id;
  for (const patch of [
    { title: " " },
    { content: "\n" },
    { entryDate: "2026-02-31" },
    { progressPercent: -1 },
    { progressPercent: 100.1 },
    { progressPercent: NaN },
    { playtimeHours: -0.5 },
    { playtimeHours: Infinity },
    { provisionalRating: 0.25 },
    { visibility: "everyone" },
    { type: "boss-fight" },
  ])
    assert.throws(() =>
      apply(data, {
        type: "save-entry",
        playthroughId: id,
        changes: { ...entry, ...patch } as EntryChanges,
      }),
    );
  assert.throws(() =>
    apply(data, {
      type: "edit-playthrough",
      id,
      changes: { ...journey, completedAt: "2026-09-01" },
    }),
  );
  assert.throws(() =>
    apply(data, { type: "create-playthrough", gameId: "", changes: journey }),
  );
  assert.equal(parseProgress(""), undefined);
  assert.equal(parseProgress("0"), 0);
  assert.equal(parseProgress("100"), 100);
  assert.equal(parseProgress("12.5"), 12.5);
  assert.throws(() => parseProgress("101"));
  const saved = apply(data, {
    type: "save-entry",
    playthroughId: id,
    changes: entry,
  });
  assert.equal(isJournalData(JSON.parse(JSON.stringify(saved))), true);
  assert.equal(
    isJournalData({
      ...saved,
      entries: [{ ...saved.entries[0], playthroughId: "missing" }],
    }),
    false,
  );
  assert.equal(
    isJournalData({ ...saved, entries: [...saved.entries, ...saved.entries] }),
    false,
  );
  assert.equal(isJournalData(null), false);
  assert.throws(
    () =>
      updateJournalData(
        data,
        { type: "create-playthrough", gameId: "hades", changes: journey },
        start,
        () => id,
      ),
    /unique journal ID/,
  );
});
