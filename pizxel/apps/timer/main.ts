/**
 * Timer App - Countdown Timer with Background Notifications
 *
 * Features:
 * - Set timer duration (minutes/seconds)
 * - Start/pause/reset controls
 * - Continues counting in background
 * - Notifies when timer expires
 */

import { App, InputEvent, InputKeys } from "../../types";
import { DisplayBuffer } from "../../core/display-buffer";
import { getAudio } from "../../start";
import { Sounds } from "../../audio/audio";
import { AppStorage } from "../../storage";

enum TimerState {
  IDLE = "idle",
  RUNNING = "running",
  PAUSED = "paused",
  EXPIRED = "expired",
}

enum InputMode {
  MINUTES = "minutes",
  SECONDS = "seconds",
}

export class TimerApp implements App {
  readonly name = "Timer";
  dirty = true;

  private state: TimerState = TimerState.IDLE;
  private inputMode: InputMode = InputMode.MINUTES;

  // Timer settings
  private minutes = 5;
  private seconds = 0;

  // Runtime tracking: a running timer counts down to a fixed end time, so
  // foreground frames and background ticks always agree
  private remainingMs = 0;
  private endTime = 0;
  // What's on screen, to redraw only when it changes
  private shownSeconds = -1;
  private shownBarWidth = -1;
  private shownFlash = false;

  private storage: AppStorage;

  constructor() {
    this.storage = new AppStorage("timer");
    this.loadSettings();
  }

  private loadSettings(): void {
    const saved = this.storage.get<number>("lastDuration");
    if (saved) {
      this.minutes = Math.floor(saved / 60);
      this.seconds = saved % 60;
    }
  }

  private saveSettings(): void {
    const totalSeconds = this.minutes * 60 + this.seconds;
    this.storage.set("lastDuration", totalSeconds);
  }

  onActivate(): void {
    this.dirty = true;
  }

  onDeactivate(): void {
    // Continue running in background if timer active
  }

  /** Update remainingMs from the end time; returns true if it just expired */
  private tick(): boolean {
    if (this.state !== TimerState.RUNNING) return false;
    this.remainingMs = Math.max(0, this.endTime - Date.now());
    if (this.remainingMs > 0) return false;
    this.state = TimerState.EXPIRED;
    this.onTimerExpired();
    this.dirty = true;
    return true;
  }

  onUpdate(deltaTime: number): void {
    this.tick();

    if (this.state === TimerState.RUNNING) {
      // Redraw only when the seconds or the progress bar change
      const seconds = Math.ceil(this.remainingMs / 1000);
      const barWidth = Math.floor(TimerApp.BAR_WIDTH * this.progress());
      if (seconds !== this.shownSeconds || barWidth !== this.shownBarWidth) {
        this.shownSeconds = seconds;
        this.shownBarWidth = barWidth;
        this.dirty = true;
      }
    } else if (this.state === TimerState.EXPIRED) {
      // "TIME'S UP!" flashes twice a second
      const flash = Math.floor(Date.now() / 500) % 2 === 0;
      if (flash !== this.shownFlash) {
        this.shownFlash = flash;
        this.dirty = true;
      }
    }
  }

  onBackgroundTick(): void {
    // Called ~1/second when app is in background
    if (this.tick()) {
      // Request to come to foreground to show notification
      this.request_foreground?.();
    }
  }

  private static readonly BAR_WIDTH = 200;

  private progress(): number {
    const totalMs = (this.minutes * 60 + this.seconds) * 1000;
    return totalMs > 0 ? this.remainingMs / totalMs : 0;
  }

  private onTimerExpired(): void {
    console.log("[Timer] Timer expired!");
    // Play alarm sound - repeating beeps
    getAudio()?.play(Sounds.POWERUP);
    setTimeout(() => getAudio()?.play(Sounds.POWERUP), 300);
    setTimeout(() => getAudio()?.play(Sounds.POWERUP), 600);
  }

