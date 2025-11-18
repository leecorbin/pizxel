#!/usr/bin/env python3
"""
Pac-Man v2 - Refactored with Sprite Framework

This version uses the MatrixOS sprite framework to fix critical bugs:
- Grid-aligned spawning (no wall overlaps!)
- Clean collision detection
- Simplified movement logic
- Easier testing with sprite assertions

Features:
- Classic maze with dots and power pellets
- Four colorful ghosts with AI (Blinky, Pinky, Inky, Clyde)
- Chase, scatter, and frightened modes
- Lives system and score
- Authentic bitmap sprites (retro aesthetic)
"""

import sys
import os
import time
import random
import math

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from matrixos.app_framework import App
from matrixos.input import InputEvent
from matrixos.sprites import Sprite, SpriteGroup, TileMap
from matrixos import layout


class PacManSprite(Sprite):
    """Pac-Man sprite with movement and animation."""
    
    def __init__(self, x, y):
        super().__init__(x, y, width=6, height=6, color=(255, 255, 0))
        # Velocity is inherited from Sprite (vx, vy)
        self.next_dx = 0
        self.next_dy = 0
        self.speed = 30  # pixels per second
        self.mouth_angle = 0
        self.mouth_opening = True
        self.is_alive = True
        
    def set_direction(self, dx, dy):
        """Queue next direction (will be applied when valid)."""
        self.next_dx = dx
        self.next_dy = dy
    
    def update_with_maze(self, delta_time, tilemap):
        """Update with collision against tilemap."""
        # Try to apply queued direction
        if self.next_dx != 0 or self.next_dy != 0:
            test_vx = self.next_dx * self.speed
            test_vy = self.next_dy * self.speed
            
            # Check if new direction is valid
            test_x = self.x + test_vx * delta_time * 2
            test_y = self.y + test_vy * delta_time * 2
            
            # Create temporary sprite for collision check
            test_sprite = Sprite(test_x, test_y, self.width, self.height)
            if not tilemap.sprite_collides_with_tile(test_sprite, tile_id=1):
                self.velocity_x = test_vx
                self.velocity_y = test_vy
                self.next_dx = 0
                self.next_dy = 0
        
        # Move in current direction
        new_x = self.x + self.velocity_x * delta_time
        new_y = self.y + self.velocity_y * delta_time
        
        # Check collision with walls
        test_sprite = Sprite(new_x, new_y, self.width, self.height)
        if not tilemap.sprite_collides_with_tile(test_sprite, tile_id=1):
            self.x = new_x
            self.y = new_y
        else:
            # Hit wall, stop
            self.velocity_x = 0
            self.velocity_y = 0
        
        # Wrap around screen edges (tunnel)
        display_width = tilemap.width * tilemap.tile_size
        if self.x < -self.width:
            self.x = display_width + self.width
        elif self.x > display_width + self.width:
            self.x = -self.width
            
        # Animate mouth
        if self.mouth_opening:
            self.mouth_angle += 120 * delta_time
            if self.mouth_angle >= 45:
                self.mouth_opening = False
        else:
            self.mouth_angle -= 120 * delta_time
            if self.mouth_angle <= 0:
                self.mouth_opening = True
    
    def render(self, matrix):
        """Draw Pac-Man with animated mouth."""
        if not self.is_alive:
            return
        
        # Simple circle for now (could add mouth animation)
        cx = int(self.x)
        cy = int(self.y)
        radius = self.width // 2
        
        matrix.circle(cx, cy, radius, self.color, fill=True)


