/**
 * PiZXel Instance
 *
 * One running PiZXel: app framework, launcher and apps on top of an
 * initialized DeviceManager. Local mode (start.ts) creates one; server mode
 * creates one per session, each with its own drivers and data root.
 */

import { DeviceManager } from "./device-manager";
import { AppFramework } from "./app-framework";
import { AppScanner, AppScannerOptions } from "./app-scanner";
import { LauncherApp } from "../apps/launcher";
import { AppStorage } from "../storage";
import {
  InstanceContext,
  getDefaultContext,
  runInContext,
} from "./instance-context";
import type { Audio } from "../audio/audio";
import type { AudioInputDriver } from "../drivers/audio/audio-input-driver";

export interface InstanceOptions {
  /** DeviceManager with drivers already initialized */
  deviceManager: DeviceManager;
  audio?: Audio | null;
  audioInput?: AudioInputDriver | null;
  /**
   * Isolated data root for this instance. Omit for local mode, which uses
   * the process-wide default context (data/default-user).
   */
  dataRoot?: string;
  scanner?: AppScannerOptions;
}

export interface PizxelInstance {
  readonly context: InstanceContext;
  readonly appFramework: AppFramework;
  /** Start the event loop */
  start(): Promise<void>;
  /** Stop the event loop, let the active app save its state, shut down drivers */
  stop(): Promise<void>;
  /** Run code (e.g. an input callback) inside this instance's context */
  run<T>(fn: () => T): T;
}

export async function createInstance(
  options: InstanceOptions
): Promise<PizxelInstance> {
  const context: InstanceContext = options.dataRoot
    ? { dataRoot: options.dataRoot, audio: null, audioInput: null, appFramework: null }
    : getDefaultContext();
  context.audio = options.audio ?? null;
  context.audioInput = options.audioInput ?? null;

  const { deviceManager } = options;

  const appFramework = await runInContext(context, async () => {
    const framework = new AppFramework(deviceManager);
    context.appFramework = framework;

    // Load and apply saved brightness setting
    const settingsStorage = new AppStorage("settings");
    const brightnessStr = settingsStorage.get("brightness");
    if (brightnessStr) {
      const brightness = parseInt(brightnessStr);
      const display = deviceManager.getDisplay();
      if (display && typeof (display as any).setBrightness === "function") {
        (display as any).setBrightness(brightness);
        console.log(`Display brightness set to ${brightness}%`);
      }
    }

    // Create launcher
    const launcher = new LauncherApp(framework);

    // Scan and load apps
    console.log("Scanning for apps...");
    const scanner = new AppScanner(undefined, options.scanner);
    const scannedApps = await scanner.scanAll();

    // Register scanned apps with launcher
    for (const app of scannedApps) {
      const color = app.config.color || [255, 255, 255];
      const category = app.config.category; // Get category from config
      await launcher.registerApp(
        app.config.name,
        app.config.icon,
        color as [number, number, number],
        app.instance,
        category
      );
    }

    console.log(`Loaded ${scannedApps.length} app(s)`);

    // Set launcher for ESC key handling
    framework.setLauncher(launcher);

    // Launch launcher (await to ensure emojis load before first render)
    await framework.switchToApp(launcher);

    return framework;
  });

  return {
    context,
    appFramework,
    start: () => runInContext(context, () => appFramework.run()),
    stop: async () => {
      await runInContext(context, async () => {
        appFramework.stop();
        appFramework.getActiveApp()?.onDeactivate();
        await deviceManager.shutdown();
      });
    },
    run: (fn) => runInContext(context, fn),
  };
}
