"""
On-screen keyboard for text input.

Provides a visual keyboard that takes the bottom half of the screen.
Navigate with arrow keys, type with Enter, and finish with special buttons.

Example:
    from matrixos.keyboard import show_keyboard
    
    # Get text input from user
    city = show_keyboard(matrix, input_handler, 
                        prompt="Enter city:",
                        initial="Cardiff")
    
    if city:
        print(f"User entered: {city}")
"""

from matrixos.input import InputEvent


class KeyboardLayout:
    """Keyboard layout definitions."""
    
    # QWERTY layout (lowercase)
    QWERTY_LOWER = [
        ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
        ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
        ['↑', 'z', 'x', 'c', 'v', 'b', 'n', 'm', '←'],
        ['_', ' ', ',', '.', '✓']
    ]
    
    # QWERTY layout (uppercase)
    QWERTY_UPPER = [
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
        ['↑', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '←'],
        ['_', ' ', ',', '.', '✓']
    ]
    
    # Numbers and symbols
    NUMBERS = [
        ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
        ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'],
        ['↑', '-', '=', '[', ']', '{', '}', '/', '←'],
        ['_', ' ', ',', '.', '✓']
    ]
    
    @staticmethod
    def get_layout(mode: str) -> list:
        """Get keyboard layout for mode."""
        if mode == 'lower':
            return KeyboardLayout.QWERTY_LOWER
        elif mode == 'upper':
            return KeyboardLayout.QWERTY_UPPER
        elif mode == 'numbers':
            return KeyboardLayout.NUMBERS
        else:
            return KeyboardLayout.QWERTY_LOWER


