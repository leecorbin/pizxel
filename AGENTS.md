# AI Agent Guide for MatrixOS

**For AI assistants working on MatrixOS development**

This document contains critical knowledge about MatrixOS architecture, common pitfalls, best practices, and design philosophy learned through extensive development and debugging sessions. Read this *before* making changes to avoid introducing bugs we've already fixed!

---

## 🎯 Project Philosophy

**MatrixOS** is a retro-aesthetic, modern-engineering LED matrix OS:

### Core Principles

1. **Retro Aesthetic, Modern Practices**
   - Visual: ZX Spectrum font, 8-bit games, LED matrix look
   - Engineering: Automated testing, logging, clean architecture
   - "It should *look* like 1983 but *work* like 2025"

2. **Minimal Dependencies, Maximum Functionality**
   - Production: Only Pillow (for emoji rendering)
   - Testing: Pure Python stdlib (no numpy!)
   - Goal: Run on low-power Raspberry Pi Zero
   - **Critical**: Hardware has limited resources

3. **Emoji as Instant Icons**
   - Apps use real emoji for icons: `{"emoji": "🐸"}`
   - Modern approach: leverage Unicode instead of pixel art
   - Fallback to pixel art only when needed
   - **Don't overthink it**: If emoji exists, use it!

4. **Easy Installation**
   - Keep dependencies minimal (limited hardware)
   - Pure Python solutions preferred over libraries
   - Example: Testing framework uses lists, not numpy

### Key User Interventions

These are **critical moments** where the project lead corrected course. Learn from these!

#### "Just a quick intervention..." - The Numpy Decision

**Context:** AI suggested using numpy for testing framework's display buffer.

**User's intervention:**
> "just a quick intervention; what is numpy and why would that be better than using python lists? remember we are trying to keep this as easy to install as possible"

**Lesson:** Always question if a dependency is *really* needed. Raspberry Pi Zero has limited resources. Pure Python lists work fine for a 128×128 buffer. Don't add libraries just because they're "better" - ask "is this necessary?"

**Impact:** Entire testing framework rewritten to use pure Python. Zero dependencies.

#### "That's cute, but..." - The Emoji Philosophy

**Context:** AI created detailed pixel art frog icon (2485 bytes) for Frogger game.

**User's correction:**
> "that's cute, but why are we not using the emoji itself as we are with other apps?"

**Solution:** Changed to `{"emoji": "🐸"}` (simple reference to Unicode emoji)

**Lesson:** Modern approach = use emoji when they exist! Don't reinvent the wheel with pixel art. Clock uses ⏰, news uses 📰, Frogger uses 🐸. This is the way.

**Impact:** Consistent icon system across all apps. Simpler, more maintainable.

#### "We want them all to pass!" - Quality Standards

**Context:** Initial tests had failures (wrong colors, bad timeouts, incorrect expectations).

**User's expectation:**
> "ok, this is good but when we run tests we want them all to pass! So is the issue here with the apps, with the testing framework, or because the tests themsevles are not well designed for the apps?"

**Lesson:** Tests aren't decoration - they must actually work! Fix the tests to match reality (actual colors, reasonable timeouts, proper tolerances). Don't accept failing tests as "good enough."

**Impact:** 17/17 tests passing. Tests actually catch real bugs now.

#### Other Key Guidance

**On Philosophy:**
> "cute quasi-os with a retro style to work on low power hardware"
> "use modern approaches where possible ... like using the emoji as instant icons"
> "feel free always to suggest improvements based on this philosophy"

**On Testing:**
> "is it feasiable to have a fully automated system (i'm thinking like our own little pupeteer or agent)"
→ Led to complete testing framework with headless mode

**On Documentation:**
> "can we now make sure all the documentation is up to date and in sync with the api and current code"
→ Synchronized 15 documentation files

### Design Goals

