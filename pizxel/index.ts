/**
 * PiZXel Entry Point
 *
 * Initialize device drivers, app framework, and test app.
 */

import { DeviceManager } from "./core/device-manager";
import { AppFramework } from "./core/app-framework";
import { TerminalDisplayDriver } from "./drivers/display/terminal-display";
import { KeyboardInputDriver } from "./drivers/input/keyboard-input";
import { TestApp } from "./apps/test-app";

async function main() {
  console.log("PiZXel v0.1.0 - Initializing...\n");

  // Create device manager
  const deviceManager = new DeviceManager();

  // Register available drivers
  deviceManager.registerDisplayDriver(TerminalDisplayDriver);
  deviceManager.registerInputDriver(KeyboardInputDriver);

  // Initialize devices
  try {
    await deviceManager.initialize();
  } catch (error) {
    console.error("Failed to initialize devices:", error);
    process.exit(1);
  }

  // Create app framework
  const appFramework = new AppFramework(deviceManager);

  // Create and launch test app
  const testApp = new TestApp();
  appFramework.switchToApp(testApp);

  console.log("\n=== Test App Launched ===");
  console.log("Controls:");
  console.log("  Arrow keys / WASD: Move rectangle");
  console.log("  Space: Change color");
  console.log("  ESC: Exit\n");

  // Start event loop
  await appFramework.run();
}

main().catch(console.error);
