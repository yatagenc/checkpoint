import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import {
  parseDevOptions,
  selectDevPorts,
  inspectPort,
  isCheckpointServer,
} from "./dev-ports.mjs";

test("development port flags override environment and reject malformed shell-like input", () => {
  assert.equal(parseDevOptions([], {}).port, 8888);
  assert.equal(parseDevOptions([], { CHECKPOINT_PORT: "8889" }).port, 8889);
  assert.deepEqual(
    parseDevOptions(["--port=8890", "--target-port", "5175"], {
      CHECKPOINT_PORT: "8889",
    }),
    { port: 8890, explicitPort: true, target: 5175 },
  );
  for (const value of ["NaN", "8889junk", "8889;echo", "0", "65536", ""])
    assert.throws(() => parseDevOptions(["--port", value], {}));
  assert.throws(() => parseDevOptions(["--port"], {}));
  assert.throws(() => parseDevOptions(["--command", "other"], {}));
});
test("occupied or permission-blocked public and Vite ports select distinct available alternatives", async () => {
  const inspect = async (port) =>
    [8888, 5173].includes(port)
      ? { available: false, reason: port === 8888 ? "EACCES" : "EADDRINUSE" }
      : { available: true };
  const ports = await selectDevPorts(
    parseDevOptions([], {}),
    inspect,
    async () => false,
  );
  assert.deepEqual(ports, {
    port: 8889,
    target: 5174,
    reuse: false,
    fallback: true,
  });
  await assert.rejects(
    selectDevPorts(
      parseDevOptions(["--port", "8888"], {}),
      inspect,
      async () => false,
    ),
    /Port 8888 is unavailable/,
  );
  await assert.rejects(
    selectDevPorts(
      parseDevOptions(["--port", "8889", "--target-port", "8889"], {}),
      inspect,
    ),
    /equals the Netlify port/,
  );
  await assert.rejects(
    selectDevPorts(
      parseDevOptions([], {}),
      async () => ({ available: false, reason: "EADDRINUSE" }),
      async () => false,
    ),
    /No available Netlify port/,
  );
});
test("a real occupied port is detected and an existing healthy Checkpoint instance is reused", async () => {
  const paths = [];
  const server = createServer((req, res) => {
    paths.push(req.url);
    if (req.url === "/") {
      res.end('<title>Checkpoint</title><div id="root"></div>');
      return;
    }
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid RAWG game ID." }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  try {
    assert.equal((await inspectPort(port)).available, false);
    assert.equal(await isCheckpointServer(port), true);
    assert.deepEqual(await selectDevPorts({ port, explicitPort: true }), {
      port,
      reuse: true,
    });
    assert.ok(
      paths.every(
        (path) =>
          path === "/" || path === "/.netlify/functions/rawg?id=invalid",
      ),
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
test("an unrelated local server is never mistaken for Checkpoint or stopped", async () => {
  const server = createServer((_req, res) => res.end("Another application"));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  try {
    assert.equal(await isCheckpointServer(port), false);
    await assert.rejects(
      selectDevPorts({ port, explicitPort: true }),
      /unavailable/,
    );
    assert.ok(server.listening);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
