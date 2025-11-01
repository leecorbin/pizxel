#!/usr/bin/env python3
"""
ZX Spectrum Style Menu - Colorful retro menu screen!
Classic rainbow borders and vibrant colors
"""

import sys
import os
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.led_api import create_matrix


def draw_spectrum_border(matrix):
    """Draw classic ZX Spectrum rainbow border."""
    # Rainbow colors for border (classic Spectrum colors)
    colors = [
        (255, 0, 0),      # Red
        (255, 128, 0),    # Orange
        (255, 255, 0),    # Yellow
        (0, 255, 0),      # Green
        (0, 255, 255),    # Cyan
        (0, 0, 255),      # Blue
        (255, 0, 255),    # Magenta
    ]

    # Draw rainbow border stripes
    for i in range(4):
        color = colors[i % len(colors)]
        matrix.rect(i, i, 64 - 2*i, 64 - 2*i, color, fill=False)


def draw_spectrum_loading_bars(matrix):
    """Draw ZX Spectrum style loading bars."""
    colors = [
        (255, 0, 0),      # Red
        (255, 255, 0),    # Yellow
        (0, 255, 0),      # Green
        (0, 255, 255),    # Cyan
        (0, 0, 255),      # Blue
        (255, 0, 255),    # Magenta
    ]

    # Horizontal color bars
    bar_height = 3
    y = 18
    for color in colors:
        matrix.rect(8, y, 48, bar_height, color, fill=True)
        y += bar_height


def demo_spectrum_splash(matrix):
    """ZX Spectrum splash/loading screen."""
    print("ZX Spectrum Splash Screen")
    matrix.clear()

    # Background
    matrix.fill((0, 0, 0))

    # Rainbow border
    draw_spectrum_border(matrix)

    # Title with shadow
    title_y = 8
    # Shadow
    matrix.centered_text("SPECTRUM", title_y + 1, (0, 0, 0))
    # Main text
    matrix.centered_text("SPECTRUM", title_y, (0, 255, 255))

    # Loading bars
    draw_spectrum_loading_bars(matrix)

    # Copyright
    matrix.centered_text("1982", 40, (255, 255, 0))

    # Bottom text
    matrix.centered_text("READY.", 52, (255, 255, 255))

    matrix.show()
    time.sleep(3)


def demo_spectrum_menu(matrix):
    """ZX Spectrum style menu."""
    print("ZX Spectrum Menu")
    matrix.clear()

    # Cyan background (classic Spectrum)
    matrix.fill((0, 200, 200))

    # Rainbow border
    draw_spectrum_border(matrix)

    # Title bar
    matrix.rect(6, 6, 52, 10, (0, 0, 0), fill=True)
    matrix.centered_text("MENU", 8, (255, 255, 255))

    # Menu items with colorful backgrounds
    menu_items = [
        ("1.START", (255, 0, 0)),
        ("2.LOAD", (255, 255, 0)),
        ("3.SAVE", (0, 255, 0)),
        ("4.QUIT", (255, 0, 255)),
    ]

    y = 20
    for text, color in menu_items:
        # Background box
        matrix.rect(10, y, 44, 8, color, fill=True)
        # Text
        matrix.text(text, 14, y + 1, (0, 0, 0))
        y += 10

    matrix.show()
    time.sleep(3)


def demo_spectrum_game_over(matrix):
    """ZX Spectrum game over screen."""
    print("ZX Spectrum Game Over")
    matrix.clear()

    # Dark background
    matrix.fill((0, 0, 100))

    # Flash border effect (red/yellow alternating)
    for i in range(3):
        color = (255, 0, 0) if i % 2 == 0 else (255, 255, 0)
        matrix.rect(i, i, 64 - 2*i, 64 - 2*i, color, fill=False)

    # GAME OVER text
    matrix.centered_text("GAME", 16, (255, 255, 255))
    matrix.centered_text("OVER!", 26, (255, 0, 0))

    # Score
    matrix.rect(8, 36, 48, 12, (0, 0, 0), fill=True)
    matrix.centered_text("SCORE", 38, (255, 255, 0))
    matrix.centered_text("9999", 46, (0, 255, 0))

    matrix.show()
    time.sleep(3)


def demo_spectrum_high_score(matrix):
    """ZX Spectrum high score table."""
    print("ZX Spectrum High Scores")
    matrix.clear()

    # Background gradient effect (stripes)
    for y in range(64):
        intensity = int((y / 64) * 128) + 64
        matrix.line(0, y, 63, y, (0, 0, intensity))

    # Rainbow border
    draw_spectrum_border(matrix)

    # Title
    matrix.rect(4, 4, 56, 10, (255, 255, 0), fill=True)
    matrix.centered_text("SCORES", 6, (0, 0, 0))

    # Score entries
    scores = [
        ("1.ACE", "9999", (255, 0, 0)),
        ("2.BOB", "8888", (255, 255, 0)),
        ("3.CAZ", "7777", (0, 255, 0)),
    ]

    y = 18
    for rank, name, score, color in scores:
        # Rank and name
        matrix.text(rank, 6, y, color)
        matrix.text(name, 22, y, color)
        # Score
        matrix.text(score, 42, y, (255, 255, 255))
        y += 10

    # Flashing text at bottom
    matrix.centered_text("PRESS", 50, (0, 255, 255))
    matrix.centered_text("START", 58, (255, 255, 255))

    matrix.show()
    time.sleep(3)


