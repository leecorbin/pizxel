"""
macOS Window Display Driver

Uses Pygame to create a native window displaying the LED matrix.
Pixels are scaled 2x for better visibility (256x192 -> 512x384 window).
"""

import pygame
from typing import Tuple
from ..base import DisplayDriver


class MacOSWindowDriver(DisplayDriver):
    """Pygame-based window display for macOS development"""
    
    def __init__(self, width: int = 256, height: int = 192, scale: int = 3, pixel_gap: int = 0):
        super().__init__(width, height)
        self.name = "macOS Window (Pygame)"
        self.platform = "macos"
        self.scale = scale  # Scale pixels for visibility
        self.pixel_gap = pixel_gap  # Gap between LED pixels (0 = no gap, 1+ = LED matrix look)
        self.window_width = width * scale
        self.window_height = height * scale
        self.screen = None
        self.buffer = None
        self.current_scale = scale  # Track current scale for resizing
        self.aspect_ratio = width / height  # Store aspect ratio for proportional resizing
        
        # Debug output
        print(f"[MacOSWindowDriver] Init: width={width}, height={height}, scale={scale}, pixel_gap={pixel_gap}")
        print(f"[MacOSWindowDriver] Window size: {self.window_width}×{self.window_height}")
        
    def initialize(self) -> bool:
        """Initialize Pygame window"""
        try:
            pygame.init()
            self.screen = pygame.display.set_mode(
                (self.window_width, self.window_height),
                pygame.RESIZABLE
            )
            pygame.display.set_caption("MatrixOS - ZX Spectrum Edition")
            
            # Create pixel buffer
            self.buffer = [[(0, 0, 0) for _ in range(self.width)] for _ in range(self.height)]
            
            # Clear to black
            self.clear()
            self.show()
            
            return True
        except Exception as e:
            print(f"[MacOSWindowDriver] Failed to initialize: {e}")
            return False
    
    def set_pixel(self, x: int, y: int, color: Tuple[int, int, int]):
        """Set pixel in buffer"""
        if 0 <= x < self.width and 0 <= y < self.height:
            self.buffer[y][x] = color
    
    def get_pixel(self, x: int, y: int) -> Tuple[int, int, int]:
        """Get pixel from buffer"""
        if 0 <= x < self.width and 0 <= y < self.height:
            return self.buffer[y][x]
        return (0, 0, 0)
    
    def clear(self):
        """Clear buffer to black"""
        for y in range(self.height):
            for x in range(self.width):
                self.buffer[y][x] = (0, 0, 0)
    
    def fill(self, color=(0, 0, 0)):
        """Fill buffer with color"""
        for y in range(self.height):
            for x in range(self.width):
                self.buffer[y][x] = color
    
    def show(self):
        """
        Render buffer to Pygame window.
        Each LED pixel is drawn as a scaled rectangle with optional gap.
        """
        if self.screen is None:
            return
        
        # Process Pygame events to keep window responsive and handle resize
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                # Don't handle quit here - let the input system handle it
                pass
            elif event.type == pygame.VIDEORESIZE:
                # Calculate best scale that fits the requested size
                width_scale = event.w / self.width
                height_scale = event.h / self.height
                
                # Use the smaller scale to maintain aspect ratio
                # Round to nearest integer for clean pixel scaling
                new_scale = max(1, int(min(width_scale, height_scale) + 0.5))
                
                print(f"[Resize] Request: {event.w}×{event.h}, scales: w={width_scale:.2f}, h={height_scale:.2f}, new_scale={new_scale}")
                
                # Only update if scale actually changed
                if new_scale != self.current_scale:
                    self.current_scale = new_scale
                    
                    # Force exact proportional size
                    new_width = self.width * self.current_scale
                    new_height = self.height * self.current_scale
                    
                    print(f"[Resize] Snapping to: {new_width}×{new_height}")
                    
                    self.screen = pygame.display.set_mode((new_width, new_height), pygame.RESIZABLE)
        
        # Draw pixels based on gap setting
        if self.pixel_gap > 0:
            # LED matrix mode: clear background and draw pixels with gaps
            self.screen.fill((0, 0, 0))
            pixel_size = max(1, self.current_scale - self.pixel_gap)
            
            for y in range(self.height):
                for x in range(self.width):
                    color = self.buffer[y][x]
                    # Use fill instead of draw.rect to avoid antialiasing
                    rect = pygame.Rect(
                        x * self.current_scale,
                        y * self.current_scale,
                        pixel_size,
                        pixel_size
                    )
                    self.screen.fill(color, rect)
        else:
            # Full pixel mode: no gaps, draw solid blocks without any spacing
            for y in range(self.height):
                y_pos = y * self.current_scale
                for x in range(self.width):
                    x_pos = x * self.current_scale
                    color = self.buffer[y][x]
                    
                    # Use pygame.draw.rect instead of surface.fill for guaranteed solid blocks
                    pygame.draw.rect(self.screen, color, 
                                   (x_pos, y_pos, self.current_scale, self.current_scale), 0)
        
        pygame.display.flip()
    
    def cleanup(self):
        """Cleanup Pygame"""
        if pygame.get_init():
            pygame.quit()
    
    @classmethod
    def is_available(cls) -> bool:
        """Check if Pygame is available"""
        try:
            import pygame
            return True
        except ImportError:
            return False
    
    @classmethod
    def get_priority(cls) -> int:
        """
        Priority: 50 (higher than terminal fallback)
        This is preferred on macOS for development.
        """
        return 50
    
    @classmethod
    def get_platform_preference(cls) -> str:
        """This driver is preferred on macOS"""
        return "macos"
