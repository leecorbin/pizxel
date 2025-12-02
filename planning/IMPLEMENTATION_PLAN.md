# PiZXel Implementation Plan

**Migration from Python MatrixOS to TypeScript PiZXel**

Generated: November 22, 2025

---

## Executive Summary

This document outlines the complete migration plan from Python-based MatrixOS to TypeScript-based PiZXel. The migration preserves the excellent device driver architecture while modernizing the tech stack for better ecosystem compatibility with JSSpeccy3 and future integrations.

**Core Philosophy:** "Look like 1983, work like 2025"

**Key Decisions:**

- Language: TypeScript (strict mode) with Node.js runtime
- Display: node-canvas + HTTP server for development, terminal fallback always available
- Structure: `/pizxel/` (git-tracked OS) + `/data/` (gitignored user data)
- JSSpeccy3: Dynamic download to `/data/all-users/cache/`, GPL isolation
- Architecture: Preserve MatrixOS device driver abstraction patterns

---

## Project Structure

```
/Users/leecorbin/Desktop/MatrixOS/
├── pizxel/                          # New TypeScript OS (git tracked)
│   ├── core/                        # Core framework
│   │   ├── app-framework.ts         # App lifecycle, event loop
│   │   ├── device-manager.ts        # Device coordination
│   │   ├── display-buffer.ts        # 256×192 RGB buffer
│   │   └── config.ts                # Configuration loader
│   ├── drivers/                     # Device drivers
│   │   ├── base/
│   │   │   ├── display-driver.ts    # Abstract base class
│   │   │   └── input-driver.ts      # Abstract base class
│   │   ├── display/
│   │   │   ├── terminal-display.ts  # ANSI terminal (always available)
│   │   │   ├── canvas-http.ts       # node-canvas + HTTP server
│   │   │   └── led-matrix.ts        # rpi-rgb-led-matrix (Pi only)
│   │   └── input/
│   │       ├── keyboard-input.ts    # stdin keyboard
│   │       ├── http-input.ts        # WebSocket from browser
│   │       └── gpio-input.ts        # Physical buttons (Pi)
│   ├── apps/                        # Built-in apps
│   │   ├── launcher/                # Icon-based app launcher
│   │   ├── clock/                   # Clock app
│   │   └── settings/                # System settings
│   ├── lib/                         # Utilities
│   │   ├── logger.ts                # Logging system
│   │   ├── emoji-loader.ts          # Emoji icon system
│   │   └── graphics.ts              # Drawing primitives
│   ├── types/                       # TypeScript definitions
│   │   ├── app.d.ts
│   │   ├── device.d.ts
│   │   └── index.d.ts
│   ├── config/                      # Configuration files
│   │   └── system-config.json
│   ├── package.json
│   ├── tsconfig.json
│   └── index.ts                     # Entry point
│
├── data/                            # User data (gitignored)
│   ├── default-user/                # Default user profile
│   │   ├── apps/                    # User-installed apps
│   │   ├── settings/                # User settings
│   │   └── logs/                    # User app logs
│   └── all-users/                   # Shared data
│       ├── cache/                   # Cached data
│       │   ├── emoji/               # Emoji sprite cache
│       │   └── jsspeccy3/           # JSSpeccy3 emulator (git cloned)
│       └── shared-apps/             # Shared apps
│
├── matrixos-archive/                # Old Python code (reference)
│   ├── matrixos/
│   ├── examples/
│   ├── apps/
│   ├── tests/
│   └── docs/
│
├── scripts/                         # Build and utility scripts
│   ├── setup-jsspeccy3.sh           # Download JSSpeccy3
│   ├── build.sh                     # TypeScript build
│   └── dev.sh                       # Development mode
│
├── new-architecture/                # Planning documents
│   ├── summary.md                   # Architecture vision
│   └── IMPLEMENTATION_PLAN.md       # This document
│
├── .gitignore                       # Exclude data/, node_modules/, jsspeccy3/
├── package.json                     # Root package.json
├── README.md                        # Updated for PiZXel
└── .specstory/                      # Conversation history (submodule)
```

**Rationale for Structure:**

1. **`/pizxel/` not `/pizxel/src/pizxel/`**: Avoids nested redundancy. Clean imports: `import { App } from './core/app-framework'`

