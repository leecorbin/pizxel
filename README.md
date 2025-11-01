# Pi-Matrix: LED Matrix Display System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.7+](https://img.shields.io/badge/python-3.7+-blue.svg)](https://www.python.org/downloads/)

A complete Python LED matrix display system with graphics primitives and ZX Spectrum-style text rendering. **Develop on any machine, deploy to Raspberry Pi LED matrices.**

```python
from src.led_api import create_matrix

matrix = create_matrix(64, 64, 'rgb')
matrix.circle(32, 32, 20, (0, 100, 255), fill=True)
matrix.text("HELLO", 10, 28, (255, 255, 255))
matrix.show()
```

## 🚀 Quick Start

**Try the interactive demo launcher:**
```bash
git clone https://github.com/leecorbin/pi-matrix.git
cd pi-matrix
python3 examples/start_here.py
```

This shows a ZX Spectrum-style menu where you can explore all features!

## ✨ Features

### Graphics Primitives
Complete drawing toolkit with RGB color support:
- Lines, circles, ellipses, rectangles (rounded & regular)
- Triangles, polygons, stars
- Fill modes and colored outlines
- Flood fill algorithm

### ZX Spectrum Font System
Retro 8×8 pixel font (ZX Spectrum character set):
- Full ASCII + block graphics characters
- Three text modes: pixel-positioned, grid, and buffer
- Custom 8×8 icon registration
- RGB foreground and background colors

### Render Anywhere
- **Development**: Terminal output with Unicode blocks (▀ ▄ █)
- **Production**: Real LED matrices on Raspberry Pi *(coming soon)*
- Same code, different renderer - no changes needed!

### Matrix OS - Interactive Framework
Build complete interactive applications with input and output:
- **Input abstraction**: Keyboard now, GPIO buttons later
- **Event system**: Arrow keys, OK/Enter, Back/Esc, shortcuts
- **Menu navigation**: Built-in menu system with callbacks
- **Game framework**: Perfect for building games and apps
- **Context managers**: Clean resource management
- Same input API works across terminal and Pi hardware!

### Zero Dependencies
Pure Python standard library - runs on any Python 3.7+ system, including Raspberry Pi Zero.

## 🎯 Target Hardware

