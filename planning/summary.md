# PiZXel Technical Specification

## Retro Quasi-OS with ZX Spectrum Aesthetics

## Project Overview

**PiZXel** is a retro-inspired quasi-operating system designed to run on Raspberry Pi with ZX Spectrum aesthetics, supporting multiple display outputs including LED matrices, HDMI, and desktop development windows. The system provides a launcher-based interface for various retro computing applications, with particular emphasis on ZX Spectrum emulation and professional work monitoring capabilities.

**Primary Use Cases:**

1. **Work Dashboard**: Real-time support ticket monitoring with color-coded alerts (green for standard tickets, red alerts for chat tickets requiring immediate attention)
1. **Picture Frame Display**: Dynamic photo slideshow with weather/time overlays, time-of-day responsive themes
1. **Retro Gaming Hub**: Authentic ZX Spectrum emulation plus custom retro games (Tetris, clock apps, demos)
1. **Flexible Single-Purpose Displays**: Support for dedicated small displays (64x64, 128x128) running single applications

## Architecture Migration: Python → Node.js/TypeScript

### Current State

- Python-based proof of concept
- Terminal and Pygame output drivers
- Virtual display driver architecture
- Icon-based app launcher
- ZX Spectrum character set and resolution (256x192)

### Migration Rationale

- Developer comfort zone: TypeScript/Node.js preferred over Python
- Better ecosystem integration with JSSpeccy3 (JavaScript-based emulator)
- Excellent hardware libraries available for Node.js on Raspberry Pi
- Superior JSSpeccy3 integration without licensing complications
- Modern JavaScript performance suitable for Raspberry Pi Zero 2
- **Existing work dashboard already Node.js-based**: Seamless integration of existing ticketing system API logic
- **Event-driven architecture**: Perfect for background ticket monitoring and real-time alerts
- **HTTP/WebSocket support**: Excellent libraries for both polling and webhook-based integrations

### Technology Stack

- **Runtime**: Node.js (latest LTS with experimental TypeScript support)
- **Language**: TypeScript (with build step using tsx/ts-node for reliability)
- **Hardware Libraries**:
  - GPIO: `rpi-gpio`, `pigpio`
  - Bluetooth: `@abandonware/noble`, `bluetooth-serial-port`
  - USB: `usb`, `node-hid`
  - Desktop Development: SDL2 bindings (`node-sdl2`)

## JSSpeccy3 Integration Strategy

### Emulator Selection: JSSpeccy3

- High-performance WebAssembly-based ZX Spectrum emulator
- Three-tier architecture: WebAssembly core, Web Worker, UI thread
- Built-in Recreated ZX Spectrum keyboard support
- Excellent emulation accuracy and performance
- Active development and maintenance

### Integration Approach

**Frame Buffer Interception Method:**

- JSSpeccy3 generates raw pixel data (frame buffer)
- Custom display router captures pixel data before web canvas rendering
- Route pixel data to appropriate display drivers (LED matrix, HDMI, SDL)
- No web canvas required for hardware output

**Licensing Solution:**

- JSSpeccy3 is GPL v3 licensed
- Core quasi-OS remains MIT licensed
- Dynamic download approach: JSSpeccy3 downloaded at runtime, not distributed
- Legal separation maintained through separate processes
- User consent required for GPL component download

### Implementation Architecture

```
[JSSpeccy3 Core] → [Frame Buffer Data] → [Display Router] → [Output Drivers]
                                                          ├─ LED Matrix Driver
                                                          ├─ HDMI/Framebuffer Driver
                                                          └─ SDL Desktop Driver
```

## Virtual Driver Architecture

### Display Drivers

**LED Matrix Driver:**

- GPIO-based control for LED matrix displays
- 256x192 resolution mapping
- Color depth conversion as needed
- SPI interface support

**HDMI Driver:**

- Linux framebuffer device interface (`/dev/fb0`)
- Direct memory mapping for performance
- Resolution scaling and aspect ratio handling