- ✅ Develop anywhere (Mac/Linux/Windows terminal emulator)
- ✅ Deploy to Raspberry Pi LED matrices
- ✅ Responsive to different display sizes (64×64, 128×128, 256×192)
- ✅ Event-driven architecture (no blocking loops in apps)
- ✅ Comprehensive testing (catch bugs before deployment)

---

## 🚨 Critical API Corrections

### The Great API Mistake of 2025

**WRONG APIs (DO NOT USE):**
```python
matrix.pixel(x, y, color)        # ❌ Does not exist!
matrix.draw_line(...)            # ❌ Does not exist!
matrix.draw_rect(...)            # ❌ Does not exist!
```

**CORRECT APIs:**
```python
matrix.set_pixel(x, y, color)    # ✅ Correct
matrix.line(x1, y1, x2, y2, color)     # ✅ Correct
matrix.rect(x, y, width, height, color, fill=False)  # ✅ Correct
matrix.circle(cx, cy, radius, color, fill=False)     # ✅ Correct
matrix.text(text, x, y, color, bg_color=None, scale=1)  # ✅ Correct
```

**Why this matters:** Multiple games were written with wrong API names. Always check `docs/API_REFERENCE.md` before using drawing methods.

### Input System

**Space Bar is ACTION:**
```python
# All three work for jump/fire/action:
if event.key == InputEvent.ACTION:   # ✅ Preferred (semantic)
if event.key == ' ':                 # ✅ Also works (literal)
if event.key == 'A':                 # ✅ Also works (letter)
```

**Standard Keys:**
- `InputEvent.UP`, `DOWN`, `LEFT`, `RIGHT` - Arrow keys
- `InputEvent.OK` - Enter key
- `InputEvent.ACTION` - Space bar (for games)
- `InputEvent.BACK` - Backspace
- `InputEvent.HOME` - ESC (usually handled by framework)
- `InputEvent.HELP` - TAB key

---

## 🏗️ Architecture Deep Dive

### Event-Driven Framework

**Apps DO NOT manage their own loops!**

```python
# ❌ WRONG - App manages own loop
class MyApp(App):
    def run(self):
        while True:  # Don't do this!
            self.update()
            matrix.show()
```

```python
# ✅ CORRECT - Framework manages loop
class MyApp(App):
    def on_update(self, delta_time):
        """Called ~60fps by framework"""
        self.player_x += self.velocity * delta_time
        self.dirty = True  # Request re-render
    
    def render(self, matrix):
        """Called when dirty flag is set"""
        matrix.clear()
        matrix.rect(self.player_x, self.player_y, 10, 10, (255, 0, 0), fill=True)
        self.dirty = False  # Clear flag
```

### Dirty Flag Pattern

**Critical for performance:**
```python
def on_event(self, event):
    if event.key == InputEvent.RIGHT:
        self.player_x += 5
        self.dirty = True  # ← MUST set this!
        return True
    return False

def render(self, matrix):
    # Draw everything
    matrix.clear()
    matrix.rect(self.player_x, self.player_y, 10, 10, (0, 255, 0), fill=True)
    self.dirty = False  # ← MUST clear this!
```

**Common mistake:** Forgetting to set `self.dirty = True` after state changes → nothing renders!

### App Lifecycle

```python
class MyApp(App):
    def __init__(self):
        super().__init__("My App")
        self.score = 0
        self.dirty = True  # Request initial render
    
    def on_activate(self):
        """App becomes foreground"""
        self.reset_game()
        self.dirty = True
    
    def on_deactivate(self):
        """App goes to background"""
        self.save_state()
    
    def on_update(self, delta_time):
        """Called every frame (~60fps) when active"""
        self.update_physics(delta_time)
        if self.something_changed:
            self.dirty = True
    
    def on_background_tick(self):
        """Called ~1/second when inactive"""
        self.check_for_alerts()
        if self.timer_expired:
            self.request_foreground()  # Ask to become active
    
    def on_event(self, event):
        """Handle input"""
        if event.key == InputEvent.OK:
            self.fire()
            self.dirty = True
            return True  # Event handled
        return False  # Let framework handle
    
    def render(self, matrix):
        """Draw UI (only when dirty)"""
        matrix.clear()
        matrix.text(f"Score: {self.score}", 10, 10, (255, 255, 255))
        self.dirty = False
```

