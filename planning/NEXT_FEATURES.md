# PiZXel Next Features & Roadmap

**Last Updated:** December 2, 2025  
**Status:** Framebuffer display driver complete ✅

---

## Current Priority: Audio & Input Expansion

### Bluetooth Integration 🔵
**Goal:** Wireless input and audio via Bluetooth

**Components:**
- Bluetooth keyboard/gamepad pairing
- Bluetooth audio output (A2DP)
- ZX Spectrum recreated keyboard support in game mode
- Seamless device switching

**Implementation:**
- Use `bluez` D-Bus API via Node.js bindings
- Auto-pair on boot for known devices
- Fallback to physical keyboard if BT unavailable

---

### Hardware Audio Drivers 🔊
**Audio Output:**
- Replace browser-only audio with hardware playback
- Use `speaker` npm package for Pi audio output
- ALSA/PulseAudio integration
- Support both 3.5mm jack and HDMI audio

**Audio Input (Microphone):**
- Voice commands for app launching
- Audio recording apps
- Music recognition/visualization
- Use `node-record-lpcm16` for capture

**Considerations:**
- Latency requirements for games
- Sample rate: 44.1kHz for compatibility
- Buffer size tuning for performance

---

## High-Impact Features

### Touch Input Driver 🖐️
**Priority:** High  
**Complexity:** Medium

**Implementation:**
- Detect touch events from `/dev/input/event*`
- Use `evdev` package for event parsing
- Map 800×480 touch coordinates → 256×192 virtual space
- Gesture support: tap, long-press, swipe

**Benefits:**
- Much more intuitive than keyboard
- Native feel on touchscreen hardware
- Enable touch-optimized apps

**Technical Details:**
```typescript
// Touch coordinate scaling
const virtualX = Math.floor((touchX - offsetX) / scale);
const virtualY = Math.floor((touchY - offsetY) / scale);
```

---

### GPIO Button Input 🎮
**Priority:** Medium  
**Complexity:** Low

**Hardware:**
- 5 GPIO buttons: Up, Down, Left, Right, OK
- Optional: Back, Home buttons
- Pull-up resistors + debouncing

**Implementation:**
- Use `onoff` or `rpi-gpio` npm package
- Debounce in software (50ms)
- Map to InputEvent system
- Great for kiosk/embedded mode

**Pin Mapping Example:**
```
GPIO 17 → Up
GPIO 27 → Down
GPIO 22 → Left
GPIO 23 → Right
GPIO 24 → OK (Enter)
```

---

### Auto-start on Boot 🚀
**Priority:** High  
**Complexity:** Low

**Implementation:**
- systemd service file
- Automatic display mode detection
- Launch as specific user (not root)
- Restart on crash

**Service File:**
```ini
[Unit]
Description=PiZXel OS
After=network.target

[Service]
Type=simple
User=lee
WorkingDirectory=/home/lee/pizxel
ExecStart=/home/lee/pizxel/start.sh
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

**Commands:**
```bash
sudo cp pizxel.service /etc/systemd/system/
sudo systemctl enable pizxel
sudo systemctl start pizxel
```

---

## Polish & UX Improvements

### Standby Mode Enhancements 💤
**Current:** Implemented but not auto-activating

**Improvements:**
- Auto-activate after idle timeout (configurable)
- Smooth brightness fade transition
- Wake on any input (touch, keyboard, GPIO)
- Show clock in standby mode
- Power-saving: reduce frame rate to 1fps

---

### Boot Splash Screen ✨
**Priority:** Medium  
**Complexity:** Low

**Features:**
- Show PiZXel logo while loading
- Progress bar for app scanning
- Fade in/out transitions
- Skip with any key press

**Implementation:**
- Render splash before AppFramework starts
- Use DisplayBuffer for consistency
- Load logo from PNG asset

---

### Performance Monitoring 📊
**Priority:** Low  
**Complexity:** Medium

**Metrics:**
- FPS counter (rolling average)
- Frame time distribution (min/max/avg)
- Memory usage (RSS, heap)
- Event loop lag
- Per-app profiling

**Display:**
- Toggle overlay with F3 key
- Optional logging to file
- Grafana dashboard (advanced)

---

## Platform Features

### Display Rotation Support 🔄
**Priority:** Low  
**Complexity:** Medium

**Use Cases:**
- Portrait mounting for arcade cabinet
- 90° rotation for vertical games
- Flip for upside-down mounting

**Implementation:**
- Detect orientation from config
- Transform coordinates in framebuffer driver
- Rotate touch input coordinates
- Options: 0°, 90°, 180°, 270°

---

### Screenshot & Recording 📸
**Priority:** Medium  
**Complexity:** Low (screenshot), High (video)

**Screenshot:**
- Capture DisplayBuffer to PNG
- Hotkey: F12 or GPIO button
- Save to `/data/screenshots/`
- Use `canvas` package PNG encoder

**Video Recording:**
- Record framebuffer to video
- Use `ffmpeg` for encoding
- H.264 @ 30fps
- Start/stop via hotkey

**Commands:**
```bash
# Screenshot
ffmpeg -f fbdev -i /dev/fb0 -vframes 1 screenshot.png

