"""
Graphics primitives for LED matrix display.
All functions support RGB color.
"""

from typing import Tuple, Optional, Union
import math


# Type alias for color - can be bool (mono) or RGB tuple
Color = Union[bool, Tuple[int, int, int]]


def draw_line(display, x0: int, y0: int, x1: int, y1: int, color: Color = True):
    """
    Draw a line using Bresenham's algorithm.

    Args:
        display: Display instance
        x0, y0: Starting point
        x1, y1: Ending point
        color: True for mono, (r,g,b) for RGB
    """
    dx = abs(x1 - x0)
    dy = abs(y1 - y0)
    sx = 1 if x0 < x1 else -1
    sy = 1 if y0 < y1 else -1
    err = dx - dy

    x, y = x0, y0

    while True:
        display.set_pixel(x, y, color)

        if x == x1 and y == y1:
            break

        e2 = 2 * err
        if e2 > -dy:
            err -= dy
            x += sx
        if e2 < dx:
            err += dx
            y += sy


def draw_rect(display, x: int, y: int, width: int, height: int,
              color: Color = True, fill: bool = False):
    """
    Draw a rectangle.

    Args:
        display: Display instance
        x, y: Top-left corner
        width, height: Rectangle dimensions
        color: True for mono, (r,g,b) for RGB
        fill: If True, fill the rectangle
    """
    if fill:
        # Filled rectangle
        for dy in range(height):
            for dx in range(width):
                display.set_pixel(x + dx, y + dy, color)
    else:
        # Outline only
        # Top and bottom
        for dx in range(width):
            display.set_pixel(x + dx, y, color)
            display.set_pixel(x + dx, y + height - 1, color)
        # Left and right
        for dy in range(height):
            display.set_pixel(x, y + dy, color)
            display.set_pixel(x + width - 1, y + dy, color)


def draw_circle(display, cx: int, cy: int, radius: int,
                color: Color = True, fill: bool = False):
    """
    Draw a circle using midpoint circle algorithm.

    Args:
        display: Display instance
        cx, cy: Center point
        radius: Circle radius
        color: True for mono, (r,g,b) for RGB
        fill: If True, fill the circle
    """
    if fill:
        # Filled circle - draw horizontal lines
        for y in range(-radius, radius + 1):
            x = int(math.sqrt(radius * radius - y * y))
            draw_line(display, cx - x, cy + y, cx + x, cy + y, color)
    else:
        # Outline only - midpoint circle algorithm
        x = radius
        y = 0
        err = 0

        while x >= y:
            # Draw 8 octants
            display.set_pixel(cx + x, cy + y, color)
            display.set_pixel(cx + y, cy + x, color)
            display.set_pixel(cx - y, cy + x, color)
            display.set_pixel(cx - x, cy + y, color)
            display.set_pixel(cx - x, cy - y, color)
            display.set_pixel(cx - y, cy - x, color)
            display.set_pixel(cx + y, cy - x, color)
            display.set_pixel(cx + x, cy - y, color)

            if err <= 0:
                y += 1
                err += 2 * y + 1

            if err > 0:
                x -= 1
                err -= 2 * x + 1


def draw_circle_outline(display, cx: int, cy: int, radius: int,
                        color: Color = True, outline_color: Optional[Color] = None,
                        thickness: int = 1):
    """
    Draw a circle with optional colored outline.

    Args:
        display: Display instance
        cx, cy: Center point
        radius: Circle radius
        color: Fill color (True for mono, (r,g,b) for RGB)
        outline_color: Outline color (None = no outline)
        thickness: Outline thickness in pixels
    """
    # Draw filled circle
    draw_circle(display, cx, cy, radius, color, fill=True)

    # Draw outline if specified
    if outline_color is not None:
        for t in range(thickness):
            draw_circle(display, cx, cy, radius - t, outline_color, fill=False)


