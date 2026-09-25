# PiZXel API Reference

The APIs apps and drivers use, taken from the source. If this file and the
code disagree, the code wins. Please fix this file when that happens.

Import paths below are relative to an app in `pizxel/apps/<id>/`. For apps
in `data/default-user/apps/<id>/`, use `../../../../pizxel/...` instead.

- [Types](#types)
- [App interface](#app-interface)
- [config.json](#configjson)
- [Drawing: DisplayBuffer](#drawing-displaybuffer)
- [Input](#input)
- [Storage](#storage)
- [Audio](#audio)
- [Notifications and background work](#notifications-and-background-work)
- [UI toolkit](#ui-toolkit)
- [Game helpers](#game-helpers)
- [Emoji](#emoji)
- [Instances and context](#instances-and-context)
- [Drivers](#drivers)
- [Testing](#testing)
- [Environment variables](#environment-variables)

---

## Types

`pizxel/types/index.ts`

```typescript
type RGB = [number, number, number];      // each 0–255

interface InputEvent {
  key: string;                  // "ArrowUp", "Enter", " ", "a", ...
  type: "keydown" | "keyup";    // current drivers only send "keydown"
  timestamp: number;            // Date.now()
  repeat?: boolean;
  source?: string;              // "keyboard", ...
}
```

---

## App interface

```typescript
import { App, InputEvent, InputKeys } from "../../types";
import { DisplayBuffer } from "../../core/display-buffer";

interface App {
  readonly name: string;

  onActivate(): void | Promise<void>;
  onDeactivate(): void;
  onUpdate(deltaTime: number): void;       // seconds since last frame
  onEvent(event: InputEvent): boolean;     // true = handled
  render(matrix: DisplayBuffer): void;

  onBackgroundTick?(): void;
  onSaveState?(): any;                     // declared, not called by the framework yet
  onRestoreState?(state: any): void;       // declared, not called by the framework yet
}
```

Your class should also have a public `dirty: boolean` field. It isn't in
the interface, but the framework reads it every frame.

### How the framework drives an app

`pizxel/core/app-framework.ts` runs one loop per PiZXel (60fps by default;
the session server caps it with `FPS_CAP`). On each frame it:

1. calls `onBackgroundTick()` on every **inactive** registered app, about once a second
2. calls `onUpdate(deltaTime)` on the **active** app
3. if the active app's `dirty` is `true`, calls `render(matrix)`, draws any notification on top, and sends the buffer to the display

Input goes to the active app's `onEvent`. If it returns `false` and the key
is `Escape`, the framework switches to the launcher.

If `onUpdate`, `render` or `onEvent` throws, the framework logs the error,
returns to the launcher and shows the message there.

### Rules

- **No blocking.** No `while (true)`, no busy-waiting, no sync sleeps. Keep state and advance it in `onUpdate`. `async` work (e.g. `fetch`) is fine if it sets `dirty` when it finishes.
- **Dirty flag.** Set `this.dirty = true` after any change that affects the screen. At the end of `render`, set `this.dirty = false`. Start with `dirty = true` so the first frame draws.
- **Redraw everything in `render`.** Start with `matrix.clear()` or `matrix.fill(...)`, because the buffer holds the previous frame.
- **Don't call `show()`**, because the framework does that.
- **Return `true` from `onEvent`** only for keys you used.

---

## config.json

Read by `pizxel/core/app-scanner.ts` (`AppConfig`).

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | Launcher label |
| `icon` | string | yes | Emoji, e.g. `"⏰"` |
| `main` | string | yes | Entry file, e.g. `"clock.ts"` (`.ts` added if no extension) |
| `version` | string | | |
| `description` | string | | |
| `author` | string | | |
| `color` | `[r,g,b]` | | Launcher theme colour, default `[255,255,255]` |
| `category` | string | | `"game"` puts the app in the launcher's Games folder |
| `tier` | `"core"` \| `"optional"` | | Session server only. `core` (default) is on for everyone; `optional` is loaded only for sessions that enabled it via `PUT /sessions/:id/apps` ([session-api.md](session-api.md)). Local modes ignore it |

**Where apps are found**, in this order: `pizxel/apps/*/`, then the user apps
directory. That's `data/default-user/apps/*/` locally, or `EXTRA_APPS_DIR`
in server mode.

**Which export is used:** for `"main": "clock.ts"`, the scanner tries the exports
`clock`, `Clock`, `ClockApp`, then `default`, then the first export whose name
ends in `App` (or whose prototype has `render`). The constructor must take no
arguments.

---

## Drawing: DisplayBuffer

`pizxel/core/display-buffer.ts`. This is the `matrix` passed to `render`. It
is 256×192 by default (the size of the display driver). Origin is top-left.
Out-of-bounds drawing is clipped silently.

| Method | Notes |
|---|---|
| `getWidth(): number` / `getHeight(): number` | |
| `setPixel(x, y, color: RGB)` | Respects the current clip region and transform |
| `getPixel(x, y): RGB` | `[0,0,0]` outside the screen |
| `clear()` | Fill with black |
| `fill(color: RGB = [0,0,0])` | Fill the whole screen |
| `line(x0, y0, x1, y1, color)` | Bresenham |
| `rect(x, y, width, height, color, fill = false)` | |
| `circle(cx, cy, radius, color, fill = false)` | |
| `text(text, x, y, color, bgColor?, scale = 1)` | ZX Spectrum 8×8 font; each character is `8 * scale` px wide |
| `centeredText(text, y, color, bgColor?)` | Horizontally centred, scale 1 |
| `pushClipRegion(x, y, w, h)` / `popClipRegion()` | Nested clips intersect |
| `getClipRegion()` | Current clip or `null` |
| `pushTransform(dx, dy)` / `popTransform()` | Offsets all drawing; transforms add up |
| `getTransform()` | `{ x, y }` |
| `getBuffer(): RGB[][]` | Raw `[y][x]` rows, for drivers and tests |

There is **no** `pixel()`, `drawLine()`, `drawRect()`, `ellipse()`,
`polygon()`, `triangle()` or `show()` on `DisplayBuffer`. Those names came
from the Python version or other libraries.

```typescript
render(matrix: DisplayBuffer): void {
  matrix.fill([0, 0, 32]);
  matrix.text("SCORE 100", 4, 4, [255, 255, 255]);
  matrix.rect(10, 20, 50, 30, [0, 255, 0], true);
  matrix.circle(128, 96, 20, [255, 0, 0]);
  matrix.line(0, 191, 255, 191, [0, 255, 255]);
  matrix.text("BIG", 80, 120, [255, 255, 0], undefined, 3);
  this.dirty = false;
}
```

---

## Input

```typescript
import { InputKeys } from "../../types";

InputKeys.UP      // "ArrowUp"
InputKeys.DOWN    // "ArrowDown"
InputKeys.LEFT    // "ArrowLeft"
InputKeys.RIGHT   // "ArrowRight"
InputKeys.OK      // "Enter"
InputKeys.ACTION  // " "  (Space: jump / fire)
InputKeys.BACK    // "Backspace"
InputKeys.HOME    // "Escape" (framework: back to launcher if unhandled)
InputKeys.HELP    // "Tab"   (convention: toggle a HelpModal)
```

The terminal driver and browser inputs are normalised by
`pizxel/drivers/input/key-map.ts`. Other printable keys arrive as the
character itself. Ctrl+C in the terminal quits PiZXel.

```typescript
onEvent(event: InputEvent): boolean {
  if (event.type !== "keydown") return false;
  if (event.key === InputKeys.ACTION) {
    this.jump();
    this.dirty = true;
    return true;
  }
  return false;
}
```

---

## Storage

`pizxel/storage/app-storage.ts`. Key-value JSON, saved on every write.

```typescript
import { AppStorage } from "../../storage";

const storage = new AppStorage("snake");   // <data root>/storage/snake.json
storage.set("highScore", 1200);
storage.get<number>("highScore");          // 1200 | undefined
storage.has("highScore");
storage.delete("highScore");
storage.keys();
storage.clear();
```

The data root is `data/default-user/` locally and the session's own
directory in server mode, so the same code is isolated per visitor. Create
`AppStorage` inside the app's lifecycle (constructor or `onActivate`), not at
module load, so it picks up the right instance.

There is a second, older class with the same name in
`pizxel/core/app-storage.ts`. It stores one file per key under
`<data root>/app-data/<app-name>/`, and `get(key, defaultValue)` returns
`null` when missing. `ScoreManager` uses it. New code should use
`pizxel/storage`.

---

## Audio

`pizxel/audio/audio.ts`. Audio exists in canvas mode and server mode (the
browser plays it). `getAudio()` returns `null` elsewhere, so always use `?.`.

```typescript
import { getAudio, Sounds } from "../../game";   // or "../../core/instance-context"

getAudio()?.play(Sounds.COIN);
getAudio()?.beep(440, 100, 0.5);   // frequency Hz, duration ms, volume 0–1
getAudio()?.stop();
getAudio()?.setVolume(0.8);
getAudio()?.isAvailable();
```

`Sounds`: `SELECT`, `ERROR`, `COIN`, `JUMP`, `HIT`, `DIE`, `POWERUP`,
`BRICK`, `BOUNCE`.

Microphone input (canvas mode): `getAudioInput()` from
`core/instance-context` returns an `AudioInputDriver` or `null`.

---

## Notifications and background work

An inactive app gets `onBackgroundTick()` about once a second. To ask for
attention, it calls the `request_foreground` function that the framework
attaches to the app object the first time the app is activated:

```typescript
onBackgroundTick(): void {
  if (this.timerFinished) {
    (this as any).request_foreground?.("Timer done!");
  }
}
```

A notification bar appears over the current app; **Enter** switches to the
requesting app. See `pizxel/core/notification-manager.ts`.

---

## UI toolkit

`pizxel/ui` (`import { ... } from "../../ui"`). Widgets draw onto a
`DisplayBuffer` and handle `InputEvent`s:

- Core: `Widget`, `Container`, `ScrollContainer`
- Components: `Label`, `Button`, `Panel`, `Modal`, `HelpModal`, `TextInput`, `Toggle`, `Slider`, `ProgressBar`, `Icon`, `TabView`, `LoadingSpinner`, `OnScreenKeyboard`
- Layout: `VStack`, `HStack`, `Grid`, `Spacer`
- Dialogs: `SettingsDialog`, `GamesPopup`

Every widget has `x`, `y`, `width`, `height`, `visible`, `enabled`,
`render(matrix)`, `handleEvent(event)`, `show()`, `hide()`, `toggle()`,
`addChild()` and `removeChild()`. The standard help screen:

```typescript
private helpModal = HelpModal.create([
  { key: "Space", action: "Jump" },
  { key: "ESC", action: "Return to launcher" },
]);

onEvent(event: InputEvent): boolean {
  if (event.key === InputKeys.HELP) {
    this.helpModal.toggle();
    this.dirty = true;
    return true;
  }
  if (this.helpModal.visible && this.helpModal.handleEvent(event)) {
    this.dirty = true;
    return true;
  }
  // ... app keys
  return false;
}

render(matrix: DisplayBuffer): void {
  // ... app drawing
  this.helpModal.render(matrix);   // last, so it's on top
  this.dirty = false;
}
```

See the component files for their options.

---

## Game helpers

`pizxel/game` (`import { ... } from "../../game"`):

- `Sprite`: `new Sprite({ x, y, width, height, color?, vx?, vy?, ax?, ay? })` with `update(dt)`, `render(matrix)`, `getBounds()`, `getCenter()`, `containsPoint()`
- Collision: `rectRect`, `spriteSprite`, `pointRect`, `circleCircle`, `circleRect`, `getCollisions`, `getCollisionsByTag`, `isOutOfBounds`, `clampToBounds`
- Physics: `applyGravity`, `applyFriction`, `bounceX`, `bounceY`, `angleBetween`, `distance`, `moveToward`, `reflect`, `paddleBounce`, `wrapAround`, `limitSpeed`
- Utilities: `ScoreManager` (saves the high score through the older `core/app-storage`), `LivesManager`, `Timer`, `LevelManager`, `PauseManager`
- Audio re-exports: `getAudio`, `Sounds`, `Audio`

---

## Emoji

App icons are emoji rendered from the bundled spritesheet
(`pizxel/lib/emoji_spritesheet.png` + `.json`) by `getEmojiLoader()` in
`pizxel/lib/emoji-loader.ts`. Emoji not in the sheet are fetched from a CDN
only when the network is allowed (`core/network.ts`). The session server
turns this off.

---

## Instances and context

`pizxel/core/instance.ts` and `pizxel/core/instance-context.ts`.

`createInstance(options)` builds one PiZXel (framework, launcher, scanned
apps) on top of an initialised `DeviceManager`. Local mode (`start.ts`)
creates one. The session server creates one per session, each with its own
drivers, `dataRoot` and app filter.

```typescript
const instance = await createInstance({
  deviceManager,          // drivers already initialised
  audio, audioInput,      // optional
  dataRoot,               // omit for local mode (data/default-user)
  scanner: { userAppsPath, include },
  fps,                    // optional frame cap
  startApp,               // optional app name to reopen
});
await instance.start();
await instance.stop();
```

Code that needs per-instance services calls `getAudio()`,
`getAudioInput()`, `getAppFramework()` or `getInstanceContext()`. These use
`AsyncLocalStorage`, so they return the right instance for code running
inside it (including timers and promises it started). Don't cache these in
module-level variables: that would share one instance's services with every
session.

---

## Drivers

`pizxel/drivers/base/device-driver.ts` has the abstract `DisplayDriver`
and `InputDriver` classes. A display driver sets `priority` and `name`,
implements `initialize()`, `shutdown()`, `isAvailable()` and `show()`, and
inherits a 256×192 `buffer` with `setPixel`/`getPixel`/`clear`/`fill`.

| Driver | File | Priority |
|---|---|---|
| Framebuffer (`/dev/fb0`, RGB565, integer scaling) | `drivers/display/framebuffer-display.ts` | 90 |
| Canvas (Express + Socket.IO, browser audio) | `drivers/display/canvas-display-driver.ts` | 80 |
| Terminal (ANSI true colour) | `drivers/display/terminal-display.ts` | 50 |
| Keyboard (stdin) | `drivers/input/keyboard-input.ts` | |
| Session display/input (WebSocket) | `server/session-drivers.ts` | |

`DeviceManager.registerDisplayDriver(Class)` + `initialize()` picks the
highest-priority driver whose `isAvailable()` is true.
`DeviceManager.useDrivers(display, input)` uses given instances instead
(server mode and tests). See [DISPLAY_MODES.md](DISPLAY_MODES.md).

---

## Testing

`pizxel/testing` has pure TypeScript helpers with no dependencies.

### TestRunner

```typescript
import { TestRunner } from "../pizxel/testing";

const runner = new TestRunner(10.0);     // auto-stops after 10 s
await runner.start(MyApp);               // app class, constructed with no args
await runner.wait(0.5);                  // seconds
await runner.waitUntil(() => cond, 5);   // → boolean

runner.inject(InputKeys.RIGHT);
runner.injectSequence([InputKeys.UP, InputKeys.OK], 100);
runner.input.injectRepeat(InputKeys.ACTION, 10, 50);

runner.pixelAt(x, y);                    // RGB
runner.countColor([0, 255, 0], 10);      // tolerance per channel
runner.findSprite([0, 255, 0], 10);      // { x, y } centroid | null
runner.display.findBlobs(color, 10, 10); // minSize, tolerance → [{x, y, width, height, pixelCount}]
runner.display.isChanging(2);            // currently just renderCount > 2
runner.display.renderCount;
runner.snapshot("name");                 // RGB[][] copy of the screen
runner.stop();
```

Assertions (also on `runner`): `assertPixelColor`, `assertColorCount`,
`assertSpriteExists`, `assertSpriteMoved`, `assertRenderCount`,
`assertTrue`, `assertFalse`, `assertEqual`, `assertNotNull`.

**Limitations:**
- The runner's display is a stub that only draws `setPixel`, `clear`,
  `fill` and filled `rect`. `line`, `circle`, `text` and `centeredText`
  draw nothing, so test with filled shapes or use a full instance (below).
- It is fixed at 256×192, runs the app alone (no launcher, no ESC handling)
  and has no log capture. Apps log with `console.log`.

### Full-instance tests

For real rendering and multi-app behaviour, build an instance with a test
display driver, as `tests/instance-test.ts` does: subclass `DisplayDriver`
and `InputDriver`, pass them to `DeviceManager.useDrivers()`, then call
`createInstance()`. `tests/server-test.ts` tests the session server over
HTTP and WebSocket.

### Commands

```bash
npm test              # tests/instance-test.ts + tests/server-test.ts
npx tsc --noEmit      # type check (npm run typecheck)
npx tsx tests/my-test.ts
```

---

## Environment variables

| Variable | Mode | Default | Meaning |
|---|---|---|---|
| `CANVAS_PORT` | canvas | `3001` | Browser display port |
| `CANVAS_PIXEL_SIZE` | canvas | `3` | Screen pixels per PiZXel pixel |
| `PIZXEL_DEBUG` | any | off | Per-frame and per-key debug logging |
| `ENGINE_TOKEN`, `PORT`, `DATA_ROOT`, `MAX_LIVE_SESSIONS`, `FPS_CAP`, `IDLE_SUSPEND_SECONDS`, `EXTRA_APPS_DIR` | server | | See the README's Session Server section |
