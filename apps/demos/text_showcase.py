#!/usr/bin/env python3
"""
Text Showcase - Demonstrates ZX Spectrum font and text rendering
"""

import sys
import os
import time

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from matrixos.led_api import create_matrix
from matrixos.config import parse_matrix_args
from matrixos.layout import LayoutHelper


def demo_basic_text(matrix):
    """Show basic text rendering."""
    print("Basic Text Rendering")
    matrix.clear()

    # Pixel-positioned text
    matrix.text("HELLO", 0, 0, (255, 255, 255))
    matrix.text("WORLD", 0, 10, (255, 255, 0))

    # Different colors
    matrix.text("RGB", 0, 22, (255, 0, 0))
    matrix.text("RGB", 24, 22, (0, 255, 0))
    matrix.text("RGB", 0, 32, (0, 0, 255))

    # Centered text
    matrix.centered_text("CENTER", 45, (255, 128, 255))

    matrix.show()
    time.sleep(2)


def demo_text_grid(matrix):
    """Show grid-based text mode."""
    print("Text Grid Mode (8x8 Characters)")
    matrix.clear()

    # Text in 8x8 character grid
    # For 64x64 display, we have 8x8 characters
    matrix.text_grid("ZX-81", 1, 0, (0, 255, 255))
    matrix.text_grid("STYLE", 1, 1, (0, 255, 255))

    matrix.text_grid("64x64", 1, 3, (255, 255, 0))
    matrix.text_grid("= 8x8", 1, 4, (255, 255, 0))
    matrix.text_grid("CHARS", 1, 5, (255, 255, 0))

    # Draw grid to show character cells
    matrix.grid_lines(8, (50, 50, 50))

    matrix.show()
    time.sleep(2)


def demo_text_buffer(matrix):
    """Show ZX-81 style text buffer mode."""
    print("Text Buffer Mode (Like ZX-81)")
    matrix.clear()

    # Fill screen with text like ZX-81
    lines = [
        " READY. ",
        "        ",
        "  LED   ",
        " MATRIX ",
        "        ",
        " ZX-81  ",
        " STYLE! ",
        "        ",
    ]

    matrix.text_buffer(lines, (0, 255, 0), (0, 50, 0))

    matrix.show()
    time.sleep(2)


def demo_font_showcase(matrix):
    """Show all characters in the font."""
    print("Font Character Set")
    matrix.clear()

    # Show different character ranges
    chars = "ABCDEFGH"
    matrix.text(chars, 0, 0, (255, 255, 255))

    chars = "abcdefgh"
    matrix.text(chars, 0, 10, (200, 200, 200))

    chars = "01234567"
    matrix.text(chars, 0, 20, (255, 255, 0))

    chars = "!@#$%^&*"
    matrix.text(chars, 0, 30, (255, 128, 0))

    chars = "()[]{}:;"
    matrix.text(chars, 0, 40, (0, 255, 255))

    chars = "<>=+-*/?"
    matrix.text(chars, 0, 50, (255, 0, 255))

    matrix.show()
    time.sleep(2)


def demo_custom_icons(matrix):
    """Show custom icon registration."""
    print("Custom Icons/Symbols")
    matrix.clear()

    # Register a heart icon
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

    # Register a smiley icon
    smiley = [
        0b00111100,
        0b01000010,
        0b10100101,
        0b10000001,
        0b10100101,
        0b10011001,
        0b01000010,
        0b00111100,
    ]
    matrix.register_char('☺', smiley)

    # Register a star icon
    star = [
        0b00010000,
        0b00010000,
        0b01010100,
        0b00111000,
        0b11111110,
        0b00111000,
        0b01000100,
        0b10000010,
    ]
    matrix.register_char('★', star)

    # Register a diamond
    diamond = [
        0b00010000,
        0b00111000,
        0b01111100,
        0b11111110,
        0b01111100,
        0b00111000,
        0b00010000,
        0b00000000,
    ]
    matrix.register_char('◆', diamond)

    # Draw the custom icons
    matrix.text("I ♥ LED", 0, 5, (255, 0, 0))
    matrix.char('☺', 0, 20, (255, 255, 0))
    matrix.char('★', 16, 20, (255, 255, 255))
    matrix.char('◆', 32, 20, (0, 255, 255))

    matrix.text("ICONS!", 0, 35, (255, 128, 255))
    matrix.char('♥', 48, 35, (255, 0, 100))

    matrix.show()
    time.sleep(2)


