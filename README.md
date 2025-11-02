# MatrixOS: LED Matrix Operating System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.7+](https://img.shields.io/badge/python-3.7+-blue.svg)](https://www.python.org/downloads/)

**A lightweight, event-driven operating system for RGB LED matrix displays.** Turn your Raspberry Pi + LED matrix into a picture frame computer that runs apps, plays games, and will even one day emulate a ZX Spectrum!

```python
from matrixos.app_framework import App

class MyApp(App):
    def render(self, matrix):
        matrix.text("HELLO MATRIXOS!", 10, 28, (255, 255, 255))
        
    def on_event(self, event):
        if event.key == 'OK':
            # Do something
            return True
```

## 🎯 Quick Start

**Run MatrixOS with the terminal emulator:**
```bash
git clone https://github.com/leecorbin/matrixos.git
cd matrixos
python3 start.py

# Or specify resolution (default is 128×128):
python3 start.py --width 128 --height 128
```

Navigate with arrow keys, press Enter to launch apps, ESC to go back.

## ✨ Key Features

### Event-Driven OS Architecture
- **Cooperative multitasking** - Apps don't manage their own loops
- **Background processing** - Apps run tasks when inactive
- **Screen takeover** - Background apps can request attention (timers, alerts)
- **Universal input system** - Keyboard now, Bluetooth gamepad later
- **60fps rendering** - Smooth animations and responsive UI

### Built-in Apps
- **Launcher** - Grid-based app launcher with icons
- **Timer** - Countdown timer with background alerts
- **Weather** - Weather display with periodic updates
- **Demos** - Graphics and text showcases
- **Games** - Snake, Tetris, Breakout *(coming soon)*
- **Settings** - System configuration *(coming soon)*

### Graphics System
Complete drawing toolkit with RGB color support:
- Lines, circles, ellipses, rectangles, polygons
- Fill modes and colored outlines
- Authentic ZX Spectrum 8×8 font
- Optimized for 128×128 displays

### Development Flexibility
- **Terminal emulator** - Develop on any machine (Mac, Linux, Windows)
- **Real hardware** - Deploy to Raspberry Pi with RGB LED matrices
- **No code changes needed** - Same API works everywhere

### Ultimate Vision: ZX Spectrum Emulator
MatrixOS is designed to eventually run a full ZX Spectrum 48K emulator on a 256×192 display (6× LED panels), with pixel-perfect accuracy and the authentic ZX font. See [docs/SPECTRUM_EMULATOR.md](docs/SPECTRUM_EMULATOR.md) for the roadmap!

## 🎯 Target Hardware

**Primary Target:** 128×128 display (2× 64×64 panels stacked vertically)

**Supported Configurations:**
- **64×64** - Minimum viable (testing, simple apps)
- **128×64** - Wide UI layout
- **128×128** - Perfect balance ⭐ **(recommended)**
- **256×192** - Ultimate (ZX Spectrum native resolution)

**Hardware Requirements:**
- **Raspberry Pi** (Zero 2 W, 3, 4, or 5)
- **RGB LED Matrix Panel(s)** (HUB75 interface)
- **RGB Matrix HAT/Bonnet** (Adafruit or compatible)
- **5V Power Supply** (rated for your panel count)
- **Optional:** Bluetooth gamepad, USB audio, speakers

See **[docs/HARDWARE.md](docs/HARDWARE.md)** for complete build guide!

**Current Status:** 
- ✅ Terminal emulation working (develop on any machine)
- ⏳ Physical LED matrix support coming soon
- ⏳ Audio system in development
- ⏳ On-screen keyboard coming soon

## 🎮 Creating Apps

MatrixOS uses an event-driven app framework. Apps don't manage their own loops - the OS does!

### Minimal App Example

```python
from matrixos.app_framework import App

class HelloApp(App):
    def __init__(self):
        super().__init__("Hello World")
    
    def render(self, matrix):
        """Draw your UI"""
        matrix.centered_text("HELLO MATRIXOS!", 
                           matrix.height // 2, 
                           (255, 255, 0))
    
    def on_event(self, event):
        """Handle input"""
        if event.key == 'OK':
            print("User pressed OK!")
            return True
        return False

def run(os_context):
    """Entry point called by MatrixOS"""
    app = HelloApp()
    os_context.register_app(app)
    os_context.switch_to_app(app)
    os_context.run()
```

### App Lifecycle

Apps implement callback methods that MatrixOS calls:

- `on_activate()` - App becomes foreground
- `on_deactivate()` - App goes to background
- `on_update(delta_time)` - Called every frame (~60fps)
- `on_background_tick()` - Called periodically when backgrounded (~1/sec)
- `on_event(event)` - Handle keyboard/gamepad input
- `render(matrix)` - Draw the UI

