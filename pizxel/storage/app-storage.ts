/**
 * AppStorage - Simple key-value persistence for apps
 *
 * Stores data in JSON files in the user's data directory:
 * data/default-user/storage/app-name.json
 */

import * as fs from "fs";
import * as path from "path";

export class AppStorage {
  private appName: string;
  private storagePath: string;
  private data: Map<string, any>;

  constructor(appName: string) {
    this.appName = appName;

    // Storage location: data/default-user/storage/
    const userDataPath = path.join(
      process.cwd(),
      "data",
      "default-user",
      "storage"
    );

    // Ensure storage directory exists
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }

    this.storagePath = path.join(userDataPath, `${appName}.json`);
    this.data = new Map();

    this.load();
  }

  /**
   * Get a value from storage
   */
  get<T = any>(key: string): T | undefined {
    return this.data.get(key);
  }

  /**
   * Set a value in storage (automatically persists)
   */
  set(key: string, value: any): void {
    this.data.set(key, value);
    this.save();
  }

  /**
   * Delete a key from storage
   */
  delete(key: string): void {
    this.data.delete(key);
    this.save();
  }

  /**
   * Check if a key exists
   */
  has(key: string): boolean {
    return this.data.has(key);
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.data.keys());
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.data.clear();
    this.save();
  }

  /**
   * Load data from disk
   */
  private load(): void {
    try {
      if (fs.existsSync(this.storagePath)) {
        const json = fs.readFileSync(this.storagePath, "utf-8");
        const obj = JSON.parse(json);
        this.data = new Map(Object.entries(obj));
      }
    } catch (error) {
      console.error(`[AppStorage:${this.appName}] Failed to load:`, error);
      this.data = new Map();
    }
  }

  /**
   * Save data to disk
   */
  private save(): void {
    try {
      const obj = Object.fromEntries(this.data);
      const json = JSON.stringify(obj, null, 2);
      fs.writeFileSync(this.storagePath, json, "utf-8");
    } catch (error) {
      console.error(`[AppStorage:${this.appName}] Failed to save:`, error);
    }
  }
}