### Entry Point

Every app needs this:
```python
def run(os_context):
    """Called by MatrixOS to start app"""
    app = MyApp()
    os_context.register_app(app)
    os_context.switch_to_app(app)
    os_context.run()  # Starts event loop (blocks until exit)
```

---

## 🧪 Testing Framework

### Philosophy

**Tests are first-class citizens in MatrixOS.** Write tests as you build to catch bugs early.

### Pure Python Implementation

**Critical decision:** No numpy dependency!
```python
# Testing framework uses Python lists, not numpy arrays
self.buffer = [[(0, 0, 0) for _ in range(width)] for _ in range(height)]
```

**Why:** Keep dependencies minimal for limited hardware (Raspberry Pi Zero).

### Basic Test Pattern

```python
from matrixos.testing import TestRunner

def test_my_app():
    # Start app headless
    runner = TestRunner("examples.myapp.main", max_duration=10.0)
    runner.wait(1.0)
    
    # Verify rendering
    assert runner.display.render_count >= 30, "Should render at 30fps"
    
    # Find sprite by color
    player = runner.find_sprite((0, 255, 0), tolerance=10)
    assert player is not None, "Player should be visible"
    
    # Test input
    initial_x = player[0]
    runner.inject(InputEvent.RIGHT)
    runner.wait(0.5)
    
    # Verify movement
    new_player = runner.find_sprite((0, 255, 0), tolerance=10)
    assert new_player[0] > initial_x, "Player should move right"
    
    # Check logs
    runner.assert_no_errors_logged()
    
if __name__ == "__main__":
    test_my_app()
    print("✓ Test passed!")
```

### Common Test Pitfalls

**1. Color Tolerance**
```python
# ❌ BAD - exact match only
player = runner.find_sprite((0, 150, 255), tolerance=0)

# ✅ GOOD - handles anti-aliasing
player = runner.find_sprite((0, 150, 255), tolerance=10)
```

**2. Render Count Expectations**
```python
# ❌ BAD - assumes perfect 60fps
assert runner.display.render_count == 60

# ✅ GOOD - allows variation
assert runner.display.render_count >= 30
```

**3. Test Duration**
```python
# ❌ BAD - too short, tests flaky
runner = TestRunner("examples.myapp.main", max_duration=1.0)

# ✅ GOOD - reasonable timeout
runner = TestRunner("examples.myapp.main", max_duration=10.0)
```

**4. Log Reading**
```python
# ❌ BAD - since_test_start=True may miss logs
logs = runner.read_logs(since_test_start=True)

# ✅ GOOD - read all logs (default)
logs = runner.read_logs()  # or since_test_start=False
```

### Testing Capabilities

**Display Inspection:**
- `runner.pixel_at(x, y)` - Get pixel color
- `runner.count_color(color, tolerance)` - Count matching pixels
- `runner.find_sprite(color, tolerance)` - Find sprite centroid
- `runner.display.find_blobs(color, min_size)` - Find connected regions
- `runner.display.is_changing(frames)` - Detect animation
- `runner.snapshot(name)` - Visual regression testing

**Input Simulation:**
- `runner.inject(key)` - Single event
- `runner.inject_sequence([keys], delay)` - Key sequence
- `runner.inject_repeat(key, count, delay)` - Hold button
- `runner.wait(seconds)` - Wait with event loop
- `runner.wait_until(condition, timeout)` - Wait for condition

**Log Inspection:**
- `runner.read_logs()` - Get all logs
- `runner.log_contains(text)` - Search logs
- `runner.assert_no_errors_logged()` - Check for errors
- `runner.get_error_logs()` - Get error lines
- `runner.print_recent_logs(lines)` - Debug failures

