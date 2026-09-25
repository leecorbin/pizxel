/**
 * Snake Game
 *
 * Classic snake game - eat food, grow longer, avoid walls and yourself!
 *
 * Features:
 * - High score tracking with AppStorage
 * - Settings dialog for speed/difficulty
 * - Pause menu
 * - Progressive difficulty
 */

import { App, InputEvent, InputKeys } from "../../types";
import { DisplayBuffer } from "../../core/display-buffer";
import { AppStorage } from "../../core/app-storage";
import { SettingsDialog } from "../../ui/dialogs/settings-dialog";
import { getAudio } from "../../start";
import { Sounds } from "../../audio/audio";
import { Ticker } from "../../game/timing";

interface Point {
  x: number;
  y: number;
}

enum GameState {
  PLAYING,
  PAUSED,
  GAME_OVER,
  SETTINGS,
}

export class SnakeGame implements App {
  name: string = "Snake";
  private dirty: boolean = true;
  private snake: Point[] = [];
  private food: Point | null = null;
  private direction: Point = { x: 1, y: 0 };
  // Turns waiting for the next step (two, so a quick "up then left" works)
  private turnQueue: Point[] = [];
  private score: number = 0;
  private highScore: number = 0;
  private state: GameState = GameState.PLAYING;
  // Seconds between steps (time-based, so the speed is the same at any
  // frame rate): Easy 0.167, Normal 0.133, Hard 0.083, speeding up to 0.05
  private baseStepTime: number = 8 / 60;
  private stepper: Ticker = new Ticker(8 / 60);
  private static readonly MIN_STEP_TIME = 3 / 60;
  private static readonly STEP_SPEEDUP = 0.5 / 60;
  private gridSize: number = 6;
  private playX: number = 8;
  private playY: number = 24;
  private playWidth: number = 240;
  private playHeight: number = 156; // A whole number of 6px cells

  // Storage and settings
  private storage: AppStorage;
  private settingsDialog: SettingsDialog | null = null;
  private difficulty: string = "Normal"; // Easy, Normal, Hard

  constructor() {
    this.storage = new AppStorage("snake");
    this.highScore = parseInt(this.storage.get("highScore", "0"));
    this.difficulty = this.storage.get("difficulty", "Normal");
    this.applyDifficulty();
  }

  private applyDifficulty(): void {
    switch (this.difficulty) {
      case "Easy":
        this.baseStepTime = 10 / 60;
        break;
      case "Normal":
        this.baseStepTime = 8 / 60;
        break;
      case "Hard":
        this.baseStepTime = 5 / 60;
        break;
    }
    this.stepper.interval = this.baseStepTime;
  }

  private showSettingsDialog(): void {
    this.state = GameState.SETTINGS;
    this.settingsDialog = new SettingsDialog({
      title: "Snake Settings",
      fields: [
        {
          key: "difficulty",
          label: "Difficulty",
          placeholder: "Easy, Normal, or Hard",
          maxLength: 10,
        },
      ],
      values: {
        difficulty: this.difficulty,
      },
      onSave: (values) => {
        // Accept any capitalisation ("easy", "HARD")
        const typed = (values.difficulty || "Normal").trim().toLowerCase();
        const newDifficulty = typed.charAt(0).toUpperCase() + typed.slice(1);
        if (["Easy", "Normal", "Hard"].includes(newDifficulty)) {
          this.difficulty = newDifficulty;
          this.storage.set("difficulty", this.difficulty);
          this.applyDifficulty();
          this.restart();
        }
        this.state = GameState.PLAYING;
        this.settingsDialog = null;
        this.dirty = true;
      },
      onCancel: () => {
        this.state = GameState.PLAYING;
        this.settingsDialog = null;
        this.dirty = true;
      },
    });
    this.dirty = true;
  }

  onActivate(): void {
    // A game in progress resumes paused, rather than being thrown away
    if (this.snake.length === 0 || this.state === GameState.GAME_OVER) {
      this.restart();
    } else if (this.state === GameState.PLAYING) {
      this.state = GameState.PAUSED;
    }
    this.dirty = true;
  }

