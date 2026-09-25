/**
 * Standby App
 *
 * Default standby/screensaver with ambient animations and clock display.
 * Designed to run at low brightness with subtle pixel effects.
 *
 * Animation modes:
 * - Starfield: Slow moving stars
 * - Flowing Pixels: Gentle wave patterns
 * - Geometric Drift: Slowly rotating shapes
 * - Particle Field: Ambient particle effects
 */

import { App, InputEvent, InputKeys } from "../../types/index";
import { DisplayBuffer } from "../../core/display-buffer";
import { AppStorage } from "../../storage/app-storage";
import { HelpModal } from "../../ui";
import { getAppFramework } from "../../start";

interface Star {
  x: number;
  y: number;
  z: number; // depth (0-1)
  brightness: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // 0-1
  hue: number;
}

type AnimationMode = "starfield" | "flowing" | "geometric" | "particles";

export class StandbyApp implements App {
  readonly name = "Standby";
  dirty = true;
  private storage: AppStorage;
  private animationMode: AnimationMode = "starfield";
  private time: number = 0;

  // Starfield
  private stars: Star[] = [];

  // Particles
  private particles: Particle[] = [];

  // Clock
  private showClock: boolean = true;
  private clockX: number = 0;
  private clockY: number = 0;

  // Help modal
  private helpModal = HelpModal.create([
    { key: "Space", action: "Cycle animation mode" },
    { key: "Enter", action: "Toggle clock" },
    { key: "S", action: "Settings panel" },
    { key: "+/-", action: "Mode brightness" },
    { key: "[/]", action: "Mode speed" },
    { key: "O/L", action: "Clock brightness" },
    { key: "Tab", action: "Show help" },
    { key: "ESC", action: "Exit standby" },
  ]);

  // Per-mode settings
  private modeSettings = {
    starfield: { brightness: 0.4, speed: 1.0 },
    flowing: { brightness: 0.5, speed: 1.0 },
    geometric: { brightness: 0.6, speed: 1.0 },
    particles: { brightness: 0.5, speed: 1.0 },
  };
  private overlayBrightness: number = 1.0; // Clock/weather overlay brightness
  private showSettings: boolean = false; // Show settings overlay

  constructor() {
    this.storage = new AppStorage("standby");

    // Load per-mode settings from storage
    const savedModeSettings = this.storage.get("mode_settings");
    if (savedModeSettings) {
      this.modeSettings = savedModeSettings;
    }
    const savedOverlayBrightness =
      this.storage.get<number>("overlay_brightness");
    if (savedOverlayBrightness !== undefined) {
      this.overlayBrightness = savedOverlayBrightness;
    }

    // Load settings
    const savedMode = this.storage.get<AnimationMode>("animation_mode");
    if (savedMode) {
      this.animationMode = savedMode;
    }

    this.initAnimation();
    this.dirty = true;
  }

  /**
   * Initialize current animation mode
   */
  private initAnimation(): void {
    switch (this.animationMode) {
      case "starfield":
        this.initStarfield();
        break;
      case "particles":
        this.initParticles();
        break;
    }
  }

  /**
   * Initialize starfield with random stars
   */
  private initStarfield(): void {
    this.stars = [];
    for (let i = 0; i < 50; i++) {
      this.stars.push({
        x: Math.random() * 256,
        y: Math.random() * 192,
        z: Math.random(),
        brightness: 0.3 + Math.random() * 0.7,
      });
    }
  }

  /**
   * Initialize particle system
   */
  private initParticles(): void {
    this.particles = [];
    for (let i = 0; i < 30; i++) {
      this.addParticle();
    }
  }

  /**
   * Add a new particle
   */
  private addParticle(): void {
    this.particles.push({
      x: Math.random() * 256,
      y: Math.random() * 192,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      life: 1.0,
      hue: Math.random() * 360,
    });
  }

  onActivate(): void {
    this.initAnimation();
    this.dirty = true;
  }

  onDeactivate(): void {
    // Save current mode and settings
    this.storage.set("animation_mode", this.animationMode);
    this.storage.set("mode_settings", this.modeSettings);
    this.storage.set("overlay_brightness", this.overlayBrightness);
  }

