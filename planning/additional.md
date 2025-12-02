# Additional Architectural Decisions

**Date:** November 23, 2025  
**Purpose:** Critical design decisions to implement before they contradict future work

---

## 1. Testing Framework (Priority: CRITICAL)

### Philosophy

Following Python MatrixOS: "Retro aesthetic meets modern engineering practices"

### Architecture

```
pizxel/testing/
├── display-adapter.ts      # HeadlessDisplay - captures rendering in memory
├── input-simulator.ts      # InputSimulator - programmatic event injection
├── assertions.ts           # Rich assertion library
└── test-runner.ts          # High-level TestRunner API
```

### Key Features

- **Headless Display**: Pure TypeScript (no canvas), captures all draw operations
- **Input Simulation**: Frame-perfect timing, event sequences, button holds
- **Log Integration**: Inspect app logs during tests
- **Snapshot Testing**: Visual regression testing capability
- **No Dependencies**: Pure Node.js, works in CI/CD

### Example

```typescript
import { TestRunner } from "../testing/test-runner";

test("launcher navigation", async () => {
  const runner = new TestRunner("pizxel/apps/launcher", { maxDuration: 10 });

  await runner.wait(0.5);
  assert(runner.display.renderCount >= 30, "Should render at 30+ fps");

  // Find yellow selection box
  const selection = runner.findSprite([255, 255, 0], { tolerance: 10 });
  assert(selection !== null, "Selection should be visible");

  // Navigate right
  runner.inject("ArrowRight");
  await runner.wait(0.1);

  const newSelection = runner.findSprite([255, 255, 0], { tolerance: 10 });
  assert(newSelection!.x > selection!.x, "Selection should move right");

  runner.assertNoErrorsLogged();
});
```

---

## 2. UI Controls Framework (Priority: HIGH)

### Design Philosophy

- **Composable**: Views within views, nested containers
- **Declarative**: Simple API like React/SwiftUI but for pixel displays
- **Retro-styled**: Built-in ZX Spectrum aesthetic themes
- **Event-driven**: Integrates with app framework's event system
- **Accessible**: Keyboard navigation built-in

### Component Hierarchy

```
Widget (base)
├── Container
│   ├── View (rectangular region)
│   ├── Panel (bordered container)
│   ├── Modal (popup overlay)
│   └── TabView (tabbed interface)
├── Controls
│   ├── Button
│   ├── Toggle/Switch
│   ├── Slider
│   ├── ProgressBar
│   ├── TextInput
│   └── Dropdown
├── Display
│   ├── Label
│   ├── Icon
│   ├── Spinner
│   └── Badge
└── Layout
    ├── HStack (horizontal)
    ├── VStack (vertical)
    └── Grid
```

### Architecture

```
pizxel/ui/
├── core/
│   ├── widget.ts           # Base Widget class
│   ├── container.ts        # Container base class
│   ├── focus-manager.ts    # Keyboard focus handling
│   └── layout-engine.ts    # Auto-layout system
├── components/
│   ├── button.ts
│   ├── text-input.ts
│   ├── slider.ts
│   ├── progress-bar.ts
│   ├── toggle.ts
│   ├── label.ts
│   ├── panel.ts
│   ├── modal.ts
│   └── icon.ts
├── layout/
│   ├── stack.ts            # HStack/VStack
│   ├── grid.ts             # Grid layout
│   └── spacer.ts           # Flexible spacing
├── themes/
│   ├── spectrum.ts         # ZX Spectrum theme (default)
│   ├── c64.ts              # Commodore 64 theme
│   └── theme.ts            # Theme interface
└── index.ts
```

### Example Usage

