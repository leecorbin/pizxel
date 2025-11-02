#!/usr/bin/env python3
"""
Demos App - Showcase LED matrix capabilities

Demonstrates:
- Text rendering
- Shape drawing
- Color manipulation
- Animations
- Patterns
- Scrolling effects
"""

import sys
import os
import time
import math
import random

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from matrixos.app_framework import App
from matrixos.input import InputEvent
from matrixos import layout  # NEW: Simple layout helpers


class DemosApp(App):
    """Interactive demos showcasing LED matrix features."""

    def __init__(self):
        super().__init__("Demos")

        # Demo list
        self.demos = [
            ("Text", self.demo_text),
            ("Shapes", self.demo_shapes),
            ("Colors", self.demo_colors),
            ("Rainbow", self.demo_rainbow),
            ("Animation", self.demo_animation),
            ("Scroll", self.demo_scroll),
            ("Patterns", self.demo_patterns),
            ("Plasma", self.demo_plasma),
        ]

        self.current_demo = None  # None = showing menu
        self.selected_index = 0
        self.animation_time = 0
        self.scroll_offset = 0
        self.pattern_offset = 0

    def get_help_text(self):
        """Return app-specific help."""
        if self.current_demo is None:
            return [("↑↓", "Select"), ("ENTER", "Run demo")]
        else:
            return [("BKSP", "Menu"), ("SPC", "Next demo")]

    def on_activate(self):
        """App becomes active."""
        self.animation_time = 0
        self.scroll_offset = 0

    def on_update(self, delta_time):
        """Update animations."""
        self.animation_time += delta_time
        
        # If we're in a demo (not menu), mark as dirty for continuous rendering
        if self.current_demo is not None:
            self.dirty = True

    def on_event(self, event):
        """Handle input."""
        if self.current_demo is None:
            # In menu
            if event.key == InputEvent.UP:
                self.selected_index = (self.selected_index - 1) % len(self.demos)
                return True
            elif event.key == InputEvent.DOWN:
                self.selected_index = (self.selected_index + 1) % len(self.demos)
                return True
            elif event.key == InputEvent.OK:
                # Start selected demo
                self.current_demo = self.selected_index
                self.animation_time = 0
                self.scroll_offset = 0
                return True
        else:
            # In a demo
            if event.key == InputEvent.BACK:
                # Return to menu
                self.current_demo = None
                return True
            elif event.key == ' ':
                # Next demo
                self.current_demo = (self.current_demo + 1) % len(self.demos)
                self.animation_time = 0
                self.scroll_offset = 0
                return True

        return False

    def render(self, matrix):
        """Draw the UI."""
        if self.current_demo is None:
            self.render_menu(matrix)
        else:
            # Run the selected demo
            name, demo_func = self.demos[self.current_demo]
            demo_func(matrix)

    def render_menu(self, matrix):
        """Draw the demo selection menu."""
        # Title
        matrix.text("DEMOS", 2, 2, (255, 200, 0))

        # Use the new menu_list helper!
        demo_names = [name for name, _ in self.demos]
        layout.menu_list(matrix, demo_names, self.selected_index)

        # Navigation hint
        matrix.text("^v:NAV ENTER:RUN", 2, matrix.height - 8, (100, 100, 100))

    # =========================================================================
    # DEMO 1: Text Rendering
    # =========================================================================
    def demo_text(self, matrix):
        """Demonstrate text rendering capabilities."""
        width = matrix.width
        height = matrix.height

        # Title
        matrix.text("TEXT DEMO", 2, 2, (255, 200, 0))

        # Centered text
        matrix.centered_text("HELLO", height // 2 - 10, (0, 255, 255))
        matrix.centered_text("WORLD", height // 2, (255, 0, 255))

        # Aligned text
        matrix.text("LEFT", 2, height // 2 + 12, (255, 0, 0))
        right_text = "RIGHT"
        matrix.text(right_text, width - len(right_text) * 6 - 2, height // 2 + 12, (0, 255, 0))

        # Footer
        matrix.centered_text("TEXT RENDERING", height - 8, (100, 100, 100))

    # =========================================================================
    # DEMO 2: Shapes
    # =========================================================================
    def demo_shapes(self, matrix):
        """Demonstrate shape drawing - scales to display size."""
        width = matrix.width
        height = matrix.height
        scale = width / 64  # Scale factor (1.0 for 64×64, 2.0 for 128×128)

        # Title
        matrix.text("SHAPES", 2, 2, (255, 200, 0))

        y_offset = int(14 * scale)

        # Rectangle (scaled)
        rect_x = int(8 * scale)
        rect_w = int(24 * scale)
        rect_h = int(18 * scale)
        matrix.rect(rect_x, y_offset, rect_w, rect_h, (255, 0, 0), fill=False)
        matrix.rect(rect_x + int(4 * scale), y_offset + int(3 * scale), 
                   rect_w - int(8 * scale), rect_h - int(6 * scale), (255, 100, 100), fill=True)

        # Circle (scaled)
        cx = width // 2
        cy = y_offset + rect_h // 2
        matrix.circle(cx, cy, int(10 * scale), (0, 255, 0), fill=False)
        matrix.circle(cx, cy, int(5 * scale), (100, 255, 100), fill=True)

        # Line (scaled)
        x_start = width - int(32 * scale)
        line_len = int(24 * scale)
        matrix.line(x_start, y_offset, x_start + line_len, y_offset + rect_h, (0, 100, 255))
        matrix.line(x_start + line_len, y_offset, x_start, y_offset + rect_h, (0, 200, 255))

        # More shapes below
        y_offset2 = y_offset + rect_h + int(12 * scale)

        # Filled rectangle
        matrix.rect(rect_x, y_offset2, int(18 * scale), int(12 * scale), (255, 255, 0), fill=True)

        # Filled circle
        matrix.circle(cx, y_offset2 + int(6 * scale), int(8 * scale), (255, 0, 255), fill=True)

        # Triangle (using lines) - scaled
        tri_size = int(20 * scale)
        x1, y1 = width - int(28 * scale), y_offset2 + int(12 * scale)
        x2, y2 = width - int(8 * scale), y_offset2 + int(12 * scale)
        x3, y3 = width - int(18 * scale), y_offset2
        matrix.line(x1, y1, x2, y2, (0, 255, 255))
        matrix.line(x2, y2, x3, y3, (0, 255, 255))
        matrix.line(x3, y3, x1, y1, (0, 255, 255))

        matrix.text("RECT CIRCLE LINE", 2, height - 8, (100, 100, 100))

    # =========================================================================
    # DEMO 3: Colors
    # =========================================================================
    def demo_colors(self, matrix):
        """Demonstrate color palette."""
        width = matrix.width
        height = matrix.height

        # Title
        matrix.text("COLORS", 2, 2, (255, 200, 0))

        # RGB bars
        y = 14
        bar_height = 6
        spacing = 2

        # Red gradient
        for x in range(width - 8):
            intensity = int((x / (width - 8)) * 255)
            matrix.line(x + 4, y, x + 4, y + bar_height, (intensity, 0, 0))
        matrix.text("R", 2, y, (255, 100, 100))

        y += bar_height + spacing

        # Green gradient
        for x in range(width - 8):
            intensity = int((x / (width - 8)) * 255)
            matrix.line(x + 4, y, x + 4, y + bar_height, (0, intensity, 0))
        matrix.text("G", 2, y, (100, 255, 100))

        y += bar_height + spacing

        # Blue gradient
        for x in range(width - 8):
            intensity = int((x / (width - 8)) * 255)
            matrix.line(x + 4, y, x + 4, y + bar_height, (0, 0, intensity))
        matrix.text("B", 2, y, (100, 100, 255))

        y += bar_height + spacing + 4

        # Color palette
        colors = [
            (255, 0, 0), (255, 127, 0), (255, 255, 0), (0, 255, 0),
            (0, 255, 255), (0, 0, 255), (127, 0, 255), (255, 0, 255)
        ]

        box_size = 6
        x = 4
        for i, color in enumerate(colors):
            if x + box_size > width - 4:
                break
            matrix.rect(x, y, box_size, box_size, color, fill=True)
            x += box_size + 2

        matrix.text("RGB GRADIENTS", 2, height - 8, (100, 100, 100))

    # =========================================================================
    # DEMO 4: Rainbow
    # =========================================================================
    def demo_rainbow(self, matrix):
        """Animated rainbow effect."""
        width = matrix.width
        height = matrix.height

        # Title
        matrix.text("RAINBOW", 2, 2, (255, 200, 0))

        # Rainbow bars (animated)
        start_y = 14
        bar_height = 3

        for y in range(start_y, height - 10, bar_height):
            # Calculate hue based on position and time
            hue = ((y - start_y) / (height - start_y - 10) + self.animation_time * 0.2) % 1.0
            r, g, b = self.hsv_to_rgb(hue, 1.0, 1.0)
            matrix.rect(4, y, width - 8, bar_height, (r, g, b), fill=True)

        matrix.text("ANIMATED", 2, height - 8, (100, 100, 100))

    # =========================================================================
    # DEMO 5: Animation
    # =========================================================================
    def demo_animation(self, matrix):
        """Demonstrate animation with moving objects - scales to display."""
        width = matrix.width
        height = matrix.height
        scale = width / 64  # Scale factor

        # Title
        matrix.text("ANIMATION", 2, 2, (255, 200, 0))

        center_x = width // 2
        center_y = height // 2

        # Orbiting circles (scaled)
        for i in range(3):
            angle = self.animation_time + (i * 2 * math.pi / 3)
            radius = int((15 + 5 * math.sin(self.animation_time * 2 + i)) * scale)
            x = int(center_x + radius * math.cos(angle))
            y = int(center_y + radius * math.sin(angle))

            colors = [(255, 0, 0), (0, 255, 0), (0, 0, 255)]
            matrix.circle(x, y, int(5 * scale), colors[i], fill=True)

        # Center dot (scaled)
        pulse = int(128 + 127 * math.sin(self.animation_time * 3))
        matrix.circle(center_x, center_y, int(4 * scale), (pulse, pulse, pulse), fill=True)

        matrix.text("ORBITING", 2, height - 8, (100, 100, 100))

    # =========================================================================
    # DEMO 6: Scrolling Text
    # =========================================================================
    def demo_scroll(self, matrix):
        """Scrolling text demo."""
        width = matrix.width
        height = matrix.height

        # Title
        matrix.text("SCROLL", 2, 2, (255, 200, 0))

        # Scrolling text
        text = "HELLO MATRIXOS! THIS IS A SCROLLING TEXT DEMO"

        # Calculate scroll position
        text_width = len(text) * 6
        self.scroll_offset = int(self.animation_time * 30) % (text_width + width)
        x = width - self.scroll_offset

        # Draw scrolling text
        y = height // 2
        matrix.text(text, x, y, (0, 255, 255))

        # Direction indicator
        arrow_x = int(width // 2 + 10 * math.sin(self.animation_time * 3))
        matrix.text("<", arrow_x, y + 12, (100, 100, 100))

        matrix.text("SCROLLING", 2, height - 8, (100, 100, 100))

    # =========================================================================
    # DEMO 7: Patterns
    # =========================================================================
    def demo_patterns(self, matrix):
        """Demonstrate various patterns - scales to display."""
        width = matrix.width
        height = matrix.height
        scale = width / 64  # Scale factor

        # Title
        matrix.text("PATTERNS", 2, 2, (255, 200, 0))

        # Animated checkerboard pattern (scaled)
        start_y = 14
        square_size = max(4, int(8 * scale))  # Larger squares for bigger displays
        offset = int(self.animation_time * 2 * scale) % square_size

        for y in range(start_y, height - 10, square_size):
            for x in range(4, width - 4, square_size):
                # Checkerboard logic with animation offset
                if ((x + y + offset) // square_size) % 2 == 0:
                    hue = (self.animation_time * 0.1 + x * 0.01) % 1.0
                    r, g, b = self.hsv_to_rgb(hue, 0.7, 0.8)
                    matrix.rect(x, y, square_size, square_size, (r, g, b), fill=True)

        matrix.text("CHECKERBOARD", 2, height - 8, (100, 100, 100))

    # =========================================================================
    # DEMO 8: Plasma Effect
    # =========================================================================
    def demo_plasma(self, matrix):
        """Plasma effect using sine waves."""
        width = matrix.width
        height = matrix.height

        # Title
        matrix.text("PLASMA", 2, 2, (255, 200, 0))

        # Plasma effect
        start_y = 14
        end_y = height - 10

        for y in range(start_y, end_y):
            for x in range(4, width - 4):
                # Plasma calculation
                v1 = math.sin((x + self.animation_time * 10) * 0.2)
                v2 = math.sin((y + self.animation_time * 10) * 0.2)
                v3 = math.sin((x + y + self.animation_time * 10) * 0.15)
                v4 = math.sin(math.sqrt((x - width/2)**2 + (y - height/2)**2) * 0.2 + self.animation_time)

                value = (v1 + v2 + v3 + v4) / 4
                hue = (value + 1) / 2  # Normalize to 0-1

                r, g, b = self.hsv_to_rgb(hue, 1.0, 0.8)
                matrix.set_pixel(x, y, (r, g, b))

        matrix.text("SINE WAVES", 2, height - 8, (100, 100, 100))

    # =========================================================================
    # Helper Functions
    # =========================================================================
    def hsv_to_rgb(self, h, s, v):
        """Convert HSV color to RGB (0-255 values)."""
        if s == 0.0:
            r = g = b = int(v * 255)
            return (r, g, b)

        i = int(h * 6.0)
        f = (h * 6.0) - i
        p = v * (1.0 - s)
        q = v * (1.0 - s * f)
        t = v * (1.0 - s * (1.0 - f))
        i = i % 6

        if i == 0:
            r, g, b = v, t, p
        elif i == 1:
            r, g, b = q, v, p
        elif i == 2:
            r, g, b = p, v, t
        elif i == 3:
            r, g, b = p, q, v
        elif i == 4:
            r, g, b = t, p, v
        else:
            r, g, b = v, p, q

        return (int(r * 255), int(g * 255), int(b * 255))


def run(os_context):
    """Entry point called by OS."""
    app = DemosApp()
    os_context.register_app(app)
    os_context.switch_to_app(app)
    os_context.run()


def main():
    """Standalone testing mode."""
    from matrixos.led_api import create_matrix
    from matrixos.input import KeyboardInput
    from matrixos.config import parse_matrix_args
    from matrixos.app_framework import OSContext

    args = parse_matrix_args("Demos App")
    matrix = create_matrix(args.width, args.height, args.color_mode)

    print("\n" + "="*64)
    print("DEMOS APP - Standalone Mode")
    print("="*64)
    print("\nControls:")
    print("  ↑/↓        - Select demo")
    print("  ENTER      - Run demo")
    print("  SPC        - Next demo")
    print("  ESC        - Back to menu / Quit")
    print("\n" + "="*64 + "\n")

    with KeyboardInput() as input_handler:
        os = OSContext(matrix, input_handler)
        app = DemosApp()
        os.register_app(app)
        os.switch_to_app(app)
        os.run()

    print("\nDemos app closed.")


if __name__ == '__main__':
    main()
