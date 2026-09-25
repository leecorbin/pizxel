/**
 * Session Server Test
 *
 * Starts the session server in-process and drives it like the website does:
 * HTTP API calls and WebSocket viewers.
 *
 * Run: npx tsx tests/server-test.ts
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import type { AddressInfo } from "net";
import { WebSocket } from "ws";
import { SessionManager } from "../pizxel/server/session-manager";
import { createSessionServer } from "../pizxel/server/server";

const TOKEN = "test-token";
const FRAME_BYTES = 256 * 192 * 3;
const IDLE_SUSPEND_MS = 300;

let baseUrl = "";

function assert(condition: any, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
  console.log(`  ✓ ${message}`);
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function api(
  method: string,
  urlPath: string,
  body?: any,
  token: string | null = TOKEN
): Promise<{ status: number; json: any }> {
  const headers: Record<string, string> = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers["content-type"] = "application/json";
  const res = await fetch(baseUrl + urlPath, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
}

/** A WebSocket viewer that records what it receives */
class Viewer {
  ws: WebSocket;
  messages: any[] = [];
  frames: Buffer[] = [];
  closeCode: number | null = null;
  private opened: Promise<void>;
  private closed: Promise<number>;

  constructor(id: string, token: string | null = TOKEN) {
    const headers: Record<string, string> = {};
    if (token) headers.authorization = `Bearer ${token}`;
    this.ws = new WebSocket(`${baseUrl.replace("http", "ws")}/sessions/${id}/ws`, {
      headers,
    });
    this.ws.on("message", (data, isBinary) => {
      if (isBinary) this.frames.push(data as Buffer);
      else this.messages.push(JSON.parse(data.toString()));
    });
    this.opened = new Promise((resolve) => this.ws.on("open", () => resolve()));
    this.closed = new Promise((resolve) =>
      this.ws.on("close", (code) => {
        this.closeCode = code;
        resolve(code);
      })
    );
  }

  open(): Promise<void> {
    return this.opened;
  }

  waitForClose(): Promise<number> {
    return this.closed;
  }

  async waitFor(condition: () => boolean, timeoutMs = 5000): Promise<void> {
    const start = Date.now();
    while (!condition()) {
      if (Date.now() - start > timeoutMs) throw new Error("Timed out waiting");
      await wait(20);
    }
  }

  send(message: object): void {
    this.ws.send(JSON.stringify(message));
  }

  close(): void {
    this.ws.close();
  }
}

