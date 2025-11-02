"""
MatrixOS Launcher
Displays app icons in a grid and allows navigation/launching

All apps use the framework - no subprocess execution.
"""

import json
import importlib.util
from pathlib import Path
from matrixos import layout  # Import layout helpers


# Legacy 8-color palette (for backward compatibility)
COLOR_PALETTE = {
    0: None,              # Transparent (special case)
    1: (255, 255, 255),   # White
    2: (255, 0, 0),       # Red
    3: (0, 255, 0),       # Green
    4: (0, 0, 255),       # Blue
    5: (255, 255, 0),     # Yellow
    6: (0, 255, 255),     # Cyan
    7: (255, 0, 255),     # Magenta
}


class App:
    """Represents a MatrixOS app."""

    def __init__(self, folder_path):
        self.folder_path = Path(folder_path)
        self.name = "Unknown"
        self.author = "Unknown"
        self.version = "1.0.0"
        self.description = ""
        self.icon_pixels = None
        self.icon_format = "palette"  # "palette", "rgb", or "hex"
        self.icon_native_size = 16  # Native size of the icon (16 or 32)

        self._load_config()
        self._load_icon()

    def _load_config(self):
        """Load app config from config.json."""
        config_path = self.folder_path / "config.json"
        if config_path.exists():
            with open(config_path, 'r') as f:
                config = json.load(f)
                self.name = config.get("name", self.folder_path.name)
                self.author = config.get("author", "Unknown")
                self.version = config.get("version", "1.0.0")
                self.description = config.get("description", "")

    def _load_icon(self):
        """Load app icon from icon.json (or icon32.json for 32×32).
        
        Supports multiple formats:
        - RGB format: {"format": "rgb", "pixels": [[[r,g,b], ...], ...]}
        - Hex format: {"format": "hex", "pixels": [["#RRGGBB", ...], ...]}
        - Palette format (legacy): {"pixels": [[0-7, ...], ...]}
        """
        # Try to load 32×32 icon first (for high-res displays)
        icon32_path = self.folder_path / "icon32.json"
        if icon32_path.exists():
            icon_data = self._parse_icon_file(icon32_path)
            if icon_data:
                self.icon_pixels, self.icon_format = icon_data
                self.icon_native_size = len(self.icon_pixels)
                return
        
        # Fall back to 16×16 icon
        icon_path = self.folder_path / "icon.json"
        if icon_path.exists():
            icon_data = self._parse_icon_file(icon_path)
            if icon_data:
                self.icon_pixels, self.icon_format = icon_data
                self.icon_native_size = len(self.icon_pixels)
                return
        
        # No icon found
        self.icon_pixels = None
        self.icon_format = "palette"
        self.icon_native_size = 16
    
    def _parse_icon_file(self, path):
        """Parse icon file and return (pixels, format) tuple.
        
        Returns:
            Tuple of (pixel_data, format_string) or None if invalid
            format_string is "rgb", "hex", or "palette"
        """
        try:
            with open(path, 'r') as f:
                icon_data = json.load(f)
            
            pixels = icon_data.get("pixels", [])
            if not pixels:
                return None
            
            # Detect format
            format_type = icon_data.get("format", "auto")
            
            if format_type == "rgb" or (format_type == "auto" and isinstance(pixels[0][0], list)):
                # RGB format: [[[r,g,b], [r,g,b], ...], ...]
                return (pixels, "rgb")
            
            elif format_type == "hex" or (format_type == "auto" and isinstance(pixels[0][0], str)):
                # Hex format: [["#RRGGBB", "#RRGGBB", ...], ...]
                # Convert to RGB
                rgb_pixels = []
                for row in pixels:
                    rgb_row = []
                    for hex_color in row:
                        if hex_color is None or hex_color == "null" or hex_color == "":
                            rgb_row.append(None)
                        else:
                            # Parse hex color
                            hex_color = hex_color.lstrip('#')
                            r = int(hex_color[0:2], 16)
                            g = int(hex_color[2:4], 16)
                            b = int(hex_color[4:6], 16)
                            rgb_row.append([r, g, b])
                    rgb_pixels.append(rgb_row)
                return (rgb_pixels, "rgb")
            
            else:
                # Palette format (legacy): [[0-7, 0-7, ...], ...]
                return (pixels, "palette")
        
        except Exception as e:
            print(f"Error loading icon {path}: {e}")
            return None

    def draw_icon(self, matrix, x, y, size=16):
        """Draw the app icon at the given position, scaled to size.
        
        Args:
            matrix: Display matrix
            x, y: Top-left position
            size: Icon size (default 16, but can be 32 for larger displays)
        """
        if not self.icon_pixels:
            # Draw default icon if no icon file
            matrix.rect(x, y, size, size, (100, 100, 100), fill=True)
            return

        # Calculate scale factor
        scale = size / self.icon_native_size
        
        if scale == 1.0:
            # No scaling needed - draw directly
            for row_idx, row in enumerate(self.icon_pixels):
                for col_idx, pixel in enumerate(row):
                    color = self._get_pixel_color(pixel)
                    if color:  # Skip transparent pixels
                        matrix.set_pixel(x + col_idx, y + row_idx, color)
        else:
            # Scale (nearest neighbor for crisp pixels)
            for row_idx, row in enumerate(self.icon_pixels):
                for col_idx, pixel in enumerate(row):
                    color = self._get_pixel_color(pixel)
                    if color:  # Skip transparent pixels
                        # Draw scaled pixel as a rectangle
                        px = int(x + col_idx * scale)
                        py = int(y + row_idx * scale)
                        pw = max(1, int(scale))
                        ph = max(1, int(scale))
                        if pw == 1 and ph == 1:
                            matrix.set_pixel(px, py, color)
                        else:
                            matrix.rect(px, py, pw, ph, color, fill=True)
    
    def _get_pixel_color(self, pixel):
        """Convert pixel data to RGB color tuple.
        
        Args:
            pixel: Either a palette index (int), RGB list [r,g,b], or None
            
        Returns:
            RGB tuple (r,g,b) or None for transparent
        """
        if pixel is None:
            return None
        
        if self.icon_format == "rgb":
            # Direct RGB format
            if pixel is None or pixel == []:
                return None
            return tuple(pixel)
        
        else:  # palette format
            # Legacy palette index
            if pixel == 0:
                return None  # Transparent
            return COLOR_PALETTE.get(pixel, (255, 255, 255))

    def launch(self, os_context):
        """Launch the app using the framework.

        Args:
            os_context: OSContext for app execution

        Returns:
            True if app was launched successfully
        """
        main_py = self.folder_path / "main.py"
        if not main_py.exists():
            return False

        print(f"\n{'='*64}")
        print(f"Launching: {self.name}")
        print(f"{'='*64}\n")

        try:
            # Import app module
            spec = importlib.util.spec_from_file_location(
                f"app_{self.folder_path.name}",
                main_py
            )
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)

            # Call the app's run() function
            if hasattr(module, 'run'):
                module.run(os_context)
            else:
                print(f"Error: App '{self.name}' missing run(os_context) function!")
                return False

            print(f"\n{'='*64}")
            print(f"{self.name} exited.")
            print(f"{'='*64}\n")
            return True

        except Exception as e:
            print(f"Error loading app: {e}")
            import traceback
            traceback.print_exc()
            return False


