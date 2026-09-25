# AI Agent Guide for PiZXel

**For AI assistants (and humans) working on PiZXel**

This file collects what we've learned about PiZXel's architecture, its common
pitfalls and its design philosophy. Read it *before* making changes so you
don't reintroduce bugs we've already fixed.

PiZXel is the TypeScript/Node rewrite of an earlier Python project,
**MatrixOS**. The Python code is kept in `matrixos-archive/` for reference
only. Nothing there runs, and its APIs (`matrix.set_pixel`, `TestRunner("examples.x.main")`,
`pip install`) are **not** PiZXel's.

---

## 🎯 Project Philosophy

**PiZXel** is a retro-looking LED matrix OS built with modern engineering.

### Core Principles

1. **Retro Aesthetic, Modern Practices**
   - Visual: ZX Spectrum 8×8 font, 256×192 resolution, 8-bit games, LED-matrix look
   - Engineering: TypeScript, automated tests, clean architecture
   - "It should *look* like 1983 but *work* like 2025"

2. **Minimal Dependencies, Maximum Functionality**
   - Runtime deps are few and deliberate: `canvas` (emoji rendering), `express` + `socket.io` (browser display), `ws` (session server), `tsx` (runs TypeScript directly, no build step)
   - Testing: plain TypeScript, no test framework
   - Goal: run on a low-power Raspberry Pi
   - **Critical**: the hardware has limited resources

3. **Emoji as Instant Icons**
   - Apps use real emoji for icons: `"icon": "🐸"` in `config.json`
   - Modern approach: use Unicode instead of drawing pixel art
   - **Don't overthink it**: if an emoji exists, use it!

4. **Easy Installation**
   - `git clone`, `npm ci`, `npm start`. Keep it that way
   - Plain TypeScript solutions are preferred over new packages

5. **Extend, Don't Redesign**
   - The pizxel.uk session server (`npm run start:server`) is an **addition**. It runs many isolated PiZXels in one process, but it must not change how local PiZXel works
   - Clone-and-run (`npm start`, `start:canvas`, `start:term`) and Raspberry Pi framebuffer use (`start:fb`) must keep working unchanged
   - New features plug into existing seams (drivers, `createInstance()` options, `InstanceContext`) instead of replacing them
   - When you touch shared code (`core/`, `apps/`, `drivers/`), check it in local mode **and** server mode

### Key User Interventions

These are the **critical moments** when the project lead changed course. Learn from them!

#### "Just a quick intervention..." - The Numpy Decision

**Context:** In the Python days, the AI suggested numpy for the test display buffer.

**User's intervention:**
> "just a quick intervention; what is numpy and why would that be better than using python lists? remember we are trying to keep this as easy to install as possible"

**Lesson:** Always ask whether a dependency is *really* needed. A 256×192 `RGB[][]` array is fine; we don't need a typed-array library or an image package for it. Before you add anything to `package.json`, ask "is this necessary, and will it install on a Pi?"

**Impact:** The testing framework is dependency-free, then in Python and now in TypeScript.

#### "That's cute, but..." - The Emoji Philosophy

**Context:** The AI drew a detailed pixel-art frog icon (2485 bytes) for Frogger.

**User's correction:**
> "that's cute, but why are we not using the emoji itself as we are with other apps?"

**Solution:** The icon became the 🐸 emoji.

**Lesson:** Use emoji when they exist. Clock uses ⏰, Standby uses 💤. This is the way.

#### "We want them all to pass!" - Quality Standards

**Context:** Early tests had failures (wrong colours, bad timeouts, wrong expectations).

**User's expectation:**
> "ok, this is good but when we run tests we want them all to pass! So is the issue here with the apps, with the testing framework, or because the tests themsevles are not well designed for the apps?"

**Lesson:** Tests aren't decoration. Make them match reality (actual colours, reasonable timeouts, tolerances). A failing test is never "good enough".

**Impact:** `npm test` and `npx tsc --noEmit` must both pass before every commit.

#### Other Key Guidance

**On Philosophy:**
> "cute quasi-os with a retro style to work on low power hardware"
> "use modern approaches where possible ... like using the emoji as instant icons"
> "feel free always to suggest improvements based on this philosophy"

