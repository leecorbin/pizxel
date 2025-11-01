#!/usr/bin/env python3
"""
Demo of the LED Matrix Display Emulator

Shows various patterns and capabilities of the display system.
"""

import sys
import time
import os

# Add parent directory to path so we can import src modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.display import Display, TerminalRenderer


def demo_basic_patterns(display, renderer):
    """Demonstrate basic patterns."""

    print("=== DEMO: Basic Patterns ===\n")
    time.sleep(1)

    # Pattern 1: Border
    print("Border pattern...")
    display.clear()
    for x in range(display.width):
        display.set_pixel(x, 0, True)
        display.set_pixel(x, display.height - 1, True)
    for y in range(display.height):
        display.set_pixel(0, y, True)
        display.set_pixel(display.width - 1, y, True)
    renderer.display_in_terminal()
    time.sleep(2)

    # Pattern 2: Diagonal lines
    print("\033[2J\033[H", end='')
    print("Diagonal lines...")
    display.clear()
    for i in range(min(display.width, display.height)):
        display.set_pixel(i, i, True)
        if i < display.width:
            display.set_pixel(display.width - 1 - i, i, True)
    renderer.display_in_terminal()
    time.sleep(2)

    # Pattern 3: Checkerboard
    print("\033[2J\033[H", end='')
    print("Checkerboard pattern...")
    display.clear()
    for y in range(display.height):
        for x in range(display.width):
            if (x + y) % 2 == 0:
                display.set_pixel(x, y, True)
    renderer.display_in_terminal()
    time.sleep(2)


def demo_rectangle(display, renderer):
    """Draw some rectangles."""

    print("\033[2J\033[H", end='')
    print("Nested rectangles...")
    display.clear()

    for offset in range(0, min(display.width, display.height) // 2, 4):
        x1, y1 = offset, offset
        x2, y2 = display.width - 1 - offset, display.height - 1 - offset

        # Draw rectangle
        for x in range(x1, x2 + 1):
            display.set_pixel(x, y1, True)
            display.set_pixel(x, y2, True)
        for y in range(y1, y2 + 1):
            display.set_pixel(x1, y, True)
            display.set_pixel(x2, y, True)

    renderer.display_in_terminal()
    time.sleep(2)


def demo_text_simulation(display, renderer):
    """Simulate simple text-like patterns."""

    print("\033[2J\033[H", end='')
    print("Text-like pattern (simulated)...")
    display.clear()

    # Draw some simple character-like patterns
    # This is just for demo - we'll build proper text rendering later
    patterns = [
        # "H" pattern at x=4
        [(4, 8), (4, 9), (4, 10), (4, 11), (4, 12), (4, 13), (4, 14),
         (5, 11), (6, 11),
         (7, 8), (7, 9), (7, 10), (7, 11), (7, 12), (7, 13), (7, 14)],

        # "I" pattern at x=12
        [(12, 8), (13, 8), (14, 8),
         (13, 9), (13, 10), (13, 11), (13, 12), (13, 13),
         (12, 14), (13, 14), (14, 14)],
    ]

    for pattern in patterns:
        for x, y in pattern:
            if 0 <= x < display.width and 0 <= y < display.height:
                display.set_pixel(x, y, True)

    renderer.display_in_terminal()
    time.sleep(2)


def demo_rgb(display, renderer):
    """Demonstrate RGB color mode."""

    print("\033[2J\033[H", end='')
    print("RGB Color demonstration...")
    display.clear()

    # Create color gradient
    for y in range(display.height):
        for x in range(display.width):
            r = int((x / display.width) * 255)
            g = int((y / display.height) * 255)
            b = 128
            display.set_pixel(x, y, (r, g, b))

    renderer.display_in_terminal()
    time.sleep(3)

    # Color bars
    print("\033[2J\033[H", end='')
    print("RGB Color bars...")
    display.clear()

    bar_width = display.width // 3
    for y in range(display.height):
        # Red bar
        for x in range(bar_width):
            display.set_pixel(x, y, (255, 0, 0))
        # Green bar
        for x in range(bar_width, 2 * bar_width):
            display.set_pixel(x, y, (0, 255, 0))
        # Blue bar
        for x in range(2 * bar_width, display.width):
            display.set_pixel(x, y, (0, 0, 255))

    renderer.display_in_terminal()
    time.sleep(2)


def main():
    """Run all demos."""

    print("LED Matrix Display Emulator Demo")
    print("=================================\n")

    # Demo 1: Monochrome display
    print("Creating 64x64 monochrome display...")
    time.sleep(1)

    display = Display(64, 64, color_mode='mono')
    renderer = TerminalRenderer(display)

    demo_basic_patterns(display, renderer)
    demo_rectangle(display, renderer)
    demo_text_simulation(display, renderer)

    # Demo 2: RGB display
    print("\n\nSwitching to RGB mode...")
    time.sleep(1)

    display_rgb = Display(64, 64, color_mode='rgb')
    renderer_rgb = TerminalRenderer(display_rgb)

    demo_rgb(display_rgb, renderer_rgb)

    # Final message
    print("\033[2J\033[H", end='')
    print("Demo complete!")
    print(f"\nDisplay specs:")
    print(f"  - Size: {display.width}x{display.height} pixels")
    print(f"  - Modes: monochrome and RGB")
    print(f"  - Terminal rendering with half-block characters for compact display")


if __name__ == '__main__':
    main()
