#!/usr/bin/env python3
"""
Settings App - Configure MatrixOS

Settings:
- Display resolution (64×64, 128×128, 256×192)
- Default city for weather
- Demo mode toggle
- System information
"""

import sys
import os
import json

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from matrixos.app_framework import App
from matrixos.input import InputEvent
from matrixos import layout


class SettingsApp(App):
    """Settings configuration UI."""

    def __init__(self):
        super().__init__("Settings")
        
        # Settings menu items
        self.menu_items = [
            "Display Info",
            "Resolution",
            "Demo Mode",
            "About MatrixOS",
        ]
        
        self.selected_index = 0
        self.current_view = "menu"  # "menu", "display_info", "resolution", etc.
        
        # Settings values (would normally be persisted)
        self.settings = {
            "resolution": "128x128",
            "demo_mode": True,
        }
        
        # Resolution options
        self.resolutions = ["64x64", "128x128", "256x192"]
        self.resolution_index = 1  # Default to 128x128

    def get_help_text(self):
        """Return app-specific help."""
        if self.current_view == "menu":
            return [("↑↓", "Select"), ("ENTER", "Open")]
        else:
            return [("BKSP", "Back")]

    def on_event(self, event):
        """Handle input."""
        if self.current_view == "menu":
            return self.handle_menu_input(event)
        elif self.current_view == "display_info":
            if event.key == InputEvent.BACK:
                self.current_view = "menu"
                return True
        elif self.current_view == "resolution":
            return self.handle_resolution_input(event)
        elif self.current_view == "demo_mode":
            return self.handle_demo_mode_input(event)
        elif self.current_view == "about":
            if event.key == InputEvent.BACK:
                self.current_view = "menu"
                return True
        
        return False

    def handle_menu_input(self, event):
        """Handle menu navigation."""
        if event.key == InputEvent.UP:
            self.selected_index = (self.selected_index - 1) % len(self.menu_items)
            return True
        elif event.key == InputEvent.DOWN:
            self.selected_index = (self.selected_index + 1) % len(self.menu_items)
            return True
        elif event.key == InputEvent.OK:
            # Open selected setting
            selected = self.menu_items[self.selected_index]
            if selected == "Display Info":
                self.current_view = "display_info"
            elif selected == "Resolution":
                self.current_view = "resolution"
            elif selected == "Demo Mode":
                self.current_view = "demo_mode"
            elif selected == "About MatrixOS":
                self.current_view = "about"
            return True
        
        return False

    def handle_resolution_input(self, event):
        """Handle resolution selection."""
        if event.key == InputEvent.UP:
            self.resolution_index = (self.resolution_index - 1) % len(self.resolutions)
            self.settings["resolution"] = self.resolutions[self.resolution_index]
            return True
        elif event.key == InputEvent.DOWN:
            self.resolution_index = (self.resolution_index + 1) % len(self.resolutions)
            self.settings["resolution"] = self.resolutions[self.resolution_index]
            return True
        elif event.key == InputEvent.BACK:
            self.current_view = "menu"
            return True
        
        return False

    def handle_demo_mode_input(self, event):
        """Handle demo mode toggle."""
        if event.key == InputEvent.OK or event.key == ' ':
            self.settings["demo_mode"] = not self.settings["demo_mode"]
            return True
        elif event.key == InputEvent.BACK:
            self.current_view = "menu"
            return True
        
        return False

    def render(self, matrix):
        """Draw settings UI."""
        if self.current_view == "menu":
            self.render_menu(matrix)
        elif self.current_view == "display_info":
            self.render_display_info(matrix)
        elif self.current_view == "resolution":
            self.render_resolution(matrix)
        elif self.current_view == "demo_mode":
            self.render_demo_mode(matrix)
        elif self.current_view == "about":
            self.render_about(matrix)

    def render_menu(self, matrix):
        """Draw settings menu."""
        # Title
        matrix.text("SETTINGS", 2, 2, (255, 200, 0))
        
        # Menu items
        layout.menu_list(matrix, self.menu_items, self.selected_index)
        
        # Navigation hint
        matrix.text("^v:NAV ENTER:SELECT", 2, matrix.height - 8, (100, 100, 100))

    def render_display_info(self, matrix):
        """Show display information."""
        width = matrix.width
        height = matrix.height
        
        # Title
        matrix.text("DISPLAY INFO", 2, 2, (255, 200, 0))
        
        y = 16
        line_height = 10
        
        # Display info
        matrix.text(f"Width: {width}px", 4, y, (200, 200, 200))
        y += line_height
        
        matrix.text(f"Height: {height}px", 4, y, (200, 200, 200))
        y += line_height
        
        matrix.text(f"Total: {width * height} pixels", 4, y, (200, 200, 200))
        y += line_height
        
        # Icon size
        icon_size = layout.get_icon_size(matrix)
        matrix.text(f"Icon Size: {icon_size}px", 4, y, (200, 200, 200))
        y += line_height
        
        # Color depth
        matrix.text("Colors: 16.7M (RGB)", 4, y, (200, 200, 200))
        
        # Back hint
        matrix.text("ESC:BACK", 2, height - 8, (100, 100, 100))

    def render_resolution(self, matrix):
        """Show resolution selection."""
        width = matrix.width
        height = matrix.height
        
        # Title
        matrix.text("RESOLUTION", 2, 2, (255, 200, 0))
        
        matrix.text("(Restart required)", 4, 12, (150, 150, 150))
        
        y = 26
        line_height = 12
        
        # Resolution options
        for i, res in enumerate(self.resolutions):
            color = (255, 255, 255) if i == self.resolution_index else (100, 100, 100)
            prefix = "> " if i == self.resolution_index else "  "
            matrix.text(f"{prefix}{res}", 8, y, color)
            y += line_height
        
        # Hint
        matrix.text("^v:SELECT ESC:BACK", 2, height - 8, (100, 100, 100))

    def render_demo_mode(self, matrix):
        """Show demo mode toggle."""
        width = matrix.width
        height = matrix.height
        
        # Title
        matrix.text("DEMO MODE", 2, 2, (255, 200, 0))
        
        y = 20
        
        matrix.text("Use simulated data", 4, y, (150, 150, 150))
        y += 10
        matrix.text("instead of real APIs", 4, y, (150, 150, 150))
        
        y += 20
        
        # Current state
        status = "ENABLED" if self.settings["demo_mode"] else "DISABLED"
        color = (100, 255, 100) if self.settings["demo_mode"] else (255, 100, 100)
        
        matrix.text("Status:", 4, y, (200, 200, 200))
        y += 12
        layout.center_text(matrix, status, y, color)
        
        y += 20
        matrix.text("SPACE/ENTER to toggle", 4, y, (150, 150, 150))
        
        # Back hint
        matrix.text("ESC:BACK", 2, height - 8, (100, 100, 100))

    def render_about(self, matrix):
        """Show about MatrixOS."""
        width = matrix.width
        height = matrix.height
        
        # Title
        matrix.text("MATRIXOS", 2, 2, (255, 200, 0))
        
        y = 16
        line_height = 10
        
        matrix.text("Version 1.0.0", 4, y, (200, 200, 200))
        y += line_height + 2
        
        matrix.text("Event-driven OS", 4, y, (150, 150, 150))
        y += line_height
        
        matrix.text("for LED matrices", 4, y, (150, 150, 150))
        y += line_height + 4
        
        matrix.text("Features:", 4, y, (200, 200, 200))
        y += line_height
        
        features = [
            "* RGB icons (16.7M)",
            "* Async networking",
            "* Background tasks",
            "* Responsive UI",
        ]
        
        for feature in features:
            matrix.text(feature, 4, y, (100, 200, 255))
            y += line_height
        
        # Back hint
        matrix.text("ESC:BACK", 2, height - 8, (100, 100, 100))


def run(os_context):
    """Entry point called by OS."""
    app = SettingsApp()
    os_context.register_app(app)
    os_context.switch_to_app(app)
    os_context.run()


def main():
    """Standalone testing mode."""
    from matrixos.led_api import create_matrix
    from matrixos.input import KeyboardInput
    from matrixos.config import parse_matrix_args
    from matrixos.app_framework import OSContext

    args = parse_matrix_args("Settings App")
    matrix = create_matrix(args.width, args.height, args.color_mode)

    print("\n" + "="*64)
    print("SETTINGS APP - Standalone Mode")
    print("="*64)
    print("\nControls:")
    print("  ↑/↓        - Navigate")
    print("  ENTER      - Select")
    print("  ESC        - Back / Quit")
    print("\n" + "="*64 + "\n")

    with KeyboardInput() as input_handler:
        os = OSContext(matrix, input_handler)
        app = SettingsApp()
        os.register_app(app)
        os.switch_to_app(app)
        os.run()

    print("\nSettings app closed.")


# App instance for launcher
app = SettingsApp()


if __name__ == '__main__':
    main()
