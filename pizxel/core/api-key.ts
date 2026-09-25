/**
 * API key helper for apps
 *
 * An app's API key lives in the vault (encrypted, only this app's; see
 * core/vault.ts). Keys saved before the vault existed, in the app's plain
 * storage, move into the vault the first time it's unlocked and the plain
 * copy is deleted. An operator key from the environment is the fallback.
 *
 *   private key = new ApiKey(this, this.storage, "NEWSAPI_KEY");
 *   onActivate() { this.key.migrate(); ... this.key.get() ... }
 *
 * Never log a key, or any part of one.
 */

import type { App } from "../types";

/** The parts of an app's storage this needs (either AppStorage fits) */
interface KeyStorage {
  get(key: string, defaultValue?: any): any;
  set(key: string, value: any): void;
  delete(key: string): void;
}

/** "pending": saved as soon as the vault unlocks (the viewer is asked to) */
export type SaveResult = "saved" | "pending";

export class ApiKey {
  private migrationHooked = false;

  constructor(
    private app: App,
    private storage: KeyStorage,
    private envVar: string,
    private name: string = "apiKey"
  ) {}

  /**
   * Move a plaintext key from the app's storage into the vault, now if it's
   * unlocked, or when it next unlocks
   */
  migrate(): void {
    const secrets = this.app.secrets;
    if (!secrets) return;
    if (!this.migrationHooked) {
      this.migrationHooked = true;
      secrets.onUnlock(() => this.migrate());
    }
    const plain = this.storage.get(this.name, "");
    if (plain && secrets.isUnlocked() && secrets.set(this.name, plain)) {
      this.storage.delete(this.name);
    }
  }

  /** The key: the person's own (vault), else an operator key (env), else "" */
  get(): string {
    const secrets = this.app.secrets;
    const own = secrets
      ? secrets.get(this.name) ?? ""
      : this.storage.get(this.name, ""); // No vault (e.g. tests): plain storage
    return own || process.env[this.envVar] || "";
  }

  /** Whether the person has saved a key of their own */
  hasOwn(): boolean {
    const secrets = this.app.secrets;
    return secrets ? secrets.isUnlocked() && !!secrets.get(this.name) : !!this.storage.get(this.name, "");
  }

  /** Save (or, with "", delete) the person's key */
  save(value: string): SaveResult {
    const secrets = this.app.secrets;
    if (!secrets) {
      if (value) this.storage.set(this.name, value);
      else this.storage.delete(this.name);
      return "saved";
    }
    if (!value) {
      secrets.delete(this.name);
      return "saved";
    }
    // Locked or no vault yet: it's saved on unlock (the viewer is asked to
    // unlock or set it up)
    return secrets.set(this.name, value) ? "saved" : "pending";
  }
}
