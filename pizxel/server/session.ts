/**
 * Session
 *
 * One visitor's PiZXel in server mode: its data directory, its WebSockets
 * and, while live, its running instance. A session with no viewers is
 * suspended after a delay; its state stays on disk and it resumes on the
 * next connect. See docs/session-api.md for the WebSocket protocol.
 */

import * as fs from "fs";
import * as path from "path";
import { WebSocket } from "ws";
import { DeviceManager } from "../core/device-manager";
import { createInstance, PizxelInstance } from "../core/instance";
import { Audio } from "../audio/audio";
import { CanvasAudioOutputDriver } from "../drivers/audio/canvas-audio-output-driver";
import { CanvasAudioInputProxy } from "../drivers/audio/canvas-audio-input-proxy";
import type { AudioBridge } from "../drivers/audio/audio-bridge";
import { AppScanner, AppListing } from "../core/app-scanner";
import { SessionDisplayDriver, SessionInputDriver } from "./session-drivers";
import { Vault } from "../core/vault";

export type SessionState = "live" | "suspended";

export interface SessionOptions {
  fps: number;
  idleSuspendMs: number;
  /** Extra apps directory (e.g. private apps), or null for none */
  extraAppsDir: string | null;
  /** Load "private" tier apps (only for a private instance) */
  includePrivateApps: boolean;
}

interface SessionMeta {
  createdAt: number;
  lastActiveAt: number;
}

interface SessionConfig {
  enabledApps: string[];
  /** App that was open when the session was suspended (reopened on resume) */
  lastApp?: string | null;
}

/** Longest `key` value accepted (KeyboardEvent.key names are short) */
const MAX_KEY_LENGTH = 32;
/** Longest `text` (paste) accepted */
const MAX_TEXT_LENGTH = 256;
/**
 * A viewer with more than about a frame still unsent is behind: skip frames
 * to it (queueing them would only add lag) and send the latest once it
 * catches up
 */
const MAX_BUFFERED_BYTES = 160 * 1024;
/** How often to check whether a lagging viewer has caught up (ms) */
const CATCH_UP_CHECK_MS = 20;
/**
 * A tab left open with no input for this long drops to IDLE_FPS (a clock
 * still ticks, but far fewer frames are drawn and sent); the next key brings
 * the full frame rate back
 */
const IDLE_VIEW_MS = 10 * 60 * 1000;
const IDLE_FPS = 2;

/** Microphone messages accepted from the browser */
const AUDIO_INPUT_TYPES = new Set([
  "audio:started",
  "audio:stopped",
  "audio:denied",
  "audio:error",
  "audio:analysis",
  "audio:beat",
]);

export class Session implements AudioBridge {
  readonly id: string;
  readonly dir: string;
  state: SessionState = "suspended";
  lastActiveAt: number;

  private options: SessionOptions;
  private sockets: Set<WebSocket> = new Set();
  /** Keys each viewer is holding down, released if it disconnects */
  private heldKeys: Map<WebSocket, Set<string>> = new Map();
  /** Viewers that skipped a frame and need the latest one when they catch up */
  private lagging: Set<WebSocket> = new Set();
  private catchUpTimer: NodeJS.Timeout | null = null;
  private lastInputAt: number = Date.now();
  private idleTimer: NodeJS.Timeout | null = null;
  private throttled: boolean = false;
  /** Secrets vault (file-based; VK only in memory while unlocked) */
  private vault: Vault;
  /** vault:setup / vault:need already sent, until the vault state changes */
  private vaultRequestsSent: Set<string> = new Set();
  private instance: PizxelInstance | null = null;
  private display: SessionDisplayDriver | null = null;
  private input: SessionInputDriver | null = null;
  private audioInputCallback: ((event: string, data: any) => void) | null =
    null;
  private suspendTimer: NodeJS.Timeout | null = null;
  private transition: Promise<void> | null = null;

  constructor(id: string, dir: string, options: SessionOptions) {
    this.id = id;
    this.dir = dir;
    this.options = options;
    this.vault = new Vault(path.join(dir, "vault"));
    this.vault.onStateChange = (state) => {
      this.vaultRequestsSent.clear();
      this.broadcastJSON({ type: "vault:state", state });
    };
    this.vault.onRequest = (kind, app, name) => {
      const key = `${kind}\0${app}\0${name}`;
      if (this.vaultRequestsSent.has(key)) return;
      this.vaultRequestsSent.add(key);
      this.broadcastJSON({
        type: kind === "setup" ? "vault:setup" : "vault:need",
        app,
        appName: this.instance?.appName(app) ?? app,
        name,
      });
    };
    this.lastActiveAt = this.readMeta()?.lastActiveAt ?? Date.now();
  }

