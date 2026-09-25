/**
 * Session Server
 *
 * Internal HTTP API and WebSocket endpoint for the pizxel.uk website.
 * Every request except GET /healthz needs `Authorization: Bearer <token>`.
 * See docs/session-api.md.
 */

import * as crypto from "crypto";
import { createServer, IncomingMessage, Server } from "http";
import type { Duplex } from "stream";
import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import { SessionManager } from "./session-manager";

/** WebSocket close codes (see docs/session-api.md) */
export const CloseCodes = {
  SHUTTING_DOWN: 1001,
  BAD_TOKEN: 4401,
  UNKNOWN_SESSION: 4404,
  SESSION_DELETED: 4410,
  FULL: 4503,
} as const;

/** Largest WebSocket message accepted from a client */
const MAX_CLIENT_MESSAGE_BYTES = 64 * 1024;

export function createSessionServer(
  manager: SessionManager,
  token: string
): Server {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "16kb" }));

  // Health check (no auth: says nothing about sessions)
  app.get("/healthz", (_req, res) => {
    res.json({ ok: true });
  });

  // Everything else needs the token
  app.use((req, res, next) => {
    if (!hasValidToken(req, token)) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    next();
  });

  app.post("/sessions", (_req, res) => {
    const session = manager.create();
    res.status(201).json({ id: session.id });
  });

  app.delete("/sessions/:id", async (req, res) => {
    try {
      await manager.delete(req.params.id);
      res.status(204).end();
    } catch (error) {
      console.error("[SessionServer] Delete failed:", error);
      res.status(500).json({ error: "delete failed" });
    }
  });

  app.get("/sessions/:id/status", (req, res) => {
    const session = manager.get(req.params.id);
    if (!session) {
      res.status(404).json({ error: "not found" });
      return;
    }
    res.json({
      state: session.state,
      lastActiveAt: new Date(session.lastActiveAt).toISOString(),
    });
  });

  app.delete("/sessions/:id/vault", (req, res) => {
    const session = manager.get(req.params.id);
    session?.wipeVault(); // Idempotent: nothing to do for an unknown session
    res.status(204).end();
  });

  app.get("/catalog", (_req, res) => {
    res.json(manager.catalog());
  });

  app.get("/sessions/:id/apps", (req, res) => {
    const session = manager.get(req.params.id);
    if (!session) {
      res.status(404).json({ error: "not found" });
      return;
    }
    res.json({ enabled: session.getEnabledApps() });
  });

  app.put("/sessions/:id/apps", (req, res) => {
    const session = manager.get(req.params.id);
    if (!session) {
      res.status(404).json({ error: "not found" });
      return;
    }
    const enabled = req.body?.enabled;
    const optional = new Set(
      manager.catalog().filter((a) => a.tier === "optional").map((a) => a.id)
    );
    if (
      !Array.isArray(enabled) ||
      !enabled.every((id) => typeof id === "string" && optional.has(id))
    ) {
      res.status(400).json({ error: "enabled must list optional app ids" });
      return;
    }
    const unique = [...new Set(enabled as string[])];
    session
      .setEnabledApps(unique)
      .then(() => res.json({ enabled: unique }))
      .catch((error) => {
        console.error("[SessionServer] Changing apps failed:", error);
        res.status(500).json({ error: "changing apps failed" });
      });
  });

  app.use((_req, res) => {
    res.status(404).json({ error: "not found" });
  });

  const server = createServer(app);

  // WebSocket: /sessions/:id/ws
  const wss = new WebSocketServer({
    noServer: true,
    perMessageDeflate: false,
    maxPayload: MAX_CLIENT_MESSAGE_BYTES,
  });

  server.on("upgrade", (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    const match = /^\/sessions\/([^/?]+)\/ws(?:\?.*)?$/.exec(req.url ?? "");
    if (!match) {
      socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
      socket.destroy();
      return;
    }

    // Accept the upgrade first so the client sees a close code
    wss.handleUpgrade(req, socket, head, (ws) => {
      handleConnection(ws, req, match[1]).catch((error) => {
        console.error("[SessionServer] Connection error:", error);
        ws.close(1011, "Internal error");
      });
    });
  });

  async function handleConnection(
    ws: WebSocket,
    req: IncomingMessage,
    id: string
  ): Promise<void> {
    if (!hasValidToken(req, token)) {
      ws.close(CloseCodes.BAD_TOKEN, "Unauthorized");
      return;
    }

    const session = manager.get(id);
    if (!session) {
      ws.close(CloseCodes.UNKNOWN_SESSION, "Unknown session");
      return;
    }

    if (!(await manager.acquire(session))) {
      ws.send(JSON.stringify({ type: "full" }));
      ws.close(CloseCodes.FULL, "Full");
      return;
    }

    // The viewer may have gone, or the session been deleted, while resuming
    if (ws.readyState !== WebSocket.OPEN) return;
    if (!manager.get(id)) {
      ws.close(CloseCodes.SESSION_DELETED, "Session deleted");
      return;
    }

    session.attach(ws);
  }

  return server;
}

function hasValidToken(req: IncomingMessage, token: string): boolean {
  const header = req.headers.authorization ?? "";
  const expected = Buffer.from(`Bearer ${token}`);
  const actual = Buffer.from(header);
  return (
    actual.length === expected.length &&
    crypto.timingSafeEqual(actual, expected)
  );
}