---

## 📝 Logging System

### Usage

```python
from matrixos.logger import get_logger

class MyApp(App):
    def __init__(self):
        super().__init__("My App")
        self.logger = get_logger("myapp")  # lowercase name
    
    def on_activate(self):
        self.logger.info("App activated")
        self.logger.debug(f"Player position: {self.player_x}, {self.player_y}")
    
    def on_event(self, event):
        if event.key == InputEvent.ACTION:
            self.logger.info("Player fired weapon")
            try:
                self.fire_weapon()
            except Exception as e:
                self.logger.error(f"Fire failed: {e}")
```

**Logs location:** `settings/logs/myapp.log`

### Log Levels

- `DEBUG` - Detailed diagnostics (verbose)
- `INFO` - General information (normal operations)
- `WARNING` - Something unexpected but handled
- `ERROR` - Error that prevented operation

**In tests:**
```python
# Check logs after test
runner.assert_no_errors_logged()

# Search for specific events
assert runner.log_contains("Player fired weapon")

# Debug test failures
if test_failed:
    runner.print_recent_logs(lines=30)
```

---

## 🎨 Graphics Best Practices

### Color Format

```python
# RGB tuples (0-255)
RED = (255, 0, 0)
GREEN = (0, 255, 0)
BLUE = (0, 0, 255)
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)

# For monochrome displays
matrix.set_pixel(x, y, True)   # On
matrix.set_pixel(x, y, False)  # Off
```

### Coordinate System

- Origin: `(0, 0)` is **top-left**
- X increases rightward
- Y increases downward
- Drawing outside bounds is safe (automatically clipped)

### Text Rendering

```python
# ZX Spectrum 8×8 font (built-in)
matrix.text("HELLO", 10, 20, (255, 255, 255))

# Centered text
matrix.centered_text("GAME OVER", y=64, color=(255, 0, 0))

# Scaled text
matrix.text("BIG", 10, 10, (0, 255, 0), scale=2)  # 16×16 chars
```

### Performance Tips

1. **Don't call `matrix.show()`** - Framework handles this automatically
2. **Use dirty flag** - Only render when state changes
3. **Clear once per frame** - `matrix.clear()` at start of render()
4. **Batch drawing** - Draw everything in render(), not in on_update()

---

## 🐛 Common Bugs & Fixes

### Bug: App Doesn't Render

**Symptoms:** Black screen, nothing draws

**Causes:**
1. Forgot to set `self.dirty = True` after state change
2. Using wrong API names (matrix.pixel instead of matrix.set_pixel)
3. Forgot to clear dirty flag in render()
4. Not setting initial dirty flag in `__init__`

**Fix:**
```python
def __init__(self):
    super().__init__("My App")
    self.dirty = True  # ← Must set initial render

def on_event(self, event):
    if event.key == InputEvent.RIGHT:
        self.x += 1
        self.dirty = True  # ← Must set after changes
        return True
    return False

def render(self, matrix):
    matrix.clear()
    matrix.set_pixel(self.x, self.y, (255, 0, 0))  # ← Correct API
    self.dirty = False  # ← Must clear
```

### Bug: Input Not Working

**Symptoms:** Keys do nothing

**Causes:**
1. Not returning `True` when handling event
2. Using wrong InputEvent constants
3. Forgetting to set dirty flag after handling

**Fix:**
```python
def on_event(self, event):
    if event.key == InputEvent.ACTION:  # ← Correct constant
        self.jump()
        self.dirty = True  # ← Set dirty
        return True  # ← MUST return True!
    return False
```

### Bug: Test Can't Find Sprite

**Symptoms:** `find_sprite()` returns None

**Causes:**
1. Using exact color (tolerance=0)
2. Wrong color values
3. Not waiting for render

