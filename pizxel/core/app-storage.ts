/**
 * App Storage System
 *
 * Provides simple key-value storage for apps using filesystem.
 * Each app gets its own data directory.
 */

import * as fs from "fs";
import * as path from "path";
import { getInstanceContext } from "./instance-context";

export class AppStorage {
  private dataDir: string;

  constructor(appName: string) {
    // Store in <data root>/app-data/<app-name>/ (default: data/default-user)
    this.dataDir = path.join(
      getInstanceContext().dataRoot,
      "app-data",
      appName.toLowerCase().replace(/\s+/g, "-")
    );

    // Ensure directory exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * Get a value from storage
   */
  get(key: string, defaultValue: any = null): any {
    try {
      const filePath = path.join(this.dataDir, `${key}.json`);
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(data);
      }
    } catch (err) {
      console.error(`[AppStorage] Failed to read ${key}:`, err);
    }
    return defaultValue;
  }

  /**
   * Set a value in storage
   */
  set(key: string, value: any): void {
    try {
      const filePath = path.join(this.dataDir, `${key}.json`);
      fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf-8");
    } catch (err) {
      console.error(`[AppStorage] Failed to write ${key}:`, err);
    }
  }

  /**
   * Check if a key exists
   */
  has(key: string): boolean {
    const filePath = path.join(this.dataDir, `${key}.json`);
    return fs.existsSync(filePath);
  }

  /**
   * Delete a key
   */
  delete(key: string): void {
    try {
      const filePath = path.join(this.dataDir, `${key}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error(`[AppStorage] Failed to delete ${key}:`, err);
    }
  }

  /**
   * Clear all stored data for this app
   */
  clear(): void {
    try {
      if (fs.existsSync(this.dataDir)) {
        const files = fs.readdirSync(this.dataDir);
        for (const file of files) {
          fs.unlinkSync(path.join(this.dataDir, file));
        }
      }
    } catch (err) {
      console.error(`[AppStorage] Failed to clear storage:`, err);
    }
  }
}
