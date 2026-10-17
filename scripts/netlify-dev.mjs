import { spawn } from "node:child_process";
import { parseDevOptions, selectDevPorts } from "./dev-ports.mjs";

// Node's --env-file loads secrets server-side; never log environment values.
try {
  const options = parseDevOptions(process.argv.slice(2), process.env);
  if (options.help)
    console.log(
      "npm run dev [-- --port 8889 --target-port 5174]\nOptional environment: CHECKPOINT_PORT, CHECKPOINT_VITE_PORT. RAWG_API_KEY stays server-side.",
    );
  else {
    const ports = await selectDevPorts(options);
    const url = `http://localhost:${ports.port}`;
    if (ports.reuse) {
      console.log(
        `Checkpoint is already running at ${url}. Reusing it; no second server started.\nRestart the existing server to load environment changes. For a separate instance: npm run dev -- --port 8889`,
      );
    } else {
      if (ports.fallback)
        console.log(
          `Port ${options.port} is unavailable. Using ${ports.port}. Browser records are origin-specific; no records are moved or reset.`,
        );
      console.log(
        `Starting Checkpoint at ${url} (Vite target ${ports.target}).`,
      );
      if (!process.env.npm_execpath)
        throw new Error("Start this script with npm run dev.");
      const child = spawn(
        process.execPath,
        [
          process.env.npm_execpath,
          "exec",
          "--yes",
          "--cache",
          ".npm-cache",
          "--package=netlify-cli@27.13.0",
          "--",
          "netlify",
          "dev",
          "--offline",
          "--port",
          String(ports.port),
          "--target-port",
          String(ports.target),
        ],
        {
          stdio: "inherit",
          windowsHide: true,
          env: { ...process.env, CHECKPOINT_VITE_PORT: String(ports.target) },
        },
      );
      let stopping = false;
      const stop = () => {
        if (stopping || !child.pid) return;
        stopping = true;
        // Only this launcher's child tree, never a pre-existing listener.
        if (process.platform === "win32")
          spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
            stdio: "ignore",
            windowsHide: true,
          });
        else child.kill("SIGTERM");
      };
      process.on("SIGINT", stop);
      process.on("SIGTERM", stop);
      if (process.platform === "win32") process.on("SIGBREAK", stop);
      child.on("error", () => {
        console.error("Unable to start Netlify CLI. Check npm access.");
        process.exitCode = 1;
      });
      child.on("exit", (code) => {
        process.removeListener("SIGINT", stop);
        process.removeListener("SIGTERM", stop);
        process.removeListener("SIGBREAK", stop);
        process.exitCode = stopping ? 0 : (code ?? 1);
      });
    }
  }
} catch (error) {
  console.error(
    error instanceof Error
      ? error.message
      : "Unable to configure local development.",
  );
  process.exitCode = 1;
}