2. **`/data/` separation**: Gitignored user data enables `git pull` upgrades without losing user content. Clean separation of OS vs user space.

3. **`/matrixos-archive/`**: Preserves working Python code for reference during port. Can delete after migration complete.

4. **JSSpeccy3 in `/data/all-users/cache/`**: GPL code never committed. Dynamic download via script. Legal isolation from MIT core.

---

## Design Decisions

### 1. TypeScript Over Python

**Decision:** Migrate to TypeScript with Node.js runtime

**Rationale:**

- JSSpeccy3 is JavaScript - native integration without subprocess overhead
- Existing work dashboard already Node.js-based
- Better type safety than Python for complex apps
- npm ecosystem for dependencies
- Easier browser-based development tools

**Trade-offs:**

- More boilerplate than Python (types, interfaces)
- Lose Pygame (but gain node-canvas + browser)
- Team needs TypeScript familiarity

### 2. node-canvas + HTTP Server for Development

**Decision:** Use node-canvas to render display buffer, serve via HTTP, browser shows output

**Rationale:**

- Pure JavaScript - no C++ compilation needed on Mac
- Browser-based display is bonus feature (remote Pi access!)
- Lightweight - just canvas rendering + WebSocket
- Terminal fallback always available (ANSI escape codes)
- Avoids SDL2/pygame native dependencies

**Trade-offs:**

- Slightly more latency than native window
- Requires browser open during development
- But simpler setup, no platform-specific builds

### 3. Device Driver Architecture Preservation

**Decision:** Port MatrixOS device driver system to TypeScript

**Rationale:**

- Current architecture is excellent - priority system, auto-detection, platform awareness
- Clean abstraction: DisplayDriver/InputDriver base classes
- DeviceManager coordinates lifecycle
- Easy to add new hardware (e.g., future HDMI driver)

**What to Port:**

- Base classes: `DisplayDriver`, `InputDriver`
- Priority system: drivers declare priority, manager selects highest available
- Lifecycle: `initialize()`, `shutdown()`, `isAvailable()`
- Platform detection: macOS, Linux, Raspberry Pi

### 4. JSSpeccy3 Integration

**Decision:** Dynamic download to `/data/all-users/cache/jsspeccy3/`, intercept frame buffer via WebSocket/polling

**Rationale:**

- GPL code never distributed with MIT core
- User downloads on first run via `scripts/setup-jsspeccy3.sh`
- Frame buffer interception without modifying JSSpeccy3 code
- Legal isolation, user consent

**Technical Approach:**

- JSSpeccy3 runs in separate process (or Web Worker)
- Intercept canvas.putImageData() calls
- Copy frame buffer to PiZXel display buffer
- User sees ZX Spectrum output on LED matrix

---

## Implementation Phases

### Phase 0: Foundation (Week 1)

**Goal:** Set up TypeScript project, implement device driver base classes

**Tasks:**

1. ✅ Create `/new-architecture/IMPLEMENTATION_PLAN.md` (this document)
2. ✅ Update `.gitignore` (add jsspeccy3/, node_modules/, dist/, data/)
3. ✅ Commit current Python state with tag `v2.0-final-python`
4. Create project structure:
   ```bash
   mkdir -p pizxel/{core,drivers/{base,display,input},apps,lib,types,config}
   mkdir -p data/{default-user/{apps,settings,logs},all-users/cache}
   mkdir -p scripts
   mkdir -p matrixos-archive
   ```
5. Move Python code to archive:
   ```bash
   mv matrixos/ matrixos-archive/
   mv examples/ matrixos-archive/
   mv apps/ matrixos-archive/
   mv tests/ matrixos-archive/
   mv docs/ matrixos-archive/
   ```
6. Initialize TypeScript:
   ```bash
   npm init -y
   npm install --save typescript @types/node
   npm install --save canvas  # node-canvas
   npm install --save express socket.io  # HTTP server + WebSocket
   npx tsc --init
   ```
7. Configure `tsconfig.json`:
   ```json
   {
     "compilerOptions": {
       "target": "ES2020",
       "module": "commonjs",
       "lib": ["ES2020"],
       "outDir": "./dist",
       "rootDir": "./pizxel",
       "strict": true,
       "esModuleInterop": true,
       "skipLibCheck": true,
       "forceConsistentCasingInFileNames": true,
       "resolveJsonModule": true,
       "declaration": true,
       "declarationMap": true,
       "sourceMap": true
     },
     "include": ["pizxel/**/*"],
     "exclude": ["node_modules", "dist", "matrixos-archive"]
   }
   ```
