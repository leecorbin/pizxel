# PiZXel

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node 18+](https://img.shields.io/badge/node-18+-green.svg)](https://nodejs.org/)

**A retro-aesthetic OS for LED matrix displays: looks like 1983, works like 2025.** Run it on a Raspberry Pi with an LED matrix or framebuffer display, in your terminal, or in a browser. Try it online at **[pizxel.uk](https://pizxel.uk)**.

## 🎯 Quick Start

### Installation

**1. Clone the repository:**
```bash
git clone https://github.com/leecorbin/pizxel.git
cd pizxel
```

**2. Install dependencies** (Node.js 18 or later):
```bash
npm ci
```

**3. Run PiZXel:**
```bash
npm start               # Auto-detect: framebuffer → browser canvas → terminal
npm run start:canvas    # Browser canvas at http://localhost:3001
npm run start:fb        # Framebuffer (Raspberry Pi display)
npm run start:term      # Terminal
```

Navigate with arrow keys, press **Enter** to launch apps, **Space** for jump/fire/action in games, **ESC** to go back, **TAB** for help.

## 🌐 Session Server (pizxel.uk)

`npm run start:server` runs many isolated PiZXels in one process, one per
visitor session, for the [pizxel.uk](https://pizxel.uk) website. It's an
extra mode: the local modes above are unaffected. The website talks to it
over an internal API described in [docs/session-api.md](docs/session-api.md).

```bash
ENGINE_TOKEN=change-me npm run start:server
```

Or with Docker:

```bash
docker build -t pizxel-engine .
docker run -p 3001:3001 -e ENGINE_TOKEN=change-me -v pizxel-data:/data pizxel-engine
```

Configuration (environment variables):

| Variable | Default | Meaning |
|---|---|---|
| `ENGINE_TOKEN` | (required) | Bearer token the website sends on every request |
| `PORT` | `3001` | HTTP and WebSocket port |
| `DATA_ROOT` | `./data/server` (`/data` in Docker) | Session data directory |
| `MAX_LIVE_SESSIONS` | `10` | Sessions running at once |
| `FPS_CAP` | `20` | Maximum frames per second per session |
| `IDLE_SUSPEND_SECONDS` | `60` | Delay before suspending a session with no viewers |
| `EXTRA_APPS_DIR` | (none) | Extra apps directory |
| `INCLUDE_PRIVATE_APPS` | `false` | Load `private` tier apps (for a private instance) |
| `ALLOW_NETWORK` | `false` | Allow outbound requests to the hosts the instance's apps declare in their manifests (otherwise the server blocks all outbound requests) |
| `PIZXEL_DEBUG` | (off) | Per-frame and per-key debug logging (any mode) |

Apps that contact the internet list their hosts in `config.json`
(`"network": ["newsapi.org"]`); `npm run egress-allowlist -- <apps dir>`
writes an egress proxy allowlist from them. Apps keep API keys in an
encrypted vault (`this.secrets`, or the `ApiKey` helper in
`pizxel/core/api-key.ts`); locally its key is in `~/.config/pizxel/vault.key`
(or `PIZXEL_VAULT_KEY_FILE`).

Each app's `config.json` can set `"tier"`: `"core"` (preinstalled, the
default), `"optional"` (added per visitor from the pizxel.uk app shelf) or
`"private"` (only on a private instance). Local modes ignore tiers and load
every app.

Local modes also read `CANVAS_PORT` (default `3001`), `CANVAS_PIXEL_SIZE`
(default `3`) and `PIZXEL_DATA_ROOT` (where saved data lives; default
`data/default-user`, e.g. point it elsewhere to test without touching your
own data).

## ✨ Key Features

### OS-Like Application Environment
- **Event-driven apps**: the framework runs the loop (~60fps); apps implement lifecycle methods and never block
- **Dirty-flag rendering**: an app is only redrawn when it sets `dirty = true`
- **Background ticks**: inactive apps get `onBackgroundTick()` about once a second
- **Notifications**: a background app can ask for attention; Enter switches to it
- **Standby**: an animated screensaver after idle time or on a schedule
- **Crash recovery**: an app that throws returns you to the launcher with the error shown
- **Per-app storage**: `AppStorage` saves key-value data as JSON under `data/`

### Built-in Apps
- **Launcher**: grid of app icons (emoji); apps with `"category": "game"` go in a Games folder
- **Clock** ⏰: analog and digital clock (Space toggles)
- **Standby** 💤: screensaver modes

### Graphics and UI
- 256×192 display buffer (ZX Spectrum resolution) with RGB colour
- Pixels, lines, rectangles and circles, filled or outlined
- Authentic ZX Spectrum 8×8 font, with scaling
- Clip regions and transforms for nested UI
- Widget toolkit in `pizxel/ui`: Label, Button, TextInput, Toggle, Slider, ProgressBar, Modal, HelpModal, TabView, OnScreenKeyboard, VStack/HStack/Grid layouts and more
- Game helpers in `pizxel/game`: sprites, collision, physics, score, lives and timers
- Emoji icons rendered from a bundled spritesheet
- Sound effects in browser modes (`getAudio()`)

### Runs Anywhere
- **Framebuffer**: Raspberry Pi display or HDMI via `/dev/fb0`
- **Browser canvas**: `http://localhost:3001`, with audio
- **Terminal**: ANSI true-colour output in any terminal or SSH session
- **Session server**: many isolated PiZXels for [pizxel.uk](https://pizxel.uk) (see above)

The same app code runs unchanged in every mode.

## 🎯 Target Hardware

PiZXel renders at **256×192** (the ZX Spectrum's resolution) and scales to fit the output with whole-number scaling, so pixels stay square and sharp.

- **Raspberry Pi** (Zero 2 W, 3, 4 or 5) running Node.js 18+
- **Display**: official 7" touchscreen, an HDMI screen, or any display that provides `/dev/fb0`
- **Controls**: USB or Bluetooth keyboard (arrows, Enter, Space, ESC, Tab)

On the Pi, add your user to the `video` group for framebuffer access, then run `npm start` (it picks the framebuffer automatically) or `npm run start:fb`. See [docs/DISPLAY_MODES.md](docs/DISPLAY_MODES.md) for the drivers, auto-detection and troubleshooting.

**Status:**
- ✅ Framebuffer, browser canvas and terminal display drivers
- ✅ Browser audio output and microphone input (canvas mode)
- ⏳ HUB75 RGB LED matrix panel driver (not written yet)
- ⏳ Audio on framebuffer and terminal
- ⏳ Gamepad and GPIO button input

## 🎮 Creating Apps

An app is a folder containing a `config.json` and a TypeScript file whose class implements the `App` interface. PiZXel finds apps when it starts, so there's nothing to register.

- **Built-in apps**: `pizxel/apps/<id>/`
- **Your own apps**: `data/default-user/apps/<id>/` (ignored by git). Import paths from there start with `../../../../pizxel/`.

### config.json

```json
{
  "name": "Hello",
  "version": "1.0.0",
  "description": "Move a square with the arrow keys",
  "author": "You",
  "icon": "👋",
  "main": "hello.ts",
  "color": [0, 255, 0],
  "category": "utility",
  "tier": "optional"
}
```

| Field | Required | Meaning |
|---|---|---|
| `name` | yes | Display name in the launcher |
| `icon` | yes | An emoji. Use emoji, not pixel art |
| `main` | yes | The app's file (e.g. `hello.ts`), or its name without `.ts` |
| `version`, `description`, `author` | no | Metadata |
| `color` | no | `[r, g, b]` theme colour for the launcher (default white) |
| `category` | no | `"game"` puts the app in the launcher's Games folder |
| `tier` | no | Session server only: `"core"` (default) means on for every visitor; `"optional"` means off until the website enables it for a session. Local modes load every app regardless of tier |

The scanner loads the class exported as `<Main>App` (e.g. `HelloApp` for `hello.ts`), an export named after `main`, the default export, or else the first export whose name ends in `App`.

### Minimal App

`pizxel/apps/hello/hello.ts`:

```typescript
import { App, InputEvent, InputKeys, RGB } from "../../types";
import { DisplayBuffer } from "../../core/display-buffer";

export class HelloApp implements App {
  readonly name = "Hello";
  dirty = true; // request the first render

  private x = 120;
  private y = 90;
  private readonly green: RGB = [0, 255, 0];

  onActivate(): void {
    this.dirty = true;
  }

  onDeactivate(): void {}

  onUpdate(deltaTime: number): void {
    // Per-frame logic goes here; set this.dirty = true when state changes
  }

  onEvent(event: InputEvent): boolean {
    if (event.type !== "keydown") return false;

    switch (event.key) {
      case InputKeys.LEFT:  this.x -= 4; break;
      case InputKeys.RIGHT: this.x += 4; break;
      case InputKeys.UP:    this.y -= 4; break;
      case InputKeys.DOWN:  this.y += 4; break;
      default:
        return false; // let the framework handle it (ESC → launcher)
    }
    this.dirty = true;
    return true;
  }

  render(matrix: DisplayBuffer): void {
    matrix.clear();
    matrix.centeredText("HELLO PIZXEL!", 20, [255, 255, 0]);
    matrix.rect(this.x, this.y, 16, 16, this.green, true);
    this.dirty = false;
  }
}
```

### App Lifecycle

The framework calls these methods on your app (defined in [pizxel/types/index.ts](pizxel/types/index.ts)):

| Method | When |
|---|---|
| `onActivate()` | The app comes to the foreground. May be `async` |
| `onDeactivate()` | The app goes to the background or PiZXel stops |
| `onUpdate(deltaTime)` | Every frame while active; `deltaTime` is in **seconds** |
| `onEvent(event)` | A key was pressed. Return `true` if you handled it |
| `render(matrix)` | Called after `onUpdate` whenever `dirty` is `true`. Draw everything, then set `dirty = false` |
| `onBackgroundTick()` | Optional. About once a second while the app is inactive |

Keys the app doesn't handle go to the framework: **ESC** returns to the launcher. Press **Ctrl+C** in the terminal to quit PiZXel.

A worked example with a help modal (Tab) is [pizxel/apps/clock/](pizxel/apps/clock/).

## 📖 API Reference

The short version is below. See **[docs/API_REFERENCE.md](docs/API_REFERENCE.md)** for everything.

### Drawing (`DisplayBuffer`, the `matrix` passed to `render`)

Colours are `RGB` tuples: `[r, g, b]` with each value 0–255. Origin `(0, 0)` is top-left, and drawing outside the screen is clipped safely.

```typescript
matrix.clear();                                  // black
matrix.fill([0, 0, 32]);                         // fill with a colour
matrix.setPixel(x, y, [255, 0, 0]);
matrix.getPixel(x, y);                           // → RGB
matrix.line(x0, y0, x1, y1, [255, 255, 255]);
matrix.rect(x, y, width, height, [0, 255, 0]);           // outline
matrix.rect(x, y, width, height, [0, 255, 0], true);     // filled
matrix.circle(cx, cy, radius, [0, 255, 255], true);
matrix.text("HELLO", x, y, [255, 255, 255]);              // 8×8 ZX font
matrix.text("BIG", x, y, [255, 255, 0], undefined, 2);    // bgColor, scale
matrix.centeredText("GAME OVER", y, [255, 0, 0]);
matrix.getWidth();  matrix.getHeight();          // 256, 192
```

For widgets and scrolling: `pushClipRegion(x, y, w, h)` / `popClipRegion()` and `pushTransform(dx, dy)` / `popTransform()`.

### Input

`event.key` holds the key name. Use the `InputKeys` constants:

| Constant | Key | Value |
|---|---|---|
| `InputKeys.UP` / `DOWN` / `LEFT` / `RIGHT` | Arrow keys | `"ArrowUp"` … |
| `InputKeys.OK` | Enter | `"Enter"` |
| `InputKeys.ACTION` | Space (jump/fire) | `" "` |
| `InputKeys.BACK` | Backspace | `"Backspace"` |
| `InputKeys.HOME` | ESC (framework returns to the launcher) | `"Escape"` |
| `InputKeys.HELP` | Tab | `"Tab"` |

Other printable keys arrive as their character (e.g. `"a"`).

### Storage, Audio and Helpers

```typescript
import { AppStorage } from "../../storage";
const storage = new AppStorage("hello");         // data/default-user/storage/hello.json
storage.set("highScore", 1200);
const best = storage.get<number>("highScore");

import { getAudio, Sounds } from "../../game";
getAudio()?.play(Sounds.COIN);                   // null when there's no audio
getAudio()?.beep(440, 100);

import { HelpModal, Button, VStack } from "../../ui";
import { Sprite, rectRect, ScoreManager } from "../../game";
```

## 📁 Project Structure

```
pizxel/
├── pizxel/
│   ├── start.ts               # Local entry point (npm start)
│   ├── start-server.ts        # Session server entry point (npm run start:server)
│   ├── standby-manager.ts     # Idle and scheduled screensaver
│   ├── types/index.ts         # App interface, InputEvent, InputKeys, RGB
│   ├── core/
│   │   ├── app-framework.ts   # Event loop, lifecycle, dirty-flag rendering
│   │   ├── display-buffer.ts  # Drawing API (the `matrix` apps draw on)
│   │   ├── app-scanner.ts     # Finds apps via config.json
│   │   ├── instance.ts        # createInstance(): one running PiZXel
│   │   ├── instance-context.ts # Per-instance data root, audio, framework
│   │   ├── device-manager.ts  # Picks display/input drivers by priority
│   │   ├── notification-manager.ts
│   │   ├── font.ts            # ZX Spectrum 8×8 font
│   │   ├── network.ts         # Outbound network policy (off in server mode)
│   │   └── debug.ts           # PIZXEL_DEBUG logging
│   ├── apps/
│   │   ├── launcher.ts        # Launcher (always loaded)
│   │   ├── clock/             # config.json + clock.ts
│   │   └── standby/           # config.json + standby.ts
│   ├── drivers/
│   │   ├── base/              # DisplayDriver / InputDriver base classes
│   │   ├── display/           # framebuffer, canvas, terminal
│   │   ├── input/             # keyboard + shared key map
│   │   └── audio/             # browser audio output and microphone input
│   ├── display/               # Canvas HTTP + Socket.IO server
│   ├── server/                # Session server for pizxel.uk
│   ├── ui/                    # Widget toolkit
│   ├── game/                  # Sprites, collision, physics, game utilities
│   ├── storage/               # AppStorage
│   ├── audio/                 # Audio API and named Sounds
│   ├── lib/                   # Emoji spritesheet and loader
│   └── testing/               # TestRunner, HeadlessDisplay, InputSimulator, Assertions
├── tests/                     # npm test
├── docs/                      # Documentation
├── data/                      # Runtime data: saved settings, user apps (git-ignored)
├── matrixos-archive/          # The earlier Python version, for reference only
├── Dockerfile                 # Session server image
└── package.json
```

## 🧪 Testing

```bash
npm test              # Instance isolation + session server tests
npx tsc --noEmit      # Type check (also: npm run typecheck)
```

Both must pass before you commit.

To test an app on its own, use the headless `TestRunner` in [pizxel/testing/](pizxel/testing/). Run the file with `npx tsx`:

```typescript
import { TestRunner } from "../pizxel/testing";
import { InputKeys } from "../pizxel/types";
import { HelloApp } from "../pizxel/apps/hello/hello";

async function main() {
  const runner = new TestRunner(10.0);      // max duration in seconds
  await runner.start(HelloApp);
  await runner.wait(0.5);

  if (runner.display.renderCount < 1) throw new Error("App should render");

  const before = runner.findSprite([0, 255, 0], 10);   // centre of a colour
  if (!before) throw new Error("Square should be visible");

  runner.inject(InputKeys.RIGHT);
  await runner.wait(0.2);

  const after = runner.findSprite([0, 255, 0], 10);
  if (!after || after.x <= before.x) throw new Error("Square should move right");

  runner.stop();
  console.log("✓ Hello test passed");
}

main().catch((error) => {
  console.error("✗", error.message);
  process.exit(1);
});
```

**Limitation:** the `TestRunner` mock display only draws `setPixel`, `clear`, `fill` and filled `rect`. `line`, `circle`, `text` and `centeredText` draw nothing in it. To check those, run a full instance with a test display driver as [tests/instance-test.ts](tests/instance-test.ts) does.

To make it part of `npm test`, add the file to the `test` script in `package.json`.

## 📚 Documentation

- **[docs/API_REFERENCE.md](docs/API_REFERENCE.md)**: app interface, drawing, input, storage, audio, UI, testing
- **[docs/DISPLAY_MODES.md](docs/DISPLAY_MODES.md)**: display drivers, auto-detection, troubleshooting
- **[docs/session-api.md](docs/session-api.md)**: session server API for pizxel.uk
- **[AGENTS.md](AGENTS.md)**: guide for AI assistants (and humans) working on the code

The Python-era guides (hardware build, ZX Spectrum emulator plan, vision) are in [matrixos-archive/docs/](matrixos-archive/docs/). They describe the old code but the goals still apply.

## 🤝 Contributing

Contributions welcome! This project is in active development.

**Areas where help is needed:**
- Apps and games (bring back the MatrixOS classics: Snake, Tetris, Frogger…)
- Tests for existing apps
- HUB75 LED matrix driver and hardware testing
- Documentation improvements
- Bug reports and feature requests

## 🏆 Inspiration

PiZXel is inspired by:
- **ZX Spectrum** - The legendary 8-bit computer and its beautiful font
- **Picture frame computers** - Computing meets art
- **Retro gaming** - Classic games on LED matrices
- **Embedded systems** - Tiny computers doing big things
- **Modern dev practices** - Testing, logging, and clean architecture with a retro aesthetic

## 📜 License

MIT License - See [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Sinclair Research for the ZX Spectrum font
- Adafruit for excellent LED matrix hardware and docs
- The Raspberry Pi Foundation
- [rpi-rgb-led-matrix](https://github.com/hzeller/rpi-rgb-led-matrix) library by Henner Zeller

---

**Built with ❤️ for LED matrices and retro computing!**

Want to discuss the project? Open an issue or discussion on GitHub!

🎮🖼️✨
