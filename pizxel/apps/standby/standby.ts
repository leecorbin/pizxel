/**
 * Standby App - Screensaver with Multiple Animation Modes
 * 
 * Four animation modes:
 * 1. Starfield - 50 stars with depth-based movement
 * 2. Flowing - Gentle wave patterns
 * 3. Geometric - Rotating squares
 * 4. Particles - Physics-based particle system
 * 
 * Features:
 * - Clock overlay (toggleable)
 * - Brightness multiplier (0.15 for standby)
 * - Persistent mode selection
 */

import { App, InputEvent, InputKeys } from "../../types";
import { DisplayBuffer } from "../../core/display-buffer";
import { AppStorage } from "../../storage/app-storage";

type AnimationMode = "starfield" | "flowing" | "geometric" | "particles";

interface Star {
  x: number;
  y: number;
  z: number; // Depth
  speed: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  hue: number;
}

interface GeometricShape {
  x: number;
  y: number;
  size: number;
  rotation: number;
  vx: number;
  vy: number;
  rotSpeed: number;
}

export class StandbyApp implements App {
  readonly name = "Standby";
  private mode: AnimationMode = "starfield";
  private showClock: boolean = true;
  private brightnessMultiplier: number = 0.15;
  private time: number = 0;
  
  // Starfield
  private stars: Star[] = [];
  
  // Flowing
  private flowOffset: number = 0;
  
  // Geometric
  private shapes: GeometricShape[] = [];
  
  // Particles
  private particles: Particle[] = [];
  
  private storage: AppStorage;
  private dirty: boolean = true;

  constructor() {
    this.storage = new AppStorage("standby");
    this.initAnimations();
  }

  async onActivate(): Promise<void> {
    // Load saved mode
    const savedMode = this.storage.get<AnimationMode>("mode");
    if (savedMode) {
      this.mode = savedMode;
    }
    
    const savedShowClock = this.storage.get<boolean>("showClock");
    if (savedShowClock !== undefined) {
      this.showClock = savedShowClock;
    }
    
    this.time = 0;
    this.dirty = true;
  }

  onDeactivate(): void {
    // Save current mode
    this.storage.set("mode", this.mode);
    this.storage.set("showClock", this.showClock);
  }

  onEvent(event: InputEvent): boolean {
    if (event.key === InputKeys.ACTION) {
      // Space: Cycle through modes
      this.cycleMode();
      this.dirty = true;
      return true;
    }
    
    if (event.key === InputKeys.OK) {
      // Enter: Toggle clock
      this.showClock = !this.showClock;
      this.dirty = true;
      return true;
    }
    
    // Any other key exits standby (handled by framework)
    return false;
  }

  onUpdate(deltaSeconds: number): void {
    // Framework passes seconds; animations below are written in milliseconds
    const deltaTime = deltaSeconds * 1000;
    this.time += deltaTime;
    
    switch (this.mode) {
      case "starfield":
        this.updateStarfield(deltaTime);
        break;
      case "flowing":
        this.updateFlowing(deltaTime);
        break;
      case "geometric":
        this.updateGeometric(deltaTime);
        break;
      case "particles":
        this.updateParticles(deltaTime);
        break;
    }
    
    this.dirty = true;
  }

  render(display: DisplayBuffer): void {
    if (!this.dirty) return;
    
    display.clear();
    
    switch (this.mode) {
      case "starfield":
        this.renderStarfield(display);
        break;
      case "flowing":
        this.renderFlowing(display);
        break;
      case "geometric":
        this.renderGeometric(display);
        break;
      case "particles":
        this.renderParticles(display);
        break;
    }
    
    // Draw clock overlay
    if (this.showClock) {
      this.renderClock(display);
    }
    
    this.dirty = false;
  }

  private initAnimations(): void {
    // Initialize starfield
    for (let i = 0; i < 50; i++) {
      this.stars.push({
        x: Math.random() * 256,
        y: Math.random() * 192,
        z: Math.random(),
        speed: 0.5 + Math.random() * 1.5
      });
    }
    
    // Initialize geometric shapes
    for (let i = 0; i < 3; i++) {
      this.shapes.push({
        x: Math.random() * 256,
        y: Math.random() * 192,
        size: 20 + Math.random() * 30,
        rotation: Math.random() * Math.PI * 2,
        vx: (Math.random() - 0.5) * 20,
        vy: (Math.random() - 0.5) * 20,
        rotSpeed: (Math.random() - 0.5) * 0.5
      });
    }
    
    // Initialize particles
    for (let i = 0; i < 30; i++) {
      this.createParticle();
    }
  }

  private cycleMode(): void {
    const modes: AnimationMode[] = ["starfield", "flowing", "geometric", "particles"];
    const currentIndex = modes.indexOf(this.mode);
    this.mode = modes[(currentIndex + 1) % modes.length];
  }

  // === STARFIELD ===
  private updateStarfield(deltaTime: number): void {
    for (const star of this.stars) {
      star.z += star.speed * deltaTime / 1000;
      
      if (star.z > 1) {
        star.z = 0;
        star.x = Math.random() * 256;
        star.y = Math.random() * 192;
      }
    }
  }

