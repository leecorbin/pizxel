"""
Input system for interactive LED matrix applications.
Supports keyboard input (development) and GPIO buttons (production).
"""

import sys
import select
import tty
import termios
from typing import Optional, Callable


class InputEvent:
    """Represents an input event."""

    # Standard input events
    UP = 'UP'
    DOWN = 'DOWN'
    LEFT = 'LEFT'
    RIGHT = 'RIGHT'
    OK = 'OK'          # Enter key
    BACK = 'BACK'      # ESC or Q
    QUIT = 'QUIT'      # Q

    def __init__(self, key: str, raw: str = None):
        """
        Create an input event.

        Args:
            key: Normalized key name (UP, DOWN, OK, etc.) or raw character
            raw: Original raw input (for debugging)
        """
        self.key = key
        self.raw = raw or key

    def __str__(self):
        return f"InputEvent({self.key})"

    def __repr__(self):
        return self.__str__()


class KeyboardInput:
    """
    Keyboard input handler for development.
    Works on Unix-like systems (Linux, Mac, Pi).
    """

    def __init__(self):
        """Initialize keyboard input."""
        self.old_settings = None
        self._setup_terminal()

    def _setup_terminal(self):
        """Set terminal to raw mode for immediate key detection."""
        if sys.platform == 'win32':
            # Windows support would need different approach (msvcrt)
            print("Warning: Windows keyboard input not fully supported")
            return

        try:
            self.old_settings = termios.tcgetattr(sys.stdin)
            tty.setcbreak(sys.stdin.fileno())
        except:
            pass

    def _restore_terminal(self):
        """Restore terminal settings."""
        if self.old_settings:
            try:
                termios.tcsetattr(sys.stdin, termios.TCSADRAIN, self.old_settings)
            except:
                pass

    def get_key(self, timeout: float = 0.0) -> Optional[InputEvent]:
        """
        Get a key press (non-blocking).

        Args:
            timeout: How long to wait for input (seconds). 0 = non-blocking.

        Returns:
            InputEvent or None if no input
        """
        # Check if input is available
        if sys.platform != 'win32':
            ready, _, _ = select.select([sys.stdin], [], [], timeout)
            if not ready:
                return None

        try:
            # Read character(s)
            char = sys.stdin.read(1)

            # Handle escape sequences (arrow keys, etc.)
            if char == '\x1b':  # ESC sequence
                # Try to read the rest of the sequence
                ready, _, _ = select.select([sys.stdin], [], [], 0.1)
                if ready:
                    char += sys.stdin.read(2)
                else:
                    # Just ESC key
                    return InputEvent(InputEvent.BACK, char)

            # Map keys to events
            return self._map_key(char)

        except Exception as e:
            return None

    def wait_for_key(self) -> InputEvent:
        """
        Wait for a key press (blocking).

        Returns:
            InputEvent
        """
        while True:
            event = self.get_key(timeout=0.1)
            if event:
                return event

    def _map_key(self, char: str) -> InputEvent:
        """Map raw key to InputEvent."""
        # Arrow keys (ANSI escape sequences)
        if char == '\x1b[A':
            return InputEvent(InputEvent.UP, char)
        elif char == '\x1b[B':
            return InputEvent(InputEvent.DOWN, char)
        elif char == '\x1b[C':
            return InputEvent(InputEvent.RIGHT, char)
        elif char == '\x1b[D':
            return InputEvent(InputEvent.LEFT, char)

        # Enter/Return
        elif char in ['\n', '\r']:
            return InputEvent(InputEvent.OK, char)

        # ESC (already handled above, but just in case)
        elif char == '\x1b':
            return InputEvent(InputEvent.BACK, char)

        # Q for quit/back
        elif char.lower() == 'q':
            return InputEvent(InputEvent.QUIT, char)

        # Any other character (including numbers, letters)
        else:
            return InputEvent(char, char)

    def close(self):
        """Clean up and restore terminal."""
        self._restore_terminal()

    def __enter__(self):
        """Context manager support."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager cleanup."""
        self.close()

    def __del__(self):
        """Cleanup on deletion."""
        self.close()