  onDeactivate(): void {
    // Nothing to clean up
  }

  private restart(): void {
    // Start in center
    const startX =
      Math.floor(this.playWidth / 2 / this.gridSize) * this.gridSize +
      this.playX;
    const startY =
      Math.floor(this.playHeight / 2 / this.gridSize) * this.gridSize +
      this.playY;

    this.snake = [
      { x: startX, y: startY },
      { x: startX - this.gridSize, y: startY },
      { x: startX - this.gridSize * 2, y: startY },
    ];
    this.direction = { x: 1, y: 0 };
    this.turnQueue = [];
    this.score = 0;
    this.state = GameState.PLAYING;
    this.stepper.interval = this.baseStepTime;
    this.stepper.reset();
    this.spawnFood();
    this.dirty = true;
  }

  private spawnFood(): void {
    // Pick a random free cell (a random retry loop would never end once the
    // snake fills the board, hanging the whole OS)
    const occupied = new Set(this.snake.map((seg) => `${seg.x},${seg.y}`));
    const free: Point[] = [];
    for (let y = this.playY; y < this.playY + this.playHeight; y += this.gridSize) {
      for (let x = this.playX; x < this.playX + this.playWidth; x += this.gridSize) {
        if (!occupied.has(`${x},${y}`)) free.push({ x, y });
      }
    }
    this.food = free.length > 0 ? free[Math.floor(Math.random() * free.length)] : null;
  }

  /** Queue a turn, unless it reverses (or repeats) the last queued direction */
  private queueTurn(turn: Point): boolean {
    const last = this.turnQueue[this.turnQueue.length - 1] ?? this.direction;
    const reverses = turn.x === -last.x && turn.y === -last.y;
    const same = turn.x === last.x && turn.y === last.y;
    if (reverses || same || this.turnQueue.length >= 2) return false;
    this.turnQueue.push(turn);
    return true;
  }

  onEvent(event: InputEvent): boolean {
    // Settings dialog takes priority
    if (this.state === GameState.SETTINGS && this.settingsDialog) {
      return this.settingsDialog.handleEvent(event);
    }

    // Pause menu
    if (event.key === "p" || event.key === "P") {
      if (this.state === GameState.PLAYING) {
        this.state = GameState.PAUSED;
      } else if (this.state === GameState.PAUSED) {
        this.state = GameState.PLAYING;
      }
      this.dirty = true;
      return true;
    }

    // Settings
    if (event.key === "s" || event.key === "S") {
      if (this.state !== GameState.SETTINGS) {
        this.showSettingsDialog();
      }
      return true;
    }

    if (this.state === GameState.GAME_OVER) {
      if (event.key === " " || event.key === InputKeys.OK) {
        this.restart();
        this.dirty = true;
        return true;
      }
      return false;
    }

    if (this.state !== GameState.PLAYING) {
      return false;
    }

    // Direction changes (no 180-degree turns; key repeats are ignored)
    const turns: Record<string, Point> = {
      [InputKeys.UP]: { x: 0, y: -1 },
      [InputKeys.DOWN]: { x: 0, y: 1 },
      [InputKeys.LEFT]: { x: -1, y: 0 },
      [InputKeys.RIGHT]: { x: 1, y: 0 },
    };
    const turn = turns[event.key];
    if (turn) {
      if (!event.repeat) this.queueTurn(turn);
      return true;
    }

    return false;
  }

  onUpdate(deltaTime: number): void {
    // Update settings dialog cursor
    if (this.state === GameState.SETTINGS && this.settingsDialog) {
      this.settingsDialog.update(deltaTime);
      this.dirty = true;
      return;
    }

    if (this.state !== GameState.PLAYING) return;

    for (let steps = this.stepper.update(deltaTime); steps > 0; steps--) {
      if (this.state !== GameState.PLAYING) break;
      this.step();
    }
  }

