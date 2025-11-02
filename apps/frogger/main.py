#!/usr/bin/env python3
"""
Frogger Game - Classic arcade action!

Help the frog cross the road and river to reach home safely.

Controls:
- Arrow Keys: Move frog
- R: Restart level
- ESC: Exit to launcher

Features:
- Multiple lanes of traffic
- Floating logs and turtles
- Lives system
- Score tracking
- Increasing difficulty
"""

import sys
import os
import time
import random

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from matrixos.app_framework import App
from matrixos.input import InputEvent
from matrixos import layout, storage, audio


class Frog:
    """The player's frog."""
    
    def __init__(self, start_x, start_y):
        self.x = start_x
        self.y = start_y
        self.size = 6
        self.alive = True
        self.on_log = False
        self.log_speed = 0
    
    def move(self, dx, dy, grid_size=8):
        """Move frog by grid units."""
        if self.alive:
            self.x += dx * grid_size
            self.y += dy * grid_size
    
    def reset(self, start_x, start_y):
        """Reset frog position."""
        self.x = start_x
        self.y = start_y
        self.alive = True
        self.on_log = False
        self.log_speed = 0


class Vehicle:
    """Road vehicle (car, truck)."""
    
    def __init__(self, x, y, width, speed, color):
        self.x = x
        self.y = y
        self.width = width
        self.height = 6
        self.speed = speed
        self.color = color
    
    def update(self, dt, screen_width):
        """Update vehicle position."""
        self.x += self.speed * dt
        
        # Wrap around
        if self.speed > 0 and self.x > screen_width + self.width:
            self.x = -self.width
        elif self.speed < 0 and self.x < -self.width:
            self.x = screen_width + self.width


class Log:
    """Floating log in river."""
    
    def __init__(self, x, y, width, speed):
        self.x = x
        self.y = y
        self.width = width
        self.height = 6
        self.speed = speed
    
    def update(self, dt, screen_width):
        """Update log position."""
        self.x += self.speed * dt
        
        # Wrap around
        if self.speed > 0 and self.x > screen_width + self.width:
            self.x = -self.width
        elif self.speed < 0 and self.x < -self.width:
            self.x = screen_width + self.width


