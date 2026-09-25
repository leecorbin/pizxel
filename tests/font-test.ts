/**
 * Font Test
 *
 * Checks the ZX Spectrum font against the character set in the 48K ROM
 * (jsspeccy3/static/roms/48.rom, at 0x3D00). jsspeccy3 isn't in the repo, so
 * the test is skipped when the ROM isn't there.
 *
 * Run: npx tsx tests/font-test.ts
 */

import * as fs from "fs";
import * as path from "path";
import { ZX_SPECTRUM_FONT } from "../pizxel/core/font";

const ROM_PATH = path.join(__dirname, "..", "jsspeccy3", "static", "roms", "48.rom");
const CHARSET = 0x3d00;

// Spectrum characters that differ from ASCII
const ALIASES: Record<number, string> = { 0x5e: "↑", 0x60: "£", 0x7f: "©" };

function main() {
  if (!fs.existsSync(ROM_PATH)) {
    console.log("Font test skipped (no 48K ROM at jsspeccy3/static/roms/48.rom)");
    return;
  }
  const rom = fs.readFileSync(ROM_PATH);

  const mismatches: string[] = [];
  for (let code = 32; code < 128; code++) {
    const glyph = Array.from(rom.subarray(CHARSET + (code - 32) * 8, CHARSET + (code - 31) * 8));
    const keys = code === 0x7f ? [ALIASES[code]] : [String.fromCharCode(code)];
    if (ALIASES[code] && code !== 0x7f) keys.push(ALIASES[code]);

    for (const key of keys) {
      const font = ZX_SPECTRUM_FONT[key];
      if (!font || font.some((row, i) => row !== glyph[i])) {
        mismatches.push(`${JSON.stringify(key)} (0x${code.toString(16)})`);
      }
    }
  }

  if (mismatches.length > 0) {
    throw new Error(`Font differs from the 48K ROM: ${mismatches.join(", ")}`);
  }
  console.log("✓ Font test passed (all 96 characters match the 48K ROM)");
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
