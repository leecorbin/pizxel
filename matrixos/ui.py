"""
UI controls framework for MatrixOS apps.

Provides reusable UI widgets like buttons, text inputs, labels, etc.
Makes app development easier with consistent look and feel.

Example:
    from matrixos.ui import Button, TextInput, Label
    
    # Create widgets
    label = Label("Enter city:", x=2, y=2)
    text_input = TextInput(x=2, y=12, width=60, value="Cardiff")
    button = Button("Save", x=2, y=24, on_click=save_settings)
    
    # In your render method:
    label.render(matrix)
    text_input.render(matrix)
    button.render(matrix)
"""

from typing import Callable, Optional, List
from matrixos.input import InputEvent
from matrixos import layout


class Widget:
    """Base class for all UI widgets."""
    
    def __init__(self, x: int = 0, y: int = 0, width: int = 0, height: int = 0):
        """
        Initialize widget.
        
        Args:
            x: X position
            y: Y position
            width: Width (0 = auto)
            height: Height (0 = auto)
        """
        self.x = x
        self.y = y
        self.width = width
        self.height = height
        self.visible = True
        self.enabled = True
        self.focused = False
    
    def render(self, matrix):
        """Render the widget."""
        pass
    
    def handle_input(self, event: InputEvent) -> bool:
        """
        Handle input event.
        
        Returns:
            True if event was handled
        """
        return False


class Label(Widget):
    """Static text label."""
    
    def __init__(self, text: str, x: int = 0, y: int = 0, 
                 color: tuple = (200, 200, 200)):
        """
        Initialize label.
        
        Args:
            text: Label text
            x: X position
            y: Y position
            color: Text color (r, g, b)
        """
        width = len(text) * 6
        super().__init__(x, y, width, 7)
        self.text = text
        self.color = color
    
    def render(self, matrix):
        """Render label."""
        if not self.visible:
            return
        matrix.text(self.text, self.x, self.y, self.color)


class Button(Widget):
    """Clickable button."""
    
    def __init__(self, text: str, x: int = 0, y: int = 0, 
                 width: int = 0, on_click: Optional[Callable] = None):
        """
        Initialize button.
        
        Args:
            text: Button text
            x: X position
            y: Y position
            width: Width (0 = auto from text)
            on_click: Callback when clicked
        """
        if width == 0:
            width = len(text) * 6 + 8
        super().__init__(x, y, width, 11)
        self.text = text
        self.on_click = on_click
    
    def render(self, matrix):
        """Render button."""
        if not self.visible:
            return
        
        # Button colors
        if not self.enabled:
            bg_color = (50, 50, 50)
            text_color = (100, 100, 100)
        elif self.focused:
            bg_color = (100, 150, 255)
            text_color = (255, 255, 255)
        else:
            bg_color = (70, 70, 90)
            text_color = (200, 200, 200)
        
        # Background
        matrix.rect(self.x, self.y, self.width, self.height, bg_color, fill=True)
        
        # Border
        border_color = (150, 150, 150) if self.focused else (100, 100, 100)
        matrix.rect(self.x, self.y, self.width, self.height, border_color, fill=False)
        
        # Text (centered)
        text_x = self.x + (self.width - len(self.text) * 6) // 2
        text_y = self.y + 2
        matrix.text(self.text, text_x, text_y, text_color)
    
    def handle_input(self, event: InputEvent) -> bool:
        """Handle input."""
        if not self.enabled or not self.focused:
            return False
        
        if event.key == InputEvent.OK:
            if self.on_click:
                self.on_click()
            return True
        
        return False


