/**
 * Vault
 *
 * Encrypted storage for apps' secrets (API keys). Each record is
 * AES-256-GCM under the vault key (VK), with the app id and secret name as
 * associated data, so a record can't be moved to another app or name.
 *
 * VK is never stored here: it's held in memory while the vault is unlocked.
 * On pizxel.uk the browser unwraps VK and sends it over the session's
 * WebSocket; locally it comes from a key file only the user can read.
 * A verifier record (a fixed marker under VK) detects a wrong key.
 *
 * Files: <dir>/vault.json, holding the verifier and the records. There's no
 * plaintext secret on disk.
 *
 * See docs/session-api.md (Vault) and the design in the infrastructure
 * handoff "pizxel-vault-and-egress".
 */

import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

export type VaultState = "none" | "locked" | "unlocked";

interface Sealed {
  iv: string; // base64
  tag: string; // base64
  data: string; // base64
}

interface VaultFile {
  version: 1;
  verifier: Sealed;
  records: Record<string, Record<string, Sealed>>; // app id -> name -> sealed
}

const KEY_BYTES = 32;
const MARKER = "pizxel-vault-v1";

export class Vault {
  private file: string;
  private key: Buffer | null = null;
  private unlockListeners: Set<() => void> = new Set();
  /**
   * Secrets saved while locked (or before the vault existed), completed when
   * it unlocks. Memory only; dropped if the vault locks or is wiped first.
   */
  private pending: Map<string, { app: string; name: string; value: string }> =
    new Map();

  /**
   * Called when an app needs the vault while it's locked ("need") or
   * doesn't exist yet ("setup"), so the viewer can unlock or set it up
   */
  onRequest: ((kind: "setup" | "need", app: string, name: string) => void) | null =
    null;
  /** Called when the state changes */
  onStateChange: ((state: VaultState) => void) | null = null;

  constructor(dir: string) {
    this.file = path.join(dir, "vault.json");
  }

  state(): VaultState {
    if (this.key) return "unlocked";
    return fs.existsSync(this.file) ? "locked" : "none";
  }

  /**
   * Unlock with VK (32 bytes). With no vault yet, this creates it. Returns
   * false for a key that doesn't match the vault (it isn't kept).
   */
  unlock(key: Buffer): boolean {
    if (key.length !== KEY_BYTES) return false;
    const file = this.read();

    if (!file) {
      // First key: create the vault with a verifier
      this.write({
        version: 1,
        verifier: Vault.seal(key, "verifier", "", MARKER),
        records: {},
      });
    } else if (Vault.open(key, "verifier", "", file.verifier) !== MARKER) {
      return false;
    }

    this.key = Buffer.from(key); // Our own copy

    // Complete saves that were waiting for the vault
    if (this.pending.size > 0) {
      const current = this.read()!;
      for (const { app, name, value } of this.pending.values()) {
        (current.records[app] ??= {})[name] = Vault.seal(this.key, app, name, value);
      }
      this.pending.clear();
      this.write(current);
    }

    this.onStateChange?.("unlocked");
    for (const listener of this.unlockListeners) {
      try {
        listener();
      } catch (error) {
        console.error("[Vault] Unlock listener failed:", error);
      }
    }
    return true;
  }

  /** Forget VK (session suspended, last viewer gone) */
  lock(): void {
    this.pending.clear();
    if (!this.key) return;
    this.key.fill(0);
    this.key = null;
    this.onStateChange?.(this.state());
  }

  /** Delete the vault and every secret in it (e.g. after a vault reset) */
  wipe(): void {
    this.pending.clear();
    if (this.key) {
      this.key.fill(0);
      this.key = null;
    }
    fs.rmSync(this.file, { force: true });
    this.onStateChange?.("none");
  }

  onUnlock(listener: () => void): () => void {
    this.unlockListeners.add(listener);
    return () => this.unlockListeners.delete(listener);
  }

  /** A secret, or null if it isn't set or the vault is locked */
  get(app: string, name: string): string | null {
    if (!this.key) {
      if (this.state() !== "none") this.onRequest?.("need", app, name);
      return null;
    }
    const sealed = this.read()?.records[app]?.[name];
    if (!sealed) return null;
    return Vault.open(this.key, app, name, sealed);
  }

