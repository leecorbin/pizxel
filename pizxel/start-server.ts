/**
 * PiZXel Session Server Entry Point
 *
 * Runs many isolated PiZXel sessions in one process, for pizxel.uk.
 * Local modes (npm start) are unaffected; see start.ts.
 *
 * Usage:
 *   ENGINE_TOKEN=... npm run start:server
 *
 * Environment (defaults in brackets):
 *   ENGINE_TOKEN          Bearer token the website sends (required)
 *   PORT                  HTTP/WebSocket port [3001]
 *   DATA_ROOT             Session data directory [./data/server]
 *   MAX_LIVE_SESSIONS     Sessions running at once [10]
 *   FPS_CAP               Frame rate per session [20]
 *   IDLE_SUSPEND_SECONDS  Suspend a session this long after its last viewer leaves [60]
 *   EXTRA_APPS_DIR        Extra apps directory, e.g. private apps [none]
 */

import * as path from "path";
import { SessionManager } from "./server/session-manager";
import { createSessionServer } from "./server/server";

function intEnv(name: string, fallback: number): number {
  const value = process.env[name];
  if (value === undefined || value === "") return fallback;
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer (got "${value}")`);
  }
  return parsed;
}

async function main() {
  const token = process.env.ENGINE_TOKEN;
  if (!token) {
    console.error("ENGINE_TOKEN must be set");
    process.exit(1);
  }

  const port = intEnv("PORT", 3001);
  const manager = new SessionManager({
    dataRoot: path.resolve(process.env.DATA_ROOT || "data/server"),
    maxLiveSessions: intEnv("MAX_LIVE_SESSIONS", 10),
    fps: intEnv("FPS_CAP", 20),
    idleSuspendMs: intEnv("IDLE_SUSPEND_SECONDS", 60) * 1000,
    extraAppsDir: process.env.EXTRA_APPS_DIR
      ? path.resolve(process.env.EXTRA_APPS_DIR)
      : null,
  });

  const server = createSessionServer(manager, token);
  server.listen(port, () => {
    console.log(`PiZXel session server listening on port ${port}`);
    console.log(
      `  max live sessions: ${manager.maxLiveSessions}, data: ${
        process.env.DATA_ROOT || "data/server"
      }`
    );
  });

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log("Shutting down...");
    server.close();
    await manager.shutdown();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