8. Create `package.json` scripts:
   ```json
   {
     "scripts": {
       "build": "tsc",
       "dev": "tsc --watch",
       "start": "node dist/index.js",
       "test": "echo \"Tests coming in Phase 3\""
     }
   }
   ```
9. Implement base classes:
   - `pizxel/drivers/base/display-driver.ts`
   - `pizxel/drivers/base/input-driver.ts`
   - `pizxel/core/device-manager.ts`
10. Implement first drivers:
    - `pizxel/drivers/display/terminal-display.ts` (ANSI fallback)
    - `pizxel/drivers/input/keyboard-input.ts` (stdin)
11. Create `pizxel/index.ts` entry point:

    ```typescript
    import { DeviceManager } from "./core/device-manager";

    async function main() {
      const deviceManager = new DeviceManager();
      await deviceManager.initialize();
      console.log("PiZXel initialized");
      // Test pattern
      const display = deviceManager.getDisplay();
      for (let y = 0; y < 192; y++) {
        for (let x = 0; x < 256; x++) {
          display.setPixel(x, y, [x % 256, y % 192, 128]);
        }
      }
      display.show();
    }

    main();
    ```

**Success Criteria:**

- `npm run build` compiles without errors
- `npm start` shows test pattern in terminal
- DeviceManager selects TerminalDisplay automatically
- Keyboard input echoes to console

---

### Phase 1: App Framework (Week 2)

**Goal:** Port app lifecycle, event loop, dirty flag pattern

**Tasks:**

1. Implement `pizxel/types/app.d.ts`:

   ```typescript
   export interface App {
     name: string;
     onActivate(): void;
     onDeactivate(): void;
     onUpdate(deltaTime: number): void;
     onEvent(event: InputEvent): boolean;
     render(matrix: DisplayBuffer): void;
     onBackgroundTick?(): void;
   }

   export interface InputEvent {
     key: string;
     type: "keydown" | "keyup";
     timestamp: number;
   }
   ```

2. Implement `pizxel/core/app-framework.ts`:
   - Event loop (~60fps)
   - Dirty flag tracking
   - App lifecycle coordination
   - Background tick for inactive apps
3. Implement `pizxel/core/display-buffer.ts`:
   - 256×192 RGB buffer
   - Drawing primitives: `setPixel()`, `clear()`, `line()`, `rect()`, `circle()`, `text()`
   - ZX Spectrum font loading
4. Port graphics utilities:
   - `pizxel/lib/graphics.ts` (drawing algorithms)
   - `pizxel/lib/font.ts` (ZX Spectrum 8×8 font)
5. Implement logger:
   - `pizxel/lib/logger.ts`
   - Per-app log files in `/data/default-user/logs/`
6. Test with minimal app:
   ```typescript
   class TestApp implements App {
     name = "Test App";
     private x = 0;

     onActivate() {
       console.log("Activated");
     }
     onDeactivate() {
       console.log("Deactivated");
     }
     onUpdate(dt: number) {
       this.x = (this.x + dt * 50) % 256;
     }
     onEvent(event: InputEvent): boolean {
       if (event.key === "q") {
         process.exit(0);
       }
       return false;
     }
     render(matrix: DisplayBuffer) {
       matrix.clear();
       matrix.rect(this.x, 96, 20, 20, [255, 0, 0], true);
     }
   }
   ```

**Success Criteria:**

- App event loop runs at ~60fps
- Dirty flag prevents unnecessary renders
- Input events route to active app
- Moving rectangle test app works
- Logger writes to `/data/default-user/logs/testapp.log`

---

### Phase 2: Canvas HTTP Display (Week 2)

**Goal:** Implement browser-based display driver for Mac development

**Tasks:**

1. Implement `pizxel/drivers/display/canvas-http.ts`:
   - node-canvas renders 256×192 buffer to PNG
   - Express serves HTTP server on `http://localhost:3000`
   - WebSocket pushes frames to browser (60fps)
   - Browser canvas shows display
