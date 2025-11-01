# Pi-Matrix Examples

Interactive demos showing all features of the Pi-Matrix LED display system.

## 🚀 Getting Started

**Start here:**
```bash
python3 examples/start_here.py
```

This launches an interactive menu where you can explore all the demos!

## 📚 Demo Descriptions

### `start_here.py` - Interactive Demo Launcher
**START HERE!** Interactive menu system with:
- ZX Spectrum-style loading screen
- Visual menu on the LED matrix
- Easy navigation through all demos
- Returns to menu after each demo

### `hello_world.py` - Quick Start
Simple "Hello World" example showing the basics:
- Create a matrix
- Draw a circle
- Add text
- Display output

Perfect for understanding the basic API.

### `graphics_showcase.py` - Drawing Primitives
Comprehensive demonstration of all drawing functions:
- **Basic shapes**: Circles, rectangles, triangles
- **Advanced shapes**: Stars, ellipses, polygons
- **Lines and patterns**: Radial patterns, geometric designs
- **Filled shapes**: With colored outlines
- **Pixel art**: Simple smiley face example

Shows how to use RGB colors and fill modes.

### `text_showcase.py` - Font System
Complete tour of the ZX Spectrum font system:
- **Pixel-positioned text**: Place text anywhere
- **Grid mode**: 8x8 character grid positioning
- **Text buffer**: ZX-81 style full-screen text mode
- **Character set**: All ASCII characters
- **Custom icons**: Register your own 8x8 symbols
- **Text effects**: Backgrounds, spacing, shadows
- **Block graphics**: ZX Spectrum quarter blocks

### `combined_demo.py` - UI Examples
Practical examples combining graphics and text:
- **UI elements**: Title bars, info boxes, progress bars
- **Data visualization**: Bar charts with labels
- **Game UI**: Score displays, lives indicators, player graphics
- **Notifications**: Alert boxes and messages
- **Clock face**: Analog clock with hands
- **Weather display**: Icons and text layout
- **Loading screen**: Retro-style loading animation

Perfect for seeing how to build complete interfaces.

### `animation_demo.py` - Motion & Animation
Moving patterns and basic animation techniques:
- **Moving square**: Collision detection
- **Rotating line**: Trigonometric rotation
- **Expanding circles**: Animated concentric circles
- **Scrolling pattern**: Seamless pattern animation
- **Snake trail**: Path following with history
- **RGB color waves**: Animated color patterns

Learn frame-by-frame animation and movement.

### `plasma_demo.py` - Mathematical Effects
Beautiful mathematical visualization patterns:
- **Classic plasma**: Multiple sine wave interference
- **Interference pattern**: Two moving point sources
- **Standing waves**: Wave function visualization
- **Tunnel effect**: Polar coordinate distortion

Advanced effects using trigonometry and color mapping.

### `physics_demo.py` - Physics Simulation
Real-time physics demonstrations:
- **Bouncing balls**: Gravity and collision with ground
- **Particle fountain**: Particle lifecycle and effects
- **Ball collisions**: Elastic collision detection
- **Color coding**: Different colors for different objects

Shows how to build interactive simulations.

### `starfield_demo.py` - Particle Systems
Particle effects and 3D projections:
- **3D starfield**: Perspective projection
- **Fireflies**: Random movement with pulsing glow
- **Rain effect**: Falling particles with trails
- **Sparkles**: Fade in/out effects

Learn particle management and visual effects.

### `zx_spectrum_menu.py` - Retro Screens
ZX Spectrum-inspired display screens:
- **Splash screen**: Rainbow borders and loading bars
- **Menu system**: Colorful menu items
- **Tape loader**: Animated loading effect
- **Game over**: Flash borders and score display
- **High scores**: Score table layout
- **Character set**: Font showcase with colors

Nostalgic tribute to 1980s computing!

## 🎮 Interactive Applications & Games

These examples demonstrate the **Matrix OS** framework - building fully interactive applications with both input and output. They use the new input abstraction layer that works with keyboard now and will support GPIO buttons on Raspberry Pi.

### `interactive_app_example.py` - Drawing App
Simple pixel drawing application showing the basics of interactive apps:
- **Cursor movement**: Arrow keys to move 2×2 cursor
- **Drawing**: Space bar to toggle pixels on/off
- **Clearing**: C key to clear screen
- **Controls**: Q/ESC to quit
- **Visual feedback**: Blinking cursor indicator