See **[docs/FRAMEWORK.md](docs/FRAMEWORK.md)** for complete app development guide!

## 📖 Graphics API Reference

### Creating a Matrix

```python
from matrixos.led_api import create_matrix

# Create 128×128 RGB matrix
matrix = create_matrix(128, 128, 'rgb')
```

### Drawing Graphics

```python
# Lines
matrix.line(0, 0, 127, 127, (255, 0, 0))

# Rectangles
matrix.rect(10, 10, 50, 40, (0, 255, 0), fill=True)
matrix.rounded_rect(15, 15, 40, 30, 5, (255, 128, 0))

# Circles and Ellipses
matrix.circle(64, 64, 30, (0, 0, 255), fill=True)
matrix.ellipse(64, 64, 40, 20, (255, 0, 255))

# Polygons
points = [(30, 30), (70, 30), (50, 70)]
matrix.triangle(30, 30, 70, 30, 50, 70, (0, 255, 255), fill=True)
matrix.polygon(points, (255, 255, 0), fill=True)

# Stars
matrix.star(64, 64, 20, points=5, color=(255, 255, 0), fill=True)
```

### Text Rendering (ZX Spectrum Font)

```python
# Pixel-positioned text (8×8 font)
matrix.text("HELLO", 10, 20, (255, 255, 255))

# Centered text
matrix.centered_text("MATRIXOS", 64, (0, 255, 255))

# Grid-positioned (character cells)
matrix.text_grid("READY", 2, 4, (0, 255, 0))
```

### Utilities

```python
# Set single pixel
matrix.set_pixel(x, y, (r, g, b))

# Get pixel color
color = matrix.get_pixel(x, y)

# Fill screen
matrix.fill((0, 0, 50))  # Dark blue background

# Clear screen
matrix.clear()

# Display (terminal emulator auto-refreshes, hardware needs this)
matrix.show()
```

## 📁 Project Structure

```
matrixos/
├── matrixos/              # Core OS modules
│   ├── app_framework.py   # Event-driven app framework
│   ├── led_api.py         # Matrix display API
│   ├── display.py         # Terminal emulator + hardware abstraction
│   ├── font.py            # ZX Spectrum 8×8 font
│   ├── graphics.py        # Drawing primitives
│   ├── input.py           # Keyboard/gamepad input system
│   ├── layout.py          # Responsive layout helpers
│   └── config.py          # Configuration and arg parsing
├── apps/                  # User applications
│   ├── timer/             # Countdown timer app
│   ├── weather/           # Weather display app
│   └── demos/             # Graphics demos
├── docs/                  # Documentation
│   ├── HARDWARE.md        # Hardware build guide
│   ├── FRAMEWORK.md       # App development guide
│   ├── VISION.md          # Project roadmap
│   ├── SPECTRUM_EMULATOR.md  # ZX Spectrum emulator plan
│   └── APP_STRUCTURE.md   # App folder structure
├── start.py               # MatrixOS launcher
├── requirements.txt       # Python dependencies (none!)
├── README.md              # This file
└── LICENSE                # MIT License
```

## 🔮 Roadmap

### Phase 1: Core OS (In Progress)
- [x] Event-driven app framework
- [x] Launcher with app grid
- [x] Universal input system
- [x] Help overlay (TAB key)
- [x] Background processing
- [x] Terminal emulator (128×128)
- [ ] Async background tasks (threading)
- [ ] Move launcher to builtin_apps/
- [ ] Responsive layout system

### Phase 2: Essential Features
- [ ] On-screen keyboard
- [ ] UI controls framework (Button, TextInput, Label, etc.)
- [ ] Network module (async HTTP)
- [ ] Data persistence (save/load)
- [ ] Settings app (WiFi, Bluetooth, brightness)
- [ ] Audio system integration

### Phase 3: Content & Apps
- [ ] Restore games (Snake, Tetris, Breakout)
- [ ] Update all apps for 128×128
- [ ] Create 32×32 app icons
- [ ] Weather app with real API
- [ ] More games and utilities

### Phase 4: Hardware Integration
- [ ] Real LED matrix support (rpi-rgb-led-matrix)
- [ ] Bluetooth gamepad support
- [ ] GPIO button input (alternative)
- [ ] Brightness control
- [ ] Power management

### Phase 5: Ultimate Vision
- [ ] ZX Spectrum 48K emulator
- [ ] 256×192 multi-panel support
- [ ] Tape loading (.tap/.tzx files)
- [ ] Save states
- [ ] Game library browser

