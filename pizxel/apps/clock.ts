/**
 * Clock App - Analog and Digital Display
 *
 * Shows current time with ZX Spectrum aesthetics.
 */

import { App, InputEvent, InputKeys } from "../types/index";
import { DisplayBuffer } from "../core/display-buffer";
import { HelpModal } from "../ui";

export class ClockApp implements App {
  readonly name = "Clock";

  private mode: "analog" | "digital" = "analog";

  // Help modal
  private helpModal = HelpModal.create([
    { key: "Space", action: "Toggle analog/digital" },
    { key: "Tab", action: "Show help" },
    { key: "ESC", action: "Return to launcher" },
  ]);

  // Clock center and radius for analog mode
  private readonly centerX = 128;
  private readonly centerY = 96;
  private readonly clockRadius = 70;

  // ZX Spectrum colors
  private readonly bgColor: [number, number, number] = [0, 0, 32]; // Dark blue
  private readonly faceColor: [number, number, number] = [0, 255, 255]; // Cyan
  private readonly hourColor: [number, number, number] = [255, 255, 255]; // White
  private readonly minuteColor: [number, number, number] = [255, 255, 0]; // Yellow
  private readonly secondColor: [number, number, number] = [255, 0, 0]; // Red (bright)
  private readonly textColor: [number, number, number] = [255, 255, 255];

  dirty: boolean = true;
  private lastSecond: number = -1;

  onActivate(): void {
    this.dirty = true;
  }

  onDeactivate(): void {
    // Nothing to clean up
  }

  onUpdate(deltaTime: number): void {
    // Update every second
    const now = new Date();
    const currentSecond = now.getSeconds();

    if (currentSecond !== this.lastSecond) {
      this.lastSecond = currentSecond;
      this.dirty = true;
    }
  }

  onEvent(event: InputEvent): boolean {
    if (event.type !== "keydown") {
      return false;
    }

    // Check for help key FIRST (before app logic)
    if (event.key === InputKeys.HELP || event.key === "Tab") {
      this.helpModal.toggle();
      this.dirty = true;
      return true;
    }

    // Modal intercepts events when visible
    if (this.helpModal.visible && this.helpModal.handleEvent(event)) {
      this.dirty = true;
      return true;
    }

    // Toggle between analog and digital mode with space bar
    if (event.key === " " || event.key === InputKeys.ACTION) {
      this.mode = this.mode === "analog" ? "digital" : "analog";
      this.dirty = true;
      return true;
    }

    return false;
  }

  render(matrix: DisplayBuffer): void {
    // Fill background
    matrix.fill(this.bgColor);

    if (this.mode === "analog") {
      this.renderAnalog(matrix);
    } else {
      this.renderDigital(matrix);
    }

    // Draw title
    matrix.text("CLOCK", 4, 4, this.textColor);

    // Render help modal on top if visible
    this.helpModal.render(matrix);

    this.dirty = false;
  }

  private renderAnalog(matrix: DisplayBuffer): void {
    const now = new Date();
    const hours = now.getHours() % 12;
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    // Draw clock face circle
    matrix.circle(
      this.centerX,
      this.centerY,
      this.clockRadius,
      this.faceColor,
      false
    );
    matrix.circle(
      this.centerX,
      this.centerY,
      this.clockRadius - 1,
      this.faceColor,
      false
    );

    // Draw hour markers (12, 3, 6, 9)
    for (let i = 0; i < 12; i++) {
      const angle = (i * 30 - 90) * (Math.PI / 180);
      const isMainMark = i % 3 === 0;
      const markLength = isMainMark ? 10 : 5;

      const x1 = this.centerX + Math.cos(angle) * (this.clockRadius - 3);
      const y1 = this.centerY + Math.sin(angle) * (this.clockRadius - 3);
      const x2 =
        this.centerX + Math.cos(angle) * (this.clockRadius - markLength - 3);
      const y2 =
        this.centerY + Math.sin(angle) * (this.clockRadius - markLength - 3);

      matrix.line(
        Math.floor(x1),
        Math.floor(y1),
        Math.floor(x2),
        Math.floor(y2),
        isMainMark ? this.faceColor : [64, 128, 128]
      );
    }

    // Draw center dot
    matrix.circle(this.centerX, this.centerY, 3, this.faceColor, true);

    // Draw hour hand
    const hourAngle = ((hours + minutes / 60) * 30 - 90) * (Math.PI / 180);
    const hourLength = this.clockRadius * 0.5;
    this.drawHand(matrix, hourAngle, hourLength, this.hourColor, 2);

    // Draw minute hand
    const minuteAngle = ((minutes + seconds / 60) * 6 - 90) * (Math.PI / 180);
    const minuteLength = this.clockRadius * 0.7;
    this.drawHand(matrix, minuteAngle, minuteLength, this.minuteColor, 1);

    // Draw second hand
    const secondAngle = (seconds * 6 - 90) * (Math.PI / 180);
    const secondLength = this.clockRadius * 0.8;
    this.drawHand(matrix, secondAngle, secondLength, this.secondColor, 1);

    // Draw digital time below analog clock
    const timeStr = this.formatTime(now);
    const timeX = this.centerX - (timeStr.length * 8) / 2;
    matrix.text(
      timeStr,
      Math.floor(timeX),
      this.centerY + this.clockRadius + 15,
      this.textColor
    );
  }

  private renderDigital(matrix: DisplayBuffer): void {
    const now = new Date();

    // Draw large digital time (centered)
    const timeStr = this.formatTime(now);

    // Draw each character larger (2x scale)
    const scale = 3;
    const totalWidth = timeStr.length * 8 * scale;
    const startX = Math.floor((256 - totalWidth) / 2);
    const startY = 60;

    matrix.text(timeStr, startX, startY, this.textColor, undefined, scale);

    // Draw date below
    const dateStr = this.formatDate(now);
    const dateX = Math.floor((256 - dateStr.length * 8) / 2);
    matrix.text(dateStr, dateX, startY + 40, this.minuteColor);

    // Draw day of week
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const dayStr = days[now.getDay()];
    const dayX = Math.floor((256 - dayStr.length * 8) / 2);
    matrix.text(dayStr, dayX, startY + 55, this.faceColor);

    // Draw decorative border
    const borderMargin = 20;
    matrix.rect(
      borderMargin,
      startY - 15,
      256 - borderMargin * 2,
      90,
      this.faceColor,
      false
    );
  }

  private drawHand(
    matrix: DisplayBuffer,
    angle: number,
    length: number,
    color: [number, number, number],
    thickness: number
  ): void {
    const endX = this.centerX + Math.cos(angle) * length;
    const endY = this.centerY + Math.sin(angle) * length;

    // Draw line with thickness
    for (let i = -thickness; i <= thickness; i++) {
      for (let j = -thickness; j <= thickness; j++) {
        if (i * i + j * j <= thickness * thickness) {
          matrix.line(
            this.centerX + i,
            this.centerY + j,
            Math.floor(endX) + i,
            Math.floor(endY) + j,
            color
          );
        }
      }
    }
  }

  private formatTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}
