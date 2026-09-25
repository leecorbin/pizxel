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
  private nextDirection: Point = { x: 1, y: 0 };
  private score: number = 0;
  private highScore: number = 0;
  private state: GameState = GameState.PLAYING;
  private updateTimer: number = 0;
  private baseSpeed: number = 8; // Base frames between updates
  private updateSpeed: number = 8; // Current speed
  private gridSize: number = 6;
  private playX: number = 8;
  private playY: number = 24;
  private playWidth: number = 240;
  private playHeight: number = 160;

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
        this.baseSpeed = 10;
        break;
      case "Normal":
        this.baseSpeed = 8;
        break;
      case "Hard":
        this.baseSpeed = 5;
        break;
    }
    this.updateSpeed = this.baseSpeed;
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
        const newDifficulty = values.difficulty || "Normal";
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
    this.restart();
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
    this.nextDirection = { x: 1, y: 0 };
    this.score = 0;
    this.state = GameState.PLAYING;
    this.updateTimer = 0;
    this.updateSpeed = this.baseSpeed;
    this.spawnFood();
    this.dirty = true;
  }

  private spawnFood(): void {
    // Find empty spot
    while (true) {
      const x =
        Math.floor(Math.random() * (this.playWidth / this.gridSize)) *
          this.gridSize +
        this.playX;
      const y =
        Math.floor(Math.random() * (this.playHeight / this.gridSize)) *
          this.gridSize +
        this.playY;

      // Check if position is occupied by snake
      const occupied = this.snake.some((seg) => seg.x === x && seg.y === y);
      if (!occupied) {
        this.food = { x, y };
        break;
      }
    }
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

    // Direction changes (prevent 180-degree turns)
    if (event.key === InputKeys.UP && this.direction.y === 0) {
      this.nextDirection = { x: 0, y: -1 };
      this.dirty = true;
      return true;
    } else if (event.key === InputKeys.DOWN && this.direction.y === 0) {
      this.nextDirection = { x: 0, y: 1 };
      this.dirty = true;
      return true;
    } else if (event.key === InputKeys.LEFT && this.direction.x === 0) {
      this.nextDirection = { x: -1, y: 0 };
      this.dirty = true;
      return true;
    } else if (event.key === InputKeys.RIGHT && this.direction.x === 0) {
      this.nextDirection = { x: 1, y: 0 };
      this.dirty = true;
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

    this.updateTimer++;
    this.dirty = true; // Always dirty for animation

    if (this.updateTimer >= this.updateSpeed) {
      this.updateTimer = 0;

      // Update direction
      this.direction = this.nextDirection;

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
        if (this.updateSpeed > 3) {
          this.updateSpeed = Math.max(3, this.updateSpeed - 0.5);
        }
      } else {
        // Remove tail (don't grow)
        this.snake.pop();
      }
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
