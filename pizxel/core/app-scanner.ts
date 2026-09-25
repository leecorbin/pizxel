/**
 * App Scanner
 *
 * Scans directories for apps with config.json files and dynamically loads them.
 * Supports both built-in apps (pizxel/apps/) and user apps (data/default-user/apps/).
 */

import * as fs from "fs";
import * as path from "path";
import { App } from "../types";

export interface AppConfig {
  name: string;
  version: string;
  description: string;
  author?: string;
  icon: string; // Emoji character
  main: string; // Module name or class name (e.g., "clock" or "ClockApp")
  color?: [number, number, number]; // Optional theme color
  category?: string; // Optional category (e.g., "game", "utility", "media")
}

export interface ScannedApp {
  config: AppConfig;
  instance: App;
  path: string;
}

export interface AppScannerOptions {
  /**
   * Directory of user apps. Defaults to data/default-user/apps under the
   * project root; null disables user apps (server mode).
   */
  userAppsPath?: string | null;
}

export class AppScanner {
  private systemAppsPath: string;
  private userAppsPath: string | null;

  constructor(
    projectRoot: string = process.cwd(),
    options: AppScannerOptions = {}
  ) {
    this.systemAppsPath = path.join(projectRoot, "pizxel", "apps");
    this.userAppsPath =
      options.userAppsPath === undefined
        ? path.join(projectRoot, "data", "default-user", "apps")
        : options.userAppsPath;
  }

  /**
   * Scan both system and user app directories
   */
  async scanAll(): Promise<ScannedApp[]> {
    const apps: ScannedApp[] = [];

    // Scan system apps
    if (fs.existsSync(this.systemAppsPath)) {
      const systemApps = await this.scanDirectory(this.systemAppsPath);
      apps.push(...systemApps);
    }

    // Scan user apps
    if (this.userAppsPath && fs.existsSync(this.userAppsPath)) {
      const userApps = await this.scanDirectory(this.userAppsPath);
      apps.push(...userApps);
    }

    return apps;
  }

  /**
   * Scan a directory for app folders with config.json
   */
  private async scanDirectory(dirPath: string): Promise<ScannedApp[]> {
    const apps: ScannedApp[] = [];

    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const appPath = path.join(dirPath, entry.name);
        const configPath = path.join(appPath, "config.json");

        // Skip if no config.json
        if (!fs.existsSync(configPath)) continue;

        try {
          // Load and parse config
          const configData = fs.readFileSync(configPath, "utf-8");
          const config: AppConfig = JSON.parse(configData);

          // Validate required fields
          if (!config.name || !config.icon || !config.main) {
            console.warn(
              `[AppScanner] Invalid config in ${appPath}: missing required fields`
            );
            continue;
          }

          // Load app module
          const appInstance = await this.loadApp(appPath, config);
          if (!appInstance) continue;

          apps.push({
            config,
            instance: appInstance,
            path: appPath,
          });

          console.log(`[AppScanner] Loaded: ${config.name} (${config.icon})`);
        } catch (error) {
          console.error(`[AppScanner] Failed to load ${appPath}:`, error);
        }
      }
    } catch (error) {
      console.error(`[AppScanner] Failed to scan ${dirPath}:`, error);
    }

    return apps;
  }

  /**
   * Dynamically load and instantiate an app
   */
  private async loadApp(
    appPath: string,
    config: AppConfig
  ): Promise<App | null> {
    try {
      // Resolve main file (support both .ts and .js)
      let mainFile = config.main;
      if (!mainFile.endsWith(".ts") && !mainFile.endsWith(".js")) {
        mainFile = `${mainFile}.ts`; // Default to .ts
      }

      const mainPath = path.join(appPath, mainFile);

      // Check if file exists
      if (!fs.existsSync(mainPath)) {
        console.warn(`[AppScanner] Main file not found: ${mainPath}`);
        return null;
      }

      // Dynamic import (works with tsx)
      const module = await import(mainPath);

      // Try to find app class (common patterns)
      let AppClass = null;

      // Pattern 1: Named export matching config.main or capitalized name
      const className = config.main.replace(/\.ts$/, "").replace(/\.js$/, "");
      const capitalizedName =
        className.charAt(0).toUpperCase() + className.slice(1);

      if (module[className]) {
        AppClass = module[className];
      } else if (module[capitalizedName]) {
        AppClass = module[capitalizedName];
      } else if (module[`${capitalizedName}App`]) {
        AppClass = module[`${capitalizedName}App`];
      } else if (module.default) {
        AppClass = module.default;
      } else {
        // Try to find any class that looks like an App
        const exportNames = Object.keys(module);
        for (const name of exportNames) {
          if (
            name.endsWith("App") ||
            (typeof module[name] === "function" &&
              module[name].prototype &&
              "render" in module[name].prototype)
          ) {
            AppClass = module[name];
            break;
          }
        }
      }

      if (!AppClass) {
        console.warn(`[AppScanner] Could not find app class in ${mainPath}`);
        return null;
      }

      // Instantiate the app
      const appInstance = new AppClass();

      // Verify it implements the App interface
      if (!appInstance.render || !appInstance.onEvent) {
        console.warn(
          `[AppScanner] ${config.name} does not implement App interface`
        );
        return null;
      }

      return appInstance;
    } catch (error) {
      console.error(`[AppScanner] Failed to load app from ${appPath}:`, error);
      return null;
    }
  }
}