def demo_text_effects(matrix):
    """Show text with effects."""
    print("Text with Effects")
    matrix.clear()

    # Text with background
    matrix.text("SOLID", 0, 0, (255, 255, 0), (100, 0, 0))

    # Spaced text
    matrix.text("SPACE", 0, 12, (0, 255, 255), spacing=2)

    # Outlined text (poor man's outline - draw multiple times)
    # Draw shadow/outline
    for dx in [-1, 0, 1]:
        for dy in [-1, 0, 1]:
            if dx != 0 or dy != 0:
                matrix.text("BIG!", 1 + dx, 25 + dy, (0, 0, 0))
    # Draw main text
    matrix.text("BIG!", 1, 25, (255, 255, 255))

    # Border
    matrix.border((255, 255, 255), thickness=1)

    matrix.show()
    time.sleep(2)


def demo_zx_blocks(matrix):
    """Show ZX Spectrum block graphics."""
    print("ZX Spectrum Block Graphics")
    matrix.clear()

    # Show block characters
    matrix.text("BLOCKS:", 0, 0, (255, 255, 255))

    # Full blocks
    matrix.text("████", 0, 10, (255, 0, 0))

    # Half blocks
    matrix.text("▀▀▀▀", 0, 20, (0, 255, 0))
    matrix.text("▄▄▄▄", 0, 28, (0, 0, 255))

    # Quarter blocks
    matrix.char('▘', 0, 40, (255, 255, 0))
    matrix.char('▝', 8, 40, (255, 0, 255))
    matrix.char('▖', 16, 40, (0, 255, 255))
    matrix.char('▗', 24, 40, (255, 128, 0))

    # Diagonal blocks
    matrix.char('▚', 32, 40, (128, 255, 128))
    matrix.char('▞', 40, 40, (255, 128, 255))

    matrix.show()
    time.sleep(2)


def main():
    """Run text showcase."""
    print("=" * 50)
    print("LED Matrix Text Showcase")
    print("ZX Spectrum Font System")
    print("=" * 50)
    print()

    # Create 64x64 RGB matrix
    args = parse_matrix_args(os.path.basename(__file__).replace('.py', '').replace('_', ' ').title())
    matrix = create_matrix(args.width, args.height, args.color_mode)
    layout = LayoutHelper(matrix.width, matrix.height)

    print("Demonstrating text rendering...\n")

    demo_basic_text(matrix)
    demo_text_grid(matrix)
    demo_text_buffer(matrix)
    demo_font_showcase(matrix)
    demo_custom_icons(matrix)
    demo_text_effects(matrix)
    demo_zx_blocks(matrix)

    print("\n" + "=" * 50)
    print("Text showcase complete!")
    print()
    print("Available text functions:")
    print("  - text(str, x, y) - pixel-positioned")
    print("  - text_grid(str, col, row) - grid-positioned")
    print("  - text_buffer(lines) - fill screen (ZX-81 mode)")
    print("  - char(c, x, y) - single character")
    print("  - register_char(c, bitmap) - custom icons")
    print()
    print("Font features:")
    print("  - 8x8 pixel characters")
    print("  - ZX Spectrum character set")
    print("  - Full RGB color support")
    print("  - Background color support")
    print("  - Custom character registration")
    print("  - Block graphics characters")


if __name__ == '__main__':
    main()
