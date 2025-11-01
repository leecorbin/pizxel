"""
LED Matrix Display Emulator
Provides a framebuffer for LED matrix displays with terminal rendering.
"""

import os
from typing import Tuple, Optional


class Display:
    """
    Represents an LED matrix display with a pixel buffer.

    Coordinates are (x, y) where (0, 0) is top-left.
    Pixels are stored as RGB tuples or can be monochrome.
    """

    def __init__(self, width: int, height: int, color_mode: str = 'mono'):
        """
        Initialize the display.

        Args:
            width: Display width in pixels
            height: Display height in pixels
            color_mode: 'mono' for monochrome (on/off), 'rgb' for RGB color
        """
        self.width = width
        self.height = height
        self.color_mode = color_mode

        # Initialize framebuffer
        if color_mode == 'mono':
            # Boolean array: True = on, False = off
            self.buffer = [[False for _ in range(width)] for _ in range(height)]
        elif color_mode == 'rgb':
            # RGB tuples: (r, g, b) each 0-255
            self.buffer = [[(0, 0, 0) for _ in range(width)] for _ in range(height)]
        else:
            raise ValueError(f"Unknown color_mode: {color_mode}")

    def clear(self):
        """Clear the entire display (turn all pixels off)."""
        if self.color_mode == 'mono':
            self.buffer = [[False for _ in range(self.width)] for _ in range(self.height)]
        else:
            self.buffer = [[(0, 0, 0) for _ in range(self.width)] for _ in range(self.height)]

    def set_pixel(self, x: int, y: int, value=True):
        """
        Set a pixel to the given value.

        Args:
            x: X coordinate (0 to width-1)
            y: Y coordinate (0 to height-1)
            value: For mono: True/False. For RGB: (r, g, b) tuple
        """
        if 0 <= x < self.width and 0 <= y < self.height:
            self.buffer[y][x] = value

    def get_pixel(self, x: int, y: int):
        """Get the value of a pixel at the given coordinates."""
        if 0 <= x < self.width and 0 <= y < self.height:
            return self.buffer[y][x]
        return False if self.color_mode == 'mono' else (0, 0, 0)

    def fill(self, value=True):
        """Fill the entire display with the given value."""
        for y in range(self.height):
            for x in range(self.width):
                self.buffer[y][x] = value


class TerminalRenderer:
    """
    Renders a Display to the terminal using Unicode block characters.

    Uses half-block characters (▀ ▄) to pack 2 vertical pixels per character,
    making the display more compact and readable in the terminal.
    """

    # ANSI color codes
    RESET = '\033[0m'

    def __init__(self, display: Display, pixel_char: str = '█', off_char: str = ' ', ascii_mode: bool = False):
        """
        Initialize the renderer.

        Args:
            display: The Display instance to render
            pixel_char: Character to use for "on" pixels in mono mode
            off_char: Character to use for "off" pixels
            ascii_mode: If True, use ASCII characters instead of Unicode blocks
        """
        self.display = display
        self.ascii_mode = ascii_mode

        if ascii_mode:
            self.pixel_char = '#'
            self.off_char = ' '
            self.upper_half_char = '^'
            self.lower_half_char = '_'
        else:
            self.pixel_char = pixel_char
            self.off_char = off_char
            self.upper_half_char = '▀'
            self.lower_half_char = '▄'

    @staticmethod
    def rgb_to_ansi(r: int, g: int, b: int, background: bool = False) -> str:
        """Convert RGB values to ANSI 256-color escape code."""
        # Simple conversion to 256-color palette
        # Using the 216-color cube (16-231)
        r_idx = int(r / 255 * 5)
        g_idx = int(g / 255 * 5)
        b_idx = int(b / 255 * 5)
        color_code = 16 + 36 * r_idx + 6 * g_idx + b_idx

        prefix = '48' if background else '38'
        return f'\033[{prefix};5;{color_code}m'

    def render(self, use_half_blocks: bool = True) -> str:
        """
        Render the display to a string suitable for terminal output.

        Args:
            use_half_blocks: If True, use ▀/▄ to pack 2 vertical pixels per char.
                           If False, use one character per pixel.

        Returns:
            String with ANSI escape codes for terminal display
        """
        output = []

        if not use_half_blocks:
            # Simple mode: one character per pixel
            for y in range(self.display.height):
                line = []
                for x in range(self.display.width):
                    pixel = self.display.buffer[y][x]

                    if self.display.color_mode == 'mono':
                        line.append(self.pixel_char if pixel else self.off_char)
                    else:  # RGB
                        r, g, b = pixel
                        if r == 0 and g == 0 and b == 0:
                            line.append(self.off_char)
                        else:
                            color = self.rgb_to_ansi(r, g, b)
                            line.append(f'{color}{self.pixel_char}{self.RESET}')

                output.append(''.join(line))
        else:
            # Half-block mode: pack 2 vertical pixels per character
            # Process pairs of rows
            for y in range(0, self.display.height, 2):
                line = []
                for x in range(self.display.width):
                    top_pixel = self.display.buffer[y][x]
                    bottom_pixel = self.display.buffer[y + 1][x] if y + 1 < self.display.height else (False if self.display.color_mode == 'mono' else (0, 0, 0))

                    if self.display.color_mode == 'mono':
                        # Determine which character to use
                        if top_pixel and bottom_pixel:
                            line.append(self.pixel_char)  # Full block
                        elif top_pixel and not bottom_pixel:
                            line.append(self.upper_half_char)  # Upper half
                        elif not top_pixel and bottom_pixel:
                            line.append(self.lower_half_char)  # Lower half
                        else:
                            line.append(self.off_char)  # Empty
                    else:  # RGB mode
                        r1, g1, b1 = top_pixel
                        r2, g2, b2 = bottom_pixel

                        top_on = not (r1 == 0 and g1 == 0 and b1 == 0)
                        bottom_on = not (r2 == 0 and g2 == 0 and b2 == 0)

                        if top_on and bottom_on:
                            # Both on - use foreground color for top, background for bottom
                            fg = self.rgb_to_ansi(r1, g1, b1, False)
                            bg = self.rgb_to_ansi(r2, g2, b2, True)
                            line.append(f'{fg}{bg}{self.upper_half_char}{self.RESET}')
                        elif top_on:
                            # Only top on
                            fg = self.rgb_to_ansi(r1, g1, b1, False)
                            line.append(f'{fg}{self.upper_half_char}{self.RESET}')
                        elif bottom_on:
                            # Only bottom on
                            fg = self.rgb_to_ansi(r2, g2, b2, False)
                            line.append(f'{fg}{self.lower_half_char}{self.RESET}')
                        else:
                            # Both off
                            line.append(self.off_char)

                output.append(''.join(line))

        return '\n'.join(output)

    def display_in_terminal(self, use_half_blocks: bool = True, clear_screen: bool = True):
        """
        Display the current framebuffer in the terminal.

        Args:
            use_half_blocks: Use half-block characters for compact display
            clear_screen: Clear terminal before rendering
        """
        if clear_screen:
            # Clear terminal and move cursor to home
            print('\033[2J\033[H', end='')

        print(self.render(use_half_blocks))
