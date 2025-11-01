#!/usr/bin/env python3
"""
Hello World - Simple example to get started
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.led_api import create_matrix


def main():
    # Create a 64x64 RGB LED matrix
    matrix = create_matrix(64, 64, 'rgb')

    # Clear the display
    matrix.clear()

    # Draw some graphics
    matrix.circle(32, 32, 20, (0, 100, 255), fill=True)
    matrix.circle(32, 32, 20, (255, 255, 255), fill=False)

    # Add text
    matrix.centered_text("HELLO", 20, (255, 255, 0))
    matrix.centered_text("WORLD!", 35, (255, 255, 255))

    # Show on terminal
    matrix.show()


if __name__ == '__main__':
    main()
