/**
 * Visual Effects Tab
 *
 * Launcher for beautiful visual demos
 */

import { Container } from "../../../ui/core/container";
import { InputEvent, InputKeys, RGB } from "../../../types/index";
import { DisplayBuffer } from "../../../core/display-buffer";

interface VisualDemo {
  name: string;
  description: string;
  renderer: (matrix: DisplayBuffer, time: number) => void;
}

export function createVisualsTab(): VisualsTabContainer {
  return new VisualsTabContainer({
    x: 0,
    y: 0,
    width: 256,
    height: 152,
  });
}

class VisualsTabContainer extends Container {
  private demos: VisualDemo[] = [];
  private selectedIndex = 0;
  private activeDemo: VisualDemo | null = null;
  private animationTime = 0;

  constructor(options: any) {
    super(options);
    this.buildDemos();
  }

  private buildDemos(): void {
    // Plasma effect
    this.demos.push({
      name: "Plasma",
      description: "Classic plasma effect",
      renderer: (matrix, time) => {
        const width = matrix.getWidth();
        const height = matrix.getHeight();

        for (let y = 0; y < height; y += 2) {
          for (let x = 0; x < width; x += 2) {
            const value =
              Math.sin(x / 16.0 + time) +
              Math.sin(y / 8.0 + time) +
              Math.sin((x + y) / 16.0 + time) +
              Math.sin(Math.sqrt(x * x + y * y) / 8.0 + time);

            const normalized = (value + 4) / 8;
            const hue = normalized * 360;
            const rgb = this.hslToRgb(hue, 1, 0.5);

            matrix.setPixel(x, y, rgb);
            matrix.setPixel(x + 1, y, rgb);
            matrix.setPixel(x, y + 1, rgb);
            matrix.setPixel(x + 1, y + 1, rgb);
          }
        }
      },
    });

    // Starfield
    this.demos.push({
      name: "Starfield",
      description: "Flying through space",
      renderer: (matrix, time) => {
        const centerX = matrix.getWidth() / 2;
        const centerY = matrix.getHeight() / 2;
        const numStars = 100;

        matrix.clear();

        for (let i = 0; i < numStars; i++) {
          const angle = (i / numStars) * Math.PI * 2;
          const distance = (time * 50 + i * 10) % 200;
          const x = centerX + Math.cos(angle) * distance;
          const y = centerY + Math.sin(angle) * distance;

          if (
            x >= 0 &&
            x < matrix.getWidth() &&
            y >= 0 &&
            y < matrix.getHeight()
          ) {
            const brightness = Math.floor((distance / 200) * 255);
            matrix.setPixel(Math.floor(x), Math.floor(y), [
              brightness,
              brightness,
              brightness,
            ]);
          }
        }
      },
    });

    // Rainbow waves
    this.demos.push({
      name: "Rainbow Waves",
      description: "Colorful wave patterns",
      renderer: (matrix, time) => {
        const width = matrix.getWidth();
        const height = matrix.getHeight();

        for (let y = 0; y < height; y += 2) {
          for (let x = 0; x < width; x += 2) {
            const wave1 = Math.sin(x / 20 + time * 2);
            const wave2 = Math.sin(y / 15 + time * 3);
            const combined = (wave1 + wave2) / 2;

            const hue = ((combined + 1) / 2) * 360;
            const rgb = this.hslToRgb(hue, 1, 0.5);

            matrix.setPixel(x, y, rgb);
            matrix.setPixel(x + 1, y, rgb);
            matrix.setPixel(x, y + 1, rgb);
            matrix.setPixel(x + 1, y + 1, rgb);
          }
        }
      },
    });

    // Matrix rain
    this.demos.push({
      name: "Matrix Rain",
      description: "Digital rain effect",
      renderer: (matrix, time) => {
        const width = matrix.getWidth();
        const height = matrix.getHeight();
        const columns = Math.floor(width / 6);

        // Simple falling characters
        for (let i = 0; i < columns; i++) {
          const x = i * 6;
          const speed = 20 + (i % 10) * 5;
          const y = Math.floor((time * speed) % (height + 20)) - 20;

          if (y >= 0 && y < height) {
            const char = String.fromCharCode(
              33 + Math.floor((time * 10 + i) % 94)
            );
            const brightness = Math.floor(
              Math.max(0, 255 - ((time * speed) % (height + 20)) * 2)
            );
            matrix.text(char, x, y, [0, brightness, 0]);
          }
        }
      },
    });

    // Fire effect
    this.demos.push({
      name: "Fire",
      description: "Rising flames",
      renderer: (matrix, time) => {
        const width = matrix.getWidth();
        const height = matrix.getHeight();

        // Simple fire effect
        for (let y = 0; y < height; y += 2) {
          for (let x = 0; x < width; x += 2) {
            // Heat based on position and noise
            const base = (height - y) / height;
            const noise =
              Math.sin(x * 0.1 + time * 3) * Math.sin(y * 0.1 + time * 2);
            const heat = Math.max(0, Math.min(1, base * 0.8 + noise * 0.2));

            const rgb = this.heatToColor(heat * 255);
            matrix.setPixel(x, y, rgb);
            if (x + 1 < width) matrix.setPixel(x + 1, y, rgb);
            if (y + 1 < height) {
              matrix.setPixel(x, y + 1, rgb);
              if (x + 1 < width) matrix.setPixel(x + 1, y + 1, rgb);
            }
          }
        }
      },
    });
  }