```typescript
import { Modal, Button, Label, VStack } from "../ui";

class MyApp implements App {
  private helpModal: Modal;

  constructor() {
    // Build help modal
    this.helpModal = new Modal({
      title: "Keyboard Shortcuts",
      width: 180,
      height: 120,
      content: new VStack({
        spacing: 4,
        children: [
          new Label("Space - Toggle mode"),
          new Label("Arrow Keys - Navigate"),
          new Label("Enter - Select"),
          new Label("ESC - Return"),
          new Button("Close", {
            onPress: () => this.helpModal.hide(),
          }),
        ],
      }),
    });
  }

  onEvent(event: InputEvent): boolean {
    // Check for help key FIRST (before app logic)
    if (event.key === InputKeys.HELP) {
      this.helpModal.show();
      this.dirty = true;
      return true;
    }

    // Modal intercepts events when visible
    if (this.helpModal.visible && this.helpModal.handleEvent(event)) {
      this.dirty = true;
      return true;
    }

    // App-specific logic...
    return false;
  }

  render(matrix: DisplayBuffer): void {
    // Render app content
    this.drawMyApp(matrix);

    // Modal renders on top if visible
    this.helpModal.render(matrix);

    this.dirty = false;
  }
}
```

---

## 3. Standard Keyboard Shortcuts

### System-Level Keys (Framework Handles)

```typescript
export enum InputKeys {
  // Navigation
  UP = "ArrowUp",
  DOWN = "ArrowDown",
  LEFT = "ArrowLeft",
  RIGHT = "ArrowRight",

  // Actions
  OK = "Enter", // Primary action
  ACTION = " ", // Secondary action (space bar)
  BACK = "Backspace", // Go back / cancel

  // System
  HOME = "Escape", // Return to launcher (framework handles)
  HELP = "Tab", // Show help modal (NEW!)
  MENU = "m", // Context menu (future)

  // Modifiers (future)
  SHIFT = "Shift",
  CTRL = "Control",
  ALT = "Alt",
}
```

### Help Modal Standard (NEW!)

- **Key:** `Tab` (InputKeys.HELP)
- **Behavior:** Apps should show keyboard shortcuts modal
- **Priority:** Help key checked BEFORE app-specific logic
- **Implementation:** Every app should have a help modal

### Best Practices

```typescript
class MyApp implements App {
  private helpModal: Modal;

  constructor() {
    this.helpModal = HelpModal.create([
      { key: "Space", action: "Jump" },
      { key: "Arrow Keys", action: "Move player" },
      { key: "Enter", action: "Pause" },
      { key: "Tab", action: "Show this help" },
    ]);
  }

  onEvent(event: InputEvent): boolean {
    // 1. Check help key FIRST
    if (event.key === InputKeys.HELP) {
      this.helpModal.toggle();
      this.dirty = true;
      return true;
    }

    // 2. Let modal handle events if visible
    if (this.helpModal.visible) {
      return this.helpModal.handleEvent(event);
    }

    // 3. App-specific logic
    switch (event.key) {
      case InputKeys.ACTION:
        this.jump();
        return true;
      // ... etc
    }

    return false;
  }
}
```

---

## 4. Modal System Architecture

### Features

- **Overlay**: Semi-transparent background dimming
- **Focus Trapping**: Only modal receives input when visible
- **Animations**: Fade in/out, scale effects (optional)
- **Z-Index**: Stack multiple modals
- **Escape Key**: Close modal by default

### Modal Types

```typescript
// Simple alert
Modal.alert("Game Over!", "Your score: 1234");

// Confirmation dialog
Modal.confirm("Quit game?", {
  onYes: () => this.quit(),
  onNo: () => this.resume(),
});

// Custom content
new Modal({
  title: "Settings",
  width: 200,
  height: 150,
  content: new SettingsForm(),
});

// Help modal (standardized)
HelpModal.create([
  { key: "Space", action: "Jump" },
  { key: "Arrows", action: "Move" },
]);
```

---

## 5. View/Panel System

### Nested Views

```typescript
// Main container
const mainView = new View({
  x: 0,
  y: 0,
  width: 256,
  height: 192,
  children: [
    // Header panel
    new Panel({
      x: 0,
      y: 0,
      width: 256,
      height: 32,
      border: true,
      borderColor: [0, 255, 255],
      children: [new Label("PiZXel Clock", { x: 8, y: 8 })],
    }),

    // Content area
    new View({
      x: 0,
      y: 32,
      width: 256,
      height: 128,
      children: [
        // Clock face, etc.
      ],
    }),

    // Footer
    new Panel({
      x: 0,
      y: 160,
      width: 256,
      height: 32,
      children: [new Label("[Tab] Help", { x: 8, y: 8 })],
    }),
  ],
});

// Render entire hierarchy
mainView.render(matrix);
```

---

## 6. Focus Management

### Keyboard Navigation