**Fix:**
```python
# Check what colors actually exist
runner.wait(0.5)
print(f"Center pixel: {runner.pixel_at(64, 64)}")

# Use tolerance
player = runner.find_sprite((0, 150, 255), tolerance=10)  # ← Add tolerance

# Verify app is rendering
assert runner.display.render_count > 0, "App not rendering"
```

### Bug: Logs Not Found in Tests

**Symptoms:** `read_logs()` returns empty string

**Causes:**
1. Using `since_test_start=True` (filters out app loading logs)
2. Wrong app name

**Fix:**
```python
# Read all logs (default)
logs = runner.read_logs()

# Or explicitly
logs = runner.read_logs(since_test_start=False)

# Check if logs exist
if not logs:
    runner.print_recent_logs(lines=50)
```

---

## 📁 Project Structure

```
matrixos/
├── matrixos/                    # Core OS modules
│   ├── app_framework.py         # Event loop, app lifecycle
│   ├── led_api.py               # Matrix drawing API
│   ├── display.py               # Terminal emulator + hardware
│   ├── font.py                  # ZX Spectrum 8×8 font
│   ├── graphics.py              # Drawing primitives
│   ├── input.py                 # Keyboard input
│   ├── layout.py                # Layout helpers
│   ├── config.py                # Configuration
│   └── testing/                 # Testing framework
│       ├── display_adapter.py   # Headless display (pure Python!)
│       ├── input_simulator.py   # Event injection
│       ├── assertions.py        # Test assertions
│       └── runner.py            # TestRunner (log integration)
├── apps/                        # User apps (empty - examples/ for now)
├── examples/                    # Example apps
│   ├── frogger/                 # Frogger game
│   ├── platformer/              # Platformer game
│   ├── space_invaders/          # Space Invaders
│   ├── pacman/                  # Pac-Man
│   ├── clock/                   # Clock app
│   └── news/                    # News reader
├── tests/                       # Automated tests
│   ├── smoke_test.py            # Quick sanity (2 tests)
│   ├── advanced_test.py         # Feature tests (8 tests)
│   └── test_log_integration.py  # Log tests (7 tests)
├── docs/                        # Documentation
│   ├── API_REFERENCE.md         # Complete API (THE SOURCE OF TRUTH)
│   ├── TESTING.md               # Testing guide
│   ├── FRAMEWORK.md             # Architecture
│   ├── HARDWARE.md              # Build guide
│   └── ...
├── start.py                     # MatrixOS launcher
├── requirements.txt             # Dependencies (Pillow only!)
└── AGENTS.md                    # This file
```

---

## 📚 Essential Reading

**Before coding, READ THESE:**

1. **[docs/API_REFERENCE.md](docs/API_REFERENCE.md)** ⭐
   - THE authoritative source for all APIs
   - Drawing methods, input constants, testing APIs
   - **Check this FIRST before using any method!**

2. **[docs/FRAMEWORK.md](docs/FRAMEWORK.md)**
   - Architecture and design patterns
   - Event-driven model explained
   - App lifecycle details

3. **[docs/TESTING.md](docs/TESTING.md)**
   - Complete testing guide
   - Common patterns and examples
   - Troubleshooting guide

4. **[README.md](README.md)**
   - Quick start and overview
   - Installation instructions
   - Project philosophy

---

## 🔍 Debugging Workflow

### 1. Check the Logs

```bash
# App logs
tail -f settings/logs/myapp.log

# Framework logs
tail -f /tmp/matrixos_debug.log
```

### 2. Run Tests

```bash
# Quick check
python3 tests/smoke_test.py

# Comprehensive
python3 tests/advanced_test.py

# All tests
python3 tests/smoke_test.py && \
python3 tests/advanced_test.py && \
python3 tests/test_log_integration.py
```

### 3. Test Your App

