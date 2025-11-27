/**
 * PiZXel Entry Point
 *
 * Initialize device drivers, app framework, and launcher.
 *
 * Usage:
 *   npm start              - Run with terminal display
 *   npm run start:canvas   - Run with canvas HTTP display
 */

import { DeviceManager } from "./core/device-manager";
import { AppFramework } from "./core/app-framework";
import { AppScanner } from "./core/app-scanner";
import { TerminalDisplayDriver } from "./drivers/display/terminal-display";
import { CanvasDisplayDriver } from "./drivers/display/canvas-display-driver";
import { KeyboardInputDriver } from "./drivers/input/keyboard-input";
import { LauncherApp } from "./apps/launcher";
import { WebAudioDriver } from "./audio/web-audio-driver";
import { CanvasAudioDriver } from "./audio/canvas-audio-driver";
import { Audio } from "./audio/audio";

// Global audio instance (accessible to all apps)
let globalAudio: Audio | null = null;

export function getAudio(): Audio | null {
  return globalAudio;
}

async function main() {
  // Check for canvas mode
  const useCanvas = process.argv.includes("--canvas");

  if (useCanvas) {
    console.log(`PiZXel v0.1.0 - Canvas Mode\n`);
  } else {
    console.log(`PiZXel v0.1.0 - Terminal Mode\n`);
  }

  // Create device manager
  const deviceManager = new DeviceManager();

  // Register available drivers
  if (useCanvas) {
    // Canvas mode: Register canvas driver (higher priority)
    deviceManager.registerDisplayDriver(CanvasDisplayDriver);
  } else {
    // Terminal mode: Register terminal driver
    deviceManager.registerDisplayDriver(TerminalDisplayDriver);
  }
  deviceManager.registerInputDriver(KeyboardInputDriver);

  // Initialize devices (auto-selects best driver)
  try {
    await deviceManager.initialize();
  } catch (error) {
    console.error("Failed to initialize devices:", error);
    process.exit(1);
  }

  // Initialize audio driver (after display, so we can get canvas server)
  console.log("Initializing audio...");
  if (useCanvas) {
    const display = deviceManager.getDisplay();
    console.log(`Display driver: ${display.constructor.name}`);
    if (display instanceof CanvasDisplayDriver) {
      const server = display.getServer();
      console.log(`Canvas server obtained: ${server ? "YES" : "NO"}`);
      const audioDriver = new CanvasAudioDriver(server);
      await audioDriver.initialize();
      globalAudio = new Audio(audioDriver);
      console.log(
        `Audio: Canvas mode (browser-based) - ${
          globalAudio.isAvailable() ? "AVAILABLE" : "NOT AVAILABLE"
        }`
      );
    } else {
      console.log(
        `Display is not CanvasDisplayDriver, it's ${display.constructor.name}`
      );
    }
  } else {
    // Terminal mode: No audio for now (would need speaker package)
    console.log(
      `Audio: Not available in terminal mode (TODO: add speaker package support)`
    );
    globalAudio = null;
  }

  // If canvas mode, setup keyboard forwarding from browser
  if (useCanvas) {
    const display = deviceManager.getDisplay();
    if (display instanceof CanvasDisplayDriver) {
      const inputDriver = deviceManager.getInput();
      display.getServer().onKey((key: string) => {
        // Forward keyboard events from browser to input driver
        (inputDriver as any).injectKey(key);
      });
    }
  }

  // Create app framework with app registry
  const appFramework = new AppFramework(deviceManager);

  // Create launcher
  const launcher = new LauncherApp(appFramework);

  // Scan and load apps
  console.log("Scanning for apps...");
  const scanner = new AppScanner();
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
  appFramework.setLauncher(launcher);

  // Launch launcher (await to ensure emojis load before first render)
  await appFramework.switchToApp(launcher);
  console.log("=== PiZXel OS Launched ===");
  console.log("Controls:");
  console.log("  Arrow keys: Navigate launcher");
  console.log("  Enter/Space: Launch app");
  console.log("  ESC: Return to launcher / Exit");
  if (useCanvas) {
    console.log(`  Browser: http://localhost:3001`);
  }
  console.log();

  // Cleanup on exit
  const cleanup = async () => {
    console.log("\nShutting down...");
    await deviceManager.shutdown();
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  // Start event loop
  await appFramework.run();
}

main().catch(console.error);
