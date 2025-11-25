/**
 * HelpModal Component
 *
 * Standardized help modal for keyboard shortcuts.
 * Every app should include one.
 */

import { Modal } from "./modal";
import { Container } from "../core/container";
import { Label } from "./label";
import { Button } from "./button";
import { RGB } from "../../types/index";

export interface HelpItem {
  key: string;
  action: string;
}

export interface HelpModalOptions {
  items: HelpItem[];
  title?: string;
  width?: number;
  height?: number;
}

export class HelpModal extends Modal {
  /**
   * Create a standardized help modal
   */
  static create(
    items: HelpItem[],
    title: string = "Keyboard Shortcuts"
  ): HelpModal {
    // Calculate required height based on number of items
    // Estimate multiline: average 1.5 lines per item
    const avgItemHeight = 18; // ~18px per item (with wrapping)
    const headerHeight = 24;
    const footerHeight = 30;
    const padding = 10;
    const height =
      headerHeight + items.length * avgItemHeight + footerHeight + padding * 2;

    const width = 220;

    return new HelpModal({
      items,
      title,
      width,
      height,
    });
  }

  constructor(options: HelpModalOptions) {
    const content = HelpModal.buildContent(options.items);

    super({
      title: options.title ?? "Keyboard Shortcuts",
      width: options.width ?? 220,
      height: options.height,
      content,
    });
  }

  private static buildContent(items: HelpItem[]): Container {
    const container = new Container({
      x: 10,
      y: 20,
      width: 200,
      height: items.length * 18 + 40, // More space for multiline
    });

    let y = 0;

    // Add each help item
    for (const item of items) {
      // Compact key name (abbreviate common keys)
      const compactKey = this.compactKeyName(item.key);

      // Key label (left-aligned, narrow)
      const keyLabel = new Label({
        text: compactKey,
        x: 0,
        y,
        color: [255, 255, 0], // Yellow
      });
      container.addChild(keyLabel);

      // Separator
      const separator = new Label({
        text: "-",
        x: 48, // Narrower spacing
        y,
        color: [128, 128, 128],
      });
      container.addChild(separator);

      // Action text (wrap if too long)
      const actionLines = this.wrapText(item.action, 17); // ~17 chars max
      for (let i = 0; i < actionLines.length; i++) {
        const actionLabel = new Label({
          text: actionLines[i],
          x: 56,
          y: y + i * 9, // 9px per line
          color: [200, 200, 200],
        });
        container.addChild(actionLabel);
      }

      y += actionLines.length * 9 + 3; // Space between items
    }

    // Add footer with close button
    y += 10;
    const closeButton = new Button({
      text: "Close",
      x: 60,
      y,
      width: 80,
      onPress: () => {
        // Will be handled by modal's dismissal logic
      },
    });
    closeButton.focused = true; // Auto-focus so Enter works
    container.addChild(closeButton);

    return container;
  }

  /**
   * Compact key names for display
   */
  private static compactKeyName(key: string): string {
    const compactNames: { [key: string]: string } = {
      "Arrow Keys": "Arrows",
      "Arrow Up": "Up",
      "Arrow Down": "Down",
      "Arrow Left": "Left",
      "Arrow Right": "Right",
      "Enter/Space": "Enter",
      Space: "Space",
      Tab: "Tab",
      ESC: "ESC",
      Escape: "ESC",
    };
    return compactNames[key] || key;
  }

  /**
   * Wrap text to fit within max width (in characters)
   */
  private static wrapText(text: string, maxChars: number): string[] {
    if (text.length <= maxChars) {
      return [text];
    }

    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      if (currentLine.length + word.length + 1 <= maxChars) {
        currentLine += (currentLine ? " " : "") + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);

    return lines;
  }
}
