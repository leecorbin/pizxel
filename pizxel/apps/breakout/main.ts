/**
 * Breakout - Classic Brick Breaking Game
 *
 * Uses PiZXel Game SDK for sprites, collision, physics, and state management.
 */

import { App, InputEvent, InputKeys } from "../../types";
import { DisplayBuffer } from "../../core/display-buffer";
import {
  Sprite,
  spriteSprite,
  rectRect,
  isOutOfBounds,
  clampToBounds,
  paddleBounce,
  bounceY,
  bounceX,
  ScoreManager,
  LivesManager,
  PauseManager,
  getAudio,
  Sounds,
} from "../../game";

enum GameState {
  READY,
  PLAYING,
  PAUSED,
  GAME_OVER,
}

interface Brick extends Sprite {
  hits: number; // Hits required to destroy
  points: number; // Points awarded
}

export class BreakoutApp implements App {
  readonly name = "Breakout";
  dirty = true;

  private state: GameState = GameState.READY;
  private paddle: Sprite;
  private ball: Sprite;
  private bricks: Brick[] = [];
  private score: ScoreManager;
  private lives: LivesManager;
  private pause: PauseManager;
  private level: number = 1;
  private ballSpeed: number = 120;

  // Display bounds
  private readonly width = 256;
  private readonly height = 192;
  private readonly playAreaTop = 30;

  constructor() {
    // Create paddle (40x8)
    this.paddle = new Sprite({ x: 108, y: 170, width: 40, height: 8, color: [0, 255, 255] });

    // Create ball (6x6)
    this.ball = new Sprite({ x: 125, y: 150, width: 6, height: 6, color: [255, 255, 255] });

    // Initialize managers
    this.score = new ScoreManager("breakout");
    this.lives = new LivesManager(3, 3);
    this.pause = new PauseManager();

    // Create initial brick layout
    this.createBricks();
  }