class GhostSprite(Sprite):
    """Ghost sprite with AI."""
    
    MODES = ["scatter", "chase", "frightened"]
    
    def __init__(self, name, x, y, color, home_corner):
        super().__init__(x, y, width=6, height=6, color=color)
        self.name = name
        self.start_x = x
        self.start_y = y
        self.home_corner = home_corner
        self.normal_color = color
        self.frightened_color = (50, 50, 255)
        self.speed = 25  # pixels per second
        self.mode = "scatter"
        self.mode_timer = 180
        self.frightened_timer = 0
        self.is_eaten = False
        self.decision_cooldown = 0  # Prevent rapid direction changes
        
    def update_ai(self, delta_time, pacman, tilemap, game_time):
        """Update ghost AI and movement."""
        # Update timers
        self.decision_cooldown -= delta_time
        
        # Handle modes
        if self.is_eaten:
            # Return to spawn
            target_x, target_y = self.start_x, self.start_y
            if self.distance_to(target_x, target_y) < 5:
                self.is_eaten = False
                self.mode = "scatter"
                self.mode_timer = 180
                self.color = self.normal_color
        elif self.mode == "frightened":
            self.frightened_timer -= delta_time
            if self.frightened_timer <= 0:
                self.mode = "scatter"
                self.mode_timer = 180
                self.color = self.normal_color
            # Random wandering when frightened
            target_x = self.x + random.choice([-20, 20])
            target_y = self.y + random.choice([-20, 20])
        elif self.mode == "scatter":
            target_x, target_y = self.home_corner
            self.mode_timer -= delta_time
            if self.mode_timer <= 0:
                self.mode = "chase"
                self.mode_timer = 240
        else:  # chase mode
            # Each ghost has unique targeting
            if self.name == "Blinky":
                # Direct chase
                target_x, target_y = pacman.x, pacman.y
            elif self.name == "Pinky":
                # Target ahead of Pac-Man
                target_x = pacman.x + (pacman.velocity_x / abs(pacman.velocity_x) if pacman.velocity_x != 0 else 0) * 20
                target_y = pacman.y + (pacman.velocity_y / abs(pacman.velocity_y) if pacman.velocity_y != 0 else 0) * 20
            elif self.name == "Inky":
                # Offset from Pac-Man's direction
                target_x = pacman.x + (pacman.velocity_x / abs(pacman.velocity_x) if pacman.velocity_x != 0 else 0) * 15
                target_y = pacman.y + (pacman.velocity_y / abs(pacman.velocity_y) if pacman.velocity_y != 0 else 0) * 15
            else:  # Clyde
                # Chase when far, scatter when close
                dist = self.distance_to(pacman.x, pacman.y)
                if dist > 40:
                    target_x, target_y = pacman.x, pacman.y
                else:
                    target_x, target_y = self.home_corner
            
            self.mode_timer -= delta_time
            if self.mode_timer <= 0:
                self.mode = "scatter"
                self.mode_timer = 180
        
        # Make movement decision (not every frame)
        if self.decision_cooldown <= 0:
            self.decide_direction(target_x, target_y, tilemap)
            self.decision_cooldown = 0.2  # Decide every 0.2 seconds
        
        # Move with collision detection
        new_x = self.x + self.velocity_x * delta_time
        new_y = self.y + self.velocity_y * delta_time
        
        test_sprite = Sprite(new_x, new_y, self.width, self.height)
        if not tilemap.sprite_collides_with_tile(test_sprite, tile_id=1):
            self.x = new_x
            self.y = new_y
        else:
            # Hit wall, change direction immediately
            self.decision_cooldown = 0
        
        # Wrap around screen
        display_width = tilemap.width * tilemap.tile_size
        if self.x < -self.width:
            self.x = display_width + self.width
        elif self.x > display_width + self.width:
            self.x = -self.width
    
    def decide_direction(self, target_x, target_y, tilemap):
        """Choose best direction toward target."""
        # Calculate direction to target
        dx = target_x - self.x
        dy = target_y - self.y
        
        # Try directions in order of preference
        directions = []
        if abs(dx) > abs(dy):
            # Prioritize horizontal
            if dx > 0:
                directions = [(1, 0), (0, 1) if dy > 0 else (0, -1), (-1, 0)]
            else:
                directions = [(-1, 0), (0, 1) if dy > 0 else (0, -1), (1, 0)]
        else:
            # Prioritize vertical
            if dy > 0:
                directions = [(0, 1), (1, 0) if dx > 0 else (-1, 0), (0, -1)]
            else:
                directions = [(0, -1), (1, 0) if dx > 0 else (-1, 0), (0, 1)]
        
        # Try each direction
        for dir_x, dir_y in directions:
            test_x = self.x + dir_x * self.speed * 0.3
            test_y = self.y + dir_y * self.speed * 0.3
            
            test_sprite = Sprite(test_x, test_y, self.width, self.height)
            if not tilemap.sprite_collides_with_tile(test_sprite, tile_id=1):
                self.velocity_x = dir_x * self.speed
                self.velocity_y = dir_y * self.speed
                return
        
        # All blocked, try reverse
        self.velocity_x = -self.velocity_x
        self.velocity_y = -self.velocity_y
    
    def frighten(self):
        """Make ghost frightened."""
        if not self.is_eaten:
            self.mode = "frightened"
            self.frightened_timer = 8  # seconds
            self.color = self.frightened_color
    
    def render(self, matrix):
        """Draw ghost."""
        cx = int(self.x)
        cy = int(self.y)
        radius = self.width // 2
        
        # Draw body as circle
        matrix.circle(cx, cy, radius, self.color, fill=True)
        
        # Draw eyes (white)
        if not self.is_eaten:
            eye_offset = 2
            matrix.set_pixel(cx - eye_offset, cy - 1, (255, 255, 255))
            matrix.set_pixel(cx + eye_offset, cy - 1, (255, 255, 255))


