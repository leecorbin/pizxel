#!/usr/bin/env python3
"""
Snake Game - Classic snake game

Features:
- Grow by eating food
- Avoid walls and self-collision
- Progressive difficulty (speed increases)
- High score tracking
- Sound effects
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
    """Classic Snake game."""
    
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
        
    def on_activate(self):
        """Initialize game."""
        # Snake starts in center, moving right
        start_x, start_y = 64, 64
        self.snake = [
            (start_x, start_y),
            (start_x - 4, start_y),
            (start_x - 8, start_y),
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
        """Spawn food at random location."""
        while True:
            x = random.randint(2, 125) & ~3  # Align to 4-pixel grid
            y = random.randint(2, 125) & ~3
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
            new_head = (head_x + self.direction[0] * 4, head_y + self.direction[1] * 4)
            
            # Check wall collision
            if (new_head[0] < 0 or new_head[0] >= 128 or
                new_head[1] < 0 or new_head[1] >= 128):
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
                
                # Check win condition (snake fills most of the screen)
                if len(self.snake) > 200:
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
        """Render game."""
        matrix.clear()
        
        # Draw border
        matrix.rect(0, 0, 128, 128, (80, 80, 80), fill=False)
        
        # Draw snake
        for i, (x, y) in enumerate(self.snake):
            if i == 0:
                # Head - yellow
                matrix.rect(x, y, 4, 4, (255, 255, 0), fill=True)
            else:
                # Body - green (gradient)
                intensity = max(100, 255 - i * 2)
                matrix.rect(x, y, 4, 4, (0, intensity, 0), fill=True)
        
        # Draw food (blinking)
        if self.food and self.food_blink % 20 < 15:
            fx, fy = self.food
            matrix.rect(fx, fy, 4, 4, (255, 0, 0), fill=True)
        
        # HUD - top area
        matrix.rect(0, 0, 128, 10, (0, 0, 30), fill=True)
        matrix.text(f"Score:{self.score}", 2, 1, (255, 255, 255))
        matrix.text(f"Hi:{self.high_score}", 75, 1, (255, 200, 0))
        
        # Game over
        if self.game_over:
            layout.message_box(matrix, "GAME OVER", 
                               f"Score: {self.score}",
                               "Press R to restart")
        
        # Won
        if self.won:
            layout.message_box(matrix, "YOU WIN!", 
                               f"Score: {self.score}",
                               "Press R to restart")
        
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
    
    print("\n" + "="*64)
    print("SNAKE")
    print("="*64)
    print("\nControls:")
    print("  Arrow Keys - Change direction")
    print("  R          - Restart")
    print("  Backspace  - Quit")
    print("\n" + "="*64 + "\n")
    
    matrix = create_matrix(128, 128, 'rgb')
    
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
