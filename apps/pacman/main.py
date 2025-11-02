#!/usr/bin/env python3
"""
Pac-Man Game - Classic arcade action

Features:
- Classic maze with dots and power pellets
- Four colorful ghosts with AI (Blinky, Pinky, Inky, Clyde)
- Chase, scatter, and frightened modes
- Lives system and score
- Sound effects (waka-waka, ghost eaten, power pellet)
- High score persistence
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
from matrixos import layout, storage, audio


class PacMan:
    """Pac-Man character."""
    
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.size = 6
        self.dx = 0
        self.dy = 0
        self.next_dx = 0
        self.next_dy = 0
        self.speed = 2
        self.mouth_angle = 0
        self.mouth_opening = True
        
    def update(self, maze):
        """Move Pac-Man."""
        # Try to change direction if requested
        if self.next_dx != 0 or self.next_dy != 0:
            new_x = self.x + self.next_dx * self.speed
            new_y = self.y + self.next_dy * self.speed
            if not maze.is_wall_at(new_x, new_y, self.size):
                self.dx = self.next_dx
                self.dy = self.next_dy
                self.next_dx = 0
                self.next_dy = 0
        
        # Move in current direction
        new_x = self.x + self.dx * self.speed
        new_y = self.y + self.dy * self.speed
        
        if not maze.is_wall_at(new_x, new_y, self.size):
            self.x = new_x
            self.y = new_y
        
        # Wrap around screen
        if self.x < 0:
            self.x = 128
        elif self.x > 128:
            self.x = 0
            
        # Animate mouth
        if self.mouth_opening:
            self.mouth_angle += 2
            if self.mouth_angle >= 45:
                self.mouth_opening = False
        else:
            self.mouth_angle -= 2
            if self.mouth_angle <= 0:
                self.mouth_opening = True
    
    def set_direction(self, dx, dy):
        """Queue a direction change."""
        self.next_dx = dx
        self.next_dy = dy


class Ghost:
    """Ghost with AI."""
    
    def __init__(self, name, x, y, color, home_corner):
        self.name = name
        self.x = x
        self.y = y
        self.start_x = x
        self.start_y = y
        self.size = 6
        self.color = color
        self.frightened_color = (50, 50, 255)  # Blue when frightened
        self.home_corner = home_corner  # Scatter target
        self.dx = 0
        self.dy = 0
        self.speed = 1.5
        self.mode = "scatter"  # "scatter", "chase", "frightened"
        self.mode_timer = 0
        self.frightened_timer = 0
        self.is_eaten = False
        
    def update(self, pacman, maze, game_time):
        """Move ghost with AI."""
        if self.is_eaten:
            # Return to spawn
            target_x, target_y = self.start_x, self.start_y
            if abs(self.x - self.start_x) < 5 and abs(self.y - self.start_y) < 5:
                self.is_eaten = False
                self.mode = "scatter"
        elif self.mode == "frightened":
            # Random movement when frightened
            self.frightened_timer -= 1
            if self.frightened_timer <= 0:
                self.mode = "scatter"
                self.mode_timer = 180
            # Random target
            target_x = random.randint(10, 118)
            target_y = random.randint(10, 118)
        elif self.mode == "scatter":
            # Go to home corner
            target_x, target_y = self.home_corner
            self.mode_timer -= 1
            if self.mode_timer <= 0:
                self.mode = "chase"
                self.mode_timer = 240
        else:  # chase
            # Chase Pac-Man (with personality variations)
            if self.name == "Blinky":
                # Red - direct chase
                target_x, target_y = pacman.x, pacman.y
            elif self.name == "Pinky":
                # Pink - ambush (target ahead of Pac-Man)
                target_x = pacman.x + pacman.dx * 20
                target_y = pacman.y + pacman.dy * 20
            elif self.name == "Inky":
                # Cyan - unpredictable (based on Blinky and Pac-Man)
                target_x = pacman.x + pacman.dx * 10
                target_y = pacman.y + pacman.dy * 10
            else:  # Clyde
                # Orange - chase when far, scatter when close
                dist = math.sqrt((self.x - pacman.x)**2 + (self.y - pacman.y)**2)
                if dist > 40:
                    target_x, target_y = pacman.x, pacman.y
                else:
                    target_x, target_y = self.home_corner
            
            self.mode_timer -= 1
            if self.mode_timer <= 0:
                self.mode = "scatter"
                self.mode_timer = 180
        
        # Simple AI: move toward target
        dx_to_target = target_x - self.x
        dy_to_target = target_y - self.y
        
        # Choose best direction (prefer horizontal/vertical movement)
        options = []
        if abs(dx_to_target) > abs(dy_to_target):
            # Prefer horizontal
            if dx_to_target > 0:
                options = [(1, 0), (0, 1), (0, -1), (-1, 0)]
            else:
                options = [(-1, 0), (0, 1), (0, -1), (1, 0)]
        else:
            # Prefer vertical
            if dy_to_target > 0:
                options = [(0, 1), (1, 0), (-1, 0), (0, -1)]
            else:
                options = [(0, -1), (1, 0), (-1, 0), (0, 1)]
        
        # Try each direction in order
        moved = False
        for dx, dy in options:
            new_x = self.x + dx * self.speed
            new_y = self.y + dy * self.speed
            
            # Don't reverse direction (looks unnatural)
            if dx == -self.dx and dy == -self.dy:
                continue
            
            if not maze.is_wall_at(new_x, new_y, self.size):
                self.dx = dx
                self.dy = dy
                self.x = new_x
                self.y = new_y
                moved = True
                break
        
        # If stuck, try any direction
        if not moved:
            for dx, dy in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
                new_x = self.x + dx * self.speed
                new_y = self.y + dy * self.speed
                if not maze.is_wall_at(new_x, new_y, self.size):
                    self.dx = dx
                    self.dy = dy
                    self.x = new_x
                    self.y = new_y
                    break
        
        # Wrap around screen
        if self.x < 0:
            self.x = 128
        elif self.x > 128:
            self.x = 0
    
    def frighten(self):
        """Make ghost frightened (can be eaten)."""
        if not self.is_eaten:
            self.mode = "frightened"
            self.frightened_timer = 240  # ~8 seconds
    
    def reset(self):
        """Reset to spawn."""
        self.x = self.start_x
        self.y = self.start_y
        self.dx = 0
        self.dy = 0
        self.mode = "scatter"
        self.mode_timer = 180
        self.is_eaten = False


class Maze:
    """Game maze with walls, dots, and power pellets."""
    
    def __init__(self):
        # Simple maze pattern (1 = wall, 0 = path)
        # Scaled for 128×128 display
        self.grid_size = 8
        self.grid = [
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
            [1,0,0,0,0,1,0,1,1,0,1,0,0,0,0,1],
            [1,0,1,1,0,0,0,0,0,0,0,0,1,1,0,1],
            [1,0,1,1,0,1,1,1,1,1,1,0,1,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        ]
        
        # Dots and power pellets
        self.dots = set()
        self.power_pellets = set()
        self.init_collectibles()
    
    def init_collectibles(self):
        """Place dots and power pellets."""
        self.dots.clear()
        self.power_pellets.clear()
        
        # Place dots in all open spaces
        for row in range(len(self.grid)):
            for col in range(len(self.grid[0])):
                if self.grid[row][col] == 0:
                    # Skip spawn area (center)
                    if row in [7, 8] and col in [7, 8]:
                        continue
                    self.dots.add((col, row))
        
        # Place power pellets in corners
        corners = [(1, 1), (14, 1), (1, 14), (14, 14)]
        for corner in corners:
            if corner in self.dots:
                self.dots.remove(corner)
                self.power_pellets.add(corner)
    
    def is_wall_at(self, x, y, size):
        """Check if position collides with wall."""
        # Check all corners of the bounding box
        corners = [
            (x - size//2, y - size//2),
            (x + size//2, y - size//2),
            (x - size//2, y + size//2),
            (x + size//2, y + size//2),
        ]
        
        for cx, cy in corners:
            grid_x = int(cx / self.grid_size)
            grid_y = int(cy / self.grid_size)
            
            if 0 <= grid_y < len(self.grid) and 0 <= grid_x < len(self.grid[0]):
                if self.grid[grid_y][grid_x] == 1:
                    return True
        
        return False
    
    def get_dot_at(self, x, y):
        """Get dot at grid position near x, y."""
        grid_x = int(x / self.grid_size)
        grid_y = int(y / self.grid_size)
        return (grid_x, grid_y) if (grid_x, grid_y) in self.dots else None
    
    def get_power_pellet_at(self, x, y):
        """Get power pellet at grid position near x, y."""
        grid_x = int(x / self.grid_size)
        grid_y = int(y / self.grid_size)
        return (grid_x, grid_y) if (grid_x, grid_y) in self.power_pellets else None


class PacManGame(App):
    """Pac-Man arcade game."""
    
    def __init__(self):
        super().__init__("Pac-Man")
        
        # Game objects
        self.maze = Maze()
        self.pacman = PacMan(64, 96)
        self.ghosts = [
            Ghost("Blinky", 64, 56, (255, 0, 0), (112, 8)),      # Red - top right
            Ghost("Pinky", 56, 64, (255, 184, 255), (16, 8)),    # Pink - top left
            Ghost("Inky", 72, 64, (0, 255, 255), (112, 120)),    # Cyan - bottom right
            Ghost("Clyde", 64, 64, (255, 184, 82), (16, 120)),   # Orange - bottom left
        ]
        
        # Game state
        self.score = 0
        self.high_score = storage.get('pacman.high_score', default=0)
        self.lives = 3
        self.level = 1
        self.game_over = False
        self.won = False
        self.game_time = 0
        self.death_animation = 0
        self.waka_timer = 0
        
    def get_help_text(self):
        """Return help text."""
        if self.game_over or self.won:
            return [("R", "Restart"), ("ESC", "Exit")]
        return [("Arrows", "Move"), ("R", "Restart")]
    
    def on_activate(self):
        """App activated."""
        pass
    
    def on_deactivate(self):
        """App deactivated."""
        pass
    
    def on_event(self, event):
        """Handle input."""
        if self.game_over or self.won:
            if event.key == 'r':
                self.restart()
                audio.play('beep')
                return True
            return False
        
        if self.death_animation > 0:
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
        elif event.key == 'r':
            self.restart()
            audio.play('beep')
            return True
        
        return False
    
    def on_update(self, delta_time):
        """Update game logic."""
        if self.game_over or self.won or self.death_animation > 0:
            if self.death_animation > 0:
                self.death_animation -= 1
                if self.death_animation == 0:
                    if self.lives > 0:
                        self.reset_positions()
                    else:
                        self.game_over = True
                        audio.play('gameover')
                        if self.score > self.high_score:
                            self.high_score = self.score
                            storage.set('pacman.high_score', self.high_score)
            return
        
        self.game_time += 1
        
        # Update Pac-Man
        self.pacman.update(self.maze)
        
        # Waka-waka sound
        if self.pacman.dx != 0 or self.pacman.dy != 0:
            self.waka_timer += 1
            if self.waka_timer >= 15:
                audio.play('beep')
                self.waka_timer = 0
        
        # Check dot collection
        dot = self.maze.get_dot_at(self.pacman.x, self.pacman.y)
        if dot:
            self.maze.dots.remove(dot)
            self.score += 10
            
        # Check power pellet collection
        pellet = self.maze.get_power_pellet_at(self.pacman.x, self.pacman.y)
        if pellet:
            self.maze.power_pellets.remove(pellet)
            self.score += 50
            audio.play('powerup')
            # Frighten all ghosts
            for ghost in self.ghosts:
                ghost.frighten()
        
        # Check if level complete
        if len(self.maze.dots) == 0 and len(self.maze.power_pellets) == 0:
            self.won = True
            self.score += 1000
            audio.play('success')
            if self.score > self.high_score:
                self.high_score = self.score
                storage.set('pacman.high_score', self.high_score)
        
        # Update ghosts
        for ghost in self.ghosts:
            ghost.update(self.pacman, self.maze, self.game_time)
        
        # Check ghost collisions
        self.check_ghost_collisions()
    
    def check_ghost_collisions(self):
        """Check if Pac-Man hit a ghost."""
        for ghost in self.ghosts:
            if ghost.is_eaten:
                continue
                
            dist = math.sqrt((self.pacman.x - ghost.x)**2 + (self.pacman.y - ghost.y)**2)
            if dist < (self.pacman.size + ghost.size) / 2:
                if ghost.mode == "frightened":
                    # Eat the ghost!
                    ghost.is_eaten = True
                    self.score += 200
                    audio.play('coin')
                else:
                    # Pac-Man dies
                    self.die()
                    break
    
    def die(self):
        """Pac-Man loses a life."""
        self.lives -= 1
        self.death_animation = 60  # ~2 seconds
        audio.play('hit')
    
    def reset_positions(self):
        """Reset Pac-Man and ghosts to spawn."""
        self.pacman.x = 64
        self.pacman.y = 96
        self.pacman.dx = 0
        self.pacman.dy = 0
        self.pacman.next_dx = 0
        self.pacman.next_dy = 0
        
        for ghost in self.ghosts:
            ghost.reset()
    
    def restart(self):
        """Restart game."""
        self.score = 0
        self.lives = 3
        self.level = 1
        self.game_over = False
        self.won = False
        self.game_time = 0
        self.death_animation = 0
        self.waka_timer = 0
        
        self.maze.init_collectibles()
        self.reset_positions()
    
    def render(self, matrix):
        """Draw game."""
        # Black background
        matrix.clear()
        
        if self.death_animation > 0:
            self.render_death_animation(matrix)
            return
        
        if self.game_over:
            self.render_game_over(matrix)
            return
        
        if self.won:
            self.render_won(matrix)
            return
        
        # Draw maze
        self.render_maze(matrix)
        
        # Draw dots
        for col, row in self.maze.dots:
            x = col * self.maze.grid_size + self.maze.grid_size // 2
            y = row * self.maze.grid_size + self.maze.grid_size // 2
            matrix.pixel(x, y, (255, 200, 150))
        
        # Draw power pellets (blinking)
        if self.game_time % 30 < 15:
            for col, row in self.maze.power_pellets:
                x = col * self.maze.grid_size + self.maze.grid_size // 2
                y = row * self.maze.grid_size + self.maze.grid_size // 2
                matrix.circle(x, y, 2, (255, 255, 100), fill=True)
        
        # Draw ghosts
        for ghost in self.ghosts:
            if not ghost.is_eaten:
                color = ghost.frightened_color if ghost.mode == "frightened" else ghost.color
                self.render_ghost(matrix, ghost, color)
        
        # Draw Pac-Man
        self.render_pacman(matrix)
        
        # Draw HUD
        self.render_hud(matrix)
    
    def render_maze(self, matrix):
        """Draw maze walls."""
        for row in range(len(self.maze.grid)):
            for col in range(len(self.maze.grid[0])):
                if self.maze.grid[row][col] == 1:
                    x = col * self.maze.grid_size
                    y = row * self.maze.grid_size
                    # Blue walls
                    matrix.rect(x, y, self.maze.grid_size, self.maze.grid_size, (33, 33, 222), fill=True)
    
    def render_pacman(self, matrix):
        """Draw Pac-Man."""
        # Yellow circle with mouth
        x, y = int(self.pacman.x), int(self.pacman.y)
        r = self.pacman.size // 2
        
        # Draw full circle (simplified - just a circle for now)
        matrix.circle(x, y, r, (255, 255, 0), fill=True)
        
        # Draw eye (direction-dependent)
        if self.pacman.dx > 0:  # Right
            matrix.pixel(x + 1, y - 1, (0, 0, 0))
        elif self.pacman.dx < 0:  # Left
            matrix.pixel(x - 1, y - 1, (0, 0, 0))
        elif self.pacman.dy > 0:  # Down
            matrix.pixel(x, y + 1, (0, 0, 0))
        elif self.pacman.dy < 0:  # Up
            matrix.pixel(x, y - 1, (0, 0, 0))
        else:
            matrix.pixel(x + 1, y - 1, (0, 0, 0))
    
    def render_ghost(self, matrix, ghost, color):
        """Draw a ghost."""
        x, y = int(ghost.x), int(ghost.y)
        r = ghost.size // 2
        
        # Body (circle)
        matrix.circle(x, y, r, color, fill=True)
        
        # Wavy bottom (simplified)
        matrix.pixel(x - 2, y + r, color)
        matrix.pixel(x, y + r + 1, color)
        matrix.pixel(x + 2, y + r, color)
        
        # Eyes
        if ghost.mode == "frightened":
            # Scared eyes (just white dots)
            matrix.pixel(x - 1, y - 1, (255, 255, 255))
            matrix.pixel(x + 1, y - 1, (255, 255, 255))
        else:
            # Normal eyes (white with pupils)
            matrix.pixel(x - 1, y - 1, (255, 255, 255))
            matrix.pixel(x + 1, y - 1, (255, 255, 255))
            # Pupils look toward Pac-Man (simplified - just black dots)
            matrix.pixel(x - 1, y, (0, 0, 0))
            matrix.pixel(x + 1, y, (0, 0, 0))
    
    def render_hud(self, matrix):
        """Draw score and lives."""
        # Score (top left)
        matrix.text(f"${self.score}", 2, 2, (255, 255, 255))
        
        # High score (top center)
        center_x = matrix.width // 2
        matrix.text(f"HI:${self.high_score}", center_x - 30, 2, (255, 200, 100))
        
        # Lives (bottom left) - small Pac-Man icons
        for i in range(self.lives):
            x = 4 + i * 8
            y = matrix.height - 6
            matrix.circle(x, y, 2, (255, 255, 0), fill=True)
    
    def render_death_animation(self, matrix):
        """Draw death animation."""
        # Keep maze and dots visible
        self.render_maze(matrix)
        for col, row in self.maze.dots:
            x = col * self.maze.grid_size + self.maze.grid_size // 2
            y = row * self.maze.grid_size + self.maze.grid_size // 2
            matrix.pixel(x, y, (255, 200, 150))
        
        # Pac-Man shrinks
        progress = 1.0 - (self.death_animation / 60.0)
        x, y = int(self.pacman.x), int(self.pacman.y)
        r = int(self.pacman.size // 2 * (1 - progress))
        if r > 0:
            matrix.circle(x, y, r, (255, 255, 0), fill=True)
        
        self.render_hud(matrix)
    
    def render_game_over(self, matrix):
        """Draw game over screen."""
        matrix.clear()
        
        layout.center_text(matrix, "GAME OVER", 40, (255, 100, 100))
        layout.center_text(matrix, f"Score: {self.score}", 60, (255, 255, 255))
        layout.center_text(matrix, f"High: {self.high_score}", 75, (255, 200, 100))
        layout.center_text(matrix, "R to Restart", 95, (150, 150, 150))
    
    def render_won(self, matrix):
        """Draw victory screen."""
        matrix.clear()
        
        layout.center_text(matrix, "YOU WIN!", 40, (100, 255, 100))
        layout.center_text(matrix, f"Score: {self.score}", 60, (255, 255, 255))
        layout.center_text(matrix, f"High: {self.high_score}", 75, (255, 200, 100))
        layout.center_text(matrix, "R to Restart", 95, (150, 150, 150))


def run(os_context):
    """Entry point called by OS."""
    app = PacManGame()
    os_context.register_app(app)
    os_context.switch_to_app(app)
    os_context.run()


# App instance for launcher
app = PacManGame()