  private createBricks(): void {
    this.bricks = [];
    const rows = 5;
    const cols = 10;
    const brickWidth = 22;
    const brickHeight = 10;
    const spacing = 3;
    const startX = 10;
    const startY = this.playAreaTop + 10;

    const colors: Array<[number, number, number]> = [
      [255, 0, 0], // Red - 2 hits
      [255, 128, 0], // Orange - 2 hits
      [255, 255, 0], // Yellow - 1 hit
      [0, 255, 0], // Green - 1 hit
      [0, 128, 255], // Blue - 1 hit
    ];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = startX + col * (brickWidth + spacing);
        const y = startY + row * (brickHeight + spacing);
        const brick = new Sprite({ x: x, y: y, width: brickWidth, height: brickHeight, color: colors[row] }) as Brick;
        brick.hits = row < 2 ? 2 : 1; // Top 2 rows need 2 hits
        brick.points = brick.hits * 10;
        brick.addTag("brick");
        this.bricks.push(brick);
      }
    }
  }

  private resetBall(): void {
    this.ball.x = this.paddle.x + this.paddle.width / 2 - this.ball.width / 2;
    this.ball.y = this.paddle.y - this.ball.height - 2;
    this.ball.vx = 0;
    this.ball.vy = 0;
  }

  private launchBall(): void {
    // Launch at angle based on time (feels more dynamic)
    const angle = -60 - (Date.now() % 60);
    const rad = (angle * Math.PI) / 180;
    this.ball.vx = Math.cos(rad) * this.ballSpeed;
    this.ball.vy = Math.sin(rad) * this.ballSpeed;
  }

  private nextLevel(): void {
    this.level++;
    this.ballSpeed += 15; // Increase speed each level
    this.createBricks();
    this.resetBall();
    this.state = GameState.READY;
    getAudio()?.play(Sounds.POWERUP);
  }

  async onActivate(): Promise<void> {
    this.dirty = true;
  }

  onDeactivate(): void {}

  onUpdate(deltaTime: number): void {
    if (this.state !== GameState.PLAYING) {
      return;
    }

    // Move ball
    this.ball.update(deltaTime);

    // Ball vs walls
    if (this.ball.x <= 0 || this.ball.x + this.ball.width >= this.width) {
      this.ball.vx = -this.ball.vx;
      this.ball.x = this.ball.x <= 0 ? 0 : this.width - this.ball.width;
      getAudio()?.play(Sounds.BOUNCE);
    }

    if (this.ball.y <= this.playAreaTop) {
      this.ball.vy = -this.ball.vy;
      this.ball.y = this.playAreaTop;
      getAudio()?.play(Sounds.BOUNCE);
    }

    // Ball vs paddle (use paddleBounce physics)
    if (spriteSprite(this.ball, this.paddle)) {
      const hitPos =
        this.ball.x +
        this.ball.width / 2 -
        (this.paddle.x + this.paddle.width / 2);
      const normalizedHit = hitPos / (this.paddle.width / 2);

      // paddleBounce applies spin based on where ball hits paddle
      this.ball.vy = -Math.abs(this.ball.vy);
      this.ball.vx += normalizedHit * 50; // Add spin
      this.ball.y = this.paddle.y - this.ball.height;
      getAudio()?.play(Sounds.BOUNCE);
    }

    // Ball vs bricks
    for (let i = this.bricks.length - 1; i >= 0; i--) {
      const brick = this.bricks[i];
      if (spriteSprite(this.ball, brick)) {
        // Determine bounce direction
        const ballCenterX = this.ball.x + this.ball.width / 2;
        const ballCenterY = this.ball.y + this.ball.height / 2;
        const brickCenterX = brick.x + brick.width / 2;
        const brickCenterY = brick.y + brick.height / 2;

        const dx = ballCenterX - brickCenterX;
        const dy = ballCenterY - brickCenterY;

        // Bounce based on which side was hit
        if (Math.abs(dx / brick.width) > Math.abs(dy / brick.height)) {
          this.ball.vx = -this.ball.vx;
        } else {
          this.ball.vy = -this.ball.vy;
        }

        // Damage brick
        brick.hits--;
        if (brick.hits <= 0) {
          this.score.addScore(brick.points);
          this.bricks.splice(i, 1);
          getAudio()?.play(Sounds.BRICK);
        } else {
          // Dim color for damaged brick
          brick.color = [
            Math.floor(brick.color[0] * 0.6),
            Math.floor(brick.color[1] * 0.6),
            Math.floor(brick.color[2] * 0.6),
          ];
          getAudio()?.play(Sounds.HIT);
        }

        this.dirty = true;
        break; // Only one brick per frame
      }
    }

    // Ball fell off bottom
    if (this.ball.y > this.height) {
      this.lives.loseLife();
      if (this.lives.isGameOver()) {
        this.state = GameState.GAME_OVER;
        getAudio()?.play(Sounds.DIE);
      } else {
        this.resetBall();
        this.state = GameState.READY;
        getAudio()?.play(Sounds.ERROR);
      }
    }

    // Level complete
    if (this.bricks.length === 0) {
      this.nextLevel();
    }

    this.dirty = true;
  }

  onEvent(event: InputEvent): boolean {
    if (event.type !== "keydown") return false;

    // Pause
    if (event.key === "p" || event.key === "P") {
      if (this.state === GameState.PLAYING) {
        this.pause.toggle();
        this.dirty = true;
        return true;
      }
    }

    // Restart on game over
    if (this.state === GameState.GAME_OVER && event.key === InputKeys.OK) {
      this.level = 1;
      this.ballSpeed = 120;
      this.lives.reset();
      this.score.reset();
      this.createBricks();
      this.resetBall();
      this.state = GameState.READY;
      this.dirty = true;
      return true;
    }

    // Launch ball
    if (this.state === GameState.READY && event.key === " ") {
      this.launchBall();
      this.state = GameState.PLAYING;
      this.dirty = true;
      return true;
    }

    // Paddle movement (only when playing)
    if (this.state === GameState.PLAYING || this.state === GameState.READY) {
      if (
        event.key === InputKeys.LEFT ||
        event.key === "a" ||
        event.key === "A"
      ) {
        this.paddle.x = Math.max(0, this.paddle.x - 8);
        if (this.state === GameState.READY) {
          this.resetBall(); // Keep ball on paddle
        }
        this.dirty = true;
        return true;
      }

      if (
        event.key === InputKeys.RIGHT ||
        event.key === "d" ||
        event.key === "D"
      ) {
        this.paddle.x = Math.min(
          this.width - this.paddle.width,
          this.paddle.x + 8
        );
        if (this.state === GameState.READY) {
          this.resetBall(); // Keep ball on paddle
        }
        this.dirty = true;
        return true;
      }
    }

    return false;
  }

  render(matrix: DisplayBuffer): void {
    matrix.clear();

    // Top bar
    matrix.rect(0, 0, this.width, this.playAreaTop, [20, 20, 40], true);
    matrix.text(`Score: ${this.score.getScore()}`, 10, 8, [255, 255, 255]);
    matrix.text(`High: ${this.score.getHighScore()}`, 10, 18, [255, 255, 0]);
    this.lives.render(matrix, this.width - 70, 10, [255, 0, 0]);
    matrix.text(`L${this.level}`, this.width - 30, 18, [0, 255, 255]);

    // Bricks
    for (const brick of this.bricks) {
      brick.render(matrix);
    }

    // Paddle
    this.paddle.render(matrix);

    // Ball
    this.ball.render(matrix);

    // State overlays
    if (this.state === GameState.READY) {
      const msg = "PRESS SPACE";
      matrix.text(msg, 88, 100, [255, 255, 0]);
    }

    if (this.state === GameState.GAME_OVER) {
      // Semi-transparent overlay
      for (let y = 60; y < 140; y++) {
        for (let x = 40; x < 216; x++) {
          const pixel = matrix.getPixel(x, y);
          matrix.setPixel(x, y, [
            Math.floor(pixel[0] * 0.3),
            Math.floor(pixel[1] * 0.3),
            Math.floor(pixel[2] * 0.3),
          ]);
        }
      }

      matrix.rect(40, 60, 176, 80, [0, 255, 255], false);
      matrix.text("GAME OVER", 80, 80, [255, 255, 255]);
      matrix.text(`Score: ${this.score.getScore()}`, 80, 100, [255, 255, 255]);

      if (this.score.isNewHighScore()) {
        matrix.text("NEW HIGH SCORE!", 56, 110, [255, 255, 0]);
      }

      matrix.text("ENTER to restart", 64, 125, [200, 200, 200]);
    }

    // Pause overlay
    if (this.pause.isPaused()) {
      this.pause.renderOverlay(matrix);
    }

    this.dirty = false;
  }
}