class GPIOInput:
    """
    GPIO button input handler for production (Raspberry Pi).

    This is a placeholder for future GPIO integration.
    Will use physical buttons connected to GPIO pins.
    """

    def __init__(self, pin_mapping: dict = None):
        """
        Initialize GPIO input.

        Args:
            pin_mapping: Dict mapping button names to GPIO pins
                        e.g., {'UP': 17, 'DOWN': 27, 'OK': 22}
        """
        self.pin_mapping = pin_mapping or {}
        # TODO: Initialize GPIO pins when on Raspberry Pi
        raise NotImplementedError(
            "GPIO input not yet implemented. Use KeyboardInput for now."
        )

    def get_key(self, timeout: float = 0.0) -> Optional[InputEvent]:
        """Get button press from GPIO."""
        # TODO: Implement GPIO button reading
        pass

    def wait_for_key(self) -> InputEvent:
        """Wait for button press."""
        # TODO: Implement blocking GPIO read
        pass

    def close(self):
        """Clean up GPIO."""
        # TODO: Release GPIO pins
        pass


class Menu:
    """
    Simple menu system for Matrix OS apps.
    Handles rendering and navigation.
    """

    def __init__(self, matrix, input_handler, title: str = "MENU"):
        """
        Create a menu.

        Args:
            matrix: LEDMatrix instance
            input_handler: Input handler (KeyboardInput or GPIOInput)
            title: Menu title
        """
        self.matrix = matrix
        self.input = input_handler
        self.title = title
        self.items = []
        self.selected = 0

    def add_item(self, label: str, callback: Callable = None, shortcut: str = None):
        """
        Add menu item.

        Args:
            label: Display text
            callback: Function to call when selected
            shortcut: Optional keyboard shortcut (e.g., '1')
        """
        self.items.append({
            'label': label,
            'callback': callback,
            'shortcut': shortcut
        })

    def render(self):
        """Render the menu on the display."""
        self.matrix.clear()

        # Title bar
        self.matrix.rect(0, 0, self.matrix.width, 10, (0, 100, 200), fill=True)
        self.matrix.centered_text(self.title, 2, (255, 255, 255))

        # Menu items (scrollable if needed)
        y = 14
        visible_items = 6  # How many items fit on screen

        # Calculate scroll offset if needed
        if len(self.items) > visible_items:
            scroll_start = max(0, min(self.selected - 2, len(self.items) - visible_items))
            items_to_show = self.items[scroll_start:scroll_start + visible_items]
            selected_offset = self.selected - scroll_start
        else:
            items_to_show = self.items
            selected_offset = self.selected

        for i, item in enumerate(items_to_show):
            is_selected = (i == selected_offset)

            # Background for selected item
            if is_selected:
                self.matrix.rect(2, y - 1, self.matrix.width - 4, 9,
                               (255, 255, 0), fill=True)
                text_color = (0, 0, 0)
            else:
                text_color = (255, 255, 255)

            # Item text (with shortcut if available)
            label = item['label']
            if item['shortcut']:
                label = f"{item['shortcut']}.{label}"

            self.matrix.text(label, 4, y, text_color)
            y += 9

        # Navigation hint at bottom
        hint_y = self.matrix.height - 8
        self.matrix.text("^v:NAV", 2, hint_y, (150, 150, 150))
        self.matrix.text("OK", self.matrix.width - 18, hint_y, (150, 150, 150))

        self.matrix.show()

    def run(self) -> Optional[str]:
        """
        Run the menu (blocking).

        Returns:
            Selected item label or None if quit
        """
        self.render()

        while True:
            event = self.input.wait_for_key()

            if event.key == InputEvent.UP:
                self.selected = (self.selected - 1) % len(self.items)
                self.render()

            elif event.key == InputEvent.DOWN:
                self.selected = (self.selected + 1) % len(self.items)
                self.render()

            elif event.key == InputEvent.OK:
                # Execute selected item
                item = self.items[self.selected]
                if item['callback']:
                    item['callback']()
                return item['label']

            elif event.key in [InputEvent.BACK, InputEvent.QUIT]:
                return None

            # Check for shortcut keys
            elif event.key.isdigit() or event.key.isalpha():
                for i, item in enumerate(self.items):
                    if item['shortcut'] and item['shortcut'].lower() == event.key.lower():
                        self.selected = i
                        item = self.items[self.selected]
                        if item['callback']:
                            item['callback']()
                        return item['label']


def create_input(use_gpio: bool = False) -> KeyboardInput:
    """
    Create an input handler.

    Args:
        use_gpio: If True, use GPIO buttons (Pi only). If False, use keyboard.

    Returns:
        Input handler instance
    """
    if use_gpio:
        return GPIOInput()
    else:
        return KeyboardInput()