async function main() {
  const dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pizxel-server-test-"));
  const manager = new SessionManager({
    dataRoot,
    maxLiveSessions: 2,
    fps: 20,
    idleSuspendMs: IDLE_SUSPEND_MS,
    extraAppsDir: null,
  });
  const server = createSessionServer(manager, TOKEN);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  try {
    console.log("HTTP API");
    assert((await api("GET", "/healthz", undefined, null)).status === 200, "healthz needs no token");
    assert((await api("GET", "/catalog", undefined, null)).status === 401, "other routes need the token");
    assert((await api("GET", "/catalog", undefined, "wrong")).status === 401, "a wrong token is refused");

    const catalog = (await api("GET", "/catalog")).json;
    assert(
      catalog.some((app: any) => app.id === "clock" && app.tier === "core"),
      "catalog lists core apps with their tier"
    );

    const created = await api("POST", "/sessions");
    assert(created.status === 201 && typeof created.json.id === "string", "POST /sessions creates a session");
    const a = created.json.id;
    const b = (await api("POST", "/sessions")).json.id;
    assert((await api("GET", `/sessions/${a}/status`)).json.state === "suspended", "a new session starts suspended");
    assert((await api("GET", "/sessions/AAAAAAAAAAAAAAAAAAAAAA/status")).status === 404, "unknown session status is 404");
    assert((await api("GET", "/sessions/..%2F..%2Fetc/status")).status === 404, "a malformed id is 404");

    assert((await api("GET", `/sessions/${a}/apps`)).json.enabled.length === 0, "no optional apps enabled at first");
    assert(
      (await api("PUT", `/sessions/${a}/apps`, { enabled: ["not-an-app"] })).status === 400,
      "enabling an unknown app is refused"
    );
    assert(
      (await api("PUT", `/sessions/${a}/apps`, { enabled: ["clock"] })).status === 400,
      "only optional apps can be enabled (core apps are always on)"
    );

    console.log("WebSocket");
    const viewerA = new Viewer(a);
    await viewerA.open();
    await viewerA.waitFor(() => viewerA.frames.length > 0);
    assert(
      viewerA.messages[0]?.type === "init" && viewerA.messages[0].width === 256,
      "viewer gets init first"
    );
    assert(viewerA.frames[0].length === FRAME_BYTES, "then a raw RGB24 frame");
    assert((await api("GET", `/sessions/${a}/status`)).json.state === "live", "connecting makes the session live");

    const secondViewerA = new Viewer(a);
    await secondViewerA.open();
    await secondViewerA.waitFor(() => secondViewerA.frames.length > 0);
    assert(true, "a second viewer of a static screen still gets the current frame");
    secondViewerA.close();

    const viewerB = new Viewer(b);
    await viewerB.open();
    await viewerB.waitFor(() => viewerB.frames.length > 0);

    console.log("Isolation");
    const aFrames = viewerA.frames.length;
    const bFrames = viewerB.frames.length;
    viewerA.send({ type: "key", key: "ArrowRight", code: "ArrowRight", shift: false, ctrl: false, alt: false });
    await viewerA.waitFor(() => viewerA.frames.length > aFrames);
    await wait(200);
    assert(viewerA.frames.length > aFrames, "a key to A redraws A");
    assert(viewerB.frames.length === bFrames, "and B gets no new frame");

    console.log("Limits");
    const c = (await api("POST", "/sessions")).json.id;
    const viewerC = new Viewer(c);
    const cCode = await viewerC.waitForClose();
    assert(viewerC.messages.some((m) => m.type === "full"), "a third live session gets {type:\"full\"}");
    assert(cCode === 4503, "and close code 4503");
    assert((await new Viewer("AAAAAAAAAAAAAAAAAAAAAA").waitForClose()) === 4404, "unknown session closes with 4404");
    assert((await new Viewer(a, "wrong").waitForClose()) === 4401, "bad token closes with 4401");

    console.log("Suspend and resume");
    // A: open Standby (first item), change its mode, go back (saves state)
    viewerA.send({ type: "key", key: "ArrowLeft" });
    viewerA.send({ type: "key", key: "Enter" });
    await wait(200);
    viewerA.send({ type: "key", key: " " });
    viewerA.send({ type: "key", key: "Escape" });
    await wait(200);
    viewerA.close();
    await wait(IDLE_SUSPEND_MS + 300);
    assert((await api("GET", `/sessions/${a}/status`)).json.state === "suspended", "an unwatched session suspends when idle");
    const saved = JSON.parse(fs.readFileSync(path.join(dataRoot, "sessions", a, "storage", "standby.json"), "utf-8"));
    assert(saved.mode === "flowing", "its app state is saved in its own directory");

    const resumedA = new Viewer(a);
    await resumedA.open();
    await resumedA.waitFor(() => resumedA.frames.length > 0);
    assert(resumedA.messages[0]?.type === "init", "reconnecting resumes it (init + frame)");

    console.log("Delete");
    const deleted = await api("DELETE", `/sessions/${a}`);
    assert(deleted.status === 204, "DELETE returns 204");
    assert((await resumedA.waitForClose()) === 4410, "a connected viewer is closed with 4410");
    assert((await api("GET", `/sessions/${a}/status`)).status === 404, "status is then 404");
    assert(!fs.existsSync(path.join(dataRoot, "sessions", a)), "and its data is gone");
    assert((await api("DELETE", `/sessions/${a}`)).status === 204, "DELETE is idempotent");

    console.log("Shutdown");
    await manager.shutdown();
    assert((await viewerB.waitForClose()) === 1001, "shutdown closes viewers with 1001");
  } finally {
    await manager.shutdown();
    server.close();
    fs.rmSync(dataRoot, { recursive: true, force: true });
  }

  console.log("\n✓ Session server test passed");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
