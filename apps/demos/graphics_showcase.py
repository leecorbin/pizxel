#!/usr/bin/env python3
"""
Graphics Showcase - Demonstrates all drawing primitives
"""

import sys
import os
import time

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from matrixos.led_api import create_matrix
from matrixos.config import parse_matrix_args
from matrixos.layout import LayoutHelper


def demo_shapes(matrix, layout):
    """Show all basic shapes."""
    print("Basic Shapes")
    matrix.clear()

    # Circles (scaled)
    x1, y1, r = layout.scale_x_value(16), layout.scale_y_value(16), layout.scale_x_value(10)
    matrix.circle(x1, y1, r, (255, 0, 0), fill=True)
    matrix.circle(x1, y1, r, (255, 255, 255), fill=False)

    # Rectangle (scaled)
    x2, y2 = layout.scale_x_value(32), layout.scale_y_value(6)
    w, h = layout.scale_x_value(20), layout.scale_y_value(20)
    matrix.rect(x2, y2, w, h, (0, 255, 0), fill=False)
    matrix.rect(x2+2, y2+2, w-4, h-4, (0, 200, 0), fill=True)

    # Triangle
    matrix.triangle(10, 40, 20, 55, 0, 55, (0, 0, 255), fill=True)

    # Star
    matrix.star(42, 47, 10, points=5, color=(255, 255, 0), fill=True)
    matrix.star(42, 47, 10, points=5, color=(255, 128, 0), fill=False)

    matrix.show()
    time.sleep(2)


def demo_lines(matrix):
    """Show line drawing."""
    print("Lines and Patterns")
    matrix.clear()

    # Radial lines
    cx, cy = 32, 32
    for angle in range(0, 360, 15):
        import math
        rad = math.radians(angle)
        x = int(cx + 30 * math.cos(rad))
        y = int(cy + 30 * math.sin(rad))

        # Rainbow colors
        hue = angle
        r = int(127 + 127 * math.sin(math.radians(hue)))
        g = int(127 + 127 * math.sin(math.radians(hue + 120)))
        b = int(127 + 127 * math.sin(math.radians(hue + 240)))

        matrix.line(cx, cy, x, y, (r, g, b))

    matrix.show()
    time.sleep(2)


def demo_filled_shapes(matrix):
    """Show filled shapes with outlines."""
    print("Filled Shapes with Outlines")
    matrix.clear()

    # Circle with outline
    matrix.circle_outline(16, 16, 12, (100, 100, 255), (255, 255, 255), thickness=2)

    # Rounded rectangle
    matrix.rounded_rect(32, 4, 28, 24, 6, (255, 100, 100), fill=True)
    matrix.rounded_rect(32, 4, 28, 24, 6, (255, 255, 255), fill=False)

    # Polygon (house shape)
    house = [(10, 50), (20, 40), (30, 50), (30, 60), (10, 60)]
    matrix.polygon(house, (150, 150, 0), fill=True)
    matrix.polygon(house, (255, 255, 0), fill=False)

    # Ellipse
    matrix.ellipse(48, 48, 14, 8, (255, 0, 255), fill=True)
    matrix.ellipse(48, 48, 14, 8, (255, 255, 255), fill=False)

    matrix.show()
    time.sleep(2)


def demo_patterns(matrix):
    """Create interesting patterns."""
    print("Geometric Patterns")
    matrix.clear()

    # Concentric circles
    for r in range(5, 31, 5):
        intensity = int(255 * (r / 30))
        matrix.circle(32, 32, r, (intensity, 0, 255 - intensity), fill=False)

    # Diagonal lines
    for i in range(0, 64, 4):
        color_val = int(255 * i / 64)
        matrix.line(i, 0, 63 - i, 63, (color_val, 255 - color_val, 128))

    matrix.show()
    time.sleep(2)


def demo_pixel_art(matrix):
    """Create simple pixel art."""
    print("Pixel Art")
    matrix.clear()

    # Draw a simple smiley face
    # Face circle
    matrix.circle(32, 32, 20, (255, 255, 0), fill=True)
    matrix.circle(32, 32, 20, (255, 200, 0), fill=False)

    # Eyes
    matrix.circle(25, 27, 3, (0, 0, 0), fill=True)
    matrix.circle(39, 27, 3, (0, 0, 0), fill=True)

    # Smile (arc approximated with line)
    import math
    smile_points = []
    for angle in range(30, 151, 5):
        rad = math.radians(angle)
        x = int(32 + 12 * math.cos(rad))
        y = int(32 + 12 * math.sin(rad))
        smile_points.append((x, y))

    for i in range(len(smile_points) - 1):
        x0, y0 = smile_points[i]
        x1, y1 = smile_points[i + 1]
        matrix.line(x0, y0, x1, y1, (0, 0, 0))

    matrix.show()
    time.sleep(2)


def main():
    """Run graphics showcase."""
    print("=" * 50)
    print("LED Matrix Graphics Showcase")
    print("=" * 50)
    print()

    # Create 64x64 RGB matrix
    args = parse_matrix_args(os.path.basename(__file__).replace('.py', '').replace('_', ' ').title())
    matrix = create_matrix(args.width, args.height, args.color_mode)
    layout = LayoutHelper(matrix.width, matrix.height)

    print("Demonstrating graphics primitives...\n")

    demo_shapes(matrix)
    demo_lines(matrix)
    demo_filled_shapes(matrix)
    demo_patterns(matrix)
    demo_pixel_art(matrix)

    print("\n" + "=" * 50)
    print("Graphics showcase complete!")
    print()
    print("Available drawing functions:")
    print("  - line, rect, rounded_rect")
    print("  - circle, circle_outline, ellipse")
    print("  - triangle, polygon, star")
    print("  - flood_fill, set_pixel")
    print()
    print("All shapes support:")
    print("  - RGB colors: (r, g, b) tuples")
    print("  - Fill and outline modes")
    print("  - Pixel-perfect rendering")


if __name__ == '__main__':
    main()
