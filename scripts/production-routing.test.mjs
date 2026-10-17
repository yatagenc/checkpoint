import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyDeployment } from "./verify-deployment.mjs";
const html =
  '<html><script type="module" src="/assets/app.js"></script><div id="root"></div></html>';
test("production verification catches a static-only release without assuming credentials are missing", async () => {
  const result = await verifyDeployment(
    "https://checkpoint.test",
    false,
    async (input) => {
      const url = new URL(input);
      if (url.pathname.includes("/.netlify/functions/"))
        return new Response("<html>Not found</html>", {
          status: 404,
          headers: { "Content-Type": "text/html" },
        });
      return new Response(
        url.pathname === "/assets/app.js" ? "old local demo bundle" : html,
      );
    },
  );
  assert.equal(result.ok, false);
  assert.equal(
    result.checks.find((check) => check.check === "function-routing").status,
    404,
  );
  assert.equal(
    result.checks.find((check) => check.check === "live-frontend").ok,
    false,
  );
});
test("production smoke verification checks SPA, function routing, remote search, details and one further page", async () => {
  const calls = [];
  const result = await verifyDeployment(
    "https://checkpoint.test",
    true,
    async (input) => {
      const url = new URL(input);
      calls.push(url);
      assert.equal(url.origin, "https://checkpoint.test");
      assert.equal(url.searchParams.has("key"), false);
      if (url.pathname === "/assets/app.js")
        return new Response("client /.netlify/functions/rawg? Powered by RAWG");
      if (!url.pathname.startsWith("/.netlify/")) return new Response(html);
      if (url.searchParams.get("id") === "invalid")
        return Response.json(
          { error: "Invalid RAWG game ID." },
          { status: 400 },
        );
      if (url.searchParams.has("id"))
        return Response.json({ game: { id: "rawg:783856" } });
      return Response.json({
        games: [{ id: "rawg:783856" }],
        count: 2,
        page: Number(url.searchParams.get("page")),
        hasNext: url.searchParams.get("page") === "1",
      });
    },
  );
  assert.equal(result.ok, true);
  assert.equal(
    calls.filter(
      (url) =>
        url.pathname.includes("/.netlify/") &&
        url.searchParams.get("id") !== "invalid",
    ).length,
    3,
  );
});
test("an SPA rewrite intercepted at the API path fails the routing check", async () => {
  const result = await verifyDeployment(
    "https://checkpoint.test",
    false,
    async (input) =>
      new Response(
        new URL(input).pathname === "/assets/app.js"
          ? "/.netlify/functions/rawg Powered by RAWG"
          : html,
      ),
  );
  assert.equal(result.checks[0].ok, false);
  await assert.rejects(
    verifyDeployment("https://user:password@checkpoint.test"),
    /without credentials/,
  );
});