```typescript
class FocusManager {
  private focusables: Widget[] = [];
  private currentIndex: number = 0;

  register(widget: Widget): void {
    this.focusables.push(widget);
  }

  next(): void {
    this.focusables[this.currentIndex].focused = false;
    this.currentIndex = (this.currentIndex + 1) % this.focusables.length;
    this.focusables[this.currentIndex].focused = true;
  }

  prev(): void {
    this.focusables[this.currentIndex].focused = false;
    this.currentIndex =
      (this.currentIndex - 1 + this.focusables.length) % this.focusables.length;
    this.focusables[this.currentIndex].focused = true;
  }

  handleEvent(event: InputEvent): boolean {
    // Tab to cycle focus
    if (event.key === "Tab" && !event.shift) {
      this.next();
      return true;
    }
    if (event.key === "Tab" && event.shift) {
      this.prev();
      return true;
    }

    // Pass to focused widget
    const focused = this.focusables[this.currentIndex];
    return focused.handleEvent(event);
  }
}
```

---

## 7. Implementation Priority

### Phase 1: Core UI (Week 1)

1. ✅ Widget base class
2. ✅ Container/View system
3. ✅ Panel component
4. ✅ Label component
5. ✅ Button component
6. ✅ Modal system
7. ✅ HelpModal helper

### Phase 2: Controls (Week 2)

1. TextInput
2. Toggle/Switch
3. Slider
4. ProgressBar
5. Icon component

### Phase 3: Layout (Week 3)

1. VStack/HStack
2. Grid layout
3. Auto-layout engine
4. Spacer/Divider

### Phase 4: Testing (Week 4)

1. HeadlessDisplay
2. InputSimulator
3. TestRunner
4. Assertions library
5. Example tests

---

## 8. Breaking Changes from Current Code

### Input Handling

**OLD:**

```typescript
onEvent(event: InputEvent): boolean {
  if (event.key === ' ') {
    this.toggleMode();
    return true;
  }
  return false;
}
```

**NEW:**

```typescript
onEvent(event: InputEvent): boolean {
  // 1. Help key first
  if (event.key === InputKeys.HELP) {
    this.helpModal.toggle();
    return true;
  }

  // 2. Modal intercepts if visible
  if (this.modal.visible && this.modal.handleEvent(event)) {
    return true;
  }

  // 3. App logic
  if (event.key === InputKeys.ACTION) {
    this.toggleMode();
    return true;
  }
  return false;
}
```

### Rendering with UI

**OLD:**

```typescript
render(matrix: DisplayBuffer): void {
  matrix.clear();
  matrix.text("Press Space", 10, 180, [255, 255, 255]);
  this.dirty = false;
}
```

**NEW:**

```typescript
render(matrix: DisplayBuffer): void {
  matrix.clear();

  // App content
  this.drawContent(matrix);

  // UI overlay (footer)
  this.footer.render(matrix);

  // Modal on top
  this.helpModal.render(matrix);

  this.dirty = false;
}
```

---

## 9. Migration Path for Existing Apps

### Clock App Updates

```typescript
// Add help modal
private helpModal = HelpModal.create([
  { key: "Space", action: "Toggle analog/digital" },
  { key: "Tab", action: "Show help" },
  { key: "ESC", action: "Return to launcher" }
]);

// Update event handler
onEvent(event: InputEvent): boolean {
  // Help key
  if (event.key === InputKeys.HELP) {
    this.helpModal.toggle();
    this.dirty = true;
    return true;
  }

  // Modal intercepts
  if (this.helpModal.visible) {
    return this.helpModal.handleEvent(event);
  }

  // Existing logic
  if (event.key === ' ') {
    this.mode = this.mode === 'analog' ? 'digital' : 'analog';
    this.dirty = true;
    return true;
  }

  return false;
}

// Update render
render(matrix: DisplayBuffer): void {
  // Existing rendering...

  // Remove old help text
  // matrix.text("[Space: Digital]", 4, 180, [128, 128, 128]);

  // Add modal
  this.helpModal.render(matrix);

  this.dirty = false;
}
```

### Launcher App Updates

