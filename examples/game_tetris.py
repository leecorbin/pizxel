#!/usr/bin/env python3
"""
TETRIS - Classic falling blocks game
←/→ to move, ↑ to rotate, ↓ to drop faster, Q to quit
"""

import sys
import os
import time
import random

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.led_api import create_matrix
from src.input import KeyboardInput, InputEvent


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


class Tetris:
    """Tetris game."""

    def __init__(self, matrix, input_handler):
        self.matrix = matrix
        self.input = input_handler

        # Playfield (10 wide x 20 tall)
        self.field_width = 10
        self.field_height = 20
        self.block_size = 2
        self.field_x = 2
        self.field_y = 2
        self.field = [[None for _ in range(self.field_width)]
                      for _ in range(self.field_height)]

        # Current piece
        self.current_shape = None
        self.current_type = None
        self.current_x = 0
        self.current_y = 0

        # Next piece
        self.next_type = random.choice(list(SHAPES.keys()))

        # Game state
        self.score = 0
        self.lines = 0
        self.running = True
        self.game_over = False
        self.fall_speed = 0.5
        self.last_fall = time.time()
        self.fast_fall = False

        # Spawn first piece
        self.spawn_piece()

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
            # Speed up
            self.fall_speed = max(0.1, self.fall_speed * 0.95)

    def update(self):
        """Update game state."""
        if self.game_over:
            return

        current_time = time.time()
        fall_time = 0.05 if self.fast_fall else self.fall_speed

        if current_time - self.last_fall >= fall_time:
            # Try to move piece down
            if self.can_place(self.current_x, self.current_y + 1, self.current_shape):
                self.current_y += 1
            else:
                # Piece landed
                self.place_piece()

            self.last_fall = current_time
            self.fast_fall = False

    def handle_input(self, event):
        """Handle input."""
        if self.game_over:
            return

        if event.key == InputEvent.LEFT:
            if self.can_place(self.current_x - 1, self.current_y, self.current_shape):
                self.current_x -= 1

        elif event.key == InputEvent.RIGHT:
            if self.can_place(self.current_x + 1, self.current_y, self.current_shape):
                self.current_x += 1

        elif event.key == InputEvent.DOWN:
            self.fast_fall = True

        elif event.key == InputEvent.UP:
            # Rotate
            rotated = self.rotate_shape(self.current_shape)
            if self.can_place(self.current_x, self.current_y, rotated):
                self.current_shape = rotated

        elif event.key in [InputEvent.QUIT, InputEvent.BACK]:
            self.running = False

    def render(self):
        """Render game."""
        self.matrix.clear()

        # Draw field border
        border_x = self.field_x - 1
        border_y = self.field_y - 1
        border_w = self.field_width * self.block_size + 2
        border_h = self.field_height * self.block_size + 2
        self.matrix.rect(border_x, border_y, border_w, border_h,
                       (100, 100, 100), fill=False)

        # Draw placed blocks
        for y in range(self.field_height):
            for x in range(self.field_width):
                if self.field[y][x] is not None:
                    block_type = self.field[y][x]
                    color = COLORS[block_type]
                    px = self.field_x + x * self.block_size
                    py = self.field_y + y * self.block_size
                    self.matrix.rect(px, py, self.block_size, self.block_size,
                                   color, fill=True)

        # Draw current piece
        if not self.game_over:
            color = COLORS[self.current_type]
            for sy in range(4):
                for sx in range(4):
                    if self.current_shape[sy][sx]:
                        px = self.field_x + (self.current_x + sx) * self.block_size
                        py = self.field_y + (self.current_y + sy) * self.block_size
                        if py >= self.field_y:  # Only draw if visible
                            self.matrix.rect(px, py, self.block_size, self.block_size,
                                           color, fill=True)

        # Draw score and lines (right side)
        info_x = self.field_x + border_w + 2
        self.matrix.text("SC", info_x, 4, (255, 255, 255))
        self.matrix.text(f"{self.score}", info_x, 12, (255, 255, 0))
        self.matrix.text("LN", info_x, 22, (255, 255, 255))
        self.matrix.text(f"{self.lines}", info_x, 30, (0, 255, 0))

        # Draw next piece preview
        self.matrix.text("NX", info_x, 40, (255, 255, 255))
        next_shape = SHAPES[self.next_type]
        next_color = COLORS[self.next_type]
        for sy in range(4):
            for sx in range(4):
                if next_shape[sy][sx]:
                    px = info_x + sx * 2
                    py = 46 + sy * 2
                    self.matrix.rect(px, py, 2, 2, next_color, fill=True)

        # Game over
        if self.game_over:
            self.matrix.rect(6, 18, 40, 20, (0, 0, 0), fill=True)
            self.matrix.rect(6, 18, 40, 20, (255, 0, 0), fill=False)
            self.matrix.centered_text("GAME", 22, (255, 0, 0))
            self.matrix.centered_text("OVER", 30, (255, 0, 0))

        self.matrix.show()

    def run(self):
        """Run game loop."""
        # Title screen
        self.matrix.clear()
        self.matrix.centered_text("TETR", 22, (0, 255, 255))
        self.matrix.centered_text("IS", 32, (0, 255, 255))
        self.matrix.show()
        time.sleep(2)

        while self.running:
            # Update
            self.update()

            # Handle input
            event = self.input.get_key(timeout=0.01)
            if event:
                self.handle_input(event)

            # Render
            self.render()


def main():
    print("\n" + "="*64)
    print("TETRIS")
    print("="*64)
    print("\nControls:")
    print("  ←/→  - Move piece")
    print("  ↑    - Rotate")
    print("  ↓    - Drop faster")
    print("  Q    - Quit")
    print("\n" + "="*64 + "\n")

    matrix = create_matrix(64, 64, 'rgb')

    with KeyboardInput() as input_handler:
        game = Tetris(matrix, input_handler)
        game.run()

    print("\n" + "="*64)
    print(f"Final Score: {game.score}")
    print(f"Lines: {game.lines}")
    print("="*64 + "\n")


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nGame interrupted.")
