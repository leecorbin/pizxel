#!/usr/bin/env python3
"""
Animation Demo - Shows moving patterns and basic animation
"""

import sys
import time
import os
import math

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.display import Display, TerminalRenderer
from src.config import parse_matrix_args


def demo_moving_square(display, renderer, duration=5):
    """A square that moves around the screen."""
    start_time = time.time()
    square_size = 8
    x, y = 0, 0
    dx, dy = 2, 1

    while time.time() - start_time < duration:
        display.clear()

        # Draw square
        for i in range(square_size):
            for j in range(square_size):
                px, py = x + i, y + j
                if 0 <= px < display.width and 0 <= py < display.height:
                    display.set_pixel(px, py, True)

        # Update position
        x += dx
        y += dy

        # Bounce off walls
        if x <= 0 or x + square_size >= display.width:
            dx = -dx
        if y <= 0 or y + square_size >= display.height:
            dy = -dy

        renderer.display_in_terminal()
        time.sleep(0.05)


def demo_rotating_line(display, renderer, duration=5):
    """A line rotating around the center."""
    start_time = time.time()
    center_x = display.width // 2
    center_y = display.height // 2
    length = min(display.width, display.height) // 2 - 2
    angle = 0

    while time.time() - start_time < duration:
        display.clear()

        # Draw rotating line
        for r in range(length):
            x = int(center_x + r * math.cos(angle))
            y = int(center_y + r * math.sin(angle))
            if 0 <= x < display.width and 0 <= y < display.height:
                display.set_pixel(x, y, True)

        angle += 0.1

        renderer.display_in_terminal()
        time.sleep(0.03)


def demo_expanding_circles(display, renderer, duration=5):
    """Concentric circles expanding from center."""
    start_time = time.time()
    center_x = display.width // 2
    center_y = display.height // 2
    max_radius = min(display.width, display.height) // 2

    frame = 0
    while time.time() - start_time < duration:
        display.clear()

        # Draw 3 expanding circles
        for i in range(3):
            radius = (frame + i * 10) % max_radius

            # Simple circle drawing
            for angle in range(0, 360, 3):
                rad = math.radians(angle)
                x = int(center_x + radius * math.cos(rad))
                y = int(center_y + radius * math.sin(rad))
                if 0 <= x < display.width and 0 <= y < display.height:
                    display.set_pixel(x, y, True)

        frame += 1
        renderer.display_in_terminal()
        time.sleep(0.05)


def demo_scrolling_pattern(display, renderer, duration=5):
    """A pattern scrolling horizontally."""
    start_time = time.time()
    offset = 0

    while time.time() - start_time < duration:
        display.clear()

        # Create a repeating pattern
        for y in range(display.height):
            for x in range(display.width):
                # Checkerboard pattern that scrolls
                pattern_x = (x + offset) % 16
                pattern_y = y % 16
                if (pattern_x < 8 and pattern_y < 8) or (pattern_x >= 8 and pattern_y >= 8):
                    display.set_pixel(x, y, True)

        offset += 1
        renderer.display_in_terminal()
        time.sleep(0.05)


def demo_snake_trail(display, renderer, duration=5):
    """A snake that leaves a fading trail."""
    start_time = time.time()

    # Snake starting position
    snake = [(display.width // 2, display.height // 2)]
    direction = 0  # 0=right, 1=down, 2=left, 3=up
    directions = [(1, 0), (0, 1), (-1, 0), (0, -1)]
    max_length = 30

    while time.time() - start_time < duration:
        display.clear()

        # Draw snake
        for i, (sx, sy) in enumerate(snake):
            if 0 <= sx < display.width and 0 <= sy < display.height:
                display.set_pixel(sx, sy, True)

        # Move snake
        head_x, head_y = snake[0]
        dx, dy = directions[direction]
        new_head = (head_x + dx, head_y + dy)

        # Change direction occasionally
        if len(snake) % 15 == 0:
            direction = (direction + 1) % 4

        # Wrap around screen
        new_head = (new_head[0] % display.width, new_head[1] % display.height)

        snake.insert(0, new_head)
        if len(snake) > max_length:
            snake.pop()

        renderer.display_in_terminal()
        time.sleep(0.08)


def demo_rgb_color_wave(display, renderer, duration=5):
    """Moving color waves in RGB mode."""
    start_time = time.time()
    offset = 0

    while time.time() - start_time < duration:
        display.clear()

        for y in range(display.height):
            for x in range(display.width):
                # Create color waves
                r = int(127 + 127 * math.sin((x + offset) * 0.1))
                g = int(127 + 127 * math.sin((y + offset) * 0.1))
                b = int(127 + 127 * math.sin((x + y + offset) * 0.05))

                display.set_pixel(x, y, (r, g, b))

        offset += 1
        renderer.display_in_terminal()
        time.sleep(0.05)


def main():
    """Run all animation demos."""
    args = parse_matrix_args(os.path.basename(__file__).replace(".py", "").replace("_", " ").title())
    print("LED Matrix Animation Demos")
    print("==========================\n")

    # Monochrome animations
    print("Creating 64x64 display for monochrome animations...")
    display = Display(args.width, args.height, color_mode='mono')
    renderer = TerminalRenderer(display)

    print("\n1. Moving Square")
    demo_moving_square(display, renderer, duration=3)

    print("\n2. Rotating Line")
    demo_rotating_line(display, renderer, duration=3)

    print("\n3. Expanding Circles")
    demo_expanding_circles(display, renderer, duration=3)

    print("\n4. Scrolling Pattern")
    demo_scrolling_pattern(display, renderer, duration=3)

    print("\n5. Snake Trail")
    demo_snake_trail(display, renderer, duration=3)

    # RGB animation
    print("\n6. RGB Color Waves")
    display_rgb = Display(args.width, args.height, color_mode='rgb')
    renderer_rgb = TerminalRenderer(display_rgb)
    demo_rgb_color_wave(display_rgb, renderer_rgb, duration=3)

    print("\033[2J\033[H")
    print("Animation demos complete!")
    print("\nThese demos show:")
    print("  - Basic motion and collision detection")
    print("  - Trigonometric patterns (rotation, circles)")
    print("  - Scrolling effects")
    print("  - Trail/history effects")
    print("  - RGB color animation")


if __name__ == '__main__':
    main()