class TextInput(Widget):
    """Single-line text input field."""
    
    def __init__(self, x: int = 0, y: int = 0, width: int = 60,
                 value: str = "", placeholder: str = "",
                 on_change: Optional[Callable[[str], None]] = None):
        """
        Initialize text input.
        
        Args:
            x: X position
            y: Y position
            width: Width in pixels
            value: Initial value
            placeholder: Placeholder text when empty
            on_change: Callback when value changes
        """
        super().__init__(x, y, width, 11)
        self.value = value
        self.placeholder = placeholder
        self.on_change = on_change
        self.cursor_visible = True
        self.cursor_time = 0
    
    def render(self, matrix):
        """Render text input."""
        if not self.visible:
            return
        
        # Background
        bg_color = (40, 40, 50) if self.enabled else (30, 30, 35)
        matrix.rect(self.x, self.y, self.width, self.height, bg_color, fill=True)
        
        # Border
        if self.focused:
            border_color = (100, 150, 255)
        else:
            border_color = (80, 80, 100)
        matrix.rect(self.x, self.y, self.width, self.height, border_color, fill=False)
        
        # Text or placeholder
        text_x = self.x + 3
        text_y = self.y + 2
        
        if self.value:
            # Show value (truncate if too long)
            display_text = self.value
            max_chars = (self.width - 10) // 6
            if len(display_text) > max_chars:
                display_text = display_text[:max_chars - 3] + "..."
            
            matrix.text(display_text, text_x, text_y, (255, 255, 255))
            
            # Cursor when focused
            if self.focused and self.cursor_visible:
                cursor_x = text_x + len(display_text) * 6
                if cursor_x < self.x + self.width - 3:
                    matrix.rect(cursor_x, text_y, 2, 7, (100, 200, 255), fill=True)
        
        elif self.placeholder:
            matrix.text(self.placeholder, text_x, text_y, (100, 100, 120))
    
    def handle_input(self, event: InputEvent) -> bool:
        """Handle input - opens keyboard on Enter."""
        if not self.enabled or not self.focused:
            return False
        
        if event.key == InputEvent.OK:
            # This would open the on-screen keyboard
            # Apps should handle this by calling show_keyboard
            return True
        
        return False
    
    def set_value(self, value: str):
        """Set text value."""
        self.value = value
        if self.on_change:
            self.on_change(value)


class ListWidget(Widget):
    """Scrollable list of items."""
    
    def __init__(self, items: List[str], x: int = 0, y: int = 0,
                 width: int = 60, height: int = 40,
                 on_select: Optional[Callable[[int, str], None]] = None):
        """
        Initialize list.
        
        Args:
            items: List items
            x: X position
            y: Y position
            width: Width
            height: Height
            on_select: Callback when item is selected (index, item)
        """
        super().__init__(x, y, width, height)
        self.items = items
        self.selected_index = 0
        self.scroll_offset = 0
        self.on_select = on_select
    
    def render(self, matrix):
        """Render list."""
        if not self.visible:
            return
        
        # Background
        matrix.rect(self.x, self.y, self.width, self.height, (30, 30, 40), fill=True)
        
        # Calculate visible items
        item_height = 10
        visible_count = self.height // item_height
        
        # Adjust scroll if needed
        if self.selected_index < self.scroll_offset:
            self.scroll_offset = self.selected_index
        elif self.selected_index >= self.scroll_offset + visible_count:
            self.scroll_offset = self.selected_index - visible_count + 1
        
        # Render visible items
        y = self.y + 2
        for i in range(self.scroll_offset, min(len(self.items), self.scroll_offset + visible_count)):
            item = self.items[i]
            is_selected = (i == self.selected_index)
            
            if is_selected:
                # Highlight
                matrix.rect(self.x + 1, y - 1, self.width - 2, item_height, 
                          (70, 100, 180), fill=True)
                text_color = (255, 255, 255)
            else:
                text_color = (200, 200, 200)
            
            # Truncate if needed
            max_chars = (self.width - 8) // 6
            display_text = item if len(item) <= max_chars else item[:max_chars - 3] + "..."
            
            matrix.text(display_text, self.x + 4, y, text_color)
            y += item_height
    
    def handle_input(self, event: InputEvent) -> bool:
        """Handle input."""
        if not self.enabled or not self.focused:
            return False
        
        if event.key == InputEvent.UP:
            self.selected_index = (self.selected_index - 1) % len(self.items)
            return True
        
        elif event.key == InputEvent.DOWN:
            self.selected_index = (self.selected_index + 1) % len(self.items)
            return True
        
        elif event.key == InputEvent.OK:
            if self.on_select and self.items:
                self.on_select(self.selected_index, self.items[self.selected_index])
            return True
        
        return False