  onUpdate(deltaTime: number): void {
    this.time += deltaTime;

    // Update animation
    switch (this.animationMode) {
      case "starfield":
        this.updateStarfield(deltaTime);
        break;
      case "flowing":
        // No per-frame update needed (uses time in render)
        break;
      case "geometric":
        // No per-frame update needed (uses time in render)
        break;
      case "particles":
        this.updateParticles(deltaTime);
        break;
    }

    this.dirty = true;
  }

  /**
   * Update starfield - slow movement
   */
  private updateStarfield(deltaTime: number): void {
    const modeSpeed = this.modeSettings.starfield.speed;
    for (const star of this.stars) {
      // Fast drift scaled by user setting
      star.x += star.z * 3.0 * modeSpeed;
      star.y += star.z * 2.0 * modeSpeed;

      // Wrap around
      if (star.x > 256) star.x = 0;
      if (star.y > 192) star.y = 0;
      if (star.x < 0) star.x = 256;
      if (star.y < 0) star.y = 192;

      // Subtle brightness pulse
      star.brightness = 0.3 + Math.sin(this.time + star.z * 10) * 0.3 + 0.4;
    }
  }

  /**
   * Update particle system
   */
  private updateParticles(deltaTime: number): void {
    const modeSpeed = this.modeSettings.particles.speed;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Move
      p.x += p.vx * modeSpeed;
      p.y += p.vy * modeSpeed;

      // Fade (constant rate, not affected by speed)
      p.life -= deltaTime * 0.001;

      // Remove dead particles
      if (p.life <= 0 || p.x < 0 || p.x > 256 || p.y < 0 || p.y > 192) {
        this.particles.splice(i, 1);
      }
    }