See **[docs/VISION.md](docs/VISION.md)** for detailed roadmap!

## 🛠️ Development Setup

**Requirements:**
- Python 3.7+ (pure standard library, zero dependencies!)
- Terminal with Unicode support
- Keyboard

**Run the launcher:**
```bash
python3 start.py --width 128 --height 128
```

**Controls:**
- **Arrow Keys** - Navigate
- **Enter** - Select / OK
- **ESC** - Back / Exit app
- **Backspace** - Alternative back
- **Q** - Quit MatrixOS
- **TAB** - Help overlay

## 📚 Documentation

- **[docs/HARDWARE.md](docs/HARDWARE.md)** - Complete hardware build guide
- **[docs/FRAMEWORK.md](docs/FRAMEWORK.md)** - App development guide  
- **[docs/APP_STRUCTURE.md](docs/APP_STRUCTURE.md)** - App folder structure
- **[docs/VISION.md](docs/VISION.md)** - Project vision and roadmap
- **[docs/SPECTRUM_EMULATOR.md](docs/SPECTRUM_EMULATOR.md)** - ZX Spectrum emulator plan

## 🤝 Contributing

Contributions welcome! This project is in active development.

**Areas where help is needed:**
- App development (create cool apps!)
- Hardware testing (when LED support lands)
- Documentation improvements
- Bug reports and feature requests
- Icon design (32×32 pixel art)

## 🎮 Creating Your Own App

1. Create a folder in `apps/yourapp/`
2. Add `config.json` with app metadata
3. Add `icon.json` with 16×16 or 32×32 icon
4. Create `main.py` with your app logic
5. Launch MatrixOS - your app appears automatically!

Example structure:
```
apps/
└── yourapp/
    ├── config.json    # {"name": "My App", "author": "You", ...}
    ├── icon.json      # {"pixels": [[0,1,2,...], ...]}
    └── main.py        # Your app code
```

See [docs/FRAMEWORK.md](docs/FRAMEWORK.md) for detailed app development guide!

## 🏆 Inspiration

MatrixOS is inspired by:
- **ZX Spectrum** - The legendary 8-bit computer and its beautiful font
- **Picture frame computers** - Computing meets art
- **Retro gaming** - Classic games on LED matrices
- **Embedded systems** - Tiny computers doing big things

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
ASCII fallback mode is available if your terminal doesn't support Unicode.

## 📦 Project Structure

```
pi-matrix/
├── src/
│   ├── display.py       # Core framebuffer & renderer
│   ├── graphics.py      # Drawing primitives
│   ├── font.py          # ZX Spectrum font system
│   ├── input.py         # Input abstraction (Matrix OS)
│   └── led_api.py       # High-level user API
├── examples/
│   ├── start_here.py    # Interactive demo launcher (START HERE!)
│   ├── game_*.py        # Interactive games (Snake, Breakout, Tetris)
│   ├── interactive_app_example.py  # Drawing app
│   ├── *.py             # Other demos
│   └── README.md        # Demo documentation
├── LICENSE              # MIT License
├── README.md            # This file
└── requirements.txt     # Dependencies (none!)
```

## 🎯 Design Goals

- ✅ **Lightweight**: Zero dependencies, pure Python
- ✅ **Pi Zero compatible**: Efficient for low-power devices
- ✅ **Fast iteration**: Develop and test on any machine
- ✅ **Hardware-ready**: Architecture designed for easy LED matrix integration
- ✅ **Retro aesthetic**: ZX Spectrum-inspired design
- ✅ **Well documented**: Comprehensive examples and API docs

## 💡 Use Cases

- **LED Matrix Development**: Build displays on your laptop, test on Pi
- **Retro Computing**: ZX Spectrum-style graphics and text
- **Data Visualization**: Real-time charts and graphs
- **Game Displays**: Score screens, menus, animations
- **Status Displays**: System monitors, dashboards
- **Art Projects**: Generative art, visual effects

## 🤝 Contributing

Contributions welcome! Whether it's:
- Bug fixes
- New drawing primitives
- More demos
- Hardware integration (especially LED matrix renderers!)
- Documentation improvements

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by the ZX Spectrum and ZX-81 computers
- Font based on ZX Spectrum character set
- Built for the LED matrix hobbyist community

## 📬 Contact

- **Author**: Lee Corbin
- **Email**: code@corbin.uk
- **GitHub**: [@leecorbin](https://github.com/leecorbin)

---

**Made with ❤️ for LED matrices and retro computing**

*Develop anywhere, deploy to Pi!* 🚀
