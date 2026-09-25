/**
 * Physics Utilities
 *
 * Common physics calculations for games.
 */

import { Sprite } from "./sprite";

/**
 * Apply gravity to sprite
 */
export function applyGravity(
  sprite: Sprite,
  gravity: number,
  deltaTime: number
): void {
  sprite.vy += gravity * deltaTime;
}

/**
 * Apply friction/drag to sprite velocity
 */
/**
 * Slow a sprite down. `friction` is the fraction of speed kept per 60fps
 * frame (e.g. 0.95). Pass deltaTime (seconds) so it behaves the same at any
 * frame rate; without it, it's applied once per call, as before.
 */
export function applyFriction(
  sprite: Sprite,
  friction: number,
  deltaTime?: number
): void {
  const factor = deltaTime === undefined ? friction : Math.pow(friction, deltaTime * 60);
  sprite.vx *= factor;
  sprite.vy *= factor;
}

/**
 * Bounce sprite off horizontal surface (floor/ceiling)
 */
export function bounceY(sprite: Sprite, restitution: number = 0.8): void {
  sprite.vy = -sprite.vy * restitution;
}

/**
 * Bounce sprite off vertical surface (wall)
 */
export function bounceX(sprite: Sprite, restitution: number = 0.8): void {
  sprite.vx = -sprite.vx * restitution;
}

/**
 * Calculate angle between two points in radians
 */
export function angleBetween(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  return Math.atan2(y2 - y1, x2 - x1);
}

/**
 * Calculate distance between two points
 */
export function distance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Move sprite toward target point
 */
export function moveToward(
  sprite: Sprite,
  targetX: number,
  targetY: number,
  speed: number
): void {
  const angle = angleBetween(sprite.x, sprite.y, targetX, targetY);
  sprite.vx = Math.cos(angle) * speed;
  sprite.vy = Math.sin(angle) * speed;
}

/**
 * Reflect velocity vector off a surface normal
 */
export function reflect(
  vx: number,
  vy: number,
  normalX: number,
  normalY: number
): { vx: number; vy: number } {
  // Normalize the normal vector
  const len = Math.sqrt(normalX * normalX + normalY * normalY);
  const nx = normalX / len;
  const ny = normalY / len;

  // Calculate dot product
  const dot = vx * nx + vy * ny;

  // Reflect
  return {
    vx: vx - 2 * dot * nx,
    vy: vy - 2 * dot * ny,
  };
}

/**
 * Calculate velocity for ball bouncing off paddle with spin
 * (like in Breakout/Pong)
 */
export function paddleBounce(
  ballX: number,
  ballY: number,
  ballVx: number,
  ballVy: number,
  paddleX: number,
  paddleY: number,
  paddleWidth: number,
  baseSpeed: number
): { vx: number; vy: number } {
  // Calculate hit position on paddle (-1 to 1)
  const hitPos = (ballX - (paddleX + paddleWidth / 2)) / (paddleWidth / 2);

  // Calculate angle based on hit position
  const maxAngle = Math.PI / 3; // 60 degrees max
  const angle = hitPos * maxAngle;

  // Calculate new velocity
  const speed = Math.sqrt(ballVx * ballVx + ballVy * ballVy);
  const newSpeed = Math.max(speed, baseSpeed);

  return {
    vx: Math.sin(angle) * newSpeed,
    vy: -Math.abs(Math.cos(angle) * newSpeed), // Always bounce up
  };
}

/**
 * Wrap sprite position around bounds (for games like Asteroids)
 */
export function wrapAround(
  sprite: Sprite,
  bounds: { x: number; y: number; width: number; height: number }
): void {
  if (sprite.x + sprite.width < bounds.x) {
    sprite.x = bounds.x + bounds.width;
  } else if (sprite.x > bounds.x + bounds.width) {
    sprite.x = bounds.x - sprite.width;
  }

  if (sprite.y + sprite.height < bounds.y) {
    sprite.y = bounds.y + bounds.height;
  } else if (sprite.y > bounds.y + bounds.height) {
    sprite.y = bounds.y - sprite.height;
  }
}

/**
 * Limit sprite velocity to maximum speed
 */
export function limitSpeed(sprite: Sprite, maxSpeed: number): void {
  const speed = Math.sqrt(sprite.vx * sprite.vx + sprite.vy * sprite.vy);
  if (speed > maxSpeed) {
    const ratio = maxSpeed / speed;
    sprite.vx *= ratio;
    sprite.vy *= ratio;
  }
}