```typescript
// Add help modal
private helpModal = HelpModal.create([
  { key: "Arrow Keys", action: "Navigate apps" },
  { key: "Enter/Space", action: "Launch app" },
  { key: "Tab", action: "Show help" },
  { key: "ESC", action: "Exit PiZXel" }
]);
```

---

## 10. Device Driver Architecture & Bluetooth Support (Priority: HIGH)

### Philosophy

Following Python version: **"OS on an OS"** - MatrixOS as complete operating system with hardware abstraction

### Platform Support

PiZXel runs on:

- **Development**: macOS/Linux/Windows (terminal display + keyboard)
- **Deployment**: Raspberry Pi (HDMI + Bluetooth devices)
- **Hardware**: LED matrices (SPI), various input devices

### Device Driver System

```
pizxel/devices/
├── display/
│   ├── terminal-display.ts          # ✅ Current default (cross-platform)
│   ├── hdmi-display.ts               # 🔜 Raspberry Pi HDMI output
│   ├── led-matrix-display.ts        # 🔜 RGB LED matrix (SPI)
│   └── canvas-http-display.ts       # 🔜 Web browser display
├── input/
│   ├── terminal-keyboard.ts         # ✅ Current default
│   ├── bluetooth-keyboard.ts        # 🔜 Standard BT keyboard
│   ├── spectrum-keyboard.ts         # 🔜 Recreated Spectrum keyboard (both modes!)
│   ├── bluetooth-remote.ts          # 🔜 IR/BT remote control
│   └── bluetooth-gamepad.ts         # 🔜 Console-style gamepad
├── base.ts                          # DisplayDriver & InputDriver base classes
├── device-manager.ts                # Central registry & lifecycle
└── discovery.ts                     # Bluetooth device discovery + pairing
```

### Boot-Time Discovery

**First Boot Flow:**

1. **Check config** - `~/.pizxel/config.json` for paired devices
2. **No devices?** - Trigger auto-discovery sequence
3. **Scan animation** - "SEARCHING FOR DEVICES..." with pulsing circles
4. **Find & classify** - Detect keyboards, remotes, gamepads
5. **Show device list** - Icons + device names
6. **User selects** - Arrow keys to choose devices
7. **Pair & save** - Connect via Bluetooth, save to config
8. **Fallback** - Terminal keyboard if no devices found

### Discovery Screen

```typescript
class InputDiscoveryScreen {
  private scanning = true;
  private foundDevices: BluetoothDevice[] = [];

  async run(): Promise<DeviceConfig[]> {
    // Show animated scanning screen
    this.showScanningAnimation();

    // Scan for Bluetooth devices in pairing mode
    await this.scanBluetoothDevices();

    if (this.foundDevices.length === 0) {
      // No devices found - use terminal input
      return this.fallbackToTerminal();
    }

    // Show device list, let user select
    return this.showDeviceSelection();
  }

  private showScanningAnimation(): void {
    // Pulsing circles, "SEARCHING..." text (ZX Spectrum style)
    // Cyan border, white text, animated dots
  }

  private async scanBluetoothDevices(): Promise<void> {
    // Use Node.js Bluetooth library (e.g., noble)
    // Classify by device type (keyboard, remote, gamepad)
    // Show found devices in real-time
  }

  private classifyDevice(device: BluetoothDevice): string {
    const name = device.name.toLowerCase();
    if (name.includes("spectrum")) return "spectrum_keyboard";
    if (name.includes("keyboard")) return "bluetooth_keyboard";
    if (name.includes("remote")) return "bluetooth_remote";
    if (name.includes("gamepad") || name.includes("controller")) {
      return "bluetooth_gamepad";
    }
    return "unknown";
  }
}
```

### ZX Spectrum Keyboard Recreation

**Special Feature:** Recreated Spectrum keyboard with **dual modes**

1. **Spectrum Mode** (Authentic)

   - Original ZX Spectrum key layout
   - Rubber keys feel (membrane switches)
   - Authentic key combinations (SHIFT + number = graphics)
   - Perfect for Spectrum emulator app

2. **Standard Mode** (Modern)
   - Standard QWERTY layout
   - Normal keyboard behavior
   - Better for general apps
   - Toggle with hardware switch