    // Maintain particle count
    while (this.particles.length < 30) {
      this.addParticle();
    }
  }

  render(matrix: DisplayBuffer): void {
    matrix.clear();

    // Render current animation
    switch (this.animationMode) {
      case "starfield":
        this.renderStarfield(matrix);
        break;
      case "flowing":
        this.renderFlowing(matrix);
        break;
      case "geometric":
        this.renderGeometric(matrix);
        break;
      case "particles":
        this.renderParticles(matrix);
        break;
    }

    // Render clock on top
    if (this.showClock) {
      this.renderClock(matrix);
    }

    // Render help modal on top if visible
    this.helpModal.render(matrix);

    // Render settings panel on top if visible
    if (this.showSettings) {
      this.renderSettingsPanel(matrix);
    }

    this.dirty = false;
  }

  /**
   * Render starfield
   */
  private renderStarfield(matrix: DisplayBuffer): void {
    for (const star of this.stars) {
      const modeBrightness = this.modeSettings.starfield.brightness;
      const brightness = Math.floor(star.brightness * modeBrightness * 255);
      const color: [number, number, number] = [
        brightness,
        brightness,
        brightness,
      ];

      // Larger stars are closer (draw as 2x2)
      if (star.z > 0.7) {
        matrix.rect(Math.floor(star.x), Math.floor(star.y), 2, 2, color, true);
      } else {
        matrix.setPixel(Math.floor(star.x), Math.floor(star.y), color);
      }
    }
  }

  /**
   * Render flowing wave pattern
   */
  private renderFlowing(matrix: DisplayBuffer): void {
    const modeSpeed = this.modeSettings.flowing.speed;
    const modeBrightness = this.modeSettings.flowing.brightness;
    const speed = 0.2 * modeSpeed; // 10x faster (was 0.02)
    const scale = 0.3; // Large scale for visible waves

    for (let y = 0; y < 192; y += 4) {
      for (let x = 0; x < 256; x += 4) {
        // Create wave pattern
        const wave1 = Math.sin(x * scale + this.time * speed);
        const wave2 = Math.cos(y * scale + this.time * speed * 0.7);
        const value = (wave1 + wave2) * 0.5 + 0.5;

        const brightness = Math.floor(value * modeBrightness * 255);
        const hue = (value + this.time * speed * 0.1) % 1;
        const color: [number, number, number] = this.hsvToRgb(
          hue,
          0.5,
          brightness / 255
        );

        matrix.rect(x, y, 4, 4, color, true);
      }
    }
  }

  /**
   * Render geometric shapes
   */
  private renderGeometric(matrix: DisplayBuffer): void {
    const cx = 128;
    const cy = 96;
    const modeSpeed = this.modeSettings.geometric.speed;
    const rotation = this.time * 0.05 * modeSpeed; // 1000x faster (was 0.00005)

    // Draw rotating squares
    for (let i = 0; i < 3; i++) {
      const size = 30 + i * 20;
      const angle = rotation + i * 0.3;

      const modeBrightness = this.modeSettings.geometric.brightness;
      const brightness = Math.floor((0.5 - i * 0.15) * modeBrightness * 255);
      const color: [number, number, number] = [brightness, 0, brightness];

      // Calculate rotated corners
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      const corners = [
        [-size, -size],
        [size, -size],
        [size, size],
        [-size, size],
      ];

      for (let j = 0; j < 4; j++) {
        const [x1, y1] = corners[j];
        const [x2, y2] = corners[(j + 1) % 4];

        const rx1 = cx + x1 * cos - y1 * sin;
        const ry1 = cy + x1 * sin + y1 * cos;
        const rx2 = cx + x2 * cos - y2 * sin;
        const ry2 = cy + x2 * sin + y2 * cos;

        matrix.line(
          Math.floor(rx1),
          Math.floor(ry1),
          Math.floor(rx2),
          Math.floor(ry2),
          color
        );
      }
    }
  }

  /**
   * Render particle field
   */
  private renderParticles(matrix: DisplayBuffer): void {
    const modeBrightness = this.modeSettings.particles.brightness;
    for (const p of this.particles) {
      const brightness = Math.floor(p.life * modeBrightness * 200);

      // Convert HSV to RGB (simple approximation)
      const h = p.hue / 60;
      const i = Math.floor(h);
      const f = h - i;
      const q = brightness * (1 - f);
      const t = brightness * f;

      let r = 0,
        g = 0,
        b = 0;
      switch (i % 6) {
        case 0:
          r = brightness;
          g = t;
          b = 0;
          break;
        case 1:
          r = q;
          g = brightness;
          b = 0;
          break;
        case 2:
          r = 0;
          g = brightness;
          b = t;
          break;
        case 3:
          r = 0;
          g = q;
          b = brightness;
          break;
        case 4:
          r = t;
          g = 0;
          b = brightness;
          break;
        case 5:
          r = brightness;
          g = 0;
          b = q;
          break;
      }

      const color: [number, number, number] = [r, g, b];

      // Draw particle with trail
      matrix.rect(Math.floor(p.x), Math.floor(p.y), 2, 2, color, true);
    }
  }

  /**
   * Render clock overlay
   */
  /**
   * Convert HSV to RGB
   */
  private hsvToRgb(h: number, s: number, v: number): [number, number, number] {
    let r = 0,
      g = 0,
      b = 0;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    switch (i % 6) {
      case 0:
        r = v;
        g = t;
        b = p;
        break;
      case 1:
        r = q;
        g = v;
        b = p;
        break;
      case 2:
        r = p;
        g = v;
        b = t;
        break;
      case 3:
        r = p;
        g = q;
        b = v;
        break;
      case 4:
        r = t;
        g = p;
        b = v;
        break;
      case 5:
        r = v;
        g = p;
        b = q;
        break;
    }

    return [Math.floor(r * 255), Math.floor(g * 255), Math.floor(b * 255)];
  }

  private renderClock(matrix: DisplayBuffer): void {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const timeStr = `${hours}:${minutes}`;

    // Position clock in bottom-right corner
    const clockWidth = timeStr.length * 8;
    const x = 256 - clockWidth - 10;
    const y = 192 - 20;

    // Semi-transparent background
    const bgColor: [number, number, number] = [0, 0, 0];
    matrix.rect(x - 4, y - 4, clockWidth + 8, 16, bgColor, true);

    // Clock text (brighter than animation)
    const overlayColor = Math.floor(this.overlayBrightness * 255);
    const textColor: [number, number, number] = [
      overlayColor,
      overlayColor,
      overlayColor,
    ];
    matrix.text(timeStr, x, y, textColor);
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

    // Cycle through animation modes with space bar
    if (event.key === InputKeys.ACTION || event.key === " ") {
      const modes: AnimationMode[] = [
        "starfield",
        "flowing",
        "geometric",
        "particles",
      ];
      const currentIndex = modes.indexOf(this.animationMode);
      this.animationMode = modes[(currentIndex + 1) % modes.length];

      this.storage.set("animation_mode", this.animationMode);
      this.initAnimation();
      this.dirty = true;
      return true;
    }

    // Toggle clock with OK key
    if (event.key === InputKeys.OK || event.key === "Enter") {
      this.showClock = !this.showClock;
      this.dirty = true;
      return true;
    }

    // Toggle settings panel with S key
    if (event.key === "s" || event.key === "S") {
      this.showSettings = !this.showSettings;
      this.dirty = true;
      return true;
    }

    // Adjust current mode brightness with +/-
    if (event.key === "+" || event.key === "=") {
      const mode = this.animationMode;
      this.modeSettings[mode].brightness = Math.min(
        1.0,
        this.modeSettings[mode].brightness + 0.1
      );
      this.storage.set("mode_settings", this.modeSettings);
      this.dirty = true;
      return true;
    }
    if (event.key === "-" || event.key === "_") {
      const mode = this.animationMode;
      this.modeSettings[mode].brightness = Math.max(
        0.1,
        this.modeSettings[mode].brightness - 0.1
      );
      this.storage.set("mode_settings", this.modeSettings);
      this.dirty = true;
      return true;
    }

    // Adjust current mode speed with []
    if (event.key === "]" || event.key === "}") {
      const mode = this.animationMode;
      this.modeSettings[mode].speed = Math.min(
        5.0,
        this.modeSettings[mode].speed + 0.2
      );
      this.storage.set("mode_settings", this.modeSettings);
      this.dirty = true;
      return true;
    }
    if (event.key === "[" || event.key === "{") {
      const mode = this.animationMode;
      this.modeSettings[mode].speed = Math.max(
        0.1,
        this.modeSettings[mode].speed - 0.2
      );
      this.storage.set("mode_settings", this.modeSettings);
      this.dirty = true;
      return true;
    }

    // Adjust overlay brightness with O/L
    if (event.key === "o" || event.key === "O") {
      this.overlayBrightness = Math.min(1.0, this.overlayBrightness + 0.1);
      this.storage.set("overlay_brightness", this.overlayBrightness);
      this.dirty = true;
      return true;
    }
    if (event.key === "l" || event.key === "L") {
      this.overlayBrightness = Math.max(0.1, this.overlayBrightness - 0.1);
      this.storage.set("overlay_brightness", this.overlayBrightness);
      this.dirty = true;
      return true;
    }

    // ESC closes settings panel if open
    if (event.key === "Escape" && this.showSettings) {
      this.showSettings = false;
      this.dirty = true;
      return true;
    }

    // Any other key exits standby (handled by framework)
    return false;
  }

  private renderSettingsPanel(matrix: DisplayBuffer): void {
    // Semi-transparent dark background
    const bgX = 20;
    const bgY = 40;
    const bgW = 216;
    const bgH = 112;

    // Dark background
    matrix.rect(bgX, bgY, bgW, bgH, [0, 0, 0], true);
    // Border
    matrix.rect(bgX, bgY, bgW, bgH, [100, 100, 100], false);

    // Title
    matrix.text("STANDBY SETTINGS", bgX + 20, bgY + 10, [255, 255, 255]);

    // Current mode settings
    const mode = this.animationMode;
    const settings = this.modeSettings[mode];
    const modeName = mode.toUpperCase();

    const textX = bgX + 10;
    let textY = bgY + 30;

    matrix.text(`Mode: ${modeName}`, textX, textY, [200, 200, 200]);
    textY += 15;
    matrix.text(
      `Brightness: ${Math.round(settings.brightness * 100)}%`,
      textX,
      textY,
      [200, 200, 200]
    );
    textY += 15;
    matrix.text(
      `Speed: ${settings.speed.toFixed(1)}x`,
      textX,
      textY,
      [200, 200, 200]
    );
    textY += 15;
    matrix.text(
      `Clock: ${Math.round(this.overlayBrightness * 100)}%`,
      textX,
      textY,
      [200, 200, 200]
    );

    // Instructions
    textY += 20;
    matrix.text("+/- Brightness  [/] Speed", textX, textY, [150, 150, 150]);
    textY += 10;
    matrix.text("O/L Clock  S Close", textX, textY, [150, 150, 150]);
  }
}