**SDL Desktop Driver (Development):**

- Cross-platform window creation
- Mouse and keyboard input capture
- Real-time preview during development
- Lightweight alternative to Electron

**Terminal Driver (Debug/Fallback):**

- ASCII art rendering for debugging
- Minimal resource requirements
- Always available fallback option

### Input Drivers

**Virtual Input Driver Architecture:**

- Common input format for all device types
- Device-specific drivers translate to standard events
- Context-aware routing (launcher vs. app-specific input)
- Auto-detection and device fingerprinting

**USB Keyboard Driver:**

- Standard HID keyboard support
- Immediate availability (no pairing required)
- Fallback option for setup and troubleshooting
- Device detection via `/dev/input/event*` monitoring

**Recreated ZX Spectrum Keyboard Driver:**
**Game Mode (Layer A):**

- Unique character pair encoding for each key
- Press/release detection: Key ‘1’ → ‘a’/‘b’, Key ‘2’ → ‘c’/‘d’, etc.
- Complete mapping table for all 40 keys
- Instant mode detection from first keypress

**QWERTY Mode (Layer B):**

- Standard keyboard HID codes
- Limited functionality (40 keys only)
- Automatic mode detection

**Smart Mode Translation:**

- Driver detects current mode automatically
- Game Mode: Translates character pairs to standard navigation
- QWERTY Mode: Passes through standard key codes
- Persistent mode detection per session
- Seamless experience regardless of switch position

**Bluetooth Camera Remote Driver:**

- Standard HID device support
- Simple button mapping (arrows, shutter → select, +/- → page up/down)
- Automatic device classification
- Cross-room navigation control

## Installation and Setup System

### Minimal Installation Requirements

**Target Setup:**

- Fresh Raspberry Pi OS Lite installation
- Single `git clone` command
- Automated dependency installation
- Zero-configuration startup

**Installation Flow:**

1. `git clone [repository]`
1. `npm install` (handles Node.js dependencies)
1. `npm run setup` (system-level dependencies, GPIO enabling)
1. `npm start` (launches quasi-OS)

### Auto-Detection System

**Hardware Detection:**

- GPIO availability (LED matrix capability)
- HDMI output status
- Desktop environment presence
- Input device enumeration

**Device Discovery Workflow:**
**First Boot:**

1. Check for USB keyboards (instant detection via `/dev/input`)
1. If USB keyboard found: Register device, launch launcher
1. If no USB keyboard: Launch Bluetooth discovery mode
1. Discovery UI: Scan for pairable HID devices
1. Device fingerprinting: Identify device types (Spectrum keyboard, remote, etc.)
1. Interactive confirmation: “Press shutter to confirm camera remote”
1. Save device profiles to settings for auto-reconnect

**Subsequent Boots:**

- Automatic detection and reconnection to known devices
- Fallback to discovery if registered devices unavailable
- Dynamic adaptation to hardware changes

### App Store Model (Future)

**App Structure:**

- Self-contained folders in `/apps` directory
- Required files: `main.js` (or `main.ts`), `app.json`
- Optional files: `icon.png`, additional assets
- Automatic detection of new apps in folder

**App Lifecycle Architecture:**
All apps implement a standard lifecycle interface for multitasking and state management:

