#!/usr/bin/env python3
"""
BREAKOUT - Classic brick-breaking game
Arrow keys to move paddle, ESC/Q to quit
"""

import sys
import os
import time

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from matrixos.led_api import create_matrix
from matrixos.input import KeyboardInput, InputEvent
from matrixos.config import parse_matrix_args


class Breakout:
    """Breakout game."""

    def __init__(self, matrix, input_handler):
        self.matrix = matrix
        self.input = input_handler
        self.width = matrix.width
        self.height = matrix.height

        # Paddle
        self.paddle_width = 12
        self.paddle_height = 2
        self.paddle_x = (self.width - self.paddle_width) // 2
        self.paddle_y = self.height - 6
        self.paddle_speed = 2

        # Ball
        self.ball_x = self.width // 2
        self.ball_y = self.paddle_y - 4
        self.ball_vx = 1
        self.ball_vy = -1
        self.ball_size = 2

        # Bricks
        self.bricks = []
        self.brick_width = 8
        self.brick_height = 3
        self.init_bricks()

        # Game state
        self.score = 0
        self.lives = 3
        self.running = True
        self.game_over = False
        self.won = False

    def init_bricks(self):
        """Initialize bricks."""
        colors = [
            (255, 0, 0),    # Red
            (255, 128, 0),  # Orange
            (255, 255, 0),  # Yellow
            (0, 255, 0),    # Green
        ]

        rows = 4
        cols = 7
        spacing = 1

        for row in range(rows):
            for col in range(cols):
                x = col * (self.brick_width + spacing) + 2
                y = row * (self.brick_height + spacing) + 8
                self.bricks.append({
                    'x': x,
                    'y': y,
                    'color': colors[row],
                    'active': True
                })

    def update(self):
        """Update game state."""
        if self.game_over or self.won:
            return

        # Move ball
        self.ball_x += self.ball_vx
        self.ball_y += self.ball_vy

        # Ball collision with walls
        if self.ball_x <= 0 or self.ball_x >= self.width - self.ball_size:
            self.ball_vx = -self.ball_vx

        if self.ball_y <= 0:
            self.ball_vy = -self.ball_vy

        # Ball collision with paddle
        if (self.ball_y + self.ball_size >= self.paddle_y and
            self.ball_y < self.paddle_y + self.paddle_height and
            self.ball_x + self.ball_size > self.paddle_x and
            self.ball_x < self.paddle_x + self.paddle_width):

            self.ball_vy = -abs(self.ball_vy)  # Always bounce up
            # Add spin based on where ball hits paddle
            hit_pos = (self.ball_x - self.paddle_x) / self.paddle_width
            self.ball_vx = int((hit_pos - 0.5) * 3)

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
                break

        # Ball falls off bottom
        if self.ball_y >= self.height:
            self.lives -= 1
            if self.lives <= 0:
                self.game_over = True
            else:
                # Reset ball
                self.ball_x = self.width // 2
                self.ball_y = self.paddle_y - 4
                self.ball_vx = 1
                self.ball_vy = -1

        # Check win condition
        if all(not brick['active'] for brick in self.bricks):
            self.won = True

    def handle_input(self, event):
        """Handle input."""
        if event.key == InputEvent.LEFT:
            self.paddle_x = max(0, self.paddle_x - self.paddle_speed)
        elif event.key == InputEvent.RIGHT:
            self.paddle_x = min(self.width - self.paddle_width,
                              self.paddle_x + self.paddle_speed)
        elif event.key in [InputEvent.QUIT, InputEvent.BACK]:
            self.running = False

    def render(self):
        """Render game."""
        self.matrix.clear()

        # Draw bricks
        for brick in self.bricks:
            if brick['active']:
                self.matrix.rect(brick['x'], brick['y'],
                               self.brick_width, self.brick_height,
                               brick['color'], fill=True)

        # Draw paddle
        self.matrix.rect(self.paddle_x, self.paddle_y,
                       self.paddle_width, self.paddle_height,
                       (255, 255, 255), fill=True)

        # Draw ball
        self.matrix.rect(int(self.ball_x), int(self.ball_y),
                       self.ball_size, self.ball_size,
                       (255, 255, 0), fill=True)

        # Draw score and lives (top bar)
        self.matrix.rect(0, 0, self.width, 6, (0, 0, 50), fill=True)
        self.matrix.text(f"{self.score}", 2, 0, (255, 255, 255))
        for i in range(self.lives):
            self.matrix.rect(self.width - 4 - i*5, 1, 3, 3, (255, 0, 0), fill=True)

        # Game over / won screen
        if self.game_over:
            self.matrix.rect(8, 24, 48, 16, (0, 0, 0), fill=True)
            self.matrix.rect(8, 24, 48, 16, (255, 0, 0), fill=False)
            self.matrix.centered_text("GAME", 28, (255, 0, 0))
            self.matrix.centered_text("OVER", 36, (255, 0, 0))
        elif self.won:
            self.matrix.rect(8, 24, 48, 16, (0, 0, 0), fill=True)
            self.matrix.rect(8, 24, 48, 16, (0, 255, 0), fill=False)
            self.matrix.centered_text("YOU", 28, (0, 255, 0))
            self.matrix.centered_text("WIN!", 36, (0, 255, 0))

        self.matrix.show()

    def run(self):
        """Run game loop."""
        # Title screen
        self.matrix.clear()
        self.matrix.centered_text("BREAK", 22, (255, 128, 0))
        self.matrix.centered_text("OUT", 32, (255, 128, 0))
        self.matrix.show()
        time.sleep(2)

        last_update = time.time()

        while self.running:
            current_time = time.time()
            dt = current_time - last_update

            # Update at ~30 FPS
            if dt >= 0.033:
                self.update()
                last_update = current_time

            # Handle input
            event = self.input.get_key(timeout=0.01)
            if event:
                self.handle_input(event)

            # Render
            self.render()


def main():
    args = parse_matrix_args("Breakout")

    print("\n" + "="*64)
    print("BREAKOUT")
    print("="*64)
    print(f"\nResolution: {args.width}x{args.height}")
    print("\nControls:")
    print("  ←/→  - Move paddle")
    print("  Q    - Quit")
    print("\n" + "="*64 + "\n")

    matrix = create_matrix(args.width, args.height, args.color_mode)

    with KeyboardInput() as input_handler:
        game = Breakout(matrix, input_handler)
        game.run()

    print("\n" + "="*64)
    print(f"Final Score: {game.score}")
    print("="*64 + "\n")


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nGame interrupted.")
