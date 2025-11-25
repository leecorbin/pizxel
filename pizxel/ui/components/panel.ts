/**
 * Panel Component
 *
 * Container with optional border.
 */

import { Container, ContainerOptions } from "../core/container";
import { DisplayBuffer } from "../../core/display-buffer";
import { RGB } from "../../types/index";

export interface PanelOptions extends ContainerOptions {
  border?: boolean;
  borderColor?: RGB;
  borderWidth?: number;
}

export class Panel extends Container {
  border: boolean;
  borderColor: RGB;
  borderWidth: number;

  constructor(options: PanelOptions = {}) {
    super(options);
    this.border = options.border ?? true;
    this.borderColor = options.borderColor ?? [0, 255, 255]; // Cyan
    this.borderWidth = options.borderWidth ?? 1;
  }

  protected renderSelf(matrix: DisplayBuffer): void {
    // Background
    super.renderSelf(matrix);

    // Border
    if (this.border) {
      const pos = this.getAbsolutePosition();

      for (let i = 0; i < this.borderWidth; i++) {
        matrix.rect(
          pos.x + i,
          pos.y + i,
          this.width - i * 2,
          this.height - i * 2,
          this.borderColor,
          false
        );
      }
    }
  }
}