class PacManGameV2(App):
    """Pac-Man game using sprite framework."""
    
    def __init__(self):
        super().__init__("Pac-Man V2")
        
        # Create tilemap (16x16 grid, 8 pixel tiles = 128x128 display)
        # Note: Maze has 17 rows, so we need height=17
        self.tilemap = TileMap(width=16, height=17, tile_size=8)
        self.init_maze()
        
        # Create sprites (grid-aligned spawning!)
        # Pac-Man spawns at row 15 (bottom corridor, not row 14!)
        self.pacman = self.tilemap.spawn_at_grid_center(
            col=8, row=15, width=6, height=6
        )
        # Replace with PacManSprite
        self.pacman = PacManSprite(self.pacman.x, self.pacman.y)
        
        # Create ghosts (grid-aligned)
        ghost_data = [
            ("Blinky", 8, 1, (255, 0, 0), (14, 1)),      # Red, top center
            ("Pinky", 2, 4, (255, 184, 255), (1, 1)),    # Pink, left side
            ("Inky", 14, 4, (0, 255, 255), (14, 15)),    # Cyan, right side
            ("Clyde", 2, 9, (255, 184, 82), (1, 15)),    # Orange, left lower
        ]
        
        self.ghosts = SpriteGroup()
        for name, col, row, color, home_col_row in ghost_data:
            ghost_pos = self.tilemap.spawn_at_grid_center(col, row, width=6, height=6)
            home_x, home_y = self.tilemap.grid_to_pixel_center(home_col_row[0], home_col_row[1])
            ghost = GhostSprite(name, ghost_pos.x, ghost_pos.y, color, (home_x, home_y))
            self.ghosts.add(ghost)
        
        # Collectibles (stored as grid positions)
        self.dots = set()
        self.power_pellets = set()
        self.init_collectibles()
        
        # Game state
        self.score = 0
        self.lives = 3
        self.level = 1
        self.game_over = False
        self.won = False
        self.game_time = 0
        self.death_animation = 0
        
        self.dirty = True
    
    def init_maze(self):
        """Initialize maze walls."""
        # Classic Pac-Man maze (1 = wall, 0 = path)
        maze_data = [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,1,1,0,1,1,1,1,1,1,0,1,1,0,1],
            [1,0,1,1,0,1,1,1,1,1,1,0,1,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,1,1,0,1,0,1,1,0,1,0,1,1,0,1],
            [1,0,0,0,0,1,0,1,1,0,1,0,0,0,0,1],
            [1,1,1,1,0,1,0,0,0,0,1,0,1,1,1,1],
            [1,1,1,1,0,1,0,1,1,0,1,0,1,1,1,1],
            [1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1],
            [1,0,1,1,0,1,0,0,0,0,1,0,1,1,0,1],
            [1,0,1,1,0,1,0,1,1,0,1,0,1,1,0,1],
            [1,0,0,0,0,1,0,1,1,0,1,0,0,0,0,1],
            [1,0,1,1,0,0,0,0,0,0,0,0,1,1,0,1],
            [1,0,1,1,0,1,1,1,1,1,1,0,1,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        ]
        
        self.tilemap.load_from_list(maze_data)
    
    def init_collectibles(self):
        """Place dots and power pellets in walkable tiles."""
        self.dots.clear()
        self.power_pellets.clear()
        
        # Place dots in all walkable tiles
        for row in range(self.tilemap.height):
            for col in range(self.tilemap.width):
                if self.tilemap.is_walkable(col, row):
                    # Skip ghost spawn area (center)
                    if row in [7, 8] and col in [7, 8]:
                        continue
                    self.dots.add((col, row))
        
        # Place power pellets in corners
        corners = [(1, 1), (14, 1), (1, 15), (14, 15)]
        for col, row in corners:
            if (col, row) in self.dots:
                self.dots.remove((col, row))
                self.power_pellets.add((col, row))
    
    def on_event(self, event):
        """Handle input."""
        if self.game_over or self.won:
            if event.key == 'r' or event.key == 'R':
                self.reset_game()
                self.dirty = True
                return True
            return False
        
        # Movement
        if event.key == InputEvent.UP:
            self.pacman.set_direction(0, -1)
            return True
        elif event.key == InputEvent.DOWN:
            self.pacman.set_direction(0, 1)
            return True
        elif event.key == InputEvent.LEFT:
            self.pacman.set_direction(-1, 0)
            return True
        elif event.key == InputEvent.RIGHT:
            self.pacman.set_direction(1, 0)
            return True
        elif event.key == 'r' or event.key == 'R':
            self.reset_game()
            self.dirty = True
            return True
        
        return False
    
    def on_update(self, delta_time):
        """Update game state."""
        if self.game_over or self.won:
            return
        
        if self.death_animation > 0:
            self.death_animation -= delta_time
            if self.death_animation <= 0:
                self.lives -= 1
                if self.lives <= 0:
                    self.game_over = True
                else:
                    self.reset_positions()
            self.dirty = True
            return
        
        # Update Pac-Man
        self.pacman.update_with_maze(delta_time, self.tilemap)
        
        # Check dot collection
        pacman_grid = self.tilemap.pixel_to_grid(self.pacman.x, self.pacman.y)
        if pacman_grid in self.dots:
            self.dots.remove(pacman_grid)
            self.score += 10
            self.dirty = True
        
        # Check power pellet collection
        if pacman_grid in self.power_pellets:
            self.power_pellets.remove(pacman_grid)
            self.score += 50
            # Frighten all ghosts
            for ghost in self.ghosts.sprites:
                ghost.frighten()
            self.dirty = True
        
        # Check win condition
        if len(self.dots) == 0 and len(self.power_pellets) == 0:
            self.won = True
            self.dirty = True
            return
        
        # Update ghosts
        self.game_time += delta_time
        for ghost in self.ghosts.sprites:
            ghost.update_ai(delta_time, self.pacman, self.tilemap, self.game_time)
            
            # Check collision with Pac-Man
            if self.pacman.collides_with(ghost):
                if ghost.mode == "frightened":
                    # Eat ghost
                    ghost.is_eaten = True
                    ghost.color = (128, 128, 128)  # Gray when eaten
                    self.score += 200
                else:
                    # Pac-Man dies
                    self.death_animation = 1.0
                    self.pacman.is_alive = False
                self.dirty = True
        
        self.dirty = True  # Always mark dirty for animation
    
    def reset_positions(self):
        """Reset character positions after death."""
        # Reset Pac-Man (row 15, not 14!)
        pacman_pos = self.tilemap.spawn_at_grid_center(8, 15, 6, 6)
        self.pacman.x = pacman_pos.x
        self.pacman.y = pacman_pos.y
        self.pacman.velocity_x = 0
        self.pacman.velocity_y = 0
        self.pacman.next_dx = 0
        self.pacman.next_dy = 0
        self.pacman.is_alive = True
        
        # Reset ghosts
        ghost_positions = [(8, 1), (2, 4), (14, 4), (2, 9)]
        for i, ghost in enumerate(self.ghosts.sprites):
            col, row = ghost_positions[i]
            pos = self.tilemap.spawn_at_grid_center(col, row, 6, 6)
            ghost.x = pos.x
            ghost.y = pos.y
            ghost.velocity_x = 0
            ghost.velocity_y = 0
            ghost.mode = "scatter"
            ghost.mode_timer = 180
            ghost.is_eaten = False
            ghost.color = ghost.normal_color
    
    def reset_game(self):
        """Reset entire game."""
        self.init_collectibles()
        self.reset_positions()
        self.score = 0
        self.lives = 3
        self.game_over = False
        self.won = False
        self.game_time = 0
        self.death_animation = 0
    
    def render(self, matrix):
        """Draw game."""
        matrix.clear()
        
        # Draw maze (uses default tile_colors: 1=blue walls)
        self.tilemap.render(matrix)
        
        # Draw dots
        for col, row in self.dots:
            x, y = self.tilemap.grid_to_pixel_center(col, row)
            matrix.set_pixel(int(x), int(y), (255, 255, 255))
        
        # Draw power pellets (larger)
        for col, row in self.power_pellets:
            x, y = self.tilemap.grid_to_pixel_center(col, row)
            matrix.circle(int(x), int(y), 2, (255, 255, 0), fill=True)
        
        # Draw sprites
        self.pacman.render(matrix)
        self.ghosts.render(matrix)
        
        # Draw HUD
        lives_text = "♥" * self.lives
        matrix.text(f"{lives_text} {self.score}", 2, 2, (255, 255, 255), scale=1)
        
        # Game over / won messages
        if self.game_over:
            matrix.centered_text("GAME OVER", 64, (255, 0, 0))
            matrix.centered_text("Press R", 80, (255, 255, 255))
        elif self.won:
            matrix.centered_text("YOU WIN!", 64, (0, 255, 0))
            matrix.centered_text("Press R", 80, (255, 255, 255))
        
        self.dirty = False
    
    def get_help_text(self):
        """Return help text."""
        if self.game_over or self.won:
            return [("R", "Restart"), ("ESC", "Exit")]
        return [("Arrows", "Move"), ("R", "Restart")]


def run(os_context):
    """Entry point for MatrixOS."""
    app = PacManGameV2()
    os_context.register_app(app)
    os_context.switch_to_app(app)
    os_context.run()


if __name__ == "__main__":
    # Test mode - run directly
    from matrixos.app_framework import OSContext
    from matrixos.display import Display
    from matrixos.input import KeyboardInput
    
    display = Display(128, 128)
    input_handler = KeyboardInput()
    os_context = OSContext(display, input_handler)
    
    run(os_context)