2. Create `pizxel/drivers/display/public/index.html`:
   ```html
   <!DOCTYPE html>
   <html>
     <head>
       <title>PiZXel Display</title>
       <style>
         body {
           margin: 0;
           background: #000;
           display: flex;
           justify-content: center;
           align-items: center;
           height: 100vh;
         }
         canvas {
           border: 2px solid #333;
           image-rendering: pixelated;
         }
       </style>
     </head>
     <body>
       <canvas id="display" width="256" height="192"></canvas>
       <script>
         const canvas = document.getElementById("display");
         const ctx = canvas.getContext("2d");
         const ws = new WebSocket("ws://localhost:3000");

         ws.onmessage = (event) => {
           const img = new Image();
           img.onload = () => ctx.drawImage(img, 0, 0);
           img.src = "data:image/png;base64," + event.data;
         };
       </script>
     </body>
   </html>
   ```
3. Implement `pizxel/drivers/input/http-input.ts`:
   - WebSocket receives keyboard events from browser
   - Converts to InputEvent format
4. Update DeviceManager priority:
   - CanvasHTTPDisplay: priority 80 (macOS/Linux, port 3000 available)
   - TerminalDisplay: priority 50 (always available fallback)

**Success Criteria:**

- `npm start` opens browser automatically
- Display shows in browser window at `http://localhost:3000`
- Keyboard input works from browser
- Test app moving rectangle visible in browser
- Terminal fallback still works if browser unavailable

---

### Phase 3: Simple Apps (Week 3)

**Goal:** Port launcher and clock apps to validate framework

**Tasks:**

1. Port launcher app:
   - `pizxel/apps/launcher/index.ts`
   - Icon grid (5×3 layout)
   - Arrow key navigation
   - App loading from `/data/default-user/apps/`
2. Implement emoji icon system:
   - `pizxel/lib/emoji-loader.ts`
   - Load from sprite sheet or download on-demand
   - Cache to `/data/all-users/cache/emoji/`
   - **FIX:** Filter near-black pixels (r<30, g<30, b<30) to avoid gridlines
3. Port clock app:
   - `pizxel/apps/clock/index.ts`
   - Analog clock face with sweep second hand
   - Date display at bottom
   - Icon: `{"emoji": "⏰"}`
4. Create app config format:
   - `config.json` in each app folder
   - `{ "name": "Clock", "icon": {"emoji": "⏰"}, "entry": "index.js" }`
5. Implement app loading:
   - Scan `/pizxel/apps/` and `/data/default-user/apps/`
   - Dynamic import of app modules
   - Register with app framework

**Success Criteria:**

- Launcher shows icon grid with clock app
- Emoji icons render without gridlines
- Arrow keys navigate grid
- Enter key launches clock app
- Clock shows current time with moving hands
- ESC returns to launcher

---

### Phase 4: JSSpeccy3 Integration (Week 4)

**Goal:** Integrate ZX Spectrum emulator with frame buffer interception

**Tasks:**

1. Create download script:
   - `scripts/setup-jsspeccy3.sh`
   - Git clone jsspeccy3 to `/data/all-users/cache/jsspeccy3/`
   - Build WebAssembly if needed
2. Implement JSSpeccy3 app:
   - `pizxel/apps/spectrum/index.ts`
   - Launch JSSpeccy3 in separate process or Web Worker
   - Intercept frame buffer updates
   - Copy to PiZXel display buffer (256×192)
   - Route keyboard input to emulator
3. Frame buffer interception strategy:
   - Option A: Patch jsspeccy3/runtime/display.js to call callback on frame update
   - Option B: Poll canvas ImageData at 50Hz (ZX Spectrum frame rate)
   - Option C: WebSocket bridge between JSSpeccy3 and PiZXel
4. Test with ZX Spectrum ROM:
   - Load 48K BASIC ROM
   - Show copyright message on LED matrix
   - Keyboard input types in BASIC prompt
   - `PRINT "HELLO WORLD"` displays on matrix

**Success Criteria:**

- `scripts/setup-jsspeccy3.sh` downloads emulator successfully
- JSSpeccy3 app launches from launcher
- ZX Spectrum BASIC prompt visible on display
- Keyboard input works in emulator
- Frame buffer updates at 50fps
- No modifications to GPL code required (or minimal, isolated)

**Deferred to Later:**

- `.tap` file loading (focus on ROM first)
- Cassette tape audio
- Joystick emulation
- Snapshot save/load

---

