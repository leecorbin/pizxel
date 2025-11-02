#!/usr/bin/env python3
"""
Tetris Game - Classic falling blocks

Features:
- Classic 7 tetromino shapes
- Line clearing with scoring
- Progressive difficulty (speed increases)
- Next piece preview
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


# Tetromino shapes (as 4x4 grids)
SHAPES = {
    'I': [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]],
    'O': [[0,0,0,0], [0,1,1,0], [0,1,1,0], [0,0,0,0]],
    'T': [[0,0,0,0], [0,1,0,0], [1,1,1,0], [0,0,0,0]],
    'S': [[0,0,0,0], [0,1,1,0], [1,1,0,0], [0,0,0,0]],
    'Z': [[0,0,0,0], [1,1,0,0], [0,1,1,0], [0,0,0,0]],
    'J': [[0,0,0,0], [1,0,0,0], [1,1,1,0], [0,0,0,0]],
    'L': [[0,0,0,0], [0,0,1,0], [1,1,1,0], [0,0,0,0]],
}

COLORS = {
    'I': (0, 255, 255),
    'O': (255, 255, 0),
    'T': (255, 0, 255),
    'S': (0, 255, 0),
    'Z': (255, 0, 0),
    'J': (0, 0, 255),
    'L': (255, 128, 0),
}


class TetrisGame(App):
    """Classic Tetris game."""
    
    def __init__(self):
        super().__init__()
        # Playfield (10 wide x 20 tall)
        self.field_width = 10
        self.field_height = 20
        self.block_size = 5
        self.field_x = 8
        self.field_y = 8
        self.field = []
        
        # Current piece
        self.current_shape = None
        self.current_type = None
        self.current_x = 0
        self.current_y = 0
        
        # Next piece
        self.next_type = None
        
        # Game state
        self.score = 0
        self.lines = 0
        self.high_score = storage.get('tetris.high_score', 0)
        self.game_over = False
        self.won = False
        self.update_timer = 0
        self.update_speed = 30  # Frames between drops
        self.fast_fall = False
        
    def on_activate(self):
        """Initialize game."""
        self.field = [[None for _ in range(self.field_width)]
                      for _ in range(self.field_height)]
        self.score = 0
        self.lines = 0
        self.game_over = False
        self.won = False
        self.update_timer = 0
        self.update_speed = 30
        self.fast_fall = False
        self.next_type = random.choice(list(SHAPES.keys()))
        self.spawn_piece()
        self.dirty = True
    
    def rotate_shape(self, shape):
        """Rotate shape 90 degrees clockwise."""
        return [[shape[3-j][i] for j in range(4)] for i in range(4)]
    
    def spawn_piece(self):
        """Spawn a new piece."""
        self.current_type = self.next_type
        self.current_shape = [row[:] for row in SHAPES[self.current_type]]
        self.current_x = self.field_width // 2 - 2
        self.current_y = 0
        self.next_type = random.choice(list(SHAPES.keys()))
        
        # Check if can spawn
        if not self.can_place(self.current_x, self.current_y, self.current_shape):
            self.game_over = True
            audio.play('gameover')
            if self.score > self.high_score:
                self.high_score = self.score
                storage.set('tetris.high_score', self.high_score)
    
    def can_place(self, x, y, shape):
        """Check if piece can be placed at position."""
        for sy in range(4):
            for sx in range(4):
                if shape[sy][sx]:
                    fx = x + sx
                    fy = y + sy
                    
                    # Check bounds
                    if fx < 0 or fx >= self.field_width or fy >= self.field_height:
                        return False
                    
                    # Check collision (but allow negative y for spawning)
                    if fy >= 0 and self.field[fy][fx] is not None:
                        return False
        
        return True
    
    def place_piece(self):
        """Place current piece into field."""
        for sy in range(4):
            for sx in range(4):
                if self.current_shape[sy][sx]:
                    fx = self.current_x + sx
                    fy = self.current_y + sy
                    if 0 <= fy < self.field_height:
                        self.field[fy][fx] = self.current_type
        
        # Check for completed lines
        self.check_lines()
        
        # Spawn next piece
        self.spawn_piece()
    
    def check_lines(self):
        """Check and clear completed lines."""
        lines_cleared = 0
        
        y = self.field_height - 1
        while y >= 0:
            if all(self.field[y][x] is not None for x in range(self.field_width)):
                # Remove line
                del self.field[y]
                # Add empty line at top
                self.field.insert(0, [None for _ in range(self.field_width)])
                lines_cleared += 1
                # Don't decrement y, check same line again
            else:
                y -= 1
        
        if lines_cleared > 0:
            self.lines += lines_cleared
            # Score: 100, 300, 500, 800 for 1-4 lines
            scores = [0, 100, 300, 500, 800]
            self.score += scores[min(lines_cleared, 4)]
            audio.play('collect')
            
            # Speed up
            if self.update_speed > 5:
                self.update_speed = max(5, int(self.update_speed * 0.95))
    
    def restart(self):
        """Restart game."""
        self.on_activate()
        audio.play('beep')
    
    def on_input(self, event):
        """Handle input."""
        if event.key == InputEvent.BACK or event.key == InputEvent.HOME:
            return False  # Exit app
        
        if self.game_over:
            if event.key == 'r' or event.key == InputEvent.SELECT:
                self.restart()
                return True
            return True
        
        if event.key == InputEvent.LEFT:
            if self.can_place(self.current_x - 1, self.current_y, self.current_shape):
                self.current_x -= 1
                self.dirty = True
                audio.play('tick')
            return True
        
        elif event.key == InputEvent.RIGHT:
            if self.can_place(self.current_x + 1, self.current_y, self.current_shape):
                self.current_x += 1
                self.dirty = True
                audio.play('tick')
            return True
        
        elif event.key == InputEvent.DOWN:
            self.fast_fall = True
            return True
        
        elif event.key == InputEvent.UP:
            # Rotate
            rotated = self.rotate_shape(self.current_shape)
            if self.can_place(self.current_x, self.current_y, rotated):
                self.current_shape = rotated
                self.dirty = True
                audio.play('tick')
            return True
        
        elif event.key == 'r':
            self.restart()
            return True
        
        return False
    
    def on_update(self, delta_time):
        """Update game logic."""
        if self.game_over:
            return
        
        self.update_timer += 1
        
        # Fast fall speed
        fall_speed = 2 if self.fast_fall else self.update_speed
        
        if self.update_timer >= fall_speed:
            self.update_timer = 0
            self.fast_fall = False
            
            # Try to move piece down
            if self.can_place(self.current_x, self.current_y + 1, self.current_shape):
                self.current_y += 1
                self.dirty = True
            else:
                # Piece landed
                self.place_piece()
                audio.play('beep')
                self.dirty = True
    
    def render(self, matrix):
        """Render game."""
        matrix.clear()
        
        # Draw playfield border
        border_x = self.field_x - 1
        border_y = self.field_y - 1
        border_w = self.field_width * self.block_size + 2
        border_h = self.field_height * self.block_size + 2
        matrix.rect(border_x, border_y, border_w, border_h, (100, 100, 100), fill=False)
        
        # Draw placed blocks
        for y in range(self.field_height):
            for x in range(self.field_width):
                if self.field[y][x] is not None:
                    color = COLORS[self.field[y][x]]
                    px = self.field_x + x * self.block_size
                    py = self.field_y + y * self.block_size
                    matrix.rect(px, py, self.block_size-1, self.block_size-1, color, fill=True)
        
        # Draw current piece
        if self.current_shape:
            color = COLORS[self.current_type]
            for sy in range(4):
                for sx in range(4):
                    if self.current_shape[sy][sx]:
                        px = self.field_x + (self.current_x + sx) * self.block_size
                        py = self.field_y + (self.current_y + sy) * self.block_size
                        matrix.rect(px, py, self.block_size-1, self.block_size-1, color, fill=True)
        
        # HUD - right side
        hud_x = self.field_x + self.field_width * self.block_size + 10
        matrix.text("NEXT", hud_x, 10, (255, 255, 255))
        
        # Draw next piece
        if self.next_type:
            next_shape = SHAPES[self.next_type]
            next_color = COLORS[self.next_type]
            for sy in range(4):
                for sx in range(4):
                    if next_shape[sy][sx]:
                        px = hud_x + sx * 4
                        py = 20 + sy * 4
                        matrix.rect(px, py, 3, 3, next_color, fill=True)
        
        # Score
        matrix.text(f"Score", hud_x, 45, (255, 255, 255))
        matrix.text(f"{self.score}", hud_x, 53, (0, 255, 0))
        
        matrix.text(f"Lines", hud_x, 65, (255, 255, 255))
        matrix.text(f"{self.lines}", hud_x, 73, (0, 255, 255))
        
        matrix.text(f"High", hud_x, 85, (255, 255, 255))
        matrix.text(f"{self.high_score}", hud_x, 93, (255, 200, 0))
        
        # Game over
        if self.game_over:
            layout.message_box(matrix, "GAME OVER", 
                               f"Score: {self.score}",
                               "Press R to restart")
        
        self.dirty = False


def main():
    """Entry point for standalone mode."""
    from matrixos.led_api import create_matrix
    from matrixos.input import KeyboardInput
    
    print("\n" + "="*64)
    print("TETRIS")
    print("="*64)
    print("\nControls:")
    print("  Arrow Keys - Move/Rotate")
    print("  Down       - Fast fall")
    print("  R          - Restart")
    print("  Backspace  - Quit")
    print("\n" + "="*64 + "\n")
    
    matrix = create_matrix(128, 128, 'rgb')
    
    with KeyboardInput() as input_handler:
        app = TetrisGame()
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
    print(f"Lines Cleared: {app.lines}")
    print(f"High Score: {app.high_score}")
    print(f"{'='*64}\n")


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nGame interrupted.")
