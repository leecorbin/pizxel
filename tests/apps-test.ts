/**
 * Apps Smoke Test
 *
 * Opens every bundled app, plus any local user apps in
 * data/default-user/apps (e.g. Lee's private apps), presses a spread of keys,
 * and checks that each stays open (no crash) and draws something of its own.
 *
 * Run: npx tsx tests/apps-test.ts
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { DeviceManager } from "../pizxel/core/device-manager";
import { createInstance } from "../pizxel/core/instance";
import { setNetworkAllowed } from "../pizxel/core/network";
import { DisplayDriver, InputDriver } from "../pizxel/drivers/base/device-driver";

class TestDisplayDriver extends DisplayDriver {
  readonly priority = 0;
  readonly name = "Test Display";
  checksum = 0;

  async initialize(): Promise<void> {}
  async shutdown(): Promise<void> {}
  async isAvailable(): Promise<boolean> {
    return true;
  }

  show(): void {
    let sum = 0;
    for (const row of this.buffer) {
      for (const [r, g, b] of row) {
        sum = (sum * 31 + r * 65536 + g * 256 + b) % 2147483647;
      }
    }
    this.checksum = sum;
  }
}

class TestInputDriver extends InputDriver {
  readonly priority = 0;
  readonly name = "Test Input";

  async initialize(): Promise<void> {}
  async shutdown(): Promise<void> {}
  async isAvailable(): Promise<boolean> {
    return true;
  }

  press(key: string): void {
    this.emitEvent({ key, type: "keydown", timestamp: Date.now() });
  }
}

const KEYS = ["ArrowRight", "ArrowDown", " ", "Enter", "ArrowLeft", "ArrowUp", "a", "p", " ", "Tab", "Tab"];

// Apps that crash on purpose
const SKIP = new Set(["Crash Test"]);

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  // As on the server: no network
  setNetworkAllowed(false);

  const display = new TestDisplayDriver();
  const input = new TestInputDriver();
  const deviceManager = new DeviceManager();
  deviceManager.useDrivers(display, input);
  await deviceManager.initialize();

  const dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pizxel-apps-test-"));
  const instance = await createInstance({
    deviceManager,
    dataRoot,
    scanner: {}, // Bundled apps and local user apps, as in local mode
  });
  await instance.start();
  await wait(300);

  const framework = instance.appFramework;
  const launcher = (framework as any).launcherApp;
  const launcherChecksum = display.checksum;
  const apps = [...launcher.apps, ...launcher.gameApps]
    .filter((icon: any) => icon.app && !SKIP.has(icon.name))
    .map((icon: any) => icon.app);

  const failures: string[] = [];
  for (const app of apps) {
    await instance.run(() => framework.switchToApp(app));
    await wait(500);
    for (const key of KEYS) {
      instance.run(() => input.press(key));
      await wait(100);
    }
    await wait(300);

    const stillOpen = framework.getActiveApp() === app;
    const drew = display.checksum !== launcherChecksum;
    if (stillOpen && drew) {
      console.log(`  ✓ ${app.name}`);
    } else {
      failures.push(app.name);
      console.log(`  ✗ ${app.name}: ${stillOpen ? "drew nothing of its own" : "crashed or closed"}`);
    }

    await instance.run(() => framework.switchToApp(launcher));
    await wait(100);
  }

  await instance.stop();
  fs.rmSync(dataRoot, { recursive: true, force: true });

  if (failures.length > 0) {
    throw new Error(`Apps failed: ${failures.join(", ")}`);
  }
  console.log(`\n✓ Apps smoke test passed (${apps.length} apps)`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