```typescript
interface QuasiOSApp {
  onStart(): Promise<void>;                    // App initialization
  onUpdate(deltaTime: number): Promise<void>;  // Called every frame/tick
  onInput(inputEvent: InputEvent): Promise<void>;  // Handle input events
  onPause(): Promise<void>;                    // App goes to background
  onResume(): Promise<void>;                   // App returns to foreground
  onStop(): Promise<void>;                     // Clean shutdown
  onSaveState(): Promise<AppState>;            // Save current state
  onLoadState(state: AppState): Promise<void>; // Restore saved state
  onNotification(notification: Notification): Promise<void>; // Handle system notifications
}

// Example Spectrum Emulator App Implementation
class SpectrumEmulatorApp implements QuasiOSApp {
  private jsspeccy3Instance: JSSpeccy3;
  private currentGameState: SnapshotData;
  
  async onStart() {
    await this.initializeJSSpeccy3();
    // Prompt: "Resume previous game?" if saved state exists
    if (await this.hasSavedState()) {
      const resume = await this.promptResumeGame();
      if (resume) await this.loadLastGame();
    }
  }
  
  async onPause() {
    // Pause emulation and auto-save current state
    this.jsspeccy3Instance.pause();
    this.currentGameState = this.jsspeccy3Instance.getSnapshot();
    await this.saveGameSession();
  }
  
  async onResume() {
    // Resume emulation from saved state
    if (this.currentGameState) {
      this.jsspeccy3Instance.loadSnapshot(this.currentGameState);
    }
    this.jsspeccy3Instance.resume();
  }
  
  async onSaveState(): Promise<AppState> {
    // Auto-save for system shutdown/restart
    return {
      snapshot: this.jsspeccy3Instance.getSnapshot(),
      gameFile: this.currentGame,
      timestamp: Date.now(),
      inputMode: this.keyboardMode
    };
  }
  
  async onNotification(notification: Notification) {
    if (notification.priority === 'urgent') {
      // Show overlay without stopping emulation
      await this.showNotificationOverlay(notification);
    }
  }
}

// Example Work Dashboard App (Background Service)
class WorkDashboardApp implements QuasiOSApp {
  private isInBackground = false;
  
  async onUpdate(deltaTime: number) {
    // Continue monitoring tickets even in background
    await this.checkTickets();
    if (this.hasUrgentTicket() && !this.isInBackground) {
      await this.triggerUrgentAlert();
    }
  }
  
  async onPause() {
    this.isInBackground = true;
    // Reduce polling frequency but continue monitoring
    this.setPollingInterval(60000); // 1 minute instead of 30 seconds
  }
}
```

**Notification and Interruption System:**

```typescript
class NotificationManager {
  showUrgentTicketNotification(ticket: TicketAlert) {
    // Semi-transparent overlay - doesn't stop underlying app
    this.createOverlay({
      type: 'urgent-ticket',
      backgroundColor: 'rgba(255, 0, 0, 0.8)',
      message: `Urgent: Chat ticket #${ticket.id} needs attention`,
      sound: 'urgent-alert.wav',
      actions: ['Dismiss', 'View Dashboard', 'Pause Current App'],
      autoHide: false // Requires user interaction
    });
  }
  
  showTimerNotification(timerApp: TimerApp) {
    this.createOverlay({
      type: 'timer-complete',
      backgroundColor: 'rgba(0, 255, 0, 0.6)',
      message: 'Timer Complete!',
      sound: 'timer-bell.wav',
      actions: ['Dismiss', 'Restart Timer'],
      autoHide: 5000 // Auto-dismiss after 5 seconds
    });
  }
  
  async handleNotificationAction(action: string, context: any) {
    switch(action) {
      case 'Dismiss':
        this.hideOverlay();
        break;
      case 'View Dashboard': 
        await this.pauseCurrentApp();
        await this.switchToApp('work-dashboard');
        break;
      case 'Pause Current App':
        await this.pauseCurrentApp();
        this.showPausedAppMenu();
        break;
      case 'Restart Timer':
        context.timerApp.restart();
        this.hideOverlay();
        break;
    }
  }
}
```

**State Management System:**

```typescript
class StateManager {
  async saveAppState(appId: string, state: AppState) {
    const stateFile = `./states/${appId}-${Date.now()}.json`;
    await fs.writeFile(stateFile, JSON.stringify(state));
    
    // Update app's last state pointer
    this.updateLastStatePointer(appId, stateFile);
  }
  
