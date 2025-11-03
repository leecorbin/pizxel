#!/usr/bin/env python3
"""
Layout Helpers Demo
Shows how to use layout.py helpers for clean, simple app code
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from matrixos.app_framework import App
from matrixos.input import InputEvent
from matrixos import layout


class LayoutDemoApp(App):
    """Demonstrates layout helpers in action."""

    def __init__(self):
        super().__init__("Layout Demo")
        self.demo_index = 0
        self.demos = [
            "Center Text",
            "Progress Bar",
            "Icon + Text",
            "Menu List",
            "Columns",
        ]
        self.progress = 0.0

    def get_help_text(self):
        return [("↑↓", "Change demo"), ("←→", "Adjust")]

    def on_update(self, delta_time):
        # Animate progress bar
        self.progress = (self.progress + delta_time * 0.2) % 1.0
        if self.demo_index == 1:  # Progress bar demo
            self.dirty = True

    def on_event(self, event):
        if event.key == InputEvent.UP:
            self.demo_index = (self.demo_index - 1) % len(self.demos)
            return True
        elif event.key == InputEvent.DOWN:
            self.demo_index = (self.demo_index + 1) % len(self.demos)
            return True
        return False

    def render(self, matrix):
        demo_name = self.demos[self.demo_index]
        
        # Title
        layout.center_text(matrix, demo_name, y=2, color=(255, 200, 0))
        
        # Demo content
        if self.demo_index == 0:
            # Center text demo
            layout.center_text(matrix, "Horizontal", y=20, color=(255, 255, 255))
            layout.center_text(matrix, "& Vertical!", color=(0, 255, 255))
            
        elif self.demo_index == 1:
            # Progress bar demo
            layout.draw_progress_bar(matrix, 10, 25, matrix.width - 20, 10, 
                                    self.progress, 
                                    fg_color=(0, 255, 100), 
                                    bg_color=(30, 30, 30))
            percent = f"{int(self.progress * 100)}%"
            layout.center_text(matrix, percent, y=40, color=(150, 150, 150))
            
        elif self.demo_index == 2:
            # Icon + text demo
            y = 20
            layout.draw_icon_with_text(matrix, "☼", "Sunny", 10, y,
                                      icon_color=(255, 255, 0),
                                      text_color=(255, 255, 255))
            y += 12
            layout.draw_icon_with_text(matrix, "♥", "Health", 10, y,
                                      icon_color=(255, 0, 0),
                                      text_color=(255, 255, 255))
            y += 12
            layout.draw_icon_with_text(matrix, "►", "Play", 10, y,
                                      icon_color=(0, 255, 0),
                                      text_color=(255, 255, 255))
            
        elif self.demo_index == 3:
            # Menu list demo
            items = ["Item 1", "Item 2", "Item 3", "Item 4", "Item 5"]
            layout.menu_list(matrix, items, 2, y_start=18)
            
        elif self.demo_index == 4:
            # Columns demo
            cols = layout.split_columns(matrix, num_columns=2, padding=4)
            
            # Left column
            x, width = cols[0]
            matrix.text("COL 1", x, 18, (255, 100, 100))
            matrix.text("Data A", x, 28, (200, 200, 200))
            matrix.text("Data B", x, 36, (200, 200, 200))
            
            # Right column
            x, width = cols[1]
            matrix.text("COL 2", x, 18, (100, 100, 255))
            matrix.text("Data C", x, 28, (200, 200, 200))
            matrix.text("Data D", x, 36, (200, 200, 200))


def run(os_context):
    """Entry point for MatrixOS."""
    app = LayoutDemoApp()
    os_context.run_app(app)


if __name__ == "__main__":
    # Standalone test mode
    import sys
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
    from matrixos.display import MatrixDisplay
    from matrixos.input import InputHandler
    from matrixos.app_framework import OSContext
    
    matrix = MatrixDisplay(width=128, height=128)
    input_handler = InputHandler()
    os_context = OSContext(matrix, input_handler)
    
    run(os_context)
