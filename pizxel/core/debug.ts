/**
 * Debug logging
 *
 * Per-frame and per-key diagnostics, off unless PIZXEL_DEBUG is set.
 */

const enabled = !!process.env.PIZXEL_DEBUG;

export function debugLog(...args: any[]): void {
  if (enabled) {
    console.log(...args);
  }
}