Perfect starting point for building your own Matrix OS apps!

### `game_snake.py` - Snake Game
Classic snake game adapted for 64×64 display:
- **Controls**: Arrow keys to change direction
- **Gameplay**: Eat food to grow longer and score points
- **Collision detection**: Wall and self-collision ends game
- **Progressive difficulty**: Speed increases as you score
- **Visual indicators**: Blinking food, yellow head, green body
- **Score tracking**: Points and length display

A complete game in under 200 lines!

### `game_breakout.py` - Breakout
Brick-breaking arcade game with full physics:
- **Controls**: Left/Right arrows to move paddle
- **Physics**: Ball bouncing with spin based on paddle hit position
- **Brick grid**: 4 rows of colored bricks (28 total)
- **Lives system**: 3 lives, displayed as icons
- **Scoring**: 10 points per brick
- **Win condition**: Clear all bricks
- **Game states**: Title screen, gameplay, game over, victory

Shows how to build arcade-style games with collision detection.

### `game_tetris.py` - Tetris
Full Tetris implementation with all classic features:
- **Controls**: Arrow keys to move/rotate, Down to drop faster
- **All 7 tetrominoes**: I, O, T, S, Z, J, L pieces in classic colors
- **Rotation**: 90-degree rotation with wall/block collision checking
- **Playfield**: 10×20 grid rendered as 2×2 pixel blocks
- **Line clearing**: With score multipliers (100/300/500/800 for 1-4 lines)
- **Next piece preview**: See what's coming
- **Progressive speed**: Game gets faster as you score
- **Game over detection**: Spawning collision ends game

A complete Tetris in under 310 lines - challenge yourself in 64×64!

## 🔧 Testing & Utilities

### `aspect_test.py` - Display Aspect Ratio
Tests if your terminal displays the matrix as a square:
- Draws circles and squares
- Helps verify terminal font settings
- Visual reference for aspect ratio

### `font_test.py` - Unicode Support
Checks if your terminal supports Unicode block characters:
- Tests █ ▀ ▄ characters
- Shows ANSI color codes
- Provides font recommendations
- Troubleshooting guide

### `ascii_mode_test.py` - ASCII Fallback
Compares Unicode vs ASCII rendering modes:
- Side-by-side comparison
- Shows ASCII alternatives (# ^ _)
- Helps diagnose font issues

## 💡 Usage Tips

### Running Demos

All demos can be run directly:
```bash
python3 examples/hello_world.py
python3 examples/graphics_showcase.py
# etc...
```

Or use the launcher:
```bash
python3 examples/start_here.py
```

### Terminal Compatibility

For best results:
- **Mac**: Use Menlo, SF Mono, or Monaco font
- **Linux**: DejaVu Sans Mono or Liberation Mono
- **Windows**: Consolas or Cascadia Code

If you see dashes instead of blocks, check `font_test.py` for help.

### Modifying Demos

All demos are simple Python scripts you can:
- Read to learn the API
- Modify to experiment
- Copy as starting points for your own projects

### Creating Your Own

Use any demo as a template:

```python
from src.led_api import create_matrix

# Create matrix
matrix = create_matrix(64, 64, 'rgb')

# Your code here
matrix.circle(32, 32, 20, (255, 0, 0), fill=True)
matrix.text("HELLO", 10, 28, (255, 255, 255))

# Display
matrix.show()
```

## 🎯 What's Next?

After exploring the demos:

1. **Read the main README.md** - Full API documentation
2. **Check out the source code** - See how it all works
3. **Build your own displays** - Use the API to create something new!

## 🔮 Future Hardware Integration

These demos work with terminal output now, but the code is designed to work with real LED matrices:

- Same API will work on Raspberry Pi
- Just swap `TerminalRenderer` for `LEDMatrixRenderer`
- GPIO integration coming soon
- Compatible with 64x64 and 128x64 matrices

Develop and test on any machine, deploy to Pi!

## 📖 More Information

- Main README: `../README.md`
- Source code: `../src/`
- License: `../LICENSE` (MIT)

Happy exploring! 🎨✨
