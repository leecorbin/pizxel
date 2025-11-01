#!/usr/bin/env python3
"""
Physics Demo - Bouncing balls and particle systems
"""

import sys
import time
import os
import math
import random

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.display import Display, TerminalRenderer


class Ball:
    """A ball with physics properties."""

    def __init__(self, x, y, vx, vy, radius=3, color=None):
        self.x = x
        self.y = y
        self.vx = vx
        self.vy = vy
        self.radius = radius
        self.color = color or (255, 255, 255)
        self.gravity = 0.2

    def update(self, width, height):
        """Update ball position and handle collisions."""
        # Apply gravity
        self.vy += self.gravity

        # Update position
        self.x += self.vx
        self.y += self.vy

        # Bounce off walls with some energy loss
        if self.x - self.radius < 0:
            self.x = self.radius
            self.vx = abs(self.vx) * 0.9
        elif self.x + self.radius >= width:
            self.x = width - self.radius - 1
            self.vx = -abs(self.vx) * 0.9

        if self.y - self.radius < 0:
            self.y = self.radius
            self.vy = abs(self.vy) * 0.9
        elif self.y + self.radius >= height:
            self.y = height - self.radius - 1
            self.vy = -abs(self.vy) * 0.85  # More energy loss on ground

    def draw(self, display):
        """Draw the ball on the display."""
        # Draw filled circle
        for dy in range(-self.radius, self.radius + 1):
            for dx in range(-self.radius, self.radius + 1):
                if dx*dx + dy*dy <= self.radius*self.radius:
                    px = int(self.x + dx)
                    py = int(self.y + dy)
                    if 0 <= px < display.width and 0 <= py < display.height:
                        if display.color_mode == 'rgb':
                            display.set_pixel(px, py, self.color)
                        else:
                            display.set_pixel(px, py, True)


class Particle:
    """A simple particle."""

    def __init__(self, x, y, vx, vy, lifetime=30, color=None):
        self.x = x
        self.y = y
        self.vx = vx
        self.vy = vy
        self.lifetime = lifetime
        self.max_lifetime = lifetime
        self.color = color or (255, 255, 255)

    def update(self):
        """Update particle position."""
        self.x += self.vx
        self.y += self.vy
        self.vy += 0.1  # Slight gravity
        self.lifetime -= 1
        return self.lifetime > 0

    def draw(self, display):
        """Draw the particle."""
        px, py = int(self.x), int(self.y)
        if 0 <= px < display.width and 0 <= py < display.height:
            if display.color_mode == 'rgb':
                # Fade out based on lifetime
                fade = self.lifetime / self.max_lifetime
                r, g, b = self.color
                faded_color = (int(r * fade), int(g * fade), int(b * fade))
                display.set_pixel(px, py, faded_color)
            else:
                display.set_pixel(px, py, True)


