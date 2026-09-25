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
  KeyRepeat,
  anyKeyDown,
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
  private readonly gridX = 88; // Centred: 88..168, panels either side
  private readonly gridY = 20;

  // Held-key auto-repeat (a press moves at once; holding repeats)
  private repeatLeft = new KeyRepeat(0.17, 0.05);
  private repeatRight = new KeyRepeat(0.17, 0.05);
  private repeatDown = new KeyRepeat(0.1, 0.04);

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

    // Held keys
    const left = anyKeyDown(InputKeys.LEFT, "a");
    const right = anyKeyDown(InputKeys.RIGHT, "d");
    for (let n = this.repeatLeft.update(left && !right, deltaTime); n > 0; n--) {
      this.movePiece(-1, 0);
      this.dirty = true;
    }
    for (let n = this.repeatRight.update(right && !left, deltaTime); n > 0; n--) {
      this.movePiece(1, 0);
      this.dirty = true;
    }
    const down = anyKeyDown(InputKeys.DOWN, "s");
    for (let n = this.repeatDown.update(down, deltaTime); n > 0; n--) {
      this.softDrop();
    }
    if (this.state !== GameState.PLAYING) return;

    // Gravity (carry leftover time, so the speed is right at any frame rate)
    this.dropTimer += deltaTime;
    if (this.dropTimer >= this.dropInterval) {
      this.dropTimer = Math.min(this.dropTimer - this.dropInterval, this.dropInterval);

      if (!this.movePiece(0, 1)) {
        this.lockPiece();
      }

      this.dirty = true;
    }
  }

  private softDrop(): void {
    if (this.movePiece(0, 1)) {
      this.score.addScore(1); // Bonus for soft drop
      this.dropTimer = 0;
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

    // Held moves repeat in onUpdate, so ignore the browser's own key repeat
    const moveKeys = [InputKeys.LEFT, "a", "A", InputKeys.RIGHT, "d", "D", InputKeys.DOWN, "s", "S"];
    if (event.repeat && moveKeys.includes(event.key)) {
      return true;
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
        this.softDrop();
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

    // Side panel (left of the grid: at most 10 characters)
    matrix.text("Score", 4, 22, [200, 200, 200]);
    matrix.text(`${this.score.getScore()}`, 4, 32, [255, 255, 255]);
    matrix.text("High", 4, 48, [200, 200, 200]);
    matrix.text(`${this.score.getHighScore()}`, 4, 58, [255, 255, 0]);
    matrix.text(`Lines ${this.lines}`, 4, 76, [0, 255, 255]);
    matrix.text(`Level ${this.level}`, 4, 88, [0, 255, 255]);

    // Next piece preview
    matrix.text("Next:", 4, 108, [200, 200, 200]);
    if (this.nextPiece) {
      for (let y = 0; y < this.nextPiece.shape.length; y++) {
        for (let x = 0; x < this.nextPiece.shape[y].length; x++) {
          if (this.nextPiece.shape[y][x]) {
            const px = 4 + x * 8;
            const py = 120 + y * 8;
            matrix.rect(px, py, 7, 7, this.nextPiece.color, true);
          }
        }
      }
    }

    // Controls hint
    // Controls hint (right of the grid: at most 10 characters)
    matrix.text("A/D Move", 174, 22, [150, 150, 150]);
    matrix.text("W Rotate", 174, 36, [150, 150, 150]);
    matrix.text("S Down", 174, 50, [150, 150, 150]);
    matrix.text("X Drop", 174, 64, [150, 150, 150]);
    matrix.text("P Pause", 174, 78, [150, 150, 150]);

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
      matrix.centeredText("GAME OVER", 76, [255, 255, 255]);
      matrix.centeredText(`Score: ${this.score.getScore()}`, 92, [255, 255, 255]);

      if (this.score.isNewHighScore()) {
        matrix.centeredText("NEW HIGH!", 106, [255, 255, 0]);
      }

      matrix.centeredText("ENTER to restart", 124, [200, 200, 200]);
    }

    // Pause overlay
    if (this.pause.isPaused()) {
      this.pause.renderOverlay(matrix);
    }

    this.dirty = false;
  }
}