def draw_ellipse(display, cx: int, cy: int, rx: int, ry: int,
                 color: Color = True, fill: bool = False):
    """
    Draw an ellipse.

    Args:
        display: Display instance
        cx, cy: Center point
        rx: Horizontal radius
        ry: Vertical radius
        color: True for mono, (r,g,b) for RGB
        fill: If True, fill the ellipse
    """
    if fill:
        # Filled ellipse
        for y in range(-ry, ry + 1):
            x = int(rx * math.sqrt(1 - (y / ry) ** 2))
            draw_line(display, cx - x, cy + y, cx + x, cy + y, color)
    else:
        # Outline ellipse using midpoint algorithm
        rx2 = rx * rx
        ry2 = ry * ry

        # Region 1
        x = 0
        y = ry
        px = 0
        py = 2 * rx2 * y

        # Plot initial points
        def plot_ellipse_points(x, y):
            display.set_pixel(cx + x, cy + y, color)
            display.set_pixel(cx - x, cy + y, color)
            display.set_pixel(cx + x, cy - y, color)
            display.set_pixel(cx - x, cy - y, color)

        plot_ellipse_points(x, y)

        # Region 1
        p = ry2 - (rx2 * ry) + (0.25 * rx2)
        while px < py:
            x += 1
            px += 2 * ry2
            if p < 0:
                p += ry2 + px
            else:
                y -= 1
                py -= 2 * rx2
                p += ry2 + px - py
            plot_ellipse_points(x, y)

        # Region 2
        p = ry2 * (x + 0.5) ** 2 + rx2 * (y - 1) ** 2 - rx2 * ry2
        while y > 0:
            y -= 1
            py -= 2 * rx2
            if p > 0:
                p += rx2 - py
            else:
                x += 1
                px += 2 * ry2
                p += rx2 - py + px
            plot_ellipse_points(x, y)


def draw_triangle(display, x0: int, y0: int, x1: int, y1: int,
                  x2: int, y2: int, color: Color = True, fill: bool = False):
    """
    Draw a triangle.

    Args:
        display: Display instance
        x0, y0: First vertex
        x1, y1: Second vertex
        x2, y2: Third vertex
        color: True for mono, (r,g,b) for RGB
        fill: If True, fill the triangle
    """
    if fill:
        # Filled triangle using scanline algorithm
        # Sort vertices by y coordinate
        points = sorted([(x0, y0), (x1, y1), (x2, y2)], key=lambda p: p[1])
        (x0, y0), (x1, y1), (x2, y2) = points

        def interpolate(x0, y0, x1, y1, y):
            """Get x coordinate for given y on line from (x0,y0) to (x1,y1)."""
            if y1 == y0:
                return x0
            return x0 + (x1 - x0) * (y - y0) / (y1 - y0)

        # Draw triangle
        for y in range(y0, y2 + 1):
            if y < y1:
                # Upper part
                xa = interpolate(x0, y0, x1, y1, y)
                xb = interpolate(x0, y0, x2, y2, y)
            else:
                # Lower part
                xa = interpolate(x1, y1, x2, y2, y)
                xb = interpolate(x0, y0, x2, y2, y)

            if xa > xb:
                xa, xb = xb, xa

            for x in range(int(xa), int(xb) + 1):
                display.set_pixel(x, y, color)
    else:
        # Outline only
        draw_line(display, x0, y0, x1, y1, color)
        draw_line(display, x1, y1, x2, y2, color)
        draw_line(display, x2, y2, x0, y0, color)


def draw_polygon(display, points: list, color: Color = True, fill: bool = False):
    """
    Draw a polygon from a list of points.

    Args:
        display: Display instance
        points: List of (x, y) tuples
        color: True for mono, (r,g,b) for RGB
        fill: If True, fill the polygon
    """
    if len(points) < 3:
        return

    if fill:
        # Use scanline fill algorithm
        # This is simplified - for complex polygons you'd want a better algorithm
        # For now, just draw triangles from first point to each edge
        for i in range(1, len(points) - 1):
            draw_triangle(display,
                         points[0][0], points[0][1],
                         points[i][0], points[i][1],
                         points[i + 1][0], points[i + 1][1],
                         color, fill=True)
    else:
        # Draw outline
        for i in range(len(points)):
            x0, y0 = points[i]
            x1, y1 = points[(i + 1) % len(points)]
            draw_line(display, x0, y0, x1, y1, color)


