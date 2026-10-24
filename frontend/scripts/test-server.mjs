import { spawn } from "node:child_process";
import { resolve } from "node:path";
const python = resolve(
  process.platform === "win32"
    ? "../.venv/Scripts/python.exe"
    : "../.venv/bin/python",
);
const child = spawn(
  python,
  ["-m", "uvicorn", "backend.api:app", "--host", "127.0.0.1", "--port", "8001"],
  {
    cwd: "..",
    env: { ...process.env, DEMO_MODE: "true", RATE_LIMIT_PER_MINUTE: "200" },
    stdio: "inherit",
    windowsHide: true,
  },
);
// Resolve executable against this script's launching directory, not the child's cwd.
child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});
process.on("SIGTERM", () => child.kill());
process.on("SIGINT", () => child.kill());
child.on("exit", (code) => process.exit(code || 0));
