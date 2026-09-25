/**
 * Instance Context
 *
 * Per-instance services (data root, audio, app framework) for code that
 * reaches them globally, e.g. `getAudio()` in apps.
 *
 * Local mode (terminal / canvas / framebuffer) runs one instance and uses the
 * process-wide default context, so behaviour is unchanged. Server mode runs
 * several instances in one process; each runs inside its own context via
 * AsyncLocalStorage, which follows timers and promises started inside it.
 */

import { AsyncLocalStorage } from "async_hooks";
import * as path from "path";
import type { Audio } from "../audio/audio";
import type { AudioInputDriver } from "../drivers/audio/audio-input-driver";
import type { AppFramework } from "./app-framework";

export interface InstanceContext {
  /** Root for this instance's saved data (default: data/default-user) */
  dataRoot: string;
  audio: Audio | null;
  audioInput: AudioInputDriver | null;
  appFramework: AppFramework | null;
}

const contextStorage = new AsyncLocalStorage<InstanceContext>();

const defaultContext: InstanceContext = {
  // PIZXEL_DATA_ROOT points local modes at another data folder (e.g. for
  // testing without touching your own saved data)
  dataRoot:
    process.env.PIZXEL_DATA_ROOT ||
    path.join(process.cwd(), "data", "default-user"),
  audio: null,
  audioInput: null,
  appFramework: null,
};

/**
 * The process-wide context used by local mode (and by any code running
 * outside an instance context)
 */
export function getDefaultContext(): InstanceContext {
  return defaultContext;
}

/**
 * The context of the instance the current code belongs to
 */
export function getInstanceContext(): InstanceContext {
  return contextStorage.getStore() ?? defaultContext;
}

/**
 * Run a function (and everything it schedules) inside an instance's context
 */
export function runInContext<T>(context: InstanceContext, fn: () => T): T {
  return contextStorage.run(context, fn);
}

export function getAudio(): Audio | null {
  return getInstanceContext().audio;
}

export function getAudioInput(): AudioInputDriver | null {
  return getInstanceContext().audioInput;
}

export function getAppFramework(): AppFramework | null {
  return getInstanceContext().appFramework;
}
