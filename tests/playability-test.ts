/**
 * Playability Test
 *
 * Games must run at the same speed at any frame rate (60fps locally, 20fps
 * on pizxel.uk) and respond to held keys smoothly.
 *
 * Run: npx tsx tests/playability-test.ts
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { DeviceManager } from "../pizxel/core/device-manager";
import { createInstance, PizxelInstance } from "../pizxel/core/instance";
import { setNetworkAllowed } from "../pizxel/core/network";
import { DisplayDriver, InputDriver } from "../pizxel/drivers/base/device-driver";

class TestDisplayDriver extends DisplayDriver {
  readonly priority = 0;
  readonly name = "Test Display";
  async initialize(): Promise<void> {}
  async shutdown(): Promise<void> {}
  async isAvailable(): Promise<boolean> {
    return true;
  }
  show(): void {}
}

/** Browser-like input: reports key releases */
class TestInputDriver extends InputDriver {
  readonly priority = 0;
  readonly name = "Test Input";
  async initialize(): Promise<void> {}
  async shutdown(): Promise<void> {}
  async isAvailable(): Promise<boolean> {
    return true;
  }
  down(key: string, repeat = false): void {
    this.emitEvent({ key, type: "keydown", repeat, timestamp: Date.now(), source: "websocket" });
  }
  up(key: string): void {
    this.emitEvent({ key, type: "keyup", timestamp: Date.now(), source: "websocket" });
  }
}

interface Game {
  instance: PizxelInstance;
  input: TestInputDriver;
  app: any;
  dataRoot: string;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function assert(condition: any, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
  console.log(`  ✓ ${message}`);
}

/** Start an instance at a frame rate and open an app by name */
async function openApp(name: string, fps: number): Promise<Game> {
  const input = new TestInputDriver();
  const deviceManager = new DeviceManager();
  deviceManager.useDrivers(new TestDisplayDriver(), input);
  await deviceManager.initialize();
  const dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pizxel-play-test-"));
  const instance = await createInstance({
    deviceManager,
    dataRoot,
    fps,
    standby: false,
    scanner: { userAppsPath: null },
  });
  await instance.start();
  const launcher = (instance.appFramework as any).launcherApp;
  const icon = [...launcher.apps, ...launcher.gameApps].find((i: any) => i.name === name);
  if (!icon) throw new Error(`No app ${name}`);
  await instance.run(() => instance.appFramework.switchToApp(icon.app));
  return { instance, input, app: icon.app, dataRoot };
}

async function close(game: Game): Promise<void> {
  await game.instance.stop();
  fs.rmSync(game.dataRoot, { recursive: true, force: true });
}

const press = (g: Game, key: string) => g.instance.run(() => g.input.down(key));
const release = (g: Game, key: string) => g.instance.run(() => g.input.up(key));

/** Snake steps taken in `ms` at a frame rate */
async function snakeSteps(fps: number, ms: number): Promise<number> {
  const game = await openApp("Snake", fps);
  const startX = game.app.snake[0].x;
  await wait(ms);
  const steps = (game.app.snake[0].x - startX) / game.app.gridSize;
  await close(game);
  return steps;
}

/** Tetris rows fallen in `ms` at a frame rate */
async function tetrisRows(fps: number, ms: number): Promise<number> {
  const game = await openApp("Tetris", fps);
  const startY = game.app.currentPiece.y;
  await wait(ms);
  const rows = game.app.currentPiece.y - startY;
  await close(game);
  return rows;
}

async function main() {
  setNetworkAllowed(false);

  console.log("Same speed at 20fps and 60fps");
  const [snake20, snake60] = await Promise.all([snakeSteps(20, 1500), snakeSteps(60, 1500)]);
  assert(
    Math.abs(snake20 - snake60) <= 2 && snake60 >= 9,
    `Snake: ${snake20} steps at 20fps, ${snake60} at 60fps in 1.5s (~11 expected)`
  );
  const [tetris20, tetris60] = await Promise.all([tetrisRows(20, 2500), tetrisRows(60, 2500)]);
  assert(
    Math.abs(tetris20 - tetris60) <= 1 && tetris60 >= 2,
    `Tetris gravity: ${tetris20} rows at 20fps, ${tetris60} at 60fps in 2.5s (3 expected)`
  );

  console.log("Held keys");
  const breakout = await openApp("Breakout", 20);
  const paddle = breakout.app.paddle;
  paddle.x = 0;
  press(breakout, "ArrowRight");
  await wait(20);
  const afterPress = paddle.x;
  assert(afterPress >= 8, `Breakout: a press moves the paddle at once (${afterPress}px)`);
  await wait(500);
  const held = paddle.x;
  assert(held >= 100, `holding glides it smoothly (${Math.round(held)}px in 0.5s)`);
  release(breakout, "ArrowRight");
  await wait(150);
  const stopped = paddle.x;
  await wait(200);
  assert(paddle.x === stopped, "and releasing stops it");
  await close(breakout);

  const tetris = await openApp("Tetris", 20);
  const piece = tetris.app.currentPiece;
  const startX = piece.x;
  press(tetris, "ArrowLeft");
  await wait(20);
  assert(piece.x === startX - 1 || tetris.app.currentPiece !== piece, "Tetris: a press moves one column at once");
  await wait(400);
  assert(tetris.app.currentPiece.x <= 0, "holding auto-repeats to the wall");
  release(tetris, "ArrowLeft");
  await close(tetris);

  const snake = await openApp("Snake", 20);
  press(snake, "ArrowUp");
  release(snake, "ArrowUp");
  press(snake, "ArrowLeft");
  release(snake, "ArrowLeft");
  await wait(400);
  const d = snake.app.direction;
  assert(d.x === -1 && d.y === 0, "Snake: a quick up-then-left takes both turns");
  await close(snake);

  console.log("\n✓ Playability test passed");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
