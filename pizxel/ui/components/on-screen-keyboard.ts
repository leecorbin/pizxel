/**
 * On-Screen Keyboard Component
 *
 * Virtual keyboard for hardware deployment without full keyboard.
 * Features:
 * - Standard QWERTY layout
 * - Arrow key navigation
 * - Action/OK to select key
 * - Special keys: Space, Backspace, Enter, Shift
 * - Compact retro design
 */

import { Widget, WidgetOptions } from "../core/widget";
import { DisplayBuffer } from "../../core/display-buffer";
import { RGB, InputEvent, InputKeys } from "../../types/index";
import { getAudio } from "../../start";
import { Sounds } from "../../audio/audio";

export interface OnScreenKeyboardOptions extends WidgetOptions {
  onKeyPress?: (key: string) => void;
  onSubmit?: (text: string) => void;
  onDismiss?: () => void; // Called when keyboard is dismissed
  initialText?: string; // Starting text
  maxLength?: number;
  placeholder?: string;
}

interface KeyDef {
  char: string;
  shiftChar?: string;
  label?: string; // Display label (for special keys)
  width?: number; // Key width multiplier (1 = 8px)
  special?: boolean; // Is this a special key?
}

export class OnScreenKeyboard extends Widget {
  private onKeyPress?: (key: string) => void;
  private onSubmit?: (text: string) => void;
  private onDismiss?: () => void;
  private maxLength: number;
  private placeholder: string;

  // Animation state
  private isVisible = false;
  private slideProgress = 0; // 0 = hidden, 1 = fully visible
  private animationSpeed = 0.15; // Speed of slide animation

  // State
  private currentRow = 0;
  private currentCol = 0;
  private shift = false;
  private symbolMode = false;
  private inputText = "";

  // Letter keyboard layout
  private readonly letterLayout: KeyDef[][] = [
    // Row 0: QWERTYUIOP
    [
      { char: "q" },
      { char: "w" },
      { char: "e" },
      { char: "r" },
      { char: "t" },
      { char: "y" },
      { char: "u" },
      { char: "i" },
      { char: "o" },
      { char: "p" },
    ],
    // Row 1: ASDFGHJKL
    [
      { char: "a" },
      { char: "s" },
      { char: "d" },
      { char: "f" },
      { char: "g" },
      { char: "h" },
      { char: "j" },
      { char: "k" },
      { char: "l" },
      { char: ".", shiftChar: "!" },
    ],
    // Row 2: Shift + ZXCVBNM
    [
      { char: "⇧", label: "⇧", special: true },
      { char: "z" },
      { char: "x" },
      { char: "c" },
      { char: "v" },
      { char: "b" },
      { char: "n" },
      { char: "m" },
      { char: ",", shiftChar: "?" },
      { char: "123", label: "123", special: true },
    ],
    // Row 3: Numbers + Space
    [
      { char: "1" },
      { char: "2" },
      { char: "3" },
      { char: " ", label: "SPACE", width: 4, special: true },
      { char: "4" },
      { char: "5" },
      { char: "6" },
      { char: "7" },
      { char: "8" },
      { char: "0" },
    ],
  ];

  // Symbol keyboard layout
  private readonly symbolLayout: KeyDef[][] = [
    // Row 0: Common symbols
    [
      { char: "!" },
      { char: "@" },
      { char: "#" },
      { char: "$" },
      { char: "%" },
      { char: "^" },
      { char: "&" },
      { char: "*" },
      { char: "(" },
      { char: ")" },
    ],
    // Row 1: More symbols
    [
      { char: "-" },
      { char: "_" },
      { char: "=" },
      { char: "+" },
      { char: "[" },
      { char: "]" },
      { char: "{" },
      { char: "}" },
      { char: "|" },
      { char: "\\" },
    ],
    // Row 2: Punctuation
    [
      { char: ":", special: false },
      { char: ";" },
      { char: '"' },
      { char: "'" },
      { char: "<" },
      { char: ">" },
      { char: "," },
      { char: "." },
      { char: "?" },
      { char: "ABC", label: "ABC", special: true },
    ],
    // Row 3: Special chars + space
    [
      { char: "~" },
      { char: "`" },
      { char: "/" },
      { char: " ", label: "SPACE", width: 4, special: true },
      { char: "€" },
      { char: "£" },
      { char: "¥" },
      { char: "±" },
      { char: "×" },
      { char: "÷" },
    ],
  ];

