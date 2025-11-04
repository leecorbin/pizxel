# MatrixOS Copilot Instructions

## Project Overview
MatrixOS is a retro-aesthetic LED matrix OS for Raspberry Pi. Philosophy: "Look like 1983, work like 2025." Apps run on event-driven framework with 60fps loop, no blocking code allowed.

## Critical Rules

### 1. API Names (Most Common Bug!)
```python
# ❌ WRONG - These methods don't exist
matrix.pixel(x, y, color)
matrix.draw_line(...)
matrix.draw_rect(...)

# ✅ CORRECT - Always use these
matrix.set_pixel(x, y, color)
matrix.line(x1, y1, x2, y2, color)
matrix.rect(x, y, width, height, color, fill=False)
matrix.circle(cx, cy, radius, color, fill=False)
matrix.text(text, x, y, color)
```
**Verify all matrix methods in `docs/API_REFERENCE.md` before use.**

### 2. Event-Driven Architecture
Apps NEVER manage their own loops. Framework calls lifecycle methods:
```python
class MyApp(App):
    def __init__(self):
        super().__init__("My App")
        self.dirty = True  # Must set for initial render!
    
    def on_update(self, delta_time):  # Called ~60fps
        self.player_x += self.velocity * delta_time
        self.dirty = True  # Must set after ANY state change!
    
    def on_event(self, event):
        if event.key == InputEvent.ACTION:  # Space bar
            self.jump()
            self.dirty = True  # Required!
            return True  # Must return True when handled!
        return False
    
    def render(self, matrix):  # Only called when dirty=True
        matrix.clear()
        matrix.rect(self.player_x, self.player_y, 10, 10, (255, 0, 0), fill=True)
        self.dirty = False  # Must clear!
```
**Never use `while True:` or `time.sleep()` in apps!**

### 3. Dirty Flag Pattern
Rendering only happens when `self.dirty = True`. This is the #1 cause of "nothing renders" bugs:
- Set `dirty=True` after EVERY state change
- Clear `dirty=False` at end of render()
- Set initial `dirty=True` in `__init__()`

### 4. Dependencies: Pure Python Only
**DO NOT suggest numpy, pygame, opencv, or similar libraries.** This runs on Raspberry Pi Zero with limited resources. Use stdlib lists instead of numpy arrays:
```python
# ✅ CORRECT - Pure Python
buffer = [[(0, 0, 0) for _ in range(width)] for _ in range(height)]
```

### 5. Icons: Use Emoji First
```json
{"emoji": "🐸"}  // ✅ Preferred - Simple and modern
```
Only create pixel art if no suitable emoji exists. See `examples/frogger/icon.json`.

## Input System
```python
# Standard keys (from matrixos.input import InputEvent)
InputEvent.UP, DOWN, LEFT, RIGHT  # Arrow keys
InputEvent.OK      # Enter
InputEvent.ACTION  # Space bar (for jump/fire in games)
InputEvent.BACK    # Backspace
InputEvent.HOME    # ESC (handled by framework)
```

## App Structure
```
examples/myapp/
├── main.py          # App class + run(os_context) entry point
├── config.json      # {"name": "...", "entry_point": "main.py"}
└── icon.json        # {"emoji": "🎮"}
```

Every `main.py` needs:
```python
def run(os_context):
    app = MyApp()
    os_context.register_app(app)
    os_context.switch_to_app(app)
    os_context.run()  # Starts event loop (blocks until exit)
```

## Testing
All apps must have tests. Use headless testing framework:
```python
from matrixos.testing import TestRunner

runner = TestRunner("examples.myapp.main", max_duration=10.0)
runner.wait(1.0)
runner.inject(InputEvent.ACTION)
player = runner.find_sprite((0, 255, 0), tolerance=10)  # Always use tolerance!
assert player is not None
runner.assert_no_errors_logged()
```

**Test expectations must be realistic:**
- Use `>= 30` for render counts (not `== 60`)
- Use `tolerance=10` for colors (anti-aliasing exists)
- Use `max_duration=10.0` minimum (not 1.0)
- Use `since_test_start=False` for log reading (default)

Run tests: `python3 tests/smoke_test.py && python3 tests/advanced_test.py`

## Commands
```bash
# Run MatrixOS
python3 start.py --width 128 --height 128

# Run specific app
python3 -m examples.clock.main  # (after implementing test mode)

# Run all tests
python3 tests/smoke_test.py && python3 tests/advanced_test.py && python3 tests/test_log_integration.py

# Check logs
tail -f settings/logs/myapp.log           # App logs
tail -f /tmp/matrixos_debug.log           # Framework logs
```

## Logging
```python
from matrixos.logger import get_logger

class MyApp(App):
    def __init__(self):
        super().__init__("My App")
        self.logger = get_logger("myapp")  # lowercase
    
    def on_activate(self):
        self.logger.info("App activated")
        self.logger.debug(f"State: {self.state}")
```
Logs saved to `settings/logs/myapp.log`.

## Before Every Change
- [ ] Check `docs/API_REFERENCE.md` for correct method names
- [ ] Verify event-driven pattern (no blocking loops)
- [ ] Remember dirty flag after state changes
- [ ] Consider Raspberry Pi Zero constraints (no heavy libraries)
- [ ] Use emoji for icons when possible
- [ ] Add logging for debugging
- [ ] Write/update tests
- [ ] Run all tests before committing

## Essential Docs
- `docs/API_REFERENCE.md` - THE source of truth for all APIs
- `AGENTS.md` - Comprehensive guide with historical context and common pitfalls
- `docs/TESTING.md` - Testing patterns and examples
- `docs/FRAMEWORK.md` - Architecture details

**Read AGENTS.md for full context including user interventions and lessons learned!**