This system is designed for:
- **Raspberry Pi** (Zero, 3, 4, 5)
- **RGB LED Matrix Panels** (64×64 or 128×64 pixels)
- Libraries like [rpi-rgb-led-matrix](https://github.com/hzeller/rpi-rgb-led-matrix)

**Current Status:** Terminal emulation working. Physical LED matrix support coming soon!

## 📖 Documentation

### API Quick Reference

#### Creating a Matrix
```python
from src.led_api import create_matrix

# Create 64x64 RGB matrix
matrix = create_matrix(64, 64, 'rgb')
```

#### Drawing Graphics
```python
# Lines
matrix.line(0, 0, 63, 63, (255, 0, 0))

# Shapes
matrix.rect(10, 10, 40, 30, (0, 255, 0), fill=True)
matrix.circle(32, 32, 15, (0, 0, 255), fill=True)
matrix.star(32, 32, 12, points=5, color=(255, 255, 0), fill=True)

# Advanced
matrix.rounded_rect(15, 15, 30, 20, 5, (255, 128, 0))
matrix.ellipse(32, 32, 20, 10, (255, 0, 255))
matrix.triangle(10, 10, 30, 10, 20, 30, (0, 255, 255), fill=True)
```

#### Text Rendering
```python
# Pixel-positioned text
matrix.text("HELLO", 10, 20, (255, 255, 255))

# Grid-positioned (8x8 character grid on 64x64 display)
matrix.text_grid("START", 1, 3, (0, 255, 0))

# Centered text
matrix.centered_text("CENTER", 30, (255, 128, 255))

# ZX-81 style text buffer (full screen)
lines = [" READY. ", "        ", " 64X64  ", " MATRIX "]
matrix.text_buffer(lines, (0, 255, 0), (0, 50, 0))
```

#### Custom Icons
```python
# Create 8x8 icon (heart example)
heart = [
    0b00000000,
    0b01100110,
    0b11111111,
    0b11111111,
    0b01111110,
    0b00111100,
    0b00011000,
    0b00000000,
]

# Register and use it
matrix.register_char('♥', heart)
matrix.text("I ♥ LED", 10, 20, (255, 0, 0))
```

#### Colors
```python
# RGB mode: (r, g, b) tuples (0-255)
red = (255, 0, 0)
green = (0, 255, 0)
blue = (0, 0, 255)
yellow = (255, 255, 0)
cyan = (0, 255, 255)
magenta = (255, 0, 255)
white = (255, 255, 255)

# Monochrome mode: True/False
matrix.set_pixel(x, y, True)   # On
matrix.set_pixel(x, y, False)  # Off
```

#### Display Output
```python
# Show on terminal
matrix.show()

# Clear display
matrix.clear()

# Fill with color
matrix.fill((100, 100, 100))
```

#### Input & Interaction (Matrix OS)
```python
from src.input import KeyboardInput, Menu, InputEvent

# Basic input handling
with KeyboardInput() as input_handler:
    while running:
        # Non-blocking input (with timeout)
        event = input_handler.get_key(timeout=0.01)
        if event:
            if event.key == InputEvent.UP:
                y -= 1
            elif event.key == InputEvent.DOWN:
                y += 1
            elif event.key == InputEvent.LEFT:
                x -= 1
            elif event.key == InputEvent.RIGHT:
                x += 1
            elif event.key == InputEvent.OK:
                # Enter/Return pressed
                do_action()
            elif event.key in [InputEvent.QUIT, InputEvent.BACK]:
                running = False

# Menu system
with KeyboardInput() as input_handler:
    menu = Menu(matrix, input_handler, "MAIN")
    menu.add_item("START", callback=start_game, shortcut="1")
    menu.add_item("OPTIONS", callback=show_options, shortcut="2")
    menu.add_item("QUIT", callback=None, shortcut="Q")
    selected = menu.run()  # Returns selected label or None
```

### Complete API

For the full API with all available functions, see:
- **Graphics**: Lines, shapes, polygons, stars, flood fill
- **Text**: Multiple modes, custom fonts, icons
- **Utilities**: Borders, grid lines, centered text

All functions in `src/led_api.py` are documented with docstrings.

## 🎨 Examples

See [`examples/README.md`](examples/README.md) for detailed descriptions of all demos.

**Quick demo list:**
- `start_here.py` - **START HERE!** Interactive demo launcher
- `hello_world.py` - Simple getting started example
- `graphics_showcase.py` - All drawing primitives
- `text_showcase.py` - Font system features
- `combined_demo.py` - UI examples (progress bars, menus, etc.)
- `animation_demo.py` - Moving patterns and effects
- `plasma_demo.py` - Mathematical visualizations
- `physics_demo.py` - Bouncing balls with gravity
- `starfield_demo.py` - Particle systems and 3D effects
- `zx_spectrum_menu.py` - Retro ZX Spectrum tribute

**Interactive apps & games:**
- `interactive_app_example.py` - Drawing app (Matrix OS basics)
- `game_snake.py` - Classic snake game
- `game_breakout.py` - Brick-breaking arcade game
- `game_tetris.py` - Full Tetris implementation

## 🏗️ Architecture

The system is designed in layers for easy hardware swapping:

```
     Your Application Code
            ↓
    ┌───────────────────┐
    │  Matrix OS Layer  │
    ├─────────┬─────────┤
    │  Input  │ Output  │
    └─────────┴─────────┘
         ↓         ↓
    Input API  LED API
         ↓         ↓
    ┌─────────────────┐
    │  Graphics+Font  │
    └─────────────────┘
         ↓         ↓
    ┌─────────────────┐
    │  Framebuffer    │
    └─────────────────┘
         ↓         ↓
    ┌─────────────────┐
    │    Renderers    │
    ├────────┬────────┤
    │Terminal│ LED*   │
    └────────┴────────┘
```

**\*LED Matrix & GPIO coming soon!** The architecture is fully abstracted - your code stays the same whether using terminal or real hardware.

## 🔮 Roadmap

- [x] Core display system
- [x] Graphics primitives
- [x] ZX Spectrum font
- [x] Terminal renderer
- [x] Demo collection
- [x] Input abstraction layer (Matrix OS)
- [x] Interactive applications & games
- [ ] **GPIO/LED matrix renderer** *(next up!)*
- [ ] GPIO button input
- [ ] Sprite/image loading
- [ ] Animation framework
- [ ] Network/API integration
- [ ] 16×16 font mode

## 🛠️ Terminal Compatibility

The terminal renderer uses Unicode block characters (█ ▀ ▄). For best results:

**Recommended fonts:**
- **Mac**: Menlo, SF Mono, Monaco
- **Linux**: DejaVu Sans Mono, Liberation Mono
- **Windows**: Consolas, Cascadia Code

**If you see dashes (-) or underscores (_) instead of blocks:**
```bash
python3 examples/font_test.py  # Diagnose the issue
```

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
