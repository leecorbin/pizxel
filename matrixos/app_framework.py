#!/usr/bin/env python3
"""
MatrixOS App Framework
Provides OS-level app lifecycle management, event handling, and multitasking.
"""

import time
from matrixos import async_tasks
from matrixos.input import InputEvent


class App:
    """Base class for MatrixOS applications.

    Apps don't manage their own event loops - the OS does that.
    Instead, apps implement lifecycle methods that the OS calls.
    """

    def __init__(self, name="App"):
        self.name = name
        self.os = None  # Set by OS when registered
        self.active = False
        self.dirty = True  # Needs redraw?
        self.needs_keyboard = False  # Request on-screen keyboard

    def get_help_text(self):
        """Return list of (key, description) tuples for app-specific controls.

        Override this method to provide custom help for your app.
        Returns:
            List of tuples: [("R", "Refresh data"), ("C", "Clear screen"), ...]
        """
        return []

    def on_activate(self):
        """Called when app becomes the foreground app.

        Use this to initialize UI, start animations, etc.
        """
        self.dirty = True  # Always redraw on activation

    def on_deactivate(self):
        """Called when app goes to background.

        Use this to save state, pause animations, etc.
        """
        pass

    def on_update(self, delta_time):
        """Called every frame when app is active (~60fps).

        Args:
            delta_time: Time since last frame in seconds

        Use this for animations, game logic, etc.
        Keep this fast - return quickly!
        """
        pass

    def on_background_tick(self):
        """Called periodically when app is in background (~1 second).

        Use this for background tasks like:
        - Checking timers
        - Fetching data
        - Monitoring for alerts

        Keep this VERY fast - other apps are waiting!
        """
        pass

    def on_event(self, event):
        """Handle input event when app is active.

        Args:
            event: InputEvent instance

        Returns:
            True if event was handled, False otherwise
        """
        # Mark dirty when event happens (likely changes UI)
        self.dirty = True
        return False

    def render(self, matrix):
        """Draw the app's UI to the matrix.

        Args:
            matrix: The LED matrix to draw on

        Called by OS after on_update(). Draw your UI here.
        Don't call matrix.show() - OS does that!
        """
        self.dirty = False  # Clear dirty flag after render

    def request_attention(self, priority='normal'):
        """Request OS to bring this app to foreground.

        Args:
            priority: 'low', 'normal', or 'high'

        Use this when a background app needs to show something urgent:
        - Timer/alarm finished
        - New notification received
        - Important data arrived
        """
        if self.os:
            self.os.request_app_switch(self, priority)


