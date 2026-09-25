/**
 * Session Manager
 *
 * Creates, finds, resumes and deletes sessions. Sessions live on disk under
 * <dataRoot>/sessions/<id>/; at most `maxLiveSessions` run at once.
 */

import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { AppScanner } from "../core/app-scanner";
import { Session } from "./session";

export interface ServerConfig {
  dataRoot: string;
  maxLiveSessions: number;
  fps: number;
  idleSuspendMs: number;
  extraAppsDir: string | null;
  /** Load "private" tier apps (only for a private instance) */
  includePrivateApps: boolean;
}

export interface CatalogEntry {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string | null;
  tier: "core" | "optional" | "private";
}

/** Session ids: 16 random bytes, base64url (22 characters) */
const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{22}$/;

export class SessionManager {
  private config: ServerConfig;
  private sessionsDir: string;
  private sessions: Map<string, Session> = new Map();
  /** Sessions being resumed right now (they hold a live slot already) */
  private resuming: Set<Session> = new Set();
  /** Live sessions being suspended to make room (each frees one slot) */
  private evicting: Set<Session> = new Set();

  constructor(config: ServerConfig) {
    this.config = config;
    this.sessionsDir = path.join(config.dataRoot, "sessions");
    fs.mkdirSync(this.sessionsDir, { recursive: true });
  }

  static isValidId(id: string): boolean {
    return SESSION_ID_PATTERN.test(id);
  }

  get maxLiveSessions(): number {
    return this.config.maxLiveSessions;
  }

  liveCount(): number {
    let count = 0;
    for (const session of this.sessions.values()) {
      // Being evicted still counts until it's suspended, but it's already
      // spoken for: don't count it twice against a new session
      if (this.evicting.has(session)) continue;
      if (session.state === "live" || this.resuming.has(session)) count++;
    }
    return count;
  }

  /**
   * Create a new (suspended) session
   */
  create(): Session {
    const id = crypto.randomBytes(16).toString("base64url");
    const dir = path.join(this.sessionsDir, id);
    Session.initialize(dir);
    const session = this.makeSession(id, dir);
    this.sessions.set(id, session);
    console.log(`[SessionManager] Created session ${id}`);
    return session;
  }

  /**
   * Find a session (in memory, or on disk from an earlier run)
   */
  get(id: string): Session | null {
    if (!SessionManager.isValidId(id)) return null;

    const known = this.sessions.get(id);
    if (known) return known;

    const dir = path.join(this.sessionsDir, id);
    if (!fs.existsSync(path.join(dir, "session.json"))) return null;

    const session = this.makeSession(id, dir);
    this.sessions.set(id, session);
    return session;
  }

  /**
   * Make a session live, if there's room. When full, suspends the session
   * that has had no viewers for longest to make room; returns false if every
   * live session has viewers.
   */
  async acquire(session: Session): Promise<boolean> {
    if (session.state === "live" || this.resuming.has(session)) {
      await session.resume(); // Waits for a resume already under way
      return true;
    }

    // Claim a slot before any await, so simultaneous connects can't all see
    // a free slot and exceed the limit
    let evict: Session | undefined;
    if (this.liveCount() >= this.config.maxLiveSessions) {
      evict = [...this.sessions.values()]
        .filter(
          (s) =>
            s.state === "live" &&
            !this.resuming.has(s) &&
            !this.evicting.has(s) &&
            s.viewerCount === 0
        )
        .sort((a, b) => a.lastActiveAt - b.lastActiveAt)[0];
      if (!evict) return false;
    }
    this.resuming.add(session);
    if (evict) this.evicting.add(evict);

    try {
      if (evict) await evict.suspend();
      await session.resume();
      return true;
    } finally {
      this.resuming.delete(session);
      if (evict) this.evicting.delete(evict);
    }
  }

  /**
   * Delete a session and its data (idempotent)
   */
  async delete(id: string): Promise<void> {
    if (!SessionManager.isValidId(id)) return;

    const session = this.get(id);
    if (session) {
      session.closeAll(4410, "Session deleted");
      await session.suspend();
      this.sessions.delete(id);
    }
    fs.rmSync(path.join(this.sessionsDir, id), { recursive: true, force: true });
    console.log(`[SessionManager] Deleted session ${id}`);
  }

  /**
   * Apps visitors can have: core (always on) and optional (switch on per
   * session), plus private apps on a private instance
   */
  catalog(): CatalogEntry[] {
    const scanner = new AppScanner(undefined, {
      userAppsPath: this.config.extraAppsDir,
    });
    return scanner
      .listApps()
      .filter(
        ({ config }) =>
          config.tier !== "private" || this.config.includePrivateApps
      )
      .map(({ id, config }) => ({
        id,
        name: config.name,
        description: config.description ?? "",
        icon: config.icon,
        category: config.category ?? null,
        tier: config.tier ?? "core",
      }));
  }

  /**
   * Suspend everything (saving state) and close all viewers
   */
  async shutdown(): Promise<void> {
    const sessions = [...this.sessions.values()];
    for (const session of sessions) {
      session.closeAll(1001, "Engine shutting down");
    }
    await Promise.all(sessions.map((session) => session.suspend()));
  }

  private makeSession(id: string, dir: string): Session {
    return new Session(id, dir, {
      fps: this.config.fps,
      idleSuspendMs: this.config.idleSuspendMs,
      extraAppsDir: this.config.extraAppsDir,
      includePrivateApps: this.config.includePrivateApps,
    });
  }
}