class Launcher:
    """MatrixOS app launcher with icon grid."""

    def __init__(self, matrix, input_handler, os_context=None, apps_base_dir=None):
        self.matrix = matrix
        self.input_handler = input_handler
        self.os_context = os_context
        self.apps_base_dir = Path(apps_base_dir) if apps_base_dir else Path(__file__).parent.parent.parent
        self.apps = []
        self.selected_index = 0
        
        # Use responsive icon sizing!
        self.icon_size = layout.get_icon_size(matrix)  # 16 for 64×64, 32 for 128×128
        self.padding = 4 if self.icon_size >= 32 else 2  # More padding for larger icons

        # Calculate grid layout
        self.grid_width = (matrix.width + self.padding) // (self.icon_size + self.padding)
        self.grid_height = (matrix.height - 10 + self.padding) // (self.icon_size + self.padding)  # Reserve 10px for text at bottom

        self._discover_apps()

    def _discover_apps(self):
        """Discover all valid apps in the apps/ directory and root."""
        # Check apps/ directory
        apps_dir = self.apps_base_dir / "apps"
        if apps_dir.exists():
            for folder in sorted(apps_dir.iterdir()):
                if folder.is_dir() and self._is_valid_app(folder):
                    self.apps.append(App(folder))

        # Also check root directory for app folders
        for folder in sorted(self.apps_base_dir.iterdir()):
            if folder.is_dir() and folder.name not in ['apps', 'matrixos', 'examples', 'tests', 'venv', '.git', 'docs']:
                if self._is_valid_app(folder):
                    self.apps.append(App(folder))

    def _is_valid_app(self, folder_path):
        """Check if a folder is a valid app."""
        main_py = folder_path / "main.py"
        config_json = folder_path / "config.json"
        return main_py.exists() and config_json.exists()

    def draw(self):
        """Draw the launcher UI."""
        self.matrix.clear()
        self.matrix.fill((0, 0, 0))

        # Draw app icons in grid
        for idx, app in enumerate(self.apps):
            if idx >= self.grid_width * self.grid_height:
                break  # Don't draw more than can fit

            row = idx // self.grid_width
            col = idx % self.grid_width

            x = col * (self.icon_size + self.padding) + self.padding
            y = row * (self.icon_size + self.padding) + self.padding

            # Draw selection box
            if idx == self.selected_index:
                self.matrix.rect(x - 1, y - 1, self.icon_size + 2, self.icon_size + 2, (255, 255, 0), fill=False)

            # Draw icon (passing size for scaling!)
            app.draw_icon(self.matrix, x, y, size=self.icon_size)

        # Draw selected app name at bottom (using layout helper!)
        if 0 <= self.selected_index < len(self.apps):
            selected_app = self.apps[self.selected_index]
            text_y = self.matrix.height - 8
            layout.center_text(self.matrix, selected_app.name.upper(), text_y, (255, 255, 255))

        self.matrix.show()

    def run(self):
        """Run the launcher main loop."""
        running = True
        needs_redraw = True  # Initial draw

        while running:
            # Only draw when needed (not every frame)
            if needs_redraw:
                self.draw()
                needs_redraw = False

            # Handle input
            event = self.input_handler.get_key(timeout=0.1)

            if event:
                if event.key == 'UP':
                    new_row = (self.selected_index // self.grid_width) - 1
                    if new_row >= 0:
                        self.selected_index -= self.grid_width
                        needs_redraw = True

                elif event.key == 'DOWN':
                    new_row = (self.selected_index // self.grid_width) + 1
                    if new_row * self.grid_width < len(self.apps):
                        self.selected_index = min(self.selected_index + self.grid_width, len(self.apps) - 1)
                        needs_redraw = True

                elif event.key == 'LEFT':
                    if self.selected_index % self.grid_width > 0:
                        self.selected_index -= 1
                        needs_redraw = True

                elif event.key == 'RIGHT':
                    if self.selected_index % self.grid_width < self.grid_width - 1 and self.selected_index < len(self.apps) - 1:
                        self.selected_index += 1
                        needs_redraw = True

                elif event.key == 'OK':  # Enter key maps to OK
                    if 0 <= self.selected_index < len(self.apps):
                        selected_app = self.apps[self.selected_index]
                        selected_app.launch(self.os_context)
                        # Redraw after returning from app
                        needs_redraw = True

                elif event.key == 'BACK' or event.key == 'QUIT':  # ESC or Q
                    running = False
