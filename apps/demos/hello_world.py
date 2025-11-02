#!/usr/bin/env python3
"""
Hello World - Simple example to get started
Works at any resolution!
"""

import sys
import os

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from matrixos.led_api import create_matrix
from matrixos.config import parse_matrix_args
from matrixos.layout import LayoutHelper


def main():
    # Parse command-line arguments for resolution
    args = parse_matrix_args("Hello World Example")

    # Create matrix at specified resolution
    matrix = create_matrix(args.width, args.height, args.color_mode)

    # Create layout helper for resolution-agnostic positioning
    layout = LayoutHelper(matrix.width, matrix.height)

    # Clear the display
    matrix.clear()

    # Draw a circle in the center (scaled to resolution)
    center_x = matrix.width // 2
    center_y = matrix.height // 2
    radius = layout.scale_x_value(20)  # Scale from base 64x64

    matrix.circle(center_x, center_y, radius, (0, 100, 255), fill=True)
    matrix.circle(center_x, center_y, radius, (255, 255, 255), fill=False)

    # Add text (centered, positioned based on resolution)
    text_y1 = center_y - layout.scale_y_value(12)
    text_y2 = center_y + layout.scale_y_value(7)

    matrix.centered_text("HELLO", text_y1, (255, 255, 0))
    matrix.centered_text("WORLD!", text_y2, (255, 255, 255))

    # Show on terminal
    matrix.show()


if __name__ == '__main__':
    main()