def draw_star(display, cx: int, cy: int, radius: int, points: int = 5,
              color: Color = True, fill: bool = False):
    """
    Draw a star shape.

    Args:
        display: Display instance
        cx, cy: Center point
        radius: Outer radius
        points: Number of star points
        color: True for mono, (r,g,b) for RGB
        fill: If True, fill the star
    """
    if points < 3:
        points = 3

    # Calculate star vertices
    inner_radius = radius * 0.4  # Inner points are 40% of outer radius
    vertices = []

    for i in range(points * 2):
        angle = (i * math.pi / points) - math.pi / 2
        r = radius if i % 2 == 0 else inner_radius
        x = cx + int(r * math.cos(angle))
        y = cy + int(r * math.sin(angle))
        vertices.append((x, y))

    draw_polygon(display, vertices, color, fill)


def flood_fill(display, x: int, y: int, color: Color):
    """
    Flood fill starting from point (x, y).

    Args:
        display: Display instance
        x, y: Starting point
        color: Fill color
    """
    if x < 0 or x >= display.width or y < 0 or y >= display.height:
        return

    target = display.get_pixel(x, y)

    # Don't fill if same color
    if target == color:
        return

    # Use stack-based flood fill to avoid recursion limits
    stack = [(x, y)]

    while stack:
        px, py = stack.pop()

        if px < 0 or px >= display.width or py < 0 or py >= display.height:
            continue

        if display.get_pixel(px, py) != target:
            continue

        display.set_pixel(px, py, color)

        # Add neighbors
        stack.append((px + 1, py))
        stack.append((px - 1, py))
        stack.append((px, py + 1))
        stack.append((px, py - 1))


def draw_rounded_rect(display, x: int, y: int, width: int, height: int,
                      radius: int, color: Color = True, fill: bool = False):
    """
    Draw a rounded rectangle.

    Args:
        display: Display instance
        x, y: Top-left corner
        width, height: Rectangle dimensions
        radius: Corner radius
        color: True for mono, (r,g,b) for RGB
        fill: If True, fill the rectangle
    """
    # Clamp radius
    radius = min(radius, width // 2, height // 2)

    if fill:
        # Fill main rectangles
        draw_rect(display, x + radius, y, width - 2 * radius, height, color, fill=True)
        draw_rect(display, x, y + radius, radius, height - 2 * radius, color, fill=True)
        draw_rect(display, x + width - radius, y + radius, radius, height - 2 * radius, color, fill=True)

        # Fill corners with circles
        draw_circle(display, x + radius, y + radius, radius, color, fill=True)
        draw_circle(display, x + width - radius - 1, y + radius, radius, color, fill=True)
        draw_circle(display, x + radius, y + height - radius - 1, radius, color, fill=True)
        draw_circle(display, x + width - radius - 1, y + height - radius - 1, radius, color, fill=True)
    else:
        # Draw straight edges
        draw_line(display, x + radius, y, x + width - radius - 1, y, color)  # Top
        draw_line(display, x + radius, y + height - 1, x + width - radius - 1, y + height - 1, color)  # Bottom
        draw_line(display, x, y + radius, x, y + height - radius - 1, color)  # Left
        draw_line(display, x + width - 1, y + radius, x + width - 1, y + height - radius - 1, color)  # Right

        # Draw corner arcs (simplified - draw quarter circles)
        # This is approximate but works for LED matrix resolution
        for angle in range(0, 90, 5):
            rad = math.radians(angle)
            # Top-left
            px = x + radius - int(radius * math.cos(rad + math.pi))
            py = y + radius - int(radius * math.sin(rad + math.pi))
            display.set_pixel(px, py, color)
            # Top-right
            px = x + width - radius - 1 - int(radius * math.cos(rad + math.pi / 2))
            py = y + radius - int(radius * math.sin(rad + math.pi / 2))
            display.set_pixel(px, py, color)
            # Bottom-left
            px = x + radius - int(radius * math.cos(rad - math.pi / 2))
            py = y + height - radius - 1 - int(radius * math.sin(rad - math.pi / 2))
            display.set_pixel(px, py, color)
            # Bottom-right
            px = x + width - radius - 1 - int(radius * math.cos(rad))
            py = y + height - radius - 1 - int(radius * math.sin(rad))
            display.set_pixel(px, py, color)
