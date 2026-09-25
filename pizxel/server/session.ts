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
import type { AppListing } from "../core/app-scanner";
import { SessionDisplayDriver, SessionInputDriver } from "./session-drivers";

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
/** Skip frames to a socket that has this much unsent data (slow viewer) */
const MAX_BUFFERED_BYTES = 1024 * 1024;

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
   * Optional apps enabled for this session (applied on the next resume)
   */
  getEnabledApps(): string[] {
    const enabledApps = this.readConfig().enabledApps;
    return Array.isArray(enabledApps) ? enabledApps : [];
  }

  setEnabledApps(enabledApps: string[]): void {
    this.writeConfig({ ...this.readConfig(), enabledApps });
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
    });
    await instance.start();

    this.display = display;
    this.input = input;
    this.instance = instance;
    this.state = "live";
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
    }

    ws.on("message", (data, isBinary) => {
      if (!isBinary) this.handleMessage(data.toString());
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
    this.lastActiveAt = Date.now();
    this.writeMeta();

    if (this.sockets.size === 0 && this.state === "live") {
      this.suspendTimer = setTimeout(() => {
        this.suspendTimer = null;
        if (this.sockets.size === 0) this.suspend();
      }, this.options.idleSuspendMs);
    }
  }

  private handleMessage(raw: string): void {
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
          this.lastActiveAt = Date.now();
          instance.run(() => input.handleKey(msg.key));
        }
        break;

      case "text":
        if (typeof msg.text === "string") {
          this.lastActiveAt = Date.now();
          const text = msg.text.slice(0, MAX_TEXT_LENGTH);
          instance.run(() => {
            for (const char of text) input.handleKey(char);
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
      if (
        ws.readyState === WebSocket.OPEN &&
        ws.bufferedAmount < MAX_BUFFERED_BYTES
      ) {
        ws.send(frame, { binary: true });
      }
    }
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
    this.broadcastJSON({ type: "audio:request-start" });
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
