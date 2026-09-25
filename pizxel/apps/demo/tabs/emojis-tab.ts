/**
 * Emojis Tab
 *
 * Browse emoji spritesheet with name-based search via API
 */

import { Container } from "../../../ui/core/container";
import { InputEvent, InputKeys } from "../../../types/index";
import { DisplayBuffer } from "../../../core/display-buffer";
import { getEmojiLoader } from "../../../lib/emoji-loader";
import {
  searchEmojisByName,
  EmojiSearchResult,
} from "../../../lib/emoji-search-api";

export function createEmojisTab(): EmojiTabContainer {
  return new EmojiTabContainer({
    x: 0,
    y: 0,
    width: 256,
    height: 152,
  });
}

interface EmojiEntry {
  emoji: string;
  name?: string;
}

class EmojiTabContainer extends Container {
  private searchQuery = "";
  private selectedIndex = 0;
  private scrollOffset = 0;
  private allEmojis: EmojiEntry[] = [];
  private filteredEmojis: EmojiEntry[] = [];
  private emojiLoader = getEmojiLoader();
  private loading = true;
  private loadError: string | null = null;
  private searching = false;
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: any) {
    super(options);
    this.loadEmojis();
  }

  /**
   * Load all available emojis from spritesheet
   */
  private loadEmojis(): void {
    try {
      // Get all emojis from spritesheet (synchronous)
      const emojis = this.emojiLoader.listAvailableEmojis();
      this.allEmojis = emojis.map((emoji) => ({ emoji }));
      this.filteredEmojis = [...this.allEmojis];
      this.loading = false;
      console.log(`[EmojisTab] Loaded ${this.allEmojis.length} emojis`);
    } catch (error) {
      console.error("[EmojisTab] Failed to load emojis:", error);
      this.loadError = "Failed to load emojis";
      this.loading = false;
    }
  }

  handleEvent(event: InputEvent): boolean {
    // Text input for search
    if (event.key.length === 1 && /[a-zA-Z0-9 ]/.test(event.key)) {
      this.searchQuery += event.key;
      this.debouncedSearch();
      return true;
    }

    // Backspace
    if (event.key === InputKeys.BACK && this.searchQuery.length > 0) {
      this.searchQuery = this.searchQuery.slice(0, -1);
      this.debouncedSearch();
      return true;
    }

    // Navigation
    if (event.key === InputKeys.UP && this.selectedIndex > 0) {
      this.selectedIndex--;
      this.updateScroll();
      return true;
    }

    if (
      event.key === InputKeys.DOWN &&
      this.selectedIndex < this.filteredEmojis.length - 1
    ) {
      this.selectedIndex++;
      this.updateScroll();
      return true;
    }

    return false;
  }

  /**
   * Debounced search to avoid API spam
   */
  private debouncedSearch(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    this.searchDebounceTimer = setTimeout(() => {
      this.performSearch();
    }, 500); // Wait 500ms after last keystroke
  }

  /**
   * Perform API search and filter local emojis
   */
  private async performSearch(): Promise<void> {
    if (this.searchQuery === "") {
      this.filteredEmojis = [...this.allEmojis];
      this.selectedIndex = 0;
      this.scrollOffset = 0;
      return;
    }

    this.searching = true;

    try {
      // Search by name via API
      const results = await searchEmojisByName(this.searchQuery);

      // Match API results with our local spritesheet
      const localEmojiSet = new Set(this.allEmojis.map((e) => e.emoji));
      this.filteredEmojis = results
        .filter((result) => localEmojiSet.has(result.emoji))
        .map((result) => ({
          emoji: result.emoji,
          name: result.name,
        }));

      // If no matches from API, try direct emoji character match
      if (this.filteredEmojis.length === 0) {
        this.filteredEmojis = this.allEmojis.filter((e) =>
          e.emoji.includes(this.searchQuery)
        );
      }

      console.log(
        `[EmojisTab] Search "${this.searchQuery}" found ${this.filteredEmojis.length} results`
      );
    } catch (error) {
      console.error("[EmojisTab] Search failed:", error);
      // Fallback to character match
      this.filteredEmojis = this.allEmojis.filter((e) =>
        e.emoji.includes(this.searchQuery)
      );
    } finally {
      this.searching = false;
      this.selectedIndex = 0;
      this.scrollOffset = 0;
    }
  }

  private updateScroll(): void {
    const itemHeight = 28;
    const visibleItems = Math.floor(90 / itemHeight);

    if (this.selectedIndex < this.scrollOffset) {
      this.scrollOffset = this.selectedIndex;
    } else if (this.selectedIndex >= this.scrollOffset + visibleItems) {
      this.scrollOffset = this.selectedIndex - visibleItems + 1;
    }
  }

  render(matrix: DisplayBuffer): void {
    const pos = this.getAbsolutePosition();

    // Title
    matrix.text("EMOJI BROWSER", pos.x + 10, pos.y + 10, [100, 180, 255]);

    // Loading state
    if (this.loading) {
      matrix.text("Loading emojis...", pos.x + 10, pos.y + 40, [150, 150, 150]);
      return;
    }

    // Error state
    if (this.loadError) {
      matrix.text(this.loadError, pos.x + 10, pos.y + 40, [255, 100, 100]);
      return;
    }

    // Search box
    matrix.rect(pos.x + 10, pos.y + 30, 236, 18, [40, 40, 40], true);
    matrix.rect(pos.x + 10, pos.y + 30, 236, 18, [255, 255, 255], false);
    const searchText = this.searchQuery || "Type name to search...";
    const searchColor: [number, number, number] = this.searchQuery
      ? [255, 255, 255]
      : [120, 120, 120];
    matrix.text(searchText, pos.x + 15, pos.y + 36, searchColor);

    // Results count with search indicator
    const statusText = this.searching
      ? "Searching..."
      : `${this.filteredEmojis.length} of ${this.allEmojis.length} emojis`;
    matrix.text(statusText, pos.x + 10, pos.y + 55, [150, 150, 150]);

    // Emoji list (scrollable - show emoji + name if available)
    const startY = pos.y + 70;
    const itemHeight = 28;
    const visibleItems = Math.floor(90 / itemHeight);

    for (
      let i = 0;
      i < visibleItems && i + this.scrollOffset < this.filteredEmojis.length;
      i++
    ) {
      const index = i + this.scrollOffset;
      const entry = this.filteredEmojis[index];
      const y = startY + i * itemHeight;
      const isSelected = index === this.selectedIndex;

      // Selection highlight
      if (isSelected) {
        matrix.rect(
          pos.x + 10,
          y - 2,
          236,
          itemHeight - 2,
          [60, 100, 160],
          true
        );
      }

      // Show emoji character (scaled 2x)
      matrix.text(
        entry.emoji,
        pos.x + 15,
        y + 4,
        [255, 255, 255],
        undefined,
        2
      );

      // Show name if available (truncated)
      if (entry.name) {
        const name =
          entry.name.length > 25
            ? entry.name.substring(0, 22) + "..."
            : entry.name;
        matrix.text(name, pos.x + 45, y + 8, [180, 180, 180]);
      }
    }

    // Scroll indicator
    if (this.filteredEmojis.length > visibleItems) {
      const scrollPercent =
        this.scrollOffset / (this.filteredEmojis.length - visibleItems);
      const barHeight = 80;
      const barY = pos.y + 70;
      const barX = pos.x + 248;
      const thumbY = Math.floor(barY + scrollPercent * (barHeight - 10));

      const displayHeight = matrix.getHeight();
      if (barY + barHeight <= displayHeight) {
        matrix.rect(barX, barY, 4, barHeight, [40, 40, 40], true);
        if (thumbY + 10 <= displayHeight) {
          matrix.rect(barX, thumbY, 4, 10, [100, 180, 255], true);
        }
      }
    }
  }
}
