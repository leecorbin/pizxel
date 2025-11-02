"""
Layout utilities for resolution-agnostic display code.
Helps create displays that adapt to any matrix size.
"""


def scale_value(base_value, current_size, base_size=64):
    """
    Scale a value proportionally based on current vs base resolution.

    Args:
        base_value: The value at base resolution
        current_size: Current resolution dimension
        base_size: Base resolution (default 64)

    Returns:
        Scaled value (rounded to int)
    """
    return int(base_value * current_size / base_size)


def center_x(width, item_width):
    """Calculate X position to center an item."""
    return (width - item_width) // 2


def center_y(height, item_height):
    """Calculate Y position to center an item."""
    return (height - item_height) // 2


def grid_cols(width, char_width=8):
    """Calculate number of character columns available."""
    return width // char_width


def grid_rows(height, char_height=8):
    """Calculate number of character rows available."""
    return height // char_height


def grid_to_pixel_x(col, char_width=8):
    """Convert grid column to pixel X coordinate."""
    return col * char_width


def grid_to_pixel_y(row, char_height=8):
    """Convert grid row to pixel Y coordinate."""
    return row * char_height


def clamp(value, min_val, max_val):
    """Clamp value between min and max."""
    return max(min_val, min(value, max_val))


def safe_bounds(x, y, width, height, matrix_width, matrix_height):
    """
    Ensure coordinates and dimensions are within matrix bounds.

    Returns:
        Tuple of (clamped_x, clamped_y, safe_width, safe_height)
    """
    x = clamp(x, 0, matrix_width - 1)
    y = clamp(y, 0, matrix_height - 1)
    width = clamp(width, 1, matrix_width - x)
    height = clamp(height, 1, matrix_height - y)
    return x, y, width, height


class LayoutHelper:
    """
    Helper class for resolution-agnostic layouts.
    Stores matrix dimensions and provides scaling utilities.
    """

    def __init__(self, matrix_width, matrix_height, base_width=64, base_height=64):
        """
        Initialize layout helper.

        Args:
            matrix_width: Current matrix width
            matrix_height: Current matrix height
            base_width: Base width for scaling (default 64)
            base_height: Base height for scaling (default 64)
        """
        self.width = matrix_width
        self.height = matrix_height
        self.base_width = base_width
        self.base_height = base_height

        # Calculate scaling factors
        self.scale_x = matrix_width / base_width
        self.scale_y = matrix_height / base_height

        # Character grid info
        self.cols = grid_cols(matrix_width)
        self.rows = grid_rows(matrix_height)

    def scale_x_value(self, value):
        """Scale a horizontal value."""
        return int(value * self.scale_x)

    def scale_y_value(self, value):
        """Scale a vertical value."""
        return int(value * self.scale_y)

    def scale_size(self, width, height):
        """Scale width and height."""
        return self.scale_x_value(width), self.scale_y_value(height)

    def center_x(self, item_width):
        """Calculate centered X position."""
        return center_x(self.width, item_width)

    def center_y(self, item_height):
        """Calculate centered Y position."""
        return center_y(self.height, item_height)

    def center_point(self, item_width, item_height):
        """Calculate centered position (x, y)."""
        return self.center_x(item_width), self.center_y(item_height)

    def grid_center_x(self):
        """Get center column in character grid."""
        return self.cols // 2

    def grid_center_y(self):
        """Get center row in character grid."""
        return self.rows // 2

    def safe_bounds(self, x, y, width, height):
        """Ensure coordinates are within bounds."""
        return safe_bounds(x, y, width, height, self.width, self.height)
