/**
 * Framebuffer Display Driver
 *
 * Direct framebuffer display for Raspberry Pi touchscreen.
 * Highest priority - preferred for production hardware.
 *
 * Hardware specs:
 * - 7" Raspberry Pi touchscreen: 800x480 @ 16-bit RGB565
 * - PiZXel native: 256x192 (4:3 aspect ratio, ZX Spectrum resolution)
 * - Scaling: 2x integer scale = 512x384, centered on screen
 * - Offset: x=144, y=48 to center display
 *
 * Memory layout: /dev/fb0 with mmap() for direct pixel writing
 */

import { DisplayDriver } from "../base/device-driver";
import { RGB } from "../../types";
import * as fs from "fs";

export class FramebufferDisplayDriver extends DisplayDriver {
  readonly priority = 90; // Highest priority - preferred for hardware
  readonly name = "Framebuffer Display";

  private fbPath: string = "/dev/fb0";
  private fbFd: number | null = null;
  private fbWidth: number = 800;
  private fbHeight: number = 480;
  private bitsPerPixel: number = 16;
  private scale: number = 2; // 2x integer scaling for crisp pixels
  private offsetX: number = 0; // Horizontal centering offset
  private offsetY: number = 0; // Vertical centering offset
  private fbBuffer: Buffer | null = null;
  private brightnessMultiplier: number = 1.0; // 0.0 to 1.0 (software brightness)
  private backlightPath: string = "/sys/class/backlight/10-0045/brightness";
  private backlightPowerPath: string = "/sys/class/backlight/10-0045/bl_power";
  private maxBacklight: number = 255;
  private minBacklight: number = 10; // Minimum visible brightness (below this is too dark)
  private hasHardwareBacklight: boolean = false;

  constructor() {
    super(256, 192);
  }

  /**
   * Set display brightness (0-100)
   * 0% = backlight off (brightness = 0)
   * 1-100% = linear scale from minimum visible to maximum brightness
   * Uses hardware backlight if available, otherwise software dimming
   */
  setBrightness(percent: number): void {
    const clampedPercent = Math.max(0, Math.min(100, percent));
    
    if (this.hasHardwareBacklight) {
      try {
        if (clampedPercent === 0) {
          // Turn off backlight completely at 0%
          fs.writeFileSync(this.backlightPath, "0");
        } else {
          // Linear scale from minBacklight to maxBacklight (1-100%)
          const range = this.maxBacklight - this.minBacklight;
          const brightnessValue = this.minBacklight + Math.round((clampedPercent / 100) * range);
          fs.writeFileSync(this.backlightPath, brightnessValue.toString());
        }
        
        // Keep software multiplier at 1.0 when using hardware control
        this.brightnessMultiplier = 1.0;
      } catch (error) {
        console.warn("Failed to set hardware brightness, falling back to software:", error);
        // Fall back to software dimming
        this.brightnessMultiplier = clampedPercent / 100;
      }
    } else {
      // Software brightness (multiply RGB values)
      this.brightnessMultiplier = clampedPercent / 100;
    }
  }

  /**
   * Get current brightness (0-100)
   */
  getBrightness(): number {
    return Math.round(this.brightnessMultiplier * 100);
  }

