/**
 * Tetris - Classic Falling Blocks Puzzle
 *
 * Uses PiZXel Game SDK for state management and scoring.
 */

import { App, InputEvent, InputKeys } from "../../types";
import { DisplayBuffer } from "../../core/display-buffer";
import {
  ScoreManager,
  PauseManager,
  getAudio,
  Sounds,
} from "../../game";

enum GameState {
  PLAYING,
  PAUSED,
  GAME_OVER,
}

// Tetromino shapes (rotation 0)
const SHAPES = {
  I: [[1, 1, 1, 1]],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
  ],
};

const COLORS: { [key: string]: [number, number, number] } = {
  I: [0, 255, 255],
  O: [255, 255, 0],
  T: [128, 0, 255],
  S: [0, 255, 0],
  Z: [255, 0, 0],
  J: [0, 0, 255],
  L: [255, 128, 0],
};

type ShapeName = keyof typeof SHAPES;

interface Piece {
  shape: number[][];
  x: number;
  y: number;
  color: [number, number, number];
  name: ShapeName;
}

export class TetrisApp implements App {
  readonly name = "Tetris";
  dirty = true;

  private state: GameState = GameState.PLAYING;
  private grid: (null | [number, number, number])[][] = [];
  private currentPiece: Piece | null = null;
  private nextPiece: Piece | null = null;
  private score: ScoreManager;
  private pause: PauseManager;
  private lines: number = 0;
  private level: number = 1;
  private dropTimer: number = 0;
  private dropInterval: number = 0.8; // seconds

  // Grid dimensions
  private readonly gridWidth = 10;
  private readonly gridHeight = 20;
  private readonly cellSize = 8;
  private readonly gridX = 60;
  private readonly gridY = 20;

  constructor() {
    this.score = new ScoreManager("tetris");
    this.pause = new PauseManager();

    // Initialize empty grid
    for (let y = 0; y < this.gridHeight; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.gridWidth; x++) {
        this.grid[y][x] = null;
      }
    }