  /**
   * Create the files for a new session
   */
  static initialize(dir: string): void {
    fs.mkdirSync(dir, { recursive: true });
    const now = Date.now();
    const meta: SessionMeta = { createdAt: now, lastActiveAt: now };
    const config: SessionConfig = { enabledApps: [] };
    fs.writeFileSync(path.join(dir, "session.json"), JSON.stringify(meta));
    fs.writeFileSync(path.join(dir, "config.json"), JSON.stringify(config));
  }

  get viewerCount(): number {
    return this.sockets.size;
  }

  /** Name of the app in the foreground (null when suspended) */
  get activeAppName(): string | null {
    return this.instance?.appFramework.getActiveApp()?.name ?? null;
  }

  /**
   * Optional apps enabled for this session
   */
  getEnabledApps(): string[] {
    const enabledApps = this.readConfig().enabledApps;
    return Array.isArray(enabledApps) ? enabledApps : [];
  }

  /**
   * Set the optional apps. A live session gains or loses them straight away
   * (a removed app that's open closes to the launcher); a suspended one gets
   * them when it resumes.
   */
  async setEnabledApps(enabledApps: string[]): Promise<void> {
    this.writeConfig({ ...this.readConfig(), enabledApps });

    while (this.transition) await this.transition;
    const instance = this.instance;
    if (!instance) return;

    const enabled = new Set(enabledApps);
    const loaded = new Set(instance.loadedAppIds());
    const optionalApps = new AppScanner(undefined, {
      userAppsPath: this.options.extraAppsDir,
    })
      .listApps()
      .filter((app) => app.config.tier === "optional");

    for (const app of optionalApps) {
      if (enabled.has(app.id) && !loaded.has(app.id)) {
        await instance.addApp(app);
      } else if (!enabled.has(app.id) && loaded.has(app.id)) {
        await instance.removeApp(app.id);
      }
    }
  }

  // ===== Lifecycle =====

  /**
   * Start the session's PiZXel (no-op if already live)
   */
  async resume(): Promise<void> {
    // Wait out any transition, then check and claim with no await between
    while (this.transition) await this.transition;
    if (this.state === "live") return;
    this.transition = this.doResume().finally(() => (this.transition = null));
    await this.transition;
  }

  /**
   * Stop the session's PiZXel, keeping its state on disk
   */
  async suspend(): Promise<void> {
    this.clearSuspendTimer();
    while (this.transition) await this.transition;
    if (this.state === "suspended") return;
    this.transition = this.doSuspend().finally(() => (this.transition = null));
    await this.transition;
  }

  private async doResume(): Promise<void> {
    const display = new SessionDisplayDriver();
    const input = new SessionInputDriver();
    const deviceManager = new DeviceManager();
    deviceManager.useDrivers(display, input);
    await deviceManager.initialize();

    const audioDriver = new CanvasAudioOutputDriver(this);
    await audioDriver.initialize();
    const audioInput = new CanvasAudioInputProxy(this);
    await audioInput.initialize();

    const enabledApps = new Set(this.getEnabledApps());
    const include = (app: AppListing) => {
      switch (app.config.tier ?? "core") {
        case "core":
          return true;
        case "optional":
          return enabledApps.has(app.id);
        case "private":
          return this.options.includePrivateApps;
        default:
          return false;
      }
    };

    display.onFrame = (frame) => this.broadcastFrame(frame);

    const instance = await createInstance({
      deviceManager,
      audio: new Audio(audioDriver),
      audioInput,
      dataRoot: this.dir,
      scanner: { userAppsPath: this.options.extraAppsDir, include },
      fps: this.options.fps,
      startApp: this.readConfig().lastApp,
      vault: this.vault,
      // No screensaver for web visitors (it would also keep sending frames)
      standby: false,
    });
    // Escape at the launcher: let the viewer act on it (e.g. leave full screen)
    instance.appFramework.onUnhandledEscape = () =>
      this.broadcastJSON({ type: "escape:unhandled" });

    await instance.start();

    this.display = display;
    this.input = input;
    this.instance = instance;
    this.state = "live";
    this.lastInputAt = Date.now();
    this.throttled = false;
    this.idleTimer = setInterval(() => this.checkIdleView(), 30 * 1000);
    console.log(`[Session ${this.id}] Live`);
  }

