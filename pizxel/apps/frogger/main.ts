/**
 * Frogger - Classic Road Crossing Game
 *
 * Uses PiZXel Game SDK for sprites, collision, and state management.
 */

import { App, InputEvent, InputKeys } from "../../types";
import { DisplayBuffer } from "../../core/display-buffer";
import {
  Sprite,
  spriteSprite,
  ScoreManager,
  LivesManager,
  PauseManager,
  LevelManager,
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

export class FroggerApp implements App {
  readonly name = "Frogger";
  dirty = true;

  private state: GameState = GameState.PLAYING;
  private frog: Sprite;
  private cars: Sprite[] = [];
  private logs: Sprite[] = [];
  private score: ScoreManager;
  private lives: LivesManager;
  private pause: PauseManager;
  private level: LevelManager;

  private readonly width = 256;
  private readonly height = 192;
  private readonly lanes = 8;
  private readonly laneHeight = 16;
  private readonly startY = 40;
  private respawnTimer = 0;
  private bestY = 168; // Furthest-up row reached this life (for scoring)
  private crossings = 0;
  private hopRepeat = new KeyRepeat(0.3, 0.18);

  constructor() {
    // Create frog (12x12)
    this.frog = new Sprite({ x: 122, y: 168, width: 12, height: 12, color: [50, 255, 50] });

    // Initialize managers
    this.score = new ScoreManager("frogger");
    this.lives = new LivesManager(3, 3);
    this.pause = new PauseManager();
    this.level = new LevelManager((level: number) => {
      this.setupLevel(level);
    });

    this.setupLevel(1);
  }

  private setupLevel(level: number): void {
    this.cars = [];
    this.logs = [];

    const speedMultiplier = 1 + (level - 1) * 0.2;

    // Road lanes (alternating directions)
    for (let lane = 0; lane < 4; lane++) {
      const y = this.startY + this.laneHeight * lane;
      const direction = lane % 2 === 0 ? 1 : -1;
      const speed = (40 + lane * 10) * direction * speedMultiplier;
      const count = 2 + Math.floor(lane / 2);

      for (let i = 0; i < count; i++) {
        const x = (this.width / count) * i;
        const car = new Sprite({ x: x, y: y, width: 24, height: 12, color: this.getCarColor(lane) });
        car.vx = speed;
        car.addTag("car");
        this.cars.push(car);
      }
    }

    // River lanes (logs floating)
    for (let lane = 4; lane < 8; lane++) {
      const y = this.startY + this.laneHeight * lane;
      const direction = lane % 2 === 0 ? -1 : 1;
      const speed = (30 + (lane - 4) * 8) * direction * speedMultiplier;
      const count = 2;

      for (let i = 0; i < count; i++) {
        const x = (this.width / count) * i;
        const log = new Sprite({ x: x, y: y, width: 40, height: 12, color: [139, 69, 19] });
        log.vx = speed;
        log.addTag("log");
        this.logs.push(log);
      }
    }
  }

  private getCarColor(lane: number): [number, number, number] {
    const colors: Array<[number, number, number]> = [
      [255, 0, 0],
      [255, 255, 0],
      [0, 0, 255],
      [255, 0, 255],
    ];
    return colors[lane % colors.length];
  }

  private resetFrog(): void {
    this.frog.x = 122;
    this.frog.y = 168;
    this.bestY = this.frog.y;
    this.respawnTimer = 0;
  }

  private checkWin(): void {
    if (this.frog.y < this.startY) {
      // Reached top!
      this.score.addScore(100 * this.level.getLevel());
      this.resetFrog();
      getAudio()?.play(Sounds.COIN);

      // Level up every 3 successful crossings
      this.crossings++;
      if (this.crossings % 3 === 0) {
        this.level.nextLevel();
      }
    }
  }

  async onActivate(): Promise<void> {
    // Coming back to a game in progress: start paused (not on first open)
    if (this.activatedBefore && this.state === GameState.PLAYING && !this.pause.isPaused()) {
      this.pause.pause();
    }
    this.activatedBefore = true;
    this.dirty = true;
  }

  private activatedBefore = false;

  onDeactivate(): void {}

  /** Move cars and logs; returns whether the frog is riding a log */
  private moveTraffic(deltaTime: number, carryFrog: boolean): boolean {
    for (const car of this.cars) {
      car.update(deltaTime);

      // Wrap around screen
      if (car.vx > 0 && car.x > this.width) {
        car.x = -car.width;
      } else if (car.vx < 0 && car.x < -car.width) {
        car.x = this.width;
      }
    }

    let onLog = false;
    for (const log of this.logs) {
      log.update(deltaTime);

      // Wrap around screen
      if (log.vx > 0 && log.x > this.width) {
        log.x = -log.width;
      } else if (log.vx < 0 && log.x < -log.width) {
        log.x = this.width;
      }

      // Frog rides on log
      if (carryFrog && !onLog && spriteSprite(this.frog, log)) {
        onLog = true;
        this.frog.x += log.vx * deltaTime;
      }
    }
    return onLog;
  }

  /** Lose a life (only once per death, whatever caused it) */
  private die(sound: string): void {
    this.lives.loseLife();
    this.respawnTimer = 1.0;
    getAudio()?.play(sound);

    if (this.lives.isGameOver()) {
      this.state = GameState.GAME_OVER;
      this.score.saveHighScore();
    }
  }

  onUpdate(deltaTime: number): void {
    if (this.state !== GameState.PLAYING || this.pause.isPaused()) {
      return;
    }
    this.dirty = true;

    // Waiting to respawn: the world keeps moving
    if (this.respawnTimer > 0) {
      this.moveTraffic(deltaTime, false);
      this.respawnTimer -= deltaTime;
      if (this.respawnTimer <= 0) {
        this.resetFrog();
      }
      return;
    }

    // A held key keeps hopping, at a steady pace
    const direction = this.heldDirection();
    for (let n = this.hopRepeat.update(direction !== null, deltaTime); n > 0; n--) {
      if (direction) this.hop(direction);
    }

    const onLog = this.moveTraffic(deltaTime, true);

    // Hit by a car
    if (this.cars.some((car) => spriteSprite(this.frog, car))) {
      this.die(Sounds.DIE);
      return;
    }

    // In the water without a log
    const frogLane = Math.floor((this.frog.y - this.startY) / this.laneHeight);
    if (frogLane >= 4 && frogLane < 8 && !onLog) {
      this.die(Sounds.DIE);
      return;
    }

    // Carried off screen
    if (this.frog.x < 0 || this.frog.x + this.frog.width > this.width) {
      this.die(Sounds.ERROR);
      return;
    }

    this.checkWin();
  }

  private heldDirection(): "up" | "down" | "left" | "right" | null {
    if (anyKeyDown(InputKeys.UP, "w")) return "up";
    if (anyKeyDown(InputKeys.DOWN, "s")) return "down";
    if (anyKeyDown(InputKeys.LEFT, "a")) return "left";
    if (anyKeyDown(InputKeys.RIGHT, "d")) return "right";
    return null;
  }

  private static directionOf(key: string): "up" | "down" | "left" | "right" | null {
    switch (key) {
      case InputKeys.UP: case "w": case "W": return "up";
      case InputKeys.DOWN: case "s": case "S": return "down";
      case InputKeys.LEFT: case "a": case "A": return "left";
      case InputKeys.RIGHT: case "d": case "D": return "right";
      default: return null;
    }
  }

  /** One hop; scores only for reaching a new furthest-up row */
  private hop(direction: "up" | "down" | "left" | "right"): void {
    switch (direction) {
      case "up":
        if (this.frog.y <= this.startY) return;
        this.frog.y = Math.max(this.startY - this.laneHeight, this.frog.y - this.laneHeight);
        break;
      case "down":
        if (this.frog.y >= 168) return;
        this.frog.y = Math.min(168, this.frog.y + this.laneHeight);
        break;
      case "left":
        this.frog.x = Math.max(0, this.frog.x - this.laneHeight);
        break;
      case "right":
        this.frog.x = Math.min(this.width - this.frog.width, this.frog.x + this.laneHeight);
        break;
    }

    if (this.frog.y < this.bestY) {
      this.bestY = this.frog.y;
      this.score.addScore(10);
    }
    getAudio()?.play(Sounds.JUMP);
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
      this.lives.reset();
      this.score.reset();
      this.level.reset();
      this.crossings = 0;
      this.pause.resume();
      this.setupLevel(1);
      this.resetFrog();
      this.state = GameState.PLAYING;
      this.dirty = true;
      return true;
    }

    if (
      this.state !== GameState.PLAYING ||
      this.pause.isPaused() ||
      this.respawnTimer > 0
    ) {
      return false;
    }

    // Frog movement: one hop per press; holding hops steadily (onUpdate),
    // so the browser's own fast key repeat is ignored
    const direction = FroggerApp.directionOf(event.key);
    if (direction) {
      if (!event.repeat) {
        this.hop(direction);
        this.hopRepeat.reset();
      }
      return true;
    }

    return false;
  }

  render(matrix: DisplayBuffer): void {
    matrix.clear();

    // Draw top bar
    matrix.rect(0, 0, this.width, this.startY, [20, 20, 40], true);
    matrix.text(`Score: ${this.score.getScore()}`, 10, 8, [255, 255, 255]);
    matrix.text(`High: ${this.score.getHighScore()}`, 10, 20, [255, 255, 0]);
    this.lives.render(matrix, this.width - 104, 12, [255, 0, 0]);
    matrix.text(
      `L${this.level.getLevel()}`,
      this.width - 30,
      20,
      [0, 255, 255]
    );

    // Draw road (lanes 0-3)
    for (let lane = 0; lane < 4; lane++) {
      const y = this.startY + this.laneHeight * lane;
      matrix.rect(0, y, this.width, this.laneHeight, [60, 60, 60], true);

      // Lane dividers
      for (let x = 0; x < this.width; x += 20) {
        matrix.rect(
          x,
          y + this.laneHeight / 2 - 1,
          10,
          2,
          [255, 255, 255],
          true
        );
      }
    }

    // Draw river (lanes 4-7)
    for (let lane = 4; lane < 8; lane++) {
      const y = this.startY + this.laneHeight * lane;
      matrix.rect(0, y, this.width, this.laneHeight, [0, 100, 255], true);
    }

    // Draw safe zone at top
    const safeY = this.startY - this.laneHeight;
    matrix.rect(0, safeY, this.width, this.laneHeight, [50, 200, 50], true);
    matrix.text("SAFE", 112, safeY + 4, [255, 255, 255]);

    // Draw bottom safe zone
    matrix.rect(0, 168, this.width, 24, [50, 200, 50], true);

    // Draw cars
    for (const car of this.cars) {
      car.render(matrix);
    }

    // Draw logs
    for (const log of this.logs) {
      log.render(matrix);
    }

    // Draw frog (blink if respawning)
    if (
      this.respawnTimer <= 0 ||
      Math.floor(this.respawnTimer * 10) % 2 === 0
    ) {
      this.frog.render(matrix);
    }

    // Game over overlay
    if (this.state === GameState.GAME_OVER) {
      matrix.dim(40, 60, 216 - 40, 140 - 60, 0.3);

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
