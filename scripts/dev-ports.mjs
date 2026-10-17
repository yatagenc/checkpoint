import { createServer } from "node:net";

function portNumber(value, name) {
  if (
    !/^\d+$/.test(String(value)) ||
    Number(value) < 1024 ||
    Number(value) > 65535
  )
    throw new Error(`${name} must be an integer between 1024 and 65535.`);
  return Number(value);
}
export function parseDevOptions(args, env) {
  const flags = {};
  for (let index = 0; index < args.length; index++) {
    if (args[index] === "--help" || args[index] === "-h") return { help: true };
    const [name, inline] = args[index].split("=");
    if (!["--port", "--target-port"].includes(name))
      throw new Error(
        `Unsupported development option: ${name}. Use --port or --target-port.`,
      );
    const value = inline ?? args[++index];
    flags[name] = portNumber(value, name);
  }
  const publicValue = flags["--port"] ?? env.CHECKPOINT_PORT;
  const targetValue = flags["--target-port"] ?? env.CHECKPOINT_VITE_PORT;
  return {
    port:
      publicValue === undefined
        ? 8888
        : portNumber(publicValue, "CHECKPOINT_PORT"),
    explicitPort: publicValue !== undefined,
    target:
      targetValue === undefined
        ? undefined
        : portNumber(targetValue, "CHECKPOINT_VITE_PORT"),
  };
}
export async function inspectPort(port) {
  for (const host of ["::", "127.0.0.1"]) {
    const result = await new Promise((resolve) => {
      const server = createServer();
      server.once("error", (error) =>
        resolve({ available: false, reason: error.code }),
      );
      server.listen({ port, host, exclusive: true }, () =>
        server.close(() => resolve({ available: true })),
      );
    });
    if (
      !result.available &&
      !(
        host === "::" &&
        ["EAFNOSUPPORT", "EADDRNOTAVAIL"].includes(result.reason)
      )
    )
      return result;
  }
  return { available: true };
}
/** No upstream API request or secret is used for the local health check. */
export async function isCheckpointServer(port) {
  try {
    const [page, proxy] = await Promise.all([
      fetch(`http://127.0.0.1:${port}/`, {
        signal: AbortSignal.timeout(1500),
        redirect: "error",
      }),
      fetch(`http://127.0.0.1:${port}/.netlify/functions/rawg?id=invalid`, {
        signal: AbortSignal.timeout(1500),
        redirect: "error",
      }),
    ]);
    return (
      page.ok &&
      (await page.text()).includes("<title>Checkpoint") &&
      proxy.status === 400 &&
      (await proxy.json()).error === "Invalid RAWG game ID."
    );
  } catch {
    return false;
  }
}
export async function selectDevPorts(
  options,
  inspect = inspectPort,
  existing = isCheckpointServer,
) {
  let port = options.port;
  const first = await inspect(port);
  if (!first.available) {
    if (await existing(port)) return { port, reuse: true };
    if (options.explicitPort)
      throw new Error(
        `Port ${port} is unavailable (${first.reason}). Choose another port: npm run dev -- --port 8889`,
      );
    port = 0;
    for (let candidate = 8889; candidate <= 8898; candidate++)
      if ((await inspect(candidate)).available) {
        port = candidate;
        break;
      }
    if (!port)
      throw new Error(
        "No available Netlify port in 8888–8898. Set CHECKPOINT_PORT or use --port.",
      );
  }
  let target = options.target;
  if (target !== undefined) {
    if (target === port || !(await inspect(target)).available)
      throw new Error(
        `Vite target port ${target} is unavailable or equals the Netlify port. Choose a different --target-port.`,
      );
  } else {
    for (let candidate = 5173; candidate <= 5182; candidate++)
      if (candidate !== port && (await inspect(candidate)).available) {
        target = candidate;
        break;
      }
    if (target === undefined)
      throw new Error(
        "No available Vite port in 5173–5182. Set CHECKPOINT_VITE_PORT or use --target-port.",
      );
  }
  return { port, target, reuse: false, fallback: port !== options.port };
}