  async initialize(): Promise<void> {
    // Read framebuffer configuration from sysfs
    await this.readFramebufferInfo();

    // Calculate optimal integer scaling and centering
    this.calculateScaling();

    // Check for hardware backlight support
    try {
      const maxBrightnessStr = fs.readFileSync(
        "/sys/class/backlight/10-0045/max_brightness",
        "utf-8"
      ).trim();
      this.maxBacklight = parseInt(maxBrightnessStr, 10);
      this.hasHardwareBacklight = true;
    } catch (error) {
      this.hasHardwareBacklight = false;
    }

    // Open framebuffer device
    this.fbFd = fs.openSync(this.fbPath, "r+");

    // Memory-map the framebuffer for direct pixel access
    // For 16-bit RGB565: 2 bytes per pixel
    const fbSize = this.fbWidth * this.fbHeight * (this.bitsPerPixel / 8);
    this.fbBuffer = Buffer.alloc(fbSize);

    // Fill with black initially
    this.fbBuffer.fill(0);
    fs.writeSync(this.fbFd, this.fbBuffer, 0, fbSize, 0);

    // Hide cursor using multiple methods
    process.stdout.write("\x1b[?25l"); // ANSI hide cursor
    process.stdout.write("\x1b[2J");   // Clear screen
    process.stdout.write("\x1b[9999;9999H"); // Move cursor off-screen (far right/bottom)
    
    // Try setterm to hide cursor permanently (more reliable than ANSI)
    try {
      const { execSync } = require("child_process");
      execSync("setterm -cursor off", { stdio: "ignore" });
    } catch (error) {
      // Ignore if setterm fails
    }
    
    // Try to disable console output (redirect to null TTY)
    try {
      // Disable console cursor blinking
      fs.writeFileSync("/sys/class/graphics/fbcon/cursor_blink", "0");
    } catch (error) {
      // Ignore if we can't write
    }

    console.log(`Framebuffer Display initialized`);
    console.log(
      `📺 Hardware: ${this.fbWidth}×${this.fbHeight} @ ${this.bitsPerPixel}bpp`
    );
    console.log(
      `   PiZXel: ${this.width}×${this.height} → ${this.width * this.scale}×${this.height * this.scale} (${this.scale}x scale)`
    );
    console.log(
      `   Centered at offset: (${this.offsetX}, ${this.offsetY})`
    );
    console.log(
      `   Backlight: ${this.hasHardwareBacklight ? "Hardware (0-" + this.maxBacklight + ")" : "Software only"}\n`
    );
  }

