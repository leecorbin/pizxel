/**
 * PiZXel Game SDK
 *
 * Complete game development toolkit with sprites, collision detection,
 * physics, and game utilities.
 *
 * Example usage:
 * ```typescript
 * import { Sprite, spriteSprite, ScoreManager, Sounds, getAudio } from "pizxel/game";
 *
 * const player = new Sprite({ x: 100, y: 100, width: 16, height: 16, color: [0, 255, 0] });
 * const enemy = new Sprite({ x: 200, y: 100, width: 16, height: 16, color: [255, 0, 0] });
 *
 * if (spriteSprite(player, enemy)) {
 *   getAudio()?.play(Sounds.HIT);
 *   scoreManager.addScore(10);
 * }
 * ```
 */

// Sprite system
export * from "./sprite";

// Collision detection
export * from "./collision";

// Physics
export * from "./physics";

// Game utilities
export * from "./utils";

// Timing (time-based stepping, key auto-repeat) and held-key input
export * from "./timing";
export * from "./input";

// Re-export audio for convenience
export { getAudio } from "../core/instance-context";
export { Sounds, Audio } from "../audio/audio";
