#!/usr/bin/env python3
"""
SNAKE - Classic snake game
Arrow keys to change direction, ESC/Q to quit
"""

import sys
import os
import time
import random

# Add project root to path (go up two levels: snake -> apps -> project root)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from matrixos.led_api import create_matrix
from matrixos.input import KeyboardInput, InputEvent
from matrixos.config import parse_matrix_args


class Snake:
    """Snake game."""

    def __init__(self, matrix, input_handler):
        self.matrix = matrix
        self.input = input_handler
        self.width = matrix.width
        self.height = matrix.height

        # Snake
        self.snake = [(self.width // 2, self.height // 2)]
        self.direction = (1, 0)  # Start moving right
        self.next_direction = (1, 0)
        self.grow_pending = 0

        # Food
        self.food = self.spawn_food()

        # Game state
        self.score = 0
        self.running = True
        self.game_over = False
        self.speed = 0.15  # Seconds per move

    def spawn_food(self):
        """Spawn food at random location."""
        while True:
            x = random.randint(1, self.width - 2)
            y = random.randint(8, self.height - 2)
            if (x, y) not in self.snake:
                return (x, y)

    def update(self):
        """Update game state."""
        if self.game_over:
            return

        # Update direction (can't reverse)
        if (self.next_direction[0] != -self.direction[0] or
            self.next_direction[1] != -self.direction[1]):
            self.direction = self.next_direction

        # Move snake
        head_x, head_y = self.snake[0]
        new_head = (head_x + self.direction[0], head_y + self.direction[1])

        # Check collisions
        # Wall collision
        if (new_head[0] < 0 or new_head[0] >= self.width or
            new_head[1] < 7 or new_head[1] >= self.height):
            self.game_over = True
            return

        # Self collision
        if new_head in self.snake:
            self.game_over = True
            return

        # Add new head
        self.snake.insert(0, new_head)

        # Check if ate food
        if new_head == self.food:
            self.score += 10
            self.grow_pending = 3
            self.food = self.spawn_food()
            # Speed up slightly
            self.speed = max(0.05, self.speed * 0.95)

        # Remove tail (unless growing)
        if self.grow_pending > 0:
            self.grow_pending -= 1
        else:
            self.snake.pop()

    def handle_input(self, event):
        """Handle input."""
        if event.key == InputEvent.UP:
            self.next_direction = (0, -1)
        elif event.key == InputEvent.DOWN:
            self.next_direction = (0, 1)
        elif event.key == InputEvent.LEFT:
            self.next_direction = (-1, 0)
        elif event.key == InputEvent.RIGHT:
            self.next_direction = (1, 0)
        elif event.key in [InputEvent.QUIT, InputEvent.BACK]:
            self.running = False

    def render(self):
        """Render game."""
        self.matrix.clear()

        # Border
        self.matrix.rect(0, 7, self.width, self.height - 7, (100, 100, 100), fill=False)

        # Snake (head different color)
        for i, (x, y) in enumerate(self.snake):
            if i == 0:
                # Head
                self.matrix.rect(x, y, 1, 1, (255, 255, 0), fill=True)
            else:
                # Body
                self.matrix.rect(x, y, 1, 1, (0, 255, 0), fill=True)

        # Food (blinking)
        if int(time.time() * 3) % 2 == 0:
            self.matrix.rect(self.food[0], self.food[1], 1, 1, (255, 0, 0), fill=True)

        # Score (top bar)
        self.matrix.rect(0, 0, self.width, 6, (0, 0, 50), fill=True)
        self.matrix.text(f"SCORE:{self.score}", 2, 0, (255, 255, 255))

        # Game over
        if self.game_over:
            self.matrix.rect(8, 24, 48, 16, (0, 0, 0), fill=True)
            self.matrix.rect(8, 24, 48, 16, (255, 0, 0), fill=False)
            self.matrix.centered_text("GAME", 28, (255, 0, 0))
            self.matrix.centered_text("OVER", 36, (255, 0, 0))

        self.matrix.show()

    def run(self):
        """Run game loop."""
        # Title screen
        self.matrix.clear()
        self.matrix.centered_text("SNAKE", 26, (0, 255, 0))
        self.matrix.show()
        time.sleep(2)

        last_update = time.time()

        while self.running:
            current_time = time.time()

            # Handle input (fast response)
            event = self.input.get_key(timeout=0.01)
            if event:
                self.handle_input(event)

            # Update at game speed
            if current_time - last_update >= self.speed:
                self.update()
                self.render()
                last_update = current_time


def main():
    args = parse_matrix_args("Snake Game")

    print("\n" + "="*64)
    print("SNAKE")
    print("="*64)
    print(f"\nResolution: {args.width}x{args.height}")
    print("\nControls:")
    print("  ↑↓←→ - Change direction")
    print("  Q    - Quit")
    print("\n" + "="*64 + "\n")

    matrix = create_matrix(args.width, args.height, args.color_mode)

    with KeyboardInput() as input_handler:
        game = Snake(matrix, input_handler)
        game.run()

    print("\n" + "="*64)
    print(f"Final Score: {game.score}")
    print(f"Length: {len(game.snake)}")
    print("="*64 + "\n")


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nGame interrupted.")
