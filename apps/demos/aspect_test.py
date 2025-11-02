#!/usr/bin/env python3
"""
Aspect Ratio Test - Check if your terminal displays a square correctly
"""

import sys
import os

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from matrixos.display import Display, TerminalRenderer


def draw_circle(display, center_x, center_y, radius):
    """Draw a circle - should look circular if aspect ratio is correct."""
    import math
    for angle in range(0, 360, 2):
        rad = math.radians(angle)
        x = int(center_x + radius * math.cos(rad))
        y = int(center_y + radius * math.sin(rad))
        if 0 <= x < display.width and 0 <= y < display.height:
            display.set_pixel(x, y, True)


def draw_square(display, x1, y1, size):
    """Draw a square."""
    for x in range(x1, min(x1 + size, display.width)):
        display.set_pixel(x, y1, True)
        display.set_pixel(x, min(y1 + size - 1, display.height - 1), True)
    for y in range(y1, min(y1 + size, display.height)):
        display.set_pixel(x1, y, True)
        display.set_pixel(min(x1 + size - 1, display.width - 1), y, True)


def main():
    print("LED Matrix Aspect Ratio Test")
    print("=============================\n")

    # Test 64x64
    print("64x64 Display (should render as 64 chars wide × 32 chars tall)")
    print("-" * 64)
    display = Display(64, 64, color_mode='mono')
    renderer = TerminalRenderer(display)

    # Draw reference shapes
    display.clear()

    # Draw border
    for x in range(display.width):
        display.set_pixel(x, 0, True)
        display.set_pixel(x, display.height - 1, True)
    for y in range(display.height):
        display.set_pixel(0, y, True)
        display.set_pixel(display.width - 1, y, True)

    # Draw circle - should look circular, not oval
    draw_circle(display, 32, 32, 20)

    # Draw squares inside
    draw_square(display, 10, 10, 10)
    draw_square(display, 44, 10, 10)
    draw_square(display, 10, 44, 10)
    draw_square(display, 44, 44, 10)

    # Draw crosshairs
    for i in range(display.width):
        display.set_pixel(i, 32, True)
    for i in range(display.height):
        display.set_pixel(32, i, True)

    renderer.display_in_terminal()

    print("\n")
    print("Visual check:")
    print("  ✓ The circle should look CIRCULAR (not oval)")
    print("  ✓ The squares should look SQUARE (not rectangular)")
    print("  ✓ The crosshairs should divide the display in half visually")
    print("\n")
    print("If the circle looks like a HORIZONTAL oval (wider than tall),")
    print("your terminal characters are tall, which is normal.")
    print("\n")
    print("Terminal character aspect ratios vary by font:")
    print("  - Most monospace fonts: ~1:2 (half as wide as tall)")
    print("  - With half-blocks, a 64x64 pixel display should look roughly square")
    print("  - But it depends on your specific terminal font!")
    print("\n")
    print("If it doesn't look square, you can:")
    print("  1. Adjust your terminal font settings")
    print("  2. Use a different display size (e.g., 128x64 for wider displays)")
    print("  3. We can add aspect ratio compensation to the renderer")


if __name__ == '__main__':
    main()