**On Testing:**
> "is it feasiable to have a fully automated system (i'm thinking like our own little pupeteer or agent)"
→ Led to the headless testing framework (`pizxel/testing`)

**On Documentation:**
> "can we now make sure all the documentation is up to date and in sync with the api and current code"
→ Docs follow the code. When you change an API, update `docs/API_REFERENCE.md`

### Design Goals

- ✅ Develop anywhere (Mac/Linux/Windows: browser canvas or terminal)
- ✅ Deploy to a Raspberry Pi display via the framebuffer
- ✅ Run as a hosted service (pizxel.uk) without breaking the above
- ✅ Event-driven architecture (no blocking loops in apps)
- ✅ Automated tests (catch bugs before deployment)
- ⏳ HUB75 RGB LED matrix panels (driver not written yet)

---

## 🚨 Critical API Corrections

### Use the TypeScript API, Not Remembered Names

**WRONG (Python-era or invented names; none of these exist):**
```typescript
matrix.set_pixel(x, y, color)     // ❌ Python name
matrix.pixel(x, y, color)         // ❌
matrix.drawLine(...)              // ❌
matrix.drawRect(...)              // ❌
matrix.centered_text(...)         // ❌ Python name
matrix.ellipse(...) / polygon(...) / triangle(...)   // ❌ not ported
matrix.show()                     // ❌ the framework does this
```

**CORRECT (`pizxel/core/display-buffer.ts`):**
```typescript
matrix.setPixel(x, y, color)                              // ✅
matrix.getPixel(x, y)                                     // ✅
matrix.clear() / matrix.fill(color)                       // ✅
matrix.line(x0, y0, x1, y1, color)                        // ✅
matrix.rect(x, y, width, height, color, fill = false)     // ✅
matrix.circle(cx, cy, radius, color, fill = false)        // ✅
matrix.text(text, x, y, color, bgColor?, scale = 1)       // ✅
matrix.centeredText(text, y, color, bgColor?)             // ✅
```

Colours are `RGB` tuples `[r, g, b]` (arrays, not `(r, g, b)`).

**Why this matters:** Several games were written against API names that
didn't exist. Always check `docs/API_REFERENCE.md` or the source before you use a method.

### Input System

`event.key` is a string. Compare it with `InputKeys` from `pizxel/types`:

```typescript
if (event.key === InputKeys.ACTION) { ... }   // ✅ preferred: Space
if (event.key === " ") { ... }                // ✅ same thing
```

