"""
High-level API for LED matrix display.
Simple interface for drawing graphics and text.
"""

from src.display import Display, TerminalRenderer
from src.graphics import *
from src.font import Font, default_font
from typing import Tuple, Union, Optional


# Type alias for color
Color = Union[bool, Tuple[int, int, int]]


class LEDMatrix:
    """
    High-level interface for LED matrix display.
    Provides simple functions for graphics and text.
    """

    def __init__(self, width: int = 64, height: int = 64, color_mode: str = 'rgb'):
        """
        Initialize LED matrix.

        Args:
            width: Display width in pixels
            height: Display height in pixels
            color_mode: 'mono' or 'rgb'
        """
        self.display = Display(width, height, color_mode)
        self.font = default_font
        self.width = width
        self.height = height
        self.color_mode = color_mode

    def clear(self):
        """Clear the display."""
        self.display.clear()

    def fill(self, color: Color = True):
        """Fill display with color."""
        self.display.fill(color)

    def set_pixel(self, x: int, y: int, color: Color = True):
        """Set a single pixel."""
        self.display.set_pixel(x, y, color)

    def get_pixel(self, x: int, y: int):
        """Get pixel value at position."""
        return self.display.get_pixel(x, y)

    # Graphics primitives

    def line(self, x0: int, y0: int, x1: int, y1: int, color: Color = True):
        """Draw a line."""
        draw_line(self.display, x0, y0, x1, y1, color)

    def rect(self, x: int, y: int, width: int, height: int,
             color: Color = True, fill: bool = False):
        """Draw a rectangle."""
        draw_rect(self.display, x, y, width, height, color, fill)

    def rounded_rect(self, x: int, y: int, width: int, height: int,
                     radius: int, color: Color = True, fill: bool = False):
        """Draw a rounded rectangle."""
        draw_rounded_rect(self.display, x, y, width, height, radius, color, fill)

    def circle(self, cx: int, cy: int, radius: int,
               color: Color = True, fill: bool = False):
        """Draw a circle."""
        draw_circle(self.display, cx, cy, radius, color, fill)

    def circle_outline(self, cx: int, cy: int, radius: int,
                       color: Color = True, outline_color: Optional[Color] = None,
                       thickness: int = 1):
        """Draw a circle with colored outline."""
        draw_circle_outline(self.display, cx, cy, radius, color, outline_color, thickness)

    def ellipse(self, cx: int, cy: int, rx: int, ry: int,
                color: Color = True, fill: bool = False):
        """Draw an ellipse."""
        draw_ellipse(self.display, cx, cy, rx, ry, color, fill)

    def triangle(self, x0: int, y0: int, x1: int, y1: int, x2: int, y2: int,
                 color: Color = True, fill: bool = False):
        """Draw a triangle."""
        draw_triangle(self.display, x0, y0, x1, y1, x2, y2, color, fill)

    def polygon(self, points: list, color: Color = True, fill: bool = False):
        """Draw a polygon from list of (x,y) points."""
        draw_polygon(self.display, points, color, fill)

    def star(self, cx: int, cy: int, radius: int, points: int = 5,
             color: Color = True, fill: bool = False):
        """Draw a star shape."""
        draw_star(self.display, cx, cy, radius, points, color, fill)

    def flood_fill(self, x: int, y: int, color: Color):
        """Flood fill from point."""
        flood_fill(self.display, x, y, color)

    # Text functions

    def text(self, text: str, x: int, y: int,
             color: Color = True, bg_color: Optional[Color] = None, spacing: int = 0):
        """
        Draw text at pixel position.

        Args:
            text: Text string
            x, y: Top-left pixel position
            color: Text color
            bg_color: Background color (None = transparent)
            spacing: Extra spacing between characters
        """
        self.font.draw_text(self.display, text, x, y, color, bg_color, spacing)

    def text_grid(self, text: str, col: int, row: int,
                  color: Color = True, bg_color: Optional[Color] = None):
        """
        Draw text at character grid position.

        For 64x64 display, grid is 8x8 characters.
        Col and row are 0-7.

        Args:
            text: Text string
            col, row: Character grid position
            color: Text color
            bg_color: Background color (None = transparent)
        """
        self.font.draw_text_grid(self.display, text, col, row, color, bg_color)

    def text_buffer(self, lines: list,
                    color: Color = True, bg_color: Optional[Color] = None):
        """
        Fill display with text like ZX-81 text mode.

        Args:
            lines: List of text strings, one per row
            color: Text color
            bg_color: Background color (None = transparent)
        """
        self.font.fill_text_buffer(self.display, lines, color, bg_color)

    def char(self, char: str, x: int, y: int,
             color: Color = True, bg_color: Optional[Color] = None):
        """
        Draw a single character at pixel position.

        Args:
            char: Character to draw
            x, y: Top-left pixel position
            color: Text color
            bg_color: Background color (None = transparent)
        """
        self.font.draw_char(self.display, char, x, y, color, bg_color)

    def register_char(self, char: str, bitmap: list):
        """
        Register a custom character or icon.

        Args:
            char: Character identifier (single char or string)
            bitmap: List of 8 integers (0-255), each row of 8 pixels
                   Each bit represents a pixel (MSB = leftmost)

        Example:
            # Create a heart icon
            heart = [
                0b00000000,
                0b01100110,
                0b11111111,
                0b11111111,
                0b01111110,
                0b00111100,
                0b00011000,
                0b00000000,
            ]
            matrix.register_char('♥', heart)
        """
        self.font.register_char(char, bitmap)

    def draw_char(self, char: str, x: int, y: int,
                  color: Color = True, bg_color: Optional[Color] = None):
        """Alias for char() method."""
        self.char(char, x, y, color, bg_color)

    # Display output

    def show(self, renderer=None, clear_screen: bool = True):
        """
        Display the framebuffer.

        Args:
            renderer: Renderer to use (default: create TerminalRenderer)
            clear_screen: Clear screen before rendering
        """
        if renderer is None:
            renderer = TerminalRenderer(self.display)

        renderer.display_in_terminal(clear_screen=clear_screen)

    def get_display(self):
        """Get underlying Display object (for advanced use)."""
        return self.display

    def get_font(self):
        """Get Font object (for advanced use)."""
        return self.font

    # Convenience methods for common tasks

    def border(self, color: Color = True, thickness: int = 1):
        """Draw a border around the display."""
        for t in range(thickness):
            self.rect(t, t, self.width - 2*t, self.height - 2*t, color, fill=False)

    def centered_text(self, text: str, y: int,
                     color: Color = True, bg_color: Optional[Color] = None):
        """Draw text centered horizontally at given y position."""
        text_width = len(text) * 8
        x = (self.width - text_width) // 2
        self.text(text, x, y, color, bg_color)

    def grid_lines(self, spacing: int = 8, color: Color = (50, 50, 50)):
        """Draw a grid (useful for debugging positioning)."""
        for x in range(0, self.width, spacing):
            self.line(x, 0, x, self.height - 1, color)
        for y in range(0, self.height, spacing):
            self.line(0, y, self.width - 1, y, color)


# Convenience function to create a matrix
def create_matrix(width: int = 64, height: int = 64, color_mode: str = 'rgb') -> LEDMatrix:
    """
    Create an LED matrix.

    Args:
        width: Display width (default 64)
        height: Display height (default 64)
        color_mode: 'mono' or 'rgb' (default 'rgb')

    Returns:
        LEDMatrix instance
    """
    return LEDMatrix(width, height, color_mode)