class FroggerGame(App):
    """Frogger game app."""
    
    def __init__(self):
        super().__init__("Frogger")
        
        self.score = 0
        self.high_score = storage.get('frogger.high_score', default=0)
        self.lives = 3
        self.level = 1
        
        self.grid_size = 8  # Pixels per grid unit
        self.start_y = None  # Set in reset()
        
        self.frog = None
        self.vehicles = []
        self.logs = []
        
        self.game_over = False
        self.win = False
        
    def get_help_text(self):
        """Return app-specific help."""
        return [("Arrows", "Move"), ("R", "Restart")]
    
    def on_activate(self):
        """App becomes active."""
        self.reset_game()
    
    def reset_game(self):
        """Reset game to start."""
        # Get screen dimensions
        # We'll set this properly when rendering
        self.score = 0
        self.lives = 3
        self.level = 1
        self.game_over = False
        self.win = False
    
    def reset_level(self, width, height):
        """Reset level with screen dimensions."""
        self.grid_size = 8
        
        # Frog starts at bottom center
        self.start_x = width // 2
        self.start_y = height - 10
        
        if self.frog is None:
            self.frog = Frog(self.start_x, self.start_y)
        else:
            self.frog.reset(self.start_x, self.start_y)
        
        # Clear obstacles
        self.vehicles = []
        self.logs = []
        
        # Create road lanes (bottom half)
        road_y = height - 24
        lane_spacing = 10
        
        # Lane 1: Cars moving right
        for i in range(3):
            x = i * (width // 3) + random.randint(0, 20)
            speed = 30 + self.level * 5
            self.vehicles.append(Vehicle(x, road_y, 16, speed, (255, 0, 0)))
        
        road_y -= lane_spacing
        
        # Lane 2: Trucks moving left
        for i in range(2):
            x = i * (width // 2) + random.randint(0, 30)
            speed = -(25 + self.level * 5)
            self.vehicles.append(Vehicle(x, road_y, 24, speed, (0, 100, 255)))
        
        road_y -= lane_spacing
        
        # Lane 3: Fast cars moving right
        for i in range(4):
            x = i * (width // 4) + random.randint(0, 15)
            speed = 40 + self.level * 8
            self.vehicles.append(Vehicle(x, road_y, 12, speed, (255, 255, 0)))
        
        # Create river lanes (middle)
        river_y = height // 2 + 10
        
        # Log lane 1
        for i in range(3):
            x = i * (width // 3) + random.randint(0, 20)
            speed = 20
            self.logs.append(Log(x, river_y, 30, speed))
        
        river_y -= lane_spacing
        
        # Log lane 2 (moving left)
        for i in range(2):
            x = i * (width // 2) + random.randint(0, 40)
            speed = -25
            self.logs.append(Log(x, river_y, 40, speed))
        
        river_y -= lane_spacing
        
        # Log lane 3
        for i in range(3):
            x = i * (width // 3) + random.randint(0, 25)
            speed = 22
            self.logs.append(Log(x, river_y, 35, speed))
    
    def on_event(self, event):
        """Handle input."""
        if self.game_over or self.win:
            if event.key == InputEvent.OK or event.key == 'r' or event.key == 'R':
                self.reset_game()
                audio.play('jump')
                return True
            return False
        
        if event.key == InputEvent.UP:
            self.frog.move(0, -1, self.grid_size)
            self.score += 10
            audio.play('jump')
            return True
        elif event.key == InputEvent.DOWN:
            self.frog.move(0, 1, self.grid_size)
            audio.play('jump')
            return True
        elif event.key == InputEvent.LEFT:
            self.frog.move(-1, 0, self.grid_size)
            audio.play('jump')
            return True
        elif event.key == InputEvent.RIGHT:
            self.frog.move(1, 0, self.grid_size)
            audio.play('jump')
            return True
        elif event.key == 'r' or event.key == 'R':
            self.reset_game()
            audio.play('jump')
            return True
        
        return False
    
    def on_update(self, delta_time):
        """Update game state."""
        if self.game_over or self.win:
            return
        
        # Update vehicles
        for vehicle in self.vehicles:
            vehicle.update(delta_time, 128)  # Assume 128 width for now
        
        # Update logs
        for log in self.logs:
            log.update(delta_time, 128)
        
        # Check collisions
        self.check_collisions()
        
        # Check win condition
        if self.frog.y < 20:  # Reached top
            self.win = True
            self.score += 1000
            if self.score > self.high_score:
                self.high_score = self.score
                storage.set('frogger.high_score', self.high_score)
            audio.play('success')
        
        self.dirty = True
    
    def check_collisions(self):
        """Check for collisions with vehicles and water."""
        if not self.frog.alive:
            return
        
        # Check vehicle collisions
        for vehicle in self.vehicles:
            if self.check_overlap(
                self.frog.x, self.frog.y, self.frog.size, self.frog.size,
                vehicle.x, vehicle.y, vehicle.width, vehicle.height
            ):
                self.die()
                return
        
        # Check if in river area (between lanes)
        river_top = 40
        river_bottom = 80
        
        if river_top < self.frog.y < river_bottom:
            # In river - must be on a log
            on_log = False
            for log in self.logs:
                if self.check_overlap(
                    self.frog.x, self.frog.y, self.frog.size, self.frog.size,
                    log.x, log.y, log.width, log.height
                ):
                    on_log = True
                    self.frog.on_log = True
                    self.frog.log_speed = log.speed
                    # Move frog with log
                    self.frog.x += log.speed * 0.016  # Approximate dt
                    break
            
            if not on_log:
                self.frog.on_log = False
                self.die()
                return
        else:
            self.frog.on_log = False
        
        # Check if frog went off screen
        if self.frog.x < 0 or self.frog.x > 122 or self.frog.y > 122:
            self.die()
    
    def check_overlap(self, x1, y1, w1, h1, x2, y2, w2, h2):
        """Check if two rectangles overlap."""
        return (x1 < x2 + w2 and x1 + w1 > x2 and
                y1 < y2 + h2 and y1 + h1 > y2)
    
    def die(self):
        """Frog dies."""
        self.frog.alive = False
        self.lives -= 1
        audio.play('hit')
        
        if self.lives <= 0:
            self.game_over = True
            if self.score > self.high_score:
                self.high_score = self.score
                storage.set('frogger.high_score', self.high_score)
            audio.play('gameover')
        else:
            # Reset frog position
            self.frog.reset(self.start_x, self.start_y)
    
    def render(self, matrix):
        """Draw game."""
        width = matrix.width
        height = matrix.height
        
        # Initialize level if needed
        if not self.vehicles:
            self.reset_level(width, height)
        
        # Background
        # Sky (top)
        matrix.rect(0, 0, width, 30, (50, 100, 200), fill=True)
        
        # Goal area
        matrix.rect(0, 10, width, 10, (100, 255, 100), fill=True)
        matrix.text("HOME", width//2 - 12, 12, (0, 100, 0))
        
        # River
        matrix.rect(0, 30, width, 50, (50, 150, 255), fill=True)
        
        # Road
        matrix.rect(0, height - 40, width, 30, (60, 60, 60), fill=True)
        
        # Safe zone (bottom)
        matrix.rect(0, height - 10, width, 10, (100, 200, 100), fill=True)
        
        # Draw logs
        for log in self.logs:
            matrix.rect(int(log.x), int(log.y), log.width, log.height, 
                       (139, 69, 19), fill=True)
            # Log texture
            for i in range(0, log.width, 6):
                matrix.line(int(log.x + i), int(log.y), 
                          int(log.x + i), int(log.y + log.height), (160, 82, 45))
        
        # Draw vehicles
        for vehicle in self.vehicles:
            matrix.rect(int(vehicle.x), int(vehicle.y), vehicle.width, vehicle.height,
                       vehicle.color, fill=True)
            # Windows
            window_color = (200, 220, 255)
            matrix.rect(int(vehicle.x + 2), int(vehicle.y + 1), 
                       vehicle.width - 4, 3, window_color, fill=True)
        
        # Draw frog
        if self.frog.alive:
            frog_color = (50, 255, 50) if self.frog.on_log else (100, 255, 100)
            # Frog body
            matrix.circle(int(self.frog.x + 3), int(self.frog.y + 3), 3, frog_color, fill=True)
            # Eyes
            matrix.set_pixel(int(self.frog.x + 1), int(self.frog.y + 1), (0, 0, 0))
            matrix.set_pixel(int(self.frog.x + 5), int(self.frog.y + 1), (0, 0, 0))
        
        # HUD
        hud_y = 2
        matrix.text(f"Score:{self.score}", 2, hud_y, (255, 255, 255))
        matrix.text(f"Hi:{self.high_score}", width - 50, hud_y, (255, 255, 0))
        
        # Lives
        lives_x = 2
        for i in range(self.lives):
            matrix.circle(lives_x + i * 8, height - 4, 2, (50, 255, 50), fill=True)
        
        # Game over / Win
        if self.game_over:
            layout.center_text(matrix, "GAME OVER", height // 2 - 10, (255, 0, 0))
            layout.center_text(matrix, "Press R", height // 2, (255, 255, 255))
        elif self.win:
            layout.center_text(matrix, "YOU WIN!", height // 2 - 10, (255, 255, 0))
            layout.center_text(matrix, f"Score: {self.score}", height // 2, (255, 255, 255))
            layout.center_text(matrix, "Press R", height // 2 + 10, (200, 200, 200))


def run(os_context):
    """Entry point called by OS."""
    app = FroggerGame()
    os_context.register_app(app)
    os_context.switch_to_app(app)
    os_context.run()


def main():
    """Standalone testing mode."""
    from matrixos.led_api import create_matrix
    from matrixos.input import KeyboardInput
    from matrixos.config import parse_matrix_args
    from matrixos.app_framework import OSContext

    args = parse_matrix_args("Frogger Game")
    matrix = create_matrix(args.width, args.height, args.color_mode)

    print("\n" + "="*64)
    print("FROGGER - Classic Arcade Game!")
    print("="*64)
    print("\nControls:")
    print("  Arrow Keys - Move frog")
    print("  R          - Restart")
    print("  ESC        - Exit")
    print("\n" + "="*64 + "\n")

    with KeyboardInput() as input_handler:
        os = OSContext(matrix, input_handler)
        app = FroggerGame()
        os.register_app(app)
        os.switch_to_app(app)
        os.run()

    print("\nFrogger closed.")


# App instance for launcher
app = FroggerGame()


if __name__ == '__main__':
    main()
