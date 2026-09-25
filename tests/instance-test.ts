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

async function makeInstance(dataRoot: string): Promise<TestInstance> {
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
    // A: back to first launcher item (Standby), open it, change mode, leave
    press(a, "ArrowLeft");
    press(a, "Enter");
    await wait(200);
    press(a, " ");
    press(a, "Escape");
    await wait(200);
    const aStandby = path.join(a.dataRoot, "storage", "standby.json");
    const bStandby = path.join(b.dataRoot, "storage", "standby.json");
    assert(fs.existsSync(aStandby), "A's app state is saved under A's data root");
    assert(!fs.existsSync(bStandby), "B's data root has no state from A");
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
