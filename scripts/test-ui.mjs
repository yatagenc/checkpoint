/** DOM integration tests: execute React, router, effects and real event handlers.
 * This is not a visual browser test; no image loads or layout engine are used.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { JSDOM } from "jsdom";

test("discovery and routes work through React event handlers", async (t) => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
  });
  for (const name of [
    "window",
    "document",
    "navigator",
    "HTMLElement",
    "HTMLInputElement",
    "Event",
    "MouseEvent",
    "FormData",
  ])
    Object.defineProperty(globalThis, name, {
      configurable: true,
      value: name === "window" ? dom.window : dom.window[name],
    });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  dom.window.scrollTo = () => {};
  // jsdom has no native dialog focus trap/layout; emulate open/close only.
  dom.window.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  dom.window.HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  const { createElement: h, act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { MemoryRouter, useLocation, useNavigate, Routes, Route } =
    await import("react-router");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
  });
  let root;
  const nativeFetch = globalThis.fetch;
  try {
    const { normalizeGame: normalizeFixture } = await vite.ssrLoadModule(
      "/server/rawg-normalize.ts",
    );
    const genreFixture = {
      genres: [
        { id: 4, name: "Action", slug: "action", gamesCount: 123456 },
        {
          id: 5,
          name: "RPG",
          slug: "role-playing-games-rpg",
          gamesCount: 54321,
        },
      ],
      count: 2,
      page: 1,
      hasNext: false,
    };
    globalThis.fetch = async (input) => {
      const params = new URL(String(input), "http://localhost").searchParams;
      if (params.get("resource") === "genres")
        return Response.json(genreFixture);
      if (params.get("genre") === "4")
        return Response.json({
          games: [
            normalizeFixture({ id: 700111, name: "Genre filter fixture" }),
          ],
          count: 1,
          page: 1,
          hasNext: false,
        });
      throw new Error("Unexpected HTTP request in DOM test");
    };
    const { default: App } = await vite.ssrLoadModule("/src/App.tsx");
    const { PersonalProvider } = await vite.ssrLoadModule(
      "/src/context/PersonalProvider.tsx",
    );
    const { GameDetails } = await vite.ssrLoadModule(
      "/src/components/games/GameDetails.tsx",
    );
    const { mockGameService } = await vite.ssrLoadModule(
      "/src/services/mockGameService.ts",
    );
    const games = await mockGameService.listGames();
    // Keep the existing curated-discovery suite, separate from live-adapter DOM scenarios.
    const { DemoExplorePage } = await vite.ssrLoadModule(
      "/src/pages/DemoExplorePage.tsx",
    );
    const { AppLayout } = await vite.ssrLoadModule(
      "/src/components/layout/AppLayout.tsx",
    );
    function DemoTestApp() {
      return h(
        Routes,
        null,
        h(
          Route,
          { path: "/explore", element: h(AppLayout) },
          h(Route, { index: true, element: h(DemoExplorePage) }),
        ),
        h(Route, { path: "*", element: h(App) }),
      );
    }
    function Probe() {
      const location = useLocation();
      const navigate = useNavigate();
      return h(
        "div",
        null,
        h("output", { id: "location" }, location.pathname + location.search),
        h(
          "button",
          { id: "history-back", onClick: () => navigate(-1) },
          "Back",
        ),
        h(
          "button",
          { id: "history-forward", onClick: () => navigate(1) },
          "Forward",
        ),
      );
    }
    async function render(path, live = false) {
      if (root) await act(async () => root.unmount());
      document.body.innerHTML = '<div id="test-root"></div>';
      root = createRoot(document.getElementById("test-root"));
      await act(async () =>
        root.render(
          h(
            MemoryRouter,
            { initialEntries: [path] },
            h(PersonalProvider, null, h(live ? App : DemoTestApp)),
            h(Probe),
          ),
        ),
      );
    }
    function query(selector) {
      const node = document.querySelector(selector);
      assert.ok(node, `Missing element: ${selector}`);
      return node;
    }
    async function click(selector) {
      await act(async () =>
        query(selector).dispatchEvent(
          new dom.window.MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            button: 0,
          }),
        ),
      );
    }
    async function type(selector, value) {
      await act(async () => {
        const input = query(selector);
        Object.getOwnPropertyDescriptor(
          dom.window.HTMLInputElement.prototype,
          "value",
        ).set.call(input, value);
        input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
      });
    }
    async function select(index, value) {
      await act(async () => {
        const input = document.querySelectorAll("main select")[index];
        input.value = value;
        input.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
      });
    }
    const cardIds = () =>
      [...document.querySelectorAll("main .game-card")].map((node) =>
        node.getAttribute("href").split("/").at(-1),
      );
    async function clickText(text, scope = document) {
      const button = [...scope.querySelectorAll("button")].find(
        (node) => node.textContent.replace(/\s+/g, " ").trim() === text,
      );
      assert.ok(button, `Missing button: ${text}`);
      await act(async () =>
        button.dispatchEvent(
          new dom.window.MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            button: 0,
          }),
        ),
      );
    }
    async function field(selector, value) {
      await act(async () => {
        const element = query(selector);
        if (element.tagName === "SELECT") {
          element.value = value;
          element.dispatchEvent(
            new dom.window.Event("change", { bubbles: true }),
          );
        } else {
          const prototype =
            element.tagName === "TEXTAREA"
              ? dom.window.HTMLTextAreaElement.prototype
              : dom.window.HTMLInputElement.prototype;
          Object.getOwnPropertyDescriptor(prototype, "value").set.call(
            element,
            value,
          );
          element.dispatchEvent(
            new dom.window.Event("input", { bubbles: true }),
          );
        }
      });
    }
    async function submitDialog() {
      await act(async () =>
        query("dialog form").dispatchEvent(
          new dom.window.Event("submit", { bubbles: true, cancelable: true }),
        ),
      );
    }
    const stored = () =>
      JSON.parse(dom.window.localStorage.getItem("checkpoint:v1:personal-data"))
        ?.data;
    const stat = (label) =>
      [...document.querySelectorAll(".personal-stats dt")].find(
        (node) => node.textContent === label,
      )?.nextElementSibling.textContent;
    await t.test(
      "home hero is preserved and its discovery link navigates",
      async () => {
        await render("/");
        assert.match(query("h1").textContent, /Great games/);
        assert.equal(document.querySelectorAll(".genre-grid a").length, 2);
        assert.match(query(".genre-grid").textContent, /123,456 games on RAWG/);
        assert.equal(
          query(".genre-grid a").getAttribute("href"),
          "/explore?genre=4",
        );
        await click(".hero-copy a");
        assert.match(query("#location").textContent, /^\/explore/);
        assert.equal(cardIds().length, 36);
      },
    );
    await t.test(
      "header search submits to a URL query and updates actual results",
      async () => {
        await render("/");
        await type(".desktop-search input", "eLdEn");
        await act(async () =>
          query(".desktop-search form").dispatchEvent(
            new dom.window.Event("submit", { bubbles: true, cancelable: true }),
          ),
        );
        assert.equal(query("#location").textContent, "/explore?q=eLdEn");
        assert.deepEqual(cardIds(), ["elden-ring"]);
      },
    );
    await t.test(
      "search, empty state, clear, intersecting filters and sorts update the DOM",
      async () => {
        await render("/explore");
        await type(".discovery-search input", "nonsense game");
        assert.equal(cardIds().length, 0);
        assert.match(query("main").textContent, /No worlds on this path/);
        await click(".clear-filters");
        assert.equal(cardIds().length, 36);
        assert.equal(query(".discovery-search input").value, "");
        await select(0, "RPG");
        await select(1, "ps5");
        await select(2, "2023");
        assert.deepEqual(cardIds(), ["baldurs-gate-3"]);
        await click("#history-back");
        assert.equal(document.querySelectorAll("main select")[2].value, "");
        assert.ok(cardIds().length > 1);
        await click("#history-forward");
        assert.deepEqual(cardIds(), ["baldurs-gate-3"]);
        await click(".clear-filters");
        await select(3, "rating");
        assert.equal(cardIds()[0], "disco-elysium");
        await select(3, "newest");
        assert.equal(cardIds()[0], "clair-obscur-expedition-33");
        await select(3, "oldest");
        assert.equal(cardIds()[0], "half-life-2");
        await select(3, "title-desc");
        assert.equal(cardIds().length, 36);
      },
    );
    await t.test(
      "deep links restore filter values and genre links work",
      async () => {
        await render(
          "/explore?q=celeste&platform=switch&year=2018&sort=rating",
        );
        assert.deepEqual(cardIds(), ["celeste"]);
        assert.equal(query(".discovery-search input").value, "celeste");
        assert.equal(
          document.querySelectorAll("main select")[1].value,
          "switch",
        );
        await render("/", true);
        await click(".genre-grid a");
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 450));
        });
        assert.match(query("#location").textContent, /genre=/);
        assert.ok(cardIds().length);
      },
    );
    await t.test(
      "card opens a detailed game; image errors reveal fallback; personal rating controls available",
      async () => {
        await render("/explore?q=elden");
        await click("main .game-card");
        assert.equal(query("#location").textContent, "/games/elden-ring");
        assert.match(query("h1").textContent, /ELDEN RING/);
        assert.equal(document.querySelectorAll(".screenshot-grid a").length, 3);
        assert.equal(
          document.querySelectorAll(".game-personal-actions input[type=radio]")
            .length,
          10,
        );
        assert.match(document.title, /ELDEN RING/);
        await act(async () =>
          query(".detail-cover img").dispatchEvent(
            new dom.window.Event("error"),
          ),
        );
        assert.equal(document.querySelector(".detail-cover img"), null);
        assert.match(query(".detail-cover").textContent, /Artwork unavailable/);
        assert.equal(dom.window.localStorage.length, 0);
      },
    );
    await t.test(
      "all 36 details render, missing metadata degrades gracefully and links are safe",
      () => {
        for (const game of games) {
          const html = renderToStaticMarkup(
            h(
              MemoryRouter,
              null,
              h(PersonalProvider, null, h(GameDetails, { game })),
            ),
          );
          assert.equal(
            JSDOM.fragment(html).querySelector("h1")?.textContent,
            game.title,
          );
          assert.ok(html.includes("Source &amp; context"));
          assert.ok(!html.includes("NaN"));
        }
        const game = {
          ...games[0],
          coverUrl: null,
          backgroundUrl: null,
          description: null,
          developer: null,
          publisher: null,
          releaseDate: null,
          platforms: [],
          genres: [],
          tags: [],
          screenshots: [],
          metacritic: null,
          externalLinks: [],
        };
        const html = renderToStaticMarkup(
          h(
            MemoryRouter,
            null,
            h(PersonalProvider, null, h(GameDetails, { game })),
          ),
        );
        assert.match(html, /Unavailable/);
        assert.match(html, /Screenshots are not available/);
        assert.match(html, /ARTWORK UNAVAILABLE/);
        assert.ok(!html.includes("undefined"));
      },
    );
    await t.test(
      "unknown game and unknown page have useful not-found states",
      async () => {
        await render("/games/unknown");
        assert.match(query("h1").textContent, /isn’t in our collection/);
        assert.ok(query("main a").getAttribute("href") === "/explore");
        await render("/no-such-page");
        assert.match(query("h1").textContent, /unexplored path/);
      },
    );
    await t.test(
      "mobile navigation exposes search and closes after navigation",
      async () => {
        await render("/");
        await click(".menu-toggle");
        assert.equal(
          query(".menu-toggle").getAttribute("aria-expanded"),
          "true",
        );
        assert.ok(query("#mobile-nav form"));
        await click('#mobile-nav a[href="/diary"]');
        assert.equal(
          query(".menu-toggle").getAttribute("aria-expanded"),
          "false",
        );
        assert.match(query("h1").textContent, /Playthrough diary/);
        await render("/library");
        assert.match(query("h1").textContent, /My library/);
        await render("/profile");
        assert.match(query("h1").textContent, /User profile/);
      },
    );
    await t.test("service failure has a working retry", async () => {
      const original = mockGameService.listGames;
      try {
        mockGameService.listGames = async () => {
          throw new Error("Test failure");
        };
        await render("/explore");
        assert.match(query('[role="alert"]').textContent, /couldn’t be loaded/);
        mockGameService.listGames = original;
        await click(".catalog-state button");
        assert.equal(cardIds().length, 36);
      } finally {
        mockGameService.listGames = original;
      }
    });
    await t.test(
      "library add, half-star rating, update and reload persist without initialization writes",
      async () => {
        dom.window.localStorage.clear();
        await render("/games/elden-ring");
        assert.equal(dom.window.localStorage.length, 0);
        await clickText("Add to Library");
        assert.equal(stored().library.length, 1);
        assert.equal(stored().library[0].status, "backlog");
        await click('.game-personal-actions input[value="4.5"]');
        assert.equal(stored().library[0].rating, 4.5);
        assert.equal(stored().library[0].status, "backlog");
        const snapshot = dom.window.localStorage.getItem(
          "checkpoint:v1:personal-data",
        );
        await render("/library");
        assert.equal(
          dom.window.localStorage.getItem("checkpoint:v1:personal-data"),
          snapshot,
        );
        assert.equal(document.querySelectorAll(".library-card").length, 1);
        await clickText("Edit details");
        await field("dialog input[name=playtime]", "-2");
        await submitDialog();
        assert.match(query("dialog [role=alert]").textContent, /nonnegative/);
        assert.equal(stored().library[0].playtimeHours, undefined);
        await field("dialog input[name=playtime]", "12.5");
        await field("dialog select[name=status]", "completed");
        await field("dialog input[name=completedAt]", "2026-10-16");
        await field("dialog textarea[name=notes]", "Personal notes saved.");
        await submitDialog();
        assert.equal(document.querySelector("dialog"), null);
        assert.equal(stored().library[0].playtimeHours, 12.5);
        assert.equal(stored().library[0].status, "completed");
        assert.equal(stored().library[0].completedAt, "2026-10-16");
        assert.equal(stored().library[0].notes, "Personal notes saved.");
        await click(".library-card .favorite-button");
        await render("/profile");
        assert.equal(stat("Games in library"), "1");
        assert.equal(stat("Completed"), "1");
        assert.equal(stat("Logged playtime"), "12.5 h");
        assert.equal(stat("Average personal rating"), "4.50 / 5");
        assert.equal(document.querySelectorAll(".favorite-order").length, 1);
        await render("/library");
        await field(".personal-library-filters input", "no match");
        assert.equal(document.querySelectorAll(".library-card").length, 0);
        await clickText("Clear library filters");
        assert.equal(document.querySelectorAll(".library-card").length, 1);
        await field(".personal-library-filters select", "playing");
        assert.equal(document.querySelectorAll(".library-card").length, 0);
        await clickText("Clear library filters");
      },
    );
    await t.test(
      "review create, spoiler concealment, edit, synchronized ratings and confirmed deletion",
      async () => {
        await render("/games/elden-ring");
        await clickText("Write Review");
        await field("dialog textarea[name=reviewText]", "   ");
        await submitDialog();
        assert.match(
          query("dialog [role=alert]").textContent,
          /Write a review/,
        );
        await field("dialog input[name=reviewTitle]", "Hidden ending");
        await field(
          "dialog textarea[name=reviewText]",
          "A secret ending and a thoughtful journey.",
        );
        await field("dialog select[name=visibility]", "friends-only");
        await click("dialog input[name=spoilers]");
        await click('dialog input[value="3.5"]');
        await submitDialog();
        assert.equal(stored().reviews.length, 1);
        const reviewId = stored().reviews[0].id;
        const createdAt = stored().reviews[0].createdAt;
        assert.equal(stored().library[0].rating, 3.5);
        assert.equal(stored().library[0].status, "completed");
        assert.ok(!query("main").textContent.includes("A secret ending"));
        assert.ok(!query("main").textContent.includes("Hidden ending"));
        const spoilerToggle = query(".review-card button[aria-expanded]");
        spoilerToggle.focus();
        await clickText("Reveal review");
        assert.match(query(".review-text").textContent, /secret ending/);
        assert.ok(
          document.activeElement === spoilerToggle,
          "Spoiler toggle retains focus",
        );
        assert.equal(spoilerToggle.getAttribute("aria-expanded"), "true");
        await clickText("Hide spoilers");
        assert.ok(
          document.activeElement === spoilerToggle,
          "Hide control retains focus",
        );
        assert.ok(!query("main").textContent.includes("A secret ending"));
        await render("/profile");
        assert.ok(!query("main").textContent.includes("A secret ending"));
        assert.equal(stat("Average personal rating"), "3.50 / 5");
        await clickText("Edit review");
        await field("dialog textarea[name=reviewText]", "Updated perspective.");
        await click("dialog input[name=spoilers]");
        await click('dialog input[value="4"]');
        await submitDialog();
        assert.equal(stored().reviews.length, 1);
        assert.equal(stored().reviews[0].id, reviewId);
        assert.equal(stored().reviews[0].createdAt, createdAt);
        assert.equal(stored().reviews[0].containsSpoilers, false);
        assert.equal(stat("Average personal rating"), "4.00 / 5");
        assert.match(query(".review-text").textContent, /Updated perspective/);
        await clickText("Delete review");
        assert.match(query("dialog").textContent, /rating will be kept/);
        await clickText("Keep it");
        assert.equal(stored().reviews.length, 1);
        await clickText("Delete review");
        await clickText("Delete permanently");
        assert.equal(stored().reviews.length, 0);
        assert.equal(stored().library[0].rating, 4);
        await render("/games/elden-ring");
        await clickText("Clear rating");
        assert.equal(stored().library[0].rating, undefined);
        await render("/profile");
        assert.equal(stat("Average personal rating"), "Not rated");
      },
    );
    await t.test(
      "favorite limit and deletion confirmations protect the actual records",
      async () => {
        for (const id of ["hades", "celeste", "hollow-knight", "portal"]) {
          await render(`/games/${id}`);
          await clickText("Add to Library");
          await click(".game-personal-actions .favorite-button");
        }
        assert.equal(
          stored().library.filter((entry) => entry.favoriteOrder !== undefined)
            .length,
          4,
        );
        assert.match(
          query(".game-personal-actions [role=alert]").textContent,
          /four favorites/,
        );
        await render("/games/elden-ring");
        await clickText("Write Review");
        await field(
          "dialog textarea[name=reviewText]",
          "Will be removed with this entry.",
        );
        await submitDialog();
        await render("/library");
        const original = stored().library.length;
        await clickText("Remove", query('[data-game-id="elden-ring"]'));
        assert.match(query("dialog").textContent, /saved review/);
        await clickText("Keep it");
        assert.equal(stored().library.length, original);
        await clickText("Remove", query('[data-game-id="elden-ring"]'));
        await clickText("Delete permanently");
        assert.equal(stored().library.length, original - 1);
        assert.equal(stored().reviews.length, 0);
        assert.equal(
          stored().library.filter((entry) => entry.favoriteOrder !== undefined)
            .length,
          3,
        );
        await render("/games/portal");
        await click(".game-personal-actions .favorite-button");
        assert.equal(
          stored().library.filter((entry) => entry.favoriteOrder !== undefined)
            .length,
          4,
        );
      },
    );
    await t.test(
      "corrupted storage is left untouched during initialization and save failures are explicit",
      async () => {
        dom.window.localStorage.setItem(
          "checkpoint:v1:personal-data",
          "{broken",
        );
        await render("/library");
        assert.equal(
          dom.window.localStorage.getItem("checkpoint:v1:personal-data"),
          "{broken",
        );
        assert.match(query(".storage-notice").textContent, /untouched/);
        await render("/games/hades");
        await clickText("Add to Library");
        assert.match(
          query(".game-personal-actions [role=alert]").textContent,
          /blocked/,
        );
        assert.equal(
          dom.window.localStorage.getItem("checkpoint:v1:personal-data"),
          "{broken",
        );
        dom.window.localStorage.clear();
        await render("/games/hades");
        const original = dom.window.Storage.prototype.setItem;
        try {
          dom.window.Storage.prototype.setItem = () => {
            throw new Error("Quota exceeded");
          };
          await clickText("Add to Library");
          assert.match(
            query(".game-personal-actions [role=alert]").textContent,
            /not been applied/,
          );
          assert.equal(dom.window.localStorage.length, 0);
          assert.ok(
            [
              ...document.querySelectorAll(".game-personal-actions button"),
            ].some((button) => button.textContent === "Add to Library"),
          );
        } finally {
          dom.window.Storage.prototype.setItem = original;
        }
        await clickText("Add to Library");
        assert.equal(stored().library.length, 1);
        await render("/games/hades");
        assert.equal(
          document.querySelector(".compact-status select").value,
          "backlog",
        );
      },
    );
    const journalStored = () =>
      JSON.parse(dom.window.localStorage.getItem("checkpoint:v1:journals"))
        ?.data;
    let firstJourney,
      secondJourney,
      secretEntry,
      introEntry,
      sameDayEntry,
      personalBeforeJournals;
    await t.test(
      "playthrough creation and spoiler entry validation persist without touching library data",
      async () => {
        personalBeforeJournals = dom.window.localStorage.getItem(
          "checkpoint:v1:personal-data",
        );
        await render("/games/hades");
        assert.equal(
          dom.window.localStorage.getItem("checkpoint:v1:journals"),
          null,
        );
        await clickText("Start a playthrough");
        await submitDialog();
        assert.match(query("dialog [role=alert]").textContent, /title/);
        await field("dialog input[name=playthroughTitle]", "First journey");
        await field("dialog input[name=startedAt]", "2026-10-01");
        await field("dialog input[name=platform]", "PC");
        await field("dialog input[name=difficulty]", "Normal");
        await submitDialog();
        firstJourney = journalStored().playthroughs[0].id;
        assert.equal(query("#location").textContent, `/diary/${firstJourney}`);
        assert.equal(query("h1").textContent, "First journey");
        await clickText("Add journal entry");
        await field("dialog input[name=entryTitle]", "The secret encounter");
        await field(
          "dialog textarea[name=entryContent]",
          "SPOILER_BODY_ALPHA: an unexpected discovery.",
        );
        await field("dialog input[name=chapterLabel]", "SPOILER_LABEL_ALPHA");
        await field("dialog input[name=progressPercent]", "101");
        await submitDialog();
        assert.match(
          query("dialog [role=alert]").textContent,
          /between 0 and 100/,
        );
        assert.match(
          query("dialog textarea[name=entryContent]").value,
          /SPOILER_BODY_ALPHA/,
        );
        await field("dialog input[name=progressPercent]", "25.5");
        await field("dialog input[name=entryPlaytime]", "-1");
        await submitDialog();
        assert.match(query("dialog [role=alert]").textContent, /nonnegative/);
        await field("dialog input[name=entryPlaytime]", "4.25");
        await field("dialog input[name=entryDate]", "2026-10-03");
        await field("dialog select[name=entryType]", "chapter");
        await field("dialog select[name=entryVisibility]", "friends-only");
        await click('dialog input[value="2.5"]');
        await click("dialog input[name=entrySpoilers]");
        await submitDialog();
        secretEntry = journalStored().entries[0].id;
        assert.equal(journalStored().entries[0].progressPercent, 25.5);
        assert.equal(journalStored().entries[0].provisionalRating, 2.5);
        assert.equal(
          dom.window.localStorage.getItem("checkpoint:v1:personal-data"),
          personalBeforeJournals,
        );
        for (const text of [
          "The secret encounter",
          "SPOILER_BODY_ALPHA",
          "SPOILER_LABEL_ALPHA",
        ])
          assert.ok(!query("main").innerHTML.includes(text));
        await clickText("Reveal entry");
        assert.match(
          query(`[data-entry-id="${secretEntry}"]`).textContent,
          /SPOILER_BODY_ALPHA/,
        );
        await clickText("Open full entry");
        assert.match(query("dialog").textContent, /SPOILER_BODY_ALPHA/);
        await clickText("Back to timeline");
        await clickText("Hide spoilers");
        assert.ok(!query("main").innerHTML.includes("SPOILER_BODY_ALPHA"));
        const snapshot = dom.window.localStorage.getItem(
          "checkpoint:v1:journals",
        );
        await render(`/diary/${firstJourney}`);
        assert.equal(
          dom.window.localStorage.getItem("checkpoint:v1:journals"),
          snapshot,
        );
        assert.ok(!query("main").innerHTML.includes("SPOILER_BODY_ALPHA"));
      },
    );
    await t.test(
      "chronological entries, editing, profile activity and a second independent playthrough work",
      async () => {
        for (const [title, content] of [
          ["Opening route", "An open-world introduction."],
          ["Same-day update", "An unrelated milestone."],
        ]) {
          await clickText("Add journal entry");
          await field("dialog input[name=entryTitle]", title);
          await field("dialog textarea[name=entryContent]", content);
          await field("dialog input[name=entryDate]", "2026-10-01");
          await submitDialog();
        }
        introEntry = journalStored().entries.find(
          (entry) => entry.title === "Opening route",
        ).id;
        sameDayEntry = journalStored().entries.find(
          (entry) => entry.title === "Same-day update",
        ).id;
        assert.deepEqual(
          [
            ...document.querySelectorAll(".journal-timeline .journal-entry"),
          ].map((node) => node.dataset.entryId),
          [introEntry, sameDayEntry, secretEntry],
        );
        const createdAt = journalStored().entries.find(
          (entry) => entry.id === introEntry,
        ).createdAt;
        await clickText("Edit entry", query(`[data-entry-id="${introEntry}"]`));
        await field("dialog input[name=entryTitle]", "Opening route revised");
        await field(
          "dialog textarea[name=entryContent]",
          "Updated impressions.",
        );
        await field("dialog select[name=entryType]", "milestone");
        await field("dialog input[name=progressPercent]", "0");
        await field("dialog input[name=entryPlaytime]", "0");
        await click('dialog input[value="4.5"]');
        await submitDialog();
        assert.equal(
          journalStored().entries.find((entry) => entry.id === introEntry)
            .createdAt,
          createdAt,
        );
        assert.equal(
          journalStored().entries.find((entry) => entry.id === introEntry)
            .playtimeHours,
          0,
        );
        assert.equal(
          dom.window.localStorage.getItem("checkpoint:v1:personal-data"),
          personalBeforeJournals,
        );
        await render("/profile");
        assert.equal(stat("Total playthroughs"), "1");
        assert.equal(stat("Active playthroughs"), "1");
        assert.equal(stat("Journal entries"), "3");
        assert.ok(!query("main").innerHTML.includes("SPOILER_BODY_ALPHA"));
        await render("/games/hades");
        await clickText("Start a playthrough");
        await field("dialog input[name=playthroughTitle]", "Second attempt");
        await field("dialog input[name=startedAt]", "2026-10-02");
        await submitDialog();
        secondJourney = journalStored().playthroughs.find(
          (item) => item.playthroughNumber === 2,
        ).id;
        assert.equal(
          journalStored().entries.filter(
            (entry) => entry.playthroughId === secondJourney,
          ).length,
          0,
        );
        await render("/games/hades");
        assert.match(
          query(".active-journal-bar").textContent,
          /Second attempt/,
        );
        await clickText("Add progress entry");
        await field("dialog input[name=entryTitle]", "A fresh perspective");
        await field(
          "dialog textarea[name=entryContent]",
          "Second journey notes.",
        );
        await submitDialog();
        assert.equal(query("#location").textContent, `/diary/${secondJourney}`);
        assert.equal(
          journalStored().entries.filter(
            (entry) => entry.playthroughId === secondJourney,
          ).length,
          1,
        );
        await clickText("Edit playthrough");
        await field("dialog select[name=playthroughStatus]", "paused");
        await submitDialog();
        assert.match(query(".page-intro .eyebrow").textContent, /Paused/);
        await render(`/diary/${firstJourney}`);
        await clickText("Edit playthrough");
        await field("dialog select[name=playthroughStatus]", "completed");
        await field("dialog input[name=completedAt]", "2026-10-16");
        await submitDialog();
        assert.equal(
          journalStored().playthroughs.find((item) => item.id === firstJourney)
            .status,
          "completed",
        );
        assert.equal(
          dom.window.localStorage.getItem("checkpoint:v1:personal-data"),
          personalBeforeJournals,
        );
        await render("/diary");
        await field("input[name=diarySearch]", "hAdEs");
        assert.equal(
          document.querySelectorAll(".diary-playthroughs .playthrough-card")
            .length,
          2,
        );
        await field("select[name=diaryStatus]", "completed");
        assert.equal(
          document.querySelectorAll(".diary-playthroughs .playthrough-card")
            .length,
          1,
        );
        await clickText("Clear diary filters");
        await field("select[name=diarySort]", "start-oldest");
        assert.equal(
          query(".diary-playthroughs .playthrough-card").dataset.playthroughId,
          firstJourney,
        );
        await field("select[name=diarySort]", "start-newest");
        assert.equal(
          query(".diary-playthroughs .playthrough-card").dataset.playthroughId,
          secondJourney,
        );
        await field("input[name=diarySearch]", "unknown game");
        assert.equal(
          document.querySelectorAll(".diary-playthroughs .playthrough-card")
            .length,
          0,
        );
        await render("/library");
        assert.match(
          query(".library-journal-link").textContent,
          /2 playthrough/,
        );
        await click(".library-journal-link");
        assert.match(query("#location").textContent, /\/diary\?game=hades/);
        assert.equal(
          document.querySelectorAll(".diary-playthroughs .playthrough-card")
            .length,
          2,
        );
        await render("/profile");
        assert.equal(stat("Total playthroughs"), "2");
        assert.equal(stat("Completed playthroughs"), "1");
        assert.equal(stat("Active playthroughs"), "0");
        assert.equal(stat("Journal entries"), "4");
      },
    );
    await t.test(
      "entry and playthrough confirmations isolate cascades; library deletion keeps journals",
      async () => {
        await render(`/diary/${firstJourney}`);
        await clickText(
          "Delete entry",
          query(`[data-entry-id="${introEntry}"]`),
        );
        await clickText("Keep it");
        assert.equal(journalStored().entries.length, 4);
        await clickText(
          "Delete entry",
          query(`[data-entry-id="${introEntry}"]`),
        );
        await clickText("Delete permanently");
        assert.equal(journalStored().entries.length, 3);
        assert.ok(
          journalStored().entries.some((entry) => entry.id === secretEntry),
        );
        await clickText("Delete playthrough");
        assert.match(
          query("dialog").textContent,
          /all 2 associated journal entries/,
        );
        await clickText("Keep it");
        assert.equal(journalStored().playthroughs.length, 2);
        await clickText("Delete playthrough");
        await clickText("Delete permanently");
        assert.equal(journalStored().playthroughs.length, 1);
        assert.equal(journalStored().entries.length, 1);
        assert.equal(journalStored().entries[0].playthroughId, secondJourney);
        assert.match(query("h1").textContent, /isn’t on your shelf/);
        assert.equal(
          dom.window.localStorage.getItem("checkpoint:v1:personal-data"),
          personalBeforeJournals,
        );
        const journalSnapshot = dom.window.localStorage.getItem(
          "checkpoint:v1:journals",
        );
        await render("/library");
        await clickText("Remove");
        assert.match(query("dialog").textContent, /journals will be kept/);
        await clickText("Delete permanently");
        assert.equal(
          dom.window.localStorage.getItem("checkpoint:v1:journals"),
          journalSnapshot,
        );
        await render(`/diary/${secondJourney}`);
        assert.equal(query("h1").textContent, "Second attempt");
      },
    );
    await t.test(
      "malformed journal storage and failed writes preserve personal records and editor contents",
      async () => {
        const personalSnapshot = dom.window.localStorage.getItem(
          "checkpoint:v1:personal-data",
        );
        const validJournals = dom.window.localStorage.getItem(
          "checkpoint:v1:journals",
        );
        const previousCount =
          JSON.parse(validJournals).data.playthroughs.length;
        dom.window.localStorage.setItem(
          "checkpoint:v1:journals",
          "{malformed-journal",
        );
        await render("/diary");
        assert.match(query(".storage-notice").textContent, /journal data/);
        assert.equal(
          dom.window.localStorage.getItem("checkpoint:v1:journals"),
          "{malformed-journal",
        );
        assert.equal(
          dom.window.localStorage.getItem("checkpoint:v1:personal-data"),
          personalSnapshot,
        );
        await clickText("Start a playthrough");
        await field("dialog select[name=gameId]", "celeste");
        await field("dialog input[name=playthroughTitle]", "Recovered journey");
        await submitDialog();
        assert.match(query("dialog [role=alert]").textContent, /blocked/);
        assert.equal(
          dom.window.localStorage.getItem("checkpoint:v1:journals"),
          "{malformed-journal",
        );
        await clickText("Cancel", query("dialog"));
        // Explicit recovery in disposable test storage, never application reset behavior.
        dom.window.localStorage.setItem(
          "checkpoint:v1:journals",
          validJournals,
        );
        await render("/diary");
        await clickText("Start a playthrough");
        await field("dialog select[name=gameId]", "celeste");
        await field("dialog input[name=playthroughTitle]", "Recovered journey");
        const original = dom.window.Storage.prototype.setItem;
        try {
          dom.window.Storage.prototype.setItem = () => {
            throw new Error("Quota");
          };
          await submitDialog();
          assert.match(
            query("dialog [role=alert]").textContent,
            /not been applied/,
          );
          assert.equal(
            query("dialog input[name=playthroughTitle]").value,
            "Recovered journey",
          );
          assert.equal(
            dom.window.localStorage.getItem("checkpoint:v1:journals"),
            validJournals,
          );
        } finally {
          dom.window.Storage.prototype.setItem = original;
        }
        await submitDialog();
        assert.equal(journalStored().playthroughs.length, previousCount + 1);
        assert.ok(
          journalStored().playthroughs.some(
            (item) => item.title === "Recovered journey",
          ),
        );
        assert.equal(
          dom.window.localStorage.getItem("checkpoint:v1:personal-data"),
          personalSnapshot,
        );
        await render("/diary/missing-playthrough");
        assert.match(query("h1").textContent, /isn’t on your shelf/);
      },
    );
    await t.test(
      "conflicting personal and journal writes preserve newer records and allow deliberate retry",
      async () => {
        await render("/games/portal-2");
        const { updatePersonalData, emptyPersonalData } =
          await vite.ssrLoadModule("/src/lib/personal.ts");
        const newer = updatePersonalData(stored() ?? emptyPersonalData(), {
          type: "add",
          gameId: "stardew-valley",
        });
        const raw = JSON.stringify({ version: 1, data: newer });
        dom.window.localStorage.setItem("checkpoint:v1:personal-data", raw);
        await clickText("Add to Library");
        assert.match(
          query(".game-personal-actions [role=alert]").textContent,
          /another tab/,
        );
        assert.equal(
          dom.window.localStorage.getItem("checkpoint:v1:personal-data"),
          raw,
        );
        await clickText("Add to Library");
        assert.ok(
          stored().library.some((item) => item.gameId === "stardew-valley"),
        );
        assert.ok(stored().library.some((item) => item.gameId === "portal-2"));
        await render("/diary");
        await clickText("Start a playthrough");
        await field("dialog select[name=gameId]", "hades");
        await field("dialog input[name=playthroughTitle]", "Conflict draft");
        const journals = journalStored();
        journals.playthroughs[0].notes = "Saved from another tab";
        const journalRaw = JSON.stringify({ version: 1, data: journals });
        dom.window.localStorage.setItem("checkpoint:v1:journals", journalRaw);
        await submitDialog();
        assert.match(query("dialog [role=alert]").textContent, /another tab/);
        assert.equal(
          dom.window.localStorage.getItem("checkpoint:v1:journals"),
          journalRaw,
        );
        assert.equal(
          query("dialog input[name=playthroughTitle]").value,
          "Conflict draft",
        );
        await submitDialog();
        assert.equal(
          journalStored().playthroughs[0].notes,
          "Saved from another tab",
        );
        assert.ok(
          journalStored().playthroughs.some(
            (item) => item.title === "Conflict draft",
          ),
        );
      },
    );
    await t.test(
      "menu Escape restores focus and navigation history does not resurrect an open menu",
      async () => {
        await render("/");
        await click(".menu-toggle");
        await act(async () =>
          query("#mobile-nav input").dispatchEvent(
            new dom.window.KeyboardEvent("keydown", {
              key: "Escape",
              bubbles: true,
            }),
          ),
        );
        assert.equal(document.querySelector("#mobile-nav"), null);
        assert.equal(document.activeElement, query(".menu-toggle"));
        await click(".menu-toggle");
        await click('.desktop-nav a[href="/explore"]');
        assert.equal(document.querySelector("#mobile-nav"), null);
        await click("#history-back");
        assert.equal(document.querySelector("#mobile-nav"), null);
      },
    );
    await t.test(
      "modal focus, safe confirmation, body scroll and mobile rating control work",
      async () => {
        await render("/games/hades");
        if (!stored().library.some((item) => item.gameId === "hades"))
          await clickText("Add to Library");
        await clickText("Edit details");
        assert.equal(document.body.style.overflow, "hidden");
        assert.equal(document.activeElement.tagName, "SELECT");
        await field("dialog .rating-select", "3.5");
        await submitDialog();
        assert.equal(
          stored().library.find((item) => item.gameId === "hades").rating,
          3.5,
        );
        assert.equal(document.body.style.overflow, "");
        await clickText("Edit details");
        const dialog = query("dialog");
        dialog.getBoundingClientRect = () => ({
          left: 10,
          right: 200,
          top: 10,
          bottom: 200,
        });
        await act(async () =>
          dialog.dispatchEvent(
            new dom.window.MouseEvent("click", {
              bubbles: true,
              clientX: 30,
              clientY: 30,
            }),
          ),
        );
        assert.ok(document.querySelector("dialog"));
        await act(async () =>
          dialog.dispatchEvent(
            new dom.window.Event("cancel", { cancelable: true }),
          ),
        );
        assert.equal(document.querySelector("dialog"), null);
        await render("/library");
        const remove = [
          ...document.querySelectorAll(".library-card button"),
        ].find((button) => button.textContent.trim() === "Remove");
        assert.ok(remove);
        await act(async () => {
          remove.focus();
          remove.click();
        });
        assert.equal(document.activeElement.textContent, "Keep it");
        await clickText("Keep it");
        assert.ok(
          document.activeElement === remove,
          "Confirmation returns focus to trigger",
        );
      },
    );
    await t.test(
      "synchronous service errors leave saved library controls available and can recover",
      async () => {
        const original = mockGameService.listGames;
        try {
          mockGameService.listGames = () => {
            throw new Error("Synchronous adapter failure");
          };
          await render("/library");
          assert.ok(document.querySelector(".library-card"));
          assert.ok(document.querySelector(".library-card button"));
          assert.ok(!document.querySelector("main [role=alert]"));
        } finally {
          mockGameService.listGames = original;
        }
        await render("/library");
        assert.ok(document.querySelector(".library-card"));
      },
    );
    await t.test(
      "RAWG search debounces, pages and sends global filter parameters without bulk requests",
      async () => {
        const original = globalThis.fetch;
        const { normalizeGame } = await vite.ssrLoadModule(
          "/server/rawg-normalize.ts",
        );
        const remote = normalizeGame({
          id: 701234,
          name: "Animal discovery fixture",
          slug: "animal-fixture",
          released: "2024-05-09",
        });
        const calls = [];
        globalThis.fetch = async (input) => {
          const url = new URL(String(input), "http://localhost");
          assert.equal(url.pathname, "/.netlify/functions/rawg");
          calls.push(url.searchParams);
          return Response.json({
            games: [remote],
            count: 42,
            page: Number(url.searchParams.get("page") ?? 1),
            hasNext: true,
          });
        };
        const settle = async () =>
          act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 450));
          });
        try {
          await render("/explore", true);
          await type(".discovery-search input", "An");
          await type(".discovery-search input", "Animal");
          assert.equal(calls.length, 0);
          await settle();
          assert.equal(calls.length, 1);
          assert.equal(calls[0].get("q"), "Animal");
          assert.deepEqual(cardIds(), ["rawg:701234"]);
          await clickText("Next page");
          await settle();
          assert.equal(calls.length, 2);
          assert.equal(calls[1].get("page"), "2");
          await select(0, "4");
          await select(1, "4");
          await select(2, "2024");
          await select(3, "rating");
          await settle();
          assert.equal(calls.length, 3);
          assert.equal(calls[2].get("genre"), "4");
          assert.equal(calls[2].get("platform"), "4");
          assert.equal(calls[2].get("year"), "2024");
          assert.equal(calls[2].get("sort"), "rating");
          assert.equal(calls[2].get("page"), "1");
          await type(".discovery-search input", "x");
          await settle();
          assert.equal(calls.length, 3);
          assert.match(query("main").textContent, /at least two/);
        } finally {
          globalThis.fetch = original;
        }
      },
    );
    await t.test(
      "RAWG details support persistent library, review, favorites and journals; screenshots are requested explicitly",
      async () => {
        const original = globalThis.fetch;
        const { normalizeGame } = await vite.ssrLoadModule(
          "/server/rawg-normalize.ts",
        );
        const remote = normalizeGame({
          id: 701235,
          name: "Remote journey fixture",
          slug: "remote-journey",
          description_raw: "Remote description <script>safe text</script>",
          released: "2024-05-09",
          rating: 4.1,
          ratings_count: 10,
        });
        let screenshotCalls = 0;
        let detailsCalls = 0;
        globalThis.fetch = async (input) => {
          const params = new URL(String(input), "http://localhost")
            .searchParams;
          if (params.get("resource") === "screenshots") {
            screenshotCalls++;
            return Response.json({
              screenshots: [
                {
                  url: "https://media.rawg.io/fixture.jpg",
                  alt: "Fixture screenshot",
                },
              ],
              page: 1,
              hasNext: false,
            });
          }
          detailsCalls++;
          return Response.json({ game: remote });
        };
        try {
          await render("/games/rawg:701235", true);
          assert.equal(query("h1").textContent, "Remote journey fixture");
          assert.equal(detailsCalls, 1);
          assert.equal(screenshotCalls, 0);
          assert.equal(document.querySelector("main script"), null);
          await clickText("Add to Library");
          await field(".game-personal-actions .rating-select", "4.5");
          await click(".game-personal-actions .favorite-button");
          await clickText("Write Review");
          await field("dialog textarea[name=reviewText]", "A remote review.");
          await submitDialog();
          assert.ok(
            stored().library.some(
              (entry) =>
                entry.gameId === "rawg:701235" &&
                entry.rating === 4.5 &&
                entry.favoriteOrder !== undefined,
            ),
          );
          assert.ok(
            stored().reviews.some((review) => review.gameId === "rawg:701235"),
          );
          const display = JSON.parse(
            dom.window.localStorage.getItem("checkpoint:v1:game-display"),
          ).data.find((item) => item.id === "rawg:701235");
          assert.equal(display.title, remote.title);
          assert.equal(display.description, undefined);
          assert.equal(display.rating, undefined);
          await clickText("Load screenshots from RAWG");
          assert.equal(screenshotCalls, 1);
          assert.ok(document.querySelector(".screenshot-grid a"));
          await clickText("Start a playthrough");
          await field(
            "dialog input[name=playthroughTitle]",
            "A remote journey",
          );
          await submitDialog();
          assert.match(query("h1").textContent, /A remote journey/);
          assert.ok(
            journalStored().playthroughs.some(
              (item) => item.gameId === "rawg:701235",
            ),
          );
          globalThis.fetch = async () => {
            throw new Error("Offline");
          };
          await render("/library", true);
          assert.match(query("main").textContent, /Remote journey fixture/);
          await render("/profile", true);
          assert.match(query("main").textContent, /A remote review/);
          await render("/diary", true);
          assert.match(query("main").textContent, /A remote journey/);
        } finally {
          globalThis.fetch = original;
        }
      },
    );
    await t.test(
      "RAWG error, retry, empty state and explicit demo fallback remain distinct",
      async () => {
        const original = globalThis.fetch;
        let fail = true;
        globalThis.fetch = async () =>
          fail
            ? Response.json(
                { error: "private upstream details" },
                { status: 503 },
              )
            : Response.json({ games: [], count: 0, page: 1, hasNext: false });
        const settle = async () =>
          act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 450));
          });
        try {
          await render("/explore?q=NoResultsFixture", true);
          await settle();
          assert.match(
            query("main [role=alert]").textContent,
            /server environment/,
          );
          assert.ok(
            !query("main").textContent.includes("private upstream details"),
          );
          fail = false;
          await clickText("Try again");
          await settle();
          assert.match(query("main").textContent, /No worlds on this path/);
          await render("/explore?source=demo", true);
          assert.equal(cardIds().length, 36);
          assert.match(query("main").textContent, /Local demo catalog/);
        } finally {
          globalThis.fetch = original;
        }
      },
    );
    await t.test(
      "obsolete RAWG searches are canceled and late responses never replace newer results",
      async () => {
        const original = globalThis.fetch;
        const pending = new Map();
        const { normalizeGame } = await vite.ssrLoadModule(
          "/server/rawg-normalize.ts",
        );
        globalThis.fetch = (input, options) =>
          new Promise((resolve) =>
            pending.set(
              new URL(String(input), "http://localhost").searchParams.get("q"),
              { resolve, signal: options.signal },
            ),
          );
        const settle = async () =>
          act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 450));
          });
        try {
          await render("/explore?q=RaceOld", true);
          await settle();
          await type(".discovery-search input", "RaceNew");
          await settle();
          assert.ok(pending.get("RaceOld").signal.aborted);
          await act(async () =>
            pending.get("RaceNew").resolve(
              Response.json({
                games: [normalizeGame({ id: 701240, name: "New result" })],
                count: 1,
                page: 1,
                hasNext: false,
              }),
            ),
          );
          assert.deepEqual(cardIds(), ["rawg:701240"]);
          await act(async () =>
            pending.get("RaceOld").resolve(
              Response.json({
                games: [normalizeGame({ id: 701241, name: "Old result" })],
                count: 1,
                page: 1,
                hasNext: false,
              }),
            ),
          );
          assert.deepEqual(cardIds(), ["rawg:701240"]);
        } finally {
          for (const item of pending.values())
            item.resolve(
              Response.json({ games: [], count: 0, page: 1, hasNext: false }),
            );
          globalThis.fetch = original;
        }
      },
    );
    await t.test(
      "genre loading, failure, retry and unavailable states never substitute local counts",
      async () => {
        const { rawgClient } = await vite.ssrLoadModule(
          "/src/services/rawgClient.ts",
        );
        const original = rawgClient.genres;
        let resolveGenres;
        try {
          rawgClient.genres = () =>
            new Promise((resolve) => {
              resolveGenres = resolve;
            });
          await render("/", true);
          assert.match(
            query(".genre-section").textContent,
            /Loading RAWG genres/,
          );
          assert.equal(document.querySelectorAll(".genre-grid a").length, 0);
          await act(async () =>
            resolveGenres({ genres: [], count: 0, page: 1, hasNext: false }),
          );
          assert.match(
            query(".genre-section").textContent,
            /currently unavailable/,
          );
          assert.equal(document.querySelectorAll(".genre-grid a").length, 0);
          rawgClient.genres = async () => {
            throw new Error("Offline");
          };
          await render("/", true);
          assert.match(
            query(".genre-section [role=alert]").textContent,
            /Counts are unavailable/,
          );
          rawgClient.genres = original;
          await clickText("Retry genres");
          assert.match(
            query(".genre-grid").textContent,
            /123,456 games on RAWG/,
          );
        } finally {
          rawgClient.genres = original;
        }
      },
    );
    await t.test(
      "RDR2 platform scores are labeled separately and do not alter library or review data",
      async () => {
        const original = globalThis.fetch;
        const { normalizeGame } = await vite.ssrLoadModule(
          "/server/rawg-normalize.ts",
        );
        const remote = normalizeGame({
          id: 28,
          name: "Red Dead Redemption 2",
          metacritic: 96,
          metacritic_platforms: [
            {
              metascore: 97,
              platform: { platform: 18, name: "PlayStation 4" },
            },
            { metascore: 93, platform: { platform: 4, name: "PC" } },
            { metascore: 97, platform: { platform: 1, name: "Xbox One" } },
          ],
        });
        globalThis.fetch = async () => Response.json({ game: remote });
        const before = stored();
        try {
          await render("/games/rawg:28", true);
          const scores = [
            ...document.querySelectorAll(".metacritic-score"),
          ].map((node) => node.textContent.replace(/\s+/g, " ").trim());
          assert.ok(
            scores.some(
              (text) =>
                text.includes("96") && text.includes("Platform unspecified"),
            ),
          );
          assert.ok(
            scores.some(
              (text) => text.includes("93") && text.includes("Metacritic · PC"),
            ),
          );
          assert.ok(
            scores.some(
              (text) => text.includes("97") && text.includes("PlayStation 4"),
            ),
          );
          assert.ok(
            scores.some(
              (text) => text.includes("97") && text.includes("Xbox One"),
            ),
          );
          await clickText("Add to Library");
          await field(".game-personal-actions .rating-select", "2.5");
          await clickText("Write Review");
          await field(
            "dialog textarea[name=reviewText]",
            "Personal opinion stays separate from critic scores.",
          );
          await submitDialog();
          assert.equal(
            stored().library.find((item) => item.gameId === "rawg:28").rating,
            2.5,
          );
          assert.equal(
            stored().reviews.find((item) => item.gameId === "rawg:28").rating,
            2.5,
          );
          await render("/library", true);
          assert.match(query("main").textContent, /Red Dead Redemption 2/);
          assert.deepEqual(
            stored().library.filter((item) => item.gameId !== "rawg:28"),
            before.library,
          );
          assert.deepEqual(
            stored().reviews.filter((item) => item.gameId !== "rawg:28"),
            before.reviews,
          );
          const { GameCard } = await vite.ssrLoadModule(
            "/src/components/games/GameCard.tsx",
          );
          const card = (game) =>
            JSDOM.fragment(
              renderToStaticMarkup(
                h(MemoryRouter, null, h(GameCard, { game })),
              ),
            );
          assert.match(
            card(remote).querySelector(".card-score-context").textContent,
            /Platform unspecified/,
          );
          const platformOnly = {
            ...remote,
            metacritic: null,
            metacriticPlatforms: remote.metacriticPlatforms.filter(
              (item) => item.platform === "PC",
            ),
          };
          assert.match(
            card(platformOnly).querySelector(".card-score-context").textContent,
            /Metacritic · PC/,
          );
          assert.match(
            card(platformOnly).querySelector(".critic-badge").textContent,
            /93/,
          );
          const missing = {
            ...remote,
            metacritic: null,
            metacriticPlatforms: [],
          };
          assert.equal(card(missing).querySelector(".critic-badge"), null);
          assert.match(card(missing).textContent, /Metacritic unavailable/);
        } finally {
          globalThis.fetch = original;
        }
      },
    );
    await t.test(
      "production HTML errors show a deployment problem without silently selecting the demo or erasing records",
      async () => {
        const original = globalThis.fetch;
        const beforePersonal = dom.window.localStorage.getItem(
          "checkpoint:v1:personal-data",
        );
        const beforeJournals = dom.window.localStorage.getItem(
          "checkpoint:v1:journals",
        );
        globalThis.fetch = async () =>
          new Response("<html>Function not deployed</html>", {
            status: 404,
            headers: { "Content-Type": "text/html" },
          });
        try {
          await render("/games/rawg:700989", true);
          assert.match(
            query("main [role=alert]").textContent,
            /redeploy.*Netlify Functions/,
          );
          assert.ok(
            !query("main").textContent.includes("isn’t in our collection"),
          );
          await render("/explore?q=ProductionMissingProxyFixture", true);
          await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 450));
          });
          assert.match(
            query("main [role=alert]").textContent,
            /Netlify Functions/,
          );
          assert.equal(cardIds().length, 0);
          assert.match(
            query(".catalog-context").textContent,
            /Powered by RAWG/,
          );
          await click('main a[href="/explore?source=demo"]');
          assert.equal(cardIds().length, 36);
          assert.match(query(".catalog-context").textContent, /Local demo/);
          assert.equal(
            dom.window.localStorage.getItem("checkpoint:v1:personal-data"),
            beforePersonal,
          );
          assert.equal(
            dom.window.localStorage.getItem("checkpoint:v1:journals"),
            beforeJournals,
          );
        } finally {
          globalThis.fetch = original;
        }
      },
    );
  } finally {
    globalThis.fetch = nativeFetch;
    if (root) await act(async () => root.unmount());
    await vite.close();
    dom.window.close();
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