  /**
   * Store a secret. Returns false if the vault isn't unlocked: the save then
   * waits (in memory) and completes when it unlocks, and the viewer is asked
   * to unlock or set up the vault.
   */
  set(app: string, name: string, value: string): boolean {
    if (!name) throw new Error("Secret names can't be empty");
    if (!this.key) {
      this.pending.set(`${app}\0${name}`, { app, name, value });
      this.onRequest?.(this.state() === "none" ? "setup" : "need", app, name);
      return false;
    }
    const file = this.read()!;
    (file.records[app] ??= {})[name] = Vault.seal(this.key, app, name, value);
    this.write(file);
    return true;
  }

  /** Delete a secret (works while locked: only a name is needed) */
  delete(app: string, name: string): void {
    this.pending.delete(`${app}\0${name}`);
    const file = this.read();
    if (!file?.records[app]?.[name]) return;
    delete file.records[app][name];
    if (Object.keys(file.records[app]).length === 0) delete file.records[app];
    this.write(file);
  }

  /** The names stored per app (never values; works while locked) */
  list(): Array<{ app: string; names: string[] }> {
    const records = this.read()?.records ?? {};
    return Object.keys(records)
      .sort()
      .map((app) => ({ app, names: Object.keys(records[app]).sort() }));
  }

  // ===== Crypto and files =====

  private static aad(app: string, name: string): Buffer {
    return Buffer.from(`${MARKER}\0${app}\0${name}`, "utf-8");
  }

  private static seal(key: Buffer, app: string, name: string, value: string): Sealed {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    cipher.setAAD(Vault.aad(app, name));
    const data = Buffer.concat([cipher.update(value, "utf-8"), cipher.final()]);
    return {
      iv: iv.toString("base64"),
      tag: cipher.getAuthTag().toString("base64"),
      data: data.toString("base64"),
    };
  }

  /** Decrypt, or null if the key, app or name don't match */
  private static open(key: Buffer, app: string, name: string, sealed: Sealed): string | null {
    try {
      const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        key,
        Buffer.from(sealed.iv, "base64")
      );
      decipher.setAAD(Vault.aad(app, name));
      decipher.setAuthTag(Buffer.from(sealed.tag, "base64"));
      return Buffer.concat([
        decipher.update(Buffer.from(sealed.data, "base64")),
        decipher.final(),
      ]).toString("utf-8");
    } catch {
      return null;
    }
  }

  private read(): VaultFile | null {
    try {
      return JSON.parse(fs.readFileSync(this.file, "utf-8"));
    } catch {
      return null;
    }
  }

  /** Write atomically (a crash mid-write can't corrupt the vault) */
  private write(file: VaultFile): void {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(file), { mode: 0o600 });
    fs.renameSync(tmp, this.file);
  }
}

/**
 * An app's view of the vault: only its own secrets
 */
export interface AppSecrets {
  /** The secret, or null if unset or the vault is locked */
  get(name: string): string | null;
  /**
   * Store it. False if the vault isn't unlocked yet: the save completes when
   * it unlocks (the viewer is asked to unlock or set it up)
   */
  set(name: string, value: string): boolean;
  delete(name: string): void;
  isUnlocked(): boolean;
  /** Run when the vault unlocks (e.g. to move old plaintext keys in) */
  onUnlock(listener: () => void): () => void;
}

export function appSecrets(vault: Vault, appId: string): AppSecrets {
  return {
    get: (name) => vault.get(appId, name),
    set: (name, value) => vault.set(appId, name, value),
    delete: (name) => vault.delete(appId, name),
    isUnlocked: () => vault.state() === "unlocked",
    onUnlock: (listener) => vault.onUnlock(listener),
  };
}

/**
 * Local modes: VK from a key file only the user can read (created on first
 * use), like an SSH key. Default ~/.config/pizxel/vault.key, or
 * PIZXEL_VAULT_KEY_FILE.
 */
export function localVaultKey(): Buffer {
  const file =
    process.env.PIZXEL_VAULT_KEY_FILE ||
    path.join(process.env.HOME || ".", ".config", "pizxel", "vault.key");
  if (fs.existsSync(file)) {
    // Never replace an existing key file: that would lose every secret
    const key = Buffer.from(fs.readFileSync(file, "utf-8").trim(), "base64url");
    if (key.length !== KEY_BYTES) {
      throw new Error(`Vault key file ${file} is damaged (expected ${KEY_BYTES} bytes)`);
    }
    return key;
  }
  const key = crypto.randomBytes(KEY_BYTES);
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  fs.writeFileSync(file, key.toString("base64url") + "\n", { mode: 0o600 });
  return key;
}