  // Get current layout based on mode
  private get layout(): KeyDef[][] {
    return this.symbolMode ? this.symbolLayout : this.letterLayout;
  }

  // Colors
  private readonly keyColor: RGB = [220, 220, 220];
  private readonly keyBgColor: RGB = [60, 60, 65];
  private readonly focusColor: RGB = [255, 200, 0]; // Orange-yellow
  private readonly shiftActiveColor: RGB = [0, 180, 255]; // Cyan
  private readonly symbolModeColor: RGB = [255, 0, 180]; // Pink
  private readonly specialKeyColor: RGB = [180, 180, 180];
  private readonly inputBgColor: RGB = [40, 40, 45];
  private readonly inputTextColor: RGB = [255, 255, 255];
  private readonly bgColor: RGB = [30, 30, 35]; // Dark keyboard background
  private readonly dismissBtnColor: RGB = [100, 100, 105];

  constructor(options: OnScreenKeyboardOptions) {
    super(options);
    this.onKeyPress = options.onKeyPress;
    this.onSubmit = options.onSubmit;
    this.onDismiss = options.onDismiss;
    this.maxLength = options.maxLength ?? 64;
    this.placeholder = options.placeholder ?? "";
    this.inputText = options.initialText ?? "";

    // Fill entire width at bottom of screen
    this.x = 0;
    this.y = 192 - 85; // Start at bottom (will slide up, accounting for full height)
    this.width = 256;
    this.height = 85;
  }

  protected renderSelf(matrix: DisplayBuffer): void {
    if (!this.isVisible && this.slideProgress === 0) {
      return; // Completely hidden
    }

    const pos = this.getAbsolutePosition();

    // Calculate slide offset
    const slideOffset = Math.floor((1 - this.slideProgress) * this.height);
    const renderY = pos.y + slideOffset;

    // Don't render if completely off screen
    if (renderY >= 192) {
      return;
    }

    // Draw keyboard background
    matrix.rect(pos.x, renderY, this.width, this.height, this.bgColor, true);

    // Draw top border
    const borderColor: RGB = [80, 80, 85];
    matrix.line(pos.x, renderY, pos.x + this.width, renderY, borderColor);

    // Draw dismiss button (top center)
    this.renderDismissButton(matrix, pos.x, renderY);

    // Draw input area
    this.renderInputArea(matrix, pos.x, renderY + 14);

    // Draw keyboard
    this.renderKeyboard(matrix, pos.x, renderY + 30);
  }

  private renderDismissButton(
    matrix: DisplayBuffer,
    x: number,
    y: number
  ): void {
    const btnWidth = 32;
    const btnHeight = 8;
    const btnSpacing = 4;

    // Backspace button (left side)
    const backspaceX = x + 4;
    const backspaceY = y + 3;
    matrix.rect(
      backspaceX,
      backspaceY,
      btnWidth,
      btnHeight,
      this.dismissBtnColor,
      true
    );
    matrix.text("⌫ DEL", backspaceX + 2, backspaceY + 1, [200, 200, 200]);

    // Dismiss button (center)
    const dismissX = x + Math.floor((this.width - btnWidth) / 2);
    const dismissY = y + 3;
    matrix.rect(
      dismissX,
      dismissY,
      btnWidth,
      btnHeight,
      this.dismissBtnColor,
      true
    );
    matrix.text("▼ HIDE", dismissX + 1, dismissY + 1, [200, 200, 200]);
  }

