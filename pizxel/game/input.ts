/**
 * Input helpers
 *
 * Held-key state for smooth movement. Keydown events still arrive through
 * onEvent (use them for instant response to a press); read held state in
 * onUpdate for continuous movement.
 */

import { getAppFramework } from "../core/instance-context";

/** Whether a key is held down right now (single letters match either case) */
export function isKeyDown(key: string): boolean {
  return getAppFramework()?.isKeyDown(key) ?? false;
}

/** Whether any of the keys is held down */
export function anyKeyDown(...keys: string[]): boolean {
  return keys.some((key) => isKeyDown(key));
}