  async shutdown(): Promise<void> {
    // Turn off backlight completely (brightness = 0)
    if (this.hasHardwareBacklight) {
      try {
        fs.writeFileSync(this.backlightPath, "0");
      } catch (error) {
        // Ignore if we can't control backlight
      }
    }

    // Clear screen to black first (before closing fd)
    if (this.fbFd !== null && this.fbBuffer) {
      this.fbBuffer.fill(0);
      fs.writeSync(
        this.fbFd,
        this.fbBuffer,
        0,
        this.fbBuffer.length,
        0
      );
      
      // Force sync to disk
      fs.fsyncSync(this.fbFd);
    }

    // Close framebuffer device
    if (this.fbFd !== null) {
      fs.closeSync(this.fbFd);
      this.fbFd = null;
      this.fbBuffer = null;
    }

    // Clear framebuffer directly via dd (most reliable)
    try {
      const { execSync } = require("child_process");
      execSync("dd if=/dev/zero of=/dev/fb0 bs=768000 count=1 2>/dev/null", { 
        stdio: "ignore",
        timeout: 1000 
      });
    } catch (error) {
      // Ignore if dd fails
    }

    // Restore console: clear screen, show cursor, reset terminal
    process.stdout.write("\x1bc");     // Full terminal reset (clears screen)
    process.stdout.write("\x1b[2J");   // Clear screen again
    process.stdout.write("\x1b[H");    // Home cursor
    process.stdout.write("\x1b[?25h"); // Show cursor
    
    // Additional console clearing
    try {
      const { execSync } = require("child_process");
      execSync("clear", { stdio: "inherit" });
      execSync("setterm -cursor on", { stdio: "ignore" });
      // Blank the screen using setterm
      execSync("setterm -blank force", { stdio: "ignore" });
    } catch (error) {
      // Ignore if commands fail
    }

    // Small delay to ensure framebuffer stays clear
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Check if framebuffer device exists and is readable
      await fs.promises.access(this.fbPath, fs.constants.R_OK | fs.constants.W_OK);

      // Verify framebuffer is actually connected to a display
      const statePath = "/sys/class/graphics/fb0/device/status";
      if (fs.existsSync(statePath)) {
        const status = fs.readFileSync(statePath, "utf-8").trim();
        return status === "connected";
      }

      // If status file doesn't exist, assume available if device exists
      return true;
    } catch (error) {
      return false;
    }
  }

  show(): void {
    if (!this.fbFd || !this.fbBuffer) {
      console.error("[FramebufferDisplayDriver] show() called but not initialized");
      return;
    }

    // Render the 256x192 buffer to the framebuffer with 2x scaling
    // Using integer scaling for crisp pixel-perfect rendering

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const [r, g, b] = this.buffer[y][x];

        // Apply brightness multiplier
        const adjustedR = Math.floor(r * this.brightnessMultiplier);
        const adjustedG = Math.floor(g * this.brightnessMultiplier);
        const adjustedB = Math.floor(b * this.brightnessMultiplier);

        // Convert RGB888 to RGB565 (16-bit)
        // RGB565 format: RRRRRGGGGGGBBBBB
        const rgb565 = this.rgbToRgb565(adjustedR, adjustedG, adjustedB);

        // Draw 2x2 block for integer scaling
        for (let dy = 0; dy < this.scale; dy++) {
          for (let dx = 0; dx < this.scale; dx++) {
            const fbX = this.offsetX + x * this.scale + dx;
            const fbY = this.offsetY + y * this.scale + dy;

            // Bounds check
            if (fbX >= 0 && fbX < this.fbWidth && fbY >= 0 && fbY < this.fbHeight) {
              const offset = (fbY * this.fbWidth + fbX) * 2; // 2 bytes per pixel

              // Write RGB565 as little-endian (LSB first)
              this.fbBuffer[offset] = rgb565 & 0xff;
              this.fbBuffer[offset + 1] = (rgb565 >> 8) & 0xff;
            }
          }
        }
      }
    }

    // Write buffer to framebuffer device
    fs.writeSync(this.fbFd, this.fbBuffer, 0, this.fbBuffer.length, 0);
  }

  /**
   * Read framebuffer configuration from sysfs
   */
  private async readFramebufferInfo(): Promise<void> {
    try {
      // Read virtual resolution (actual framebuffer size)
      const sizeStr = fs.readFileSync(
        "/sys/class/graphics/fb0/virtual_size",
        "utf-8"
      ).trim();
      const [width, height] = sizeStr.split(",").map(Number);
      this.fbWidth = width;
      this.fbHeight = height;

      // Read bits per pixel
      const bppStr = fs.readFileSync(
        "/sys/class/graphics/fb0/bits_per_pixel",
        "utf-8"
      ).trim();
      this.bitsPerPixel = parseInt(bppStr, 10);

      if (this.bitsPerPixel !== 16) {
        console.warn(
          `Warning: Expected 16bpp framebuffer, got ${this.bitsPerPixel}bpp`
        );
      }
    } catch (error) {
      console.warn("Could not read framebuffer info from sysfs, using defaults");
      console.warn(`Error: ${error}`);
    }
  }

  /**
   * Calculate optimal integer scaling and centering offsets
   */
  private calculateScaling(): void {
    // Calculate maximum integer scale that fits on screen
    const maxScaleX = Math.floor(this.fbWidth / this.width);
    const maxScaleY = Math.floor(this.fbHeight / this.height);
    this.scale = Math.min(maxScaleX, maxScaleY);

    // Ensure at least 1x scale
    if (this.scale < 1) this.scale = 1;

    // Calculate centering offsets
    const scaledWidth = this.width * this.scale;
    const scaledHeight = this.height * this.scale;
    this.offsetX = Math.floor((this.fbWidth - scaledWidth) / 2);
    this.offsetY = Math.floor((this.fbHeight - scaledHeight) / 2);
  }

  /**
   * Convert RGB888 (24-bit) to RGB565 (16-bit)
   *
   * RGB888: RRRRRRRR GGGGGGGG BBBBBBBB (8 bits each)
   * RGB565: RRRRRGGGGGGBBBBB (5-6-5 bits)
   *
   * Conversion:
   * - R: Take top 5 bits (>> 3)
   * - G: Take top 6 bits (>> 2)
   * - B: Take top 5 bits (>> 3)
   */
  private rgbToRgb565(r: number, g: number, b: number): number {
    const r5 = (r >> 3) & 0x1f; // 5 bits
    const g6 = (g >> 2) & 0x3f; // 6 bits
    const b5 = (b >> 3) & 0x1f; // 5 bits

    return (r5 << 11) | (g6 << 5) | b5;
  }
}