# Video (10 seconds)
ffmpeg -f fbdev -i /dev/fb0 -t 10 -r 30 output.mp4
```

---

### Multi-Display Output 🖥️
**Priority:** Low  
**Complexity:** High

**Scenarios:**
- Physical screen + browser simultaneously
- HDMI + touchscreen
- Recording while playing

**Implementation:**
- Register multiple display drivers
- Render to all in parallel
- Performance impact: ~2x CPU
- Async rendering with worker threads?

---

## Developer Experience

### Hot Reload for Apps ⚡
**Priority:** High (for development)  
**Complexity:** Medium

**Features:**
- Watch app directory with `chokidar`
- Reload changed app without restart
- Preserve launcher state
- Show reload notification

**Implementation:**
```typescript
const watcher = chokidar.watch('data/apps/**/*.ts');
watcher.on('change', async (path) => {
  const appName = extractAppName(path);
  await appFramework.reloadApp(appName);
});
```

---

### Debug Overlay 🐛
**Priority:** Medium  
**Complexity:** Low

**Toggle:** Ctrl+D or F3

**Display:**
- FPS and frame time
- Active app name
- Input events (last 5)
- Memory usage
- DisplayBuffer preview (zoomed)

---

### Performance Profiler 🔬
**Priority:** Low  
**Complexity:** High

**Features:**
- Measure render time per app
- Identify slow operations
- Flame graph generation
- Export to Chrome DevTools format

**Integration:**
- Use Node.js `perf_hooks`
- Per-frame timing
- Statistical analysis

---

## Input/Audio Architecture

### Input Driver System
**Current:** KeyboardInputDriver only

**Proposed Hierarchy:**
```
InputDriver (base class)
├── KeyboardInputDriver ✅
├── TouchInputDriver 🚧
├── GPIOInputDriver 🚧
├── BluetoothInputDriver 🚧
└── GamepadInputDriver 🚧
```

**Multi-Input Support:**
- Register multiple input drivers simultaneously
- Priority system for conflicting inputs
- Event aggregation/deduplication

---

### Audio Driver System
**Current:** Browser-only (CanvasAudioDriver)

**Proposed Architecture:**
```
AudioDriver (base class)
├── CanvasAudioDriver ✅ (browser/dev)
├── ALSAAudioDriver 🚧 (hardware)
├── BluetoothAudioDriver 🚧 (BT speakers)
└── DummyAudioDriver 🚧 (fallback)
```

**Features:**
- Auto-select best available driver
- Fallback chain: BT → ALSA → Browser → Dummy
- Latency measurement
- Volume normalization

---

## Bluetooth Deep Dive

### Device Pairing Flow
1. Scan for devices: `bluetoothctl scan on`
2. Pair: `bluetoothctl pair <MAC>`
3. Trust: `bluetoothctl trust <MAC>`
4. Connect: `bluetoothctl connect <MAC>`

### Auto-Connect on Boot
- Store paired devices in config
- Reconnect automatically
- Handle multiple devices (keyboard + gamepad + audio)

### Node.js Integration
**Option 1:** `noble` package for BLE
**Option 2:** D-Bus bindings (`dbus-next`)
**Option 3:** Shell out to `bluetoothctl` (simplest)

### ZX Spectrum Keyboard
**Use Case:** Bluetooth keyboard that looks like ZX Spectrum
- Map to game controls (QAOP, Space, etc.)
- Special mode for authentic ZX Spectrum experience
- Configurable key mapping per game

---

## Configuration System

### Display Config
```json
{
  "display": {
    "preferred": "framebuffer",
    "fallback": ["canvas", "terminal"],
    "framebuffer": {
      "scale": "auto",
      "rotation": 0
    },
    "canvas": {
      "port": 3001,
      "pixelSize": 3
    }
  }
}
```

### Input Config
```json
{
  "input": {
    "touch": {
      "enabled": true,
      "device": "/dev/input/event0",
      "calibration": [0, 0, 800, 480]
    },
    "gpio": {
      "enabled": true,
      "pins": {
        "up": 17,
        "down": 27,
        "left": 22,
        "right": 23,
        "ok": 24
      }
    },
    "bluetooth": {
      "autoConnect": true,
      "devices": ["AA:BB:CC:DD:EE:FF"]
    }
  }
}
```

### Audio Config
```json
{
  "audio": {
    "output": {
      "preferred": "bluetooth",
      "fallback": ["alsa", "browser"],
      "device": "hw:0,0",
      "sampleRate": 44100,
      "bufferSize": 1024
    },
    "input": {
      "enabled": false,
      "device": "hw:0,0"
    }
  }
}
```

---

## Testing Strategy

### Hardware Tests
- **Framebuffer:** `./test-framebuffer.sh` ✅
- **Touch:** Detect `/dev/input/event*` devices
- **GPIO:** Button press test app
- **Bluetooth:** Pairing test script
- **Audio:** Play test tone, measure latency

### Integration Tests
- Multi-input handling (keyboard + touch)
- Display driver fallback chain
- Audio driver switching
- Bluetooth reconnection

---

## Future Vision

### Advanced Features (Post-MVP)
- **WiFi Setup UI:** Configure WiFi without SSH
- **App Store:** Download apps from repository
- **Cloud Sync:** Sync settings/saves across devices
- **Web Dashboard:** Control PiZXel from browser
- **Voice Commands:** "Launch Tetris"
- **MQTT Integration:** IoT device control
- **Home Assistant:** Integration as media player

---

## Resources & References

### Hardware
- [Official Pi Touchscreen Docs](https://www.raspberrypi.com/products/raspberry-pi-touch-display/)
- [GPIO Pinout](https://pinout.xyz/)
- [ALSA Documentation](https://www.alsa-project.org/wiki/Main_Page)

### Software
- [evdev npm package](https://www.npmjs.com/package/evdev)
- [onoff GPIO library](https://www.npmjs.com/package/onoff)
- [speaker audio output](https://www.npmjs.com/package/speaker)
- [node-record-lpcm16](https://www.npmjs.com/package/node-record-lpcm16)
- [noble Bluetooth](https://www.npmjs.com/package/@abandonware/noble)

### Inspirational Projects
- RetroPie (emulation platform)
- PiMusicBox (audio appliance)
- MagicMirror (kiosk mode)

---

## Next Session Goals

**Immediate Focus:** Audio & Bluetooth input drivers

1. Research Bluetooth pairing on Pi
2. Prototype hardware audio output
3. Test latency requirements for games
4. Design unified input driver API
5. Implement touch input driver (if time permits)

**Success Criteria:**
- [ ] Bluetooth keyboard connects automatically
- [ ] Audio plays through hardware (not browser)
- [ ] Multiple input sources work simultaneously
- [ ] ZX Spectrum keyboard mappings configured
- [ ] Latency < 50ms for game audio

---

**Status:** Ready for audio/input driver implementation! 🎵🎮
