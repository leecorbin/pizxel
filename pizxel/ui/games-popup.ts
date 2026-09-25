/**
 * Games Popup - Grid of Game Icons
 *
 * Displays all installed games in a popup overlay.
 * Similar to launcher but focused on games only.
 */

import { DisplayBuffer } from "../core/display-buffer";
import { InputEvent, InputKeys, App } from "../types";
import { getEmojiLoader } from "../lib/emoji-loader";

interface GameApp {
  name: string;
  emoji: string;
  color: [number, number, number];
  app: App;
}

export class GamesPopup {
  private visible: boolean = false;
  private selectedIndex: number = 0;
  private games: GameApp[] = [];

  // Layout for popup (smaller than full launcher)
  private readonly cols = 3; // 3 columns
  private readonly rows = 3; // 3 rows max (scrollable if needed)
  private readonly iconSize = 40;
  private readonly iconSpacing = 10;

  // Popup dimensions (centered)
  private readonly popupWidth = 200;
  private readonly popupHeight = 160;
  private popupX = 0; // Calculated in constructor
  private popupY = 0;

  // Colors
  private readonly bgColor: [number, number, number] = [20, 20, 40]; // Dark blue
  private readonly borderColor: [number, number, number] = [0, 255, 255]; // Cyan
  private readonly selectedColor: [number, number, number] = [255, 255, 0]; // Yellow
  private readonly textColor: [number, number, number] = [255, 255, 255]; // White

  constructor(private displayWidth: number, private displayHeight: number) {
    // Center the popup
    this.popupX = Math.floor((displayWidth - this.popupWidth) / 2);
    this.popupY = Math.floor((displayHeight - this.popupHeight) / 2);
  }

  /**
   * Set the list of game apps to display
   */
  setGames(games: GameApp[]): void {
    this.games = games;
    this.selectedIndex = 0;
  }

  /**
   * Show the popup
   */
  show(): void {
    this.visible = true;
    this.selectedIndex = 0;
  }

  /**
   * Hide the popup
   */
  hide(): void {
    this.visible = false;
  }

  /**
   * Toggle visibility
   */
  toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Check if popup is visible
   */
  isVisible(): boolean {
    return this.visible;
  }

  /**
   * Get the currently selected game app
   */
  getSelectedGame(): GameApp | null {
    if (this.selectedIndex >= 0 && this.selectedIndex < this.games.length) {
      return this.games[this.selectedIndex];
    }
    return null;
  }

  /**
   * Handle input events
   * Returns true if event was handled
   */
  handleEvent(event: InputEvent): boolean {
    if (!this.visible || event.type !== "keydown") {
      return false;
    }

    let handled = false;

    switch (event.key) {
      case InputKeys.LEFT:
      case "a":
      case "A":
        if (this.selectedIndex % this.cols > 0) {
          this.selectedIndex--;
          handled = true;
        }
        break;

      case InputKeys.RIGHT:
      case "d":
      case "D":
        if (
          this.selectedIndex % this.cols < this.cols - 1 &&
          this.selectedIndex < this.games.length - 1
        ) {
          this.selectedIndex++;
          handled = true;
        }
        break;

      case InputKeys.UP:
      case "w":
      case "W":
        if (this.selectedIndex >= this.cols) {
          this.selectedIndex -= this.cols;
          handled = true;
        }
        break;

      case InputKeys.DOWN:
      case "s":
      case "S":
        if (this.selectedIndex + this.cols < this.games.length) {
          this.selectedIndex += this.cols;
          handled = true;
        }
        break;

      case InputKeys.BACK:
      case "Escape":
        // Close popup
        this.hide();
        handled = true;
        break;

      case InputKeys.OK:
      case " ":
        // Return true - caller should launch selected game
        handled = true;
        break;
    }

    return handled;
  }

  /**
   * Render the popup
   */
  render(matrix: DisplayBuffer): void {
    if (!this.visible) {
      return;
    }

    // Draw semi-transparent overlay (darken background)
    matrix.dim(0, 0, this.displayWidth, this.displayHeight, 0.3);

    // Draw popup background
    matrix.rect(
      this.popupX,
      this.popupY,
      this.popupWidth,
      this.popupHeight,
      this.bgColor,
      true
    );

    // Draw border
    matrix.rect(
      this.popupX,
      this.popupY,
      this.popupWidth,
      this.popupHeight,
      this.borderColor,
      false
    );

    // Draw title
    const title = "GAMES";
    const titleWidth = title.length * 8;
    const titleX = this.popupX + Math.floor((this.popupWidth - titleWidth) / 2);
    matrix.text(title, titleX, this.popupY + 10, this.textColor);

    // Draw game icons
    const startX = this.popupX + 20;
    const startY = this.popupY + 30;

    for (let i = 0; i < this.games.length; i++) {
      const row = Math.floor(i / this.cols);
      const col = i % this.cols;

      const x = startX + col * (this.iconSize + this.iconSpacing);
      const y = startY + row * (this.iconSize + this.iconSpacing);

      this.drawGameIcon(matrix, this.games[i], x, y, i === this.selectedIndex);
    }

    // Draw instructions
    const instructions = "ESC=Close  ENTER=Launch";
    const instWidth = instructions.length * 8;
    const instX = this.popupX + Math.floor((this.popupWidth - instWidth) / 2);
    matrix.text(
      instructions,
      instX,
      this.popupY + this.popupHeight - 15,
      this.textColor
    );
  }

  private drawGameIcon(
    matrix: DisplayBuffer,
    game: GameApp,
    x: number,
    y: number,
    selected: boolean
  ): void {
    const emojiLoader = getEmojiLoader();

    // Draw emoji (28×28)
    const emojiSize = 28;
    const iconX = x + 6;
    const iconY = y + 2;

    const rendered = emojiLoader.renderToBufferSync(
      game.emoji,
      matrix,
      iconX,
      iconY,
      emojiSize
    );

    // If emoji not rendered, draw fallback
    if (!rendered) {
      matrix.rect(iconX, iconY, emojiSize, emojiSize, game.color, true);
    }

    // Draw name below icon (truncate if too long)
    const name = game.name.length > 5 ? game.name.substring(0, 5) : game.name;
    const nameWidth = name.length * 8;
    const nameX = x + Math.floor((this.iconSize - nameWidth) / 2);
    matrix.text(
      name,
      nameX,
      y + 32,
      selected ? this.selectedColor : this.textColor
    );

    // Draw selection border
    if (selected) {
      matrix.rect(
        x,
        y,
        this.iconSize,
        this.iconSize,
        this.selectedColor,
        false
      );
    }
  }
}