  async loadLastAppState(appId: string): Promise<AppState | null> {
    const lastStateFile = this.getLastStatePointer(appId);
    if (!lastStateFile || !fs.existsSync(lastStateFile)) return null;
    
    const stateData = await fs.readFile(lastStateFile, 'utf8');
    return JSON.parse(stateData);
  }
  
  async promptResumeGame(appName: string): Promise<boolean> {
    // Show ZX Spectrum-style prompt
    return await this.showPromptDialog({
      title: appName,
      message: 'Resume previous session?',
      options: ['Yes', 'No'],
      defaultOption: 'Yes'
    });
  }
}
```

**Multi-App Coordination:**

- Apps can run simultaneously in background
- Foreground app receives input events
- Background apps continue update() calls at reduced frequency
- State automatically saved on app pause/system shutdown
- Notification system allows interruption without data loss
- Audio mixing for alert sounds over app audio

**App Manifest (`app.json`):**

```json
{
  "name": "ZX Spectrum Emulator",
  "description": "Full ZX Spectrum emulation",
  "version": "1.0.0",
  "icon": "spectrum.png",
  "inputRequirements": {
    "inputMode": "spectrum",
    "supportsJoypad": true,
    "requiresKeyboard": true,
    "preferredDevices": ["recreated-spectrum"]
  },
  "displayRequirements": {
    "minResolution": "256x192",
    "supportsFullscreen": true
  }
}
```

**Future Distribution:**

- ZIP file download and extraction
- Automatic app registration
- Dependency management
- Update mechanism

## Work Dashboard Integration

### Support Ticket Monitoring System

**Current Architecture (Node.js-based):**

- Backend server handles ticket processing and data aggregation
- Small web app displays data via HTTP polling and webhooks
- Custom ticketing system with JavaScript/Node.js backend
- Color-coded alert system: Green (standard tickets), Red (urgent chat tickets)

**Migration Strategy:**

- Reuse existing Node.js backend API logic
- Create new “retro dashboard driver” for quasi-OS display
- Maintain dual HTTP polling and webhook support
- Adapt color scheme to ZX Spectrum aesthetic while preserving functionality

**Real-Time Alert System:**

```javascript
// Background service for ticket monitoring
class TicketMonitor {
  async startPolling() {
    // HTTP polling for ticket status
    setInterval(async () => {
      const tickets = await this.fetchTickets();
      this.processTicketUpdates(tickets);
    }, this.config.pollInterval);
  }

  setupWebhookListener() {
    // WebSocket or HTTP webhook endpoint
    this.server.on('ticketUpdate', (data) => {
      this.handleUrgentTicket(data);
      this.triggerVisualAlert(data.priority);
    });
  }

  triggerVisualAlert(priority) {
    if (priority === 'chat-urgent') {
      this.displayDriver.setBackgroundColor('red');
      this.audioDriver.playAlert();
      this.showTicketOverlay();
    } else {
      this.displayDriver.setIndicator('green');
    }
  }
}
```

**Display Modes:**

- **Day Mode**: Professional dashboard with ticket counts, status indicators
- **Evening Mode**: Subtle transition to picture frame with minimal work indicators
- **Alert Mode**: Full-screen red alert for urgent chat tickets
- **Background Mode**: Discrete indicators while other apps are active

### Multi-App Background Services

**Event-Driven Architecture:**

- Work dashboard runs as background service regardless of foreground app
- Real-time webhook processing for immediate alerts
- HTTP polling for periodic status updates
- Event bus for inter-app communication

**Background Service Types:**

```typescript
interface BackgroundService {
  start(): Promise<void>;
  stop(): Promise<void>;
  onEvent(event: string, handler: Function): void;
}

class WorkDashboardService implements BackgroundService {
  // Ticket monitoring in background
}

class WeatherService implements BackgroundService {
  // Weather updates for picture frame
}

