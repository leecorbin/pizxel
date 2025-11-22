"""
MatrixOS Launcher
Displays app icons in a grid and allows navigation/launching

All apps use the framework - no subprocess execution.
"""

import json
import importlib.util
from pathlib import Path
from matrixos import layout  # Import layout helpers
from matrixos.input import InputEvent  # For key constants
from matrixos.emoji_loader import get_emoji_loader  # For emoji icons
from matrixos.logger import get_logger  # For logging

# Create logger for launcher
logger = get_logger("Launcher")


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
        logger.debug(f"App.__init__ started for {folder_path}")
        self.folder_path = Path(folder_path)
        self.name = "Unknown"
        self.author = "Unknown"
        self.version = "1.0.0"
        self.description = ""
        self.emoji_icon = None  # Emoji character if using emoji icon
        self.icon_pixels = None
        self.icon_format = "palette"  # "palette", "rgb", or "hex"
        self.icon_native_size = 16  # Native size of the icon (16 or 32)

        logger.debug(f"Loading config for {folder_path.name}")
        self._load_config()
        logger.debug(f"Loading icon for {folder_path.name}")
        self._load_icon()
        logger.debug(f"App.__init__ completed for {folder_path.name}")

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
                
                # Check if icon field specifies an emoji
                icon_field = config.get("icon", "")
                if icon_field and len(icon_field) <= 4 and not icon_field.endswith('.json'):
                    # Looks like an emoji character (1-4 chars, not a filename)
                    self.emoji_icon = icon_field

    def _load_icon(self):
        """Load app icon from icon.json (or icon32.json for 32×32).
        
        Supports multiple formats:
        - Emoji: Set emoji_icon in config.json OR {"emoji": "🎮"} in icon.json
        - RGB format: {"format": "rgb", "pixels": [[[r,g,b], ...], ...]}
        - Hex format: {"format": "hex", "pixels": [["#RRGGBB", ...], ...]}
        - Palette format (legacy): {"pixels": [[0-7, ...], ...]}
        """
        logger.debug(f"_load_icon started for {self.folder_path.name}")
        
        # Check if icon.json specifies an emoji
        if not self.emoji_icon:
            icon_path = self.folder_path / "icon.json"
            if icon_path.exists():
                try:
                    with open(icon_path, 'r') as f:
                        icon_data = json.load(f)
                        if "emoji" in icon_data:
                            self.emoji_icon = icon_data["emoji"]
                            logger.debug(f"Found emoji in icon.json: {self.emoji_icon}")
                except Exception as e:
                    logger.error(f"Error reading icon.json: {e}")
        
        # Check if we should load emoji icon first
        if self.emoji_icon:
            logger.debug(f"Loading emoji icon: {self.emoji_icon}")
            try:
                emoji_loader = get_emoji_loader()
                
                # Try to get emoji (sprite sheet first, then download if enabled)
                logger.debug(f"Calling get_emoji_with_fallback for {self.emoji_icon}")
                img = emoji_loader.get_emoji_with_fallback(self.emoji_icon, size=32, allow_download=True)
                logger.debug(f"get_emoji_with_fallback returned: {img is not None}")
                
                if img:
                    # Convert to icon JSON format
                    logger.debug(f"Converting emoji to icon JSON")
                    icon_data = emoji_loader.emoji_to_icon_json(self.emoji_icon, size=32)
                    if icon_data:
                        # Convert to RGB format expected by launcher
                        logger.debug(f"Loading emoji icon data")
                        self._load_emoji_icon_data(icon_data)
                        logger.debug(f"Emoji icon loaded successfully")
                        return
                else:
                    logger.warning(f"Emoji '{self.emoji_icon}' not available")
                    print(f"Warning: Emoji '{self.emoji_icon}' not available (sprite sheet: no, download: disabled/failed)")
            except Exception as e:
                logger.error(f"Error loading emoji icon '{self.emoji_icon}': {e}")
                print(f"Error loading emoji icon '{self.emoji_icon}': {e}")
                import traceback
                traceback.print_exc()
        
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
    
    def _load_emoji_icon_data(self, icon_data):
        """Convert emoji icon data from sprite sheet to RGB pixel format.
        
        Args:
            icon_data: Dict with 'width', 'height', 'data' (list of {x, y, c} sparse pixels)
        """
        size = icon_data['width']
        
        # Create empty RGBA array
        pixels = [[None for _ in range(size)] for _ in range(size)]
        
        # Fill in pixels from sparse data
        for pixel in icon_data['data']:
            x = pixel['x']
            y = pixel['y']
            rgb565 = pixel['c']
            
            # Convert RGB565 back to RGB888
            r = ((rgb565 >> 11) & 0x1F) << 3
            g = ((rgb565 >> 5) & 0x3F) << 2
            b = (rgb565 & 0x1F) << 3
            
            pixels[y][x] = [r, g, b]
        
        self.icon_pixels = pixels
        self.icon_format = "rgb"
        self.icon_native_size = size
    
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
        
        # ALWAYS use rect rendering to avoid gridline artifacts
        # (set_pixel seems to create gaps, rect with fill=True doesn't)
        for row_idx, row in enumerate(self.icon_pixels):
            for col_idx, pixel in enumerate(row):
                color = self._get_pixel_color(pixel)
                if color:  # Skip transparent pixels
                    # Draw scaled pixel as a rectangle (even if scale=1)
                    px = int(x + col_idx * scale)
                    py = int(y + row_idx * scale)
                    pw = max(1, int(scale))
                    ph = max(1, int(scale))
                    # Always use rect, never set_pixel
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
            
            color = tuple(pixel)
            
            # Filter out near-black pixels (anti-aliasing artifacts from emoji rendering)
            # These create the gridline effect when displayed
            if color != (0, 0, 0):  # Not pure black
                r, g, b = color
                # If all components are very dark, treat as transparent
                if r < 30 and g < 30 and b < 30:
                    return None
            
            return color
        
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
        logger.info(f"Launch requested for: {self.name}")
        main_py = self.folder_path / "main.py"
        if not main_py.exists():
            logger.error(f"main.py not found for {self.name}")
            return False

        print(f"\n{'='*64}")
        print(f"Launching: {self.name}")
        print(f"{'='*64}\n")

        try:
            # Import app module
            logger.debug(f"Creating module spec for {self.name}")
            spec = importlib.util.spec_from_file_location(
                f"app_{self.folder_path.name}",
                main_py
            )
            logger.debug(f"Creating module from spec for {self.name}")
            module = importlib.util.module_from_spec(spec)
            logger.debug(f"Executing module for {self.name}")
            spec.loader.exec_module(module)
            logger.debug(f"Module executed successfully for {self.name}")

            # Call the app's run() function
            if hasattr(module, 'run'):
                logger.info(f"Calling run() for {self.name}")
                module.run(os_context)
                logger.info(f"run() completed for {self.name}")
            else:
                logger.error(f"App '{self.name}' missing run(os_context) function!")
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
        self.current_page = 0  # For pagination
        
        # Use responsive icon sizing!
        self.icon_size = layout.get_icon_size(matrix)  # 16 for 64×64, 32 for 128×128
        self.padding = 4 if self.icon_size >= 32 else 2  # More padding for larger icons

        # Calculate grid layout
        self.grid_width = (matrix.width + self.padding) // (self.icon_size + self.padding)
        self.grid_height = (matrix.height - 10 + self.padding) // (self.icon_size + self.padding)  # Reserve 10px for text at bottom
        self.apps_per_page = self.grid_width * self.grid_height

        self._discover_apps()

    def get_help_text(self):
        """Return launcher-specific help."""
        total_pages = (len(self.apps) + self.apps_per_page - 1) // self.apps_per_page
        help_items = [
            ("↑↓←→", "Navigate apps"),
            ("ENTER", "Launch app"),
        ]
        
        if total_pages > 1:
            help_items.extend([
                ("L1/R1", "Prev/next page"),
                ("", f"Page {self.current_page + 1}/{total_pages}"),
            ])
        
        return help_items

    def _discover_apps(self):
        """Discover all valid apps from multiple directories.
        
        Scans in order:
        1. examples/ - Shipped example apps (games, demos)
        2. apps/ - User apps
        3. matrixos/apps/ - System apps (Settings) - listed last
        """
        logger.info("Starting app discovery")
        
        # Example apps first (examples/)
        examples_dir = self.apps_base_dir / "examples"
        if examples_dir.exists():
            logger.debug(f"Scanning examples directory: {examples_dir}")
            for folder in sorted(examples_dir.iterdir()):
                if folder.is_dir() and self._is_valid_app(folder):
                    logger.debug(f"Loading app from: {folder.name}")
                    try:
                        app = App(folder)
                        self.apps.append(app)
                        logger.info(f"Loaded: {app.name} ({folder.name})")
                    except Exception as e:
                        logger.error(f"Failed to load {folder.name}: {e}")
        
        # User apps second (apps/)
        user_apps_dir = self.apps_base_dir / "apps"
        if user_apps_dir.exists():
            logger.debug(f"Scanning user apps directory: {user_apps_dir}")
            for folder in sorted(user_apps_dir.iterdir()):
                if folder.is_dir() and self._is_valid_app(folder):
                    logger.debug(f"Loading app from: {folder.name}")
                    try:
                        app = App(folder)
                        self.apps.append(app)
                        logger.info(f"Loaded: {app.name} ({folder.name})")
                    except Exception as e:
                        logger.error(f"Failed to load {folder.name}: {e}")
        
        # System apps last (matrixos/apps/) - Settings at the end
        system_apps_dir = self.apps_base_dir / "matrixos" / "apps"
        if system_apps_dir.exists():
            logger.debug(f"Scanning system apps directory: {system_apps_dir}")
            for folder in sorted(system_apps_dir.iterdir()):
                if folder.is_dir() and self._is_valid_app(folder):
                    logger.debug(f"Loading app from: {folder.name}")
                    try:
                        app = App(folder)
                        self.apps.append(app)
                        logger.info(f"Loaded: {app.name} ({folder.name})")
                    except Exception as e:
                        logger.error(f"Failed to load {folder.name}: {e}")
        
        logger.info(f"Discovery complete: Found {len(self.apps)} apps")

    def _is_valid_app(self, folder_path):
        """Check if a folder is a valid app."""
        main_py = folder_path / "main.py"
        config_json = folder_path / "config.json"
        return main_py.exists() and config_json.exists()

    def draw(self):
        """Draw the launcher UI."""
        self.matrix.clear()
        self.matrix.fill((0, 0, 0))

        # Calculate pagination
        total_pages = (len(self.apps) + self.apps_per_page - 1) // self.apps_per_page
        start_idx = self.current_page * self.apps_per_page
        end_idx = min(start_idx + self.apps_per_page, len(self.apps))
        page_apps = self.apps[start_idx:end_idx]

        # Draw app icons in grid
        for page_idx, app in enumerate(page_apps):
            actual_idx = start_idx + page_idx
            
            row = page_idx // self.grid_width
            col = page_idx % self.grid_width

            x = col * (self.icon_size + self.padding) + self.padding
            y = row * (self.icon_size + self.padding) + self.padding

            # Draw selection box
            if actual_idx == self.selected_index:
                self.matrix.rect(x - 1, y - 1, self.icon_size + 2, self.icon_size + 2, (255, 255, 0), fill=False)

            # Draw icon (passing size for scaling!)
            app.draw_icon(self.matrix, x, y, size=self.icon_size)

        # Draw selected app name at bottom (using layout helper!)
        if 0 <= self.selected_index < len(self.apps):
            selected_app = self.apps[self.selected_index]
            text_y = self.matrix.height - 8
            
            # Show page indicator if multiple pages
            total_pages = (len(self.apps) + self.apps_per_page - 1) // self.apps_per_page
            if total_pages > 1:
                page_text = f"{selected_app.name.upper()} ({self.current_page + 1}/{total_pages})"
                layout.center_text(self.matrix, page_text, text_y, (255, 255, 255))
            else:
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
                # Calculate current page bounds
                total_pages = (len(self.apps) + self.apps_per_page - 1) // self.apps_per_page
                page_start = self.current_page * self.apps_per_page
                page_end = min(page_start + self.apps_per_page, len(self.apps))
                page_size = page_end - page_start
                
                # Get position within current page
                page_index = self.selected_index - page_start
                page_row = page_index // self.grid_width
                page_col = page_index % self.grid_width
                
                if event.key == 'UP':
                    if page_row > 0:
                        self.selected_index -= self.grid_width
                        needs_redraw = True
                    elif self.current_page > 0:
                        # At top of page, go to previous page
                        self.current_page -= 1
                        # Select bottom row of previous page, same column
                        prev_page_start = self.current_page * self.apps_per_page
                        prev_page_end = min(prev_page_start + self.apps_per_page, len(self.apps))
                        prev_page_size = prev_page_end - prev_page_start
                        # Find last row on previous page
                        last_row = (prev_page_size - 1) // self.grid_width
                        self.selected_index = prev_page_start + (last_row * self.grid_width) + page_col
                        # Make sure we don't go past the end
                        self.selected_index = min(self.selected_index, prev_page_end - 1)
                        needs_redraw = True

                elif event.key == 'DOWN':
                    new_index = self.selected_index + self.grid_width
                    if new_index < page_end:
                        self.selected_index = new_index
                        needs_redraw = True
                    elif self.current_page < total_pages - 1:
                        # At bottom of page, go to next page
                        self.current_page += 1
                        # Select top row of next page, same column
                        next_page_start = self.current_page * self.apps_per_page
                        self.selected_index = next_page_start + page_col
                        # Make sure we don't go past the end
                        next_page_end = min(next_page_start + self.apps_per_page, len(self.apps))
                        self.selected_index = min(self.selected_index, next_page_end - 1)
                        needs_redraw = True

                elif event.key == 'LEFT':
                    if page_col > 0:
                        self.selected_index -= 1
                        needs_redraw = True

                elif event.key == 'RIGHT':
                    if page_col < self.grid_width - 1 and self.selected_index < page_end - 1:
                        self.selected_index += 1
                        needs_redraw = True
                
                elif event.key == InputEvent.L1:  # Previous page
                    if self.current_page > 0:
                        self.current_page -= 1
                        self.selected_index = self.current_page * self.apps_per_page
                        needs_redraw = True
                
                elif event.key == InputEvent.R1:  # Next page
                    if self.current_page < total_pages - 1:
                        self.current_page += 1
                        self.selected_index = self.current_page * self.apps_per_page
                        needs_redraw = True

                elif event.key == 'OK':  # Enter key maps to OK
                    if 0 <= self.selected_index < len(self.apps):
                        selected_app = self.apps[self.selected_index]
                        selected_app.launch(self.os_context)
                        # Redraw after returning from app
                        needs_redraw = True

                elif event.key == InputEvent.HOME:  # ESC to exit launcher
                    running = False