  private renderStarfield(display: DisplayBuffer): void {
    for (const star of this.stars) {
      const brightness = Math.floor((star.z * 255) * this.brightnessMultiplier);
      const pulse = Math.sin(this.time / 500 + star.x) * 0.3 + 0.7;
      const finalBrightness = Math.floor(brightness * pulse);
      
      const color: [number, number, number] = [finalBrightness, finalBrightness, finalBrightness];
      display.setPixel(Math.floor(star.x), Math.floor(star.y), color);
    }
  }

  // === FLOWING ===
  private updateFlowing(deltaTime: number): void {
    this.flowOffset += deltaTime / 1000;
  }

  private renderFlowing(display: DisplayBuffer): void {
    const step = 8;
    for (let y = 0; y < 192; y += step) {
      for (let x = 0; x < 256; x += step) {
        const wave = Math.sin(x / 30 + this.flowOffset) * Math.cos(y / 30 + this.flowOffset);
        const brightness = Math.floor((wave * 0.5 + 0.5) * 255 * this.brightnessMultiplier);
        
        const color: [number, number, number] = [
          brightness,
          Math.floor(brightness * 0.7),
          Math.floor(brightness * 1.3)
        ];
        
        display.rect(x, y, step, step, color, true);
      }
    }
  }

  // === GEOMETRIC ===
  private updateGeometric(deltaTime: number): void {
    const dt = deltaTime / 1000;
    
    for (const shape of this.shapes) {
      shape.x += shape.vx * dt;
      shape.y += shape.vy * dt;
      shape.rotation += shape.rotSpeed * dt;
      
      // Wrap around
      if (shape.x < -shape.size) shape.x = 256 + shape.size;
      if (shape.x > 256 + shape.size) shape.x = -shape.size;
      if (shape.y < -shape.size) shape.y = 192 + shape.size;
      if (shape.y > 192 + shape.size) shape.y = -shape.size;
    }
  }

  private renderGeometric(display: DisplayBuffer): void {
    const colors: Array<[number, number, number]> = [
      [255, 0, 0],
      [0, 255, 255],
      [255, 255, 0]
    ];
    
    for (let i = 0; i < this.shapes.length; i++) {
      const shape = this.shapes[i];
      const baseColor = colors[i % colors.length];
      const color: [number, number, number] = [
        Math.floor(baseColor[0] * this.brightnessMultiplier),
        Math.floor(baseColor[1] * this.brightnessMultiplier),
        Math.floor(baseColor[2] * this.brightnessMultiplier)
      ];
      
      // Draw rotated square (simplified as rect for now)
      display.rect(
        Math.floor(shape.x - shape.size / 2),
        Math.floor(shape.y - shape.size / 2),
        Math.floor(shape.size),
        Math.floor(shape.size),
        color,
        false
      );
    }
  }

  // === PARTICLES ===
  private createParticle(): void {
    this.particles.push({
      x: Math.random() * 256,
      y: Math.random() * 192,
      vx: (Math.random() - 0.5) * 40,
      vy: (Math.random() - 0.5) * 40,
      life: 0,
      maxLife: 2 + Math.random() * 3,
      hue: Math.random() * 360
    });
  }

  private updateParticles(deltaTime: number): void {
    const dt = deltaTime / 1000;
    
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life += dt;
      p.hue = (p.hue + 30 * dt) % 360;
      
      // Remove dead particles
      if (p.life > p.maxLife || p.x < 0 || p.x > 256 || p.y < 0 || p.y > 192) {
        this.particles.splice(i, 1);
        this.createParticle();
      }
    }
  }

  private renderParticles(display: DisplayBuffer): void {
    for (const p of this.particles) {
      const alpha = 1 - (p.life / p.maxLife);
      const rgb = this.hsvToRgb(p.hue, 1, alpha);
      
      const color: [number, number, number] = [
        Math.floor(rgb[0] * this.brightnessMultiplier),
        Math.floor(rgb[1] * this.brightnessMultiplier),
        Math.floor(rgb[2] * this.brightnessMultiplier)
      ];
      
      display.setPixel(Math.floor(p.x), Math.floor(p.y), color);
      
      // Trail
      display.setPixel(Math.floor(p.x - p.vx * 0.02), Math.floor(p.y - p.vy * 0.02), [
        Math.floor(color[0] * 0.5),
        Math.floor(color[1] * 0.5),
        Math.floor(color[2] * 0.5)
      ]);
    }
  }

  private renderClock(display: DisplayBuffer): void {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const timeStr = `${hours}:${minutes}`;
    
    const brightness = Math.floor(600 * this.brightnessMultiplier);
    const color: [number, number, number] = [brightness, brightness, brightness];
    
    // Bottom-right position
    display.text(timeStr, 256 - 50, 192 - 12, color);
  }

  private hsvToRgb(h: number, s: number, v: number): [number, number, number] {
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    
    let r = 0, g = 0, b = 0;
    
    if (h < 60) {
      r = c; g = x; b = 0;
    } else if (h < 120) {
      r = x; g = c; b = 0;
    } else if (h < 180) {
      r = 0; g = c; b = x;
    } else if (h < 240) {
      r = 0; g = x; b = c;
    } else if (h < 300) {
      r = x; g = 0; b = c;
    } else {
      r = c; g = 0; b = x;
    }
    
    return [
      Math.floor((r + m) * 255),
      Math.floor((g + m) * 255),
      Math.floor((b + m) * 255)
    ];
  }
}
