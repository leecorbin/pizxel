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
import { TerminalDisplayDriver } from "./drivers/display/terminal-display";
import { CanvasDisplayDriver } from "./drivers/display/canvas-display-driver";
import { KeyboardInputDriver } from "./drivers/input/keyboard-input";
import { LauncherApp } from "./apps/launcher";
import { TestApp } from "./apps/test-app";
import { ClockApp } from "./apps/clock";

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

  // Create apps
  const clockApp = new ClockApp();
  const testApp = new TestApp();

  // Create launcher and register apps
  const launcher = new LauncherApp(appFramework);
  launcher.registerApp("Clock", "⏰", [255, 255, 0], clockApp);
  launcher.registerApp("Test", "🎮", [0, 255, 0], testApp);

  // Set launcher for ESC key handling
  appFramework.setLauncher(launcher);

  // Launch launcher
  appFramework.switchToApp(launcher);
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
