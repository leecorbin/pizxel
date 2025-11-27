# PiZXel Priority Features - Implementation Plan

**Date:** November 27, 2025
**Status:** Audio system fixed, beginning priority features

---

## ✅ COMPLETED: Audio System Fix

### Problem

- Audio didn't work in terminal mode (no `window.AudioContext` in Node.js)
- Canvas mode had audio code but wasn't integrated with audio driver system

### Solution

- Created `CanvasAudioDriver` that sends audio commands via WebSocket
- Browser receives commands and plays via Web Audio API
- Updated `start.ts` to use correct driver based on mode
- Added sound effects to launcher (SELECT, COIN, ERROR)

### Files Modified

- `/pizxel/audio/canvas-audio-driver.ts` (NEW)
- `/pizxel/display/canvas-server.ts` (added sendBeep/sendSweep methods)
- `/pizxel/start.ts` (use CanvasAudioDriver for canvas mode)
- `/pizxel/apps/launcher.ts` (added sound effects)

### Testing

```bash
npm run start:canvas
# Open http://localhost:3001
# Navigate launcher - hear SELECT beeps
# Launch app - hear COIN sound
```

---

## 🎯 PRIORITY FEATURES

### 1. On-Screen Keyboard ⌨️

**Purpose:** Hardware deployment with minimal Bluetooth remote

**Requirements:**

- Full QWERTY layout
- Number keys and symbols
- Special ZX Spectrum keyboard mode for games/emulator
- Auto-detection when game needs keyboard
- Popup message: "Press [KEY] to switch to game mode"
- Compact layout for 256×192 display

**Implementation Plan:**

**Phase 1: Basic Keyboard**

```typescript
// /pizxel/ui/on-screen-keyboard.ts
interface KeyboardLayout {
  rows: string[][]; // Each row is array of key labels
  shiftRows?: string[][]; // Shift layer
}

class OnScreenKeyboard {
  private layout: KeyboardLayout;
  private currentRow: number = 0;
  private currentCol: number = 0;
  private shiftMode: boolean = false;
  private visible: boolean = false;

  // Standard QWERTY layout
  static QWERTY: KeyboardLayout = {
    rows: [
      ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
      ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
      ["A", "S", "D", "F", "G", "H", "J", "K", "L", "↵"],
      ["⇧", "Z", "X", "C", "V", "B", "N", "M", "⌫"],
      ["SPACE", "👁", "🔊"], // Special keys
    ],
  };

  // ZX Spectrum game mode layout
  static SPECTRUM_GAME: KeyboardLayout = {
    rows: [
      ["Q", "W", "E", "R", "T"], // Top row for games
      ["A", "S", "D", "F", "G"], // Movement keys
      ["SPACE", "↵", "ESC"], // Action keys
    ],
  };

  show(mode: "full" | "game" = "full"): void;
  hide(): void;
  handleEvent(event: InputEvent): boolean; // D-pad navigation
  render(matrix: DisplayBuffer, y: number): void;
  getSelectedKey(): string | null;
}
```

**Phase 2: Game Mode Detection**

```typescript
// Apps can request keyboard mode
interface App {
  // ...
  requiresKeyboard?: "full" | "game"; // Optional property
}

// Framework checks and shows popup
if (app.requiresKeyboard === "game") {
  showMessage("Press TAB for game controls");
}
```

**Files to Create:**

- `/pizxel/ui/on-screen-keyboard.ts`
- `/pizxel/ui/keyboard-layouts.ts`

**Integration Points:**

- Add to `HelpModal` (TAB shows keyboard)
- Add to app framework (auto-detect needs)

---

### 2. UI Controls Framework 🎨

**Purpose:** Reusable UI components for app development

**Current Issue:** Panel clipping not working in demo app

**Components Needed:**

```typescript
// /pizxel/ui/controls/

class Button {
  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    onClick: () => void
  );
  render(matrix: DisplayBuffer): void;
  handleEvent(event: InputEvent): boolean;
}

class TextInput {
  constructor(x: number, y: number, width: number, maxLength: number);
  value: string;
  render(matrix: DisplayBuffer): void;
  handleEvent(event: InputEvent): boolean;
}

class Panel {
  constructor(x: number, y: number, width: number, height: number);
  addChild(control: UIControl): void;
  // CRITICAL: Implement proper clipping
  render(matrix: DisplayBuffer): void {
    // Save current clip rect
    const oldClip = matrix.getClipRect();

    // Set panel clip rect
    matrix.setClipRect(this.x, this.y, this.width, this.height);

    // Render children
    for (const child of this.children) {
      child.render(matrix);
    }

    // Restore clip rect
    matrix.setClipRect(oldClip);
  }
}

class Slider {
  constructor(x: number, y: number, width: number, min: number, max: number);
  value: number;
  onChange: (value: number) => void;
  render(matrix: DisplayBuffer): void;
  handleEvent(event: InputEvent): boolean;
}

class Label {
  constructor(x: number, y: number, text: string, color?: RGB);
  render(matrix: DisplayBuffer): void;
}
```