  private renderInputArea(matrix: DisplayBuffer, x: number, y: number): void {
    // Input box background (full width)
    matrix.rect(x + 2, y, this.width - 4, 12, this.inputBgColor, true);
    const borderColor: RGB = [100, 100, 100];
    matrix.rect(x + 2, y, this.width - 4, 12, borderColor, false);

    // Display text or placeholder
    const displayText = this.inputText || this.placeholder;
    const textColor: RGB = this.inputText
      ? this.inputTextColor
      : [100, 100, 100];

    if (displayText) {
      // Scroll text if too long
      const maxChars = Math.floor((this.width - 12) / 8);
      const startIdx = Math.max(0, displayText.length - maxChars);
      const visibleText = displayText.substring(startIdx);
      matrix.text(visibleText, x + 6, y + 2, textColor);
    }

    // Cursor blink
    if (
      this.inputText.length < this.maxLength &&
      this.focused &&
      Date.now() % 1000 < 500
    ) {
      const cursorX =
        x +
        6 +
        Math.min(this.inputText.length, Math.floor((this.width - 12) / 8)) * 8;
      matrix.line(cursorX, y + 2, cursorX, y + 9, this.inputTextColor);
    }
  }

  private renderKeyboard(matrix: DisplayBuffer, x: number, y: number): void {
    const keyHeight = 10;
    const keySpacing = 2;
    const padding = 2;
    const availableWidth = this.width - padding * 2;
    let currentY = y;

    for (let row = 0; row < this.layout.length; row++) {
      // Calculate total width units for this row
      const totalUnits = this.layout[row].reduce(
        (sum, key) => sum + (key.width || 1),
        0
      );
      const totalSpacing = (this.layout[row].length - 1) * keySpacing;
      const unitWidth = Math.floor(
        (availableWidth - totalSpacing) / totalUnits
      );

      let currentX = x + padding;

      for (let col = 0; col < this.layout[row].length; col++) {
        const key = this.layout[row][col];
        const keyWidth =
          unitWidth * (key.width || 1) + keySpacing * ((key.width || 1) - 1);
        const isFocused =
          this.focused && row === this.currentRow && col === this.currentCol;
        const isShiftKey = key.char === "⇧";
        const isShiftActive = this.shift && isShiftKey;
        const isModeKey = key.char === "123" || key.char === "ABC";
        const isModeActive =
          (key.char === "123" && this.symbolMode) ||
          (key.char === "ABC" && !this.symbolMode);

        // Key background with rounded effect
        let bgColor = this.keyBgColor;
        if (isFocused) {
          bgColor = this.focusColor;
        } else if (isShiftActive) {
          bgColor = this.shiftActiveColor;
        } else if (isModeActive) {
          bgColor = this.symbolModeColor;
        }

        matrix.rect(currentX, currentY, keyWidth, keyHeight, bgColor, true);

        // Key border
        const borderColor: RGB = isFocused ? [255, 255, 255] : [90, 90, 95];
        matrix.rect(
          currentX,
          currentY,
          keyWidth,
          keyHeight,
          borderColor,
          false
        );

        // Key label
        const label = this.getKeyLabel(key);
        const textColor: RGB = isFocused
          ? [0, 0, 0]
          : key.special
          ? this.specialKeyColor
          : this.keyColor;

        // Center text in key
        const textX = currentX + Math.floor((keyWidth - label.length * 8) / 2);
        const textY = currentY + 1;

        // Truncate if needed
        const maxLen = Math.floor(keyWidth / 8);
        const displayLabel =
          label.length > maxLen ? label.substring(0, maxLen) : label;
        matrix.text(displayLabel, textX, textY, textColor);

        currentX += keyWidth + keySpacing;
      }

      currentY += keyHeight + keySpacing;
    }
  }

  private getKeyLabel(key: KeyDef): string {
    // Special keys always show their label
    if (key.special && key.label) {
      return key.label;
    }
    if (key.label) {
      return key.label;
    }

    // In symbol mode, always show the character as-is
    if (this.symbolMode) {
      return key.char;
    }

    // In letter mode, handle shift
    // Show shift character if shift is active and available
    if (this.shift && key.shiftChar) {
      return key.shiftChar;
    }
    // Uppercase letters when shift is active (but not special chars)
    if (this.shift && key.char.match(/[a-z]/)) {
      return key.char.toUpperCase();
    }
    return key.char;
  }

  private getCurrentKey(): KeyDef {
    return this.layout[this.currentRow][this.currentCol];
  }