class ClockService implements BackgroundService {
  // Time updates and scheduling
}
```

### Network Requirements

**API Integration:**

- HTTP client for ticket API polling
- WebSocket support for real-time notifications
- HTTPS/SSL support for secure connections
- Webhook endpoint hosting capability
- Error handling and retry logic for network failures

**Configuration:**

```json
{
  "workDashboard": {
    "enabled": true,
    "apiEndpoint": "https://tickets.company.com/api",
    "webhookPort": 3000,
    "pollInterval": 30000,
    "alertSounds": true,
    "colorScheme": {
      "normal": "green",
      "urgent": "red",
      "warning": "yellow"
    }
  }
}
```

## JSSpeccy3 Integration Details

### Dynamic Download Approach

**Legal Compliance:**

- No GPL code distributed with main project
- Runtime download with explicit user consent
- Clear licensing information displayed
- Option to decline GPL components

**Implementation:**

```javascript
// In Spectrum Emulator app launcher
if (!jsspeccy3Available()) {
  showConsentDialog({
    title: "ZX Spectrum Emulator",
    message: "Requires JSSpeccy3 (GPL licensed). Download ~2MB?",
    onAccept: () => downloadJSSpeccy3(),
    onDecline: () => returnToLauncher()
  });
}
```

**Update Strategy:**

- Automatic updates via `git pull` on JSSpeccy3 repository
- Version compatibility checking
- Fallback to known working versions

### Mode Detection and Switching

**Recreated Spectrum Keyboard Modes:**

- No automatic switch detection (hardware limitation)
- Mode confirmed via keypress after physical switch
- Character pair detection identifies Game Mode instantly
- Standard key codes identify QWERTY Mode

**User Flow for Mode Switching:**

```
User launches Spectrum Emulator
↓
System detects keyboard in QWERTY Mode
↓
Display: "Please switch to Game Mode (position A) and press any key"
↓
User flips switch and presses key
↓
System detects Game Mode character pairs
↓
Display: "Switch detected! Launching emulator..."
↓
Launch JSSpeccy3 with Game Mode input
```

**Navigation in Game Mode:**

- Input driver translates Game Mode character pairs to standard navigation
- Arrow keys work seamlessly for launcher navigation
- No mode switching required for basic system use
- Only prompt for mode switch when launching Spectrum-specific apps

### Recreated Spectrum Character Pair Mapping

**Game Mode (Layer A) Complete Mapping:**

```
Key         Press   Release
1           a       b
2           c       d
3           e       f
4           g       h
5           i       j
6           k       l
7           m       n
8           o       p
9           q       r
0           s       t
Q           u       v
W           w       x
E           y       z
R           A       B
T           C       D
Y           E       F
U           G       H
I           I       J
O           K       L
P           M       N
A           O       P
S           Q       R
D           S       T
F           U       V
G           W       X
H           Y       Z
J           0       1
K           2       3
L           4       5
ENTER       6       7
CAPS SHIFT  8       9
Z           <       >
X           -       =
C           [       ]
V           ;       :
B           ,       .
N           /       ?
M           {       }
SYMBOL SHIFT !      $
SPACE       %       ^
```

## Hardware Target Specifications

### Primary Target: Raspberry Pi Zero 2 W

**Rationale:**

- Low power consumption for picture frame deployment
- Sufficient performance for JavaScript/Node.js
- Built-in WiFi and Bluetooth
- Compact form factor
- Affordable

**Performance Considerations:**

- Modern JavaScript engines perform well
- WebAssembly may be memory-intensive (fallback to pure JS Z80 core)
- Frame rate target: 50 FPS (PAL Spectrum standard)
- Audio buffer management critical for smooth performance

### Display Options

**LED Matrix:**

- Native 256x192 resolution ideal
- GPIO control via SPI interface
- Color depth: RGB or single color depending on matrix
- Picture frame integration for retro aesthetic

**HDMI Output:**

- Standard monitor/TV support
- Framebuffer interface
- Upscaling with aspect ratio preservation
- CRT filter effects optional

**Desktop Development:**

- SDL2 window on Mac/Linux/Windows
- Real-time preview during coding
- Mouse and keyboard input testing
- Hot reload capability

## Input Device Support Matrix

|Device Type        |Connection|Detection   |Mode Support |Use Cases                     |
|-------------------|----------|------------|-------------|------------------------------|
|USB Keyboard       |Wired     |Instant     |Standard     |Setup, development, fallback  |
|Recreated Spectrum |BT/USB    |Pairing/Auto|Game + QWERTY|Spectrum emulation, navigation|
|Camera Remote      |Bluetooth |Pairing     |HID          |Navigation, basic control     |
|Generic BT Keyboard|Bluetooth |Pairing     |Standard     |General input                 |
|Joy-Con/Gamepad    |Bluetooth |Pairing     |Gamepad      |Future game support           |

## Boot Sequence and Startup Flow

**System Initialization:**

1. Hardware detection (GPIO, displays, USB devices)
1. Load configuration from `config.json`
1. Initialize display driver based on available hardware
1. Input device detection and connection
1. Launch main launcher UI
1. Auto-start configured apps (optional)

**Input Device Initialization:**

```javascript
// Pseudocode startup flow
async function initializeInput() {
  // Check for USB keyboards first (fastest)
  const usbKeyboards = await detectUSBKeyboards();
  if (usbKeyboards.length > 0) {
    registerInputDevices(usbKeyboards);
    return launchLauncher();
  }
  
  // No USB keyboard, check for known Bluetooth devices
  const savedDevices = loadSavedDeviceProfiles();
  const connectedDevices = await connectToKnownDevices(savedDevices);
  
  if (connectedDevices.length > 0) {
    return launchLauncher();
  }
  
  // No known devices, start discovery
  await launchBluetoothDiscovery();
}
```

## Development Workflow

### Local Development Environment

**Mac/Linux/Windows Development:**

- Clone repository
- `npm install`
- `npm run dev` (uses SDL desktop driver)
- Hot reload for rapid iteration
- Mock GPIO interfaces for testing without Pi

**Deployment to Pi:**

- Git pull on Pi or rsync during development
- Production mode automatically detects Pi hardware
- Test with actual LED matrices and Bluetooth devices

### Project Structure

```
retro-quasi-os/
├── src/
│   ├── core/
│   │   ├── launcher.ts         # Main app launcher
│   │   ├── input-router.ts     # Input device management
│   │   └── display-router.ts   # Display output management
│   ├── drivers/
│   │   ├── input/
│   │   │   ├── usb-keyboard.ts
│   │   │   ├── recreated-spectrum.ts
│   │   │   ├── bluetooth-remote.ts
│   │   │   └── base-input-driver.ts
│   │   └── display/
│   │       ├── led-matrix.ts
│   │       ├── framebuffer.ts
│   │       ├── sdl-desktop.ts
│   │       └── base-display-driver.ts
│   ├── apps/
│   │   └── [app-folders]/
│   │       ├── main.ts
│   │       ├── app.json
│   │       └── icon.png
│   └── lib/
│       └── jsspeccy3-integration/
│           ├── frame-capture.ts
│           ├── input-bridge.ts
│           └── downloader.ts
├── config/
│   ├── config.json              # System configuration
│   └── devices.json             # Saved device profiles
├── scripts/
│   ├── setup.sh                 # System setup script
│   └── install-jsspeccy3.js     # Dynamic JSSpeccy3 installer
├── package.json
├── tsconfig.json
└── README.md
```

## Configuration System

### System Configuration (`config.json`)

```json
{
  "display": {
    "autoDetect": true,
    "preferredDriver": "led-matrix",
    "resolution": {
      "width": 256,
      "height": 192
    },
    "framebuffer": {
      "device": "/dev/fb0",
      "scaling": "nearest"
    },
    "ledMatrix": {
      "gpio": {
        "dataPin": 10,
        "clockPin": 11
      },
      "brightness": 80
    }
  },
  "input": {
    "autoDetect": true,
    "discoveryOnFirstBoot": true
  },
  "system": {
    "autoStartOnBoot": false,
    "defaultApp": "launcher",
    "enableJSSpeccy3": true
  }
}
```

### Device Profiles (`devices.json`)

```json
{
  "knownDevices": [
    {
      "id": "recreated-spectrum-001",
      "name": "Recreated ZX Spectrum",
      "type": "recreated-spectrum",
      "connection": "bluetooth",
      "address": "AA:BB:CC:DD:EE:FF",
      "lastSeen": "2025-01-15T10:30:00Z",
      "currentMode": "game",
      "autoConnect": true
    },
    {
      "id": "camera-remote-001",
      "name": "Bluetooth Camera Remote",
      "type": "bluetooth-hid",
      "connection": "bluetooth",
      "address": "11:22:33:44:55:66",
      "buttonMap": {
        "shutter": "select",
        "plus": "pageUp",
        "minus": "pageDown"
      },
      "autoConnect": true
    }
  ]
}
```

## Key Technical Decisions Summary

### ✅ Chosen: Node.js + TypeScript

- Better ecosystem for hardware and JSSpeccy3 integration
- Developer expertise and comfort
- Excellent Pi support with mature libraries

### ✅ Chosen: JSSpeccy3 via Dynamic Download

- GPL licensing handled through runtime download
- User consent required
- Legal separation from MIT core project

### ✅ Chosen: Virtual Driver Architecture

- Clean abstraction for multiple input/output devices
- Easy to extend with new drivers
- Context-aware routing between apps

### ✅ Chosen: Smart Mode Detection

- Recreated Spectrum works in either mode
- Automatic translation for seamless experience
- Only prompt for mode switch when launching Spectrum apps

### ✅ Chosen: Auto-Detection and Discovery

- Minimal user configuration required
- USB keyboards work immediately
- Bluetooth discovery only when needed
- Device profiles saved for future sessions

## Implementation Phases

### Phase 1: Core Migration and App Lifecycle (MVP)

- [ ] Set up Node.js/TypeScript project structure with proper build pipeline
- [ ] Implement complete app lifecycle interface (QuasiOSApp) with all methods:
  - `onStart()`, `onUpdate()`, `onInput()`, `onPause()`, `onResume()`, `onStop()`
  - `onSaveState()`, `onLoadState()`, `onNotification()`
- [ ] Create event loop system supporting true multitasking
- [ ] Implement state management with automatic save/restore
- [ ] Add “Resume previous session?” prompts for all stateful apps
- [ ] Port existing Python apps (timer, clock, Tetris) to new lifecycle
- [ ] Create SDL desktop driver for cross-platform development
- [ ] Implement USB keyboard detection with instant availability
- [ ] Build app launcher with ZX Spectrum-style icon grid
- [ ] Basic notification overlay system (non-blocking)

### Phase 2: Work Dashboard Integration

- [ ] Port existing Node.js ticket monitoring backend logic
- [ ] Create work dashboard app implementing full lifecycle interface
- [ ] Implement background service architecture for continuous monitoring
- [ ] Add HTTP polling and webhook endpoint support
- [ ] Create color-coded alert system (green standard, red urgent chat tickets)
- [ ] Implement notification overlays that don’t interrupt foreground apps
- [ ] Add audio alert system with configurable sounds
- [ ] Support day/evening mode transitions (dashboard → picture frame)
- [ ] Test notification system with Spectrum emulator interruption

### Phase 3: Hardware Integration and Multi-Display

- [ ] Implement LED matrix GPIO driver with SPI support
- [ ] Add HDMI framebuffer driver with scaling and aspect ratio handling
- [ ] Create comprehensive Bluetooth device discovery system
- [ ] Implement Recreated Spectrum keyboard driver with smart mode detection
- [ ] Add camera remote support with button mapping
- [ ] Build device fingerprinting and automatic classification
- [ ] Add auto-pairing workflow with user confirmation prompts
- [ ] Support multiple concurrent input devices
- [ ] Implement device profiles and auto-reconnection

### Phase 4: JSSpeccy3 Integration and Spectrum Emulation

- [ ] Design JSSpeccy3 integration with frame buffer interception
- [ ] Implement dynamic download system with GPL licensing consent
- [ ] Create input bridge for Recreated keyboard Game Mode translation
- [ ] Build Spectrum emulator app with full lifecycle support
- [ ] Add automatic state save/resume for emulated games
- [ ] Implement mode switching workflow with user prompts
- [ ] Support notification interruption without losing game state
- [ ] Add snapshot management for multiple save states
- [ ] Test Game Mode to navigation translation seamlessly

### Phase 5: Picture Frame and Advanced Display Modes

- [ ] Create picture frame app with photo slideshow capabilities
- [ ] Add weather integration with API polling
- [ ] Implement time-of-day responsive themes and transitions
- [ ] Support high-color photo display with overlay information
- [ ] Add automatic switching between work/personal modes
- [ ] Create smooth transitions between different display modes
- [ ] Support multiple resolution targets (64x64, 128x128, 256x192)
- [ ] Add seasonal themes and dynamic backgrounds

### Phase 6: Polish, Deployment, and App Ecosystem

- [ ] Create automated installation scripts for fresh Pi OS
- [ ] Implement auto-boot configuration with systemd services
- [ ] Add comprehensive settings app for device and display management
- [ ] Build app store infrastructure with ZIP download/extraction
- [ ] Create developer documentation and app creation templates
- [ ] Add update mechanism for both system and individual apps
- [ ] Support custom SD card image generation (pi-gen integration)
- [ ] Add remote monitoring and diagnostic capabilities for deployed systems
- [ ] Create comprehensive user guides and troubleshooting documentation

### Phase 7: Extended Features and Community

- [ ] Add support for additional emulators (C64, Amstrad, etc.)
- [ ] Implement plugin architecture for third-party drivers
- [ ] Add networking features for multiplayer retro gaming
- [ ] Support custom hardware boards and PCB designs
- [ ] Create web-based configuration interface for remote management
- [ ] Add cloud backup and sync for app states and configurations
- [ ] Implement educational mode with programming tutorials
- [ ] Support for custom themes and visual customization

## References and Resources

### JSSpeccy3

- Repository: https://github.com/gasman/jsspeccy3
- Documentation: See project README and tech_notes.md
- License: GPL v3

### Recreated ZX Spectrum

- Unofficial FAQ: https://www.shadowmagic.org.uk/spectrum/recreated-zx-spectrum-faq.html
- Game Mode character pair mapping documented
- ZedCode blog notes on keyboard technical details

### Node.js Hardware Libraries

- rpi-gpio: GPIO access for Raspberry Pi
- pigpio: Advanced GPIO with hardware PWM
- @abandonware/noble: Bluetooth Low Energy
- node-hid: USB HID device access
- node-sdl2: SDL2 bindings for desktop development

### Raspberry Pi

- Raspberry Pi OS Lite recommended
- GPIO pinout and SPI configuration
- Framebuffer documentation
- Boot configuration and systemd services

-----

## Project Name

**Working Title:** PiZXel

A clever portmanteau combining:

- **Pi** - Raspberry Pi platform
- **ZX** - ZX Spectrum heritage and aesthetics
- **el** - Pixel displays (pronounced like “pixel”)

The name captures the essence of running ZX Spectrum-styled applications on Raspberry Pi with pixel-perfect displays, whether LED matrix, HDMI, or other output devices.

-----

## Document Version

- Version: 1.1
- Date: November 21, 2025
- Project Name: PiZXel (formerly Matrix OS)
- Based on: Comprehensive voice discussion covering architecture, implementation strategy, technical decisions, app lifecycle management, work dashboard integration, and state management systems