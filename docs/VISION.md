# MatrixOS - Vision & Roadmap

## What is MatrixOS?

MatrixOS is a lightweight, event-driven operating system for LED matrix displays. It provides a complete application framework that enables multiple apps to run cooperatively, switch between foreground and background, and communicate through a unified input/output system.

Think of it as a tiny OS for tiny screens - perfect for embedded devices like Raspberry Pi Zero with LED matrix displays.

## Core Architecture

### Event-Driven Design
- **Single Event Loop**: The OS manages a single event loop that gives each app time slices
- **Lifecycle Callbacks**: Apps implement simple methods that the OS calls:
  - `on_activate()` - Called when app becomes foreground
  - `on_deactivate()` - Called when app goes to background
  - `on_update(delta_time)` - Called every frame (~60fps) when active
  - `on_background_tick()` - Called ~1/second when backgrounded
  - `render(matrix)` - Draw the UI
  - `on_event(event)` - Handle input

### Cooperative Multitasking
- Apps don't manage their own event loops - the OS does
- Background apps can run lightweight tasks periodically
- Apps can request attention to take over the screen (alerts, timers)
- Minimal code required in each app

### Universal Input System
- Standard input events: UP, DOWN, LEFT, RIGHT, OK, BACK, QUIT, HELP
- Universal keystrokes work across all apps:
  - **ESC** - Exit app, return to launcher
  - **Q** - Quit entire OS
  - **TAB** - Show help overlay
  - **Arrows/Enter** - Navigate and select
- Apps can provide context-sensitive help via `get_help_text()`

### Terminal-Based Display
- ANSI terminal rendering with RGB color support
- Matrix display stays fixed at top of terminal
- Log messages appear below with separator
- No scrolling disrupts the display

## Current Hardware Target

**Development Setup:**
- Any computer with terminal
- Keyboard input
- Terminal display (64x64 or 128x64)

**Production Vision:**
- Raspberry Pi Zero (or similar SBC)
- LED matrix display (64x64 or larger)
- Bluetooth keyboard + joypad
- Speaker (future)
- All hidden in picture frame enclosure

## Future Features

### 1. On-Screen Keyboard (HIGH PRIORITY)

**Purpose:** Enable text input without external keyboard

**Design:**
- Takes up bottom half of screen (32 pixels on 64x64)
- Different background color to distinguish from app content
- Layouts:
  - QWERTY letters (lowercase/uppercase)
  - Numbers and symbols
  - Special characters
- Controls:
  - Navigate with arrows
  - OK/Enter to type character
  - Special buttons: Space, Delete, Done, Shift

**Use Cases:**
- Weather app: Enter location
- Settings: WiFi passwords, usernames
- Note apps: Write text
- Any text input field

**Implementation Notes:**
- Create `matrixos/keyboard.py` module
- Keyboard appears as overlay when app requests it
- Returns string to calling app
- Can be invoked by any app via OS API

### 2. UI Controls Framework (HIGH PRIORITY)

**Purpose:** Standard UI components for consistent app development

**Components:**
- **TextInput**: Single-line text entry (triggers on-screen keyboard)
- **Button**: Clickable button with label
- **Label**: Static text display
- **ProgressBar**: Visual progress indicator (already used in timer)
- **List**: Scrollable list of items
- **Dialog**: Modal popup for alerts/confirmations
- **Slider**: Value selection with visual feedback
- **Checkbox/Toggle**: Boolean options

**Benefits:**
- Consistent look and feel across apps
- Less code duplication
- Easier app development
- Professional appearance

**Implementation:**
- Create `matrixos/ui/` module with widget classes
- Event routing handled by OS
- Focus management
- Theme support for colors

### 3. Bluetooth Joypad Support (MEDIUM PRIORITY)

**Purpose:** Physical buttons for picture frame computer

**Design:**
- Map joypad buttons to universal keystrokes:
  - D-Pad → Arrow keys (UP, DOWN, LEFT, RIGHT)
  - A Button → OK (Enter)
  - B Button → BACK (ESC)
  - Start → HELP (TAB)
  - Select → QUIT (Q)
- Support common joypads (Xbox, PlayStation, 8BitDo, etc.)
- Bluetooth pairing managed by OS settings app
- Keyboard remains as secondary input method

**Benefits:**
- More ergonomic than keyboard
- Better user experience for picture frame form factor
- Can be mounted on back of frame
- No wires needed

**Implementation:**
- Python `evdev` library for input handling
- Abstract input layer (joypad or keyboard)
- Settings app for pairing/configuration

### 4. Audio/Speaker Support (LOW PRIORITY)

**Purpose:** Sound effects, music, alarms

**Features:**
- Background music playback
- Sound effects for app events
- Text-to-speech for notifications
- Alarm sounds
- Volume control

**Use Cases:**
- Timer: Alarm sound when finished
- Music player app
- Notification chimes
- Voice assistant responses

**Implementation:**
- `pygame.mixer` or `pyaudio`
- Audio API for apps to use
- System sounds configuration

### 5. Advanced Notification System (MEDIUM PRIORITY)

**Purpose:** Rich notifications with actions

**Features:**
- Notification queue management
- Different priorities (low, normal, high, urgent)
- Notification actions (dismiss, snooze, view)
- Icons and colors
- Persistent notification tray
- OS shows notifications as overlays

**Design:**
- Small icons in status bar for pending notifications
- Tap icon to view notification
- Swipe to dismiss
- Apps can post notifications via OS API

### 6. Settings & System Apps (HIGH PRIORITY)

**Apps Needed:**
- **Settings**: WiFi, Bluetooth, display brightness, volume, themes
- **Clock**: Always available in status bar
- **Notifications**: View notification history
- **App Manager**: Install/remove apps, permissions
- **System Monitor**: CPU, memory, temperature (for Pi)

