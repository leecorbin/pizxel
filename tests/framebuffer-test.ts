/**
 * Framebuffer Driver Test
 *
 * The fast path (showPixels: lookup table, row copies, changed rows only)
 * must write exactly the same bytes as the original per-pixel show(). Uses
 * temporary files in place of /dev/fb0.
 *
 * Run: npx tsx tests/framebuffer-test.ts
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { FramebufferDisplayDriver } from "../pizxel/drivers/display/framebuffer-display";
import { DisplayDriver } from "../pizxel/drivers/base/device-driver";

const FB_WIDTH = 800;
const FB_HEIGHT = 480;

function assert(condition: any, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
  console.log(`  ✓ ${message}`);
}

/** A driver writing to a file, set up as initialize() would for 800x480 */
function makeDriver(file: string): FramebufferDisplayDriver {
  fs.writeFileSync(file, Buffer.alloc(FB_WIDTH * FB_HEIGHT * 2));
  const driver: any = new FramebufferDisplayDriver();
  driver.fbFd = fs.openSync(file, "r+");
  driver.fbWidth = FB_WIDTH;
  driver.fbHeight = FB_HEIGHT;
  driver.bitsPerPixel = 16;
  driver.fbBuffer = Buffer.alloc(FB_WIDTH * FB_HEIGHT * 2);
  driver.calculateScaling();
  return driver;
}

function randomFrame(): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(256 * 192 * 3);
  for (let i = 0; i < pixels.length; i++) pixels[i] = Math.floor(Math.random() * 256);
  return pixels;
}

function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pizxel-fb-test-"));
  const oldFile = path.join(dir, "old.fb");
  const newFile = path.join(dir, "new.fb");
  const oldDriver: any = makeDriver(oldFile);
  const newDriver: any = makeDriver(newFile);
  const same = () => fs.readFileSync(oldFile).equals(fs.readFileSync(newFile));

  // Old path: copy into the RGB buffer, then the per-pixel show()
  const showOld = (pixels: Uint8ClampedArray) =>
    DisplayDriver.prototype.showPixels.call(oldDriver, pixels);

  const frame1 = randomFrame();
  showOld(frame1);
  newDriver.showPixels(frame1);
  assert(same(), "a full frame matches the original output byte for byte");

  // Change a few rows only
  const frame2 = new Uint8ClampedArray(frame1);
  for (let i = 40 * 256 * 3; i < 43 * 256 * 3; i++) frame2[i] = 255 - frame2[i];
  frame2[191 * 256 * 3 + 5] = 7;
  showOld(frame2);
  newDriver.showPixels(frame2);
  assert(same(), "a partly changed frame matches (changed rows only)");

  // Software brightness
  oldDriver.setBrightness(40);
  newDriver.setBrightness(40);
  showOld(frame2);
  newDriver.showPixels(frame2);
  assert(same(), "brightness applies the same way");

  // An unchanged frame writes nothing new
  const before = fs.readFileSync(newFile);
  newDriver.showPixels(frame2);
  assert(fs.readFileSync(newFile).equals(before), "an unchanged frame changes nothing");

  fs.closeSync(oldDriver.fbFd);
  fs.closeSync(newDriver.fbFd);
  fs.rmSync(dir, { recursive: true, force: true });

  // Speed: fast path vs the original, for a full-screen change each frame
  const speedFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "pizxel-fb-speed-")), "fb");
  const a: any = makeDriver(speedFile);
  const frames = [randomFrame(), randomFrame()];
  let t = performance.now();
  for (let n = 0; n < 20; n++) DisplayDriver.prototype.showPixels.call(a, frames[n % 2]);
  const oldMs = (performance.now() - t) / 20;
  t = performance.now();
  for (let n = 0; n < 20; n++) a.showPixels(frames[n % 2]);
  const newMs = (performance.now() - t) / 20;
  fs.closeSync(a.fbFd);
  console.log(`  (full-frame change: ${oldMs.toFixed(2)}ms before, ${newMs.toFixed(2)}ms now, on this machine)`);

  console.log("\n✓ Framebuffer test passed");
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