  private async doSuspend(): Promise<void> {
    // Remember the open app so the visitor comes back to it
    const activeApp = this.activeAppName;
    if (fs.existsSync(this.dir)) {
      this.writeConfig({
        ...this.readConfig(),
        lastApp: activeApp === "Launcher" ? null : activeApp,
      });
    }

    this.vault.lock(); // VK lives only while the session does
    if (this.catchUpTimer) clearTimeout(this.catchUpTimer);
    this.catchUpTimer = null;
    if (this.idleTimer) clearInterval(this.idleTimer);
    this.idleTimer = null;
    this.lagging.clear();

    const instance = this.instance;
    this.instance = null;
    this.display = null;
    this.input = null;
    this.audioInputCallback = null;
    try {
      await instance?.stop();
    } catch (error) {
      console.error(`[Session ${this.id}] Error while suspending:`, error);
    }
    this.state = "suspended";
    this.writeMeta();
    console.log(`[Session ${this.id}] Suspended`);
  }

  // ===== Viewers =====

  /**
   * Attach a viewer's WebSocket. The session must already be live.
   */
  attach(ws: WebSocket): void {
    this.clearSuspendTimer();
    this.sockets.add(ws);
    this.lastActiveAt = Date.now();

    const display = this.display;
    if (display) {
      this.sendJSON(ws, {
        type: "init",
        width: display.getWidth(),
        height: display.getHeight(),
      });
      const frame = display.getLastFrame();
      if (frame) ws.send(frame, { binary: true });
      this.sendJSON(ws, { type: "vault:state", state: this.vault.state() });
    }

    ws.on("message", (data, isBinary) => {
      if (!isBinary) this.handleMessage(ws, data.toString());
    });
    ws.on("close", () => this.detach(ws));
    ws.on("error", () => this.detach(ws));
  }

  /**
   * Close every viewer's WebSocket
   */
  closeAll(code: number, reason: string): void {
    for (const ws of this.sockets) {
      ws.close(code, reason);
    }
  }

  private detach(ws: WebSocket): void {
    if (!this.sockets.delete(ws)) return;
    this.lagging.delete(ws);
    this.releaseKeys(ws);

    // No viewer left: forget VK (the next viewer sends it again)
    if (this.sockets.size === 0) {
      this.vault.lock();
    }

    // No viewer left to capture the microphone
    if (this.sockets.size === 0 && this.audioInputCallback && this.instance) {
      const callback = this.audioInputCallback;
      this.instance.run(() => callback("audio:stopped", {}));
    }
    this.lastActiveAt = Date.now();
    this.writeMeta();

    if (this.sockets.size === 0 && this.state === "live") {
      this.suspendTimer = setTimeout(() => {
        this.suspendTimer = null;
        if (this.sockets.size === 0) this.suspend();
      }, this.options.idleSuspendMs);
    }
  }

  /** Slow down a session nobody has touched for a while */
  private checkIdleView(): void {
    if (
      !this.throttled &&
      this.instance &&
      Date.now() - this.lastInputAt > IDLE_VIEW_MS
    ) {
      this.throttled = true;
      this.instance.appFramework.setTargetFPS(IDLE_FPS);
    }
  }

  /** Input: back to the full frame rate if the session had slowed down */
  private noteInput(): void {
    this.lastInputAt = Date.now();
    this.lastActiveAt = this.lastInputAt;
    if (this.throttled && this.instance) {
      this.throttled = false;
      this.instance.appFramework.setTargetFPS(this.options.fps);
    }
  }

  /** Release every key a viewer is holding (it closed or dropped) */
  private releaseKeys(ws: WebSocket): void {
    const held = this.heldKeys.get(ws);
    this.heldKeys.delete(ws);
    const instance = this.instance;
    const input = this.input;
    if (!held || !instance || !input) return;
    instance.run(() => {
      for (const key of held) input.handleKeyUp(key);
    });
  }