### 7. Data Persistence (HIGH PRIORITY)

**Purpose:** Apps need to save state between sessions

**Features:**
- Simple key-value storage per app
- SQLite database for complex data
- Cloud sync (optional)
- Export/import settings

**Implementation:**
- `matrixos/storage.py` module
- Each app gets isolated storage directory
- JSON or SQLite based
- API: `self.storage.set(key, value)` / `self.storage.get(key)`

### 8. Network & API Support (MEDIUM PRIORITY)

**Current:** Weather app simulates data fetch

**Needed:**
- HTTP client for REST APIs
- WebSocket support for real-time data
- Rate limiting
- Caching layer
- Error handling for offline mode

**Use Cases:**
- Real weather data
- Stock tickers
- News headlines
- Calendar sync
- Social media feeds

### 9. Real LED Matrix Support (HIGH PRIORITY - Hardware)

**Current:** Terminal emulator

**Transition to:**
- Real LED matrix via GPIO
- Brightness control
- Hardware-specific optimizations
- Support multiple matrix types:
  - Adafruit RGB Matrix HAT
  - HUB75 panels
  - WS2812B strips (alternative)

**Implementation:**
- Abstract display interface (already partially done)
- GPIO drivers for different hardware
- Keep terminal emulator for development

### 10. TypeScript/Deno Migration (FUTURE CONSIDERATION)

**Question:** Should we convert to TypeScript/Deno?

**Pros:**
- TypeScript type safety
- Modern JavaScript ecosystem
- JSX component model (familiar for UI)
- Deno has great standard library
- Native TypeScript support
- Better tooling (VS Code)

**Cons:**
- Performance on Pi Zero? (needs testing)
- Memory footprint (Deno vs Python)
- LED matrix libraries are mostly Python
- Would need to rewrite or bridge to hardware

**Decision Points:**
1. Test Deno performance on Pi Zero
2. Check availability of LED matrix libraries for Node/Deno
3. Consider hybrid approach (UI in TS, hardware in Python)
4. Evaluate memory usage with typical apps

**Recommendation:** Build out more features in Python first, then evaluate migration once we have a clear picture of requirements. Could potentially build a TypeScript app SDK that talks to Python OS core.

## Development Phases

### Phase 1: Core OS Features (CURRENT)
- [x] Event-driven app framework
- [x] Launcher
- [x] Universal input system
- [x] Help system
- [x] Background processing
- [x] Screen takeover (attention requests)
- [ ] Fix timer screen takeover bug
- [ ] Data persistence
- [ ] Settings app

### Phase 2: UI Framework
- [ ] UI controls library
- [ ] On-screen keyboard
- [ ] Theme system
- [ ] Status bar with clock
- [ ] Notification overlay

### Phase 3: Real Hardware
- [ ] Real LED matrix support
- [ ] Bluetooth joypad input
- [ ] Brightness control
- [ ] Power management
- [ ] Boot optimization

### Phase 4: Rich Apps
- [ ] Weather (with real API)
- [ ] Clock with alarms
- [ ] Music player
- [ ] Photo slideshow
- [ ] News reader
- [ ] Calendar
- [ ] Games (Snake, Tetris, Breakout)

### Phase 5: Polish & Optimization
- [ ] Speaker/audio support
- [ ] Animation framework
- [ ] Advanced notifications
- [ ] Cloud sync
- [ ] App store / package manager
- [ ] Documentation for app developers

## App Ideas

### Built-in Apps
- Clock/Timer/Stopwatch (partially done)
- Weather (partially done)
- Calendar
- Settings
- Notifications
- Music Player
- Photo Viewer

### Games
- Snake
- Tetris
- Breakout
- Pong
- Space Invaders
- Flappy Bird style game

### Information Displays
- Stock ticker
- News headlines
- Sports scores
- Transit times
- Cryptocurrency prices
- Air quality
- Server monitoring
- Smart home status

### Utilities
- Pomodoro timer
- Habit tracker
- To-do list
- Note taker
- Calculator
- Unit converter

### Creative
- Pixel art editor
- Music visualizer
- Generative art
- Conway's Game of Life
- Matrix rain effect

## Technical Considerations

### Performance Targets
- 60fps for active app
- <10ms response to input
- Background tasks <100ms
- Boot time <5 seconds (on real hardware)

### Memory Constraints
- Pi Zero has 512MB RAM
- Target: OS + 5 apps < 200MB
- Each app should use <10MB when active
- Background apps <1MB

### Power Efficiency
- Dim display when idle
- Sleep mode after inactivity
- Efficient background processing
- Monitor CPU temperature

### Developer Experience
- Simple app template
- Clear API documentation
- Example apps for common patterns
- Debugging tools
- Hot reload during development

## Questions for Future

1. **Multi-user support?** Probably overkill for a picture frame device
2. **Network security?** Important if apps fetch data
3. **App sandboxing?** Do we need permission system?
4. **Update mechanism?** How to update OS and apps?
5. **Logging/crash reports?** How to debug issues on real hardware?
6. **Multiple displays?** Support more than one matrix?

## Contributing

As this project grows, we'll want:
- Contribution guidelines
- Code style guide
- App development tutorial
- Hardware setup guide
- Testing framework

## Conclusion

MatrixOS aims to be a complete, delightful operating system for small LED matrix displays. The picture frame computer concept brings together retro computing aesthetics, modern software practices, and creative possibilities in a unique form factor.

The goal: Anyone should be able to buy a Pi Zero, an LED matrix, and a joypad, flash MatrixOS, and have a fully functional, extensible picture frame computer running in minutes.

Let's build something awesome! 🎮🖼️✨