class Dialog(Widget):
    """Modal dialog box."""
    
    def __init__(self, title: str, message: str,
                 buttons: List[str] = None,
                 on_button: Optional[Callable[[str], None]] = None):
        """
        Initialize dialog.
        
        Args:
            title: Dialog title
            message: Dialog message
            buttons: Button labels (default: ["OK"])
            on_button: Callback when button clicked (button_label)
        """
        super().__init__(0, 0, 0, 0)
        self.title = title
        self.message = message
        self.buttons = buttons or ["OK"]
        self.on_button = on_button
        self.selected_button = 0
    
    def render(self, matrix):
        """Render dialog (centered on screen)."""
        if not self.visible:
            return
        
        width = matrix.width
        height = matrix.height
        
        # Dialog size
        dialog_width = min(width - 16, 100)
        dialog_height = min(height - 16, 60)
        dialog_x = (width - dialog_width) // 2
        dialog_y = (height - dialog_height) // 2
        
        # Semi-transparent background (darken rest of screen)
        for y in range(height):
            for x in range(width):
                if x < dialog_x or x >= dialog_x + dialog_width or \
                   y < dialog_y or y >= dialog_y + dialog_height:
                    # Darken pixels outside dialog
                    r, g, b = matrix.get_pixel(x, y)
                    matrix.set_pixel(x, y, (r // 2, g // 2, b // 2))
        
        # Dialog background
        matrix.rect(dialog_x, dialog_y, dialog_width, dialog_height, 
                   (50, 50, 60), fill=True)
        matrix.rect(dialog_x, dialog_y, dialog_width, dialog_height,
                   (150, 150, 180), fill=False)
        
        # Title bar
        matrix.rect(dialog_x, dialog_y, dialog_width, 10, (70, 100, 180), fill=True)
        title_x = dialog_x + (dialog_width - len(self.title) * 6) // 2
        matrix.text(self.title, title_x, dialog_y + 2, (255, 255, 255))
        
        # Message (word wrap)
        msg_x = dialog_x + 4
        msg_y = dialog_y + 14
        max_chars = (dialog_width - 8) // 6
        
        words = self.message.split()
        line = ""
        for word in words:
            if len(line + word) > max_chars:
                matrix.text(line, msg_x, msg_y, (220, 220, 220))
                msg_y += 10
                line = word + " "
            else:
                line += word + " "
        if line:
            matrix.text(line.strip(), msg_x, msg_y, (220, 220, 220))
        
        # Buttons
        button_y = dialog_y + dialog_height - 14
        button_width = (dialog_width - 8 - (len(self.buttons) - 1) * 4) // len(self.buttons)
        button_x = dialog_x + 4
        
        for i, btn_text in enumerate(self.buttons):
            is_selected = (i == self.selected_button)
            
            # Button background
            bg_color = (100, 150, 255) if is_selected else (70, 70, 90)
            matrix.rect(button_x, button_y, button_width, 10, bg_color, fill=True)
            
            # Button text
            text_color = (255, 255, 255) if is_selected else (200, 200, 200)
            text_x = button_x + (button_width - len(btn_text) * 6) // 2
            matrix.text(btn_text, text_x, button_y + 2, text_color)
            
            button_x += button_width + 4
    
    def handle_input(self, event: InputEvent) -> bool:
        """Handle input."""
        if not self.visible:
            return False
        
        if event.key == InputEvent.LEFT:
            self.selected_button = (self.selected_button - 1) % len(self.buttons)
            return True
        
        elif event.key == InputEvent.RIGHT:
            self.selected_button = (self.selected_button + 1) % len(self.buttons)
            return True
        
        elif event.key == InputEvent.OK:
            if self.on_button:
                self.on_button(self.buttons[self.selected_button])
            self.visible = False
            return True
        
        return False


class ProgressBar(Widget):
    """Progress bar widget."""
    
    def __init__(self, x: int = 0, y: int = 0, width: int = 60,
                 height: int = 8, value: float = 0.0, color: tuple = (100, 200, 100)):
        """
        Initialize progress bar.
        
        Args:
            x: X position
            y: Y position
            width: Width
            height: Height
            value: Progress value (0.0 to 1.0)
            color: Fill color
        """
        super().__init__(x, y, width, height)
        self.value = max(0.0, min(1.0, value))
        self.color = color
    
    def render(self, matrix):
        """Render progress bar."""
        if not self.visible:
            return
        
        # Background
        matrix.rect(self.x, self.y, self.width, self.height, (40, 40, 50), fill=True)
        
        # Border
        matrix.rect(self.x, self.y, self.width, self.height, (100, 100, 120), fill=False)
        
        # Fill
        fill_width = int((self.width - 4) * self.value)
        if fill_width > 0:
            matrix.rect(self.x + 2, self.y + 2, fill_width, self.height - 4, 
                       self.color, fill=True)
    
    def set_value(self, value: float):
        """Set progress value (0.0 to 1.0)."""
        self.value = max(0.0, min(1.0, value))