  onEvent(event: InputEvent): boolean {
    if (this.state === TimerState.EXPIRED) {
      // Any key (except Escape, which leaves the app) resets after expiry
      if (event.key === InputKeys.HOME) return false;
      this.resetTimer();
      this.dirty = true;
      return true;
    }

    if (this.state === TimerState.IDLE) {
      return this.handleIdleInput(event);
    }

    if (this.state === TimerState.RUNNING || this.state === TimerState.PAUSED) {
      return this.handleRunningInput(event);
    }

    return false;
  }

  private handleIdleInput(event: InputEvent): boolean {
    switch (event.key) {
      case InputKeys.UP:
        if (this.inputMode === InputMode.MINUTES) {
          this.minutes = Math.min(99, this.minutes + 1);
        } else {
          this.seconds = Math.min(59, this.seconds + 5);
        }
        this.dirty = true;
        return true;

      case InputKeys.DOWN:
        if (this.inputMode === InputMode.MINUTES) {
          this.minutes = Math.max(0, this.minutes - 1);
        } else {
          this.seconds = Math.max(0, this.seconds - 5);
        }
        this.dirty = true;
        return true;

      case InputKeys.LEFT:
      case InputKeys.RIGHT:
        // Toggle between minutes and seconds
        this.inputMode =
          this.inputMode === InputMode.MINUTES
            ? InputMode.SECONDS
            : InputMode.MINUTES;
        this.dirty = true;
        return true;

      case InputKeys.OK:
      case InputKeys.ACTION:
        // Start timer
        if (this.minutes > 0 || this.seconds > 0) {
          this.startTimer();
          this.saveSettings();
        }
        return true;

      default:
        return false;
    }
  }

  private handleRunningInput(event: InputEvent): boolean {
    switch (event.key) {
      case InputKeys.OK:
      case InputKeys.ACTION:
        // Toggle pause/resume
        if (this.state === TimerState.RUNNING) {
          this.remainingMs = Math.max(0, this.endTime - Date.now());
          this.state = TimerState.PAUSED;
        } else {
          this.endTime = Date.now() + this.remainingMs;
          this.state = TimerState.RUNNING;
        }
        getAudio()?.play(Sounds.SELECT);
        this.dirty = true;
        return true;

      case InputKeys.BACK:
        // Reset timer
        this.resetTimer();
        this.dirty = true;
        return true;

      default:
        return false;
    }
  }

  private startTimer(): void {
    this.remainingMs = (this.minutes * 60 + this.seconds) * 1000;
    this.endTime = Date.now() + this.remainingMs;
    this.state = TimerState.RUNNING;
    getAudio()?.play(Sounds.COIN);
    this.dirty = true;
  }

  private resetTimer(): void {
    this.state = TimerState.IDLE;
    this.remainingMs = 0;
    this.endTime = 0;
    this.inputMode = InputMode.MINUTES;
    getAudio()?.play(Sounds.SELECT);
    this.dirty = true;
  }

  render(matrix: DisplayBuffer): void {
    matrix.clear();

    const centerX = Math.floor(matrix.getWidth() / 2);
    const centerY = Math.floor(matrix.getHeight() / 2);

    // Title
    const title = "TIMER";
    const titleWidth = title.length * 8;
    matrix.text(title, centerX - titleWidth / 2, 20, [255, 255, 255]);

    if (this.state === TimerState.IDLE) {
      this.renderSetup(matrix, centerX, centerY);
    } else if (this.state === TimerState.EXPIRED) {
      this.renderExpired(matrix, centerX, centerY);
    } else {
      this.renderRunning(matrix, centerX, centerY);
    }

    // Instructions at bottom
    this.renderInstructions(matrix);

    this.dirty = false;
  }

  private renderSetup(
    matrix: DisplayBuffer,
    centerX: number,
    centerY: number
  ): void {
    // Large time display
    const timeText = `${this.minutes.toString().padStart(2, "0")}:${this.seconds
      .toString()
      .padStart(2, "0")}`;
    const scale = 3;
    const textWidth = timeText.length * 8 * scale;
    matrix.text(
      timeText,
      centerX - textWidth / 2,
      centerY - 20,
      [0, 255, 255],
      [0, 0, 0],
      scale
    );

    // Highlight selected field
    const minWidth = 16 * scale;
    const secWidth = 16 * scale;
    const colonWidth = 8 * scale;

    if (this.inputMode === InputMode.MINUTES) {
      const minX = centerX - textWidth / 2;
      matrix.rect(
        minX - 2,
        centerY - 22,
        minWidth + 4,
        24 * scale + 4,
        [255, 255, 0],
        false
      );
    } else {
      const secX = centerX - textWidth / 2 + minWidth + colonWidth;
      matrix.rect(
        secX - 2,
        centerY - 22,
        secWidth + 4,
        24 * scale + 4,
        [255, 255, 0],
        false
      );
    }

    // Labels
    matrix.text("Minutes", centerX - 60, centerY + 40, [128, 128, 128]);
    matrix.text("Seconds", centerX + 10, centerY + 40, [128, 128, 128]);
  }