  private handleMessage(ws: WebSocket, raw: string): void {
    let msg: any;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (!msg || typeof msg !== "object") return;

    const instance = this.instance;
    const input = this.input;
    if (!instance || !input) return;

    switch (msg.type) {
      case "key":
        if (typeof msg.key === "string" && msg.key.length <= MAX_KEY_LENGTH) {
          this.noteInput();
          if (!this.heldKeys.has(ws)) this.heldKeys.set(ws, new Set());
          this.heldKeys.get(ws)!.add(msg.key);
          instance.run(() => input.handleKey(msg.key, msg.repeat === true));
        }
        break;

      case "keyup":
        if (typeof msg.key === "string" && msg.key.length <= MAX_KEY_LENGTH) {
          if (msg.key === "*") this.heldKeys.delete(ws);
          else this.heldKeys.get(ws)?.delete(msg.key);
          instance.run(() => input.handleKeyUp(msg.key));
        }
        break;

      case "vault:key":
        // Exactly 32 bytes of base64url; never logged
        if (typeof msg.key === "string" && /^[A-Za-z0-9_-]{43}$/.test(msg.key)) {
          const key = Buffer.from(msg.key, "base64url");
          const ok = instance.run(() => this.vault.unlock(key));
          key.fill(0);
          if (!ok) this.sendJSON(ws, { type: "vault:bad-key" });
        }
        break;

      case "text":
        if (typeof msg.text === "string") {
          this.noteInput();
          const text = msg.text.slice(0, MAX_TEXT_LENGTH);
          instance.run(() => {
            // Typed in: each character pressed and released
            for (const char of text) {
              input.handleKey(char);
              input.handleKeyUp(char);
            }
          });
        }
        break;

      default:
        if (AUDIO_INPUT_TYPES.has(msg.type) && this.audioInputCallback) {
          const callback = this.audioInputCallback;
          instance.run(() => callback(msg.type, msg));
        }
    }
  }

  private broadcastFrame(frame: Buffer): void {
    for (const ws of this.sockets) {
      if (ws.readyState !== WebSocket.OPEN) continue;
      if (ws.bufferedAmount < MAX_BUFFERED_BYTES) {
        ws.send(frame, { binary: true });
        this.lagging.delete(ws);
      } else {
        this.lagging.add(ws);
      }
    }
    this.scheduleCatchUp();
  }

  /** Send lagging viewers the latest frame as soon as they can take it */
  private scheduleCatchUp(): void {
    if (this.catchUpTimer || this.lagging.size === 0) return;
    this.catchUpTimer = setTimeout(() => {
      this.catchUpTimer = null;
      const frame = this.display?.getLastFrame();
      for (const ws of this.lagging) {
        if (ws.readyState !== WebSocket.OPEN || !this.sockets.has(ws)) {
          this.lagging.delete(ws);
        } else if (frame && ws.bufferedAmount < MAX_BUFFERED_BYTES) {
          ws.send(frame, { binary: true });
          this.lagging.delete(ws);
        }
      }
      this.scheduleCatchUp();
    }, CATCH_UP_CHECK_MS);
  }

  private broadcastJSON(message: object): void {
    for (const ws of this.sockets) {
      this.sendJSON(ws, message);
    }
  }

  private sendJSON(ws: WebSocket, message: object): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /** Delete the vault and all secrets (DELETE /sessions/:id/vault) */
  wipeVault(): void {
    this.vault.wipe();
  }

  // ===== AudioBridge =====

  sendBeep(frequency: number, duration: number, volume: number = 0.5): void {
    this.broadcastJSON({ type: "audio:beep", frequency, duration, volume });
  }

  sendSweep(
    startFreq: number,
    endFreq: number,
    duration: number,
    volume: number = 0.5
  ): void {
    this.broadcastJSON({
      type: "audio:sweep",
      startFreq,
      endFreq,
      duration,
      volume,
    });
  }

  onAudioInput(callback: (event: string, data: any) => void): void {
    this.audioInputCallback = callback;
  }

  requestAudioStart(): void {
    // Say which app wants the microphone, so the viewer can ask per app
    const app = this.instance?.activeAppId() ?? null;
    this.broadcastJSON({
      type: "audio:request-start",
      app,
      name: this.activeAppName,
    });
  }

  requestAudioStop(): void {
    this.broadcastJSON({ type: "audio:request-stop" });
  }

  // ===== Metadata =====

  private readConfig(): SessionConfig {
    try {
      return JSON.parse(
        fs.readFileSync(path.join(this.dir, "config.json"), "utf-8")
      );
    } catch {
      return { enabledApps: [] };
    }
  }

  private writeConfig(config: SessionConfig): void {
    fs.writeFileSync(path.join(this.dir, "config.json"), JSON.stringify(config));
  }

  private readMeta(): SessionMeta | null {
    try {
      return JSON.parse(
        fs.readFileSync(path.join(this.dir, "session.json"), "utf-8")
      );
    } catch {
      return null;
    }
  }

  private writeMeta(): void {
    const meta = this.readMeta();
    if (!meta) return; // Deleted
    meta.lastActiveAt = this.lastActiveAt;
    fs.writeFileSync(path.join(this.dir, "session.json"), JSON.stringify(meta));
  }

  private clearSuspendTimer(): void {
    if (this.suspendTimer) {
      clearTimeout(this.suspendTimer);
      this.suspendTimer = null;
    }
  }
}