```typescript
class SpectrumKeyboardDriver extends InputDriver {
  private mode: "spectrum" | "standard";

  initialize(): boolean {
    // Connect via Bluetooth
    // Detect mode from hardware switch
    this.mode = this.detectMode();
    return true;
  }

  poll(): InputEvent[] {
    const events: InputEvent[] = [];
    const rawKey = this.readFromBluetooth();

    if (this.mode === "spectrum") {
      // Translate Spectrum key combinations
      events.push(this.translateSpectrumKey(rawKey));
    } else {
      // Standard keyboard mapping
      events.push(this.translateStandardKey(rawKey));
    }

    return events;
  }

  private translateSpectrumKey(key: string): InputEvent {
    // Handle Spectrum-specific combinations
    // SHIFT + 1 = "!" (but also graphics character in BASIC)
    // SHIFT + 2 = "@" (or graphics)
    // Symbol Shift combinations
  }
}
```

### Bluetooth Remote Support

**Console-Style Experience:**

```typescript
class BluetoothRemoteDriver extends InputDriver {
  private readonly keyMap = {
    UP: InputKeys.UP,
    DOWN: InputKeys.DOWN,
    LEFT: InputKeys.LEFT,
    RIGHT: InputKeys.RIGHT,
    OK: InputKeys.OK,
    BACK: InputKeys.BACK,
    MENU: InputKeys.HELP,
    // IR remote buttons mapped to MatrixOS keys
  };

  poll(): InputEvent[] {
    const button = this.readRemoteButton();
    if (button in this.keyMap) {
      return [new InputEvent(this.keyMap[button])];
    }
    return [];
  }
}
```

### Device Manager

```typescript
class DeviceManager {
  private displayDrivers = new Map<string, DisplayDriverClass>();
  private inputDrivers = new Map<string, InputDriverClass>();
  private activeDisplay?: DisplayDriver;
  private activeInputs: InputDriver[] = [];

  registerDisplayDriver(name: string, driverClass: DisplayDriverClass): void {
    this.displayDrivers.set(name, driverClass);
  }

  registerInputDriver(name: string, driverClass: InputDriverClass): void {
    this.inputDrivers.set(name, driverClass);
  }

  autoDetectPlatform(): Platform {
    // Detect: "macos" | "linux" | "raspberry-pi" | "windows"
    const platform = process.platform;
    if (platform === "darwin") return "macos";
    if (platform === "linux") {
      // Check if Raspberry Pi
      if (this.isRaspberryPi()) return "raspberry-pi";
      return "linux";
    }
    return "windows";
  }

  selectBestDisplay(): DisplayDriver {
    // Get all available drivers
    const available = Array.from(this.displayDrivers.values())
      .filter((dc) => dc.isAvailable())
      .sort((a, b) => b.getPriority() - a.getPriority());

    if (available.length === 0) {
      throw new Error("No display driver available!");
    }

    return new available[0](256, 192);
  }

  async initializeInputs(): Promise<boolean> {
    const config = await this.loadConfig();
    const configuredInputs = config.inputDevices || [];

    if (configuredInputs.length === 0) {
      // No inputs configured - trigger first-boot discovery
      return this.firstBootInputSetup();
    }

    // Initialize configured inputs
    for (const inputConfig of configuredInputs) {
      const driverClass = this.inputDrivers.get(inputConfig.driver);
      if (driverClass) {
        const driver = new driverClass();
        if (await driver.initialize()) {
          this.activeInputs.push(driver);
        }
      }
    }

    return this.activeInputs.length > 0;
  }

  private async firstBootInputSetup(): Promise<boolean> {
    // Show discovery screen
    const discovery = new InputDiscoveryScreen(this.activeDisplay!);
    const selectedDevices = await discovery.run();

    if (selectedDevices.length > 0) {
      // Save to config
      await this.saveConfig({ inputDevices: selectedDevices });
      return true;
    }

    // Fallback to terminal input
    return this.initializeTerminalInput();
  }
}
```

### Configuration Storage

```json
// ~/.pizxel/config.json
{
  "display": {
    "driver": "terminal-display",
    "width": 256,
    "height": 192
  },
  "inputDevices": [
    {
      "driver": "spectrum_keyboard",
      "deviceId": "XX:XX:XX:XX:XX:XX",
      "name": "ZX Spectrum Keyboard",
      "mode": "spectrum"
    },
    {
      "driver": "bluetooth_remote",
      "deviceId": "YY:YY:YY:YY:YY:YY",
      "name": "8BitDo Remote"
    }
  ],
  "bluetooth": {
    "autoDiscoverOnBoot": true,
    "pairingTimeout": 30
  }
}
```

