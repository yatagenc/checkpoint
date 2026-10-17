import { pathToFileURL } from "node:url";

/** Read-only release check. Default mode consumes no RAWG requests or secrets. */
export async function verifyDeployment(base, live = false, fetcher = fetch) {
  const origin = new URL(base);
  if (
    (origin.protocol !== "https:" &&
      !(
        origin.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(origin.hostname)
      )) ||
    origin.username ||
    origin.password ||
    origin.search ||
    origin.hash ||
    origin.pathname !== "/"
  )
    throw new Error(
      "Provide a site origin, without credentials, query parameters or a path.",
    );
  const checks = [];
  const request = async (path) =>
    fetcher(new URL(path, origin), {
      signal: AbortSignal.timeout(12000),
      redirect: "error",
    });
  const proxy = await request("/.netlify/functions/rawg?id=invalid");
  let validation;
  try {
    validation = await proxy.json();
  } catch {
    /* HTML means absent function or broken routing, not missing credentials. */
  }
  checks.push({
    check: "function-routing",
    ok: proxy.status === 400 && validation?.error === "Invalid RAWG game ID.",
    status: proxy.status,
    contentType: proxy.headers.get("content-type"),
  });
  const root = await request("/");
  const html = await root.text();
  const match = html.match(/<script[^>]+src=["']([^"']+)["']/);
  let liveFrontend = false;
  if (root.ok && match) {
    const asset = new URL(match[1], origin);
    if (asset.origin !== origin.origin)
      throw new Error("Unexpected external application bundle.");
    const response = await request(asset.pathname);
    const code = await response.text();
    liveFrontend =
      response.ok &&
      code.includes("/.netlify/functions/rawg") &&
      code.includes("Powered by RAWG");
  }
  checks.push({
    check: "live-frontend",
    ok: liveFrontend,
    status: root.status,
  });
  const nested = await request("/explore?q=Animal%20Well");
  const nestedHtml = await nested.text();
  checks.push({
    check: "spa-route",
    ok: nested.ok && nestedHtml.includes('<div id="root">'),
    status: nested.status,
  });
  if (live && checks.every((check) => check.ok)) {
    const getJson = async (path) => {
      const response = await request(path);
      let body;
      try {
        body = await response.json();
      } catch {
        throw new Error("Live proxy response was not JSON.");
      }
      return { response, body };
    };
    const search = await getJson(
      "/.netlify/functions/rawg?q=Animal+Well&page_size=1&page=1",
    );
    const id = search.body.games?.[0]?.id;
    const searchOk =
      search.response.ok &&
      search.body.page === 1 &&
      search.body.games?.length === 1 &&
      /^rawg:[1-9]\d*$/.test(id ?? "");
    checks.push({
      check: "live-search",
      ok: searchOk,
      status: search.response.status,
    });
    if (searchOk) {
      const detail = await getJson(
        "/.netlify/functions/rawg?" + new URLSearchParams({ id }),
      );
      checks.push({
        check: "live-details",
        ok: detail.response.ok && detail.body.game?.id === id,
        status: detail.response.status,
      });
      if (search.body.hasNext) {
        const next = await getJson(
          "/.netlify/functions/rawg?q=Animal+Well&page_size=1&page=2",
        );
        checks.push({
          check: "live-pagination",
          ok:
            next.response.ok &&
            next.body.page === 2 &&
            Array.isArray(next.body.games),
          status: next.response.status,
        });
      }
    }
  }
  return { ok: checks.every((check) => check.ok), checks };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const args = process.argv.slice(2);
  const live = args.includes("--live");
  const urls = args.filter((arg) => arg !== "--live");
  try {
    if (urls.length !== 1)
      throw new Error(
        "Usage: npm run verify:deployment -- https://checkpointv1.netlify.app [--live]",
      );
    const result = await verifyDeployment(urls[0], live);
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) {
      console.error(
        "Deployment is incomplete or stale. Deploy the current repository and its rawg function together.",
      );
      process.exitCode = 1;
    }
  } catch {
    console.error(
      "Deployment verification could not complete. Check the site URL, network and deployment routing; no sensitive response body was logged.",
    );
    process.exitCode = 1;
  }
}