| Constant | Key | Value |
|---|---|---|
| `InputKeys.UP/DOWN/LEFT/RIGHT` | Arrows | `"ArrowUp"` … |
| `InputKeys.OK` | Enter | `"Enter"` |
| `InputKeys.ACTION` | Space | `" "` |
| `InputKeys.BACK` | Backspace | `"Backspace"` |
| `InputKeys.HOME` | ESC (the framework returns to the launcher if the app doesn't handle it) | `"Escape"` |
| `InputKeys.HELP` | Tab (toggle a `HelpModal`) | `"Tab"` |

`onEvent` only receives keydowns (keyups go to the optional `onKeyUp`).
For smooth movement, read held keys in `onUpdate` with `isKeyDown` /
`anyKeyDown` from `pizxel/game`, and ignore `event.repeat` keydowns
(the browser's auto-repeat); `KeyRepeat` gives Tetris-style auto-repeat.

---

## 🏗️ Architecture Deep Dive

### Event-Driven Framework

**Apps DO NOT manage their own loops!** `pizxel/core/app-framework.ts` runs
the loop (60fps locally, capped by `FPS_CAP` in server mode).

```typescript
// ❌ WRONG: the app runs its own loop
class MyApp implements App {
  async run() {
    while (true) {              // Don't do this!
      this.update();
      await sleep(16);
    }
  }
}
```

```typescript
// ✅ CORRECT: the framework calls you
class MyApp implements App {
  readonly name = "My App";
  dirty = true;

  onUpdate(deltaTime: number): void {       // deltaTime in SECONDS
    this.playerX += this.velocity * deltaTime;
    this.dirty = true;                      // request a re-render
  }

  render(matrix: DisplayBuffer): void {     // only called when dirty
    matrix.clear();
    matrix.rect(Math.floor(this.playerX), this.playerY, 10, 10, [255, 0, 0], true);
    this.dirty = false;                     // clear the flag
  }
  // ...
}
```

### Dirty Flag Pattern

**Critical for performance, especially on a Pi and with many sessions per server:**
```typescript
onEvent(event: InputEvent): boolean {
  if (event.type === "keydown" && event.key === InputKeys.RIGHT) {
    this.playerX += 5;
    this.dirty = true;   // ← MUST set this!
    return true;
  }
  return false;
}

render(matrix: DisplayBuffer): void {
  matrix.clear();
  matrix.rect(this.playerX, this.playerY, 10, 10, [0, 255, 0], true);
  this.dirty = false;    // ← MUST clear this!
}
```

`dirty` isn't part of the `App` interface, but the framework reads it every
frame. Declare it as a public field.

**Common mistake:** forgetting `this.dirty = true` after a state change means nothing renders.

### App Lifecycle

```typescript
import { App, InputEvent, InputKeys } from "../../types";
import { DisplayBuffer } from "../../core/display-buffer";

export class MyApp implements App {
  readonly name = "My App";
  dirty = true;                     // request the initial render
  private score = 0;

  onActivate(): void {              // app comes to the foreground (may be async)
    this.dirty = true;
  }

  onDeactivate(): void {            // app goes to the background / PiZXel stops
    // save state here (AppStorage)
  }

  onUpdate(deltaTime: number): void {   // every frame while active
    // advance game state; set dirty when something visible changes
  }

  onBackgroundTick(): void {        // optional: ~1/second while inactive
    if (this.timerExpired) {
      (this as any).request_foreground?.("Timer done!");  // attached by the framework
    }
  }

  onEvent(event: InputEvent): boolean {
    if (event.type !== "keydown") return false;
    if (event.key === InputKeys.OK) {
      this.score++;
      this.dirty = true;
      return true;                  // handled
    }
    return false;                   // let the framework handle it (ESC → launcher)
  }

  render(matrix: DisplayBuffer): void {
    matrix.clear();
    matrix.text(`SCORE ${this.score}`, 4, 4, [255, 255, 255]);
    this.dirty = false;
  }
}
```

If `onUpdate`, `render` or `onEvent` throws, the framework returns to the
launcher and shows the error there. Don't swallow errors to hide them.

### Registering an App: config.json

There's no `run(os_context)` entry point and no manual registration. The
`AppScanner` finds every folder with a `config.json` in `pizxel/apps/` and in
the user apps directory (`data/default-user/apps/` locally, `EXTRA_APPS_DIR`
in server mode):

```json
{
  "name": "My App",
  "version": "1.0.0",
  "description": "What it does",
  "author": "You",
  "icon": "🎮",
  "main": "my-app.ts",
  "color": [0, 255, 0],
  "category": "game",
  "tier": "optional"
}
```

- `name`, `icon` (an emoji) and `main` are required
- The scanner uses the exported class named `<Main>App`, the default export, or the first export ending in `App`. The constructor takes no arguments
- `category: "game"` puts the app in the launcher's Games folder
- `tier` matters only to the session server: `"core"` (default) is on for every visitor; `"optional"` loads only for sessions that enabled it; `"private"` only on a private instance (Lee's in-development apps live in his private repo, never this one). Local modes load all apps
- `network` lists the hosts an app contacts; without it the app gets no network on the server

### Instances: Local Mode vs Server Mode

`createInstance()` (`pizxel/core/instance.ts`) builds one PiZXel: framework,
launcher and scanned apps on top of initialised drivers.

- **Local mode** (`pizxel/start.ts`): one instance using the process-wide default context. Data lives in `data/default-user/`.
- **Server mode** (`pizxel/start-server.ts`, `pizxel/server/`): one instance per visitor session, each with its own drivers, data root and app list, all in one Node process.

Per-instance services (data root, audio, the framework) come from
`InstanceContext` via `AsyncLocalStorage`: `getInstanceContext()`,
`getAudio()`, `getAudioInput()`, `getAppFramework()`.

**Rules that keep both modes working:**
- **No module-level mutable state** in apps or shared code. A global `let highScore` or a cached `getAudio()` result would be shared by every session on the server
- **Build `AppStorage` inside the lifecycle** (constructor/`onActivate`), not at import time, so it resolves to the right data root
- **Network access**: use `fetch()` only, and declare the hosts in `"network"` in `config.json`. On the server a guard (`core/network.ts`) blocks everything else, and the `http`/`https` modules can't leave the machine
- **Secrets**: API keys go in the vault (`this.secrets`, or `ApiKey` from `core/api-key.ts`), never in `AppStorage`. Mask key fields, never show a saved key, and **never log a key or any part of it**
- **Time, not frames**: the frame rate varies (60fps locally, 20fps on pizxel.uk, 2fps for an idle tab). Use `deltaTime` and `Ticker`; a counter per frame makes a game run at a third of its speed on the server
- **Don't assume one display.** Draw through the `matrix` you're given, and don't reach for a driver directly

### Drivers

Display drivers extend `DisplayDriver` (`pizxel/drivers/base/device-driver.ts`),
and `DeviceManager` picks the highest priority whose `isAvailable()` is true:
framebuffer (90), canvas (80), terminal (50). Server mode and tests hand
explicit drivers to `DeviceManager.useDrivers(display, input)`. Add hardware
support as a new driver; don't change the framework. See `docs/DISPLAY_MODES.md`.

---

## 🧪 Testing Framework

### Philosophy

**Tests are first-class citizens.** Write them as you build.

### Commands

```bash
npm test              # the whole suite: font, vault, drivers, network, instances, server, apps, playability
npx tsc --noEmit      # type check (same as npm run typecheck)
npx tsx tests/my-test.ts   # run one test file
```

**Both `npm test` and `npx tsc --noEmit` must pass before you commit.**
To add a test file to the suite, append it to the `test` script in `package.json`.

### Plain TypeScript Implementation

There's no Jest, Mocha or numpy-equivalent. A test is a `.ts` file that
throws (or `process.exit(1)`s) on failure. The headless display is an
`RGB[][]`:

```typescript
this.buffer = Array.from({ length: height }, () =>
  Array.from({ length: width }, () => [0, 0, 0] as RGB)
);
```

### Two Ways to Test

**1. `TestRunner`: one app, headless** (`pizxel/testing`)

```typescript
import { TestRunner } from "../pizxel/testing";
import { InputKeys } from "../pizxel/types";
import { MyApp } from "../pizxel/apps/my-app/my-app";

async function main() {
  const runner = new TestRunner(10.0);           // max duration, seconds
  await runner.start(MyApp);
  await runner.wait(0.5);

  if (runner.display.renderCount < 1) throw new Error("App should render");

  const player = runner.findSprite([0, 255, 0], 10);   // tolerance 10
  if (!player) throw new Error("Player should be visible");

  runner.inject(InputKeys.RIGHT);
  await runner.wait(0.2);

  const moved = runner.findSprite([0, 255, 0], 10);
  if (!moved || moved.x <= player.x) throw new Error("Player should move right");

  runner.stop();
  console.log("✓ MyApp test passed");
}

main().catch((e) => { console.error("✗", e.message); process.exit(1); });
```

The `TestRunner` draws with the real `DisplayBuffer` (it used to be a stub that only drew `setPixel`,
`clear`, `fill` and **filled** `rect`. `line`, `circle`, `text` and
`centeredText`...), so any drawing can be tested.

**2. Full instance with test drivers** (`tests/instance-test.ts`)

Subclass `DisplayDriver`/`InputDriver`, pass them to
`DeviceManager.useDrivers()`, and call `createInstance()`. This runs the
real framework, launcher and `DisplayBuffer`, so every drawing method
works, as do ESC and app switching. Use this for framework, launcher and
isolation tests. `tests/server-test.ts` does the same for the session server
over HTTP/WebSocket.

### Common Test Pitfalls

1. **Colour tolerance**: use `findSprite(color, 10)`, not tolerance 0
2. **Render count**: assert `renderCount >= 1` (or `>= N`), never an exact frame count
3. **Durations**: give the runner a reasonable `maxDuration` (10 s); a short one makes tests flaky
4. **Frame-rate assumptions**: run timing checks at 20fps and 60fps, as `tests/playability-test.ts` does
5. **Clean up**: call `runner.stop()` / `instance.stop()`, or the process keeps running
6. **Isolation**: in instance tests, give each instance its own temp `dataRoot` and remove it afterwards

### Testing Capabilities

**Display:** `runner.pixelAt(x, y)`, `runner.countColor(color, tol)`,
`runner.findSprite(color, tol)`, `runner.display.findBlobs(color, minSize, tol)`,
`runner.display.renderCount`, `runner.snapshot(name)`

**Input:** `runner.inject(key)`, `runner.injectSequence(keys, delayMs)`,
`runner.input.injectRepeat(key, count, delayMs)`

**Timing:** `await runner.wait(seconds)`, `await runner.waitUntil(cond, timeoutSeconds)`

**Assertions:** `assertPixelColor`, `assertColorCount`, `assertSpriteExists`,
`assertSpriteMoved`, `assertRenderCount`, `assertTrue`, `assertFalse`,
`assertEqual`, `assertNotNull`

---

## 📝 Logging

There's no logger module and no `settings/logs/` directory (those were
MatrixOS). PiZXel logs to the console:

- Use `console.log` / `console.error` with a `[Tag]` prefix, e.g. `console.log("[Snake] Game over")`
- For per-frame or per-key diagnostics, use `debugLog()` from `pizxel/core/debug.ts`. It prints only when `PIZXEL_DEBUG` is set, so it doesn't flood output or slow a Pi
- App crashes are logged by the framework as `[AppFramework] App "<name>" crashed:`

```bash
PIZXEL_DEBUG=1 npm run start:canvas
```

In terminal mode the display takes over the screen, so debug with canvas
mode (the logs stay readable in the terminal).

---

## 🎨 Graphics Best Practices

- **Resolution**: 256×192. Use `matrix.getWidth()` / `getHeight()` rather than hard-coding where you can
- **Coordinates**: `(0, 0)` is top-left; x increases right, y increases down; out-of-bounds drawing is clipped
- **Integers**: pass whole numbers (`Math.floor`) for positions computed from floats
- **Text**: 8×8 ZX font, `8 * scale` px per character. `centeredText` for titles; `text(..., undefined, 2)` for big text
- **Nested UI**: use `pushClipRegion`/`popClipRegion` and `pushTransform`/`popTransform` rather than manual offsets
- **Help**: use `HelpModal.create([...])` on Tab, as `pizxel/apps/clock/clock.ts` does

### Performance Tips

1. **Don't call `show()`**: the framework does
2. **Use the dirty flag**: only render when state changes. A clock only needs to redraw once a second
3. **Clear once per render**: `matrix.clear()` / `fill()` at the start of `render()`
4. **Draw only in `render()`**: `onUpdate()` changes state, `render()` draws it
5. **Don't allocate per pixel**: reuse colour tuples (`private readonly red: RGB = [255, 0, 0]`)

---

## 🐛 Common Bugs & Fixes

### Bug: App Doesn't Render

**Causes:** no `dirty = true` initially or after a change; `dirty` never
cleared (renders every frame, which is slow but visible); wrong method name
(`set_pixel`, `drawRect`); the class isn't found by the scanner (check the
export name and `config.json` `main`).

### Bug: App Doesn't Appear in the Launcher

**Causes:** `config.json` is missing `name`, `icon` or `main`; the file named
in `main` doesn't exist; no exported class with `render` and `onEvent`; the
constructor needs arguments; in server mode, `"tier": "optional"` and not
enabled for that session. Startup logs `[AppScanner] Loaded: ...` for each app.

### Bug: Input Not Working

**Causes:** not returning `true` when handled; comparing with the wrong
string (use `InputKeys`); not checking `event.type === "keydown"`; forgot
`dirty = true`.

### Bug: Works Locally, Breaks on the Server (or Leaks Between Sessions)

**Causes:** module-level state; `AppStorage` created at import time;
caching `getAudio()`; network calls with the `https` module, or to hosts not in the app's `"network"`. See
**Instances** above.

### Bug: Test Can't Find Sprite

**Causes:** tolerance 0; wrong colour; drawn with `circle`/`text`/outline
`rect`; didn't wait for a render.

---

## 📁 Project Structure

```
pizxel/                           # repo root
├── pizxel/
│   ├── start.ts                  # Local entry (npm start / start:canvas / start:fb / start:term)
│   ├── start-server.ts           # Session server entry (npm run start:server)
│   ├── standby-manager.ts        # Idle/scheduled screensaver
│   ├── types/index.ts            # App, InputEvent, InputKeys, RGB, driver interfaces
│   ├── core/
│   │   ├── app-framework.ts      # Event loop, lifecycle, dirty-flag rendering, ESC, crash recovery
│   │   ├── display-buffer.ts     # Drawing API (THE `matrix`)
│   │   ├── app-scanner.ts        # config.json discovery, AppConfig (incl. tier)
│   │   ├── instance.ts           # createInstance()
│   │   ├── instance-context.ts   # Per-instance context (AsyncLocalStorage)
│   │   ├── device-manager.ts     # Driver selection
│   │   ├── notification-manager.ts
│   │   ├── font.ts               # ZX Spectrum 8×8 font
│   │   ├── network.ts            # Network policy and server guard
│   │   ├── vault.ts              # Encrypted secrets; api-key.ts: ApiKey helper
│   │   ├── debug.ts              # debugLog() / PIZXEL_DEBUG
│   │   └── app-storage.ts        # Older per-key storage (used by ScoreManager)
│   ├── apps/
│   │   ├── launcher.ts           # Launcher (always loaded, not scanned)
│   │   ├── clock/                # ⏰ config.json + clock.ts, the reference example
│   │   └── standby/              # 💤 config.json + standby.ts
│   ├── drivers/
│   │   ├── base/device-driver.ts # DisplayDriver / InputDriver base classes
│   │   ├── display/              # framebuffer-display, canvas-display-driver, terminal-display
│   │   ├── input/                # keyboard-input, key-map
│   │   └── audio/                # canvas/web audio output, microphone input
│   ├── display/                  # Canvas HTTP + Socket.IO server
│   ├── server/                   # Session server: server, session, session-manager, session-drivers
│   ├── ui/                       # Widgets, layouts, HelpModal, OnScreenKeyboard…
│   ├── game/                     # Sprite, collision, physics, Score/Lives/Timer…
│   ├── storage/                  # AppStorage (use this one)
│   ├── audio/                    # Audio API, Sounds
│   ├── lib/                      # Emoji spritesheet + loader
│   └── testing/                  # TestRunner, HeadlessDisplay, InputSimulator, Assertions
├── tests/                        # npm test: see docs/API_REFERENCE.md#testing
├── docs/
│   ├── API_REFERENCE.md          # THE SOURCE OF TRUTH for APIs
│   ├── DISPLAY_MODES.md          # Drivers and troubleshooting
│   └── session-api.md            # Session server HTTP/WebSocket API
├── data/                         # Runtime data + user apps (git-ignored)
├── matrixos-archive/             # Old Python version, reference only
├── Dockerfile                    # Session server image
├── package.json
└── AGENTS.md                     # This file
```

---

## 📚 Essential Reading

**Before coding, read these:**

1. **[docs/API_REFERENCE.md](docs/API_REFERENCE.md)** ⭐: every API apps use. **Check it before using any method!**
2. **[pizxel/types/index.ts](pizxel/types/index.ts)**: the `App` interface and `InputKeys`
3. **[pizxel/apps/clock/](pizxel/apps/clock/)**: a complete, idiomatic app
4. **[docs/DISPLAY_MODES.md](docs/DISPLAY_MODES.md)**: drivers and hardware
5. **[docs/session-api.md](docs/session-api.md)**: only if you're touching server mode
6. **[README.md](README.md)**: quick start and overview

---

## 🔍 Debugging Workflow

1. **Run it in the browser**: `npm run start:canvas`, open http://localhost:3001, and watch the terminal output
2. **Turn on debug logs**: `PIZXEL_DEBUG=1 npm run start:canvas`
3. **Type check**: `npx tsc --noEmit` catches wrong method names and signatures before runtime
4. **Run the tests**: `npm test`
5. **Test the app headless** with `TestRunner` (see above)
6. **Check for Python-era API names**:
   ```bash
   grep -rnE "set_pixel|centered_text|drawRect|drawLine|matrix\.pixel\(" pizxel/
   ```
   It should find nothing.

---

## 💡 Development Tips

### When Adding New Features
1. **Write the test first**
2. **Check API_REFERENCE.md**. Don't guess method names
3. **Keep local mode working.** Server mode is an addition
4. **Log usefully** (`[Tag]` prefixes, `debugLog` for noisy output)
5. **Update the docs** (README, API_REFERENCE, this file)
6. **Run `npm test` and `npx tsc --noEmit`**

### When Fixing Bugs
1. Reproduce it in a test
2. Read the console output: crashes are logged with the app name
3. Fix it, confirm the test passes, and keep the test

### When Refactoring
1. Run the tests first to establish a baseline
2. Make small changes and run the tests after each one
3. Extend existing seams (drivers, `createInstance` options, context) instead of redesigning

---

## 🎯 Quick Reference

```typescript
// Drawing (matrix: DisplayBuffer)
matrix.clear();                  matrix.fill([0, 0, 32]);
matrix.setPixel(x, y, color);    matrix.getPixel(x, y);
matrix.line(x0, y0, x1, y1, color);
matrix.rect(x, y, w, h, color, fill?);
matrix.circle(cx, cy, r, color, fill?);
matrix.text(str, x, y, color, bgColor?, scale?);
matrix.centeredText(str, y, color);

// Input
event.type === "keydown"
event.key === InputKeys.UP / DOWN / LEFT / RIGHT / OK / ACTION / BACK / HELP

// Lifecycle
dirty = true              // request render
onActivate()              // foreground
onDeactivate()            // background
onUpdate(dt)              // every frame, dt in seconds
onEvent(event) → boolean  // true = handled
render(matrix)            // draw, then dirty = false
onBackgroundTick()        // optional, ~1/s while inactive

// Services
new AppStorage("my-app")         // from "../../storage"
getAudio()?.play(Sounds.COIN)    // from "../../game"
HelpModal.create([...])          // from "../../ui"

// Testing
const runner = new TestRunner(10);
await runner.start(MyApp);
runner.inject(InputKeys.ACTION);
await runner.wait(0.5);
runner.findSprite([0, 255, 0], 10);
```

### Files You'll Edit Most

- `pizxel/apps/<your-app>/config.json`: metadata and emoji icon
- `pizxel/apps/<your-app>/<your-app>.ts`: the app class
- `tests/<your-app>-test.ts`: its test (add it to `npm test`)

---

## 🚀 Getting Started Checklist

- [ ] Read this entire document
- [ ] Read [docs/API_REFERENCE.md](docs/API_REFERENCE.md)
- [ ] `npm ci`, then `npm test` and `npx tsc --noEmit` to verify your setup
- [ ] Read `pizxel/apps/clock/` (config.json + clock.ts)
- [ ] Understand the event-driven model (no blocking loops!)
- [ ] Remember: `setPixel`, `centeredText` (camelCase, TypeScript)
- [ ] Remember: `"icon": "🎮"` (emoji, not pixel art)
- [ ] Remember: local mode and the Pi must keep working; server mode is an addition

---

## ⚠️ Common AI Assistant Pitfalls

**1. Suggesting Dependencies Without Checking**
- ❌ "Let's add lodash / a game engine / an image library"
- ✅ **ALWAYS ASK**: "Is this dependency absolutely necessary? Can we do it in plain TypeScript? Will it install on a Pi?"

**2. Using Wrong or Python-Era API Names**
- ❌ `matrix.set_pixel`, `matrix.pixel`, `matrix.drawRect`, `matrix.show()`
- ❌ `from matrixos.app_framework import App`, `def run(os_context)`
- ✅ **CHECK** `docs/API_REFERENCE.md`; let `npx tsc --noEmit` catch mistakes

**3. Creating Pixel Art When an Emoji Exists**
- ✅ `"icon": "🐸"` beats 2485 bytes of pixel data

**4. Blocking Loops in Apps**
- ❌ `while (true)`, busy-waits, synchronous sleeps
- ✅ Use `onUpdate()`, `onEvent()`, `render()`

**5. Forgetting the Dirty Flag**
- ✅ Every visible state change sets `this.dirty = true`; `render()` ends with `this.dirty = false`

**6. Tests That Don't Test Reality**
- ❌ Exact frame counts, tolerance 0, tiny timeouts, timing tested at only one frame rate
- ✅ `>= 1` renders, tolerance 10, `maxDuration` 10 s, filled shapes or a full-instance test

**7. Ignoring the Console**
- ✅ Crashes, scanner failures and driver selection are all logged. Read them

**8. Assuming APIs Work Like Other Frameworks**
- ❌ "In pygame / React / Phaser you do X, so…"
- ✅ PiZXel has its own patterns. Read the docs and `pizxel/types`

**9. Over-Engineering**
- ✅ If it works and it's readable, ship it

**10. Redesigning Instead of Extending**
- ❌ Rewriting `start.ts`, the framework or drivers to suit server mode
- ❌ Changes that only work when `npm run start:server` is running
- ✅ Add options, drivers or context fields; check `npm start` and `--fb` still behave the same

**11. Not Running Tests After Changes**
- ✅ `npm test && npx tsc --noEmit` before every commit

### Pre-Change Verification Checklist

```markdown
- [ ] Have I read AGENTS.md and checked API_REFERENCE.md for method names?
- [ ] Is this plain TypeScript with no unnecessary dependencies?
- [ ] Does it follow the event-driven pattern (no blocking loops)?
- [ ] Is the dirty flag set after state changes and cleared in render()?
- [ ] Will it run on a Raspberry Pi (limited CPU/RAM)?
- [ ] Should the icon be an emoji?
- [ ] Is there useful logging (debugLog for noisy output)?
- [ ] Is it safe with many instances in one process (no module-level state)?
- [ ] Do local modes (canvas, terminal, framebuffer) still work unchanged?
- [ ] Does it need a test? (Probably yes)
- [ ] Do `npm test` and `npx tsc --noEmit` pass?
```

---

## 🎓 Lessons Learned

1. **API names matter.** Wrong method names caused multiple bugs. TypeScript now catches most of them, so run `tsc`
2. **Testing saves time.** Bugs caught in tests are far cheaper than bugs found on hardware
3. **Plain code works.** Arrays of tuples are fine for 256×192
4. **The dirty flag is critical.** Most rendering bugs come from forgetting to set it
5. **Tolerance is necessary.** Exact colour matches are brittle
6. **Emoji are powerful.** Real emoji icons are simpler than pixel art
7. **Event-driven is cleaner.** Apps don't manage loops; the framework does
8. **Extend, don't redesign.** Running many PiZXels per process came from adding an instance context and drivers, not rewriting the OS, so the Pi build kept working throughout

### What to Watch Out For

- ⚠️ Method names (check the docs, run `tsc`)
- ⚠️ Dirty flag management
- ⚠️ `onEvent` return values
- ⚠️ Module-level state (breaks session isolation)
- ⚠️ Counting frames instead of using `deltaTime` (games run 3x slow on pizxel.uk)
- ⚠️ API keys in plain storage or logs: use the vault, never log them
- ⚠️ Two `AppStorage` classes: use `pizxel/storage`, not `core/app-storage`

---

## 🏁 Final Words

**When in doubt, check `docs/API_REFERENCE.md` and the TypeScript source. The code is the source of truth, and the docs should follow it.**

**Happy coding!** 🎮✨
