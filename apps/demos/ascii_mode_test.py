#!/usr/bin/env python3
"""
ASCII Mode Test - Shows the same pattern in Unicode and ASCII mode
"""

import sys
import os
import time

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from matrixos.display import Display, TerminalRenderer


def draw_test_pattern(display):
    """Draw a simple test pattern."""
    # Border
    for x in range(display.width):
        display.set_pixel(x, 0, True)
        display.set_pixel(x, display.height - 1, True)
    for y in range(display.height):
        display.set_pixel(0, y, True)
        display.set_pixel(display.width - 1, y, True)

    # Circle
    import math
    center_x, center_y = display.width // 2, display.height // 2
    radius = min(display.width, display.height) // 3

    for angle in range(0, 360, 2):
        rad = math.radians(angle)
        x = int(center_x + radius * math.cos(rad))
        y = int(center_y + radius * math.sin(rad))
        if 0 <= x < display.width and 0 <= y < display.height:
            display.set_pixel(x, y, True)

    # Cross
    for i in range(display.width):
        display.set_pixel(i, center_y, True)
    for i in range(display.height):
        display.set_pixel(center_x, i, True)


def main():
    print("ASCII Mode Comparison Test")
    print("=" * 64)
    print()

    # Create display
    display = Display(64, 64, color_mode='mono')
    draw_test_pattern(display)

    print("UNICODE MODE (default):")
    print("Should show █ ▀ ▄ characters")
    print("-" * 64)
    renderer_unicode = TerminalRenderer(display, ascii_mode=False)
    renderer_unicode.display_in_terminal(clear_screen=False)

    print("\n\n")
    input("Press Enter to see ASCII mode...")

    print("\033[2J\033[H")
    print("ASCII MODE (fallback):")
    print("Uses # ^ _ characters (works with any font)")
    print("-" * 64)
    renderer_ascii = TerminalRenderer(display, ascii_mode=True)
    renderer_ascii.display_in_terminal(clear_screen=False)

    print("\n\n")
    print("If the Unicode mode showed dashes (-) or underscores (_),")
    print("use ascii_mode=True when creating your TerminalRenderer:")
    print()
    print("  renderer = TerminalRenderer(display, ascii_mode=True)")
    print()
    print("ASCII mode uses:")
    print("  # for full pixels")
    print("  ^ for top half")
    print("  _ for bottom half")


if __name__ == '__main__':
    main()
