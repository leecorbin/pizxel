#!/usr/bin/env python3
"""
Combined Demo - Graphics + Text together
Shows practical examples mixing drawing primitives and text
"""

import sys
import os
import time
import math

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.led_api import create_matrix
from src.config import parse_matrix_args
from src.layout import LayoutHelper


def demo_ui_elements(matrix):
    """Show UI-like elements."""
    print("UI Elements")
    matrix.clear()

    # Title bar
    matrix.rect(0, 0, 64, 10, (0, 100, 200), fill=True)
    matrix.text("STATUS", 4, 2, (255, 255, 255))

    # Info boxes
    matrix.rounded_rect(2, 14, 28, 18, 3, (50, 50, 50), fill=True)
    matrix.text("TEMP", 6, 17, (255, 255, 0))
    matrix.text("25C", 8, 25, (0, 255, 0))

    matrix.rounded_rect(34, 14, 28, 18, 3, (50, 50, 50), fill=True)
    matrix.text("TIME", 38, 17, (255, 255, 0))
    matrix.text("12:34", 36, 25, (0, 255, 255))

    # Progress bar
    matrix.text("LOAD:", 2, 38, (200, 200, 200))
    matrix.rect(2, 46, 60, 8, (100, 100, 100), fill=True)
    matrix.rect(3, 47, 42, 6, (0, 255, 0), fill=True)
    matrix.text("70%", 24, 56, (255, 255, 255))

    matrix.show()
    time.sleep(2)


def demo_data_visualization(matrix):
    """Show simple data visualization."""
    print("Data Visualization")
    matrix.clear()

    # Title
    matrix.text("STATS", 16, 2, (255, 255, 255))

    # Bar chart
    data = [8, 15, 12, 20, 16, 10]
    colors = [
        (255, 0, 0), (255, 128, 0), (255, 255, 0),
        (0, 255, 0), (0, 255, 255), (0, 0, 255)
    ]

    bar_width = 8
    for i, (value, color) in enumerate(zip(data, colors)):
        x = 4 + i * (bar_width + 2)
        y = 52 - value
        matrix.rect(x, y, bar_width, value, color, fill=True)

    # Axis
    matrix.line(2, 52, 62, 52, (255, 255, 255))
    matrix.line(2, 12, 2, 52, (255, 255, 255))

    # Labels
    matrix.text("0", 0, 54, (200, 200, 200))

    matrix.show()
    time.sleep(2)


def demo_game_ui(matrix):
    """Show game-like UI."""
    print("Game UI")
    matrix.clear()

    # Score
    matrix.text("SCORE:", 2, 2, (255, 255, 255))
    matrix.text("9999", 26, 12, (255, 255, 0))

    # Lives (hearts)
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

    matrix.text("LIVES:", 2, 22, (255, 255, 255))
    for i in range(3):
        matrix.char('♥', 2 + i * 10, 30, (255, 0, 0))

    # Game area
    matrix.rect(2, 42, 60, 20, (100, 100, 200), fill=False)

    # Player (simple spaceship)
    spaceship = [
        0b00010000,
        0b00111000,
        0b01111100,
        0b11111110,
        0b11111110,
        0b01111100,
        0b00111000,
        0b00010000,
    ]
    matrix.register_char('▲', spaceship)

    matrix.char('▲', 28, 50, (0, 255, 255))

    # Enemy
    matrix.star(48, 46, 4, points=5, color=(255, 0, 0), fill=True)

    matrix.show()
    time.sleep(2)


def demo_notification(matrix):
    """Show notification-style display."""
    print("Notification")
    matrix.clear()

    # Background
    matrix.rect(0, 0, 64, 64, (20, 20, 60), fill=True)

    # Alert box
    matrix.rounded_rect(6, 10, 52, 44, 6, (255, 255, 255), fill=False)
    matrix.rounded_rect(7, 11, 50, 42, 5, (100, 100, 200), fill=True)

    # Icon
    matrix.circle(32, 24, 8, (255, 200, 0), fill=True)
    matrix.text("!", 30, 18, (0, 0, 0))

    # Message
    matrix.centered_text("ALERT!", 36, (255, 255, 0))
    matrix.centered_text("NEW MSG", 45, (255, 255, 255))

    matrix.show()
    time.sleep(2)


