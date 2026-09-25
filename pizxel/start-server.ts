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
 *   INCLUDE_PRIVATE_APPS  Load "private" tier apps: true for a private instance [false]
 *   ALLOW_NETWORK         Allow outbound requests to allowlisted hosts (private
 *                         instance only; route them via HTTPS_PROXY with
 *                         NODE_USE_ENV_PROXY=1) [false]
 *   EGRESS_ALLOWLIST      Allowlist file, one host per line
 *                         [$EXTRA_APPS_DIR/egress-allowlist.txt]
 */

import * as path from "path";
import { SessionManager } from "./server/session-manager";
import { createSessionServer } from "./server/server";
import {
  installNetworkGuard,
  readAllowlistFile,
  setNetworkAllowed,
  setNetworkAllowlist,
} from "./core/network";

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

  // Visitors must not reach the network through PiZXel. A private instance
  // may reach allowlisted hosts only; the guard enforces this on every
  // request, whatever the app code does.
  if (/^(1|true|yes)$/i.test(process.env.ALLOW_NETWORK ?? "")) {
    const allowlistPath =
      process.env.EGRESS_ALLOWLIST ||
      (process.env.EXTRA_APPS_DIR
        ? path.join(process.env.EXTRA_APPS_DIR, "egress-allowlist.txt")
        : "");
    let hosts: string[] = [];
    try {
      hosts = readAllowlistFile(allowlistPath);
    } catch {
      // Handled below
    }
    if (hosts.length === 0) {
      console.error(
        "ALLOW_NETWORK needs an allowlist (EGRESS_ALLOWLIST, or egress-allowlist.txt in EXTRA_APPS_DIR)"
      );
      process.exit(1);
    }
    setNetworkAllowed(true);
    setNetworkAllowlist(hosts);
    console.log(`Network: allowed to ${hosts.join(", ")}`);
    if (process.env.HTTPS_PROXY && !process.env.NODE_USE_ENV_PROXY) {
      console.warn("HTTPS_PROXY is set but NODE_USE_ENV_PROXY isn't: fetch won't use the proxy");
    }
  } else {
    setNetworkAllowed(false);
  }
  installNetworkGuard();

  const port = intEnv("PORT", 3001);
  const manager = new SessionManager({
    dataRoot: path.resolve(process.env.DATA_ROOT || "data/server"),
    maxLiveSessions: intEnv("MAX_LIVE_SESSIONS", 10),
    fps: intEnv("FPS_CAP", 20),
    idleSuspendMs: intEnv("IDLE_SUSPEND_SECONDS", 60) * 1000,
    extraAppsDir: process.env.EXTRA_APPS_DIR
      ? path.resolve(process.env.EXTRA_APPS_DIR)
      : null,
    includePrivateApps: /^(1|true|yes)$/i.test(
      process.env.INCLUDE_PRIVATE_APPS ?? ""
    ),
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