### Phase 5: Hardware Drivers (Week 5)

**Goal:** Implement Raspberry Pi LED matrix and GPIO input drivers

**Tasks:**

1. Implement `pizxel/drivers/display/led-matrix.ts`:
   - Wrapper for `rpi-rgb-led-matrix` npm package
   - Priority 100 (highest - use on Pi if available)
   - Detect Pi via `/proc/cpuinfo` or platform check
   - Initialize LED matrix with brightness, GPIO mapping
2. Implement `pizxel/drivers/input/gpio-input.ts`:
   - Use `onoff` npm package for GPIO
   - Map physical buttons to InputEvent keys
   - Debounce handling
3. Add hardware detection:
   - `pizxel/lib/platform.ts`
   - Detect Raspberry Pi model
   - Check GPIO availability
   - Determine LED matrix parameters (64×64, 128×128, etc.)
4. Test on actual Raspberry Pi:
   - Deploy to Pi via `rsync` or `git pull`
   - Run `npm start`
   - Verify LED matrix displays launcher
   - Test GPIO button input
5. Create deployment script:
   - `scripts/deploy-to-pi.sh`
   - `rsync` build output to Pi
   - Restart PiZXel service

**Success Criteria:**

- PiZXel runs on Raspberry Pi
- LED matrix shows display (auto-detected)
- Physical buttons work as input
- DeviceManager selects LedMatrixDisplay automatically
- Fallback to terminal if LED matrix unavailable
- Clock app shows on physical hardware

---

### Phase 6: Remaining Apps (Week 6)

**Goal:** Port all remaining MatrixOS apps to PiZXel

**Apps to Port:**

1. **Frogger** (`pizxel/apps/frogger/`)
   - Icon: `{"emoji": "🐸"}`
   - Port from `matrixos-archive/examples/frogger/main.py`
2. **Pac-Man** (`pizxel/apps/pacman/`)
   - Icon: `{"emoji": "👻"}`
   - Port from `matrixos-archive/examples/pacman/main.py`
3. **Snake** (`pizxel/apps/snake/`)
   - Icon: `{"emoji": "🐍"}`
   - Port from `matrixos-archive/examples/snake/main.py`
4. **Tetris** (`pizxel/apps/tetris/`)
   - Icon: `{"emoji": "🟦"}`
   - Port from `matrixos-archive/examples/tetris/main.py`
5. **Space Invaders** (`pizxel/apps/space-invaders/`)
   - Icon: `{"emoji": "👾"}`
   - Port from `matrixos-archive/examples/space_invaders/main.py`
6. **Weather** (`pizxel/apps/weather/`)
   - Icon: `{"emoji": "🌤️"}`
   - Port from `matrixos-archive/examples/weather/main.py`
7. **News** (`pizxel/apps/news/`)
   - Icon: `{"emoji": "📰"}`
   - Port from `matrixos-archive/examples/news/main.py`
8. **Timer** (`pizxel/apps/timer/`)
   - Icon: `{"emoji": "⏱️"}`
   - Port from `matrixos-archive/examples/timer/main.py`
9. **Platformer** (`pizxel/apps/platformer/`)
   - Icon: `{"emoji": "🏃"}`
   - Port from `matrixos-archive/examples/platformer/main.py`
10. **Breakout** (`pizxel/apps/breakout/`)
    - Icon: `{"emoji": "🎮"}`
    - Port from `matrixos-archive/examples/breakout/main.py`
11. **Settings** (`pizxel/apps/settings/`)
    - Icon: `{"emoji": "⚙️"}`
    - System settings (brightness, volume, Wi-Fi, etc.)

**Success Criteria:**

- All apps launch from launcher
- All apps render correctly
- All apps respond to input
- Games are playable
- No regressions from Python versions

---

### Phase 7: Testing & Polish (Week 7)

**Goal:** Implement automated testing and polish UX

**Tasks:**

1. Set up testing framework:
   - Install Jest: `npm install --save-dev jest @types/jest ts-jest`
   - Configure `jest.config.js`
   - Create `tests/` directory
2. Implement headless testing:
   - `tests/helpers/headless-display.ts` (in-memory buffer)
   - `tests/helpers/input-simulator.ts` (inject events)
   - Port TestRunner from Python testing framework
