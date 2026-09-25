/**
 * Terminal Driver Test
 *
 * The terminal driver redraws only the cells that changed. Its output,
 * applied to a virtual terminal, must leave exactly the right colours in
 * every cell after each frame.
 *
 * Run: npx tsx tests/terminal-test.ts
 */

import { TerminalDisplayDriver } from "../pizxel/drivers/display/terminal-display";

const W = 256;
const H = 192;

function assert(condition: any, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
  console.log(`  ✓ ${message}`);
}

/** A minimal ANSI terminal: cursor moves, 24-bit fg/bg, "▀" cells */
class VirtualTerminal {
  cells: string[][] = Array.from({ length: H / 2 }, () => Array(W).fill(""));
  private row = 0;
  private col = 0;
  private fg = "";
  private bg = "";

  apply(output: string): void {
    const re = /\x1b\[(\d+);(\d+)H|\x1b\[(38|48);2;(\d+);(\d+);(\d+)m|\x1b\[0m|▀/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(output))) {
      if (m[1]) {
        this.row = Number(m[1]) - 1;
        this.col = Number(m[2]) - 1;
      } else if (m[3]) {
        const color = `${m[4]},${m[5]},${m[6]}`;
        if (m[3] === "38") this.fg = color;
        else this.bg = color;
      } else if (m[0] === "▀") {
        this.cells[this.row][this.col] = `${this.fg}/${this.bg}`;
        this.col++;
      }
    }
  }
}

function expectedCell(pixels: Uint8ClampedArray, row: number, x: number): string {
  const top = (row * 2 * W + x) * 3;
  const bottom = top + W * 3;
  return `${pixels[top]},${pixels[top + 1]},${pixels[top + 2]}/${pixels[bottom]},${pixels[bottom + 1]},${pixels[bottom + 2]}`;
}

function matches(term: VirtualTerminal, pixels: Uint8ClampedArray): boolean {
  for (let row = 0; row < H / 2; row++) {
    for (let x = 0; x < W; x++) {
      if (term.cells[row][x] !== expectedCell(pixels, row, x)) return false;
    }
  }
  return true;
}

function main() {
  const driver = new TerminalDisplayDriver();
  const term = new VirtualTerminal();
  let written = "";
  const realWrite = process.stdout.write.bind(process.stdout);
  const capture = (chunk: any) => {
    written += String(chunk);
    return true;
  };

  const frame = new Uint8ClampedArray(W * H * 3);
  for (let i = 0; i < frame.length; i++) frame[i] = (i * 7) % 256;

  process.stdout.write = capture as any;
  driver.showPixels(frame);
  process.stdout.write = realWrite as any;
  term.apply(written);
  const fullBytes = written.length;
  assert(matches(term, frame), "a first frame draws every cell correctly");

  // A small change: a sprite-sized box
  for (let y = 100; y < 110; y++) {
    for (let x = 50; x < 60; x++) {
      const i = (y * W + x) * 3;
      frame[i] = 255;
      frame[i + 1] = 0;
      frame[i + 2] = 0;
    }
  }
  written = "";
  process.stdout.write = capture as any;
  driver.showPixels(frame);
  process.stdout.write = realWrite as any;
  term.apply(written);
  assert(matches(term, frame), "after a small change every cell is still correct");
  assert(
    written.length < fullBytes / 50,
    `and only the change is written (${written.length} bytes vs ${fullBytes} for a full frame)`
  );

  written = "";
  process.stdout.write = capture as any;
  driver.showPixels(frame);
  process.stdout.write = realWrite as any;
  assert(written.length === 0, "an unchanged frame writes nothing");

  console.log("\n✓ Terminal test passed");
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
