/**
 * PiZXel Entry Point
 *
 * Initialize device drivers, app framework, and launcher.
 *
 * Usage:
 *   npm start              - Auto-detect best display (framebuffer → canvas → terminal)
 *   npm start -- --canvas  - Force canvas HTTP display
 *   npm start -- --fb      - Force framebuffer display
 *   npm start -- --term    - Force terminal display
 */

import { DeviceManager } from "./core/device-manager";
import { createInstance } from "./core/instance";
import { getDefaultContext } from "./core/instance-context";
import { Vault, localVaultKey } from "./core/vault";
import * as path from "path";
import { TerminalDisplayDriver } from "./drivers/display/terminal-display";
import { CanvasDisplayDriver } from "./drivers/display/canvas-display-driver";
import { FramebufferDisplayDriver } from "./drivers/display/framebuffer-display";
import { KeyboardInputDriver } from "./drivers/input/keyboard-input";
import { WebAudioOutputDriver } from "./drivers/audio/web-audio-output-driver";
import { CanvasAudioOutputDriver } from "./drivers/audio/canvas-audio-output-driver";
import { CanvasAudioInputProxy } from "./drivers/audio/canvas-audio-input-proxy";
import { Audio } from "./audio/audio";
import type { AudioInputDriver } from "./drivers/audio/audio-input-driver";

// Global accessors (now per-instance; re-exported here for existing imports)
export {
  getAudio,
  getAudioInput,
  getAppFramework,
} from "./core/instance-context";

async function main() {
  console.log(`PiZXel v0.1.0\n`);

  // Parse display mode flags
  const forceCanvas = process.argv.includes("--canvas");
  const forceFramebuffer = process.argv.includes("--fb");
  const forceTerminal = process.argv.includes("--term");

  // Create device manager
  const deviceManager = new DeviceManager();

  // Register display drivers based on mode
  if (forceTerminal) {
    // Force terminal mode
    console.log("Display mode: Terminal (forced)\n");
    deviceManager.registerDisplayDriver(TerminalDisplayDriver);
  } else if (forceCanvas) {
    // Force canvas mode
    console.log("Display mode: Canvas (forced)\n");
    deviceManager.registerDisplayDriver(CanvasDisplayDriver);
  } else if (forceFramebuffer) {
    // Force framebuffer mode
    console.log("Display mode: Framebuffer (forced)\n");
    deviceManager.registerDisplayDriver(FramebufferDisplayDriver);
  } else {
    // Auto-detect: Register all drivers, DeviceManager selects by priority
    console.log(
      "Display mode: Auto-detect (priority: framebuffer → canvas → terminal)\n"
    );
    deviceManager.registerDisplayDriver(FramebufferDisplayDriver); // Priority 90
    deviceManager.registerDisplayDriver(CanvasDisplayDriver); // Priority 80
    deviceManager.registerDisplayDriver(TerminalDisplayDriver); // Priority 50
  }

  deviceManager.registerInputDriver(KeyboardInputDriver);

  // Initialize devices (auto-selects best available driver)
  try {
    await deviceManager.initialize();
  } catch (error) {
    console.error("Failed to initialize devices:", error);
    process.exit(1);
  }

  // Detect which display driver was selected
  const display = deviceManager.getDisplay();
  const useCanvas = display instanceof CanvasDisplayDriver;
  console.log(`Selected display driver: ${display.name}\n`);

  // Initialize audio driver (after display, so we can get canvas server)
  console.log("Initializing audio...");
  let audio: Audio | null = null;
  let audioInput: AudioInputDriver | null = null;
  if (useCanvas) {
    const server = display.getServer();
    console.log(`Canvas server obtained: ${server ? "YES" : "NO"}`);

    // Initialize audio output driver
    const audioDriver = new CanvasAudioOutputDriver(server);
    await audioDriver.initialize();
    audio = new Audio(audioDriver);
    console.log(
      `Audio Output: Canvas mode (browser-based) - ${
        audio.isAvailable() ? "AVAILABLE" : "NOT AVAILABLE"
      }`
    );

    // Initialize audio input driver (microphone via browser proxy)
    const audioInputDriver = new CanvasAudioInputProxy(server);
    await audioInputDriver.initialize();
    audioInput = audioInputDriver;
    console.log(
      `Audio Input: Canvas mode (browser microphone) - ${
        audioInput.isAvailable() ? "AVAILABLE" : "NOT AVAILABLE"
      }`
    );
  } else {
    // Terminal/Framebuffer mode: No audio for now (would need speaker package)
    console.log(
      `Audio: Not available in terminal/framebuffer mode (TODO: add speaker package support)`
    );
    audio = null;
  }

  // If canvas mode, setup keyboard forwarding from browser
  if (useCanvas) {
    const inputDriver = deviceManager.getInput();
    display.getServer().onKey((key, type, repeat) => {
      // Forward keyboard events (and releases) from browser to input driver
      (inputDriver as KeyboardInputDriver).injectKeyEvent(key, type, repeat);
    });
  }

  // Secrets vault, unlocked with the local key file (~/.config/pizxel)
  let vault: Vault | null = null;
  try {
    vault = new Vault(path.join(getDefaultContext().dataRoot, "vault"));
    if (!vault.unlock(localVaultKey())) {
      console.error("Vault: the local key file doesn't match this vault; secrets unavailable");
    }
  } catch (error) {
    console.error("Vault unavailable:", (error as Error).message);
    vault = null;
  }

  // Create the PiZXel instance (framework, launcher, apps)
  const instance = await createInstance({
    deviceManager,
    audio,
    audioInput,
    vault,
  });

  console.log("=== PiZXel OS Launched ===");
  console.log("Controls:");
  console.log("  Arrow keys: Navigate launcher");
  console.log("  Enter/Space: Launch app");
  console.log("  ESC: Return to launcher / Exit");
  if (useCanvas) {
    console.log(
      `  Browser: http://localhost:${process.env.CANVAS_PORT || "3001"}`
    );
  }
  console.log();

  // Cleanup on exit
  const cleanup = async () => {
    console.log("\nShutting down...");
    await instance.stop();
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  // Start event loop
  await instance.start();
}

// Only run when executed directly (not when imported for its re-exports)
if (require.main === module) {
  main().catch(console.error);
}