3. Write unit tests:
   - Device driver base classes
   - Display buffer operations
   - Graphics primitives
   - App framework lifecycle
4. Write integration tests:
   - Launcher app loads and navigates
   - Clock app shows correct time
   - Input events route correctly
   - Frame rate stays ~60fps
5. Polish UX:
   - Boot animation (retro style)
   - App transition animations
   - Settings app (brightness, volume, theme)
   - Error handling (app crashes don't kill OS)
6. Update documentation:
   - `README.md` (installation, usage, development)
   - `docs/API_REFERENCE.md` (TypeScript APIs)
   - `docs/APP_DEVELOPMENT.md` (how to create apps)
   - `docs/HARDWARE.md` (Pi setup, LED matrix wiring)

**Success Criteria:**

- `npm test` runs all tests and passes
- Test coverage >80% for core modules
- Apps transition smoothly
- Settings app allows configuration
- Documentation is complete and accurate

---

### Phase 8: Multi-User & Work Dashboard (Week 8+)

**Goal:** Implement multi-user support and work dashboard integration (DEFERRED)

**Notes:**

- This phase is lower priority
- Focus on single-user experience first
- Revisit after core system is stable

**Future Tasks:**

1. Multi-user support:
   - User switching from settings
   - Per-user app directories
   - Per-user settings and logs
2. Work dashboard integration:
   - WebSocket API to existing work dashboard
   - Status updates (what's running on Pi)
   - Remote control from dashboard
3. Advanced features:
   - Network file sharing (SMB/NFS)
   - VNC server for remote display
   - Audio output (PWM or USB sound card)
   - Camera input (for QR codes, etc.)

---

## Technical Specifications

### Display Buffer Format

```typescript
// 256×192 RGB buffer (147,456 pixels)
type RGB = [number, number, number]; // [r, g, b] each 0-255
type DisplayBuffer = RGB[][]; // buffer[y][x]

// Example usage:
const buffer: DisplayBuffer = Array.from({ length: 192 }, () =>
  Array.from({ length: 256 }, () => [0, 0, 0] as RGB)
);

// Set pixel
buffer[y][x] = [255, 0, 0]; // Red pixel at (x, y)
```

### Input Event Format

```typescript
interface InputEvent {
  key: string; // 'ArrowUp', 'Enter', ' ' (space), 'Escape', etc.
  type: "keydown" | "keyup";
  timestamp: number; // Date.now()
  repeat?: boolean; // True if key held down
  source?: string; // 'keyboard', 'gpio', 'websocket'
}

// Standard keys (compatible with MatrixOS):
// - InputEvent.UP = 'ArrowUp'
// - InputEvent.DOWN = 'ArrowDown'
// - InputEvent.LEFT = 'ArrowLeft'
// - InputEvent.RIGHT = 'ArrowRight'
// - InputEvent.OK = 'Enter'
// - InputEvent.ACTION = ' ' (space bar)
// - InputEvent.BACK = 'Backspace'
// - InputEvent.HOME = 'Escape'
```

### Device Driver Interface

```typescript
abstract class DisplayDriver {
  abstract priority: number;
  abstract name: string;

  abstract initialize(): Promise<void>;
  abstract shutdown(): Promise<void>;
  abstract isAvailable(): Promise<boolean>;

  abstract getWidth(): number;
  abstract getHeight(): number;
  abstract setPixel(x: number, y: number, color: RGB): void;
  abstract show(): void;
  abstract clear(): void;
}

abstract class InputDriver {
  abstract priority: number;
  abstract name: string;

  abstract initialize(): Promise<void>;
  abstract shutdown(): Promise<void>;
  abstract isAvailable(): Promise<boolean>;

  abstract onEvent(callback: (event: InputEvent) => void): void;
}
```

### App Interface

```typescript
interface App {
  name: string;

  // Lifecycle
  onActivate(): void;
  onDeactivate(): void;
  onUpdate(deltaTime: number): void;
  onEvent(event: InputEvent): boolean;
  render(matrix: DisplayBuffer): void;

  // Optional
  onBackgroundTick?(): void;
  onSaveState?(): any;
  onRestoreState?(state: any): void;
}
```

---

## Git Workflow

### Initial Commit (Phase 0)

```bash
# 1. Update .gitignore
echo "jsspeccy3/" >> .gitignore
echo "node_modules/" >> .gitignore
echo "dist/" >> .gitignore
echo "data/" >> .gitignore

# 2. Commit current Python state
git add -A
git commit -m "Save MatrixOS Python final state before TypeScript migration"
git tag v2.0-final-python

# 3. Create archive and new structure
mkdir -p pizxel matrixos-archive data scripts
mv matrixos/ matrixos-archive/
mv examples/ matrixos-archive/
mv apps/ matrixos-archive/
mv tests/ matrixos-archive/
mv docs/ matrixos-archive/

git add -A
git commit -m "BREAKING CHANGE: Restructure for TypeScript migration

- Move Python code to matrixos-archive/ for reference
- Create pizxel/ for new TypeScript implementation
- Create data/ for user data (gitignored)
- Prepare for PiZXel development"
```

### Subsequent Commits

```bash
# Commit after each phase completion
git add -A
git commit -m "Phase 1: Implement app framework

- Port app lifecycle and event loop
- Implement dirty flag pattern
- Create display buffer with drawing primitives
- Add logger with per-app log files

All tests passing."
```

---

## Success Criteria Summary

**Phase 0 Complete When:**

- ✅ TypeScript project compiles
- ✅ Terminal display shows test pattern
- ✅ DeviceManager selects driver automatically

**Phase 1 Complete When:**

- ✅ App event loop runs at 60fps
- ✅ Test app shows moving rectangle
- ✅ Logger writes to log files

**Phase 2 Complete When:**

- ✅ Browser displays PiZXel output
- ✅ Keyboard input works from browser
- ✅ Test app works in browser

**Phase 3 Complete When:**

- ✅ Launcher shows icon grid
- ✅ Clock app displays time
- ✅ Navigation between apps works

**Phase 4 Complete When:**

- ✅ ZX Spectrum BASIC prompt displays
- ✅ Keyboard types in emulator
- ✅ Frame buffer intercept works

**Phase 5 Complete When:**

- ✅ LED matrix displays on Raspberry Pi
- ✅ GPIO buttons work as input
- ✅ Hardware auto-detection works

**Phase 6 Complete When:**

- ✅ All 11+ apps ported and functional
- ✅ Games are playable
- ✅ Settings app works

**Phase 7 Complete When:**

- ✅ All tests passing (>80% coverage)
- ✅ Documentation complete
- ✅ UX polished

---

## Risks & Mitigations

### Risk: JSSpeccy3 Frame Buffer Interception

**Concern:** Might require modifying GPL code, licensing complications

**Mitigation:**

- Start with polling approach (no JSSpeccy3 modifications)
- If too slow, explore WebSocket bridge (separate process)
- Worst case: fork JSSpeccy3, maintain separately in user space
- Legal review before distribution

### Risk: node-canvas Performance on Raspberry Pi

**Concern:** Canvas rendering might be slow on Pi Zero

**Mitigation:**

- Optimize: Only render dirty regions
- Fallback: Use terminal display if canvas too slow
- Consider: Hardware acceleration via OpenGL/GLES bindings
- Benchmark early on actual hardware

### Risk: GPIO Input Latency

**Concern:** Polling GPIO might miss button presses

**Mitigation:**

- Use interrupt-based GPIO (if supported by library)
- Debounce logic to prevent double-presses
- Test extensively with physical hardware
- Provide keyboard fallback for development

---

## Timeline Summary

- **Week 1:** Foundation - TypeScript setup, device drivers, terminal display
- **Week 2:** App framework + Canvas HTTP display
- **Week 3:** Simple apps (launcher, clock)
- **Week 4:** JSSpeccy3 integration
- **Week 5:** Hardware drivers (LED matrix, GPIO)
- **Week 6:** Port remaining apps
- **Week 7:** Testing & polish
- **Week 8+:** Multi-user & work dashboard (deferred)

**Total:** ~7 weeks for core system, additional time for advanced features

---

## Next Steps

1. ✅ Create this implementation plan document
2. ✅ Update `.gitignore`
3. ✅ Commit Python final state with tag
4. 🔄 Execute Phase 0: Create project structure, initialize TypeScript
5. 🔄 Begin Phase 1: Implement app framework

**Ready to begin!** 🚀

---

_Document Version: 1.0_  
_Last Updated: November 22, 2025_  
_Author: AI Assistant (Claude Sonnet 4.5) + User Collaboration_
