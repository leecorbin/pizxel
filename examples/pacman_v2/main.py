"""
Pac-Man v2 - ZX Spectrum Edition (256×192)
==========================================

Enhanced from original with:
- Larger 256×192 resolution
- ZX Spectrum aesthetic (CYAN borders, chunky graphics)
- Side panels with game info
- Authentic retro feel
"""

import sys
import os
import random

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from matrixos.app_framework import App
from matrixos.input import InputEvent

# ZX Spectrum color palette
CYAN = (0, 255, 255)
DARK_BLUE = (0, 0, 40)
YELLOW = (255, 255, 0)
RED = (255, 0, 0)
WHITE = (255, 255, 255)
BLUE = (100, 150, 255)
MAGENTA = (255, 0, 255)
GREEN = (0, 255, 0)

# Ghost colors
GHOST_RED = (255, 0, 0)
GHOST_PINK = (255, 184, 255)
GHOST_CYAN = (0, 255, 255)
GHOST_ORANGE = (255, 184, 82)
GHOST_BLUE = (50, 50, 255)

class PacManV2(App):
    """Enhanced Pac-Man with Spectrum aesthetic"""
    
    def __init__(self):
        super().__init__("Pac-Man V2")
        
        # Maze dimensions (16×17 grid at 12px tiles = 192×204, fits in 256×192)
        self.tile_size = 11
        self.maze_width = 17
        self.maze_height = 17
        self.maze_offset_x = 32  # Center in 256×192
        self.maze_offset_y = 5
        
        # Maze layout (1=wall, 0=path, 2=power pellet start position)
        self.maze = [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
            [1,0,1,1,0,1,1,0,1,0,1,1,0,1,1,0,1],
            [1,2,1,1,0,1,1,0,1,0,1,1,0,1,1,2,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,1,1,0,1,0,1,1,1,0,1,0,1,1,0,1],
            [1,0,0,0,0,1,0,0,1,0,0,1,0,0,0,0,1],
            [1,1,1,1,0,1,1,0,1,0,1,1,0,1,1,1,1],
            [1,1,1,1,0,1,0,0,0,0,0,1,0,1,1,1,1],
            [1,1,1,1,0,1,0,1,1,1,0,1,0,1,1,1,1],
            [1,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,1],
            [1,0,1,1,0,1,0,0,0,0,0,1,0,1,1,0,1],
            [1,2,1,1,0,1,0,1,1,1,0,1,0,1,1,2,1],
            [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
            [1,0,1,1,1,1,1,0,1,0,1,1,1,1,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        ]
        
        # Pac-Man
        self.pacman_col = 8
        self.pacman_row = 15
        self.pacman_dx = 0
        self.pacman_dy = 0
        self.next_dx = 0
        self.next_dy = 0
        self.mouth_angle = 0
        
        # Ghosts (col, row, color)
        self.ghosts = [
            {"col": 8, "row": 1, "color": GHOST_RED, "dx": 1, "dy": 0},
            {"col": 3, "row": 4, "color": GHOST_PINK, "dx": 0, "dy": 1},
            {"col": 13, "row": 4, "color": GHOST_CYAN, "dx": -1, "dy": 0},
            {"col": 3, "row": 9, "color": GHOST_ORANGE, "dx": 0, "dy": -1},
        ]
        
        # Game state
        self.dots = set()
        self.power_pellets = set()
        self.init_dots()
        
        self.score = 0
        self.lives = 3
        self.level = 1
        self.power_mode = 0
        self.game_over = False
        self.won = False
        
        self.move_timer = 0
        self.move_delay = 0.15  # seconds per move
        self.ghost_timer = 0
        self.ghost_delay = 0.2
        
        self.dirty = True
    
    def init_dots(self):
        """Place dots in all walkable tiles"""
        self.dots.clear()
        self.power_pellets.clear()
        
        for row in range(self.maze_height):
            for col in range(self.maze_width):
                tile = self.maze[row][col]
                if tile == 0:
                    self.dots.add((col, row))
                elif tile == 2:
                    self.power_pellets.add((col, row))
    
    def on_event(self, event):
        if self.game_over or self.won:
            if event.key == InputEvent.OK:
                self.__init__()
                return True
            return False
        
        if event.key == InputEvent.UP:
            self.next_dx, self.next_dy = 0, -1
            return True
        elif event.key == InputEvent.DOWN:
            self.next_dx, self.next_dy = 0, 1
            return True
        elif event.key == InputEvent.LEFT:
            self.next_dx, self.next_dy = -1, 0
            return True
        elif event.key == InputEvent.RIGHT:
            self.next_dx, self.next_dy = 1, 0
            return True
        return False
    
    def on_update(self, delta_time):
        if self.game_over or self.won:
            return
        
        # Update power mode
        if self.power_mode > 0:
            self.power_mode -= delta_time
            if self.power_mode <= 0:
                self.power_mode = 0
        
        # Move Pac-Man
        self.move_timer += delta_time
        if self.move_timer >= self.move_delay:
            self.move_timer = 0
            self.move_pacman()
        
        # Move ghosts
        self.ghost_timer += delta_time
        if self.ghost_timer >= self.ghost_delay:
            self.ghost_timer = 0
            self.move_ghosts()
        
        # Animate mouth
        self.mouth_angle = (self.mouth_angle + 200 * delta_time) % 360
        
        self.dirty = True
    
    def move_pacman(self):
        """Move Pac-Man with grid collision"""
        # Try to apply next direction
        if self.next_dx != 0 or self.next_dy != 0:
            new_col = self.pacman_col + self.next_dx
            new_row = self.pacman_row + self.next_dy
            if self.can_move(new_col, new_row):
                self.pacman_dx = self.next_dx
                self.pacman_dy = self.next_dy
                self.next_dx, self.next_dy = 0, 0
        
        # Move in current direction
        new_col = self.pacman_col + self.pacman_dx
        new_row = self.pacman_row + self.pacman_dy
        
        if self.can_move(new_col, new_row):
            self.pacman_col = new_col
            self.pacman_row = new_row
            
            # Wrap around
            if self.pacman_col < 0:
                self.pacman_col = self.maze_width - 1
            elif self.pacman_col >= self.maze_width:
                self.pacman_col = 0
            
            # Collect dots
            pos = (self.pacman_col, self.pacman_row)
            if pos in self.dots:
                self.dots.remove(pos)
                self.score += 10
            if pos in self.power_pellets:
                self.power_pellets.remove(pos)
                self.score += 50
                self.power_mode = 8.0  # 8 seconds
        
        # Check win
        if len(self.dots) == 0 and len(self.power_pellets) == 0:
            self.won = True
    
    def can_move(self, col, row):
        """Check if position is walkable"""
        if row < 0 or row >= self.maze_height:
            return False
        if col < 0 or col >= self.maze_width:
            return True  # Allow wrap
        return self.maze[row][col] != 1
    
    def move_ghosts(self):
        """Simple ghost AI"""
        for ghost in self.ghosts:
            # Random direction changes
            if random.random() < 0.3:
                directions = [(-1, 0), (1, 0), (0, -1), (0, 1)]
                ghost["dx"], ghost["dy"] = random.choice(directions)
            
            # Try to move
            new_col = ghost["col"] + ghost["dx"]
            new_row = ghost["row"] + ghost["dy"]
            
            if self.can_move(new_col, new_row):
                ghost["col"] = new_col
                ghost["row"] = new_row
            
            # Check collision with Pac-Man
            if ghost["col"] == self.pacman_col and ghost["row"] == self.pacman_row:
                if self.power_mode > 0:
                    # Eat ghost
                    self.score += 200
                    ghost["col"] = 8
                    ghost["row"] = 8
                else:
                    # Lose life
                    self.lives -= 1
                    if self.lives <= 0:
                        self.game_over = True
                    else:
                        # Reset positions
                        self.pacman_col = 8
                        self.pacman_row = 15
    
    def render(self, matrix):
        matrix.clear()
        matrix.rect(0, 0, 256, 192, DARK_BLUE, fill=True)
        
        # Title
        matrix.text("PAC-MAN V2", 85, 3, CYAN)
        
        # Draw maze
        for row in range(self.maze_height):
            for col in range(self.maze_width):
                x = self.maze_offset_x + col * self.tile_size
                y = self.maze_offset_y + row * self.tile_size
                
                tile = self.maze[row][col]
                if tile == 1:
                    # Wall
                    matrix.rect(x, y, self.tile_size, self.tile_size, BLUE, fill=True)
        
        # Draw dots
        for col, row in self.dots:
            x = self.maze_offset_x + col * self.tile_size + self.tile_size // 2
            y = self.maze_offset_y + row * self.tile_size + self.tile_size // 2
            matrix.set_pixel(x, y, WHITE)
        
        # Draw power pellets
        for col, row in self.power_pellets:
            x = self.maze_offset_x + col * self.tile_size + self.tile_size // 2
            y = self.maze_offset_y + row * self.tile_size + self.tile_size // 2
            matrix.circle(x, y, 2, YELLOW, fill=True)
        
        # Draw Pac-Man
        px = self.maze_offset_x + self.pacman_col * self.tile_size + self.tile_size // 2
        py = self.maze_offset_y + self.pacman_row * self.tile_size + self.tile_size // 2
        matrix.circle(px, py, 4, YELLOW, fill=True)
        
        # Draw ghosts
        for ghost in self.ghosts:
            gx = self.maze_offset_x + ghost["col"] * self.tile_size + self.tile_size // 2
            gy = self.maze_offset_y + ghost["row"] * self.tile_size + self.tile_size // 2
            color = GHOST_BLUE if self.power_mode > 0 else ghost["color"]
            matrix.circle(gx, gy, 4, color, fill=True)
            # Eyes
            matrix.set_pixel(gx - 1, gy - 1, WHITE)
            matrix.set_pixel(gx + 1, gy - 1, WHITE)
        
        # HUD - Right panel
        matrix.rect(219, 0, 37, 192, CYAN)
        matrix.text("SCORE", 222, 10, YELLOW)
        matrix.text(str(self.score), 222, 22, WHITE)
        
        matrix.text("LIVES", 222, 45, YELLOW)
        for i in range(self.lives):
            matrix.circle(230 + i * 10, 60, 3, YELLOW, fill=True)
        
        matrix.text("LEVEL", 222, 80, YELLOW)
        matrix.text(str(self.level), 230, 92, WHITE)
        
        if self.power_mode > 0:
            matrix.text("POWER!", 222, 115, MAGENTA)
            matrix.text(f"{int(self.power_mode)}", 230, 127, MAGENTA)
        
        # Game over / won
        if self.game_over:
            matrix.rect(60, 80, 136, 30, RED)
            matrix.text("GAME OVER", 70, 90, WHITE)
            matrix.text("OK: RESTART", 65, 102, YELLOW)
        elif self.won:
            matrix.rect(60, 80, 136, 30, GREEN)
            matrix.text("YOU WIN!", 80, 90, WHITE)
            matrix.text("OK: RESTART", 65, 102, YELLOW)
        
        self.dirty = False


def run(os_context):
    app = PacManV2()
    os_context.register_app(app)
    os_context.switch_to_app(app)
    os_context.run()
