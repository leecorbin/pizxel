#!/usr/bin/env python3
"""
Plasma Effect Demo - Mathematical visualization patterns
"""

import sys
import time
import os
import math

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from matrixos.display import Display, TerminalRenderer
from matrixos.config import parse_matrix_args


def plasma_effect(display, renderer, duration=10):
    """Classic plasma effect using sine waves."""
    start_time = time.time()
    frame = 0

    while time.time() - start_time < duration:
        for y in range(display.height):
            for x in range(display.width):
                # Multiple sine waves create plasma effect
                value = math.sin(x / 8.0 + frame * 0.1)
                value += math.sin(y / 6.0 + frame * 0.15)
                value += math.sin((x + y) / 10.0 + frame * 0.08)
                value += math.sin(math.sqrt(x*x + y*y) / 8.0 + frame * 0.12)

                # Normalize to 0-255 for RGB
                normalized = int((value + 4) * 32)  # value ranges from -4 to 4

                if display.color_mode == 'rgb':
                    # Map to color spectrum
                    r = int(127 + 127 * math.sin(normalized * 0.024 + 0))
                    g = int(127 + 127 * math.sin(normalized * 0.024 + 2))
                    b = int(127 + 127 * math.sin(normalized * 0.024 + 4))
                    display.set_pixel(x, y, (r, g, b))
                else:
                    # Monochrome: threshold
                    display.set_pixel(x, y, normalized > 128)

        frame += 1
        renderer.display_in_terminal()
        time.sleep(0.05)


def interference_pattern(display, renderer, duration=8):
    """Two point sources creating interference pattern."""
    start_time = time.time()
    frame = 0

    while time.time() - start_time < duration:
        # Two moving points
        point1_x = display.width // 2 + int(15 * math.sin(frame * 0.05))
        point1_y = display.height // 2 + int(15 * math.cos(frame * 0.05))
        point2_x = display.width // 2 + int(15 * math.sin(frame * 0.05 + math.pi))
        point2_y = display.height // 2 + int(15 * math.cos(frame * 0.05 + math.pi))

        for y in range(display.height):
            for x in range(display.width):
                # Distance from each point
                dist1 = math.sqrt((x - point1_x)**2 + (y - point1_y)**2)
                dist2 = math.sqrt((x - point2_x)**2 + (y - point2_y)**2)

                # Interference pattern
                value = math.sin(dist1 * 0.5) + math.sin(dist2 * 0.5)

                if display.color_mode == 'rgb':
                    intensity = int((value + 2) * 63.75)
                    r = intensity
                    g = int(intensity * 0.5)
                    b = 255 - intensity
                    display.set_pixel(x, y, (r, g, b))
                else:
                    display.set_pixel(x, y, value > 0)

        frame += 1
        renderer.display_in_terminal()
        time.sleep(0.05)


def wave_function(display, renderer, duration=8):
    """Standing wave patterns."""
    start_time = time.time()
    frame = 0

    while time.time() - start_time < duration:
        for y in range(display.height):
            for x in range(display.width):
                # Standing wave
                nx = x / display.width * 4 * math.pi
                ny = y / display.height * 4 * math.pi

                value = math.sin(nx + frame * 0.1) * math.sin(ny + frame * 0.15)

                if display.color_mode == 'rgb':
                    intensity = int((value + 1) * 127.5)
                    # Color based on position and value
                    r = int((1 + math.sin(nx)) * 127.5)
                    g = intensity
                    b = int((1 + math.cos(ny)) * 127.5)
                    display.set_pixel(x, y, (r, g, b))
                else:
                    display.set_pixel(x, y, value > 0)

        frame += 1
        renderer.display_in_terminal()
        time.sleep(0.05)


def tunnel_effect(display, renderer, duration=8):
    """Rotating tunnel effect."""
    start_time = time.time()
    frame = 0

    # Pre-calculate tunnel lookup table for center
    center_x = display.width / 2
    center_y = display.height / 2

    while time.time() - start_time < duration:
        for y in range(display.height):
            for x in range(display.width):
                # Distance from center
                dx = x - center_x
                dy = y - center_y
                distance = math.sqrt(dx*dx + dy*dy)
                angle = math.atan2(dy, dx)

                # Tunnel effect
                if distance > 0:
                    u = frame * 0.05 + 32.0 / distance
                    v = angle / math.pi + frame * 0.03
                else:
                    u = v = 0

                # Pattern based on u and v
                pattern = math.sin(u) * math.cos(v * 8)

                if display.color_mode == 'rgb':
                    intensity = int((pattern + 1) * 127.5)
                    # Color shifts with depth
                    r = int(127 + 127 * math.sin(u))
                    g = int(127 + 127 * math.cos(v * 4))
                    b = intensity
                    display.set_pixel(x, y, (r, g, b))
                else:
                    display.set_pixel(x, y, pattern > 0)

        frame += 1
        renderer.display_in_terminal()
        time.sleep(0.05)


def main():
    """Run plasma/mathematical effect demos."""
    args = parse_matrix_args(os.path.basename(__file__).replace(".py", "").replace("_", " ").title())
    print("LED Matrix Plasma & Wave Effects")
    print("=================================\n")

    print("These effects use mathematical functions to create")
    print("organic-looking patterns in real-time.\n")

    # RGB mode for best effect
    print("Creating 64x64 RGB display...\n")
    display = Display(args.width, args.height, color_mode='rgb')
    renderer = TerminalRenderer(display)

    print("1. Classic Plasma Effect")
    print("   (Multiple sine waves creating flowing plasma)")
    plasma_effect(display, renderer, duration=5)

    print("\n2. Interference Pattern")
    print("   (Two moving point sources)")
    interference_pattern(display, renderer, duration=5)

    print("\n3. Standing Wave Function")
    print("   (Mathematical wave interference)")
    wave_function(display, renderer, duration=5)

    print("\n4. Tunnel Effect")
    print("   (Polar coordinate distortion)")
    tunnel_effect(display, renderer, duration=5)

    print("\033[2J\033[H")
    print("Plasma demos complete!")
    print("\nThese effects demonstrate:")
    print("  - Real-time mathematical visualization")
    print("  - Sine/cosine wave combinations")
    print("  - Polar coordinate systems")
    print("  - Color mapping techniques")
    print("  - Frame-based animation")


if __name__ == '__main__':
    main()