class OnScreenKeyboard:
    """On-screen keyboard for text input."""
    
    def __init__(self, prompt: str = "Enter text:", initial: str = ""):
        """
        Initialize keyboard.
        
        Args:
            prompt: Prompt text to show
            initial: Initial text value
        """
        self.prompt = prompt
        self.text = initial
        self.cursor_pos = len(initial)
        
        self.mode = 'lower'  # 'lower', 'upper', 'numbers'
        self.layout = KeyboardLayout.get_layout(self.mode)
        
        self.selected_row = 0
        self.selected_col = 0
        
        self.done = False
        self.cancelled = False
    
    def handle_input(self, event: InputEvent) -> bool:
        """
        Handle input event.
        
        Args:
            event: Input event
            
        Returns:
            True if event was handled
        """
        if event.key == InputEvent.UP:
            self.selected_row = (self.selected_row - 1) % len(self.layout)
            # Adjust column if row is shorter
            if self.selected_col >= len(self.layout[self.selected_row]):
                self.selected_col = len(self.layout[self.selected_row]) - 1
            return True
        
        elif event.key == InputEvent.DOWN:
            self.selected_row = (self.selected_row + 1) % len(self.layout)
            # Adjust column if row is shorter
            if self.selected_col >= len(self.layout[self.selected_row]):
                self.selected_col = len(self.layout[self.selected_row]) - 1
            return True
        
        elif event.key == InputEvent.LEFT:
            row = self.layout[self.selected_row]
            self.selected_col = (self.selected_col - 1) % len(row)
            return True
        
        elif event.key == InputEvent.RIGHT:
            row = self.layout[self.selected_row]
            self.selected_col = (self.selected_col + 1) % len(row)
            return True
        
        elif event.key == InputEvent.OK:
            # Type the selected key
            key = self.layout[self.selected_row][self.selected_col]
            return self._type_key(key)
        
        elif event.key == InputEvent.BACK:
            # Cancel keyboard
            self.cancelled = True
            self.done = True
            return True
        
        return False
    
    def _type_key(self, key: str) -> bool:
        """
        Type a key.
        
        Args:
            key: Key character or special key
            
        Returns:
            True if key was handled
        """
        if key == '✓':
            # Done
            self.done = True
            return True
        
        elif key == '←':
            # Backspace
            if self.cursor_pos > 0:
                self.text = self.text[:self.cursor_pos - 1] + self.text[self.cursor_pos:]
                self.cursor_pos -= 1
            return True
        
        elif key == '↑':
            # Shift (toggle case)
            if self.mode == 'lower':
                self.mode = 'upper'
            elif self.mode == 'upper':
                self.mode = 'lower'
            elif self.mode == 'numbers':
                self.mode = 'lower'
            self.layout = KeyboardLayout.get_layout(self.mode)
            return True
        
        elif key == '_':
            # Switch to numbers/symbols
            if self.mode == 'numbers':
                self.mode = 'lower'
            else:
                self.mode = 'numbers'
            self.layout = KeyboardLayout.get_layout(self.mode)
            return True
        
        else:
            # Regular character
            self.text = self.text[:self.cursor_pos] + key + self.text[self.cursor_pos:]
            self.cursor_pos += 1
            return True
    
    def render(self, matrix):
        """
        Render keyboard on bottom half of screen.
        
        Args:
            matrix: Display matrix
        """
        width = matrix.width
        height = matrix.height
        
        # Keyboard takes bottom half (or at least 48 pixels)
        kbd_height = max(height // 2, 48)
        kbd_y = height - kbd_height
        
        # Background for keyboard area (darker to distinguish)
        matrix.rect(0, kbd_y, width, kbd_height, (30, 30, 40), fill=True)
        
        # Prompt and text input area
        y = kbd_y + 2
        matrix.text(self.prompt, 2, y, (200, 200, 200))
        y += 10
        
        # Text with cursor
        text_color = (255, 255, 255)
        cursor_color = (100, 200, 255)
        
        # Show text (truncate if too long)
        display_text = self.text
        if len(display_text) * 6 > width - 8:
            # Show end of text if it's too long
            max_chars = (width - 8) // 6
            display_text = "..." + display_text[-(max_chars - 3):]
        
        matrix.text(display_text, 4, y, text_color)
        
        # Cursor
        cursor_x = 4 + len(display_text) * 6
        if cursor_x < width - 4:
            matrix.rect(cursor_x, y, 2, 7, cursor_color, fill=True)
        
        y += 12
        
        # Keyboard layout
        key_spacing = 2
        
        # Calculate key width based on screen size
        if width >= 128:
            key_width = 10
            key_height = 8
            start_x = 8
        else:
            key_width = 6
            key_height = 6
            start_x = 2
        
        for row_idx, row in enumerate(self.layout):
            row_y = y + row_idx * (key_height + key_spacing)
            
            # Center the row
            row_width = len(row) * (key_width + key_spacing) - key_spacing
            row_x = start_x + (width - start_x * 2 - row_width) // 2
            
            for col_idx, key in enumerate(row):
                key_x = row_x + col_idx * (key_width + key_spacing)
                
                # Key appearance
                is_selected = (row_idx == self.selected_row and col_idx == self.selected_col)
                
                if is_selected:
                    # Highlighted key
                    bg_color = (100, 150, 255)
                    text_color = (255, 255, 255)
                else:
                    # Normal key
                    if key in ['↑', '←', '✓', '_']:
                        # Special keys
                        bg_color = (60, 60, 80)
                    elif key == ' ':
                        # Space bar
                        bg_color = (50, 50, 60)
                    else:
                        # Regular keys
                        bg_color = (70, 70, 90)
                    text_color = (200, 200, 200)
                
                # Draw key background
                matrix.rect(key_x, row_y, key_width, key_height, bg_color, fill=True)
                
                # Draw key label (centered)
                label = key
                if label == ' ':
                    label = 'SPC'
                
                label_x = key_x + (key_width - len(label) * 6) // 2
                label_y = row_y + 1
                matrix.text(label, label_x, label_y, text_color)
        
        # Instructions
        inst_y = height - 8
        matrix.text("ARROWS:NAV ENTER:TYPE ESC:CANCEL", 2, inst_y, (150, 150, 150))


def show_keyboard(matrix, input_handler, prompt: str = "Enter text:", 
                 initial: str = "") -> str:
    """
    Show on-screen keyboard and get text input.
    
    This is a blocking function that takes over the display until
    the user finishes typing or cancels.
    
    Args:
        matrix: Display matrix
        input_handler: Input handler
        prompt: Prompt text
        initial: Initial text value
        
    Returns:
        Entered text, or None if cancelled
    """
    keyboard = OnScreenKeyboard(prompt, initial)
    
    while not keyboard.done:
        # Clear screen
        matrix.clear()
        
        # Render keyboard
        keyboard.render(matrix)
        
        # Display
        matrix.display()
        
        # Handle input
        event = input_handler.get_input(timeout=0.1)
        if event:
            keyboard.handle_input(event)
    
    if keyboard.cancelled:
        return None
    else:
        return keyboard.text