class OSContext:
    """The MatrixOS runtime - manages apps, events, and multitasking."""

    def __init__(self, matrix, input_handler):
        """Initialize the OS.

        Args:
            matrix: LED matrix instance
            input_handler: KeyboardInput instance
        """
        self.matrix = matrix
        self.input = input_handler
        self.active_app = None
        self.apps = []  # All registered apps
        self.launcher = None  # Special launcher app
        self.running = True
        self.attention_queue = []  # Apps requesting attention
        self.showing_help = False  # Help overlay visible?
        self.help_scroll = 0  # Help scroll position

    def register_app(self, app):
        """Register an app with the OS.

        Args:
            app: App instance
        """
        app.os = self
        self.apps.append(app)

    def set_launcher(self, launcher):
        """Set the launcher app (shown when user presses BACK).

        Args:
            launcher: App instance to use as launcher
        """
        self.launcher = launcher
        self.register_app(launcher)

    def switch_to_app(self, app):
        """Switch to a different app.

        Args:
            app: App instance to activate
        """
        if self.active_app == app:
            return

        # Deactivate current app
        if self.active_app:
            self.active_app.active = False
            self.active_app.on_deactivate()

        # Activate new app
        self.active_app = app
        app.active = True
        app.on_activate()

        # Clear screen for new app
        self.matrix.clear()

    def return_to_launcher(self):
        """Return to the launcher app."""
        if self.launcher:
            self.switch_to_app(self.launcher)

    def request_app_switch(self, app, priority='normal'):
        """Background app requests to become active.

        Args:
            app: App requesting attention
            priority: 'low', 'normal', or 'high'
        """
        priority_value = {'low': 0, 'normal': 1, 'high': 2}.get(priority, 1)
        self.attention_queue.append((priority_value, app))
        # Sort by priority (high first)
        self.attention_queue.sort(key=lambda x: x[0], reverse=True)

    def render_help_overlay(self):
        """Render help overlay showing available controls."""
        # Draw semi-transparent background (fill with dark color)
        self.matrix.fill((20, 20, 40))

        # Title
        self.matrix.centered_text("HELP", 4, (255, 255, 0))

        # Build all help items first
        help_items = []

        # App-specific controls first
        if self.active_app:
            app_help = self.active_app.get_help_text()
            if app_help:
                help_items.append(("APP KEYS:", "", True))  # Section header
                for key, description in app_help:
                    help_items.append((key[:4].upper(), description[:10].upper(), False))

        # Universal controls
        help_items.append(("", "", True))  # Spacing
        help_items.append(("UNIVERSAL:", "", True))  # Section header
        help_items.append(("ESC", "EXIT APP", False))
        help_items.append(("BKSP", "GO BACK", False))
        help_items.append(("Q", "QUIT OS", False))
        help_items.append(("TAB", "THIS HELP", False))

        # Calculate visible range based on scroll
        start_y = 14
        line_height = 8
        visible_lines = (self.matrix.height - start_y - 16) // line_height
        start_index = self.help_scroll
        end_index = min(start_index + visible_lines, len(help_items))

        # Render visible items
        y = start_y
        for i in range(start_index, end_index):
            key, desc, is_header = help_items[i]

            if is_header:
                if key:  # Section header with text
                    self.matrix.text(key, 4, y, (0, 255, 255))
                # Empty headers are just spacing
            else:
                self.matrix.text(key, 6, y, (255, 255, 255))
                if desc:
                    self.matrix.text(desc, 28, y, (150, 150, 150))

            y += line_height

        # Scroll indicators
        if start_index > 0:
            # Can scroll up
            self.matrix.centered_text("^", start_y - 6, (255, 255, 0))
        if end_index < len(help_items):
            # Can scroll down
            self.matrix.centered_text("v", self.matrix.height - 14, (255, 255, 0))

        # Footer
        self.matrix.centered_text("TAB/BKSP TO CLOSE", self.matrix.height - 8, (100, 100, 100))

    def run(self):
        """Main OS event loop.

        This is the heart of the OS - manages all apps and events.
        Returns when user quits the OS.
        """
        # Reset running flag (in case we're re-entering after a previous run)
        self.running = True
        
        # Start async task manager
        async_tasks.get_task_manager().start()

        last_time = time.time()
        last_background_tick = time.time()
        frame_time = 1.0 / 60.0  # Target 60fps

        while self.running:
            frame_start = time.time()
            current_time = frame_start
            delta_time = current_time - last_time
            last_time = current_time
            
            # Process completed async tasks (invoke callbacks on main thread)
            async_tasks.process_completed_tasks()

            # Handle system-level input events
            event = self.input.get_key(timeout=0.001)
            if event:
                if event.key == 'QUIT':  # Q = quit entire OS
                    self.running = False
                    continue
                elif event.key == 'HELP':  # TAB = toggle help
                    self.showing_help = not self.showing_help
                    if not self.showing_help:
                        self.help_scroll = 0
                    # Mark active app as needing redraw
                    if self.active_app:
                        self.active_app.dirty = True
                elif self.showing_help:
                    # Handle scrolling in help screen
                    if event.key == 'UP':
                        self.help_scroll = max(0, self.help_scroll - 1)
                        if self.active_app:
                            self.active_app.dirty = True
                    elif event.key == 'DOWN':
                        # Calculate max scroll based on help content
                        app_help_count = len(self.active_app.get_help_text()) if self.active_app else 0
                        total_items = app_help_count + 6  # App items + spacing + universal (6 items)
                        visible_lines = (self.matrix.height - 14 - 16) // 8
                        max_scroll = max(0, total_items - visible_lines)
                        self.help_scroll = min(max_scroll, self.help_scroll + 1)
                        if self.active_app:
                            self.active_app.dirty = True
                    elif event.key == InputEvent.BACK:
                        # Close help
                        self.showing_help = False
                        self.help_scroll = 0
                        if self.active_app:
                            self.active_app.dirty = True
                else:
                    # HOME always returns to launcher (like iOS home button) - check FIRST
                    if event.key == InputEvent.HOME:
                        if self.launcher:
                            self.switch_to_app(self.launcher)
                        else:
                            # No launcher registered, just exit the OS loop
                            self.running = False
                            continue
                    
                    # Give event to active app
                    handled = False
                    if self.active_app:
                        # DEBUG: Print what event the app is receiving
                        if event.key in ['c', 'C', 'r', 'R']:
                            print(f"[DEBUG] App {self.active_app.name} receiving event: {event.key}")
                        handled = self.active_app.on_event(event)
                        if event.key in ['c', 'C', 'r', 'R']:
                            print(f"[DEBUG] App handled={handled}, needs_keyboard={getattr(self.active_app, 'needs_keyboard', False)}")
                    
                    # If app didn't handle BACK, let it bubble up (exit to launcher)
                    if not handled and event.key == InputEvent.BACK:
                        if self.launcher:
                            self.switch_to_app(self.launcher)
                        else:
                            # No launcher registered, just exit the OS loop
                            self.running = False
                            continue

            # Handle attention requests (background apps wanting screen)
            if self.attention_queue:
                priority, app = self.attention_queue.pop(0)
                self.switch_to_app(app)
            
            # Handle keyboard requests (apps needing text input)
            if self.active_app and getattr(self.active_app, 'needs_keyboard', False):
                # Clear needs_keyboard flag immediately
                self.active_app.needs_keyboard = False
                
                if hasattr(self.active_app, 'handle_city_input'):
                    # Weather app special handling (blocking keyboard)
                    self.active_app.handle_city_input(self.matrix, self.input)
                    self.active_app.dirty = True
                elif hasattr(self.active_app, 'handle_keyboard_input'):
                    # Generic keyboard handling (blocking)
                    self.active_app.handle_keyboard_input(self.matrix, self.input)
                    self.active_app.dirty = True

            # Update active app
            if self.active_app:
                self.active_app.on_update(delta_time)

                # Only render if something changed (dirty flag)
                if self.active_app.dirty:
                    self.matrix.clear()
                    if self.showing_help:
                        # Show help overlay
                        self.render_help_overlay()
                    else:
                        # Show normal app UI
                        self.active_app.render(self.matrix)
                    self.matrix.show()

            # Background tasks (~1 per second)
            if current_time - last_background_tick >= 1.0:
                for app in self.apps:
                    if app != self.active_app:
                        app.on_background_tick()
                last_background_tick = current_time

            # Frame rate limiting
            frame_elapsed = time.time() - frame_start
            sleep_time = max(0, frame_time - frame_elapsed)
            if sleep_time > 0:
                time.sleep(sleep_time)
        
        # Clean up async tasks when exiting
        async_tasks.get_task_manager().stop()