```python
from matrixos.testing import TestRunner

# Quick verification
runner = TestRunner("examples.myapp.main", max_duration=10.0)
runner.wait(2.0)

print(f"Renders: {runner.display.render_count}")
print(f"Errors: {runner.get_error_logs()}")

# Check what's on screen
for y in range(0, 128, 10):
    for x in range(0, 128, 10):
        print(f"({x},{y}): {runner.pixel_at(x, y)}")
```

### 4. Verify API Usage

```bash
# Search for wrong APIs in your code
grep -r "matrix\.pixel(" examples/myapp/
grep -r "matrix\.draw_" examples/myapp/

# Should find zero matches!
```

---

## 💡 Development Tips

### When Adding New Features

1. **Write test first** - TDD catches bugs early
2. **Check API_REFERENCE.md** - Don't guess method names
3. **Add logging** - Help future debugging
4. **Update docs** - Keep everything in sync
5. **Run all tests** - Ensure no regressions

### When Fixing Bugs

1. **Reproduce in test** - Write failing test first
2. **Check logs** - Often shows root cause
3. **Verify fix** - Test should pass after fix
4. **Add regression test** - Prevent bug from returning

### When Refactoring

1. **Run tests before** - Establish baseline
2. **Make small changes** - Easy to identify breaks
3. **Run tests after each change** - Catch issues immediately
4. **Update docs** - Keep everything current

---

## 🎯 Quick Reference

### Most Used APIs

```python
# Drawing
matrix.set_pixel(x, y, color)
matrix.clear()
matrix.line(x1, y1, x2, y2, color)
matrix.rect(x, y, w, h, color, fill=False)
matrix.circle(cx, cy, radius, color, fill=False)
matrix.text(text, x, y, color)

# Input
event.key == InputEvent.UP / DOWN / LEFT / RIGHT
event.key == InputEvent.OK / ACTION / BACK

# App Lifecycle
self.dirty = True  # Request render
on_activate()      # App becomes active
on_update(dt)      # Every frame (~60fps)
render(matrix)     # Draw UI
on_event(event)    # Handle input

# Testing
runner = TestRunner("examples.myapp.main")
runner.inject(InputEvent.ACTION)
runner.wait(1.0)
runner.find_sprite(color, tolerance=10)
runner.assert_no_errors_logged()
```

### File You'll Edit Most

- `examples/yourapp/main.py` - Your app code
- `examples/yourapp/config.json` - App metadata
- `examples/yourapp/icon.json` - App icon (use `{"emoji": "🎮"}` format!)
- `tests/test_yourapp.py` - Your tests

---

## 🚀 Getting Started Checklist

**For new AI agents working on MatrixOS:**

- [ ] Read this entire document
- [ ] Read [docs/API_REFERENCE.md](docs/API_REFERENCE.md)
- [ ] Run existing tests to verify setup
- [ ] Review an example app (start with `examples/clock/`)
- [ ] Understand event-driven architecture (no blocking loops!)
- [ ] Remember: It's `set_pixel`, not `pixel`!
- [ ] Remember: Use `{"emoji": "🎮"}` for icons when possible
- [ ] Remember: Always check logs with `runner.assert_no_errors_logged()`
- [ ] Remember: Pure Python preferred (no numpy for limited hardware)

---

## ⚠️ Common AI Assistant Pitfalls

### Things Inexperienced AIs Often Get Wrong

**1. Suggesting Dependencies Without Checking**
- ❌ "Let's use numpy for array handling"
- ❌ "We should add pygame for collision detection"
- ❌ "Install opencv for image processing"
- ✅ **ALWAYS ASK**: "Is this dependency absolutely necessary? Can we do it in pure Python?"
- Remember: Raspberry Pi Zero has limited resources

**2. Using Wrong API Names**
- ❌ `matrix.pixel(x, y, color)` - Doesn't exist!
- ❌ `matrix.draw_line()` - Doesn't exist!
- ❌ `matrix.draw_rect()` - Doesn't exist!
- ✅ **ALWAYS CHECK** `docs/API_REFERENCE.md` before suggesting ANY matrix method
- This bug happened multiple times - don't repeat it!