  private handleKeyPress(): void {
    const key = this.getCurrentKey();
    getAudio()?.play(Sounds.SELECT);

    // Handle special keys
    if (key.special) {
      switch (key.char) {
        case "⇧": // Shift
          this.shift = !this.shift;
          return;

        case "123": // Switch to symbol mode
          this.symbolMode = true;
          this.currentRow = 0;
          this.currentCol = 0;
          return;

        case "ABC": // Switch to letter mode
          this.symbolMode = false;
          this.currentRow = 0;
          this.currentCol = 0;
          return;

        case "⌫": // Backspace
          if (this.inputText.length > 0) {
            this.inputText = this.inputText.slice(0, -1);
            if (this.onKeyPress) {
              this.onKeyPress("\b"); // Backspace character
            }
          }
          return;

        case " ": // Space
          if (this.inputText.length < this.maxLength) {
            this.inputText += " ";
            if (this.onKeyPress) {
              this.onKeyPress(" ");
            }
          }
          return;
      }
    }

    // Handle regular character input
    if (this.inputText.length < this.maxLength) {
      let outputChar: string;

      // In symbol mode, use char directly
      if (this.symbolMode) {
        outputChar = key.char;
      } else {
        // In letter mode, handle shift
        if (this.shift && key.shiftChar) {
          outputChar = key.shiftChar;
        } else if (this.shift && key.char.match(/[a-z]/)) {
          outputChar = key.char.toUpperCase();
        } else {
          outputChar = key.char;
        }
      }

      this.inputText += outputChar;

      // Auto-disable shift after character (only in letter mode)
      if (this.shift && !this.symbolMode) {
        this.shift = false;
      }

      if (this.onKeyPress) {
        this.onKeyPress(outputChar);
      }
    }
  }

  protected handleSelfEvent(event: InputEvent): boolean {
    if (!this.focused || event.type !== "keydown") {
      return false;
    }

    switch (event.key) {
      case InputKeys.UP:
        this.currentRow =
          (this.currentRow - 1 + this.layout.length) % this.layout.length;
        // Clamp column to row length
        this.currentCol = Math.min(
          this.currentCol,
          this.layout[this.currentRow].length - 1
        );
        return true;

      case InputKeys.DOWN:
        this.currentRow = (this.currentRow + 1) % this.layout.length;
        // Clamp column to row length
        this.currentCol = Math.min(
          this.currentCol,
          this.layout[this.currentRow].length - 1
        );
        return true;

      case InputKeys.LEFT:
        this.currentCol =
          (this.currentCol - 1 + this.layout[this.currentRow].length) %
          this.layout[this.currentRow].length;
        return true;

      case InputKeys.RIGHT:
        this.currentCol =
          (this.currentCol + 1) % this.layout[this.currentRow].length;
        return true;

      case InputKeys.OK:
      case InputKeys.ACTION:
        this.handleKeyPress();
        return true;

      case InputKeys.BACK:
        // Backspace shortcut - delete character directly
        if (this.inputText.length > 0) {
          this.inputText = this.inputText.slice(0, -1);
          getAudio()?.play(Sounds.SELECT);
          if (this.onKeyPress) {
            this.onKeyPress("\b");
          }
        }
        return true;

      case InputKeys.HOME: // ESC - dismiss keyboard
        this.dismiss();
        return true;
    }

    return false;
  }

  // Animation methods
  public show(): void {
    this.isVisible = true;
    this.visible = true;
  }

  public dismiss(): void {
    this.isVisible = false;
    if (this.onDismiss) {
      this.onDismiss();
    }
  }

  public update(deltaTime: number): void {
    // Animate slide
    if (this.isVisible && this.slideProgress < 1) {
      this.slideProgress = Math.min(
        1,
        this.slideProgress + this.animationSpeed
      );
    } else if (!this.isVisible && this.slideProgress > 0) {
      this.slideProgress = Math.max(
        0,
        this.slideProgress - this.animationSpeed
      );
      if (this.slideProgress === 0) {
        this.visible = false; // Hide completely when animation done
      }
    }
  }

  public isAnimating(): boolean {
    return this.slideProgress > 0 && this.slideProgress < 1;
  }

  // Public API for apps
  public getText(): string {
    return this.inputText;
  }

  public setText(text: string): void {
    this.inputText = text.substring(0, this.maxLength);
  }

  public clear(): void {
    this.inputText = "";
  }
}
