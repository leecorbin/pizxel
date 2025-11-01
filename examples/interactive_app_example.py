#!/usr/bin/env python3
"""
Interactive App Example
Shows how to build Matrix OS apps with input and output.

This is a simple drawing app:
- Arrow keys to move cursor
- SPACE to toggle pixel
- C to clear
- Q/ESC to quit
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.led_api import create_matrix
from src.input import KeyboardInput, InputEvent


class DrawingApp:
    """Simple pixel drawing application."""

    def __init__(self, matrix, input_handler):
        """
        Initialize the drawing app.

        Args:
            matrix: LED matrix instance
            input_handler: Input handler instance
        """
        self.matrix = matrix
        self.input = input_handler
        self.cursor_x = matrix.width // 2
        self.cursor_y = matrix.height // 2
        self.running = True

    def render(self):
        """Render the app UI."""
        # Draw cursor (blinking square)
        import time
        blink = int(time.time() * 2) % 2 == 0

        # Save current pixel state
        current_pixel = self.matrix.get_pixel(self.cursor_x, self.cursor_y)

        # Draw cursor
        if blink:
            # Cursor color
            cursor_color = (255, 255, 0)
            # Draw 2x2 cursor
            for dx in range(2):
                for dy in range(2):
                    cx = min(self.cursor_x + dx, self.matrix.width - 1)
                    cy = min(self.cursor_y + dy, self.matrix.height - 1)
                    self.matrix.set_pixel(cx, cy, cursor_color)

        # Instructions at bottom
        y = self.matrix.height - 7
        self.matrix.rect(0, y - 1, self.matrix.width, 8, (0, 0, 0), fill=True)
        self.matrix.text("SPC C Q", 2, y, (255, 255, 255), (50, 50, 50))

        self.matrix.show()

    def handle_input(self, event):
        """Handle input event."""
        if event.key == InputEvent.UP:
            self.cursor_y = max(0, self.cursor_y - 1)
        elif event.key == InputEvent.DOWN:
            self.cursor_y = min(self.matrix.height - 2, self.cursor_y + 1)
        elif event.key == InputEvent.LEFT:
            self.cursor_x = max(0, self.cursor_x - 1)
        elif event.key == InputEvent.RIGHT:
            self.cursor_x = min(self.matrix.width - 2, self.cursor_x + 1)
        elif event.key == ' ':  # Space to toggle pixel
            current = self.matrix.get_pixel(self.cursor_x, self.cursor_y)
            if current == (0, 0, 0) or current == False:
                self.matrix.set_pixel(self.cursor_x, self.cursor_y, (0, 255, 0))
            else:
                self.matrix.set_pixel(self.cursor_x, self.cursor_y, (0, 0, 0))
        elif event.key.lower() == 'c':  # Clear
            self.matrix.clear()
        elif event.key in [InputEvent.QUIT, InputEvent.BACK]:
            self.running = False

    def run(self):
        """Run the application main loop."""
        self.matrix.clear()

        # Show title
        self.matrix.centered_text("DRAW", 10, (0, 255, 255))
        self.matrix.centered_text("APP", 20, (0, 255, 255))
        self.matrix.centered_text("READY", 35, (255, 255, 0))
        self.matrix.show()

        import time
        time.sleep(1.5)

        self.matrix.clear()

        # Main loop
        while self.running:
            self.render()

            # Get input (with small timeout for cursor blink)
            event = self.input.get_key(timeout=0.2)
            if event:
                self.handle_input(event)


def main():
    """Run the drawing app."""
    print("\n" + "="*64)
    print("MATRIX OS - DRAWING APP EXAMPLE")
    print("="*64)
    print("\nControls:")
    print("  Arrow Keys  - Move cursor")
    print("  SPACE       - Toggle pixel on/off")
    print("  C           - Clear screen")
    print("  Q/ESC       - Quit")
    print("\n" + "="*64 + "\n")

    # Create matrix and input
    matrix = create_matrix(64, 64, 'rgb')

    with KeyboardInput() as input_handler:
        app = DrawingApp(matrix, input_handler)
        app.run()

    print("\n" + "="*64)
    print("Thanks for drawing!")
    print("="*64 + "\n")


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nInterrupted.")
    except Exception as e:
        print(f"\n\nError: {e}")
        import traceback
        traceback.print_exc()
