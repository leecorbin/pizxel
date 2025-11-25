/**
 * Spacer - Flexible spacing component
 *
 * Takes up space in layouts (VStack/HStack).
 */

import { Widget, WidgetOptions } from "../core/widget";
import { DisplayBuffer } from "../../core/display-buffer";

export interface SpacerOptions extends WidgetOptions {
  minWidth?: number;
  minHeight?: number;
}

export class Spacer extends Widget {
  constructor(options: SpacerOptions = {}) {
    super({
      x: options.x ?? 0,
      y: options.y ?? 0,
      width: options.minWidth ?? 0,
      height: options.minHeight ?? 0,
      ...options,
    });
  }

  /**
   * Spacers don't render anything
   */
  protected renderSelf(display: DisplayBuffer): void {
    // Intentionally empty - spacers are invisible
  }

  /**
   * Spacers don't handle events
   */
  protected handleSelfEvent(): boolean {
    return false;
  }
}
