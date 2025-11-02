#!/usr/bin/env python3
"""
Breakout Game - Classic brick-breaking arcade game

Features:
- Multiple rows of colorful bricks
- Ball physics with paddle spin
- Lives system
- Progressive difficulty
- High score tracking
- Sound effects
"""

import sys
import os

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from matrixos.app_framework import App
from matrixos.input import InputEvent
from matrixos import layout, storage, audio


class BreakoutGame(App):
    """Classic Breakout game."""
    
    def __init__(self):
        super().__init__()
        # Paddle
        self.paddle_width = 20
        self.paddle_height = 4
        self.paddle_x = 0
        self.paddle_y = 0
        self.paddle_speed = 4
        
        # Ball
        self.ball_x = 0
        self.ball_y = 0
        self.ball_vx = 0
        self.ball_vy = 0
        self.ball_size = 4
        
        # Bricks
        self.bricks = []
        self.brick_width = 14
        self.brick_height = 6
        
        # Game state
        self.score = 0
        self.lives = 3
        self.high_score = storage.get('breakout.high_score', 0)
        self.game_over = False
        self.won = False
        
    def on_activate(self):
        """Initialize game."""
        # Paddle
        self.paddle_x = (128 - self.paddle_width) // 2
        self.paddle_y = 118
        
        # Ball
        self.ball_x = 62
        self.ball_y = self.paddle_y - 10
        self.ball_vx = 2
        self.ball_vy = -2
        
        # Bricks
        self.init_bricks()
        
        # Game state
        self.score = 0
        self.lives = 3
        self.game_over = False
        self.won = False
        self.dirty = True
    
    def init_bricks(self):
        """Initialize bricks."""
        colors = [
            (255, 0, 0),      # Red
            (255, 128, 0),    # Orange
            (255, 255, 0),    # Yellow
            (0, 255, 0),      # Green
            (0, 200, 255),    # Cyan
            (128, 0, 255),    # Purple
        ]
        
        self.bricks = []
        rows = 6
        cols = 8
        spacing = 2
        
        start_x = (128 - (cols * (self.brick_width + spacing) - spacing)) // 2
        start_y = 10
        
        for row in range(rows):
            for col in range(cols):
                x = start_x + col * (self.brick_width + spacing)
                y = start_y + row * (self.brick_height + spacing)
                self.bricks.append({
                    'x': x,
                    'y': y,
                    'color': colors[row],
                    'active': True
                })
    
    def restart(self):
        """Restart game."""
        self.on_activate()
        audio.play('beep')
    
    def on_input(self, event):
        """Handle input."""
        if event.key == InputEvent.BACK or event.key == InputEvent.HOME:
            return False  # Exit app
        
        if self.game_over or self.won:
            if event.key == 'r' or event.key == InputEvent.SELECT:
                self.restart()
                return True
            return True
        
        if event.key == InputEvent.LEFT:
            self.paddle_x = max(0, self.paddle_x - self.paddle_speed)
            self.dirty = True
            return True
        elif event.key == InputEvent.RIGHT:
            self.paddle_x = min(128 - self.paddle_width, self.paddle_x + self.paddle_speed)
            self.dirty = True
            return True
        elif event.key == 'r':
            self.restart()
            return True
        
        return False
    
    def on_update(self, delta_time):
        """Update game logic."""
        if self.game_over or self.won:
            return
        
        self.dirty = True
        
        # Move ball
        self.ball_x += self.ball_vx
        self.ball_y += self.ball_vy
        
        # Ball collision with walls
        if self.ball_x <= 0 or self.ball_x >= 128 - self.ball_size:
            self.ball_vx = -self.ball_vx
            audio.play('tick')
        
        if self.ball_y <= 0:
            self.ball_vy = -self.ball_vy
            audio.play('tick')
        
        # Ball collision with paddle
        if (self.ball_y + self.ball_size >= self.paddle_y and
            self.ball_y < self.paddle_y + self.paddle_height and
            self.ball_x + self.ball_size > self.paddle_x and
            self.ball_x < self.paddle_x + self.paddle_width):
            
            self.ball_vy = -abs(self.ball_vy)  # Always bounce up
            # Add spin based on where ball hits paddle
            hit_pos = (self.ball_x + self.ball_size/2 - self.paddle_x) / self.paddle_width
            self.ball_vx = int((hit_pos - 0.5) * 5)
            audio.play('beep')
        
        # Ball collision with bricks
        for brick in self.bricks:
            if not brick['active']:
                continue
            
            if (self.ball_x + self.ball_size > brick['x'] and
                self.ball_x < brick['x'] + self.brick_width and
                self.ball_y + self.ball_size > brick['y'] and
                self.ball_y < brick['y'] + self.brick_height):
                
                brick['active'] = False
                self.ball_vy = -self.ball_vy
                self.score += 10
                audio.play('collect')
                break
        
        # Ball falls off bottom
        if self.ball_y >= 128:
            self.lives -= 1
            audio.play('warning')
            
            if self.lives <= 0:
                self.game_over = True
                audio.play('gameover')
                if self.score > self.high_score:
                    self.high_score = self.score
                    storage.set('breakout.high_score', self.high_score)
            else:
                # Reset ball
                self.ball_x = 62
                self.ball_y = self.paddle_y - 10
                self.ball_vx = 2
                self.ball_vy = -2
        
        # Check win condition
        if all(not brick['active'] for brick in self.bricks):
            self.won = True
            audio.play('success')
            if self.score > self.high_score:
                self.high_score = self.score
                storage.set('breakout.high_score', self.high_score)
    
    def render(self, matrix):
        """Render game."""
        matrix.clear()
        
        # Draw bricks
        for brick in self.bricks:
            if brick['active']:
                matrix.rect(brick['x'], brick['y'],
                           self.brick_width, self.brick_height,
                           brick['color'], fill=True)
                # Add 3D effect
                matrix.rect(brick['x'], brick['y'],
                           self.brick_width, self.brick_height,
                           (255, 255, 255), fill=False)
        
        # Draw paddle
        matrix.rect(self.paddle_x, self.paddle_y,
                   self.paddle_width, self.paddle_height,
                   (255, 255, 255), fill=True)
        # Paddle highlight
        matrix.rect(self.paddle_x + 2, self.paddle_y + 1,
                   self.paddle_width - 4, 1,
                   (180, 180, 255), fill=True)
        
        # Draw ball
        matrix.rect(int(self.ball_x), int(self.ball_y),
                   self.ball_size, self.ball_size,
                   (255, 255, 0), fill=True)
        
        # HUD - bottom bar
        matrix.rect(0, 0, 128, 8, (0, 0, 30), fill=True)
        matrix.text(f"Score:{self.score}", 2, 1, (255, 255, 255))
        matrix.text(f"Hi:{self.high_score}", 58, 1, (255, 200, 0))
        
        # Lives indicators
        for i in range(self.lives):
            matrix.rect(110 + i*6, 2, 4, 4, (255, 0, 0), fill=True)
        
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


def main():
    """Entry point for standalone mode."""
    from matrixos.led_api import create_matrix
    from matrixos.input import KeyboardInput
    
    print("\n" + "="*64)
    print("BREAKOUT")
    print("="*64)
    print("\nControls:")
    print("  Arrow Keys - Move paddle")
    print("  R          - Restart")
    print("  Backspace  - Quit")
    print("\n" + "="*64 + "\n")
    
    matrix = create_matrix(128, 128, 'rgb')
    
    with KeyboardInput() as input_handler:
        app = BreakoutGame()
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
