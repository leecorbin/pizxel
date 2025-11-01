#!/usr/bin/env python3
"""
START HERE - Interactive Demo Launcher
Navigate with arrow keys, Enter to select, ESC/Q to quit
"""

import sys
import os
import time
import subprocess

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.led_api import create_matrix
from src.input import KeyboardInput, Menu


def show_splash(matrix):
    """Show ZX Spectrum style splash screen."""
    matrix.clear()
    matrix.fill((0, 0, 0))

    # Rainbow border
    colors = [
        (255, 0, 0), (255, 128, 0), (255, 255, 0),
        (0, 255, 0), (0, 255, 255), (0, 0, 255), (255, 0, 255)
    ]

    for i in range(3):
        color = colors[i % len(colors)]
        matrix.rect(i, i, 64 - 2*i, 64 - 2*i, color, fill=False)

    # Title
    matrix.centered_text("PI", 12, (0, 255, 255))
    matrix.centered_text("MATRIX", 20, (0, 255, 255))

    # Loading bars
    bar_y = 32
    for i in range(5):
        color = colors[i]
        matrix.rect(8, bar_y, 48, 2, color, fill=True)
        bar_y += 3

    # Version
    matrix.centered_text("V1.0", 52, (255, 255, 255))

    matrix.show()
    time.sleep(1.5)


def run_demo(demo_file):
    """Run a demo script."""
    demo_path = os.path.join(os.path.dirname(__file__), demo_file)
    if os.path.exists(demo_path):
        print(f"\n{'='*64}")
        print(f"Launching: {demo_file}")
        print(f"{'='*64}\n")
        subprocess.run([sys.executable, demo_path])
        print(f"\n{'='*64}")
        print("Demo finished. Press any key to return to menu...")
        print(f"{'='*64}\n")
        return True
    return False


def main():
    """Main demo launcher."""
    print("\n" + "="*64)
    print("PI-MATRIX DEMO LAUNCHER")
    print("="*64)
    print("\nControls:")
    print("  ↑/↓    - Navigate menu")
    print("  Enter  - Select demo")
    print("  ESC/Q  - Quit")
    print("  0-9    - Quick select demo")
    print("  S/B/T  - Quick select game (Snake/Breakout/Tetris)")
    print("\n" + "="*64 + "\n")

    # Create matrix and input
    matrix = create_matrix(64, 64, 'rgb')

    with KeyboardInput() as input_handler:
        # Show splash
        show_splash(matrix)

        running = True
        while running:
            # Create menu
            menu = Menu(matrix, input_handler, "DEMOS")

            # Add demo items
            demos = [
                ("HELLO", "hello_world.py", "1"),
                ("GRAPH", "graphics_showcase.py", "2"),
                ("TEXT", "text_showcase.py", "3"),
                ("UI", "combined_demo.py", "4"),
                ("ANIM", "animation_demo.py", "5"),
                ("FX", "plasma_demo.py", "6"),
                ("PHYS", "physics_demo.py", "7"),
                ("STAR", "starfield_demo.py", "8"),
                ("RETRO", "zx_spectrum_menu.py", "9"),
                ("DRAW", "interactive_app_example.py", "0"),
                ("SNAKE", "game_snake.py", "S"),
                ("BREAK", "game_breakout.py", "B"),
                ("TETRS", "game_tetris.py", "T"),
                ("QUIT", None, "Q"),
            ]

            for label, demo_file, shortcut in demos:
                if demo_file:
                    menu.add_item(
                        label,
                        callback=lambda f=demo_file: run_demo(f),
                        shortcut=shortcut
                    )
                else:
                    menu.add_item(label, callback=None, shortcut=shortcut)

            # Run menu
            selected = menu.run()

            if selected == "QUIT" or selected is None:
                running = False
            else:
                # Demo was run, wait for key before showing menu again
                input_handler.wait_for_key()

    # Clean exit
    print("\n" + "="*64)
    print("Thanks for exploring Pi-Matrix!")
    print("="*64 + "\n")


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nExiting Pi-Matrix Demo Launcher.")
    except Exception as e:
        print(f"\n\nError: {e}")
        import traceback
        traceback.print_exc()