def demo_spectrum_loader(matrix):
    """Animated ZX Spectrum tape loader effect."""
    print("ZX Spectrum Tape Loader")

    for frame in range(20):
        matrix.clear()

        # Background
        matrix.fill((0, 0, 0))

        # Border flashes between colors (like real tape loading!)
        border_color = (255, 0, 0) if frame % 4 < 2 else (0, 255, 255)
        for i in range(2):
            matrix.rect(i, i, 64 - 2*i, 64 - 2*i, border_color, fill=False)

        # Loading bars (animated)
        bar_y = 20
        num_bars = (frame % 10) + 1
        for i in range(num_bars):
            color = (255, 255, 0) if i % 2 == 0 else (0, 255, 255)
            matrix.rect(10 + i * 4, bar_y, 3, 10, color, fill=True)

        # Text
        matrix.centered_text("LOADING", 12, (255, 255, 255))

        # Animated dots
        dots = "." * ((frame % 4) + 1)
        matrix.centered_text(dots, 40, (0, 255, 0))

        # Bytes counter
        bytes_loaded = frame * 256
        matrix.text(f"{bytes_loaded:04d}", 20, 50, (255, 255, 0))

        matrix.show()
        time.sleep(0.15)


def demo_spectrum_character_set(matrix):
    """Show ZX Spectrum character set in classic colors."""
    print("ZX Spectrum Character Set")
    matrix.clear()

    # Background
    matrix.fill((0, 0, 200))

    # Rainbow border
    draw_spectrum_border(matrix)

    # Title
    matrix.rect(4, 4, 56, 10, (255, 255, 255), fill=True)
    matrix.centered_text("CHARSET", 6, (0, 0, 0))

    # Show colorful characters
    chars = "ABCDEFGH"
    matrix.text(chars, 0, 16, (255, 255, 0), (255, 0, 0))

    chars = "01234567"
    matrix.text(chars, 0, 26, (0, 0, 0), (0, 255, 0))

    chars = "!@#$%^&*"
    matrix.text(chars, 0, 36, (255, 255, 255), (255, 0, 255))

    # Block graphics
    matrix.char('█', 8, 46, (255, 0, 0))
    matrix.char('▀', 16, 46, (255, 255, 0))
    matrix.char('▄', 24, 46, (0, 255, 0))
    matrix.char('▘', 32, 46, (0, 255, 255))
    matrix.char('▗', 40, 46, (0, 0, 255))
    matrix.char('▚', 48, 46, (255, 0, 255))

    matrix.show()
    time.sleep(3)


def demo_final_title_card(matrix):
    """Final colorful title card."""
    print("Final Title Card")
    matrix.clear()

    # Rainbow background stripes
    colors = [
        (255, 0, 0),      # Red
        (255, 128, 0),    # Orange
        (255, 255, 0),    # Yellow
        (0, 255, 0),      # Green
        (0, 255, 255),    # Cyan
        (0, 0, 255),      # Blue
        (255, 0, 255),    # Magenta
        (255, 0, 128),    # Pink
    ]

    stripe_height = 64 // len(colors)
    for i, color in enumerate(colors):
        y = i * stripe_height
        matrix.rect(0, y, 64, stripe_height, color, fill=True)

    # Black box for text
    matrix.rect(6, 12, 52, 40, (0, 0, 0), fill=True)
    matrix.rect(7, 13, 50, 38, (255, 255, 255), fill=False)

    # Title text
    matrix.centered_text("LED", 18, (255, 0, 0))
    matrix.centered_text("MATRIX", 26, (255, 255, 0))
    matrix.centered_text("SYSTEM", 34, (0, 255, 0))

    # Subtitle
    matrix.centered_text("ZX-81", 44, (0, 255, 255))

    matrix.show()
    time.sleep(3)


def main():
    """Run all ZX Spectrum style screens."""
    print("=" * 64)
    print("ZX SPECTRUM STYLE MENU SCREENS")
    print("Bringing back that 1982 magic!")
    print("=" * 64)
    print()

    # Create 64x64 RGB matrix
    matrix = create_matrix(64, 64, 'rgb')

    print("Displaying ZX Spectrum style screens...\n")

    demo_spectrum_splash(matrix)
    demo_spectrum_menu(matrix)
    demo_spectrum_loader(matrix)
    demo_spectrum_game_over(matrix)
    demo_spectrum_high_score(matrix)
    demo_spectrum_character_set(matrix)
    demo_final_title_card(matrix)

    print("\n" + "=" * 64)
    print("ZX Spectrum showcase complete!")
    print()
    print("Classic Spectrum features:")
    print("  ✓ Rainbow borders")
    print("  ✓ Bright, saturated colors")
    print("  ✓ 8x8 character grid")
    print("  ✓ Block graphics")
    print("  ✓ Tape loader effects")
    print("  ✓ Retro aesthetic")
    print()
    print("PRESS ANY KEY TO CONTINUE...")  # Just kidding! :)


if __name__ == '__main__':
    main()
