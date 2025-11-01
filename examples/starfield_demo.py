#!/usr/bin/env python3
"""
Starfield Demo - Particle effects and 3D-ish visualization
"""

import sys
import time
import os
import math
import random

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.display import Display, TerminalRenderer


class Star:
    """A star in 3D space moving towards the viewer."""

    def __init__(self, width, height, max_depth=100):
        self.width = width
        self.height = height
        self.max_depth = max_depth
        self.reset()

    def reset(self, z=None):
        """Reset star position."""
        # Random position in 3D space
        self.x = random.uniform(-width/2, width/2)
        self.y = random.uniform(-height/2, height/2)
        self.z = z if z is not None else random.uniform(1, self.max_depth)
        self.prev_sx = None
        self.prev_sy = None

    def update(self, speed=1):
        """Move star closer to viewer."""
        self.z -= speed

        # Reset if too close
        if self.z <= 0:
            self.reset(z=self.max_depth)

    def get_screen_pos(self):
        """Project 3D position to 2D screen."""
        # Perspective projection
        if self.z > 0:
            # Center of display
            cx = self.width / 2
            cy = self.height / 2

            # Project
            sx = int(cx + (self.x / self.z) * 20)
            sy = int(cy + (self.y / self.z) * 20)

            return sx, sy
        return None, None

    def draw(self, display, trail_length=3):
        """Draw the star with motion trail."""
        sx, sy = self.get_screen_pos()

        if sx is not None and 0 <= sx < display.width and 0 <= sy < display.height:
            if display.color_mode == 'rgb':
                # Brightness based on depth (closer = brighter)
                brightness = int(255 * (1 - self.z / self.max_depth))
                color = (brightness, brightness, brightness)

                # Add some color variation
                if self.z < 20:
                    color = (brightness, brightness // 2, brightness // 2)  # Reddish

                display.set_pixel(sx, sy, color)

                # Draw trail
                if self.prev_sx is not None and trail_length > 0:
                    # Simple linear interpolation for trail
                    steps = min(trail_length, 5)
                    for i in range(1, steps):
                        t = i / steps
                        tx = int(sx + t * (self.prev_sx - sx))
                        ty = int(sy + t * (self.prev_sy - sy))
                        if 0 <= tx < display.width and 0 <= ty < display.height:
                            fade = brightness * (1 - t * 0.7)
                            trail_color = (int(fade), int(fade), int(fade))
                            display.set_pixel(tx, ty, trail_color)
            else:
                display.set_pixel(sx, sy, True)

            self.prev_sx = sx
            self.prev_sy = sy


class Firefly:
    """A firefly that moves randomly and blinks."""

    def __init__(self, width, height):
        self.x = random.uniform(0, width)
        self.y = random.uniform(0, height)
        self.vx = random.uniform(-0.5, 0.5)
        self.vy = random.uniform(-0.5, 0.5)
        self.brightness = 0
        self.phase = random.uniform(0, math.pi * 2)
        self.width = width
        self.height = height

    def update(self):
        """Update firefly position and brightness."""
        self.x += self.vx
        self.y += self.vy

        # Wrap around
        self.x = self.x % self.width
        self.y = self.y % self.height

        # Random direction changes
        if random.random() < 0.05:
            self.vx += random.uniform(-0.2, 0.2)
            self.vy += random.uniform(-0.2, 0.2)
            # Clamp velocity
            self.vx = max(-1, min(1, self.vx))
            self.vy = max(-1, min(1, self.vy))

        # Pulsing brightness
        self.phase += 0.15
        self.brightness = (math.sin(self.phase) + 1) / 2

    def draw(self, display):
        """Draw the firefly."""
        px, py = int(self.x), int(self.y)
        if 0 <= px < display.width and 0 <= py < display.height:
            if display.color_mode == 'rgb':
                # Yellow/green glow
                intensity = int(self.brightness * 255)
                color = (intensity, intensity, int(intensity * 0.3))
                display.set_pixel(px, py, color)

                # Glow effect (dim nearby pixels)
                if self.brightness > 0.5:
                    for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                        gx, gy = px + dx, py + dy
                        if 0 <= gx < display.width and 0 <= gy < display.height:
                            glow = int(self.brightness * 100)
                            display.set_pixel(gx, gy, (glow, glow, glow // 3))
            else:
                if self.brightness > 0.5:
                    display.set_pixel(px, py, True)


def demo_starfield(display, renderer, duration=10):
    """Classic starfield effect."""
    global width, height
    width = display.width
    height = display.height

    stars = [Star(width, height) for _ in range(100)]

    start_time = time.time()
    while time.time() - start_time < duration:
        display.clear()

        # Update and draw stars
        for star in stars:
            star.update(speed=2)
            star.draw(display, trail_length=3)

        renderer.display_in_terminal()
        time.sleep(0.03)


def demo_fireflies(display, renderer, duration=10):
    """Fireflies floating around."""
    fireflies = [Firefly(display.width, display.height) for _ in range(30)]

    start_time = time.time()
    while time.time() - start_time < duration:
        display.clear()

        # Update and draw fireflies
        for firefly in fireflies:
            firefly.update()
            firefly.draw(display)

        renderer.display_in_terminal()
        time.sleep(0.05)


def demo_rain(display, renderer, duration=10):
    """Rain effect with drops falling."""

    class RainDrop:
        def __init__(self, width, height):
            self.x = random.randint(0, width - 1)
            self.y = random.randint(-10, 0)
            self.speed = random.uniform(1, 3)
            self.length = random.randint(2, 5)
            self.width = width
            self.height = height

        def update(self):
            self.y += self.speed
            return self.y < self.height + 10

        def draw(self, display):
            for i in range(self.length):
                py = int(self.y - i)
                if 0 <= py < display.height and 0 <= self.x < display.width:
                    if display.color_mode == 'rgb':
                        # Blue rain with fade
                        fade = (self.length - i) / self.length
                        intensity = int(fade * 150)
                        display.set_pixel(self.x, py, (intensity // 3, intensity // 3, intensity))
                    else:
                        display.set_pixel(self.x, py, True)

    drops = []
    start_time = time.time()

    while time.time() - start_time < duration:
        display.clear()

        # Spawn new drops
        if random.random() < 0.3:
            drops.append(RainDrop(display.width, display.height))

        # Update drops
        drops = [drop for drop in drops if drop.update()]

        # Draw drops
        for drop in drops:
            drop.draw(display)

        renderer.display_in_terminal()
        time.sleep(0.05)


def demo_sparkles(display, renderer, duration=10):
    """Random sparkles appearing and fading."""

    class Sparkle:
        def __init__(self, width, height):
            self.x = random.randint(0, width - 1)
            self.y = random.randint(0, height - 1)
            self.age = 0
            self.max_age = random.randint(10, 20)
            self.color = random.choice([
                (255, 255, 255),
                (255, 200, 100),
                (200, 200, 255),
            ])

        def update(self):
            self.age += 1
            return self.age < self.max_age

        def draw(self, display):
            if 0 <= self.x < display.width and 0 <= self.y < display.height:
                # Fade in and out
                if self.age < self.max_age / 2:
                    fade = self.age / (self.max_age / 2)
                else:
                    fade = (self.max_age - self.age) / (self.max_age / 2)

                if display.color_mode == 'rgb':
                    r, g, b = self.color
                    color = (int(r * fade), int(g * fade), int(b * fade))
                    display.set_pixel(self.x, self.y, color)
                else:
                    if fade > 0.5:
                        display.set_pixel(self.x, self.y, True)

    sparkles = []
    start_time = time.time()

    while time.time() - start_time < duration:
        display.clear()

        # Spawn new sparkles
        if random.random() < 0.2:
            sparkles.append(Sparkle(display.width, display.height))

        # Update sparkles
        sparkles = [s for s in sparkles if s.update()]

        # Draw sparkles
        for sparkle in sparkles:
            sparkle.draw(display)

        renderer.display_in_terminal()
        time.sleep(0.05)


def main():
    """Run starfield and particle demos."""
    print("LED Matrix Starfield & Particle Effects")
    print("========================================\n")

    # RGB for best visuals
    print("Creating 64x64 RGB display...\n")
    display = Display(64, 64, color_mode='rgb')
    renderer = TerminalRenderer(display)

    print("1. Starfield (3D effect)")
    demo_starfield(display, renderer, duration=5)

    print("\n2. Fireflies")
    demo_fireflies(display, renderer, duration=5)

    print("\n3. Rain Effect")
    demo_rain(display, renderer, duration=5)

    print("\n4. Sparkles")
    demo_sparkles(display, renderer, duration=5)

    print("\033[2J\033[H")
    print("Starfield demos complete!")
    print("\nThese demos show:")
    print("  - 3D perspective projection")
    print("  - Motion trails and streaks")
    print("  - Particle lifecycle management")
    print("  - Random movement patterns")
    print("  - Fade in/out effects")


if __name__ == '__main__':
    main()