  /** Move the snake one cell */
  private step(): void {
    this.dirty = true;

    // Take the next queued turn
    this.direction = this.turnQueue.shift() ?? this.direction;

    // Move snake
    const head = this.snake[0];
    const newHead = {
      x: head.x + this.direction.x * this.gridSize,
      y: head.y + this.direction.y * this.gridSize,
    };

    // Check wall collision
    if (
      newHead.x < this.playX ||
      newHead.x >= this.playX + this.playWidth ||
      newHead.y < this.playY ||
      newHead.y >= this.playY + this.playHeight
    ) {
      this.state = GameState.GAME_OVER;
      getAudio()?.play(Sounds.DIE);
      if (this.score > this.highScore) {
        this.highScore = this.score;
        this.storage.set("highScore", this.highScore.toString());
      }
      return;
    }

    // Check self collision
    if (
      this.snake.some((seg) => seg.x === newHead.x && seg.y === newHead.y)
    ) {
      this.state = GameState.GAME_OVER;
      getAudio()?.play(Sounds.DIE);
      if (this.score > this.highScore) {
        this.highScore = this.score;
        this.storage.set("highScore", this.highScore.toString());
      }
      return;
    }

    // Add new head
    this.snake.unshift(newHead);

    // Check food collision
    if (this.food && newHead.x === this.food.x && newHead.y === this.food.y) {
      this.score++;
      getAudio()?.play(Sounds.COIN);
      this.spawnFood();
      // Increase speed slightly
      this.stepper.interval = Math.max(
        SnakeGame.MIN_STEP_TIME,
        this.stepper.interval - SnakeGame.STEP_SPEEDUP
      );
      // Board full: nowhere left for food
      if (!this.food) {
        this.state = GameState.GAME_OVER;
        if (this.score > this.highScore) {
          this.highScore = this.score;
          this.storage.set("highScore", this.highScore.toString());
        }
      }
    } else {
      // Remove tail (don't grow)
      this.snake.pop();
    }
  }

  render(buffer: DisplayBuffer): void {
    buffer.clear();

    // Draw border
    buffer.rect(
      this.playX - 2,
      this.playY - 2,
      this.playWidth + 4,
      this.playHeight + 4,
      [100, 100, 100]
    );

    // Draw HUD
    buffer.text("SNAKE", 10, 10, [0, 255, 255]);
    buffer.text(`Score: ${this.score}`, 90, 10, [255, 255, 0]);
    buffer.text(`High: ${this.highScore}`, 170, 10, [255, 255, 0]);

    if (this.state === GameState.SETTINGS && this.settingsDialog) {
      // Render settings dialog
      this.settingsDialog.render(buffer);
    } else if (this.state === GameState.PAUSED) {
      // Render game with pause overlay
      this.renderGame(buffer);
      buffer.centeredText("PAUSED", 80, [255, 255, 0]);
      buffer.centeredText("Press P to continue", 100, [200, 200, 200]);
      buffer.centeredText("Press S for settings", 116, [200, 200, 200]);
    } else if (this.state === GameState.GAME_OVER) {
      // Game over screen
      this.renderGame(buffer);

      // Semi-transparent overlay
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

      buffer.centeredText("GAME OVER", 70, [255, 0, 0]);
      buffer.centeredText(`Final Score: ${this.score}`, 90, [255, 255, 255]);
      if (this.score === this.highScore && this.score > 0) {
        buffer.centeredText("NEW HIGH SCORE!", 106, [0, 255, 0]);
      }
      buffer.centeredText("Press SPACE to restart", 122, [200, 200, 200]);
    } else {
      // Playing
      this.renderGame(buffer);
    }

    // Clear dirty flag
    this.dirty = false;
  }

  private renderGame(buffer: DisplayBuffer): void {
    // Draw food
    if (this.food) {
      buffer.rect(
        this.food.x,
        this.food.y,
        this.gridSize,
        this.gridSize,
        [255, 0, 0],
        true
      );
    }

    // Draw snake
    for (let i = 0; i < this.snake.length; i++) {
      const seg = this.snake[i];
      const color: [number, number, number] =
        i === 0 ? [0, 255, 0] : [0, 200, 0]; // Head is brighter
      buffer.rect(seg.x, seg.y, this.gridSize, this.gridSize, color, true);
    }
  }
}
