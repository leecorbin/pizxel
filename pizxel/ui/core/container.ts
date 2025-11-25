/**
 * Container Widget
 *
 * Base class for widgets that contain other widgets.
 */

import { Widget, WidgetOptions } from "./widget";
import { DisplayBuffer } from "../../core/display-buffer";
import { RGB } from "../../types/index";

export interface ContainerOptions extends WidgetOptions {
  bgColor?: RGB;
  children?: Widget[];
}

export class Container extends Widget {
  bgColor: RGB;

  constructor(options: ContainerOptions = {}) {
    super(options);
    this.bgColor = options.bgColor ?? [0, 0, 0];

    if (options.children) {
      for (const child of options.children) {
        this.addChild(child);
      }
    }
  }

  protected renderSelf(matrix: DisplayBuffer): void {
    // Fill background if specified
    if (this.bgColor) {
      const pos = this.getAbsolutePosition();
      matrix.rect(pos.x, pos.y, this.width, this.height, this.bgColor, true);
    }
  }
}
