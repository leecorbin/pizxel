"""
Terminal Display Driver

Cross-platform display driver that renders to terminal using ANSI escape codes.
Uses the existing Display and TerminalRenderer classes.
"""

import sys
from typing import Tuple
from ..base import DisplayDriver
from ...display import Display, TerminalRenderer


class TerminalDisplayDriver(DisplayDriver):
    """Display driver for terminal output using ANSI escape codes"""
    
    def __init__(self, width: int, height: int, **kwargs):
        super().__init__(width, height)
        self.name = "Terminal Display"
        self.display = None
        self.renderer = None
        # Terminal driver ignores scale and pixel_gap settings
    
    def initialize(self) -> bool:
        """Initialize the terminal display"""
        try:
            self.display = Display(self.width, self.height, color_mode='rgb')
            self.renderer = TerminalRenderer(self.display)
            return True
        except Exception as e:
            print(f"[TerminalDisplay] Initialization failed: {e}")
            return False
    
    def set_pixel(self, x: int, y: int, color: Tuple[int, int, int]):
        """Set a single pixel"""
        if self.display:
            self.display.set_pixel(x, y, color)
    
    def get_pixel(self, x: int, y: int) -> Tuple[int, int, int]:
        """Get pixel color"""
        if self.display:
            return self.display.get_pixel(x, y)
        return (0, 0, 0)
    
    def clear(self):
        """Clear the display"""
        if self.display:
            self.display.clear()
    
    def fill(self, color=(0, 0, 0)):
        """Fill display with color"""
        if self.display:
            self.display.fill(color)
    
    def show(self):
        """Push buffer to terminal"""
        if self.renderer:
            self.renderer.display_in_terminal(
                use_half_blocks=True,
                clear_screen=True
            )
    
    def cleanup(self):
        """Cleanup terminal state"""
        # Clear screen and reset cursor
        print('\033[2J\033[H\033[0m', end='')
        sys.stdout.flush()
    
    @classmethod
    def is_available(cls) -> bool:
        """Terminal is always available"""
        return True
    
    @classmethod
    def get_priority(cls) -> int:
        """Low priority - used as fallback"""
        return 10
    
    @classmethod
    def get_platform_preference(cls) -> str:
        """Works on all platforms"""
        return None
