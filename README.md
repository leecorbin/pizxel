# LED Matrix Display System

A complete Python-based LED matrix display system with graphics primitives, ZX Spectrum-style text rendering, and terminal emulation. Designed for developing display applications before deploying to physical hardware (Raspberry Pi with LED matrix displays).

## Target Hardware
- Raspberry Pi Zero or later
- 64x64 or 128x64 LED matrix displays
- Full RGB color support

## Features

### 🎨 Graphics Primitives (`src/graphics.py`)
Complete set of drawing functions with RGB color support:
- **Lines**: Bresenham's algorithm for pixel-perfect lines
- **Shapes**: Rectangles, rounded rectangles, circles, ellipses
- **Polygons**: Triangles, polygons, stars
- **Fill modes**: Outline or filled shapes
- **Advanced**: Flood fill, circle with outline

### 📝 Text System (`src/font.py`)
ZX Spectrum-inspired 8x8 pixel font system:
- **ZX Spectrum character set**: Full ASCII + block graphics
- **8x8 character grid**: 8x8 characters on 64x64 display
- **Text modes**:
  - Pixel-positioned: Place text at any x,y coordinate
  - Grid-positioned: Character grid (0-7, 0-7) for 64x64
  - Text buffer: Fill screen like ZX-81 text mode
- **Custom icons**: Register your own 8x8 symbols
- **RGB colors**: Foreground and background color support
- **Block graphics**: ZX Spectrum-style quarter blocks

### 🖥️ Display System (`src/display.py`)
Universal framebuffer abstraction:
- Framebuffer for LED matrix displays
- Monochrome (on/off) and RGB color modes
- Configurable dimensions (64x64, 128x64, etc.)
- Renderer-agnostic design

### 📺 Terminal Renderer
Development-friendly terminal output:
- Unicode block characters (▀ ▄ █) for compact display
- Half-block mode: 2:1 vertical pixel packing
- ANSI 256-color RGB support
- ASCII fallback mode for terminals without Unicode
- 64x64 display = 64 chars wide × 32 chars tall

### 🚀 High-Level API (`src/led_api.py`)
Simple, user-friendly interface:
```python
from src.led_api import create_matrix

# Create matrix
matrix = create_matrix(64, 64, 'rgb')

# Draw graphics
matrix.circle(32, 32, 20, (0, 100, 255), fill=True)
matrix.star(48, 16, 8, color=(255, 255, 0), fill=True)

# Add text
matrix.text("HELLO", 10, 28, (255, 255, 255))

# Show on terminal
matrix.show()
```

## Project Structure
```
led-matrix-project/
├── src/
│   ├── display.py       # Core display and framebuffer
│   ├── graphics.py      # Drawing primitives
│   ├── font.py          # ZX Spectrum font system
│   └── led_api.py       # High-level user API
├── examples/
│   ├── hello_world.py           # Quick start example
│   ├── graphics_showcase.py     # All drawing primitives
│   ├── text_showcase.py         # Text and font features
│   ├── combined_demo.py         # Graphics + text together
│   ├── animation_demo.py        # Moving patterns
│   ├── plasma_demo.py           # Mathematical effects
│   ├── physics_demo.py          # Physics simulations
│   ├── starfield_demo.py        # Particle effects
│   ├── aspect_test.py           # Terminal aspect ratio test
│   └── font_test.py             # Unicode support check
└── tests/                       # Unit tests (coming soon)
```

## Quick Start

### Hello World
```bash
python3 examples/hello_world.py
```

```python
from src.led_api import create_matrix

# Create a 64x64 RGB matrix
matrix = create_matrix(64, 64, 'rgb')

# Draw a circle
matrix.circle(32, 32, 20, (0, 100, 255), fill=True)

# Add text
matrix.centered_text("HELLO", 20, (255, 255, 0))
matrix.centered_text("WORLD!", 35, (255, 255, 255))

# Display
matrix.show()
```

### Graphics Examples
```python
# Lines
matrix.line(0, 0, 63, 63, (255, 0, 0))

# Rectangles
matrix.rect(10, 10, 40, 30, (0, 255, 0), fill=True)
matrix.rounded_rect(15, 15, 30, 20, 5, (255, 255, 0))

# Circles and ellipses
matrix.circle(32, 32, 15, (0, 0, 255), fill=True)
matrix.ellipse(32, 32, 20, 10, (255, 0, 255))

# Stars and shapes
matrix.star(32, 32, 12, points=5, color=(255, 255, 0), fill=True)
matrix.triangle(10, 10, 30, 10, 20, 30, (0, 255, 255), fill=True)
```

### Text Examples
```python
# Pixel-positioned text
matrix.text("HELLO", 10, 20, (255, 255, 255))

# Character grid (8x8 grid on 64x64 display)
matrix.text_grid("START", 1, 3, (0, 255, 0))

# ZX-81 style text buffer
lines = [
    " READY. ",
    "        ",
    " 64X64  ",
    " MATRIX ",
]
matrix.text_buffer(lines, (0, 255, 0), (0, 50, 0))

# Centered text
matrix.centered_text("CENTER", 30, (255, 128, 255))
```

