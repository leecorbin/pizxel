/**
 * Game Utilities
 *
 * Common game UI components and utilities (score, lives, timers, etc.)
 */

import { DisplayBuffer } from "../core/display-buffer";
import { RGB } from "../types";
import { AppStorage } from "../core/app-storage";

/**
 * Score Manager with high score tracking
 */
export class ScoreManager {
  private score: number = 0;
  private highScore: number = 0;
  private storage: AppStorage;
  private storageKey: string;
  private saveTimer: NodeJS.Timeout | null = null;

  constructor(appName: string, storageKey: string = "highScore") {
    this.storage = new AppStorage(appName);
    this.storageKey = storageKey;
    this.highScore = parseInt(this.storage.get(storageKey, "0"));
  }

  getScore(): number {
    return this.score;
  }

  getHighScore(): number {
    return this.highScore;
  }

  addScore(points: number): void {
    this.setScore(this.score + points);
  }

  setScore(score: number): void {
    this.score = score;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.scheduleSave();
    }
  }

  reset(): void {
    this.saveHighScore();
    this.score = 0;
  }

  /** Write the high score now (it's otherwise saved at most once a second) */
  saveHighScore(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.storage.set(this.storageKey, this.highScore.toString());
  }

  // Disk writes are synchronous: batch them rather than write every point
  private scheduleSave(): void {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => this.saveHighScore(), 1000);
  }

  isNewHighScore(): boolean {
    return this.score === this.highScore && this.score > 0;
  }

  render(
    buffer: DisplayBuffer,
    x: number,
    y: number,
    color: RGB = [255, 255, 0]
  ): void {
    buffer.text(`Score: ${this.score}`, x, y, color);
  }

  renderWithHigh(
    buffer: DisplayBuffer,
    x: number,
    y: number,
    spacing: number = 80,
    color: RGB = [255, 255, 0]
  ): void {
    buffer.text(`Score: ${this.score}`, x, y, color);
    buffer.text(`High: ${this.highScore}`, x + spacing, y, color);
  }
}

/**
 * Lives/Health Manager
 */
export class LivesManager {
  private lives: number;
  private maxLives: number;

  constructor(initialLives: number = 3, maxLives: number = 5) {
    this.lives = initialLives;
    this.maxLives = maxLives;
  }

  getLives(): number {
    return this.lives;
  }

  addLife(): boolean {
    if (this.lives < this.maxLives) {
      this.lives++;
      return true;
    }
    return false;
  }

  loseLife(): boolean {
    this.lives--;
    return this.lives <= 0; // Returns true if game over
  }

  reset(lives?: number): void {
    this.lives = lives !== undefined ? lives : 3;
  }

  isGameOver(): boolean {
    return this.lives <= 0;
  }

  render(
    buffer: DisplayBuffer,
    x: number,
    y: number,
    color: RGB = [255, 0, 0],
    symbol: string = "♥"
  ): void {
    buffer.text(`Lives: `, x, y, [200, 200, 200]);
    for (let i = 0; i < this.lives; i++) {
      buffer.text(symbol, x + 50 + i * 12, y, color);
    }
  }
}

/**
 * Countdown Timer
 */
export class Timer {
  private remaining: number; // Seconds
  private duration: number; // Seconds
  private running: boolean = false;
  private onComplete?: () => void;

  constructor(duration: number, onComplete?: () => void) {
    this.duration = duration;
    this.remaining = duration;
    this.onComplete = onComplete;
  }

  start(): void {
    this.running = true;
    this.remaining = this.duration;
  }

  stop(): void {
    this.running = false;
  }

  reset(): void {
    this.remaining = this.duration;
  }

  update(deltaTime: number): void {
    if (!this.running) return;

    this.remaining -= deltaTime;
    if (this.remaining <= 0) {
      this.remaining = 0;
      this.running = false;
      if (this.onComplete) {
        this.onComplete();
      }
    }
  }

  getRemaining(): number {
    return Math.max(0, this.remaining);
  }

  getRemainingFormatted(): string {
    const seconds = Math.ceil(this.getRemaining());
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }

  isRunning(): boolean {
    return this.running;
  }

  isExpired(): boolean {
    return this.remaining <= 0;
  }

  render(
    buffer: DisplayBuffer,
    x: number,
    y: number,
    color: RGB = [255, 255, 255]
  ): void {
    buffer.text(this.getRemainingFormatted(), x, y, color);
  }
}

/**
 * Level Manager
 */
export class LevelManager {
  private level: number = 1;
  private onLevelUp?: (level: number) => void;

  constructor(onLevelUp?: (level: number) => void) {
    this.onLevelUp = onLevelUp;
  }

  getLevel(): number {
    return this.level;
  }

  nextLevel(): void {
    this.level++;
    if (this.onLevelUp) {
      this.onLevelUp(this.level);
    }
  }

  setLevel(level: number): void {
    this.level = level;
  }

  reset(): void {
    this.level = 1;
  }

  render(
    buffer: DisplayBuffer,
    x: number,
    y: number,
    color: RGB = [0, 255, 255]
  ): void {
    buffer.text(`Level: ${this.level}`, x, y, color);
  }
}

/**
 * Pause State Manager
 */
export class PauseManager {
  private paused: boolean = false;

  toggle(): void {
    this.paused = !this.paused;
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  isPaused(): boolean {
    return this.paused;
  }

  renderOverlay(buffer: DisplayBuffer): void {
    if (!this.paused) return;

    // Dim background
    for (let y = 60; y < 132; y++) {
      for (let x = 20; x < 236; x++) {
        const pixel = buffer.getPixel(x, y);
        buffer.setPixel(x, y, [
          Math.floor(pixel[0] * 0.3),
          Math.floor(pixel[1] * 0.3),
          Math.floor(pixel[2] * 0.3),
        ]);
      }
    }

    buffer.centeredText("PAUSED", 80, [255, 255, 0]);
    buffer.centeredText("Press P to continue", 100, [200, 200, 200]);
  }
}