    this.spawnPiece();
    this.nextPiece = this.createRandomPiece();
  }

  private createRandomPiece(): Piece {
    const names = Object.keys(SHAPES) as ShapeName[];
    const name = names[Math.floor(Math.random() * names.length)];
    return {
      shape: SHAPES[name].map((row) => [...row]),
      x: Math.floor(this.gridWidth / 2) - 1,
      y: 0,
      color: COLORS[name],
      name,
    };
  }

  private spawnPiece(): void {
    if (this.nextPiece) {
      this.currentPiece = this.nextPiece;
      this.nextPiece = this.createRandomPiece();
    } else {
      this.currentPiece = this.createRandomPiece();
    }

    // Check for game over
    if (!this.canPlacePiece(this.currentPiece)) {
      this.state = GameState.GAME_OVER;
      getAudio()?.play(Sounds.DIE);
    }
  }

  private canPlacePiece(piece: Piece): boolean {
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const gridX = piece.x + x;
          const gridY = piece.y + y;

          if (
            gridX < 0 ||
            gridX >= this.gridWidth ||
            gridY >= this.gridHeight
          ) {
            return false;
          }

          if (gridY >= 0 && this.grid[gridY][gridX] !== null) {
            return false;
          }
        }
      }
    }
    return true;
  }

  private lockPiece(): void {
    if (!this.currentPiece) return;

    for (let y = 0; y < this.currentPiece.shape.length; y++) {
      for (let x = 0; x < this.currentPiece.shape[y].length; x++) {
        if (this.currentPiece.shape[y][x]) {
          const gridY = this.currentPiece.y + y;
          const gridX = this.currentPiece.x + x;
          if (gridY >= 0) {
            this.grid[gridY][gridX] = this.currentPiece.color;
          }
        }
      }
    }

    getAudio()?.play(Sounds.HIT);
    this.checkLines();
    this.spawnPiece();
  }

  private checkLines(): void {
    let linesCleared = 0;

    for (let y = this.gridHeight - 1; y >= 0; y--) {
      if (this.grid[y].every((cell) => cell !== null)) {
        // Remove line
        this.grid.splice(y, 1);
        // Add empty line at top
        this.grid.unshift(Array(this.gridWidth).fill(null));
        linesCleared++;
        y++; // Recheck this row
      }
    }

    if (linesCleared > 0) {
      this.lines += linesCleared;

      // Scoring: 40, 100, 300, 1200 for 1-4 lines
      const points = [0, 40, 100, 300, 1200][linesCleared] * this.level;
      this.score.addScore(points);

      // Level up every 10 lines
      const newLevel = Math.floor(this.lines / 10) + 1;
      if (newLevel > this.level) {
        this.level = newLevel;
        this.dropInterval = Math.max(0.1, 0.8 - (this.level - 1) * 0.05);
        getAudio()?.play(Sounds.POWERUP);
      } else {
        getAudio()?.play(Sounds.BRICK);
      }
    }
  }

  private rotatePiece(): void {
    if (!this.currentPiece) return;

    const rotated = this.currentPiece.shape[0].map((_, i) =>
      this.currentPiece!.shape.map((row) => row[i]).reverse()
    );

    const testPiece = { ...this.currentPiece, shape: rotated };

    if (this.canPlacePiece(testPiece)) {
      this.currentPiece.shape = rotated;
      getAudio()?.play(Sounds.SELECT);
    }
  }

  private movePiece(dx: number, dy: number): boolean {
    if (!this.currentPiece) return false;

    const testPiece = {
      ...this.currentPiece,
      x: this.currentPiece.x + dx,
      y: this.currentPiece.y + dy,
    };

    if (this.canPlacePiece(testPiece)) {
      this.currentPiece.x = testPiece.x;
      this.currentPiece.y = testPiece.y;
      return true;
    }

    return false;
  }

  private hardDrop(): void {
    if (!this.currentPiece) return;

    while (this.movePiece(0, 1)) {
      this.score.addScore(2); // Bonus for hard drop
    }

    this.lockPiece();
  }

  async onActivate(): Promise<void> {
    this.dirty = true;
  }

  onDeactivate(): void {}

  onUpdate(deltaTime: number): void {
    if (this.state !== GameState.PLAYING || this.pause.isPaused()) {
      return;
    }

    this.dropTimer += deltaTime;

    if (this.dropTimer >= this.dropInterval) {
      this.dropTimer = 0;

      if (!this.movePiece(0, 1)) {
        this.lockPiece();
      }

      this.dirty = true;
    }
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
      this.lines = 0;
      this.level = 1;
      this.dropInterval = 0.8;
      this.score.reset();

      // Clear grid
      for (let y = 0; y < this.gridHeight; y++) {
        for (let x = 0; x < this.gridWidth; x++) {
          this.grid[y][x] = null;
        }
      }

      this.spawnPiece();
      this.state = GameState.PLAYING;
      this.dirty = true;
      return true;
    }

    if (this.state !== GameState.PLAYING || this.pause.isPaused()) {
      return false;
    }

    switch (event.key) {
      case InputKeys.LEFT:
      case "a":
      case "A":
        this.movePiece(-1, 0);
        this.dirty = true;
        return true;

      case InputKeys.RIGHT:
      case "d":
      case "D":
        this.movePiece(1, 0);
        this.dirty = true;
        return true;

      case InputKeys.DOWN:
      case "s":
      case "S":
        if (this.movePiece(0, 1)) {
          this.score.addScore(1); // Bonus for soft drop
        }
        this.dirty = true;
        return true;

      case InputKeys.UP:
      case "w":
      case "W":
      case " ":
        this.rotatePiece();
        this.dirty = true;
        return true;

      case "x":
      case "X":
        this.hardDrop();
        this.dirty = true;
        return true;
    }

    return false;
  }

  render(matrix: DisplayBuffer): void {
    matrix.clear();

    // Draw grid background
    matrix.rect(
      this.gridX,
      this.gridY,
      this.gridWidth * this.cellSize,
      this.gridHeight * this.cellSize,
      [40, 40, 60],
      true
    );

    // Draw locked blocks
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        if (this.grid[y][x]) {
          const px = this.gridX + x * this.cellSize;
          const py = this.gridY + y * this.cellSize;
          matrix.rect(
            px,
            py,
            this.cellSize - 1,
            this.cellSize - 1,
            this.grid[y][x]!,
            true
          );
        }
      }
    }

    // Draw current piece
    if (this.currentPiece) {
      for (let y = 0; y < this.currentPiece.shape.length; y++) {
        for (let x = 0; x < this.currentPiece.shape[y].length; x++) {
          if (this.currentPiece.shape[y][x]) {
            const px = this.gridX + (this.currentPiece.x + x) * this.cellSize;
            const py = this.gridY + (this.currentPiece.y + y) * this.cellSize;
            matrix.rect(
              px,
              py,
              this.cellSize - 1,
              this.cellSize - 1,
              this.currentPiece.color,
              true
            );
          }
        }
      }
    }

    // Draw grid lines
    for (let x = 0; x <= this.gridWidth; x++) {
      const px = this.gridX + x * this.cellSize;
      matrix.line(
        px,
        this.gridY,
        px,
        this.gridY + this.gridHeight * this.cellSize,
        [60, 60, 80]
      );
    }
    for (let y = 0; y <= this.gridHeight; y++) {
      const py = this.gridY + y * this.cellSize;
      matrix.line(
        this.gridX,
        py,
        this.gridX + this.gridWidth * this.cellSize,
        py,
        [60, 60, 80]
      );
    }

    // Side panel
    matrix.text(`Score: ${this.score.getScore()}`, 10, 30, [255, 255, 255]);
    matrix.text(`High: ${this.score.getHighScore()}`, 10, 45, [255, 255, 0]);
    matrix.text(`Lines: ${this.lines}`, 10, 65, [0, 255, 255]);
    matrix.text(`Level: ${this.level}`, 10, 80, [0, 255, 255]);

    // Next piece preview
    matrix.text("Next:", 10, 105, [200, 200, 200]);
    if (this.nextPiece) {
      for (let y = 0; y < this.nextPiece.shape.length; y++) {
        for (let x = 0; x < this.nextPiece.shape[y].length; x++) {
          if (this.nextPiece.shape[y][x]) {
            const px = 10 + x * 8;
            const py = 120 + y * 8;
            matrix.rect(px, py, 7, 7, this.nextPiece.color, true);
          }
        }
      }
    }

    // Controls hint
    matrix.text("A/D: Move", 180, 30, [150, 150, 150]);
    matrix.text("W/SPC: Rotate", 180, 45, [150, 150, 150]);
    matrix.text("S: Soft drop", 180, 60, [150, 150, 150]);
    matrix.text("X: Hard drop", 180, 75, [150, 150, 150]);
    matrix.text("P: Pause", 180, 90, [150, 150, 150]);

    // Game over overlay
    if (this.state === GameState.GAME_OVER) {
      for (let y = 60; y < 140; y++) {
        for (let x = 60; x < 200; x++) {
          const pixel = matrix.getPixel(x, y);
          matrix.setPixel(x, y, [
            Math.floor(pixel[0] * 0.3),
            Math.floor(pixel[1] * 0.3),
            Math.floor(pixel[2] * 0.3),
          ]);
        }
      }

      matrix.rect(60, 60, 140, 80, [0, 255, 255], false);
      matrix.text("GAME OVER", 84, 80, [255, 255, 255]);
      matrix.text(`Score: ${this.score.getScore()}`, 84, 100, [255, 255, 255]);

      if (this.score.isNewHighScore()) {
        matrix.text("NEW HIGH!", 76, 110, [255, 255, 0]);
      }

      matrix.text("ENTER to restart", 68, 125, [200, 200, 200]);
    }

    // Pause overlay
    if (this.pause.isPaused()) {
      this.pause.renderOverlay(matrix);
    }

    this.dirty = false;
  }
}