### Custom Icons
```python
# Create a heart icon (8x8 bitmap)
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

# Register it
matrix.register_char('♥', heart)

# Use it
matrix.text("I ♥ LED", 10, 20, (255, 0, 0))
```

## Available Demos

Run any demo to see features in action:

```bash
python3 examples/hello_world.py          # Simple getting started
python3 examples/graphics_showcase.py    # All drawing functions
python3 examples/text_showcase.py        # ZX Spectrum font features
python3 examples/combined_demo.py        # UI examples
python3 examples/animation_demo.py       # Moving patterns
python3 examples/plasma_demo.py          # Math effects
python3 examples/physics_demo.py         # Bouncing balls
python3 examples/starfield_demo.py       # Particle systems
```

## API Reference

### Creating a Matrix
```python
from src.led_api import create_matrix

# Create matrix
matrix = create_matrix(
    width=64,           # Display width in pixels
    height=64,          # Display height in pixels
    color_mode='rgb'    # 'rgb' or 'mono'
)
```

### Graphics Functions
```python
# Basic
matrix.set_pixel(x, y, color)
matrix.clear()
matrix.fill(color)

# Lines and shapes
matrix.line(x0, y0, x1, y1, color)
matrix.rect(x, y, width, height, color, fill=False)
matrix.rounded_rect(x, y, width, height, radius, color, fill=False)
matrix.circle(cx, cy, radius, color, fill=False)
matrix.circle_outline(cx, cy, radius, color, outline_color, thickness)
matrix.ellipse(cx, cy, rx, ry, color, fill=False)
matrix.triangle(x0, y0, x1, y1, x2, y2, color, fill=False)
matrix.polygon(points, color, fill=False)
matrix.star(cx, cy, radius, points=5, color, fill=False)

# Utility
matrix.flood_fill(x, y, color)
matrix.border(color, thickness=1)
matrix.grid_lines(spacing=8, color)
```

### Text Functions
```python
# Drawing text
matrix.text(text, x, y, color, bg_color=None, spacing=0)
matrix.text_grid(text, col, row, color, bg_color=None)
matrix.text_buffer(lines, color, bg_color=None)
matrix.char(char, x, y, color, bg_color=None)
matrix.centered_text(text, y, color, bg_color=None)

# Custom characters
matrix.register_char(char, bitmap)
```

### Colors
```python
# RGB mode: Use (r, g, b) tuples
red = (255, 0, 0)
green = (0, 255, 0)
blue = (0, 0, 255)
yellow = (255, 255, 0)
purple = (255, 0, 255)
cyan = (0, 255, 255)
white = (255, 255, 255)

# Monochrome mode: Use True/False
matrix.set_pixel(x, y, True)   # On
matrix.set_pixel(x, y, False)  # Off
```

### Display Output
```python
# Show on terminal
matrix.show()

# Advanced: Custom renderer
from src.display import TerminalRenderer
renderer = TerminalRenderer(matrix.get_display(), ascii_mode=False)
matrix.show(renderer)
```

## Terminal Compatibility

### Unicode Support
The default renderer uses Unicode block characters (█ ▀ ▄). If your terminal doesn't support these:

```python
# Use ASCII fallback mode
from src.display import TerminalRenderer
renderer = TerminalRenderer(matrix.get_display(), ascii_mode=True)
matrix.show(renderer)
```

### Testing
```bash
python3 examples/font_test.py      # Check Unicode support
python3 examples/aspect_test.py    # Check display aspect ratio
```

### Recommended Fonts
- **Mac**: Menlo, SF Mono, Monaco
- **Linux**: DejaVu Sans Mono, Liberation Mono
- **Windows**: Consolas, Cascadia Code

## Design Goals
- ✅ **Lightweight**: Zero dependencies, pure Python
- ✅ **Pi Zero compatible**: Efficient for low-power devices
- ✅ **Fast iteration**: Develop on any machine
- ✅ **Accurate emulation**: Terminal display matches LED matrix constraints
- ✅ **Easy transition**: Same code works on physical hardware
- ✅ **Retro aesthetic**: ZX Spectrum-inspired design

## Future Enhancements
- Sprite/image loading
- Animation framework with timing
- GPIO integration for physical LED matrix
- Network/backend connectivity
- 16x16 character mode
- More built-in icons

## Architecture

The system is designed in layers:

```
User Script (your code)
    ↓
High-Level API (led_api.py)
    ↓
Graphics + Font (graphics.py, font.py)
    ↓
Display Framebuffer (display.py)
    ↓
Renderer (TerminalRenderer / LEDMatrixRenderer)
    ↓
Output (Terminal / Physical LEDs)
```

This design allows you to develop with terminal output and deploy to physical LEDs by swapping the renderer.

## License

This project is designed for educational and hobbyist use with LED matrix displays.