  private hslToRgb(h: number, s: number, l: number): [number, number, number] {
    h = h / 360;
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    const r = this.hueToRgb(p, q, h + 1 / 3);
    const g = this.hueToRgb(p, q, h);
    const b = this.hueToRgb(p, q, h - 1 / 3);

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  private hueToRgb(p: number, q: number, t: number): number {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }

  private heatToColor(heat: number): [number, number, number] {
    if (heat < 85) {
      return [Math.floor(heat * 3), 0, 0];
    } else if (heat < 170) {
      return [255, Math.floor((heat - 85) * 3), 0];
    } else {
      return [255, 255, Math.floor((heat - 170) * 3)];
    }
  }

  update(deltaTime: number): void {
    if (this.activeDemo) {
      this.animationTime += deltaTime;
    }
  }

  /** Animating while a demo runs (the menu is static) */
  isAnimating(): boolean {
    return this.activeDemo !== null;
  }

  handleEvent(event: InputEvent): boolean {
    // If viewing a demo, ESC returns to menu
    if (this.activeDemo && event.key === InputKeys.BACK) {
      this.activeDemo = null;
      this.animationTime = 0;
      return true;
    }

    // Menu navigation
    if (!this.activeDemo) {
      if (event.key === InputKeys.UP && this.selectedIndex > 0) {
        this.selectedIndex--;
        return true;
      }

      if (
        event.key === InputKeys.DOWN &&
        this.selectedIndex < this.demos.length - 1
      ) {
        this.selectedIndex++;
        return true;
      }

      if (event.key === InputKeys.OK || event.key === " ") {
        this.activeDemo = this.demos[this.selectedIndex];
        this.animationTime = 0;
        return true;
      }
    }

    return false;
  }

  render(matrix: DisplayBuffer): void {
    if (this.activeDemo) {
      // Render active demo
      this.activeDemo.renderer(matrix, this.animationTime);

      // Demo title overlay (top)
      matrix.rect(0, 0, matrix.getWidth(), 14, [0, 0, 0], true);
      matrix.text(this.activeDemo.name, 5, 3, [255, 255, 255]);

      // Instructions (bottom)
      matrix.rect(
        0,
        matrix.getHeight() - 14,
        matrix.getWidth(),
        14,
        [0, 0, 0],
        true
      );
      matrix.text(
        "Press BACK to return",
        5,
        matrix.getHeight() - 11,
        [150, 150, 150]
      );
    } else {
      // Render demo menu (below the title and tab bars)
      matrix.text("VISUAL DEMOS", 10, 44, [100, 180, 255]);

      let y = 58;
      this.demos.forEach((demo, index) => {
        const isSelected = index === this.selectedIndex;

        if (isSelected) {
          matrix.rect(10, y - 2, 236, 22, [60, 100, 160], true);
        }

        const nameColor: RGB = isSelected ? [255, 255, 255] : [200, 200, 200];
        matrix.text(demo.name, 15, y + 2, nameColor);

        const descColor: RGB = isSelected ? [180, 180, 180] : [120, 120, 120];
        matrix.text(demo.description, 15, y + 12, descColor);

        y += 26;
      });
    }
  }
}
