#!/usr/bin/env python3
"""
Timer App - Countdown timer with background alerts

Demonstrates:
- Background processing (timer runs even when app is not visible)
- Screen takeover (requests attention when timer finishes)
- Simple event-driven architecture
"""

import sys
import os
import time

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from matrixos.app_framework import App
from matrixos.input import InputEvent
from matrixos import layout


class TimerApp(App):
    """A countdown timer that runs in the background."""

    def __init__(self):
        super().__init__("Timer")
        self.countdown = 0
        self.total_time = 0
        self.timer_running = False
        self.alarm_triggered = False
        self.alarm_start_time = 0
        self.setting_mode = True
        self.preset_times = [5, 10, 15, 30, 60]  # Seconds
        self.selected_preset = 1  # Default to 10 seconds

    def get_help_text(self):
        """Return app-specific help."""
        if self.setting_mode:
            return [("↑↓", "Select time"), ("ENTER", "Start")]
        elif self.alarm_triggered:
            return [("ANY", "Dismiss")]
        else:
            return [("SPC", "Pause"), ("C", "Cancel")]

    def on_activate(self):
        """App becomes active."""
        # If alarm was triggered, reset it
        if self.alarm_triggered:
            self.alarm_triggered = False
            self.setting_mode = True
            self.timer_running = False

    def on_update(self, delta_time):
        """Update every frame when active."""
        if self.timer_running and not self.setting_mode:
            self.countdown -= delta_time

            if self.countdown <= 0:
                self.countdown = 0
                self.timer_running = False
                self.alarm_triggered = True
                self.alarm_start_time = time.time()

    def on_background_tick(self):
        """Update every second when in background."""
        if self.timer_running:
            self.countdown -= 1

            if self.countdown <= 0:
                self.countdown = 0
                self.timer_running = False
                self.alarm_triggered = True
                self.alarm_start_time = time.time()

                # Request OS to show us!
                self.request_attention(priority='high')

    def on_event(self, event):
        """Handle input events."""
        if self.alarm_triggered:
            # Any key dismisses alarm
            self.alarm_triggered = False
            self.setting_mode = True
            return True

        if self.setting_mode:
            # Setting timer duration
            if event.key == InputEvent.UP:
                self.selected_preset = (self.selected_preset - 1) % len(self.preset_times)
                return True
            elif event.key == InputEvent.DOWN:
                self.selected_preset = (self.selected_preset + 1) % len(self.preset_times)
                return True
            elif event.key == InputEvent.OK or event.key == ' ':
                # Start timer
                self.total_time = self.preset_times[self.selected_preset]
                self.countdown = self.total_time
                self.timer_running = True
                self.setting_mode = False
                return True

        else:
            # Timer is running
            if event.key == InputEvent.OK or event.key == ' ':
                # Pause/resume
                self.timer_running = not self.timer_running
                return True
            elif event.key == 'c' or event.key == 'C':
                # Cancel
                self.timer_running = False
                self.setting_mode = True
                return True

        return False

    def render(self, matrix):
        """Draw the timer UI - responsive to screen size!"""
        width = matrix.width
        height = matrix.height
        icon_size = layout.get_icon_size(matrix)

        if self.alarm_triggered:
            # Alarm screen - flash red
            flash = int((time.time() - self.alarm_start_time) * 3) % 2 == 0

            if flash:
                matrix.fill((255, 0, 0))
                layout.center_text(matrix, "TIME'S", height // 2 - 8, (255, 255, 255))
                layout.center_text(matrix, "UP!", height // 2 + 2, (255, 255, 255))
                layout.center_text(matrix, "PRESS ANY KEY", height - 12, (255, 255, 0))
            else:
                matrix.fill((100, 0, 0))
                layout.center_text(matrix, "TIME'S", height // 2 - 8, (200, 200, 200))
                layout.center_text(matrix, "UP!", height // 2 + 2, (200, 200, 200))

        elif self.setting_mode:
            # Setting screen
            matrix.text("TIMER", 2, 2, (0, 255, 255))

            # Use menu_list helper for preset selection!
            preset_items = [f"{p}s" for p in self.preset_times]
            layout.menu_list(matrix, preset_items, self.selected_preset, y_start=16)

            # Instructions at bottom
            layout.center_text(matrix, "ENTER=START", height - 8, (150, 150, 150))

        else:
            # Timer running/paused
            matrix.text("TIMER", 2, 2, (0, 255, 255))

            # Progress bar using layout helper!
            progress = self.countdown / self.total_time if self.total_time > 0 else 0
            bar_y = 20 if width < 100 else 30
            bar_color = (0, 255, 0) if self.timer_running else (255, 165, 0)
            
            layout.draw_progress_bar(matrix, 4, bar_y, width - 8, 10, 
                                    progress, fg_color=bar_color)

            # Time remaining (large, centered)
            time_text = f"{int(self.countdown)}s"
            layout.center_text(matrix, time_text, height // 2 + 8, (255, 255, 255))

            # Status text (centered)
            status_y = height - 16 if width < 100 else height - 20
            if self.timer_running:
                layout.center_text(matrix, "RUNNING", status_y, (0, 255, 0))
                layout.center_text(matrix, "SPC=PAUSE C=STOP", height - 8, (150, 150, 150))
            else:
                layout.center_text(matrix, "PAUSED", status_y, (255, 165, 0))
                layout.center_text(matrix, "SPC=RESUME C=STOP", height - 8, (150, 150, 150))


def run(os_context):
    """Entry point called by OS (not subprocess!)."""
    app = TimerApp()
    os_context.register_app(app)
    os_context.switch_to_app(app)
    os_context.run()  # Start the OS event loop


def main():
    """Standalone testing mode."""
    from matrixos.led_api import create_matrix
    from matrixos.input import KeyboardInput
    from matrixos.config import parse_matrix_args
    from matrixos.app_framework import OSContext

    args = parse_matrix_args("Timer App")
    matrix = create_matrix(args.width, args.height, args.color_mode)

    print("\n" + "="*64)
    print("TIMER APP - Standalone Mode")
    print("="*64)
    print("\nControls:")
    print("  ↑/↓        - Select duration")
    print("  ENTER/SPC  - Start/Pause")
    print("  C          - Cancel timer")
    print("  ESC        - Quit")
    print("\n" + "="*64 + "\n")

    with KeyboardInput() as input_handler:
        os = OSContext(matrix, input_handler)
        app = TimerApp()
        os.register_app(app)
        os.switch_to_app(app)
        os.run()

    print("\nTimer app closed.")


# App instance for launcher
app = TimerApp()


if __name__ == '__main__':
    main()
