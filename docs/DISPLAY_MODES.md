# PiZXel Display Modes

PiZXel supports multiple display outputs with automatic detection and graceful fallback. The system will automatically select the best available display driver based on hardware availability and priority.

## Display Drivers

### 1. Framebuffer Display (Priority: 90)
**Hardware:** Direct rendering to `/dev/fb0` (Raspberry Pi 7" touchscreen or HDMI)

**Features:**
- Native 800×480 resolution (or detected resolution)
- 2× integer pixel scaling (256×192 → 512×384)
- Aspect-ratio preserving with centering
- Direct memory-mapped rendering (RGB565 format)
- Crisp pixel-perfect display

**Requirements:**
- Framebuffer device at `/dev/fb0`
- User in `video` group
- Physical display connected

**Performance:** ~60fps, low latency, no network overhead

---

### 2. Canvas Display (Priority: 80)
**Network:** HTTP server with WebSocket real-time updates

**Features:**
- Browser-based display at `http://localhost:3001`
- Configurable pixel size (default: 3×)
- Real-time frame updates via Socket.IO
- Full audio support (Web Audio API)
- Remote display via SSH port forwarding

**Requirements:**
- Network connection (localhost or SSH tunnel)
- Modern web browser
- Node.js HTTP server (Express + Socket.IO)

**Performance:** ~30-60fps depending on network latency

**SSH Port Forwarding:**
```bash
# On your local machine:
ssh -L 3001:localhost:3001 user@raspberry-pi.local

# Then open: http://localhost:3001
```

---

### 3. Terminal Display (Priority: 50)
**Console:** ANSI escape code rendering in terminal

**Features:**
- Works in any terminal/SSH session
- Unicode block characters (▀) for 2× vertical resolution
- 24-bit true color support
- No dependencies beyond stdout
- Always available fallback

**Requirements:**
- Terminal with ANSI color support
- UTF-8 encoding

**Performance:** ~20-30fps, limited by terminal refresh rate

---

## Usage

### Auto-Detection (Recommended)
Automatically selects the best available display:

```bash
npm start
```

**Selection order:** Framebuffer → Canvas → Terminal

The system will:
1. Check if `/dev/fb0` exists and is connected → use framebuffer
2. If not, check if canvas server can start → use canvas
3. Fall back to terminal display

---

### Force Specific Display

#### Framebuffer (Hardware Display)
```bash
npm start -- --fb
```

Best for: Production deployment on Raspberry Pi with touchscreen/HDMI

#### Canvas (Browser Display)
```bash
npm start -- --canvas
```

Best for: Development, remote access, debugging

#### Terminal (Console Display)
```bash
npm start -- --term
```

Best for: Headless servers, quick testing, debugging without GUI

---

## Display Configuration

### Framebuffer Settings

The framebuffer driver automatically detects:
- Screen resolution from `/sys/class/graphics/fb0/virtual_size`
- Color depth from `/sys/class/graphics/fb0/bits_per_pixel`
- Optimal integer scaling factor

**Manual scaling override** (future):
```typescript
// In start.ts or config file:
const fbDriver = new FramebufferDisplayDriver();
fbDriver.setScale(3); // Force 3× scaling
```

### Canvas Settings

Environment variables:
```bash
CANVAS_PORT=3001         # HTTP server port (default: 3001)
CANVAS_PIXEL_SIZE=3      # Browser pixel size (default: 3)
```

```bash
CANVAS_PORT=8080 CANVAS_PIXEL_SIZE=4 npm start -- --canvas
```

---

## Multi-Display Support (Future)

**Simultaneous outputs** (planned):
```bash
npm start -- --multi
```

This would render to all available displays:
- Physical screen shows framebuffer output
- Browser shows canvas output (for debugging/recording)
- Terminal shows status/logs

**Use cases:**
- Screen recording while displaying on hardware
- Remote monitoring of physical display
- Development with multiple viewports

---

## Performance Characteristics

| Display | FPS | Latency | Network | Audio |
|---------|-----|---------|---------|-------|
| Framebuffer | 60 | <5ms | No | No* |
| Canvas | 30-60 | 20-100ms | Yes | Yes |
| Terminal | 20-30 | 50-200ms | No | No |

\* Audio support via speaker package (TODO)

---

## Architecture

### Display Driver Interface

All display drivers implement:

```typescript
interface DisplayDriver {
  readonly priority: number;  // Higher = preferred (0-100)
  readonly name: string;
  
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  isAvailable(): Promise<boolean>;
  
  getWidth(): number;
  getHeight(): number;
  setPixel(x: number, y: number, color: RGB): void;
  show(): void;
  clear(): void;
}
```

### Device Manager Auto-Selection

The `DeviceManager` selects the best driver:

1. Register all available drivers
2. For each driver (by priority, highest first):
   - Call `isAvailable()` to check hardware/network
   - If available, call `initialize()`
   - If initialization succeeds, select this driver
3. Fall back to next priority driver if failed

---

## Troubleshooting

### Framebuffer Issues

**"Permission denied: /dev/fb0"**
```bash
# Add user to video group:
sudo usermod -a -G video $USER

# Log out and back in, or:
newgrp video
```

**"Framebuffer not available"**
- Check display is connected: `ls -la /dev/fb*`
- Check status: `cat /sys/class/graphics/fb0/device/status`
- Enable display: `sudo raspi-config` → Display Options

**"No display output"**
- Verify resolution: `cat /sys/class/graphics/fb0/virtual_size`
- Check color depth: `cat /sys/class/graphics/fb0/bits_per_pixel`
- Test with script: `./test-framebuffer.sh`

### Canvas Issues

**"Port 3001 already in use"**
```bash
# Find and kill process:
lsof -ti:3001 | xargs kill -9

# Or use different port:
CANVAS_PORT=8080 npm start -- --canvas
```

**"Cannot connect to canvas server"**
- Check firewall: `sudo ufw allow 3001`
- Verify server started: Check console for "🌐 Open http://localhost:3001"
- SSH port forwarding: `ssh -L 3001:localhost:3001 user@pi.local`

### Terminal Issues

**"Characters not displaying correctly"**
- Ensure UTF-8 encoding: `echo $LANG` (should show UTF-8)
- Check terminal emulator supports Unicode
- Try different terminal (iTerm2, Windows Terminal, etc.)

**"Colors are wrong"**
- Verify 24-bit color support: `echo $COLORTERM` (should be "truecolor")
- Update terminal emulator to latest version

---

## Examples

### Development Workflow
```bash
# Start with canvas for remote development:
npm start -- --canvas

# Open browser on your Mac via SSH tunnel:
# ssh -L 3001:localhost:3001 pi@pizxel.local
# Browser: http://localhost:3001

# Switch to framebuffer for testing on hardware:
npm start -- --fb
```

### Production Deployment
```bash
# Auto-detect display (will use framebuffer if available):
npm start

# Or force framebuffer explicitly:
npm start -- --fb
```

### Headless Testing
```bash
# Terminal mode for quick tests:
npm start -- --term
```

---

## Future Enhancements

### Planned Features
- [ ] Multi-display simultaneous rendering
- [ ] Display hotplugging (detect HDMI connect/disconnect)
- [ ] Per-app display preferences
- [ ] Display rotation/flip support
- [ ] Custom scaling factors
- [ ] Performance profiling tools
- [ ] Screen recording to video file
- [ ] Hardware audio driver (speaker package)
- [ ] Touchscreen input driver

### Configuration File
Future: `/data/default-user/storage/display-config.json`
```json
{
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
```

---

## Technical Details

### RGB565 Format (Framebuffer)
16-bit color format used by most embedded displays:

```
RRRRRGGGGGGBBBBB
|   | |    | |  |
|   | |    | +--+-- Blue:  5 bits (0-31)
|   | +----+-------- Green: 6 bits (0-63)
+---+--------------- Red:   5 bits (0-31)
```

Conversion from RGB888 (24-bit):
```typescript
const r5 = (r >> 3) & 0x1f;  // 8-bit → 5-bit
const g6 = (g >> 2) & 0x3f;  // 8-bit → 6-bit
const b5 = (b >> 3) & 0x1f;  // 8-bit → 5-bit
const rgb565 = (r5 << 11) | (g6 << 5) | b5;
```

### Integer Scaling
PiZXel uses integer scaling to maintain crisp pixel art:

```
Native:  256×192 (4:3 aspect ratio)
Screen:  800×480 (5:3 aspect ratio)

Scale factor: min(⌊800/256⌋, ⌊480/192⌋) = min(3, 2) = 2

Scaled:   512×384 (2× scale)
Offset X: (800 - 512) / 2 = 144
Offset Y: (480 - 384) / 2 = 48
```

This ensures pixels are rendered as perfect squares without blur or distortion.

---

## See Also

- [API Reference](./API_REFERENCE.md) - Driver base classes and `DeviceManager`
- [Session API](./session-api.md) - Server mode (`npm run start:server`), which uses its own WebSocket display and input drivers instead of the three above
- [Hardware build guide (MatrixOS era)](../matrixos-archive/docs/HARDWARE.md) - LED matrix wiring notes from the Python version; the HUB75 driver hasn't been ported yet