**3. Creating Pixel Art When Emoji Exists**
- ❌ Spending time creating detailed pixel art icons
- ❌ Writing complex icon generators for common symbols
- ✅ **USE EMOJI FIRST**: `{"emoji": "�"}` is better than 2485 bytes of pixel data
- Only create pixel art if no suitable emoji exists

**4. Suggesting Blocking Loops in Apps**
- ❌ `while True:` loops in app code
- ❌ `time.sleep()` in apps
- ❌ Manual event polling
- ✅ **USE LIFECYCLE METHODS**: `on_update()`, `on_event()`, `render()`
- Framework handles the loop - apps just respond to events

**5. Forgetting the Dirty Flag**
- ❌ Changing state without setting `self.dirty = True`
- ❌ Not clearing `self.dirty = False` in render()
- ✅ **EVERY STATE CHANGE** must set dirty flag
- This is the #1 cause of "nothing renders" bugs

**6. Writing Tests That Don't Actually Test Reality**
- ❌ Expecting exactly 60 renders per second
- ❌ Using tolerance=0 for color matching (anti-aliasing exists!)
- ❌ Too-short timeouts (max_duration=1.0)
- ✅ **USE REALISTIC EXPECTATIONS**: `>= 30` renders, `tolerance=10`, `max_duration=10.0`

**7. Not Checking Logs**
- ❌ Ignoring log output when tests fail
- ❌ Not using `runner.assert_no_errors_logged()`
- ❌ Missing error messages in logs
- ✅ **ALWAYS CHECK LOGS**: They tell you exactly what went wrong

**8. Assuming APIs Work Like Other Frameworks**
- ❌ "In pygame you do X, so here..."
- ❌ "This is how React works, so..."
- ✅ **READ THE DOCS FIRST**: MatrixOS has its own patterns
- Don't assume - verify!

**9. Over-Engineering Simple Solutions**
- ❌ Creating complex state machines for simple flags
- ❌ Adding abstraction layers unnecessarily
- ❌ Using design patterns for 10-line apps
- ✅ **KEEP IT SIMPLE**: If it works and is readable, ship it

**10. Not Running Tests After Changes**
- ❌ Making changes without verifying
- ❌ Assuming "it should work"
- ❌ Breaking existing functionality
- ✅ **ALWAYS RUN TESTS**: `python3 tests/smoke_test.py` before committing

### Pre-Change Verification Checklist

Before suggesting ANY code change:

```markdown
- [ ] Have I read AGENTS.md?
- [ ] Have I checked API_REFERENCE.md for correct method names?
- [ ] Am I suggesting pure Python (no unnecessary dependencies)?
- [ ] Does this follow the event-driven pattern (no blocking loops)?
- [ ] Did I remember to set the dirty flag after state changes?
- [ ] Will this work on Raspberry Pi Zero (limited resources)?
- [ ] Should I use an emoji instead of creating pixel art?
- [ ] Have I included proper logging for debugging?
- [ ] Does this need a test? (Hint: probably yes)
- [ ] Will existing tests still pass after this change?
```

### When in Doubt

1. **Check the docs** - `API_REFERENCE.md` is the source of truth
2. **Look at examples** - See how existing apps do it
3. **Run the tests** - They show what actually works
4. **Read the logs** - They tell you what went wrong
5. **Ask yourself** - "Would this work on a Raspberry Pi Zero?"

---

## �📞 Getting Help

**Documentation:**
- `docs/API_REFERENCE.md` - API methods and signatures (THE SOURCE OF TRUTH)
- `docs/TESTING.md` - Testing guide and examples
- `docs/FRAMEWORK.md` - Architecture details
- `docs/LOGGING.md` - Logging system

**Examples:**
- `examples/*/main.py` - Working app code
- `tests/*.py` - Working test code

