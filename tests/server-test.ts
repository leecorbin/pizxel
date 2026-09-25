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
import * as crypto from "crypto";

const TOKEN = "test-token";
const FRAME_BYTES = 256 * 192 * 3;
const IDLE_SUSPEND_MS = 300;

let baseUrl = "";

function assert(condition: any, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
  console.log(`  ✓ ${message}`);
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Highlight an app in a live session's launcher (icon order depends on the apps) */
function select(manager: SessionManager, id: string, appName: string): void {
  const launcher = (manager.get(id) as any).instance.appFramework.launcherApp;
  const icon = launcher.apps.find((i: any) => i.name === appName);
  if (!icon) throw new Error(`No launcher icon for ${appName}`);
  launcher.selectApp(icon.app);
}

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

/** An extra apps directory holding one "private" tier app */
function makePrivateAppsDir(root: string): string {
  const dir = path.join(root, "extra-apps");
  const app = path.join(dir, "secret");
  fs.mkdirSync(app, { recursive: true });
  fs.writeFileSync(
    path.join(app, "config.json"),
    JSON.stringify({ name: "Secret", description: "", icon: "⏰", main: "main.ts", tier: "private" })
  );
  fs.writeFileSync(
    path.join(app, "main.ts"),
    `export class SecretApp {
  readonly name = "Secret";
  dirty = true;
  onActivate() {}
  onDeactivate() {}
  onUpdate() {}
  onEvent() { return false; }
  render() { this.dirty = false; }
}
`
  );
  return dir;
}

async function main() {
  const dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pizxel-server-test-"));
  const extraAppsDir = makePrivateAppsDir(dataRoot);
  // A public instance that can see a private app, but must not offer it
  const manager = new SessionManager({
    dataRoot,
    maxLiveSessions: 2,
    fps: 20,
    idleSuspendMs: IDLE_SUSPEND_MS,
    extraAppsDir,
    includePrivateApps: false,
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
    assert(
      catalog.some((app: any) => app.id === "demo" && app.tier === "optional"),
      "and optional apps"
    );
    assert(
      !catalog.some((app: any) => app.tier === "private"),
      "but no private apps on a public instance"
    );
    const privateCatalog = new SessionManager({
      dataRoot: path.join(dataRoot, "private"),
      maxLiveSessions: 1,
      fps: 20,
      idleSuspendMs: IDLE_SUSPEND_MS,
      extraAppsDir,
      includePrivateApps: true,
    }).catalog();
    assert(
      privateCatalog.some((app) => app.id === "secret" && app.tier === "private"),
      "a private instance lists private apps"
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
    assert(
      (await api("PUT", `/sessions/${a}/apps`, { enabled: ["secret"] })).status === 400,
      "private apps can't be enabled on a public instance"
    );
    const enabled = await api("PUT", `/sessions/${b}/apps`, { enabled: ["demo"] });
    assert(enabled.status === 200 && enabled.json.enabled[0] === "demo", "an optional app can be enabled");

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

    console.log("Tiers");
    const appNames = (id: string): string[] => {
      const launcher = (manager.get(id) as any).instance.appFramework.launcherApp;
      return [...launcher.apps, ...launcher.gameApps].map((icon: any) => icon.name);
    };
    assert(appNames(a).includes("Snake") && appNames(a).includes("Clock"), "core apps (including games) are preinstalled");
    assert(appNames(b).includes("Demo"), "an enabled optional app is loaded on resume");
    assert(!appNames(a).includes("Demo"), "and not in sessions that didn't enable it");
    assert(!appNames(a).includes("Secret"), "private apps aren't loaded on a public instance");

    console.log("Isolation");
    const aFrames = viewerA.frames.length;
    const bFrames = viewerB.frames.length;
    viewerA.send({ type: "key", key: "ArrowRight", code: "ArrowRight", shift: false, ctrl: false, alt: false });
    await viewerA.waitFor(() => viewerA.frames.length > aFrames);
    await wait(200);
    assert(viewerA.frames.length > aFrames, "a key to A redraws A");
    assert(viewerB.frames.length === bFrames, "and B gets no new frame");

    console.log("Live app changes");
    assert((await api("PUT", `/sessions/${b}/apps`, { enabled: [] })).status === 200, "PUT /apps on a live session");
    assert(!appNames(b).includes("Demo"), "a disabled app leaves the live launcher at once");
    await api("PUT", `/sessions/${b}/apps`, { enabled: ["demo", "keyboard-demo"] });
    assert(
      appNames(b).includes("Demo") && appNames(b).includes("Keyboard Demo"),
      "enabled apps join the live launcher at once"
    );
    select(manager, b, "Demo");
    viewerB.send({ type: "key", key: "Enter" });
    await wait(300);
    assert(manager.get(b)?.activeAppName === "Demo", "the added app opens");
    const framesBeforeRemoval = viewerB.frames.length;
    await api("PUT", `/sessions/${b}/apps`, { enabled: ["keyboard-demo"] });
    await viewerB.waitFor(() => viewerB.frames.length > framesBeforeRemoval);
    assert(manager.get(b)?.activeAppName === "Launcher", "removing the open app returns to the launcher");
    assert(!appNames(b).includes("Demo") && appNames(b).includes("Keyboard Demo"), "leaving the other app installed");
    await api("PUT", `/sessions/${b}/apps`, { enabled: ["demo"] });
    await wait(300);

    console.log("Keys");
    const keyDown = (id: string, key: string): boolean =>
      (manager.get(id) as any).instance.appFramework.isKeyDown(key);
    viewerB.send({ type: "key", key: "ArrowLeft", repeat: false });
    await wait(50);
    assert(keyDown(b, "ArrowLeft"), "a key is held after keydown");
    viewerB.send({ type: "keyup", key: "ArrowLeft" });
    await wait(50);
    assert(!keyDown(b, "ArrowLeft"), "and released on keyup");
    viewerB.send({ type: "key", key: "ArrowLeft" });
    viewerB.send({ type: "key", key: "x" });
    viewerB.send({ type: "keyup", key: "*" });
    await wait(50);
    assert(!keyDown(b, "ArrowLeft") && !keyDown(b, "x"), '"*" releases every key');
    viewerB.send({ type: "text", text: "hi" });
    await wait(50);
    assert(!keyDown(b, "h") && !keyDown(b, "i"), "pasted text doesn't leave keys held");
    const extraViewer = new Viewer(b);
    await extraViewer.open();
    await extraViewer.waitFor(() => extraViewer.frames.length > 0);
    extraViewer.send({ type: "key", key: "ArrowRight" });
    await wait(50);
    assert(keyDown(b, "ArrowRight"), "a second viewer holds a key");
    extraViewer.close();
    await extraViewer.waitForClose();
    await wait(50);
    assert(!keyDown(b, "ArrowRight"), "which is released when that viewer disconnects");

    const escapesBefore = viewerB.messages.filter((m) => m.type === "escape:unhandled").length;
    viewerB.send({ type: "key", key: "Escape", repeat: true });
    await wait(50);
    assert(
      viewerB.messages.filter((m) => m.type === "escape:unhandled").length === escapesBefore,
      "a repeated Escape at the launcher sends nothing"
    );
    viewerB.send({ type: "key", key: "Escape", repeat: false });
    await viewerB.waitFor(
      () => viewerB.messages.filter((m) => m.type === "escape:unhandled").length > escapesBefore
    );
    assert(true, "an unhandled Escape at the launcher sends escape:unhandled");
    viewerB.send({ type: "keyup", key: "*" });

    console.log("Microphone");
    const micSession = manager.get(b) as any;
    select(manager, b, "Clock");
    viewerB.send({ type: "key", key: "Enter" });
    await wait(200);
    micSession.requestAudioStart();
    await viewerB.waitFor(() => viewerB.messages.some((m) => m.type === "audio:request-start"));
    const request = viewerB.messages.find((m) => m.type === "audio:request-start");
    assert(request.app === "clock" && request.name === "Clock", "audio:request-start names the app asking");
    viewerB.send({ type: "key", key: "Escape" });
    await wait(200);

    console.log("Vault");
    assert(
      viewerB.messages.some((m) => m.type === "vault:state" && m.state === "none"),
      "vault:state is sent on connect (none yet)"
    );
    const bLauncher = (manager.get(b) as any).instance.appFramework.launcherApp;
    const clockApp = bLauncher.apps.find((i: any) => i.name === "Clock").app;
    assert(clockApp.secrets && !clockApp.secrets.set("token", "t0p-secret"), "saving a secret with no vault fails");
    await viewerB.waitFor(() => viewerB.messages.some((m) => m.type === "vault:setup"));
    const setup = viewerB.messages.find((m) => m.type === "vault:setup");
    assert(
      setup.app === "clock" && setup.appName === "Clock" && setup.name === "token",
      "and sends vault:setup naming the app (id and display name) and secret"
    );
    clockApp.secrets.set("token", "again");
    await wait(50);
    assert(viewerB.messages.filter((m) => m.type === "vault:setup").length === 1, "only once until the state changes");
    const vk = crypto.randomBytes(32).toString("base64url");
    viewerB.send({ type: "vault:key", key: vk });
    await viewerB.waitFor(() => viewerB.messages.some((m) => m.type === "vault:state" && m.state === "unlocked"));
    assert(clockApp.secrets.set("token", "t0p-secret") && clockApp.secrets.get("token") === "t0p-secret", "vault:key unlocks it and secrets work");
    const vaultFile = fs.readFileSync(path.join(dataRoot, "sessions", b, "vault", "vault.json"), "utf-8");
    assert(!vaultFile.includes("t0p-secret") && !vaultFile.includes(vk), "the session's vault file holds neither the secret nor the key");
    viewerB.send({ type: "vault:key", key: crypto.randomBytes(32).toString("base64url") });
    await viewerB.waitFor(() => viewerB.messages.some((m) => m.type === "vault:bad-key"));
    assert(clockApp.secrets.get("token") === "t0p-secret", "a wrong key gets vault:bad-key (and changes nothing)");
    viewerB.send({ type: "vault:key", key: "not-a-key" });
    await wait(50);
    assert(viewerB.messages.filter((m) => m.type === "vault:bad-key").length === 1, "a malformed key is ignored");
    assert((await api("DELETE", `/sessions/${b}/vault`)).status === 204, "DELETE /sessions/:id/vault");
    await viewerB.waitFor(() => viewerB.messages.filter((m) => m.type === "vault:state" && m.state === "none").length >= 2);
    assert(clockApp.secrets.get("token") === null, "wipes the vault and its secrets");
    assert((await api("DELETE", `/sessions/${b}/vault`)).status === 204, "and is idempotent");

    console.log("Limits");
    const c = (await api("POST", "/sessions")).json.id;
    const viewerC = new Viewer(c);
    const cCode = await viewerC.waitForClose();
    assert(viewerC.messages.some((m) => m.type === "full"), "a third live session gets {type:\"full\"}");
    assert(cCode === 4503, "and close code 4503");
    assert((await new Viewer("AAAAAAAAAAAAAAAAAAAAAA").waitForClose()) === 4404, "unknown session closes with 4404");
    assert((await new Viewer(a, "wrong").waitForClose()) === 4401, "bad token closes with 4401");

    // Simultaneous connects must not exceed the limit
    const raceManager = new SessionManager({
      dataRoot: path.join(dataRoot, "race"),
      maxLiveSessions: 1,
      fps: 20,
      idleSuspendMs: 60000,
      extraAppsDir: null,
      includePrivateApps: false,
    });
    const racers = [raceManager.create(), raceManager.create(), raceManager.create()];
    const results = await Promise.all(racers.map((r) => raceManager.acquire(r)));
    assert(
      raceManager.liveCount() === 1 && results.filter(Boolean).length === 1,
      "simultaneous connects can't exceed the live limit"
    );
    await raceManager.shutdown();

    console.log("Suspend and resume");
    // A: open Standby, change its mode, go back (saves state)
    select(manager, a, "Standby");
    viewerA.send({ type: "key", key: "Enter" });
    await wait(200);
    viewerA.send({ type: "key", key: " " });
    viewerA.send({ type: "key", key: "Escape" });
    await wait(200);
    viewerA.close();
    await wait(IDLE_SUSPEND_MS + 300);
    assert((await api("GET", `/sessions/${a}/status`)).json.state === "suspended", "an unwatched session suspends when idle");
    const saved = JSON.parse(fs.readFileSync(path.join(dataRoot, "sessions", a, "storage", "standby.json"), "utf-8"));
    assert(saved.animation_mode === "flowing", "its app state is saved in its own directory");

    const reopenedA = new Viewer(a);
    await reopenedA.open();
    await reopenedA.waitFor(() => reopenedA.frames.length > 0);
    assert(reopenedA.messages[0]?.type === "init", "reconnecting resumes it (init + frame)");
    assert(manager.get(a)?.activeAppName === "Launcher", "left at the launcher, it resumes at the launcher");
    reopenedA.send({ type: "vault:key", key: crypto.randomBytes(32).toString("base64url") });
    await reopenedA.waitFor(() => reopenedA.messages.some((m) => m.type === "vault:state" && m.state === "unlocked"));

    // Leave Clock open this time
    select(manager, a, "Clock");
    reopenedA.send({ type: "key", key: "Enter" });
    await wait(200);
    assert(manager.get(a)?.activeAppName === "Clock", "Clock is open");
    reopenedA.close();
    await reopenedA.waitForClose();
    await wait(30);
    assert((manager.get(a) as any).vault.state() === "locked", "the vault locks when the last viewer leaves");
    await wait(IDLE_SUSPEND_MS + 300);
    assert((await api("GET", `/sessions/${a}/status`)).json.state === "suspended", "it suspends again");

    const resumedA = new Viewer(a);
    await resumedA.open();
    await resumedA.waitFor(() => resumedA.frames.length > 0);
    assert(manager.get(a)?.activeAppName === "Clock", "and resumes in the app that was open");
    resumedA.send({ type: "key", key: "Escape" });
    await wait(200);
    assert(manager.get(a)?.activeAppName === "Launcher", "from which Escape returns to the launcher");
    resumedA.send({ type: "key", key: "Enter" });
    await wait(200);
    assert(manager.get(a)?.activeAppName === "Clock", "with the app it came from highlighted");

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