**Implementation Steps:**

1. Add `setClipRect()` to DisplayBuffer
2. Implement clipping in drawing primitives
3. Create base `UIControl` interface
4. Build individual controls
5. Update demo app to test clipping

**Files to Create:**

- `/pizxel/ui/controls/index.ts`
- `/pizxel/ui/controls/button.ts`
- `/pizxel/ui/controls/text-input.ts`
- `/pizxel/ui/controls/panel.ts`
- `/pizxel/ui/controls/slider.ts`
- `/pizxel/ui/controls/label.ts`

---

### 3. Key-Value Storage System 💾

**Purpose:** Easy persistence for app data in user folder

**Design:**

```typescript
// /pizxel/storage/app-storage.ts

class AppStorage {
  private appName: string;
  private basePath: string;
  private cache: Map<string, any> = new Map();

  constructor(appName: string) {
    this.appName = appName;
    this.basePath = `/data/default-user/app-data/${appName}`;
  }

  // Synchronous API (uses cache)
  get<T>(key: string, defaultValue?: T): T | undefined;
  set<T>(key: string, value: T): void;
  delete(key: string): void;
  has(key: string): boolean;
  keys(): string[];
  clear(): void;

  // Async API (reads/writes files)
  async load(): Promise<void>; // Load all keys from disk
  async save(): Promise<void>; // Save all keys to disk
  async flush(): Promise<void>; // Write specific key immediately
}

// Usage in apps:
const storage = new AppStorage("emoji-browser");
await storage.load();

storage.set("apiKey", "abc123");
storage.set("downloadedEmojis", ["🐸", "🎮"]);

// Auto-save on app deactivate
app.onDeactivate = async () => {
  await storage.save();
};
```

**File Structure:**

```
/data/default-user/app-data/
  emoji-browser/
    apiKey.json          # { "value": "abc123" }
    downloadedEmojis.json # { "value": ["🐸", "🎮"] }
  news-reader/
    apiKey.json
    lastUpdate.json
```

**Features:**

- JSON serialization
- Automatic type inference
- File-per-key (easier debugging)
- In-memory cache for performance
- Async load/save for startup/shutdown
- Sync get/set for runtime use

**Files to Create:**

- `/pizxel/storage/app-storage.ts`
- `/pizxel/storage/index.ts`

**Migration:**

- Update Emoji Browser to use new API
- Update News Reader to use new API
- Update Timer to persist state

---

### 4. Settings App ⚙️

**Purpose:** System configuration for device deployment

**Features:**

- Volume control (slider)
- Brightness control (slider)
- WiFi configuration (future)
- Bluetooth pairing (future)
- Display settings (resolution, pixel size)
- About page (version, storage used)

**UI Design:**

```
┌─────────────────────────┐
│ SETTINGS                │
├─────────────────────────┤
│ ▸ Sound                 │ ← Selected
│   Display               │
│   Network               │
│   Bluetooth             │
│   About                 │
└─────────────────────────┘
```

**Sound Submenu:**

```
┌─────────────────────────┐
│ SOUND                   │
├─────────────────────────┤
│ Master Volume           │
│ [====····] 50%          │ ← Slider
│                         │
│ Sound Effects  [ON ]    │ ← Toggle
│ Music         [ON ]     │
│                         │
│ < Back                  │
└─────────────────────────┘
```

**Implementation:**

```typescript
// /data/default-user/apps/settings/settings.ts

class SettingsApp implements App {
  private sections = [
    { name: "Sound", icon: "🔊" },
    { name: "Display", icon: "🖥️" },
    { name: "Network", icon: "📡" },
    { name: "Bluetooth", icon: "📱" },
    { name: "About", icon: "ℹ️" },
  ];

  private currentSection: number = 0;
  private submenus: Map<string, SettingsSubmenu>;

  renderMainMenu(matrix: DisplayBuffer): void;
  renderSubmenu(matrix: DisplayBuffer): void;
}

class SoundSettings implements SettingsSubmenu {
  private volumeSlider: Slider;
  private sfxToggle: Toggle;
  private musicToggle: Toggle;

  render(matrix: DisplayBuffer): void;
  handleEvent(event: InputEvent): boolean;
  save(): void; // Persist to AppStorage
}
```

**Files to Create:**

- `/data/default-user/apps/settings/settings.ts`
- `/data/default-user/apps/settings/config.json`
- `/data/default-user/apps/settings/submenus/sound.ts`
- `/data/default-user/apps/settings/submenus/display.ts`
- `/data/default-user/apps/settings/submenus/about.ts`

