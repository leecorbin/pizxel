#!/usr/bin/env python3
"""
Snake Game - Classic snake game (Enhanced for 256×192 ZX Spectrum resolution)

Features:
- Grow by eating food
- Avoid walls and self-collision
- Progressive difficulty (speed increases)
- High score tracking
- Sound effects
- Beautiful retro border with ZX Spectrum aesthetic
- Larger play area with decorative frame
- Enhanced visual feedback
"""

import sys
import os
import random

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from matrixos.app_framework import App
from matrixos.input import InputEvent
from matrixos import layout, storage, audio


class SnakeGame(App):
    """Classic Snake game - Enhanced for 256×192."""
    
    def __init__(self):
        super().__init__("Snake")
        self.snake = []
        self.food = None
        self.direction = (1, 0)  # Start moving right
        self.next_direction = (1, 0)
        self.grow_pending = 0
        self.score = 0
        self.high_score = storage.get('snake.high_score', 0)
        self.game_over = False
        self.won = False
        self.update_timer = 0
        self.update_speed = 8  # Frames between updates (lower = faster)
        self.food_blink = 0
        self.segment_size = 6  # Larger segments for 256×192
        self.play_x = 8  # Play area offset
        self.play_y = 18  # Below HUD
        self.play_width = 240  # Play area width
        self.play_height = 168  # Play area height
        
    def on_activate(self):
        """Initialize game."""
        # Snake starts in center of play area, moving right
        start_x = self.play_x + self.play_width // 2
        start_y = self.play_y + self.play_height // 2
        # Align to grid
        start_x = (start_x // self.segment_size) * self.segment_size
        start_y = (start_y // self.segment_size) * self.segment_size
        
        self.snake = [
            (start_x, start_y),
            (start_x - self.segment_size, start_y),
            (start_x - self.segment_size * 2, start_y),
        ]
        self.direction = (1, 0)
        self.next_direction = (1, 0)
        self.grow_pending = 0
        self.score = 0
        self.game_over = False
        self.won = False
        self.update_timer = 0
        self.update_speed = 8
        self.spawn_food()
        self.dirty = True
        
    def spawn_food(self):
        """Spawn food at random location within play area."""
        while True:
            # Generate position within play area, aligned to grid
            x = random.randint(0, (self.play_width // self.segment_size) - 1) * self.segment_size + self.play_x
            y = random.randint(0, (self.play_height // self.segment_size) - 1) * self.segment_size + self.play_y
            if (x, y) not in self.snake:
                self.food = (x, y)
                break
    
    def restart(self):
        """Restart game."""
        self.on_activate()
        audio.play('beep')
    
    def on_event(self, event):
        """Handle input."""
        if event.key == InputEvent.BACK or event.key == InputEvent.HOME:
            return False  # Exit app
        
        if self.game_over or self.won:
            if event.key == 'r' or event.key == InputEvent.SELECT:
                self.restart()
                return True
            return True
        
        # Direction changes
        if event.key == InputEvent.UP and self.direction[1] == 0:
            self.next_direction = (0, -1)
            return True
        elif event.key == InputEvent.DOWN and self.direction[1] == 0:
            self.next_direction = (0, 1)
            return True
        elif event.key == InputEvent.LEFT and self.direction[0] == 0:
            self.next_direction = (-1, 0)
            return True
        elif event.key == InputEvent.RIGHT and self.direction[0] == 0:
            self.next_direction = (1, 0)
            return True
        elif event.key == 'r':
            self.restart()
            return True
        
        return False
    
    def on_update(self, delta_time):
        """Update game logic."""
        if self.game_over or self.won:
            return
        
        self.update_timer += 1
        self.food_blink += 1
        self.dirty = True
        
        if self.update_timer >= self.update_speed:
            self.update_timer = 0
            
            # Update direction (no reversing)
            if self.next_direction != (-self.direction[0], -self.direction[1]):
                self.direction = self.next_direction
            
            # Move snake
            head_x, head_y = self.snake[0]
            new_head = (
                head_x + self.direction[0] * self.segment_size, 
                head_y + self.direction[1] * self.segment_size
            )
            
            # Check wall collision (with play area bounds)
            if (new_head[0] < self.play_x or 
                new_head[0] >= self.play_x + self.play_width or
                new_head[1] < self.play_y or 
                new_head[1] >= self.play_y + self.play_height):
                self.game_over = True
                audio.play('gameover')
                if self.score > self.high_score:
                    self.high_score = self.score
                    storage.set('snake.high_score', self.high_score)
                return
            
            # Check self collision
            if new_head in self.snake:
                self.game_over = True
                audio.play('gameover')
                if self.score > self.high_score:
                    self.high_score = self.score
                    storage.set('snake.high_score', self.high_score)
                return
            
            # Add new head
            self.snake.insert(0, new_head)
            
            # Check if ate food
            if new_head == self.food:
                self.score += 10
                self.grow_pending += 3
                self.spawn_food()
                audio.play('collect')
                
                # Speed up slightly
                if self.update_speed > 2:
                    self.update_speed = max(2, self.update_speed - 0.3)
                
                # Check win condition (snake fills significant portion - 3× more space at 256×192)
                if len(self.snake) > 600:
                    self.won = True
                    audio.play('success')
                    if self.score > self.high_score:
                        self.high_score = self.score
                        storage.set('snake.high_score', self.high_score)
            
            # Remove tail (unless growing)
            if self.grow_pending > 0:
                self.grow_pending -= 1
            else:
                self.snake.pop()
    
    def render(self, matrix):
        """Render game with beautiful ZX Spectrum aesthetic."""
        matrix.clear()
        
        # Background - dark blue like ZX Spectrum
        matrix.rect(0, 0, 256, 192, (0, 0, 40), fill=True)
        
        # === DECORATIVE BORDER (ZX Spectrum style) ===
        # Outer frame - bright cyan
        matrix.rect(0, 0, 256, 192, (0, 255, 255), fill=False)
        matrix.rect(1, 1, 254, 190, (0, 255, 255), fill=False)
        
        # Corner decorations
        for x, y in [(2, 2), (251, 2), (2, 187), (251, 187)]:
            matrix.rect(x, y, 3, 3, (255, 255, 0), fill=True)
        
        # === HUD BAR ===
        matrix.rect(0, 0, 256, 16, (0, 0, 80), fill=True)
        matrix.line(0, 16, 255, 16, (0, 255, 255))
        matrix.line(0, 17, 255, 17, (0, 255, 255))
        
        # Score display
        matrix.text(f"SCORE:", 8, 4, (255, 255, 255))
        matrix.text(f"{self.score:05d}", 64, 4, (255, 255, 0))
        
        # High score
        matrix.text(f"HI:", 140, 4, (255, 200, 0))
        matrix.text(f"{self.high_score:05d}", 172, 4, (255, 255, 0))
        
        # Length indicator
        matrix.text(f"LEN:{len(self.snake)}", 220, 4, (0, 255, 255))
        
        # === PLAY AREA FRAME ===
        # Inner play area border - magenta
        play_border = (255, 0, 255)
        matrix.rect(self.play_x - 2, self.play_y - 2, 
                   self.play_width + 4, self.play_height + 4, 
                   play_border, fill=False)
        matrix.rect(self.play_x - 1, self.play_y - 1, 
                   self.play_width + 2, self.play_height + 2, 
                   play_border, fill=False)
        
        # Play area background - slightly lighter
        matrix.rect(self.play_x, self.play_y, 
                   self.play_width, self.play_height, 
                   (0, 0, 60), fill=True)
        
        # === SNAKE ===
        for i, (x, y) in enumerate(self.snake):
            if i == 0:
                # Head - bright yellow with eyes
                matrix.rect(x, y, self.segment_size, self.segment_size, 
                          (255, 255, 0), fill=True)
                # Add simple eyes based on direction
                if self.direction == (1, 0):  # Right
                    matrix.set_pixel(x + 4, y + 1, (0, 0, 0))
                    matrix.set_pixel(x + 4, y + 4, (0, 0, 0))
                elif self.direction == (-1, 0):  # Left
                    matrix.set_pixel(x + 1, y + 1, (0, 0, 0))
                    matrix.set_pixel(x + 1, y + 4, (0, 0, 0))
                elif self.direction == (0, -1):  # Up
                    matrix.set_pixel(x + 1, y + 1, (0, 0, 0))
                    matrix.set_pixel(x + 4, y + 1, (0, 0, 0))
                else:  # Down
                    matrix.set_pixel(x + 1, y + 4, (0, 0, 0))
                    matrix.set_pixel(x + 4, y + 4, (0, 0, 0))
            else:
                # Body - green with gradient and scale pattern
                intensity = max(100, 255 - i * 2)
                matrix.rect(x, y, self.segment_size, self.segment_size, 
                          (0, intensity, 0), fill=True)
                # Add scale texture
                if i % 2 == 0:
                    matrix.rect(x + 1, y + 1, self.segment_size - 2, self.segment_size - 2,
                              (0, min(255, intensity + 30), 0), fill=True)
        
        # === FOOD ===
        if self.food and self.food_blink % 20 < 15:
            fx, fy = self.food
            # Pulsing apple effect
            pulse = (self.food_blink % 20) / 20.0
            size = self.segment_size
            # Red apple with highlight
            matrix.rect(fx, fy, size, size, (255, 0, 0), fill=True)
            matrix.rect(fx + 1, fy + 1, 2, 2, (255, 100, 100), fill=True)  # Highlight
        
        # === GAME OVER / WIN OVERLAYS ===
        if self.game_over:
            # Semi-transparent overlay
            matrix.rect(48, 64, 160, 64, (0, 0, 0), fill=True)
            matrix.rect(48, 64, 160, 64, (255, 0, 0), fill=False)
            matrix.rect(49, 65, 158, 62, (255, 0, 0), fill=False)
            
            # Game over text
            matrix.text("GAME OVER", 80, 76, (255, 0, 0))
            matrix.text(f"Score: {self.score}", 90, 92, (255, 255, 255))
            matrix.text("Press R to restart", 62, 108, (200, 200, 200))
        
        if self.won:
            # Semi-transparent overlay
            matrix.rect(48, 64, 160, 64, (0, 0, 0), fill=True)
            matrix.rect(48, 64, 160, 64, (255, 255, 0), fill=False)
            matrix.rect(49, 65, 158, 62, (255, 255, 0), fill=False)
            
            # Win text
            matrix.text("CHAMPION!", 82, 76, (255, 255, 0))
            matrix.text(f"Final: {self.score}", 90, 92, (255, 255, 255))
            matrix.text("Press R to restart", 62, 108, (200, 200, 200))
        
        self.dirty = False


def run(os_context):
    """Run Snake game within MatrixOS framework."""
    app = SnakeGame()
    os_context.register_app(app)
    os_context.switch_to_app(app)
    os_context.run()


# App instance for launcher
app = SnakeGame()


def main():
    """Entry point for standalone mode."""
    from matrixos.led_api import create_matrix
    from matrixos.input import KeyboardInput
    
    print("\n" + "="*80)
    print("SNAKE - Enhanced for 256×192 ZX Spectrum Resolution")
    print("="*80)
    print("\nControls:")
    print("  Arrow Keys - Change direction")
    print("  R          - Restart")
    print("  Backspace  - Quit")
    print("\nFeatures:")
    print("  • Beautiful ZX Spectrum style border")
    print("  • Larger play area (240×168)")
    print("  • Enhanced snake with eyes and scales")
    print("  • Pulsing food animation")
    print("  • Win at 600 segments!")
    print("\n" + "="*80 + "\n")
    
    matrix = create_matrix(256, 192, 'rgb')
    
    with KeyboardInput() as input_handler:
        app = SnakeGame()
        app.on_activate()
        
        import time
        last_update = time.time()
        
        while True:
            # Handle input
            event = input_handler.get_key(timeout=0.01)
            if event:
                if not app.on_input(event):
                    break
            
            # Update at 60 FPS
            current_time = time.time()
            if current_time - last_update >= 1/60:
                app.on_update(current_time - last_update)
                if app.dirty:
                    app.render(matrix)
                    matrix.show()
                last_update = current_time
    
    print(f"\n{'='*64}")
    print(f"Final Score: {app.score}")
    print(f"High Score: {app.high_score}")
    print(f"{'='*64}\n")


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nGame interrupted.")