def demo_clock_face(matrix):
    """Show an analog clock face."""
    print("Clock Display")
    matrix.clear()

    # Clock circle
    cx, cy = 32, 34
    radius = 22

    matrix.circle(cx, cy, radius, (255, 255, 255), fill=False)
    matrix.circle(cx, cy, radius - 1, (200, 200, 200), fill=False)

    # Hour markers
    for hour in range(12):
        angle = math.radians(hour * 30 - 90)
        x1 = int(cx + (radius - 4) * math.cos(angle))
        y1 = int(cy + (radius - 4) * math.sin(angle))
        x2 = int(cx + (radius - 2) * math.cos(angle))
        y2 = int(cy + (radius - 2) * math.sin(angle))
        matrix.line(x1, y1, x2, y2, (255, 255, 255))

    # Hour hand (pointing to 3)
    hour_angle = math.radians(90 - 90)
    hx = int(cx + 12 * math.cos(hour_angle))
    hy = int(cy + 12 * math.sin(hour_angle))
    matrix.line(cx, cy, hx, hy, (255, 255, 0))

    # Minute hand (pointing to 6)
    min_angle = math.radians(180 - 90)
    mx = int(cx + 18 * math.cos(min_angle))
    my = int(cy + 18 * math.sin(min_angle))
    matrix.line(cx, cy, mx, my, (0, 255, 255))

    # Center dot
    matrix.circle(cx, cy, 2, (255, 0, 0), fill=True)

    # Title
    matrix.text("TIME", 18, 2, (255, 255, 255))

    matrix.show()
    time.sleep(2)


def demo_weather_icon(matrix):
    """Show weather-like display."""
    print("Weather Display")
    matrix.clear()

    # Sun icon
    cx, cy = 18, 20
    matrix.circle(cx, cy, 6, (255, 255, 0), fill=True)

    # Sun rays
    for angle in range(0, 360, 45):
        rad = math.radians(angle)
        x1 = int(cx + 8 * math.cos(rad))
        y1 = int(cy + 8 * math.sin(rad))
        x2 = int(cx + 12 * math.cos(rad))
        y2 = int(cy + 12 * math.sin(rad))
        matrix.line(x1, y1, x2, y2, (255, 255, 0))

    # Temperature
    matrix.text("25C", 38, 10, (255, 128, 0))
    matrix.text("SUNNY", 36, 20, (255, 255, 255))

    # Bottom section
    matrix.line(0, 35, 63, 35, (100, 100, 100))

    matrix.text("MON", 2, 38, (200, 200, 200))
    matrix.text("TUE", 2, 46, (200, 200, 200))
    matrix.text("WED", 2, 54, (200, 200, 200))

    matrix.text("22C", 26, 38, (255, 255, 255))
    matrix.text("24C", 26, 46, (255, 255, 255))
    matrix.text("23C", 26, 54, (255, 255, 255))

    matrix.show()
    time.sleep(2)


def demo_retro_loading(matrix):
    """Show retro loading screen."""
    print("Retro Loading Screen")
    matrix.clear()

    # Background pattern
    for y in range(0, 64, 2):
        for x in range(0, 64, 2):
            if (x + y) % 4 == 0:
                matrix.set_pixel(x, y, (20, 20, 40))

    # Border
    matrix.rect(4, 4, 56, 56, (0, 255, 255), fill=False)
    matrix.rect(5, 5, 54, 54, (0, 200, 200), fill=False)

    # Title
    matrix.centered_text("LOADING", 12, (255, 255, 0))

    # Progress bar
    matrix.rect(10, 28, 44, 8, (50, 50, 100), fill=True)
    matrix.rect(12, 30, 28, 4, (0, 255, 0), fill=True)

    # Text
    matrix.centered_text("PLEASE", 42, (255, 255, 255))
    matrix.centered_text("WAIT...", 50, (200, 200, 200))

    matrix.show()
    time.sleep(2)


def main():
    """Run combined demos."""
    print("=" * 50)
    print("LED Matrix Combined Demo")
    print("Graphics + Text Integration")
    print("=" * 50)
    print()

    # Create 64x64 RGB matrix
    args = parse_matrix_args(os.path.basename(__file__).replace('.py', '').replace('_', ' ').title())
    matrix = create_matrix(args.width, args.height, args.color_mode)
    layout = LayoutHelper(matrix.width, matrix.height)

    print("Demonstrating practical applications...\n")

    demo_ui_elements(matrix)
    demo_data_visualization(matrix)
    demo_game_ui(matrix)
    demo_notification(matrix)
    demo_clock_face(matrix)
    demo_weather_icon(matrix)
    demo_retro_loading(matrix)

    print("\n" + "=" * 50)
    print("Combined demo complete!")
    print()
    print("You can now create:")
    print("  - User interfaces")
    print("  - Data visualizations")
    print("  - Game displays")
    print("  - Status screens")
    print("  - Notifications")
    print("  - Custom icons & symbols")
    print()
    print("All with RGB colors and ZX Spectrum-style text!")


if __name__ == '__main__':
    main()
