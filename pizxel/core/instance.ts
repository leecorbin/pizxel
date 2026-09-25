/**
 * PiZXel Instance
 *
 * One running PiZXel: app framework, launcher and apps on top of an
 * initialized DeviceManager. Local mode (start.ts) creates one; server mode
 * creates one per session, each with its own drivers and data root.
 */

import { DeviceManager } from "./device-manager";
import { AppFramework } from "./app-framework";
import {
  AppListing,
  AppScanner,
  AppScannerOptions,
  ScannedApp,
} from "./app-scanner";
import { LauncherApp } from "../apps/launcher";
import { AppStorage } from "../storage";
import {
  InstanceContext,
  getDefaultContext,
  runInContext,
} from "./instance-context";
import type { Audio } from "../audio/audio";
import { Vault, appSecrets } from "./vault";
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
  /** Frame rate cap (default: the framework's 60fps) */
  fps?: number;
  /** Name of an app to open after the launcher (e.g. the app open at suspend) */
  startApp?: string | null;
  /** Automatic standby (screensaver) after idle (default true) */
  standby?: boolean;
  /** Secrets vault; each loaded app gets its own view of it (app.secrets) */
  vault?: Vault | null;
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
  /** Ids (directory names) of the apps loaded into the launcher */
  loadedAppIds(): string[];
  /** Id (directory name) of the app in the foreground, if it's a loaded app */
  activeAppId(): string | null;
  /** Load an app and add it to the launcher (no-op if already loaded) */
  addApp(listing: AppListing): Promise<void>;
  /** Remove an app from the launcher, closing it if it's open */
  removeApp(id: string): Promise<void>;
}

export async function createInstance(
  options: InstanceOptions
): Promise<PizxelInstance> {
  const context: InstanceContext = options.dataRoot
    ? { dataRoot: options.dataRoot, audio: null, audioInput: null, appFramework: null }
    : getDefaultContext();
  context.audio = options.audio ?? null;
  context.audioInput = options.audioInput ?? null;
  context.vault = options.vault ?? null;

  const { deviceManager } = options;
  const scanner = new AppScanner(undefined, options.scanner);
  const loadedApps = new Map<string, ScannedApp>();
  let launcher: LauncherApp;

  const registerWithLauncher = async (app: ScannedApp) => {
    // Each app sees only its own secrets
    if (context.vault) {
      (app.instance as any).secrets = appSecrets(context.vault, app.id);
    }
    const color = app.config.color || [255, 255, 255];
    const category = app.config.category; // Get category from config
    await launcher.registerApp(
      app.config.name,
      app.config.icon,
      color as [number, number, number],
      app.instance,
      category
    );
    loadedApps.set(app.id, app);
    // Findable by id (e.g. standby config's "standby") before first open
    context.appFramework?.registerAppId(app.id, app.instance);
  };

  const appFramework = await runInContext(context, async () => {
    const framework = new AppFramework(deviceManager);
    if (options.fps) {
      framework.setTargetFPS(options.fps);
    }
    if (options.standby === false) {
      framework.setStandbyEnabled(false);
    }
    context.appFramework = framework;

    // Load and apply saved brightness and volume settings
    const settingsStorage = new AppStorage("settings");
    const brightnessStr = settingsStorage.get("brightness");
    if (brightnessStr && framework.setDisplayBrightness(parseInt(brightnessStr))) {
      console.log(`Display brightness set to ${brightnessStr}%`);
    }
    const volumeStr = settingsStorage.get("volume");
    if (volumeStr && context.audio) {
      context.audio.setVolume(parseInt(volumeStr) / 100);
    }

    // Create launcher
    launcher = new LauncherApp(framework);

    // Scan and load apps
    console.log("Scanning for apps...");
    const scannedApps = await scanner.scanAll();

    // Register scanned apps with launcher
    for (const app of scannedApps) {
      await registerWithLauncher(app);
    }

    console.log(`Loaded ${scannedApps.length} app(s)`);

    // Set launcher for ESC key handling
    framework.setLauncher(launcher);

    // Launch launcher (await to ensure emojis load before first render)
    await framework.switchToApp(launcher);

    // Reopen a requested app (ESC still returns to the launcher)
    const startApp = scannedApps.find((app) => app.instance.name === options.startApp);
    if (startApp) {
      launcher.selectApp(startApp.instance);
      await framework.switchToApp(startApp.instance);
    }

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
    loadedAppIds: () => [...loadedApps.keys()],
    activeAppId: () => {
      const active = appFramework.getActiveApp();
      for (const [id, app] of loadedApps) {
        if (app.instance === active) return id;
      }
      return null;
    },
    addApp: (listing) =>
      runInContext(context, async () => {
        if (loadedApps.has(listing.id)) return;
        const app = await scanner.load(listing);
        if (app) await registerWithLauncher(app);
      }),
    removeApp: (id) =>
      runInContext(context, async () => {
        const app = loadedApps.get(id);
        if (!app) return;
        loadedApps.delete(id);
        await appFramework.unregisterApp(app.instance);
        launcher.unregisterApp(app.instance);
      }),
  };
}
