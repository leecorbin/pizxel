#!/usr/bin/env python3
"""
Demos App - Interactive Demo Launcher
Navigate with arrow keys, Enter to select, ESC/Q to quit
"""

import sys
import os
import subprocess

# Add matrixos to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from matrixos.led_api import create_matrix
from matrixos.input import KeyboardInput, Menu
from matrixos.config import parse_matrix_args


def run_demo(demo_file):
    """Run a demo script."""
    demo_path = os.path.join(os.path.dirname(__file__), demo_file)
    if os.path.exists(demo_path):
        print(f"\n{'='*64}")
        print(f"Launching: {demo_file}")
        print(f"{'='*64}\n")

        # Set up environment with project root in PYTHONPATH
        project_root = os.path.join(os.path.dirname(__file__), '..', '..')
        project_root = os.path.abspath(project_root)
        env = os.environ.copy()
        if 'PYTHONPATH' in env:
            env['PYTHONPATH'] = f"{project_root}:{env['PYTHONPATH']}"
        else:
            env['PYTHONPATH'] = project_root

        subprocess.run([sys.executable, demo_path], env=env)
        print(f"\n{'='*64}")
        print("Demo finished. Press any key to return to menu...")
        print(f"{'='*64}\n")
        return True
    return False


def main():
    """Main demo launcher."""
    # Parse command-line arguments
    args = parse_matrix_args("MatrixOS Demos")

    print("\n" + "="*64)
    print("MATRIXOS - DEMOS")
    print("="*64)
    print(f"\nResolution: {args.width}x{args.height} ({args.color_mode.upper()})")
    print("\nControls:")
    print("  ↑/↓    - Navigate menu")
    print("  Enter  - Select demo")
    print("  ESC/Q  - Back to launcher")
    print("\n" + "="*64 + "\n")

    # Create matrix and input
    matrix = create_matrix(args.width, args.height, args.color_mode)

    with KeyboardInput() as input_handler:
        running = True
        while running:
            # Create menu
            menu = Menu(matrix, input_handler, "DEMOS")

            # Add demo items
            demos = [
                ("HELLO WORLD", "hello_world.py"),
                ("GRAPHICS", "graphics_showcase.py"),
                ("TEXT", "text_showcase.py"),
                ("COMBINED", "combined_demo.py"),
                ("ANIMATION", "animation_demo.py"),
                ("PLASMA FX", "plasma_demo.py"),
                ("PHYSICS", "physics_demo.py"),
                ("STARFIELD", "starfield_demo.py"),
                ("RETRO MENU", "zx_spectrum_menu.py"),
                ("BACK", None),
            ]

            for label, demo_file in demos:
                if demo_file:
                    menu.add_item(
                        label,
                        callback=lambda f=demo_file: run_demo(f)
                    )
                else:
                    menu.add_item(label, callback=None)

            # Run menu
            selected = menu.run()

            if selected == "BACK" or selected is None:
                running = False
            else:
                # Demo was run, wait for key before showing menu again
                input_handler.wait_for_key()

    print("\n" + "="*64)
    print("Returning to launcher...")
    print("="*64 + "\n")


if __name__ == '__main__':
    main()
