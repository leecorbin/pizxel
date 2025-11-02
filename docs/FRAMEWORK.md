# MatrixOS App Framework

## Architecture Overview

MatrixOS uses **true OS-style app execution** with:

- **Event-driven architecture** - Apps don't run their own loops
- **Background processing** - Apps can run when inactive
- **Screen takeover** - Background apps can request attention
- **Cooperative multitasking** - OS manages all apps

> **Note**: ALL apps must use the framework. There is no subprocess/standalone mode.
> Apps are imported and run in-process by the OS.

## How It Works

### The Framework Model

MatrixOS uses an **event-driven, callback-based architecture**:
```python
from matrixos.app_framework import App

class MyApp(App):
    def on_update(self, delta_time):
        # Called every frame by OS (~60fps)
        pass

    def on_background_tick(self):
        # Called when app is in background (~1 second)
        pass

    def render(self, matrix):
        # Draw UI (don't call matrix.show()!)
        pass

def run(os_context):
    app = MyApp()
    os_context.register_app(app)
    os_context.switch_to_app(app)
```

**Key Principles**:
- **Apps don't loop** - OS calls your methods
- **Apps don't manage exit** - ESC/Q handled by OS
- **Apps cooperate** - Share screen time
- **Apps can multitask** - Run in background

## App Lifecycle Methods

### `on_activate()`
Called when app becomes the foreground app.
- Initialize UI
- Resume animations
- Load saved state

### `on_deactivate()`
Called when app goes to background.
- Save state
- Pause animations
- Release resources

### `on_update(delta_time)`
Called every frame when active (~60fps).
- Update animations
- Game logic
- Active UI updates
- **Must return quickly!**

### `on_background_tick()`
Called periodically when inactive (~1 second).
- Check timers
- Fetch data
- Monitor for alerts
- **Must be VERY fast!**

### `on_event(event)`
Handle input events when active.
- Process keyboard input
- Return `True` if handled
- Return `False` to pass to OS

### `render(matrix)`
Draw the app's UI.
- Called after `on_update()`
- Draw to matrix
- **Don't call `matrix.show()`** - OS does this!

## Example: Timer App

Shows how background processing works:

```python
class TimerApp(App):
    def __init__(self):
        super().__init__("Timer")
        self.countdown = 10
        self.running = True

    def on_update(self, delta_time):
        """Smooth countdown when active"""
        if self.running:
            self.countdown -= delta_time
            if self.countdown <= 0:
                self.alarm_triggered = True

    def on_background_tick(self):
        """Timer runs even in background!"""
        if self.running:
            self.countdown -= 1
            if self.countdown <= 0:
                # Request OS to show us!
                self.request_attention(priority='high')

    def render(self, matrix):
        """Draw timer UI"""
        matrix.centered_text(f"{int(self.countdown)}s", 30, (255, 255, 0))
```

## Benefits

1. **Simpler apps** - No boilerplate event loops
2. **True multitasking** - Multiple apps can run
3. **Notifications** - Background apps can alert
4. **Better UX** - ESC always works (OS guarantees)
5. **Power efficient** - Single event loop
6. **Easy testing** - Apps can still run standalone

## Creating Framework Apps

### Required Structure

```
apps/myapp/
├── main.py       # App code with run(os_context)
├── config.json   # App metadata
└── icon.json     # 16x16 icon
```

### Minimal Example

```python
#!/usr/bin/env python3
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from matrixos.app_framework import App

class MyApp(App):
    def render(self, matrix):
        matrix.centered_text("HELLO!", 30, (0, 255, 255))

def run(os_context):
    """Called by OS"""
    app = MyApp()
    os_context.register_app(app)
    os_context.switch_to_app(app)

if __name__ == '__main__':
    # Standalone testing
    from matrixos.led_api import create_matrix
    from matrixos.input import KeyboardInput
    from matrixos.config import parse_matrix_args
    from matrixos.app_framework import OSContext

    args = parse_matrix_args("My App")
    matrix = create_matrix(args.width, args.height, args.color_mode)

    with KeyboardInput() as input_handler:
        os = OSContext(matrix, input_handler)
        app = MyApp()
        os.register_app(app)
        os.switch_to_app(app)
        os.run()
```

## System Events

Apps don't need to handle these - OS does:

- **ESC** - Return to launcher
- **Q** - Quit entire OS
- **Ctrl+C** - Emergency exit

## Future Possibilities

With this architecture, we can add:

- **App switching** (Alt+Tab style)
- **System notifications**
- **Status bar**
- **App permissions**
- **Resource limiting**
- **App store/package manager**

The foundation is now in place for a true embedded OS!