**Debugging:**
- Check `settings/logs/` for app logs
- Check `/tmp/matrixos_debug.log` for framework logs
- Run tests to verify behavior
- Use TestRunner to inspect display state

---

## 🎓 Lessons Learned

### Key Insights from Development

1. **API names matter** - Multiple bugs from wrong method names (pixel vs set_pixel)
2. **Testing saves time** - Bugs caught in tests are 10× faster to fix than in hardware
3. **Pure Python works** - Don't need numpy for testing, lists are fine
4. **Logs are invaluable** - Integration with tests helps debug failures
5. **Dirty flag is critical** - Most rendering bugs are forgot to set dirty
6. **Tolerance is necessary** - Anti-aliasing means exact color matches fail
7. **Emoji are powerful** - Using real emoji as icons is simpler than pixel art
8. **Event-driven is cleaner** - Apps don't manage loops, framework does

### What Works Well

- ✅ Event-driven architecture (apps are clean and focused)
- ✅ Comprehensive testing (17/17 tests passing)
- ✅ Pure Python approach (minimal dependencies)
- ✅ Emoji icon system (modern + simple)
- ✅ Terminal emulator (develop anywhere)
- ✅ Logging integration (debugging in tests)

### What to Watch Out For

- ⚠️ API method names (always check docs first!)
- ⚠️ Dirty flag management (easy to forget)
- ⚠️ Event return values (must return True when handled)
- ⚠️ Color tolerance (exact matches often fail)
- ⚠️ Test timeouts (allow reasonable duration)
- ⚠️ Log filtering (since_test_start can exclude important logs)

---

## 🤖 For Claude Users: Context Management

**Claude-Specific Tips** for working on MatrixOS effectively:

### Essential Context to Load

When starting a new conversation:

1. **This file (AGENTS.md)** - Load this first! (~900 lines, core knowledge)
2. **[docs/API_REFERENCE.md](docs/API_REFERENCE.md)** - Complete API reference
3. **Current task files** - Specific files you're working on

### Using MCP Tools Effectively

```bash
# List directory structure first
list_dir /path/to/led-matrix-project

# Search before reading
file_search "**/*.py"
grep_search "set_pixel" --includePattern "examples/**/*.py"

# Read targeted sections
read_file path/to/file.py startLine=1 endLine=100

# Find all usages before changing APIs
list_code_usages "set_pixel"

# Check for errors
get_errors
```

### Pre-Flight Checklist for Claude

Before suggesting ANY code change:

- [ ] Have I checked `API_REFERENCE.md` for correct method names?
- [ ] Am I suggesting pure Python (no numpy, pygame, opencv, etc.)?
- [ ] Does this follow event-driven pattern (no `while True:` loops)?
- [ ] Did I remember the dirty flag (`self.dirty = True`)?
- [ ] Should I use an emoji (`{"emoji": "🎮"}`) instead of pixel art?
- [ ] Have I verified this would work on Raspberry Pi Zero?
- [ ] Will existing tests still pass?

### Common Claude Mistakes to Avoid

1. **Assuming APIs from other frameworks** - pygame/pygame-zero patterns don't apply
2. **Suggesting complex libraries** - Remember: Pure Python, limited hardware
3. **Creating elaborate pixel art** - Use emoji first! (`{"emoji": "🐸"}`)
4. **Forgetting to run tests** - Always verify changes with tests
5. **Not checking logs** - `runner.assert_no_errors_logged()` catches issues

---

## 🏁 Final Words

MatrixOS is **production-ready** with:
- ✅ 17/17 tests passing
- ✅ Complete API documentation
- ✅ Comprehensive testing framework
- ✅ Multiple working example apps
- ✅ Pure Python (minimal dependencies)
- ✅ Modern engineering with retro aesthetic

**Remember:** When in doubt, check `docs/API_REFERENCE.md`. It's the source of truth!

**Happy coding!** 🎮✨

---

*Last updated: November 4, 2025*  
*For questions or clarifications, see documentation in `docs/` directory*
