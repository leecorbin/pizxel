/**
 * Spinners Tab
 *
 * Showcase all loading spinner styles
 */

import { Container } from "../../../ui/core/container";
import { LoadingSpinner } from "../../../ui";

export function createSpinnersTab(): SpinnersTabContainer {
  return new SpinnersTabContainer({
    x: 0,
    y: 0,
    width: 256,
    height: 152,
  });
}

class SpinnersTabContainer extends Container {
  private spinners: LoadingSpinner[] = [];

  constructor(options: any) {
    super(options);

    // Create all spinner styles
    const styles = [
      { name: "Arc", style: "arc" as const, x: 36, y: 50 },
      { name: "Dots", style: "dots" as const, x: 100, y: 50 },
      { name: "Pulse", style: "pulse" as const, x: 164, y: 50 },
      { name: "Bars", style: "bars" as const, x: 228, y: 50 },
    ];

    styles.forEach((config) => {
      const spinner = new LoadingSpinner({
        x: config.x - 20,
        y: config.y,
        style: config.style,
        size: 40,
        color: [100, 180, 255],
        speed: 1.0,
      });
      this.spinners.push(spinner);
      this.addChild(spinner);
    });

    // Add a large example with text
    const bigSpinner = new LoadingSpinner({
      x: 96,
      y: 85,
      style: "arc",
      size: 48,
      color: [255, 150, 50],
      speed: 0.8,
      text: "Loading...",
    });
    this.spinners.push(bigSpinner);
    this.addChild(bigSpinner);
  }

  /**
   * Update all spinners for animation
   */
  update(deltaTime: number): void {
    for (const spinner of this.spinners) {
      spinner.update(deltaTime);
    }
  }

  /** Spinners are always moving */
  isAnimating(): boolean {
    return true;
  }
}