  private renderRunning(
    matrix: DisplayBuffer,
    centerX: number,
    centerY: number
  ): void {
    const remainingSeconds = Math.ceil(this.remainingMs / 1000);
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;

    // Large countdown display
    const timeText = `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
    const scale = 3;
    const textWidth = timeText.length * 8 * scale;

    const color: [number, number, number] =
      this.state === TimerState.PAUSED
        ? [255, 165, 0] // Orange when paused
        : [0, 255, 0]; // Green when running

    matrix.text(
      timeText,
      centerX - textWidth / 2,
      centerY - 20,
      color,
      [0, 0, 0],
      scale
    );

    // Status indicator
    const status = this.state === TimerState.PAUSED ? "PAUSED" : "RUNNING";
    const statusWidth = status.length * 8;
    const statusColor: [number, number, number] =
      this.state === TimerState.PAUSED ? [255, 165, 0] : [0, 255, 0];
    matrix.text(status, centerX - statusWidth / 2, centerY + 40, statusColor);

    // Progress bar
    const progress = this.progress();
    const barWidth = TimerApp.BAR_WIDTH;
    const barHeight = 8;
    const barX = centerX - barWidth / 2;
    const barY = centerY + 60;

    // Background
    matrix.rect(barX, barY, barWidth, barHeight, [64, 64, 64], true);
    // Progress
    const fillWidth = Math.floor(barWidth * progress);
    if (fillWidth > 0) {
      matrix.rect(barX, barY, fillWidth, barHeight, [0, 255, 0], true);
    }
  }

  private renderExpired(
    matrix: DisplayBuffer,
    centerX: number,
    centerY: number
  ): void {
    // Flashing "TIME'S UP!" message
    const flash = Math.floor(Date.now() / 500) % 2 === 0;

    if (flash) {
      const message = "TIME'S UP!";
      const scale = 2;
      const textWidth = message.length * 8 * scale;
      matrix.text(
        message,
        centerX - textWidth / 2,
        centerY - 16,
        [255, 0, 0],
        [0, 0, 0],
        scale
      );
    }

    // Draw alarm bell icon
    const bellSize = 40;
    const bellX = centerX - bellSize / 2;
    const bellY = centerY + 20;

    // Simple bell shape
    matrix.circle(centerX, bellY + 10, 20, [255, 255, 0], false);
    matrix.rect(centerX - 4, bellY + 26, 8, 6, [255, 255, 0], true);
  }

  private renderInstructions(matrix: DisplayBuffer): void {
    const y = matrix.getHeight() - 30;
    const color: [number, number, number] = [128, 128, 128];

    // Two short lines each, so they fit the screen
    if (this.state === TimerState.IDLE) {
      matrix.centeredText("↑↓ Adjust  ←→ Switch", y, color);
      matrix.centeredText("Enter Start", y + 12, color);
    } else if (
      this.state === TimerState.RUNNING ||
      this.state === TimerState.PAUSED
    ) {
      matrix.centeredText("Space Pause/Resume", y, color);
      matrix.centeredText("Backspace Reset", y + 12, color);
    } else if (this.state === TimerState.EXPIRED) {
      matrix.centeredText("Press any key to reset", y, color);
    }
  }

  // Framework will set this if app supports foreground requests
  request_foreground?: () => void;
}

// Entry point for PiZXel
export function run(osContext: any): void {
  const app = new TimerApp();
  osContext.registerApp(app.name, app.constructor.name, [255, 165, 0], app);
  osContext.switchToApp(app);
  osContext.run();
}