def demo_bouncing_balls(display, renderer, duration=10):
    """Multiple balls bouncing with gravity."""
    # Create balls with random colors
    colors = [
        (255, 0, 0),    # Red
        (0, 255, 0),    # Green
        (0, 0, 255),    # Blue
        (255, 255, 0),  # Yellow
        (255, 0, 255),  # Magenta
        (0, 255, 255),  # Cyan
    ]

    balls = []
    for i in range(6):
        x = random.randint(10, display.width - 10)
        y = random.randint(10, display.height // 2)
        vx = random.uniform(-2, 2)
        vy = random.uniform(-3, 0)
        color = colors[i] if display.color_mode == 'rgb' else None
        balls.append(Ball(x, y, vx, vy, radius=3, color=color))

    start_time = time.time()
    while time.time() - start_time < duration:
        display.clear()

        # Draw ground line
        for x in range(display.width):
            y = display.height - 1
            if display.color_mode == 'rgb':
                display.set_pixel(x, y, (50, 50, 50))
            else:
                display.set_pixel(x, y, True)

        # Update and draw balls
        for ball in balls:
            ball.update(display.width, display.height)
            ball.draw(display)

        renderer.display_in_terminal()
        time.sleep(0.05)


def demo_fountain(display, renderer, duration=10):
    """Particle fountain effect."""
    particles = []
    fountain_x = display.width // 2
    fountain_y = display.height - 5

    start_time = time.time()
    frame = 0

    while time.time() - start_time < duration:
        display.clear()

        # Spawn new particles
        if frame % 2 == 0:
            for _ in range(3):
                angle = random.uniform(math.pi * 0.6, math.pi * 0.4) + math.pi
                speed = random.uniform(2, 4)
                vx = speed * math.cos(angle)
                vy = speed * math.sin(angle)

                if display.color_mode == 'rgb':
                    # Rainbow colors
                    hue = (frame * 2) % 360
                    color = hsv_to_rgb(hue, 1.0, 1.0)
                else:
                    color = None

                particles.append(Particle(
                    fountain_x, fountain_y, vx, vy,
                    lifetime=random.randint(40, 60),
                    color=color
                ))

        # Update particles
        particles = [p for p in particles if p.update()]

        # Draw particles
        for particle in particles:
            particle.draw(display)

        # Draw fountain base
        for x in range(fountain_x - 3, fountain_x + 4):
            for y in range(fountain_y, min(fountain_y + 3, display.height)):
                if 0 <= x < display.width and 0 <= y < display.height:
                    if display.color_mode == 'rgb':
                        display.set_pixel(x, y, (100, 100, 100))
                    else:
                        display.set_pixel(x, y, True)

        frame += 1
        renderer.display_in_terminal()
        time.sleep(0.03)


def demo_collision(display, renderer, duration=10):
    """Balls that collide with each other."""
    balls = []
    colors = [(255, 0, 0), (0, 255, 0), (0, 0, 255), (255, 255, 0)]

    for i in range(4):
        x = random.randint(15, display.width - 15)
        y = random.randint(15, display.height - 15)
        angle = random.uniform(0, 2 * math.pi)
        speed = random.uniform(1, 2)
        vx = speed * math.cos(angle)
        vy = speed * math.sin(angle)
        color = colors[i] if display.color_mode == 'rgb' else None
        ball = Ball(x, y, vx, vy, radius=4, color=color)
        ball.gravity = 0  # No gravity for this demo
        balls.append(ball)

    start_time = time.time()
    while time.time() - start_time < duration:
        display.clear()

        # Update balls
        for ball in balls:
            ball.update(display.width, display.height)

        # Simple collision detection between balls
        for i, ball1 in enumerate(balls):
            for ball2 in balls[i+1:]:
                dx = ball2.x - ball1.x
                dy = ball2.y - ball1.y
                dist = math.sqrt(dx*dx + dy*dy)
                min_dist = ball1.radius + ball2.radius

                if dist < min_dist and dist > 0:
                    # Simple elastic collision
                    nx = dx / dist
                    ny = dy / dist

                    # Relative velocity
                    dvx = ball2.vx - ball1.vx
                    dvy = ball2.vy - ball1.vy
                    dot = dvx * nx + dvy * ny

                    if dot < 0:  # Moving towards each other
                        ball1.vx += dot * nx
                        ball1.vy += dot * ny
                        ball2.vx -= dot * nx
                        ball2.vy -= dot * ny

                        # Separate balls
                        overlap = min_dist - dist
                        ball1.x -= overlap * nx * 0.5
                        ball1.y -= overlap * ny * 0.5
                        ball2.x += overlap * nx * 0.5
                        ball2.y += overlap * ny * 0.5

        # Draw balls
        for ball in balls:
            ball.draw(display)

        renderer.display_in_terminal()
        time.sleep(0.03)


def hsv_to_rgb(h, s, v):
    """Convert HSV to RGB color space."""
    h = h / 60.0
    i = int(h)
    f = h - i
    p = v * (1 - s)
    q = v * (1 - s * f)
    t = v * (1 - s * (1 - f))

    if i == 0:
        r, g, b = v, t, p
    elif i == 1:
        r, g, b = q, v, p
    elif i == 2:
        r, g, b = p, v, t
    elif i == 3:
        r, g, b = p, q, v
    elif i == 4:
        r, g, b = t, p, v
    else:
        r, g, b = v, p, q

    return (int(r * 255), int(g * 255), int(b * 255))


def main():
    """Run physics demos."""
    print("LED Matrix Physics Simulation")
    print("==============================\n")

    # RGB mode for colorful physics
    print("Creating 64x64 RGB display...\n")
    display = Display(64, 64, color_mode='rgb')
    renderer = TerminalRenderer(display)

    print("1. Bouncing Balls with Gravity")
    demo_bouncing_balls(display, renderer, duration=5)

    print("\n2. Particle Fountain")
    demo_fountain(display, renderer, duration=5)

    print("\n3. Ball Collisions")
    demo_collision(display, renderer, duration=5)

    print("\033[2J\033[H")
    print("Physics demos complete!")
    print("\nThese demos show:")
    print("  - Gravity simulation")
    print("  - Elastic collisions")
    print("  - Particle systems with lifetime")
    print("  - Energy loss on bouncing")
    print("  - Basic physics integration")


if __name__ == '__main__':
    main()