---

### 5. Async/Background Tasks & Notifications 🔔

**Purpose:** Apps work when not active (Timer alarms, network requests)

**Requirements:**

- Background processing during `onBackgroundTick()`
- Notification system to request foreground
- Network module for HTTP requests
- Promise-based async operations

**Architecture:**

```typescript
// /pizxel/core/notification-manager.ts

class NotificationManager {
  private queue: Notification[] = [];

  notify(
    app: App,
    message: string,
    priority: "low" | "normal" | "urgent"
  ): void;
  showNotification(notification: Notification): void;
  dismissCurrent(): void;
}

// /pizxel/network/http-client.ts

class HttpClient {
  async get(url: string, options?: RequestOptions): Promise<Response>;
  async post(
    url: string,
    body: any,
    options?: RequestOptions
  ): Promise<Response>;

  // With timeout and error handling
  async fetch(url: string, options: RequestOptions): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      options.timeout || 5000
    );

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeout);
    }
  }
}

// Usage in Timer app:
class TimerApp implements App {
  private remainingTime: number = 0;

  onBackgroundTick(): void {
    if (this.remainingTime > 0) {
      this.remainingTime--;

      if (this.remainingTime === 0) {
        // Alarm!
        getAudio()?.play(Sounds.POWERUP);
        this.requestForeground("Timer finished!");
      }
    }
  }
}

// Usage in Weather app:
class WeatherApp implements App {
  async onActivate(): void {
    this.showLoading();

    const http = new HttpClient();
    try {
      const data = await http.get("https://api.weather.com/...");
      this.updateWeather(data);
    } catch (error) {
      this.showError("Failed to load weather");
    }
  }
}
```

**Files to Create:**

- `/pizxel/core/notification-manager.ts`
- `/pizxel/network/http-client.ts`
- `/pizxel/network/index.ts`

**Updates Needed:**

- Add `requestForeground()` to App interface
- Add notification rendering to AppFramework
- Update Timer app to use background tasks
- Update Weather app to use HTTP client
- Update News Reader to use HTTP client

---

## 🎮 FUTURE: ZX Spectrum Emulator

**After completing priority features:**

1. **Research JSSpeccy3**

   - Study audio implementation
   - Understand keyboard handling
   - Check license compatibility

2. **Create Emulator App**

   - Z80 CPU emulation
   - Display rendering (256×192 native!)
   - Keyboard mapping (with on-screen keyboard)
   - Tape loading (.tap/.tzx files)

3. **Keyboard Mode Switching**
   - Detect when emulator needs full keyboard
   - Show popup: "Press TAB for Spectrum keyboard"
   - Render Spectrum keyboard layout

---

## 📱 FUTURE: Bluetooth Support

**After emulator:**

1. **Mac Testing First**

   - Use Node.js `@abandonware/noble` package
   - Test with simple Bluetooth remote
   - Implement pairing in Settings app

2. **Raspberry Pi Deployment**
   - Test on actual Pi hardware
   - Add support for recreated Spectrum keyboard
   - GPIO button fallback

---

## 📅 Implementation Timeline

**Week 1: Audio + Sound Effects**

- ✅ Fix audio system
- ✅ Add launcher sounds
- ⏳ Add sounds to games (Tetris, Breakout, Frogger)

**Week 2: UI Foundation**

- On-screen keyboard (basic)
- UI controls framework
- Fix panel clipping

**Week 3: Persistence + Settings**

- AppStorage system
- Settings app
- Migrate existing apps

**Week 4: Async + Network**

- Notification manager
- HTTP client
- Update Timer/Weather/News apps

**Week 5: Testing + Polish**

- Comprehensive testing
- Bug fixes
- Documentation updates

**Future Phases:**

- ZX Spectrum emulator integration
- Bluetooth stack
- Hardware deployment

---

## 🧪 Testing Strategy

**Audio:**

```bash
npm run start:canvas
# Navigate launcher - hear SELECT
# Launch app - hear COIN
# Test in games - verify sounds
```

**On-Screen Keyboard:**

```bash
# Test with D-pad only (no physical keyboard)
# Verify layout navigation
# Test text input in apps
```

**UI Controls:**

```bash
# Update demo app with Panel clipping test
# Verify overflow is hidden
# Test all controls (Button, Slider, TextInput)
```

**Storage:**

```bash
# Save data in app
# Kill and restart PiZXel
# Verify data persists
```

**Async:**

```bash
# Start timer
# Switch to another app
# Wait for timer to finish
# Verify notification appears
```

---

## 📝 Notes

- All features use TypeScript
- Follow existing code patterns
- Add comprehensive logging
- Write tests where possible
- Update documentation
- Keep retro aesthetic!

---

**Last Updated:** November 27, 2025
**Next Review:** After completing Week 2 (UI Foundation)
