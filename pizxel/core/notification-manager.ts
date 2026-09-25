/**
 * Notification Manager
 *
 * Manages app notifications and foreground requests.
 * Apps can request to be brought to foreground when events occur
 * (e.g., Timer alarm, incoming message).
 */

import { App } from "../types";
import { DisplayBuffer } from "../core/display-buffer";
import { getAudio } from "../core/instance-context";
import { Sounds } from "../audio/audio";

export interface Notification {
  appName: string;
  message: string;
  priority: "low" | "normal" | "urgent";
  timestamp: number;
  app: App;
}

export class NotificationManager {
  private pendingNotifications: Notification[] = [];
  private currentNotification: Notification | null = null;
  private displayDuration: number = 3000; // 3 seconds
  private notificationStartTime: number = 0;

  constructor() {
    // Audio accessed via getAudio() global
  }

  /**
   * App requests to be brought to foreground
   */
  requestForeground(
    app: App,
    message: string,
    priority: "low" | "normal" | "urgent" = "normal"
  ): void {
    const notification: Notification = {
      appName: app.name,
      message,
      priority,
      timestamp: Date.now(),
      app,
    };

    // Urgent notifications go to front of queue
    if (priority === "urgent") {
      this.pendingNotifications.unshift(notification);
      // Play urgent sound
      const audio = getAudio();
      if (audio) {
        audio.play(Sounds.POWERUP);
      }
    } else {
      this.pendingNotifications.push(notification);
    }

    // If no notification is currently showing, show this one
    if (!this.currentNotification) {
      this.showNext();
    }
  }

  /**
   * Show next notification in queue
   */
  private showNext(): void {
    if (this.pendingNotifications.length === 0) {
      this.currentNotification = null;
      return;
    }

    this.currentNotification = this.pendingNotifications.shift()!;
    this.notificationStartTime = Date.now();

    console.log(
      `[Notification] ${this.currentNotification.appName}: ${this.currentNotification.message}`
    );
  }

  /**
   * Update notification display (called by framework)
   */
  update(): void {
    if (!this.currentNotification) {
      return;
    }

    // Auto-dismiss after display duration
    const elapsed = Date.now() - this.notificationStartTime;
    if (elapsed >= this.displayDuration) {
      this.dismiss();
    }
  }

  /**
   * Dismiss current notification
   */
  dismiss(): void {
    this.currentNotification = null;
    this.showNext();
  }

  /**
   * Get current notification (to render)
   */
  getCurrent(): Notification | null {
    return this.currentNotification;
  }

  /**
   * Get app that requested foreground
   */
  getRequestingApp(): App | null {
    return this.currentNotification?.app || null;
  }

  /**
   * Render notification overlay
   */
  renderOverlay(matrix: DisplayBuffer): void {
    if (!this.currentNotification) {
      return;
    }

    const notification = this.currentNotification;
    const width = matrix.getWidth();
    const height = matrix.getHeight();

    // Semi-transparent dark background (just draw opaque for now)
    const bgColor: [number, number, number] =
      notification.priority === "urgent" ? [100, 0, 0] : [0, 60, 100];
    matrix.rect(20, 60, width - 40, 72, bgColor, true);

    // Border color based on priority
    const borderColor: [number, number, number] =
      notification.priority === "urgent"
        ? [255, 0, 0]
        : notification.priority === "normal"
        ? [0, 180, 255]
        : [150, 150, 150];
    matrix.rect(20, 60, width - 40, 72, borderColor, false);

    // App name (top)
    matrix.text(notification.appName.toUpperCase(), 30, 70, [255, 255, 255]);

    // Message (center, wrap if needed)
    const maxChars = Math.floor((width - 60) / 8);
    const lines = this.wrapText(notification.message, maxChars);
    let y = 90;
    for (const line of lines.slice(0, 3)) {
      // Max 3 lines
      matrix.text(line, 30, y, [255, 255, 255]);
      y += 12;
    }

    // Hint at bottom
    matrix.text("ENTER: Open", 30, 118, [200, 200, 200]);
  }

  /**
   * Wrap text to fit width
   */
  private wrapText(text: string, maxChars: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      if ((currentLine + word).length <= maxChars) {
        currentLine += (currentLine ? " " : "") + word;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Check if there are pending notifications
   */
  hasPending(): boolean {
    return (
      this.pendingNotifications.length > 0 || this.currentNotification !== null
    );
  }

  /**
   * Clear all notifications
   */
  clearAll(): void {
    this.pendingNotifications = [];
    this.currentNotification = null;
  }
}