### Implementation Priority

1. **Phase 1** (Immediate): Base architecture (DisplayDriver, InputDriver, DeviceManager)
2. **Phase 2** (High): Bluetooth keyboard driver + discovery
3. **Phase 3** (High): Spectrum keyboard support (both modes)
4. **Phase 4** (Medium): Bluetooth remote driver
5. **Phase 5** (Medium): Gamepad support
6. **Phase 6** (Low): HDMI display driver (Pi-specific)
7. **Phase 7** (Low): LED matrix driver (hardware-specific)

---

## 11. Design Decisions Summary

| Decision                      | Rationale                                                  |
| ----------------------------- | ---------------------------------------------------------- |
| **Tab key for help**          | Non-conflicting, standard in many UIs, easy to reach       |
| **Modal always on top**       | Predictable z-ordering, focus management                   |
| **Help checked first**        | Ensure help always accessible, even if app has Tab logic   |
| **Pure TypeScript testing**   | No external dependencies, works in CI/CD, fast             |
| **Composable UI widgets**     | Flexibility for complex interfaces, reusable               |
| **ZX Spectrum theme default** | Matches project aesthetic, authentic retro feel            |
| **Focus manager built-in**    | Keyboard navigation accessibility, consistent UX           |
| **Device driver abstraction** | Platform independence, hot-plug support, graceful fallback |
| **Boot-time discovery**       | Zero-config for new devices, user-friendly setup           |
| **Spectrum keyboard modes**   | Authentic retro + practical modern use                     |
| **Multiple input devices**    | Keyboard + remote simultaneously, flexible control         |

---

---

## 12. Implementation Checklist

**UI Framework Core:**

- [x] Create `pizxel/ui/` directory structure
- [x] Implement Widget base class
- [x] Implement Container base class
- [x] Implement Panel component
- [x] Implement Modal system
- [x] Implement HelpModal helper
- [x] Implement Button component
- [x] Implement Label component
- [x] Export all UI components from index.ts
- [ ] Add InputKeys.HELP to types (verify exists)
- [ ] Verify AppFramework doesn't intercept Tab

**Testing Framework:**

- [ ] Create `pizxel/testing/` directory
- [ ] Implement HeadlessDisplay
- [ ] Implement InputSimulator
- [ ] Implement TestRunner
- [ ] Implement Assertions
- [ ] Write example tests

**Device Driver System:**

- [ ] Create `pizxel/devices/` directory structure
- [ ] Implement DisplayDriver base class
- [ ] Implement InputDriver base class
- [ ] Implement DeviceManager
- [ ] Implement TerminalDisplay (wrap existing)
- [ ] Implement TerminalKeyboard (wrap existing)
- [ ] Implement BluetoothKeyboardDriver
- [ ] Implement SpectrumKeyboardDriver (dual mode)
- [ ] Implement BluetoothRemoteDriver
- [ ] Implement InputDiscoveryScreen
- [ ] Implement Bluetooth scanning/pairing
- [ ] Add device config storage

**App Updates:**

- [ ] Update Clock app with help modal
- [ ] Update Launcher app with help modal
- [ ] Update Test app with help modal
- [ ] Remove old inline help text

**Documentation:**

- [ ] Document UI system in docs/
- [ ] Document testing in docs/
- [ ] Document device drivers in docs/
- [ ] Update README with Bluetooth setup

**Additional UI Controls (Phase 3):**

- [ ] TextInput component
- [ ] Toggle/Switch component
- [ ] Slider component
- [ ] ProgressBar component
- [ ] Icon component

**Layout System (Phase 4):**

- [ ] VStack/HStack layout
- [ ] Grid layout
- [ ] Spacer component
- [ ] Auto-layout engine

**Canvas HTTP Display (Phase 2 Original):**

- [ ] Express server on port 3000
- [ ] Socket.IO integration
- [ ] HTML canvas rendering
- [ ] Priority 80 display driver

---

**Next Steps:** Continue with existing plan (app updates), then implement testing framework, then device driver system.
