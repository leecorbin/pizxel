/**
 * Instance Isolation Test
 *
 * Runs two PiZXel instances in one process and checks that each has its own
 * display, input, context and saved data.
 *
 * Run: npx tsx tests/instance-test.ts
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { DeviceManager } from "../pizxel/core/device-manager";
import { createInstance, PizxelInstance } from "../pizxel/core/instance";
import {
  getAppFramework,
  getDefaultContext,
  getInstanceContext,
  runInContext,
} from "../pizxel/core/instance-context";
import { DisplayDriver, InputDriver } from "../pizxel/drivers/base/device-driver";
import { setNetworkAllowed } from "../pizxel/core/network";
import { searchEmojisByName } from "../pizxel/lib/emoji-search-api";
import { AppStorage } from "../pizxel/storage";

class TestDisplayDriver extends DisplayDriver {
  readonly priority = 0;
  readonly name = "Test Display";
  showCount = 0;
  checksum = 0;

  async initialize(): Promise<void> {}
  async shutdown(): Promise<void> {}
  async isAvailable(): Promise<boolean> {
    return true;
  }

  show(): void {
    this.showCount++;
    let sum = 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const [r, g, b] = this.buffer[y][x];
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

interface TestInstance {
  instance: PizxelInstance;
  display: TestDisplayDriver;
  input: TestInputDriver;
  dataRoot: string;
}

async function makeInstance(
  dataRoot: string,
  beforeCreate?: () => void
): Promise<TestInstance> {
  if (beforeCreate) {
    runInContext(
      { dataRoot, audio: null, audioInput: null, appFramework: null },
      beforeCreate
    );
  }
  const display = new TestDisplayDriver();
  const input = new TestInputDriver();
  const deviceManager = new DeviceManager();
  deviceManager.useDrivers(display, input);
  await deviceManager.initialize();

  const instance = await createInstance({
    deviceManager,
    dataRoot,
    scanner: { userAppsPath: null },
  });
  await instance.start();
  return { instance, display, input, dataRoot };
}

function press(t: TestInstance, key: string): void {
  t.instance.run(() => t.input.press(key));
}

/** Highlight an app in the launcher by name (icon order depends on the apps) */
function select(t: TestInstance, appName: string): void {
  const launcher = (t.instance.appFramework as any).launcherApp;
  const icon = launcher.apps.find((i: any) => i.name === appName);
  if (!icon) throw new Error(`No launcher icon for ${appName}`);
  launcher.selectApp(icon.app);
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function assert(condition: any, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
  console.log(`  ✓ ${message}`);
}

async function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pizxel-instance-test-"));
  const a = await makeInstance(path.join(tmp, "a"));
  const b = await makeInstance(path.join(tmp, "b"));

  try {
    console.log("Rendering");
    await wait(300);
    assert(a.display.showCount > 0, "instance A renders");
    assert(b.display.showCount > 0, "instance B renders");

    console.log("Context");
    assert(
      a.instance.run(() => getAppFramework()) === a.instance.appFramework,
      "code run in A sees A's framework"
    );
    assert(
      b.instance.run(() => getAppFramework()) === b.instance.appFramework,
      "code run in B sees B's framework"
    );
    assert(
      getInstanceContext() === getDefaultContext(),
      "code outside any instance sees the default context"
    );
    const seenInTimer = await new Promise((resolve) =>
      runInContext(a.instance.context, () =>
        setTimeout(() => resolve(getInstanceContext()), 10)
      )
    );
    assert(seenInTimer === a.instance.context, "context follows timers");

    console.log("Input");
    const aBefore = a.display.checksum;
    const bBefore = b.display.checksum;
    press(a, "ArrowRight");
    await wait(200);
    assert(a.display.checksum !== aBefore, "key to A changes A's display");
    assert(b.display.checksum === bBefore, "key to A leaves B's display alone");

    console.log("Storage");
    // A: open Standby, change mode, leave
    select(a, "Standby");
    press(a, "Enter");
    await wait(200);
    press(a, " ");
    press(a, "Escape");
    await wait(200);
    const aStandby = path.join(a.dataRoot, "storage", "standby.json");
    const bStandby = path.join(b.dataRoot, "storage", "standby.json");
    assert(fs.existsSync(aStandby), "A's app state is saved under A's data root");
    assert(!fs.existsSync(bStandby), "B's data root has no state from A");

    console.log("Network policy");
    const realFetch = globalThis.fetch;
    let fetched = false;
    globalThis.fetch = (async () => {
      fetched = true;
      throw new Error("offline");
    }) as typeof fetch;
    try {
      setNetworkAllowed(false);
      await searchEmojisByName("smile", "test-key");
      assert(!fetched, "no network request when network use is off");
      setNetworkAllowed(true);
      await searchEmojisByName("smile", "test-key");
      assert(fetched, "network request allowed by default (local mode)");
    } finally {
      globalThis.fetch = realFetch;
      setNetworkAllowed(true);
    }

    console.log("Standby");
    // Saved config uses the app id "standby" (as the defaults and existing
    // data/default-user/storage/system.json do); the app's name is "Standby"
    // and it has never been opened, so the lookup must use scanned apps.
    const s = await makeInstance(path.join(tmp, "s"), () => {
      new AppStorage("system").set("config", {
        enabled: true,
        idleTimeoutSeconds: 1,
        schedules: [],
        defaultApp: "standby",
        brightnessMultiplier: 0.15,
      });
    });
    try {
      const launcher = s.instance.appFramework.getActiveApp();
      await wait(200);
      const launcherScreen = s.display.checksum;
      await wait(1600);
      assert(
        s.instance.appFramework.getActiveApp()?.name === "Standby",
        "standby app activates after the idle timeout"
      );
      assert(
        s.instance.appFramework.getStandbyManager().isActive(),
        "standby manager reports standby active"
      );
      press(s, "ArrowRight");
      await wait(200);
      assert(
        s.instance.appFramework.getActiveApp() === launcher,
        "input leaves standby and returns to the previous app"
      );
      assert(
        s.display.checksum === launcherScreen,
        "the waking key is not passed on to the restored app"
      );
    } finally {
      await s.instance.stop();
    }
  } finally {
    await a.instance.stop();
    await b.instance.stop();
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  console.log("\n✓ Instance isolation test passed");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
